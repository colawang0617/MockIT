import { NextResponse } from 'next/server';
import { executeQuery } from '@/snowflake/lib/snowflake';

// Test endpoint to manually trigger Snowflake sync without Clerk
export async function GET() {
    try {
        console.log('🧪 Test sync started');

        const testUserId = `test_user_${Date.now()}`;

        console.log('📊 Inserting test user to Snowflake:', testUserId);

        await executeQuery(
            `INSERT INTO USERS (clerk_user_id, created_at, last_login)
             VALUES (?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
            [testUserId]
        );

        console.log('✅ Test sync successful!');

        // Verify it was inserted
        const rows = await executeQuery('SELECT * FROM USERS');

        return NextResponse.json({
            success: true,
            testUserId,
            totalUsers: rows.length,
            users: rows
        });
    } catch (error: any) {
        console.error('❌ Test sync error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
