import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { generateInterviewerResponse } from './aiInterviewer';
import { generateVoiceAudio } from './voiceGenerator';
import { analyzeForInterruption, SpeechTracker } from './interruptionEngine';
import { QuestionBank } from './questionBank';
import { saveCompleteInterviewSession } from '../Snowflake/lib/db/sessions';

export interface InterviewSession {
    sessionId: string;
    userId: string;
    targetUniversity: string;
    targetProgram: string;
    questionBank: QuestionBank;
    currentDifficulty: number;
    conversationHistory: Array<{
        role: 'interviewer' | 'user';
        content: string;
        timestamp: Date;
    }>;
    speechTracker: SpeechTracker;
}

const sessions = new Map<string, InterviewSession>();

export function setupWebSocketServer(server: HTTPServer) {
    const wss = new WebSocketServer({
        server,
        path: '/ws/interview'
    });

    wss.on('connection', (ws: WebSocket) => {
        console.log('New WebSocket connection established');

        let sessionId: string | null = null;

        ws.on('message', async (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case 'init':
                        // Initialize new interview session with target school info
                        sessionId = message.sessionId || `session_${Date.now()}`;
                        const targetUniversity = message.university || 'General';
                        const targetProgram = message.program || 'All';

                        const questionBank = new QuestionBank(targetUniversity, targetProgram);

                        sessions.set(sessionId, {
                            sessionId,
                            userId: message.userId || 'guest',
                            targetUniversity,
                            targetProgram,
                            questionBank,
                            currentDifficulty: 1,
                            conversationHistory: [],
                            speechTracker: new SpeechTracker()
                        });

                        ws.send(JSON.stringify({
                            type: 'session_ready',
                            sessionId,
                            message: 'Interview session initialized'
                        }));
                        console.log(`Session initialized: ${sessionId} for ${targetUniversity} - ${targetProgram}`);

                        // Get first question from question bank
                        const firstQuestion = questionBank.getOpeningQuestion();
                        const greeting = `Hi! Thanks for taking the time to interview for ${targetProgram} at ${targetUniversity}. Let's get started. ${firstQuestion.question_text}`;

                        const currentSession = sessions.get(sessionId)!;
                        currentSession.conversationHistory.push({
                            role: 'interviewer',
                            content: greeting,
                            timestamp: new Date()
                        });

                        // Send text immediately
                        ws.send(JSON.stringify({
                            type: 'interviewer_message',
                            text: greeting
                        }));

                        // Auto-start listening
                        ws.send(JSON.stringify({
                            type: 'start_listening'
                        }));

                        // Generate audio in background
                        try {
                            const base64Audio = await generateVoiceAudio(greeting);
                            ws.send(JSON.stringify({
                                type: 'interviewer_audio',
                                audio: base64Audio
                            }));
                        } catch (error) {
                            console.error('TTS error:', error);
                        }
                        break;

                    case 'audio_chunk':
                        // Receive audio chunk from client (for STT processing)
                        if (!sessionId) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Session not initialized'
                            }));
                            return;
                        }

                        // TODO: Send to STT service
                        console.log(`Received audio chunk for session ${sessionId}`);

                        // Placeholder - will integrate STT here
                        ws.send(JSON.stringify({
                            type: 'audio_received',
                            message: 'Processing audio...'
                        }));
                        break;

                    case 'speech_interim':
                        // Real-time speech updates for interruption detection
                        if (!sessionId) return;

                        const interimSession = sessions.get(sessionId);
                        if (interimSession) {
                            const interimText = message.text;
                            const speechDuration = interimSession.speechTracker.getSpeechDuration();

                            // Check if we should interrupt
                            const interruption = await analyzeForInterruption(
                                interimText,
                                interimSession.conversationHistory,
                                speechDuration
                            );

                            if (interruption.shouldInterrupt && interruption.interruptionText) {
                                console.log(`🚨 INTERRUPTING: ${interruption.reason}`);

                                // Stop user's speech recognition
                                ws.send(JSON.stringify({
                                    type: 'interrupt',
                                    reason: interruption.reason
                                }));

                                // Send interruption immediately
                                ws.send(JSON.stringify({
                                    type: 'interviewer_message',
                                    text: interruption.interruptionText,
                                    isInterruption: true
                                }));

                                // Add to history
                                interimSession.conversationHistory.push({
                                    role: 'interviewer',
                                    content: interruption.interruptionText,
                                    timestamp: new Date()
                                });

                                // Generate audio
                                try {
                                    const base64Audio = await generateVoiceAudio(interruption.interruptionText);
                                    ws.send(JSON.stringify({
                                        type: 'interviewer_audio',
                                        audio: base64Audio
                                    }));
                                } catch (error) {
                                    console.error('TTS error during interruption:', error);
                                }

                                // Reset speech tracker
                                interimSession.speechTracker.reset();
                            }
                        }
                        break;

                    case 'text_input':
                        // Handle text input from user
                        if (!sessionId) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Session not initialized'
                            }));
                            return;
                        }

                        const session = sessions.get(sessionId);
                        if (session) {
                            const userText = message.text.trim();

                            // Update speech tracker
                            session.speechTracker.addWords(userText.split(' ').length);
                            session.speechTracker.onSpeechEnd();

                            // Add user message to history
                            session.conversationHistory.push({
                                role: 'user',
                                content: userText,
                                timestamp: new Date()
                            });

                            console.log(`User: ${userText}`);

                            // Generate AI response with streaming
                            let fullResponse = '';

                            try {
                                console.log('Generating AI response...');
                                const generator = generateInterviewerResponse(session, userText);
                                console.log('Generator created:', typeof generator);

                                // Stream text chunks to client
                                for await (const chunk of generator) {
                                    console.log('Received chunk:', chunk);
                                    fullResponse += chunk;
                                    ws.send(JSON.stringify({
                                        type: 'interviewer_text_chunk',
                                        chunk: chunk
                                    }));
                                }

                                console.log(`Full response: ${fullResponse}`);

                                if (!fullResponse) {
                                    throw new Error('Empty response from AI');
                                }

                                // Add to conversation history
                                session.conversationHistory.push({
                                    role: 'interviewer',
                                    content: fullResponse,
                                    timestamp: new Date()
                                });

                                console.log(`Interviewer: ${fullResponse}`);

                                // Send complete message
                                ws.send(JSON.stringify({
                                    type: 'interviewer_message',
                                    text: fullResponse
                                }));

                                // Generate audio
                                console.log('Generating audio...');
                                const base64Audio = await generateVoiceAudio(fullResponse);
                                ws.send(JSON.stringify({
                                    type: 'interviewer_audio',
                                    audio: base64Audio
                                }));
                                console.log('Audio sent');
                            } catch (error) {
                                console.error('Response generation error:', error);
                                console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: error instanceof Error ? error.message : 'Failed to generate response'
                                }));
                            }
                        }
                        break;

                    case 'end_session':
                        if (sessionId && sessions.has(sessionId)) {
                            const session = sessions.get(sessionId);
                            console.log(`Session ended: ${sessionId}`, session?.conversationHistory);

                            // Save to Snowflake
                            try {
                                await saveCompleteInterviewSession(
                                    sessionId,
                                    session!.userId,
                                    session!.targetUniversity,
                                    session!.targetProgram,
                                    session!.conversationHistory
                                );
                                console.log('✅ Session saved to Snowflake');
                            } catch (error) {
                                console.error('❌ Failed to save session to Snowflake:', error);
                                // Don't fail the session end if Snowflake save fails
                            }

                            sessions.delete(sessionId);

                            ws.send(JSON.stringify({
                                type: 'session_ended',
                                message: 'Interview session completed'
                            }));
                        }
                        break;

                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `Unknown message type: ${message.type}`
                        }));
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        });

        ws.on('close', () => {
            if (sessionId) {
                console.log(`WebSocket closed for session: ${sessionId}`);
                // Cleanup session if needed
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('WebSocket server initialized on /ws/interview');
    return wss;
}

export function getSession(sessionId: string): InterviewSession | undefined {
    return sessions.get(sessionId);
}
