"""
Small, pure helpers for the Progress page (streaks, activity grid, calendar).

Nothing in this file touches the database or the network, so it can be tested
quickly with:  python -m unittest discover -s tests
"""

import re
from calendar import monthrange
from datetime import date, timedelta


def compute_streaks(active_days, today: date):
    """
    active_days: a set of dates on which the user did something.
    Returns (current_streak, longest_streak).

    The current streak keeps going if today has no activity yet but yesterday
    did, so the number does not drop to zero in the morning before you start.
    """
    days = {d for d in active_days if d <= today}
    if not days:
        return 0, 0

    longest = run = 0
    previous = None
    for d in sorted(days):
        run = run + 1 if previous is not None and d - previous == timedelta(days=1) else 1
        longest = max(longest, run)
        previous = d

    cursor = today if today in days else today - timedelta(days=1)
    current = 0
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)
    return current, longest


def build_activity_days(counts: dict, today: date, weeks: int = 12) -> list:
    """One entry per day for the last `weeks` weeks, oldest first, ending today."""
    total = weeks * 7
    start = today - timedelta(days=total - 1)
    return [
        {"date": (start + timedelta(days=i)).isoformat(),
         "count": int(counts.get(start + timedelta(days=i), 0))}
        for i in range(total)
    ]


_MONTH = re.compile(r"^(\d{4})-(\d{2})$")


def month_bounds(month: str):
    """'2026-11' -> (date(2026, 11, 1), date(2026, 11, 30)). Raises ValueError if invalid."""
    m = _MONTH.match(month or "")
    if not m:
        raise ValueError("Month must look like 2026-11.")
    year, mon = int(m.group(1)), int(m.group(2))
    if not (1 <= mon <= 12) or not (2000 <= year <= 2100):
        raise ValueError("Month must look like 2026-11.")
    return date(year, mon, 1), date(year, mon, monthrange(year, mon)[1])


def build_calendar(counts: dict, first: date, last: date) -> list:
    """One entry per day of the month, with how many revisions fall on that day."""
    out, d = [], first
    while d <= last:
        out.append({"date": d.isoformat(), "count": int(counts.get(d, 0))})
        d += timedelta(days=1)
    return out


def to_date(value):
    """MySQL gives date objects; tests and JSON may give 'YYYY-MM-DD' text."""
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])
