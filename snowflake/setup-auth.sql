-- Snowflake setup for Clerk authentication
-- Run this in your Snowflake console

USE DATABASE mockit_db;
USE SCHEMA user_info;

-- Drop existing table if it exists
DROP TABLE IF EXISTS USERS;

-- Create the USERS table with Clerk integration (standard table, not hybrid)
CREATE TABLE USERS (
    clerk_user_id VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    last_login TIMESTAMP_NTZ,
    metadata VARIANT,  -- Store additional user data as JSON
    PRIMARY KEY (clerk_user_id)
);

-- Grant permissions (adjust role name as needed)
GRANT SELECT, INSERT, UPDATE ON TABLE USERS TO ROLE PUBLIC;

SELECT 'Snowflake auth setup completed!' as status;
