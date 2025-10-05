import { GoogleGenAI } from "@google/genai";
import { InterviewSession } from './websocket';
import { getEducationalContext } from './educationalContext';
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
    return (async function*() {
        // Build conversation context
        const conversationContext = session.conversationHistory
            .map(msg => `${msg.role === 'interviewer' ? 'Interviewer' : 'Student'}: ${msg.content}`)
            .join('\n');

        // Get question bank context
        const questionContext = session.questionBank.getQuestionContext();

        // Get educational context (current trends, news, etc.)
        const educationalContext = await getEducationalContext(
            session.targetUniversity,
            session.targetProgram
        );

        // Check if we should end the interview
        const timeElapsed = (Date.now() - session.startTime.getTime()) / 1000 / 60; // minutes
        const timeRemaining = session.duration - timeElapsed;

        // Reserve time for final question based on interview duration
        // 2min interview: 30 seconds, 10min: 1.5 minutes, 30min: 2 minutes
        const FINAL_QUESTION_TIME = session.duration === 2 ? 0.5 : session.duration === 10 ? 1.5 : 2;
        const shouldAskFinalQuestion = timeRemaining <= FINAL_QUESTION_TIME && session.questionsAsked < session.maxQuestions && !session.conversationHistory.some(msg => msg.content.toLowerCase().includes('what do you want to ask me'));

        const shouldEnd = session.questionsAsked >= session.maxQuestions || timeElapsed >= session.duration;

        let additionalContext = '';
        if (shouldAskFinalQuestion) {
            additionalContext = '\n\nIMPORTANT: Time is running out. Ask the student: "What questions do you have for me about the program or university?" This is their chance to ask YOU questions.';
        } else if (shouldEnd) {
            additionalContext = '\n\nIMPORTANT: This is the END of the interview. After the student responds to this, provide a brief, warm closing statement thanking them for their time and wishing them well. Keep it to 1-2 sentences.';
        } else if (session.questionsAsked < session.maxQuestions) {
            const questionsRemaining = session.maxQuestions - session.questionsAsked;
            additionalContext = `\n\nYou have asked ${session.questionsAsked} questions so far. You can ask ${questionsRemaining} more main questions (follow-ups don't count). Time remaining: ${Math.floor(timeRemaining)} minutes.`;
        }

        const prompt = `${INTERVIEWER_SYSTEM_PROMPT}

${questionContext}

${educationalContext}

Previous conversation:
${conversationContext}

Student: ${userInput}
${additionalContext}

Interviewer (respond naturally, ask follow-ups related to ${session.targetProgram} at ${session.targetUniversity}):`;

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
