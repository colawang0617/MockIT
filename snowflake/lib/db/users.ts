import { v4 as uuid } from 'uuid';
import { executeQuery } from '../snowflake';

export async function createUser(email: string, name: string, passwordHash: string) {
    const userId = uuid();
    
    await executeQuery(
        `INSERT INTO users (user_id, email, name, password_hash) 
         VALUES (?, ?, ?, ?)`,
        [userId, email, name, passwordHash]
    );
    
    return userId;
}

export async function getUserByEmail(email: string) {
    const rows = await executeQuery(
        `SELECT * FROM users WHERE email = ?`,
        [email]
    );
    
    return rows[0] || null;
}