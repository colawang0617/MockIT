-- Step-by-step SQL to create the database and table
-- Copy and paste each section into Snowflake web console

-- 1. Create database
CREATE DATABASE IF NOT EXISTS INTERVIEW_PREP;

-- 2. Switch to database
USE DATABASE INTERVIEW_PREP;

-- 3. Create schema
CREATE SCHEMA IF NOT EXISTS INTERVIEW_DATA;

-- 4. Switch to schema
USE SCHEMA INTERVIEW_DATA;

-- 5. Create USERS table
CREATE TABLE IF NOT EXISTS USERS (
    USER_ID VARCHAR(255) PRIMARY KEY,
    EMAIL VARCHAR(255) UNIQUE NOT NULL,
    PASSWORD_HASH VARCHAR(255) NOT NULL,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- 6. Verify table exists
SHOW TABLES;

-- 7. Check table structure
DESCRIBE TABLE USERS;

-- 8. Test query (should return 0 rows)
SELECT * FROM USERS;
