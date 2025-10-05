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
    isAISpeaking: boolean; // Track if AI is currently speaking
    duration: number; // Interview duration in minutes
    maxQuestions: number; // Maximum questions based on duration
    questionsAsked: number; // Track how many main questions asked
    startTime: Date; // Interview start time
    hasWarmup: boolean; // Whether to include warmup
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
                        const duration = message.duration || 10; // Default 10 minutes

                        // Calculate max questions based on duration
                        let maxQuestions = 3;
                        let hasWarmup = false;
                        if (duration === 2) {
                            maxQuestions = 2;
                            hasWarmup = false;
                        } else if (duration === 10) {
                            maxQuestions = 5;
                            hasWarmup = true;
                        } else if (duration === 30) {
                            maxQuestions = 10;
                            hasWarmup = true;
                        }

                        const questionBank = new QuestionBank(targetUniversity, targetProgram);

                        sessions.set(sessionId, {
                            sessionId,
                            userId: message.userId || 'guest',
                            targetUniversity,
                            targetProgram,
                            questionBank,
                            currentDifficulty: 1,
                            conversationHistory: [],
                            speechTracker: new SpeechTracker(),
                            isAISpeaking: false,
                            duration,
                            maxQuestions,
                            questionsAsked: 0,
                            startTime: new Date(),
                            hasWarmup
                        });

                        ws.send(JSON.stringify({
                            type: 'session_ready',
                            sessionId,
                            message: 'Interview session initialized'
                        }));
                        console.log(`Session initialized: ${sessionId} for ${targetUniversity} - ${targetProgram} (${duration} mins, max ${maxQuestions} questions)`);

                        // Create greeting based on duration
                        const currentSession = sessions.get(sessionId)!;
                        let greeting: string;

                        if (hasWarmup) {
                            // For 10min+ interviews, start with warmup
                            greeting = `Hi! Thanks for taking the time to interview for ${targetProgram} at ${targetUniversity}. Before we dive into the formal questions, I'd love to get to know you a bit. How are you doing today?`;
                        } else {
                            // For short interviews, jump straight to questions
                            const firstQuestion = questionBank.getOpeningQuestion();
                            greeting = `Hi! Thanks for taking the time to chat about ${targetProgram} at ${targetUniversity}. Let's get started. ${firstQuestion.question_text}`;
                            currentSession.questionsAsked = 1;
                        }

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
                            currentSession.isAISpeaking = true;
                            const base64Audio = await generateVoiceAudio(greeting);
                            ws.send(JSON.stringify({
                                type: 'interviewer_audio',
                                audio: base64Audio
                            }));
                            // Mark AI as finished speaking after sending audio
                            setTimeout(() => {
                                currentSession.isAISpeaking = false;
                            }, 100); // Small delay to ensure audio starts playing
                        } catch (error) {
                            console.error('TTS error:', error);
                            currentSession.isAISpeaking = false;
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
                            // Prevent user from speaking while AI is talking
                            if (interimSession.isAISpeaking) {
                                // Notify client to pause speech recognition
                                ws.send(JSON.stringify({
                                    type: 'pause_listening',
                                    message: 'Please wait for the interviewer to finish speaking'
                                }));
                                return;
                            }

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
                                    interimSession.isAISpeaking = true;
                                    const base64Audio = await generateVoiceAudio(interruption.interruptionText);
                                    ws.send(JSON.stringify({
                                        type: 'interviewer_audio',
                                        audio: base64Audio
                                    }));
                                    // Mark AI as finished speaking after sending audio
                                    setTimeout(() => {
                                        interimSession.isAISpeaking = false;
                                    }, 100);
                                } catch (error) {
                                    console.error('TTS error during interruption:', error);
                                    interimSession.isAISpeaking = false;
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
                            // Prevent user from sending text while AI is speaking
                            if (session.isAISpeaking) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: 'Please wait for the interviewer to finish speaking'
                                }));
                                return;
                            }

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

                            // Check if interview should end
                            const timeElapsed = (Date.now() - session.startTime.getTime()) / 1000 / 60;
                            const shouldEndNow = session.questionsAsked >= session.maxQuestions || timeElapsed >= session.duration;

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
                                session.isAISpeaking = true;
                                const base64Audio = await generateVoiceAudio(fullResponse);
                                ws.send(JSON.stringify({
                                    type: 'interviewer_audio',
                                    audio: base64Audio
                                }));
                                console.log('Audio sent');
                                // Mark AI as finished speaking after sending audio
                                setTimeout(() => {
                                    session.isAISpeaking = false;
                                }, 100);

                                // Check if response contains a new question (increment counter)
                                if (fullResponse.includes('?') && !shouldEndNow) {
                                    session.questionsAsked++;
                                    console.log(`Questions asked: ${session.questionsAsked}/${session.maxQuestions}`);
                                }

                                // Auto-end session if limits reached
                                if (shouldEndNow) {
                                    console.log('Interview limits reached, ending session...');
                                    setTimeout(async () => {
                                        // Save session
                                        try {
                                            await saveCompleteInterviewSession(
                                                sessionId!,
                                                session.userId,
                                                session.targetUniversity,
                                                session.targetProgram,
                                                session.conversationHistory
                                            );
                                            console.log('✅ Session saved to Snowflake');
                                        } catch (error) {
                                            console.error('❌ Failed to save session to Snowflake:', error);
                                        }

                                        sessions.delete(sessionId!);
                                        ws.send(JSON.stringify({
                                            type: 'session_ended',
                                            message: 'Interview completed'
                                        }));
                                    }, 3000); // Wait 3 seconds after final message
                                }
                            } catch (error) {
                                console.error('Response generation error:', error);
                                console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
                                session.isAISpeaking = false;
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    message: error instanceof Error ? error.message : 'Failed to generate response'
                                }));
                            }
                        }
                        break;

                    case 'user_interrupt':
                        // User interrupted AI while it was speaking
                        if (!sessionId) return;

                        const interruptSession = sessions.get(sessionId);
                        if (interruptSession) {
                            interruptSession.isAISpeaking = false;
                            console.log('⚡ User interrupted AI - audio stopped');

                            // Add user's interruption to history if it's substantial
                            const userInterruptText = message.text?.trim();
                            if (userInterruptText && userInterruptText.split(' ').length >= 3) {
                                interruptSession.conversationHistory.push({
                                    role: 'user',
                                    content: userInterruptText,
                                    timestamp: new Date()
                                });
                            }
                        }
                        break;

                    case 'audio_ended':
                        // Client notifies when audio playback ends
                        if (!sessionId) return;

                        const audioSession = sessions.get(sessionId);
                        if (audioSession) {
                            audioSession.isAISpeaking = false;
                            console.log('Audio playback ended, user can speak now');
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
