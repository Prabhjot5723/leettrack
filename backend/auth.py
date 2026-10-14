"""
Authentication helpers: password hashing (bcrypt), JWT access tokens, the
`get_current_user` FastAPI dependency, and a small in-memory login rate limiter.

The user's identity ALWAYS comes from the verified token — never from a
user_id sent by the browser.
"""

import os
import time
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import engine
from database import get_db  # importing database also loads backend/.env

JWT_ALGORITHM = "HS256"
TOKEN_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

_bearer = HTTPBearer(auto_error=False)


def _secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError(
            "JWT_SECRET is missing or too short. Add a random string of at least 32 "
            "characters to backend/.env (see .env.example)."
        )
    return secret


# Fail at startup (not on first login) if the secret is not configured.
_secret()


# --------------------------------------------------------------------------
# Passwords
# --------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, AttributeError):
        return False


# Used so that "unknown email" takes as long as "wrong password".
DUMMY_HASH = hash_password("not-a-real-password")


# --------------------------------------------------------------------------
# Tokens
# --------------------------------------------------------------------------

def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    conn=Depends(get_db),
) -> dict:
    """FastAPI dependency: returns {user_id, username, email} or raises 401."""
    unauthorized = HTTPException(
        status_code=401,
        detail="Not authenticated. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, _secret(), algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    rows = engine.run_query(
        conn,
        "SELECT user_id, username, email FROM users WHERE user_id = %s",
        (user_id,),
        fetch=True,
    )
    if not rows:
        raise unauthorized
    return rows[0]


# --------------------------------------------------------------------------
# Login rate limiting (in-memory; resets when the server restarts)
# --------------------------------------------------------------------------

MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60
_failed: dict = {}


def _recent(key: str) -> list:
    cutoff = time.time() - LOCKOUT_SECONDS
    attempts = [t for t in _failed.get(key, []) if t > cutoff]
    if attempts:
        _failed[key] = attempts
    else:
        _failed.pop(key, None)
    return attempts


def check_login_allowed(key: str) -> None:
    if len(_recent(key)) >= MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again in 15 minutes.",
        )


def record_login_failure(key: str) -> None:
    _recent(key)
    _failed.setdefault(key, []).append(time.time())


def clear_login_failures(key: str) -> None:
    _failed.pop(key, None)
