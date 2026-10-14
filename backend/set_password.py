"""
One-time helper: give an EXISTING user (e.g. your demo user, user_id 1) an
email + password so they can log in and keep their existing progress.

Run from the backend folder (with the venv active):
    python set_password.py
"""

import getpass

import database  # noqa: F401  (loads .env)
import auth
import engine


def main():
    user_id = int(input("user_id to update [1]: ").strip() or 1)
    email = input("email: ").strip().lower()
    password = getpass.getpass("new password (min 8 chars): ")
    if len(password) < 8 or len(password.encode("utf-8")) > 72:
        print("Password must be 8-72 characters.")
        return

    conn = engine.get_connection()
    try:
        changed = engine.run_query(
            conn,
            "UPDATE users SET email = %s, password_hash = %s WHERE user_id = %s",
            (email, auth.hash_password(password), user_id),
        )
    finally:
        conn.close()
    print("Done." if changed else "No user with that id (nothing changed).")


if __name__ == "__main__":
    main()
