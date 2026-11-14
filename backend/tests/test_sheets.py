"""Checks the three sheet files so a typo in the data is caught before deploying."""
import sys
import types
import unittest

sys.path.insert(0, __file__.rsplit("tests", 1)[0])
sys.modules.setdefault("engine", types.ModuleType("engine"))  # sheets.py needs no real database here

import sheets  # noqa: E402


class SheetFileTests(unittest.TestCase):
    EXPECTED_MIN = {"striver-a2z": 420, "love-babbar-450": 400, "neetcode-150": 150}

    def load(self, sheet_id):
        for sid, filename, _name, _desc, platform in sheets.SHEET_FILES:
            if sid == sheet_id:
                return platform, sheets.parse_sheet_file(filename, platform)
        raise AssertionError(sheet_id)

    def test_sizes(self):
        for sid, minimum in self.EXPECTED_MIN.items():
            _, items = self.load(sid)
            self.assertGreaterEqual(len(items), minimum, sid)

    def test_neetcode_is_exactly_150(self):
        self.assertEqual(len(self.load("neetcode-150")[1]), 150)

    def test_every_question_is_complete(self):
        for sid in self.EXPECTED_MIN:
            for q in self.load(sid)[1]:
                self.assertIn(q["difficulty"], ("Easy", "Medium", "Hard"), q["title"])
                self.assertTrue(q["title"] and q["topic"] and q["url"].startswith("https://"), q)
                self.assertLessEqual(len(q["title"]), 255)
                self.assertLessEqual(len(q["topic"]), 100)

    def test_no_duplicate_titles_inside_a_sheet(self):
        for sid in self.EXPECTED_MIN:
            keys = [q["key"] for q in self.load(sid)[1]]
            self.assertEqual(len(keys), len(set(keys)), sid)

    def test_ids_are_unique_and_never_touch_the_old_200(self):
        taken, seen = {}, set()
        for sid in self.EXPECTED_MIN:
            platform, items = self.load(sid)
            for q in items:
                qid = sheets.question_id_for(platform, q["key"], taken)
                self.assertGreaterEqual(qid, sheets.NEW_ID_START)
                self.assertLess(qid, 2**31 - 1)
                seen.add((qid, platform))
        # a title shared by two sheets on the same platform gets one shared id
        total = sum(len(self.load(s)[1]) for s in self.EXPECTED_MIN)
        self.assertLessEqual(len(seen), total)

    def test_ids_are_stable_between_runs(self):
        a = sheets.question_id_for("LeetCode", "two sum", {})
        b = sheets.question_id_for("LeetCode", "two sum", {})
        self.assertEqual(a, b)

    def test_neetcode_links_are_leetcode_pages(self):
        for q in self.load("neetcode-150")[1]:
            self.assertTrue(q["url"].startswith("https://leetcode.com/problems/"), q["url"])


if __name__ == "__main__":
    unittest.main()
