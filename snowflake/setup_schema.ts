import { executeQuery } from './lib/snowflake';
import { readFile } from 'fs/promises';
import 'dotenv/config';

async function setupSchema() {
    try {
        console.log('🔧 Setting up Snowflake schema...');

        // Read the schema SQL file
        const schemaSQL = await readFile('./snowflake/schema.sql', 'utf-8');

        // Split by semicolons and execute each statement
        const statements = schemaSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                await executeQuery(statement);
                console.log('✅ Success');
            } catch (error) {
                console.error(`❌ Failed to execute statement:`, error);
                // Continue with other statements even if one fails
            }
        }

        console.log('🎉 Schema setup completed!');

    } catch (error) {
        console.error('❌ Schema setup failed:', error);
        process.exit(1);
    }
}

setupSchema();
