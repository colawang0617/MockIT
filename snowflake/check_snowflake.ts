import 'dotenv/config';
import { executeQuery } from './lib/snowflake';

async function checkSnowflake() {
    try {
        console.log('Checking Snowflake connection and permissions...');

        // Check current database
        console.log('\n1. Checking current database context:');
        const dbResult = await executeQuery('SELECT CURRENT_DATABASE(), CURRENT_SCHEMA(), CURRENT_WAREHOUSE()');
        console.log('Current context:', dbResult);

        // Show available databases
        console.log('\n2. Checking available databases:');
        const databases = await executeQuery('SHOW DATABASES');
        console.log('Databases:', databases);

        // Check warehouse status
        console.log('\n3. Checking warehouse status:');
        const warehouse = await executeQuery('SHOW WAREHOUSES LIKE \'COMPUTE_WH\'');
        console.log('Warehouse:', warehouse);

        console.log('\n✅ Connection check complete');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

checkSnowflake()
    .then(() => {
        console.log('\nDone');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed:', error);
        process.exit(1);
    });
