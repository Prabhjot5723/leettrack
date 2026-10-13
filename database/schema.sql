-- LeetTrack schema
--
-- These table/column names are exactly what engine.py's queries expect
-- (extracted from the original notebook). If you already have a
-- `leetcode_tracker` database with these tables, you do NOT need to run
-- this file — it exists so a fresh clone can create a compatible database
-- from scratch. Uses CREATE TABLE IF NOT EXISTS so it's safe to re-run.

CREATE DATABASE IF NOT EXISTS leetcode_tracker;
USE leetcode_tracker;

CREATE TABLE IF NOT EXISTS users (
    user_id       INT PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NULL,
    password_hash VARCHAR(255) NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username)
);

CREATE TABLE IF NOT EXISTS question_bank (
    question_id INT NOT NULL,
    platform    VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    difficulty  ENUM('Easy', 'Medium', 'Hard') NOT NULL,
    topic       VARCHAR(100),
    url         VARCHAR(500),
    PRIMARY KEY (question_id, platform)
);

CREATE TABLE IF NOT EXISTS solved_questions (
    user_id             INT NOT NULL,
    question_id         INT NOT NULL,
    platform            VARCHAR(50) NOT NULL,
    solved_date         DATE NOT NULL,
    revision_counter    INT NOT NULL DEFAULT 0,
    last_revision_date  DATE,
    due_date            DATE,
    PRIMARY KEY (user_id, question_id, platform),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (question_id, platform) REFERENCES question_bank(question_id, platform)
);

-- Speeds up "what is due for this user" queries
-- (skip this line if you get "Duplicate key name" on a re-run)
CREATE INDEX idx_solved_user_due ON solved_questions (user_id, due_date);
