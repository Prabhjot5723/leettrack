# Changelog

## 2026-11-14: Progress page, tests, docs
- Progress page: sheet progress by topic, 12-week activity grid with streak, monthly revision calendar.
- Dashboard: plain summary line ("3 revisions due, 4 new questions. 5-day streak."); emoji removed.
- Backend: `GET /api/me/topic-progress`, `/api/me/activity`, `/api/me/calendar`.
- `backend/stats.py` with the streak and calendar logic.
- 25 automated tests (`backend/tests`): streaks, calendar, the three sheet files, and the new service functions.
- `docs/ARCHITECTURE.md` with a diagram and the revision rules.

## 2026-11-05: AWS Sandbox rebuild
- New EC2 server built from `deploy/aws/setup.sh`; the sheets feature verified on AWS.

## 2026-11-02: Question sheets
- Users choose Striver A2Z, Love Babbar 450, NeetCode 150 or Starter 200.
- Tables created automatically at API start (`backend/sheets.py`).
- Fixed a start-up bug that made login return HTTP 500.

## Earlier
- Password reset and change password, front page, interactive 3D login, Render deployment, AWS deployment scripts.
