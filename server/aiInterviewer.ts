import { GoogleGenAI } from "@google/genai";
import { InterviewSession } from './websocket';
import 'dotenv/config';

const GEMINI_API = process.env.GEMINI_API;
const genAI = new GoogleGenAI({ apiKey: GEMINI_API! });

const INTERVIEWER_SYSTEM_PROMPT = `You are an experienced college admissions interviewer. Conduct a natural, conversational interview.

Guidelines:
- Keep responses SHORT and conversational (1-3 sentences max)
- Ask ONE question at a time
- Show genuine interest and follow up on what the student says
- Be warm but professional
- Ask follow-up questions based on their answers
- Occasionally interrupt politely to dig deeper or redirect
- Start with an icebreaker, then transition to deeper questions about their goals, experiences, and fit

Remember: This is a CONVERSATION, not an interrogation. Be human-like and natural.`;

export function generateInterviewerResponse(
    session: InterviewSession,
    userInput: string
): AsyncGenerator<string> {
    // Build conversation context
    const conversationContext = session.conversationHistory
        .map(msg => `${msg.role === 'interviewer' ? 'Interviewer' : 'Student'}: ${msg.content}`)
        .join('\n');

    // Get question bank context
    const questionContext = session.questionBank.getQuestionContext();

    const prompt = `${INTERVIEWER_SYSTEM_PROMPT}

${questionContext}

Previous conversation:
${conversationContext}

Student: ${userInput}

Interviewer (respond naturally, ask follow-ups related to ${session.targetProgram} at ${session.targetUniversity}):`;

    return (async function*() {
        yield* generateStreamingResponse(prompt);
    })();
}

export async function* generateStreamingResponse(prompt: string): AsyncGenerator<string> {
    try {
        const result = await genAI.models.generateContentStream({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
        });

        for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
                yield text;
            }
        }
    } catch (error) {
        console.error("AI generation error:", error);
        yield "I'm sorry, could you repeat that?";
    }
}

export async function startInterview(): Promise<string> {
    const greetings = [
        "Hi! Thanks for taking the time to chat with me today. How are you doing?",
        "Hello! I'm excited to learn more about you. How's your day going so far?",
        "Hey there! Great to meet you. Before we dive in, how are you feeling today?",
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
}
