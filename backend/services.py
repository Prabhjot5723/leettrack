"""
Service layer sitting between the FastAPI routes and the engine/database.
Routes stay thin: they call a service function and turn any raised
NotFoundError / ConflictError / ValidationError into the right HTTP status
code. All actual SQL happens in engine.py — this file never writes raw SQL
of its own beyond the small existence-checks needed for good error messages.
"""

import os
import re
from datetime import date, datetime, timedelta, timezone

import mysql.connector

import auth
import engine


# --------------------------------------------------------------------------
# Errors (translated to HTTP status codes in main.py)
# --------------------------------------------------------------------------

class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


class ValidationError(Exception):
    pass


class AuthError(Exception):
    pass


# --------------------------------------------------------------------------
# "Today" in the app's own timezone (default IST = UTC+5:30), so the daily
# plan does not flip at the wrong hour when the server runs in UTC.
# Change with APP_UTC_OFFSET_MINUTES in .env if needed.
# --------------------------------------------------------------------------

def today() -> date:
    offset = int(os.getenv("APP_UTC_OFFSET_MINUTES", "330"))
    return (datetime.now(timezone.utc) + timedelta(minutes=offset)).date()


# --------------------------------------------------------------------------
# JSON-safety helpers
# --------------------------------------------------------------------------

def _serialize_value(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.days
    return value


def _serialize_row(row: dict) -> dict:
    return {k: _serialize_value(v) for k, v in row.items()}


def _serialize_rows(rows):
    return [_serialize_row(r) for r in rows]


# --------------------------------------------------------------------------
# Small existence checks (used for clear 404s instead of opaque SQL errors)
# --------------------------------------------------------------------------

def _user_exists(conn, user_id: int) -> bool:
    rows = engine.run_query(
        conn, "SELECT user_id FROM users WHERE user_id = %s", (user_id,), fetch=True
    )
    return len(rows) > 0


def _get_question(conn, question_id: int, platform: str):
    rows = engine.run_query(
        conn,
        "SELECT * FROM question_bank WHERE question_id = %s AND platform = %s",
        (question_id, platform),
        fetch=True,
    )
    return rows[0] if rows else None


def _get_solved_row(conn, user_id: int, question_id: int, platform: str):
    rows = engine.run_query(
        conn,
        """SELECT * FROM solved_questions
           WHERE user_id = %s AND question_id = %s AND platform = %s""",
        (user_id, question_id, platform),
        fetch=True,
    )
    return rows[0] if rows else None


# --------------------------------------------------------------------------
# Register / login
# --------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,30}$")


def register_user(conn, username: str, email: str, password: str) -> dict:
    username = (username or "").strip()
    email = (email or "").strip().lower()
    password = password or ""

    if not _USERNAME_RE.match(username):
        raise ValidationError(
            "Username must be 3 to 30 characters: letters, numbers, dot, dash or underscore."
        )
    if len(email) > 255 or not _EMAIL_RE.match(email):
        raise ValidationError("Please enter a valid email address.")
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters.")
    if len(password.encode("utf-8")) > 72:
        raise ValidationError("Password is too long (max 72 characters).")

    if engine.run_query(
        conn, "SELECT user_id FROM users WHERE email = %s", (email,), fetch=True
    ):
        raise ConflictError("An account with this email already exists.")
    if engine.run_query(
        conn, "SELECT user_id FROM users WHERE username = %s", (username,), fetch=True
    ):
        raise ConflictError("This username is already taken.")

    try:
        engine.run_query(
            conn,
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, auth.hash_password(password)),
        )
    except mysql.connector.IntegrityError:
        raise ConflictError("That username or email is already taken.")

    row = engine.run_query(
        conn, "SELECT user_id FROM users WHERE email = %s", (email,), fetch=True
    )[0]
    user_id = row["user_id"]
    return {
        "access_token": auth.create_access_token(user_id),
        "token_type": "bearer",
        "user": {"user_id": user_id, "username": username, "email": email},
    }


