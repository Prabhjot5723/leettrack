"""
Question sheets (Striver A2Z, Love Babbar 450, NeetCode 150 and the original
starter 200).

Everything here is safe to run again and again: tables are created only if
missing, and questions are inserted only if missing. It runs by itself when the
API starts, so deploying = pushing to GitHub. Nothing has to be run by hand.

question_bank stays the one master list of questions. A sheet is just a list of
(question_id, platform) pairs in a chosen order (table sheet_questions), so a
user's solved history stays valid when they change sheets.
"""

import os
import re
import zlib
from urllib.parse import quote_plus

import engine

DEFAULT_SHEET = "starter-200"
NEW_ID_START = 1_000_000  # ids of the three new sheets; the old 200 are all below this

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sheets_data")

# (sheet_id, file, name, description, platform used for its questions)
SHEET_FILES = [
    ("striver-a2z", "striver_a2z.txt", "Striver's A2Z DSA Sheet",
     "Step-by-step path from basics to advanced topics by Striver (takeuforward).", "Practice"),
    ("love-babbar-450", "love_babbar450.txt", "Love Babbar 450 DSA Sheet",
     "The popular 450-question DSA cracker sheet, grouped by topic.", "Practice"),
    ("neetcode-150", "neetcode150.txt", "NeetCode 150",
     "150 hand-picked LeetCode problems grouped by pattern.", "LeetCode"),
]

