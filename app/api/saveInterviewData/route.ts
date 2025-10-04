import { NextRequest, NextResponse } from 'next/server';
import { createSession, saveQA, completeSession } from '../../../lib/db/sessions';

export async function POST(req: NextRequest) {
    try {
        const { userId, targetId, questions, answers } = await req.json();
        
        // 1. Create session
        const sessionId = await createSession(userId, targetId);
        
        // 2. Save all Q&A pairs
        for (let i = 0; i < questions.length; i++) {
            await saveQA(
                sessionId,
                questions[i],
                answers[i],
                8.5 // quality score from AI analysis
            );
        }
        
        // 3. Complete session
        await completeSession(sessionId);
        
        return NextResponse.json({
            success: true,
            sessionId
        });
        
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to save interview' },
            { status: 500 }
        );
    }
}