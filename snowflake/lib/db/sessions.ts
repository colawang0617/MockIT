import { v4 as uuid } from 'uuid';
import { executeQuery } from '../snowflake';

export async function createSession(userId: string, targetId: string) {
    console.log('Creating session for user:', userId, 'target:', targetId);
    const sessionId = uuid();
    
    try {
        await executeQuery(
            `INSERT INTO interview_sessions (session_id, user_id, target_id, status) 
             VALUES (?, ?, ?, 'in_progress')`,
            [sessionId, userId, targetId]
        );
        console.log('Session created successfully:', sessionId);
        return sessionId;
    } catch (error) {
        console.error('Failed to create session:', error);
        throw error;
    }
}

export async function saveQA(
    sessionId: string,
    question: string,
    answer: string,
    qualityScore: number
) {
    console.log('Saving Q&A for session:', sessionId);
    const qaId = uuid();
    
    try {
        await executeQuery(
            `INSERT INTO qa_pairs 
             (qa_id, session_id, question_text, answer_text, quality_score) 
             VALUES (?, ?, ?, ?, ?)`,
            [qaId, sessionId, question, answer, qualityScore]
        );
        console.log('Q&A saved successfully:', qaId);
        return qaId;
    } catch (error) {
        console.error('Failed to save Q&A:', error);
        throw error;
    }
}

export async function completeSession(sessionId: string) {
    console.log('Completing session:', sessionId);
    
    try {
        await executeQuery(
            `UPDATE interview_sessions 
             SET status = 'completed', 
                 completed_at = CURRENT_TIMESTAMP(),
                 duration_seconds = DATEDIFF(second, started_at, CURRENT_TIMESTAMP())
             WHERE session_id = ?`,
            [sessionId]
        );
        console.log('Session completed successfully:', sessionId);
    } catch (error) {
        console.error('Failed to complete session:', error);
        throw error;
    }
}

export async function getSessionById(sessionId: string) {
    try {
        const rows = await executeQuery(
            `SELECT * FROM interview_sessions WHERE session_id = ?`,
            [sessionId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Failed to get session:', error);
        throw error;
    }
}

export async function getUserSessions(userId: string) {
    try {
        return await executeQuery(
            `SELECT
                s.session_id,
                s.status,
                s.started_at,
                s.completed_at,
                t.university,
                t.program,
                COUNT(q.qa_id) as total_questions,
                AVG(q.quality_score) as avg_score
             FROM interview_sessions s
             LEFT JOIN targets t ON s.target_id = t.target_id
             LEFT JOIN qa_pairs q ON s.session_id = q.session_id
             WHERE s.user_id = ?
             GROUP BY s.session_id, s.status, s.started_at, s.completed_at,
                      t.university, t.program
             ORDER BY s.started_at DESC`,
            [userId]
        );
    } catch (error) {
        console.error('Failed to get user sessions:', error);
        throw error;
    }
}

export interface ConversationMessage {
    role: 'interviewer' | 'user';
    content: string;
    timestamp: Date;
}

export async function saveCompleteInterviewSession(
    sessionId: string,
    userId: string,
    targetUniversity: string,
    targetProgram: string,
    conversationHistory: ConversationMessage[]
) {
    console.log('Saving complete interview session:', sessionId);

    try {
        // 1. Save the main session record
        await executeQuery(
            `INSERT INTO interview_sessions
             (session_id, user_id, target_university, target_program, status, started_at, completed_at)
             VALUES (?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP())`,
            [
                sessionId,
                userId,
                targetUniversity,
                targetProgram,
                conversationHistory[0]?.timestamp || new Date()
            ]
        );
        console.log('Session record saved');

        // 2. Save all conversation messages
        for (const message of conversationHistory) {
            const messageId = uuid();
            await executeQuery(
                `INSERT INTO conversation_messages
                 (message_id, session_id, role, content, timestamp)
                 VALUES (?, ?, ?, ?, ?)`,
                [messageId, sessionId, message.role, message.content, message.timestamp]
            );
        }
        console.log(`Saved ${conversationHistory.length} conversation messages`);

        // 3. Extract and save Q&A pairs (interviewer questions with user answers)
        for (let i = 0; i < conversationHistory.length - 1; i++) {
            const current = conversationHistory[i];
            const next = conversationHistory[i + 1];

            if (current.role === 'interviewer' && next.role === 'user') {
                const qaId = uuid();
                // Basic quality score based on answer length (can be improved with AI scoring later)
                const qualityScore = Math.min(10, Math.max(1, next.content.split(' ').length / 10));

                await executeQuery(
                    `INSERT INTO qa_pairs
                     (qa_id, session_id, question_text, answer_text, quality_score)
                     VALUES (?, ?, ?, ?, ?)`,
                    [qaId, sessionId, current.content, next.content, qualityScore]
                );
            }
        }
        console.log('Q&A pairs extracted and saved');

        console.log('✅ Complete interview session saved successfully:', sessionId);
        return sessionId;

    } catch (error) {
        console.error('❌ Failed to save interview session:', error);
        throw error;
    }
}