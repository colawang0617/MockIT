import { NextRequest } from 'next/server';
import { generateAIAnswers } from '@/GeminiAPI/generate';
import { textToSpeechAudio } from '@/elevenlabs/textToSpeechAudio';
import { readFile } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let fullText = '';

                    // Stream text as it's generated
                    for await (const textChunk of generateAIAnswers(prompt)) {
                        fullText += textChunk;

                        // Send text chunks to frontend
                        const textData = `data: ${JSON.stringify({
                            type: 'text',
                            chunk: textChunk
                        })}\n\n`;
                        controller.enqueue(encoder.encode(textData));
                    }

                    // Now convert complete text to speech (single API call)
                    const statusData = `data: ${JSON.stringify({
                        type: 'status',
                        message: 'Converting to speech...'
                    })}\n\n`;
                    controller.enqueue(encoder.encode(statusData));

                    const audioFileName = await textToSpeechAudio(fullText);
                    const audioBuffer = await readFile(audioFileName);
                    const base64Audio = audioBuffer.toString('base64');

                    // Send complete audio
                    const audioData = `data: ${JSON.stringify({
                        type: 'audio',
                        data: base64Audio
                    })}\n\n`;
                    controller.enqueue(encoder.encode(audioData));

                    // Send completion event
                    const completeData = `data: ${JSON.stringify({ type: 'complete' })}\n\n`;
                    controller.enqueue(encoder.encode(completeData));
                    controller.close();
                } catch (error) {
                    const errorData = `data: ${JSON.stringify({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Stream error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to start stream' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
