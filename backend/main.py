"""
LeetTrack API
=============
FastAPI backend sitting between the React frontend and the LeetTrack engine
(engine.py) / MySQL database. Routes stay thin — they validate input, call a
service function, and shape the HTTP response.

Every data route requires a login token. The user is taken from the token
(auth.get_current_user) — the browser can no longer choose a user_id.
"""

import os
from datetime import datetime
from typing import Optional

import mysql.connector
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

import auth
import mailer
import services
from database import get_db, check_connection
from models import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    QuestionCompleteRequest,
    RegisterRequest,
    ResetPasswordRequest,
    RevisionCompleteRequest,
)

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

app = FastAPI(
    title="LeetTrack API",
    version="2.0.0",
    # Hide the interactive docs when deployed.
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None,
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# --------------------------------------------------------------------------
# CORS — which website addresses may call this API.
# Set CORS_ORIGINS in .env as a comma-separated list, e.g.
#   CORS_ORIGINS=http://localhost:5173,https://leettrack.vercel.app
# --------------------------------------------------------------------------
_origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,  # we use an Authorization header, not cookies
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# --------------------------------------------------------------------------
# Error handling — translate service-layer exceptions into HTTP responses,
# and don't leak raw DB errors (e.g. credentials) to the client.
# --------------------------------------------------------------------------

def _handle(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except services.AuthError as e:
        raise HTTPException(
            status_code=401, detail=str(e), headers={"WWW-Authenticate": "Bearer"}
        )
    except services.NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except services.ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except services.ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except mysql.connector.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Make sure MySQL is running and .env is configured.",
        )


# --------------------------------------------------------------------------
# Health check (public)
# --------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "database": "connected" if check_connection() else "unreachable"}


# --------------------------------------------------------------------------
# Auth (public)
# --------------------------------------------------------------------------

@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest, conn=Depends(get_db)):
    return _handle(
        services.register_user, conn, payload.username, payload.email, payload.password
    )


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request, conn=Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{payload.identifier.strip().lower()}"

    auth.check_login_allowed(key)
    try:
        result = _handle(services.login_user, conn, payload.identifier, payload.password)
    except HTTPException as exc:
        if exc.status_code == 401:
            auth.record_login_failure(key)
        raise
    auth.clear_login_failures(key)
    return result


TOO_MANY = "Too many attempts. Please try again in 15 minutes."


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@app.post("/api/auth/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background: BackgroundTasks,
    conn=Depends(get_db),
):
    """Always answers the same way, whether or not the email has an account."""
    key = f"forgot:{_client_ip(request)}"
    auth.check_login_allowed(key, TOO_MANY)
    auth.record_login_failure(key)  # counts every request: max 5 per 15 minutes

    found = _handle(services.start_password_reset, conn, payload.email)
    if found:
        email, username, token = found
        # Sent after the response, so the reply time does not reveal the account.
        background.add_task(mailer.send_password_reset, email, username, token)
    return {"message": "If an account exists for that email, a reset link is on its way."}


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, conn=Depends(get_db)):
    key = f"reset:{_client_ip(request)}"
    auth.check_login_allowed(key, TOO_MANY)
    try:
        result = _handle(
            services.finish_password_reset, conn, payload.token, payload.new_password
        )
    except HTTPException:
        auth.record_login_failure(key)
        raise
    auth.clear_login_failures(key)
    return result


# --------------------------------------------------------------------------
# Everything below needs a valid login token.
# --------------------------------------------------------------------------

@app.get("/api/me")
def get_me(user=Depends(auth.get_current_user), conn=Depends(get_db)):
    return _handle(services.get_user, conn, user["user_id"])


@app.post("/api/me/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user=Depends(auth.get_current_user),
    conn=Depends(get_db),
):
    # Limit wrong guesses of the current password (e.g. on a borrowed, logged-in browser).
    key = f"chpw:{user['user_id']}"
    auth.check_login_allowed(key, TOO_MANY)
    try:
        result = _handle(
            services.change_password,
            conn,
            user["user_id"],
            payload.current_password,
            payload.new_password,
        )
    except HTTPException:
        auth.record_login_failure(key)
        raise
    auth.clear_login_failures(key)
    return result


@app.get("/api/me/daily-plan")
def get_daily_plan(
    simulated_date: Optional[str] = Query(
        None, description="YYYY-MM-DD — view the dashboard as of this date instead of today"
    ),
    user=Depends(auth.get_current_user),
    conn=Depends(get_db),
):
    parsed_date = None
    if simulated_date:
        try:
            parsed_date = datetime.strptime(simulated_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=422, detail="simulated_date must be YYYY-MM-DD.")
    return _handle(services.get_daily_plan, conn, user["user_id"], parsed_date)


@app.post("/api/questions/complete")
def complete_question(
    payload: QuestionCompleteRequest,
    user=Depends(auth.get_current_user),
    conn=Depends(get_db),
):
    return _handle(
        services.complete_question,
        conn,
        user["user_id"],
        payload.question_id,
        payload.platform,
        payload.difficulty,
    )


@app.post("/api/revisions/complete")
def complete_revision(
    payload: RevisionCompleteRequest,
    user=Depends(auth.get_current_user),
    conn=Depends(get_db),
):
    return _handle(
        services.complete_revision,
        conn,
        user["user_id"],
        payload.question_id,
        payload.platform,
        payload.difficulty,
        payload.revision_counter,
    )


@app.get("/api/me/solved")
def get_solved_questions(user=Depends(auth.get_current_user), conn=Depends(get_db)):
    return _handle(services.get_solved_questions, conn, user["user_id"])


@app.get("/api/me/revisions")
def get_upcoming_revisions(user=Depends(auth.get_current_user), conn=Depends(get_db)):
    return _handle(services.get_upcoming_revisions, conn, user["user_id"])


@app.get("/api/questions")
def get_questions(
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    platform: Optional[str] = None,
    user=Depends(auth.get_current_user),
    conn=Depends(get_db),
):
    return _handle(
        services.get_questions, conn, difficulty, topic, platform, user["user_id"]
    )


@app.get("/api/me/progress")
def get_progress(user=Depends(auth.get_current_user), conn=Depends(get_db)):
    return _handle(services.get_progress, conn, user["user_id"])


# --------------------------------------------------------------------------
# Lets you start the server by pressing "Run" on this file in VS Code
# (the same as typing:  uvicorn main:app --reload).
# --------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=not IS_PRODUCTION)
