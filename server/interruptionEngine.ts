import { InterviewSession } from './websocket';
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';

const GEMINI_API = process.env.GEMINI_API;
const genAI = new GoogleGenAI({ apiKey: GEMINI_API! });

export interface InterruptionTrigger {
    shouldInterrupt: boolean;
    reason: 'rambling' | 'vague' | 'pause' | 'clarification_needed' | 'none';
    interruptionText?: string;
}

/**
 * Analyzes user's speech to determine if AI should interrupt
 */
export async function analyzeForInterruption(
    userText: string,
    conversationHistory: InterviewSession['conversationHistory'],
    speechDuration: number
): Promise<InterruptionTrigger> {

    // More natural heuristics - require stronger signals before interrupting
    const wordCount = userText.split(' ').length;
    const hasLongPause = speechDuration > 5000; // 5 seconds of silence (increased for more natural conversation)
    const isTooLong = wordCount > 200; // Increased from 150 - allow even longer responses
    const isVague = hasVagueIndicators(userText);

    // Don't interrupt too quickly - require at least 20 words
    if (wordCount < 20) {
        return { shouldInterrupt: false, reason: 'none' };
    }

    // Interrupt if seriously rambling (very long without pausing)
    if (isTooLong) {
        return {
            shouldInterrupt: true,
            reason: 'rambling',
            interruptionText: await generateInterruption('rambling', userText, conversationHistory)
        };
    }

    // Interrupt if answer is very vague and substantial enough
    if (isVague && wordCount > 30) {
        // Add randomness - only interrupt 60% of the time even when vague
        if (Math.random() > 0.4) {
            return {
                shouldInterrupt: true,
                reason: 'clarification_needed',
                interruptionText: await generateInterruption('clarification', userText, conversationHistory)
            };
        }
    }

    // Natural pause - good time to interject with follow-up
    if (hasLongPause && wordCount > 20) {
        const shouldAskFollowUp = Math.random() > 0.7; // 30% chance (reduced from 40%)
        if (shouldAskFollowUp) {
            return {
                shouldInterrupt: true,
                reason: 'pause',
                interruptionText: await generateInterruption('followup', userText, conversationHistory)
            };
        }
    }

    return { shouldInterrupt: false, reason: 'none' };
}

/**
 * Detects vague language patterns
 */
function hasVagueIndicators(text: string): boolean {
    const vaguePatterns = [
        /\b(um+|uh+|like|you know|kind of|sort of|i guess|maybe|probably)\b/gi,
        /\b(stuff|things|something|whatever)\b/gi,
    ];

    let vagueCount = 0;
    for (const pattern of vaguePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            vagueCount += matches.length;
        }
    }

    // Consider vague if more than 3 vague words
    return vagueCount > 3;
}

/**
 * Generates contextual interruption based on reason
 */
async function generateInterruption(
    type: 'rambling' | 'clarification' | 'followup',
    userText: string,
    conversationHistory: InterviewSession['conversationHistory']
): Promise<string> {

    const prompts = {
        rambling: `The student is rambling. Politely interrupt and refocus them with a specific question. Their recent response: "${userText.slice(-200)}"`,

        clarification: `The student gave a vague answer. Interrupt gently to ask for a specific example or clarification. Their response: "${userText}"`,

        followup: `The student paused. Jump in with an engaging follow-up question to dig deeper. Their response: "${userText}"`
    };

    const context = conversationHistory
        .slice(-3)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

    const prompt = `You are an interviewer. ${prompts[type]}

Recent conversation:
${context}

Interrupt naturally with a brief (1 sentence) question:`;

    try {
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
        });

        return result.text || "Could you tell me more about that?";
    } catch (error) {
        console.error('Interruption generation error:', error);
        // Fallback interruptions
        const fallbacks = {
            rambling: "Sorry to interrupt - can you give me a specific example?",
            clarification: "Hold on - can you clarify what you mean by that?",
            followup: "Interesting - how did that make you feel?"
        };
        return fallbacks[type];
    }
}

/**
 * Tracks user speech patterns for interruption timing
 */
export class SpeechTracker {
    private lastSpeechTime: number = 0;
    private totalWords: number = 0;
    private pauseStart: number | null = null;

    onSpeechStart() {
        this.lastSpeechTime = Date.now();
        this.pauseStart = null;
    }

    onSpeechEnd() {
        this.pauseStart = Date.now();
    }

    addWords(count: number) {
        this.totalWords += count;
    }

    getPauseDuration(): number {
        if (!this.pauseStart) return 0;
        return Date.now() - this.pauseStart;
    }

    getSpeechDuration(): number {
        return Date.now() - this.lastSpeechTime;
    }

    getTotalWords(): number {
        return this.totalWords;
    }

    reset() {
        this.lastSpeechTime = Date.now();
        this.totalWords = 0;
        this.pauseStart = null;
    }
}
