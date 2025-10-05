import 'dotenv/config';
import { executeQuery } from './lib/snowflake';

async function setupUsersTable() {
    try {
        console.log('Setting up Snowflake database...');

        // Create database and schema first (without using them in connection)
        console.log('1. Creating database...');
        await executeQuery('CREATE DATABASE IF NOT EXISTS INTERVIEW_PREP');

        console.log('2. Using database...');
        await executeQuery('USE DATABASE INTERVIEW_PREP');

        console.log('3. Creating schema...');
        await executeQuery('CREATE SCHEMA IF NOT EXISTS INTERVIEW_DATA');

        console.log('4. Using schema...');
        await executeQuery('USE SCHEMA INTERVIEW_DATA');

        console.log('5. Creating USERS table...');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS USERS (
                USER_ID VARCHAR(255) PRIMARY KEY,
                EMAIL VARCHAR(255) UNIQUE NOT NULL,
                PASSWORD_HASH VARCHAR(255) NOT NULL,
                CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
            )
        `;

        await executeQuery(createTableQuery);
        console.log('✅ Snowflake setup complete! USERS table ready.');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        throw error;
    }
}

setupUsersTable()
    .then(() => {
        console.log('Database setup complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
