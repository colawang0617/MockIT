import snowflake from 'snowflake-sdk';

// Create a fresh connection each time to avoid stale connections
export function getSnowflakeConnection(){
    const connection = snowflake.createConnection({
        account: process.env.SNOWFLAKE_ACCOUNT!,
        username: process.env.SNOWFLAKE_USERNAME!,
        password: process.env.SNOWFLAKE_PASSWORD!,
        warehouse: 'COMPUTE_WH',
        database: process.env.SNOWFLAKE_DATABASE!,
        schema: process.env.SNOWFLAKE_SCHEMA!
    });
    return connection;
}

export async function executeQuery(query: string, binds: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const conn = getSnowflakeConnection();

        conn.connect((err: any) => {
            if (err) {
                console.error('❌ Snowflake connection error:', err);
                reject(err);
                return;
            }

            console.log('✅ Snowflake connected, setting context and executing query...');

            // Set database and schema context first
            const contextQuery = `USE DATABASE ${process.env.SNOWFLAKE_DATABASE}; USE SCHEMA ${process.env.SNOWFLAKE_SCHEMA};`;

            conn.execute({
                sqlText: contextQuery,
                complete: (contextErr: any) => {
                    if (contextErr) {
                        console.error('❌ Context setup error:', contextErr);
                        conn.destroy(() => {});
                        reject(contextErr);
                        return;
                    }

                    // Now execute the actual query
                    conn.execute({
                        sqlText: query,
                        binds: binds,
                        complete: (err: any, stmt: any, rows: any) => {
                            // Always destroy connection after query
                            conn.destroy((destroyErr: any) => {
                                if (destroyErr) {
                                    console.error('⚠️ Error closing connection:', destroyErr);
                                }
                            });

                            if (err) {
                                console.error('❌ Query error:', err);
                                reject(err);
                            } else {
                                console.log('✅ Query successful, rows:', rows?.length || 0);
                                resolve(rows || []);
                            }
                        }
                    });
                }
            });
        });
    });
}

/**
 * Create a new user account
 */
export async function createUser(email: string, password: string): Promise<string> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
        await executeQuery(
            `INSERT INTO USERS (id, email, password, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP())`,
            [userId, email, password] // In production, password should be hashed!
        );
        return userId;
    } catch (error: any) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
            throw new Error('User with this email already exists');
        }
        throw error;
    }
}

/**
 * Authenticate user login
 */
export async function authenticateUser(email: string, password: string): Promise<{ userId: string } | null> {
    const rows = await executeQuery(
        `SELECT USER_ID FROM USERS WHERE email = ? AND password = ?`,
        [email, password] 
    );

    if (rows.length > 0) {
        return { userId: rows[0].USER_ID };
    }
    return null;
}