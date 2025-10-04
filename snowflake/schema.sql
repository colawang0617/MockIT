-- Create database and schema
CREATE DATABASE IF NOT EXISTS INTERVIEW_PREP;
CREATE SCHEMA IF NOT EXISTS INTERVIEW_DATA;

USE DATABASE INTERVIEW_PREP;
USE SCHEMA INTERVIEW_DATA;

-- Table: interview_sessions
-- Stores metadata about each interview session
CREATE TABLE IF NOT EXISTS interview_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    target_university VARCHAR(255) NOT NULL,
    target_program VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress',
    started_at TIMESTAMP_NTZ NOT NULL,
    completed_at TIMESTAMP_NTZ,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Table: conversation_messages
-- Stores all messages in the conversation (both interviewer and user)
CREATE TABLE IF NOT EXISTS conversation_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'interviewer' or 'user'
    content TEXT NOT NULL,
    timestamp TIMESTAMP_NTZ NOT NULL,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
);

-- Table: qa_pairs
-- Extracted Q&A pairs for analytics
CREATE TABLE IF NOT EXISTS qa_pairs (
    qa_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    quality_score FLOAT,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_university ON interview_sessions(target_university);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_session_id ON qa_pairs(session_id);

-- Sample query to get session summary
-- SELECT
--     s.session_id,
--     s.target_university,
--     s.target_program,
--     s.started_at,
--     s.completed_at,
--     COUNT(DISTINCT m.message_id) as total_messages,
--     COUNT(DISTINCT q.qa_id) as total_qa_pairs,
--     AVG(q.quality_score) as avg_quality_score
-- FROM interview_sessions s
-- LEFT JOIN conversation_messages m ON s.session_id = m.session_id
-- LEFT JOIN qa_pairs q ON s.session_id = q.session_id
-- WHERE s.user_id = 'test_user'
-- GROUP BY s.session_id, s.target_university, s.target_program, s.started_at, s.completed_at
-- ORDER BY s.started_at DESC;