def login_user(conn, identifier: str, password: str) -> dict:
    """`identifier` can be the user's email or their username."""
    identifier = (identifier or "").strip()
    column = "email" if "@" in identifier else "username"  # fixed values, never user input
    value = identifier.lower() if column == "email" else identifier
    rows = engine.run_query(
        conn,
        f"SELECT user_id, username, email, password_hash FROM users WHERE {column} = %s",
        (value,),
        fetch=True,
    )
    user = rows[0] if rows else None

    stored_hash = user["password_hash"] if user and user["password_hash"] else auth.DUMMY_HASH
    password_ok = auth.verify_password(password or "", stored_hash)

    if user is None or not user["password_hash"] or not password_ok:
        raise AuthError("Invalid username/email or password.")

    return {
        "access_token": auth.create_access_token(user["user_id"]),
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
        },
    }


# --------------------------------------------------------------------------
# Passwords: change (logged in) and reset (forgot)
# --------------------------------------------------------------------------

def _check_new_password(password: str) -> str:
    password = password or ""
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters.")
    if len(password.encode("utf-8")) > 72:
        raise ValidationError("Password is too long (max 72 characters).")
    return password


def change_password(conn, user_id: int, current_password: str, new_password: str) -> dict:
    """Logged-in user changes their own password.

    A wrong current password is a ValidationError (HTTP 422), NOT AuthError:
    a 401 would make the website think the login expired and log the user out.
    """
    new_password = _check_new_password(new_password)
    rows = engine.run_query(
        conn,
        "SELECT password_hash FROM users WHERE user_id = %s",
        (user_id,),
        fetch=True,
    )
    if not rows:
        raise NotFoundError("User not found.")
    stored = rows[0]["password_hash"] or auth.DUMMY_HASH
    if not auth.verify_password(current_password or "", stored):
        raise ValidationError("Current password is incorrect.")
    if new_password == current_password:
        raise ValidationError("Choose a password that is different from your current one.")

    engine.run_query(
        conn,
        "UPDATE users SET password_hash = %s WHERE user_id = %s",
        (auth.hash_password(new_password), user_id),
    )
    return {"message": "Password updated."}


def start_password_reset(conn, email: str):
    """Look up the account for a forgot-password request.

    Returns (email, username, token) when the account exists, else None. The
    caller answers the same way in both cases, so nobody can use this form to
    find out which emails have accounts.
    """
    email = (email or "").strip().lower()
    if not _EMAIL_RE.match(email) or len(email) > 255:
        return None
    rows = engine.run_query(
        conn,
        "SELECT user_id, username, email, password_hash FROM users WHERE email = %s",
        (email,),
        fetch=True,
    )
    if not rows:
        return None
    user = rows[0]
    token = auth.create_reset_token(user["user_id"], user["password_hash"] or "")
    return user["email"], user["username"], token


def finish_password_reset(conn, token: str, new_password: str) -> dict:
    new_password = _check_new_password(new_password)
    bad_link = ValidationError(
        "This reset link is invalid or has expired. Request a new one."
    )

    parsed = auth.read_reset_token(token or "")
    if parsed is None:
        raise bad_link
    user_id, fingerprint = parsed

    rows = engine.run_query(
        conn,
        "SELECT password_hash FROM users WHERE user_id = %s",
        (user_id,),
        fetch=True,
    )
    # The fingerprint check makes the link single-use: once the password has
    # changed, the old link no longer matches.
    if not rows or not auth.fingerprint_matches(rows[0]["password_hash"] or "", fingerprint):
        raise bad_link

    engine.run_query(
        conn,
        "UPDATE users SET password_hash = %s WHERE user_id = %s",
        (auth.hash_password(new_password), user_id),
    )
    return {"message": "Password updated. You can log in now."}


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------

def get_user(conn, user_id: int) -> dict:
    rows = engine.run_query(
        conn,
        "SELECT user_id, username, email, created_at FROM users WHERE user_id = %s",
        (user_id,),
        fetch=True,
    )
    if not rows:
        raise NotFoundError(f"User {user_id} not found.")
    return _serialize_row(rows[0])


# --------------------------------------------------------------------------
# Daily plan
# --------------------------------------------------------------------------

