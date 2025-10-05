# Snowflake Database Manual Setup

Since the automated setup scripts are timing out (likely due to warehouse being suspended or permissions), please follow these steps in your Snowflake web console:

## Step 1: Log into Snowflake
1. Go to https://app.snowflake.com/
2. Login with:
   - Account: **LD82662**
   - Username: **h358wang**
   - Password: (your password)

## Step 2: Start the Warehouse
1. Click on **Admin** → **Warehouses**
2. Find **COMPUTE_WH**
3. Click the **Resume** button if it's suspended
4. Wait until it shows "Running" status

## Step 3: Create Database and Table
1. Click on **Worksheets** in the left sidebar
2. Copy and paste this SQL code:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS INTERVIEW_PREP;

-- Switch to the new database
USE DATABASE INTERVIEW_PREP;

-- Create the schema
CREATE SCHEMA IF NOT EXISTS INTERVIEW_DATA;

-- Switch to the new schema
USE SCHEMA INTERVIEW_DATA;

-- Create the USERS table
CREATE TABLE IF NOT EXISTS USERS (
    USER_ID VARCHAR(255) PRIMARY KEY,
    EMAIL VARCHAR(255) UNIQUE NOT NULL,
    PASSWORD_HASH VARCHAR(255) NOT NULL,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Verify the table was created
SHOW TABLES;

-- Check table structure
DESCRIBE TABLE USERS;
```

3. Click the **Run** button (▶️) at the top
4. You should see success messages for each statement

## Step 4: Verify Setup
Run this query to make sure everything works:

```sql
SELECT * FROM INTERVIEW_PREP.INTERVIEW_DATA.USERS;
```

It should return 0 rows (empty table).

## Step 5: Test from Your App
1. Go to http://localhost:3000/login
2. Click "Sign Up"
3. Enter email and password
4. Click "Create Account"

## Step 6: Verify Data Saved
Go back to Snowflake and run:

```sql
SELECT * FROM INTERVIEW_PREP.INTERVIEW_DATA.USERS;
```

You should see your newly created user!

---

## Troubleshooting

**If warehouse won't start:**
- You might not have permission to resume it
- Contact your Snowflake admin

**If CREATE DATABASE fails:**
- You might not have permission to create databases
- Ask your admin to create it for you or grant you the `CREATE DATABASE` privilege

**If signup still doesn't work:**
- Check the browser console (F12) for errors
- Check the terminal where `npm run dev` is running for error messages
