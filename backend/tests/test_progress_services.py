"""
Runs the Progress-page service functions against a fake database, so the
result shaping (not the SQL itself) is checked without needing MySQL.
"""
import sys
import types
import unittest
from datetime import date

sys.path.insert(0, __file__.rsplit("tests", 1)[0])

# Stand-ins for packages that are only needed when the real server runs.
for name in ("mysql", "mysql.connector", "auth", "bcrypt", "jwt"):
    sys.modules.setdefault(name, types.ModuleType(name))
sys.modules["mysql"].connector = sys.modules["mysql.connector"]
sys.modules["mysql.connector"].Error = Exception

engine = types.ModuleType("engine")
sys.modules["engine"] = engine
sheets_stub = types.ModuleType("sheets")
sheets_stub.effective_sheet_id = lambda conn, uid: "neetcode-150"
sys.modules["sheets"] = sheets_stub

import services  # noqa: E402

# services keeps its own reference; remove the stub so other test files can import the real module
sys.modules.pop("sheets", None)


class FakeDB:
    def __init__(self, answers):
        self.answers = answers

    def __call__(self, conn, query, params=None, fetch=False, many=False):
        q = " ".join(query.split())
        for needle, rows in self.answers:
            if needle in q:
                return rows
        raise AssertionError("unexpected query: " + q[:80])


class ProgressServiceTests(unittest.TestCase):
    def setUp(self):
        services.today = lambda: date(2026, 11, 14)

    def test_topic_progress(self):
        engine.run_query = FakeDB([
            ("SELECT user_id FROM users", [{"user_id": 1}]),
            ("GROUP BY qb.topic", [
                {"topic": "Arrays & Hashing", "total": 9, "solved": 4, "first_pos": 1},
                {"topic": "Two Pointers", "total": 5, "solved": 0, "first_pos": 10},
            ]),
        ])
        out = services.get_topic_progress(None, 1)
        self.assertEqual(out["sheet_id"], "neetcode-150")
        self.assertEqual(out["topics"][0], {"topic": "Arrays & Hashing", "total": 9, "solved": 4})
        self.assertEqual(len(out["topics"]), 2)

    def test_activity_and_streak(self):
        engine.run_query = FakeDB([
            ("SELECT user_id FROM users", [{"user_id": 1}]),
            ("UNION ALL", [
                {"d": date(2026, 11, 14), "n": 2},
                {"d": date(2026, 11, 13), "n": 1},
                {"d": date(2026, 11, 1), "n": 4},
            ]),
        ])
        out = services.get_activity(None, 1)
        self.assertEqual(out["current_streak"], 2)
        self.assertEqual(out["longest_streak"], 2)
        self.assertEqual(out["active_days"], 3)
        self.assertEqual(len(out["days"]), 84)
        self.assertEqual(out["days"][-1], {"date": "2026-11-14", "count": 2})

    def test_calendar(self):
        engine.run_query = FakeDB([
            ("SELECT user_id FROM users", [{"user_id": 1}]),
            ("BETWEEN", [{"d": date(2026, 11, 20), "n": 3}]),
            ("due_date < %s", [{"n": 2}]),
        ])
        out = services.get_revision_calendar(None, 1, "2026-11")
        self.assertEqual(len(out["days"]), 30)
        self.assertEqual(out["days"][19], {"date": "2026-11-20", "count": 3})
        self.assertEqual(out["overdue"], 2)

    def test_calendar_rejects_bad_month(self):
        engine.run_query = FakeDB([("SELECT user_id FROM users", [{"user_id": 1}])])
        with self.assertRaises(services.ValidationError):
            services.get_revision_calendar(None, 1, "not-a-month")

    def test_unknown_user(self):
        engine.run_query = FakeDB([("SELECT user_id FROM users", [])])
        with self.assertRaises(services.NotFoundError):
            services.get_activity(None, 99)


if __name__ == "__main__":
    unittest.main()