def get_daily_plan(conn, user_id: int, target_date: date = None) -> dict:
    """
    Build the dashboard's daily plan as of `target_date` (defaults to
    today()). This is what powers the "Simulated Date" feature: pass
    any date here to see what the plan (due revisions + new-question mix)
    would have looked like — or will look like — on that day. Only affects
    *reads*; completing a question/revision still always records against
    the real today(), regardless of what date is being simulated.
    """
    if not _user_exists(conn, user_id):
        raise NotFoundError(f"User {user_id} not found.")

    plan_date = target_date or today()
    plan = engine.create_daily_plan(conn, user_id, plan_date)

    return {
        "date": plan_date.isoformat(),
        "is_simulated": plan_date != today(),
        "revisions": _serialize_rows(plan["revisions"]),
        "new_questions": _serialize_rows(plan["new_questions"]),
        "new_mix": plan["new_mix"],
        "revision_capacity": plan["revision_capacity"],
        "new_capacity": plan["new_capacity"],
        "remaining_capacity": plan["remaining_capacity"],
        "daily_capacity": engine.DAILY_CAPACITY,
        "used_capacity": plan["revision_capacity"] + plan["new_capacity"],
    }


# --------------------------------------------------------------------------
# Complete a brand-new question
# --------------------------------------------------------------------------

def complete_question(conn, user_id: int, question_id: int, platform: str, difficulty: str) -> dict:
    if not _user_exists(conn, user_id):
        raise NotFoundError(f"User {user_id} not found.")

    question = _get_question(conn, question_id, platform)
    if question is None:
        raise NotFoundError(f"Question {question_id} ({platform}) not found.")

    if difficulty not in engine.REVISION_BASELINE_DAYS:
        raise ValidationError(f"Unknown difficulty '{difficulty}'.")
    if question["difficulty"] != difficulty:
        raise ValidationError(
            f"Difficulty mismatch: question {question_id} is {question['difficulty']}, "
            f"not {difficulty}."
        )

    if _get_solved_row(conn, user_id, question_id, platform) is not None:
        raise ConflictError(f"Question {question_id} is already solved by user {user_id}.")

    try:
        result = engine.record_question_progress(
            conn, user_id, question_id, platform, difficulty,
            activity_date=today(), revision_counter=None
        )
    except mysql.connector.IntegrityError:
        # e.g. a double-click: the row was inserted a moment ago
        raise ConflictError(f"Question {question_id} is already solved by user {user_id}.")
    return {
        "question_id": question_id,
        "platform": platform,
        "title": question["title"],
        **_serialize_row(result),
    }


# --------------------------------------------------------------------------
# Complete a revision
# --------------------------------------------------------------------------

def complete_revision(conn, user_id: int, question_id: int, platform: str,
                       difficulty: str, revision_counter: int) -> dict:
    if not _user_exists(conn, user_id):
        raise NotFoundError(f"User {user_id} not found.")

    question = _get_question(conn, question_id, platform)
    if question is None:
        raise NotFoundError(f"Question {question_id} ({platform}) not found.")

    solved_row = _get_solved_row(conn, user_id, question_id, platform)
    if solved_row is None:
        raise NotFoundError(
            f"Question {question_id} has not been solved yet by user {user_id}; "
            f"cannot complete a revision for it."
        )

    if solved_row["revision_counter"] != revision_counter:
        raise ValidationError(
            f"Stale revision_counter: question {question_id} is currently at "
            f"revision_counter={solved_row['revision_counter']}, not {revision_counter}."
        )

    if difficulty not in engine.REVISION_BASELINE_DAYS:
        raise ValidationError(f"Unknown difficulty '{difficulty}'.")

    if not engine.can_be_revised(difficulty, revision_counter):
        raise ConflictError(
            f"Question {question_id} has already used all of its "
            f"{engine.REVISION_LIMITS[difficulty]} revisions for {difficulty}."
        )

    result = engine.record_question_progress(
        conn, user_id, question_id, platform, difficulty,
        activity_date=today(), revision_counter=revision_counter
    )
    return {
        "question_id": question_id,
        "platform": platform,
        "title": question["title"],
        **_serialize_row(result),
    }


# --------------------------------------------------------------------------
# Solved questions / upcoming revisions / question bank / progress
# --------------------------------------------------------------------------