DIFFICULTY = {"E": "Easy", "M": "Medium", "H": "Hard"}

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS sheets (
        sheet_id VARCHAR(40) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(300),
        sort_order INT NOT NULL DEFAULT 0
    )""",
    """CREATE TABLE IF NOT EXISTS sheet_questions (
        sheet_id VARCHAR(40) NOT NULL,
        question_id INT NOT NULL,
        platform VARCHAR(50) NOT NULL,
        sort_pos INT NOT NULL,
        PRIMARY KEY (sheet_id, question_id, platform),
        INDEX idx_sheet_pos (sheet_id, sort_pos)
    )""",
]


# ------------------------------------------------------------------ parsing

def _norm(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def _slug_url(slug: str) -> str:
    return f"https://leetcode.com/problems/{slug}/"


def _search_url(title: str) -> str:
    return "https://www.google.com/search?q=" + quote_plus(title + " problem")


def parse_sheet_file(filename: str, platform: str) -> list:
    """Returns [{key, title, topic, difficulty, url}] in sheet order, no duplicates."""
    out, seen = [], set()
    with open(os.path.join(DATA_DIR, filename), encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) < 3 or parts[1] not in DIFFICULTY:
                continue
            topic, diff, title = parts[0].strip(), DIFFICULTY[parts[1]], parts[2].strip()
            slug = parts[3].strip() if len(parts) > 3 else ""
            key = _norm(title)
            if not key or key in seen:
                continue
            seen.add(key)
            out.append({
                "key": key,
                "title": title[:255],
                "topic": topic[:100],
                "difficulty": diff,
                "url": _slug_url(slug) if slug else _search_url(title),
            })
    return out


def question_id_for(platform: str, key: str, taken: dict) -> int:
    """Stable id from the title, so re-seeding never changes ids. Bumps on a clash."""
    qid = NEW_ID_START + (zlib.crc32(f"{platform}:{key}".encode()) % 900_000_000)
    while taken.get(qid, key) != key:
        qid += 1
    taken[qid] = key
    return qid


# ----------------------------------------------------------------- database

def _column_exists(conn, table: str, column: str) -> bool:
    rows = engine.run_query(conn, """
        SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = %s AND column_name = %s
    """, (table, column), fetch=True)
    return rows[0]["n"] > 0


def ensure_schema(conn):
    for stmt in SCHEMA:
        engine.run_query(conn, stmt)
    if not _column_exists(conn, "users", "sheet_id"):
        engine.run_query(conn, "ALTER TABLE users ADD COLUMN sheet_id VARCHAR(40) NULL")


def seed(conn):
    """Create / refresh the sheet lists. Safe to run on every start."""
    ensure_schema(conn)

    # 1) the original starter sheet = every question that was already in the bank
    engine.run_query(conn,
        "INSERT INTO sheets (sheet_id, name, description, sort_order) VALUES (%s,%s,%s,%s) "
        "ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)",
        (DEFAULT_SHEET, "Starter 200",
         "The original LeetTrack question set (about 200 mixed questions).", 40))
    engine.run_query(conn, """
        INSERT IGNORE INTO sheet_questions (sheet_id, question_id, platform, sort_pos)
        SELECT %s, question_id, platform, question_id
        FROM question_bank WHERE question_id < %s
    """, (DEFAULT_SHEET, NEW_ID_START))

    # 2) the three new sheets, read from sheets_data/*.txt
    taken = {}
    for order, (sheet_id, filename, name, desc, platform) in enumerate(SHEET_FILES):
        items = parse_sheet_file(filename, platform)
        engine.run_query(conn,
            "INSERT INTO sheets (sheet_id, name, description, sort_order) VALUES (%s,%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), "
            "sort_order = VALUES(sort_order)",
            (sheet_id, name, desc, order))

        bank_rows, link_rows = [], []
        for pos, q in enumerate(items, start=1):
            qid = question_id_for(platform, q["key"], taken)
            bank_rows.append((qid, platform, q["title"], q["difficulty"], q["topic"], q["url"]))
            link_rows.append((sheet_id, qid, platform, pos))

        engine.run_query(conn, """
            INSERT INTO question_bank (question_id, platform, title, difficulty, topic, url)
            VALUES (%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE title = VALUES(title), difficulty = VALUES(difficulty),
                                    topic = VALUES(topic), url = VALUES(url)
        """, bank_rows, many=True)
        engine.run_query(conn, """
            INSERT INTO sheet_questions (sheet_id, question_id, platform, sort_pos)
            VALUES (%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE sort_pos = VALUES(sort_pos)
        """, link_rows, many=True)
        # drop questions that are no longer in the file
        engine.run_query(conn, "DELETE FROM sheet_questions WHERE sheet_id = %s AND sort_pos > %s",
                         (sheet_id, len(items)))


def list_sheets(conn) -> list:
    return engine.run_query(conn, """
        SELECT s.sheet_id, s.name, s.description, COUNT(sq.question_id) AS question_count
        FROM sheets AS s
        LEFT JOIN sheet_questions AS sq ON sq.sheet_id = s.sheet_id
        GROUP BY s.sheet_id, s.name, s.description, s.sort_order
        ORDER BY s.sort_order, s.name
    """, fetch=True)


def sheet_exists(conn, sheet_id: str) -> bool:
    rows = engine.run_query(conn, "SELECT 1 AS ok FROM sheets WHERE sheet_id = %s",
                            (sheet_id,), fetch=True)
    return bool(rows)


def get_user_sheet_id(conn, user_id: int):
    """The user's chosen sheet, or None if they have not chosen yet."""
    rows = engine.run_query(conn, "SELECT sheet_id FROM users WHERE user_id = %s",
                            (user_id,), fetch=True)
    return rows[0]["sheet_id"] if rows else None


def effective_sheet_id(conn, user_id: int) -> str:
    """Sheet used for new questions. Users who have not chosen keep the starter 200."""
    return get_user_sheet_id(conn, user_id) or DEFAULT_SHEET


def set_user_sheet(conn, user_id: int, sheet_id: str):
    engine.run_query(conn, "UPDATE users SET sheet_id = %s WHERE user_id = %s",
                     (sheet_id, user_id))


_ready = False


def ensure_ready(conn):
    """Called once per server run (from get_db). Cheap after the first success."""
    global _ready
    if _ready:
        return
    try:
        seed(conn)
        _ready = True
    except Exception as exc:  # noqa: BLE001 - never block a request because of setup
        print(f"[sheets] setup failed, will retry: {exc}")
