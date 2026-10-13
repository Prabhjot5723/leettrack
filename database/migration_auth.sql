-- LeetTrack: add login support to an EXISTING database.
-- Run this ONCE (MySQL does not allow re-running ADD COLUMN):
--   mysql -u root -p leetcode_tracker < database/migration_auth.sql
-- or paste it into MySQL Workbench with the leetcode_tracker database selected.

USE leetcode_tracker;

ALTER TABLE users
    ADD COLUMN email         VARCHAR(255) NULL,
    ADD COLUMN password_hash VARCHAR(255) NULL,
    ADD COLUMN created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD UNIQUE KEY uq_users_email (email),
    ADD UNIQUE KEY uq_users_username (username);

-- Speeds up "what is due for this user" queries
CREATE INDEX idx_solved_user_due ON solved_questions (user_id, due_date);

-- Optional: a dedicated, limited MySQL user for the app (do NOT use root online).
-- Change the password before running!
-- CREATE USER 'leettrack_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON leetcode_tracker.* TO 'leettrack_app'@'localhost';
-- FLUSH PRIVILEGES;
