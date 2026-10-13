"""
Create the LeetTrack tables (and the 200-question bank) in a CLOUD MySQL
database such as Aiven.  Run it ONCE from your own computer:

    1. Put the cloud database details in backend/.env  (DB_HOST, DB_PORT, DB_USER,
       DB_PASSWORD, DB_NAME, and DB_SSL=true) -- see DEPLOY.md.
    2. python setup_cloud_db.py

Safe to run again: tables use IF NOT EXISTS and the questions use INSERT IGNORE.
It does NOT create any users -- people sign up on the website.
It never deletes anything (unlike database/seed.sql, which is only for local demos).
"""

import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# If backend/.env.cloud exists, its values win over backend/.env.
# That way your normal local .env stays untouched.
_cloud_env = HERE / ".env.cloud"
if _cloud_env.exists():
    load_dotenv(_cloud_env, override=True)

import database  # noqa: E402,F401  (loads backend/.env for anything not set above)
import engine  # noqa: E402

SEED_FILE = ROOT / "database" / "seed.sql"

TABLES = [
    """
    CREATE TABLE IF NOT EXISTS users (
        user_id       INT PRIMARY KEY AUTO_INCREMENT,
        username      VARCHAR(100) NOT NULL,
        email         VARCHAR(255) NULL,
        password_hash VARCHAR(255) NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email),
        UNIQUE KEY uq_users_username (username)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS question_bank (
        question_id INT NOT NULL,
        platform    VARCHAR(50) NOT NULL,
        title       VARCHAR(255) NOT NULL,
        difficulty  ENUM('Easy', 'Medium', 'Hard') NOT NULL,
        topic       VARCHAR(100),
        url         VARCHAR(500),
        PRIMARY KEY (question_id, platform)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS solved_questions (
        user_id             INT NOT NULL,
        question_id         INT NOT NULL,
        platform            VARCHAR(50) NOT NULL,
        solved_date         DATE NOT NULL,
        revision_counter    INT NOT NULL DEFAULT 0,
        last_revision_date  DATE,
        due_date            DATE,
        PRIMARY KEY (user_id, question_id, platform),
        INDEX idx_solved_user_due (user_id, due_date),
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (question_id, platform) REFERENCES question_bank(question_id, platform)
    )
    """,
]


def extract_question_bank_sql() -> str:
    """Pull just the 'INSERT INTO question_bank ...;' statement out of seed.sql."""
    if not SEED_FILE.exists():
        raise RuntimeError(f"Could not find {SEED_FILE}")
    lines = SEED_FILE.read_text(encoding="utf-8").splitlines()
    out, started = [], False
    for line in lines:
        if not started and line.strip().upper().startswith("INSERT INTO QUESTION_BANK"):
            started = True
        if started:
            out.append(line)
            if line.rstrip().endswith(";"):
                break
    if not out:
        raise RuntimeError("No 'INSERT INTO question_bank' statement found in seed.sql")
    statement = "\n".join(out).rstrip().rstrip(";")
    # INSERT IGNORE so re-running never fails on existing rows
    return re.sub(r"^\s*INSERT\s+INTO", "INSERT IGNORE INTO", statement, count=1, flags=re.I)


def main():
    print(f"Connecting to database host: {os.getenv('DB_HOST', 'localhost')}")
    if os.getenv("DB_HOST", "localhost") in ("localhost", "127.0.0.1"):
        print("WARNING: this is your LOCAL database, not the cloud one.")
        print("Create backend/.env.cloud with the cloud details first (see DEPLOY.md).")
        if input("Continue anyway? (y/N): ").strip().lower() != "y":
            return
    try:
        conn = engine.get_connection()
    except Exception as exc:
        print("\nCould not connect:", exc)
        print("Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME and DB_SSL=true in backend/.env")
        sys.exit(1)

    try:
        cur = conn.cursor()
        for ddl in TABLES:
            cur.execute(ddl)
        conn.commit()
        print("Tables are ready (users, question_bank, solved_questions).")

        cur.execute(extract_question_bank_sql())
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM question_bank")
        (count,) = cur.fetchone()
        print(f"Question bank now has {count} questions.")
        cur.close()
    finally:
        conn.close()

    print("\nDone. Your cloud database is ready. Do NOT run seed.sql on it.")


if __name__ == "__main__":
    main()
