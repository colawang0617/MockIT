import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs/promises';
import 'dotenv/config';

const GEMINI_API = process.env.GEMINI_API;
const FILENAME = 'ai_explanation.txt';

const genAI = new GoogleGenAI({ apiKey: GEMINI_API! });

export async function* generateAIAnswers(prompt: string) {
    try {
        const result = await genAI.models.generateContentStream({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
        });
        
        let fullText = '';
        
        // Stream chunks as they arrive
        for await (const chunk of result) {
            const chunkText = chunk.text;
            fullText += chunkText;
            yield chunkText; // Yield each chunk for streaming
        }
        
        // Save complete response to file
        await fs.writeFile(FILENAME, fullText, 'utf-8');
        console.log(`Successfully wrote AI explanation to ${FILENAME}`);
        
    } catch (error) {
        console.error("An error occurred:", error);
        throw error;
    }
}