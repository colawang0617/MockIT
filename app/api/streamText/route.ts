import { NextRequest } from 'next/server';
import { generateAIAnswers } from '@/GeminiAPI/generate';

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
                    // Stream text chunks as they're generated
                    for await (const textChunk of generateAIAnswers(prompt)) {
                        const sseData = `data: ${JSON.stringify({
                            type: 'text',
                            chunk: textChunk
                        })}\n\n`;

                        controller.enqueue(encoder.encode(sseData));
                    }

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
