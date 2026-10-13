"""
LeetTrack one-time setup for login support.  Run it ONCE from the backend folder:

    python setup_auth.py

It does everything for you (safe to run again, it skips what is already done):
  1. installs the new packages (bcrypt, PyJWT) if they are missing
  2. adds JWT_SECRET and the other new settings to backend/.env
  3. adds the login columns (email, password_hash, created_at) to MySQL
  4. lets you give an existing user (e.g. user 1) an email + password
"""

import getpass
import secrets
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE / ".env"

NEW_ENV_DEFAULTS = {
    "JWT_EXPIRE_HOURS": "24",
    "ENVIRONMENT": "development",
    "CORS_ORIGINS": "http://localhost:5173,http://127.0.0.1:5173",
    "APP_UTC_OFFSET_MINUTES": "330",
}


def banner(text):
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


# --------------------------------------------------------------------------
# Step 1: packages
# --------------------------------------------------------------------------
def ensure_packages():
    banner("Step 1/4: checking Python packages")
    try:
        import bcrypt  # noqa: F401
        import jwt  # noqa: F401
        print("bcrypt and PyJWT are already installed.")
        return
    except ImportError:
        pass
    print("Installing packages from requirements.txt (this can take a minute)...")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-r", str(HERE / "requirements.txt")]
    )


# --------------------------------------------------------------------------
# Step 2: .env
# --------------------------------------------------------------------------
def _key_of(line):
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None
    return stripped.split("=", 1)[0].strip()


def update_env_file(path=ENV_PATH):
    """Make sure JWT_SECRET (>=32 chars) and the other new settings exist.
    Never touches the existing DB_ lines. Returns a list of what it changed."""
    changes = []
    text = path.read_text(encoding="utf-8-sig") if path.exists() else ""
    lines = text.splitlines()

    present = {}
    for i, line in enumerate(lines):
        key = _key_of(line)
        if key:
            present[key] = i

    # JWT_SECRET: create, or replace if too short / still the placeholder
    secret_ok = False
    if "JWT_SECRET" in present:
        value = lines[present["JWT_SECRET"]].split("=", 1)[1].strip()
        secret_ok = len(value) >= 32 and "PASTE_A_LONG" not in value
    if not secret_ok:
        new_line = f"JWT_SECRET={secrets.token_urlsafe(48)}"
        if "JWT_SECRET" in present:
            lines[present["JWT_SECRET"]] = new_line
        else:
            lines.append(new_line)
        changes.append("JWT_SECRET")

    for key, default in NEW_ENV_DEFAULTS.items():
        if key not in present:
            lines.append(f"{key}={default}")
            changes.append(key)

    if changes:
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return changes


def step_env():
    banner("Step 2/4: updating backend/.env")
    if not ENV_PATH.exists():
        print("WARNING: backend/.env was not found, creating a new one.")
        print("You must add your DB_ lines (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).")
    changes = update_env_file()
    if changes:
        print("Added/updated in .env: " + ", ".join(changes))
    else:
        print(".env already has everything it needs.")


# --------------------------------------------------------------------------
# Step 3: database columns
# --------------------------------------------------------------------------
def _scalar(conn, sql, params=()):
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        cur.close()


def _exec(conn, sql):
    cur = conn.cursor()
    try:
        cur.execute(sql)
        conn.commit()
    finally:
        cur.close()


def step_database(conn):
    banner("Step 3/4: adding login columns to MySQL")
    cols = {
        r[0].lower()
        for r in _scalar(
            conn,
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
        )
    }
    if not cols:
        raise RuntimeError("Table 'users' was not found in your database.")

    wanted = [
        ("email", "ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL"),
        ("password_hash", "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL"),
        (
            "created_at",
            "ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
        ),
    ]
    for name, ddl in wanted:
        if name in cols:
            print(f"  column users.{name}: already there")
        else:
            _exec(conn, ddl)
            print(f"  column users.{name}: added")

    def index_exists(table, index):
        rows = _scalar(
            conn,
            "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = %s AND INDEX_NAME = %s LIMIT 1",
            (table, index),
        )
        return bool(rows)

    if index_exists("users", "uq_users_email"):
        print("  unique email index: already there")
    else:
        _exec(conn, "ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)")
        print("  unique email index: added")

    if index_exists("users", "uq_users_username"):
        print("  unique username index: already there")
    else:
        try:
            _exec(conn, "ALTER TABLE users ADD UNIQUE KEY uq_users_username (username)")
            print("  unique username index: added")
        except Exception as exc:
            print(f"  WARNING: could not make usernames unique ({exc}).")
            print("  Two users probably share a username. Rename one in MySQL, then run this again.")

    if index_exists("solved_questions", "idx_solved_user_due"):
        print("  speed index on solved_questions: already there")
    else:
        _exec(conn, "CREATE INDEX idx_solved_user_due ON solved_questions (user_id, due_date)")
        print("  speed index on solved_questions: added")


# --------------------------------------------------------------------------
# Step 4: password for an existing user
# --------------------------------------------------------------------------
def step_user_password(conn):
    import bcrypt

    banner("Step 4/4: give an existing user an email + password")
    users = _scalar(conn, "SELECT user_id, username, email FROM users ORDER BY user_id")
    print("Users in your database:")
    for uid, name, email in users:
        print(f"  id {uid}: {name}  (email: {email or 'not set'})")

    print("\nPress Enter on the first question to skip this step.")
    raw_id = input("Which user id should get a login? [1]: ").strip() or "1"
    if not raw_id.isdigit():
        print("Not a number, skipping.")
        return
    user_id = int(raw_id)
    if user_id not in {u[0] for u in users}:
        print(f"No user with id {user_id}, skipping.")
        return

    email = input("Email for this user: ").strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        print("That does not look like an email, skipping.")
        return

    while True:
        password = getpass.getpass("Password (min 8 characters, nothing shows while typing): ")
        if len(password) < 8 or len(password.encode("utf-8")) > 72:
            print("Password must be 8 to 72 characters. Try again.")
            continue
        if password != getpass.getpass("Type the password again: "):
            print("They did not match. Try again.")
            continue
        break

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET email = %s, password_hash = %s WHERE user_id = %s",
            (email, hashed, user_id),
        )
        conn.commit()
    except Exception as exc:  # e.g. email already used by another user
        print(f"Could not save: {exc}")
        return
    finally:
        cur.close()
    print(f"Done. User {user_id} can now log in with {email}")


def main():
    ensure_packages()
    step_env()

    # Import only AFTER .env is updated so the new values get loaded.
    import database  # noqa: F401  (loads .env)
    import engine

    try:
        conn = engine.get_connection()
    except Exception as exc:
        print("\nCould not connect to MySQL:", exc)
        print("Check that MySQL is running and the DB_ lines in backend/.env are correct.")
        sys.exit(1)

    try:
        step_database(conn)
        step_user_password(conn)
    finally:
        conn.close()

    banner("ALL DONE")
    print("Next: open main.py in VS Code and click Run, then open")
    print("http://localhost:5173 (after starting the frontend with: npm run dev)")


if __name__ == "__main__":
    main()
