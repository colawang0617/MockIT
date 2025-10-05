import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { executeQuery } from '@/snowflake/lib/snowflake';

export async function POST() {
    try {
        console.log('🔄 Sync user API called');
        const { userId } = await auth();

        console.log('👤 User ID from Clerk:', userId);

        if (!userId) {
            console.error('❌ No user ID - unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('📊 Syncing to Snowflake...');
        // Sync user to Snowflake asynchronously
        // This happens in the background and doesn't block the login flow
        await executeQuery(
            `MERGE INTO USERS AS target
             USING (SELECT ? AS clerk_user_id, CURRENT_TIMESTAMP() AS last_login) AS source
             ON target.clerk_user_id = source.clerk_user_id
             WHEN MATCHED THEN
                 UPDATE SET last_login = source.last_login
             WHEN NOT MATCHED THEN
                 INSERT (clerk_user_id, created_at, last_login)
                 VALUES (source.clerk_user_id, CURRENT_TIMESTAMP(), source.last_login)`,
            [userId]
        );

        console.log('✅ Snowflake sync successful for user:', userId);
        return NextResponse.json({ success: true, userId });
    } catch (error: any) {
        console.error('❌ Snowflake sync error:', error);
        // Don't fail the request - just log the error
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