def get_solved_questions(conn, user_id: int) -> list:
    if not _user_exists(conn, user_id):
        raise NotFoundError(f"User {user_id} not found.")

    rows = engine.run_query(conn, """
        SELECT sq.question_id, sq.platform, qb.title, qb.difficulty, qb.topic, qb.url,
               sq.solved_date, sq.revision_counter, sq.last_revision_date, sq.due_date
        FROM solved_questions AS sq
        JOIN question_bank AS qb
            ON sq.question_id = qb.question_id AND sq.platform = qb.platform
        WHERE sq.user_id = %s
        ORDER BY sq.solved_date DESC
    """, (user_id,), fetch=True)
    return _serialize_rows(rows)


def get_upcoming_revisions(conn, user_id: int) -> list:
    """All future (not-yet-due) revisions, soonest first — a superset view of
    get_due_revisions() for a 'what's coming up' page rather than 'due today'."""
    if not _user_exists(conn, user_id):
        raise NotFoundError(f"User {user_id} not found.")

    rows = engine.run_query(conn, """
        SELECT sq.question_id, sq.platform, qb.title, qb.difficulty, qb.topic, qb.url,
               sq.solved_date, sq.revision_counter, sq.last_revision_date, sq.due_date
        FROM solved_questions AS sq
        JOIN question_bank AS qb
            ON sq.question_id = qb.question_id AND sq.platform = qb.platform
        WHERE sq.user_id = %s
            AND sq.due_date IS NOT NULL
        ORDER BY sq.due_date ASC
    """, (user_id,), fetch=True)
    return _serialize_rows(rows)


def get_questions(conn, difficulty: str = None, topic: str = None,
                   platform: str = None, user_id: int = None) -> list:
    query = """
        SELECT qb.question_id, qb.platform, qb.title, qb.difficulty, qb.topic, qb.url,
               CASE WHEN sq.question_id IS NOT NULL THEN 1 ELSE 0 END AS solved
        FROM question_bank AS qb
        LEFT JOIN solved_questions AS sq
            ON qb.question_id = sq.question_id
            AND qb.platform = sq.platform
            AND sq.user_id = %s
        WHERE 1 = 1
    """
    params = [user_id]

    if difficulty:
        query += " AND qb.difficulty = %s"
        params.append(difficulty)
    if topic:
        query += " AND qb.topic = %s"
        params.append(topic)
    if platform:
        query += " AND qb.platform = %s"
        params.append(platform)

    query += " ORDER BY qb.question_id"

    rows = engine.run_query(conn, query, tuple(params), fetch=True)
    return _serialize_rows(rows)


def get_progress(conn, user_id: int) -> dict:
    if not _user_exists(conn, user_id):
        raise NotFoundError(f"User {user_id} not found.")

    totals = engine.run_query(conn, """
        SELECT qb.difficulty, COUNT(*) AS count
        FROM solved_questions AS sq
        JOIN question_bank AS qb
            ON sq.question_id = qb.question_id AND sq.platform = qb.platform
        WHERE sq.user_id = %s
        GROUP BY qb.difficulty
    """, (user_id,), fetch=True)

    by_difficulty = {"Easy": 0, "Medium": 0, "Hard": 0}
    for row in totals:
        by_difficulty[row["difficulty"]] = row["count"]
    total_solved = sum(by_difficulty.values())

    revisions_completed_row = engine.run_query(conn, """
        SELECT COALESCE(SUM(revision_counter), 0) AS total
        FROM solved_questions
        WHERE user_id = %s
    """, (user_id,), fetch=True)
    revisions_completed = revisions_completed_row[0]["total"]

    over_time = engine.run_query(conn, """
        SELECT solved_date, COUNT(*) AS count
        FROM solved_questions
        WHERE user_id = %s
        GROUP BY solved_date
        ORDER BY solved_date ASC
    """, (user_id,), fetch=True)

    return {
        "total_solved": total_solved,
        "easy_solved": by_difficulty["Easy"],
        "medium_solved": by_difficulty["Medium"],
        "hard_solved": by_difficulty["Hard"],
        "revisions_completed": revisions_completed,
        "solved_over_time": _serialize_rows(over_time),
    }
