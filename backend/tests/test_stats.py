import sys
import unittest
from datetime import date

sys.path.insert(0, __file__.rsplit("tests", 1)[0])

import stats  # noqa: E402

TODAY = date(2026, 11, 14)


def d(day):
    return date(2026, 11, day)


class StreakTests(unittest.TestCase):
    def test_no_activity(self):
        self.assertEqual(stats.compute_streaks(set(), TODAY), (0, 0))

    def test_today_only(self):
        self.assertEqual(stats.compute_streaks({d(14)}, TODAY), (1, 1))

    def test_three_days_in_a_row(self):
        self.assertEqual(stats.compute_streaks({d(12), d(13), d(14)}, TODAY), (3, 3))

    def test_streak_survives_until_today_ends(self):
        # nothing yet today, but yesterday and the day before count
        self.assertEqual(stats.compute_streaks({d(12), d(13)}, TODAY), (2, 2))

    def test_streak_breaks_after_a_missed_day(self):
        self.assertEqual(stats.compute_streaks({d(10), d(11)}, TODAY), (0, 2))

    def test_longest_is_remembered(self):
        days = {d(1), d(2), d(3), d(4), d(13), d(14)}
        self.assertEqual(stats.compute_streaks(days, TODAY), (2, 4))

    def test_future_dates_are_ignored(self):
        self.assertEqual(stats.compute_streaks({d(14), d(20)}, TODAY), (1, 1))


class ActivityTests(unittest.TestCase):
    def test_length_and_order(self):
        days = stats.build_activity_days({}, TODAY, weeks=12)
        self.assertEqual(len(days), 84)
        self.assertEqual(days[-1]["date"], "2026-11-14")
        self.assertEqual(days[0]["date"], "2026-08-23")

    def test_counts_are_filled_in(self):
        days = stats.build_activity_days({d(14): 3, d(1): 1}, TODAY)
        by_date = {x["date"]: x["count"] for x in days}
        self.assertEqual(by_date["2026-11-14"], 3)
        self.assertEqual(by_date["2026-11-01"], 1)
        self.assertEqual(by_date["2026-11-02"], 0)


class CalendarTests(unittest.TestCase):
    def test_month_bounds(self):
        self.assertEqual(stats.month_bounds("2026-11"), (date(2026, 11, 1), date(2026, 11, 30)))
        self.assertEqual(stats.month_bounds("2028-02")[1], date(2028, 2, 29))  # leap year

    def test_bad_months_are_rejected(self):
        for bad in ["", "2026", "2026-13", "2026-00", "11-2026", "abcd-ef", None, "1999-05"]:
            with self.assertRaises(ValueError, msg=str(bad)):
                stats.month_bounds(bad)

    def test_calendar_has_every_day(self):
        first, last = stats.month_bounds("2026-11")
        days = stats.build_calendar({d(5): 2}, first, last)
        self.assertEqual(len(days), 30)
        self.assertEqual(days[4], {"date": "2026-11-05", "count": 2})
        self.assertEqual(days[0]["count"], 0)

    def test_to_date(self):
        self.assertEqual(stats.to_date("2026-11-14"), d(14))
        self.assertEqual(stats.to_date(d(14)), d(14))


if __name__ == "__main__":
    unittest.main()
