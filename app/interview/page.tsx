'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ReadyPlayerMeAvatar, { AvatarControls } from './ReadyPlayerMeAvatar';

export default function InterviewPage() {
    const searchParams = useSearchParams();
    const university = searchParams.get('university') || 'General';
    const program = searchParams.get('program') || 'All';
    const duration = parseInt(searchParams.get('duration') || '10');

    const [isConnected, setIsConnected] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState('Initializing...');
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [currentInterviewerMessage, setCurrentInterviewerMessage] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert minutes to seconds
    const [showEndPage, setShowEndPage] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const hasAutoStarted = useRef(false);
    const avatarControlsRef = useRef<AvatarControls | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    // Handle avatar ready
    const handleAvatarReady = (controls: AvatarControls) => {
        avatarControlsRef.current = controls;
        console.log('Avatar ready for lip sync');
    };

    useEffect(() => {
        // Initialize Web Speech API
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                setStatus('Listening...');
            };

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                setTranscript(currentTranscript);

                // Send interim updates for interruption detection
                if (wsRef.current && currentTranscript) {
                    wsRef.current.send(JSON.stringify({
                        type: 'speech_interim',
                        text: currentTranscript
                    }));
                }

                // Send final transcript to server
                if (finalTranscript && wsRef.current) {
                    wsRef.current.send(JSON.stringify({
                        type: 'text_input',
                        text: finalTranscript.trim()
                    }));

                    setMessages(prev => [...prev, {
                        role: 'user',
                        content: finalTranscript.trim()
                    }]);
                    setTranscript('');
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setStatus(`Voice error: ${event.error}`);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
                if (recognitionRef.current?.continuous) {
                    setStatus('Listening stopped');
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            // Cleanup
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/interview`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            setStatus('Connected - Initializing session...');

            // Initialize session with university, program, and duration
            ws.send(JSON.stringify({
                type: 'init',
                userId: 'test_user',
                university: university,
                program: program,
                duration: duration
            }));
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received:', data);

                switch (data.type) {
                    case 'session_ready':
                        setSessionId(data.sessionId);
                        setStatus('Session ready - Interview starting...');
                        break;

                    case 'start_listening':
                        // Auto-start voice recognition
                        if (recognitionRef.current && !isListening) {
                            setTimeout(() => {
                                recognitionRef.current?.start();
                                setStatus('Listening - Speak when ready');
                            }, 1000);
                        }
                        break;

                    case 'interrupt':
                        // AI is interrupting - stop current AI audio playback and avatar
                        if (currentAudioSourceRef.current) {
                            currentAudioSourceRef.current.stop();
                            currentAudioSourceRef.current = null;
                        }
                        if (avatarControlsRef.current) {
                            avatarControlsRef.current.stopAudio();
                        }
                        setStatus(`Interviewer interrupting: ${data.reason}`);
                        setTranscript('');
                        break;

                    case 'interviewer_text_chunk':
                        // Stream interviewer response as it's generated
                        setCurrentInterviewerMessage(prev => prev + data.chunk);
                        setStatus('Interviewer speaking...');
                        break;

                    case 'interviewer_message':
                        // Complete message received
                        setMessages(prev => [...prev, {
                            role: 'interviewer',
                            content: data.text
                        }]);
                        setCurrentInterviewerMessage('');

                        if (data.isInterruption) {
                            setStatus('Interrupted - AI responding');
                        } else {
                            setStatus('AI responding');
                        }
                        break;

                    case 'interviewer_audio':
                        // Play audio response with lip sync
                        try {
                            // Stop any currently playing audio
                            if (currentAudioSourceRef.current) {
                                currentAudioSourceRef.current.stop();
                                currentAudioSourceRef.current = null;
                            }
                            if (avatarControlsRef.current) {
                                avatarControlsRef.current.stopAudio();
                            }

                            // Decode base64 to binary
                            const binaryString = atob(data.audio);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }

                            // Create blob URL for avatar
                            const audioBlob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
                            const audioUrl = URL.createObjectURL(audioBlob);

                            // Play with avatar lip sync
                            if (avatarControlsRef.current) {
                                // Avatar will handle the audio playback
                                await avatarControlsRef.current.playAudio(audioUrl);

                                // Notify server that audio ended
                                if (wsRef.current) {
                                    wsRef.current.send(JSON.stringify({
                                        type: 'audio_ended'
                                    }));
                                }

                                // Clean up blob URL after audio ends
                                setTimeout(() => {
                                    URL.revokeObjectURL(audioUrl);
                                }, 60000); // Clean up after 1 minute
                            } else {
                                // Fallback: play audio without avatar
                                console.warn('Avatar not ready, playing audio without lip sync');
                                if (!audioContextRef.current) {
                                    audioContextRef.current = new AudioContext();
                                }
                                
                                const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
                                const source = audioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContextRef.current.destination);

                                currentAudioSourceRef.current = source;
                                source.start();

                                source.onended = () => {
                                    currentAudioSourceRef.current = null;
                                    setStatus('Ready - Your turn');
                                    URL.revokeObjectURL(audioUrl);

                                    // Notify server that audio ended
                                    if (wsRef.current) {
                                        wsRef.current.send(JSON.stringify({
                                            type: 'audio_ended'
                                        }));
                                    }
                                };
                            }

                            // Keep microphone listening during AI speech for interruption detection
                            if (recognitionRef.current && !isListening) {
                                try {
                                    recognitionRef.current.start();
                                } catch (e) {
                                    // Recognition might already be running, ignore error
                                }
                            }
                        } catch (error) {
                            console.error('Audio playback error:', error);
                            setStatus('Error playing audio');
                        }
                        break;

                    case 'session_ended':
                        setStatus('Session ended');
                        setIsConnected(false);
                        break;

                    case 'error':
                        setStatus(`Error: ${data.message}`);
                        break;

                    default:
                        console.log('Unknown message type:', data);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('Connection error');
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            setStatus('Disconnected');
        };

        wsRef.current = ws;
    };

    // Countdown timer
    useEffect(() => {
        if (!isConnected || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Timer expired - wait 15 seconds then show end page
                    setTimeout(() => {
                        setShowEndPage(true);
                    }, 15000);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isConnected, timeRemaining]);

    // Redirect to complete page when showEndPage is true
    useEffect(() => {
        if (showEndPage) {
            window.location.href = '/complete';
        }
    }, [showEndPage]);

    // Auto-connect on mount
    useEffect(() => {
        if (!hasAutoStarted.current) {
            hasAutoStarted.current = true;
            setTimeout(() => {
                connectWebSocket();
                // Enable camera
                enableCamera();
            }, 500);
        }
    }, []);

    // Enable user camera
    const enableCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false // Already using audio for speech recognition
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraEnabled(true);
                setStatus('Camera enabled');
            }
        } catch (error) {
            console.error('Camera access error:', error);
            setStatus('Camera access denied - continuing without video');
        }
    };

    const sendTextMessage = () => {
        if (!wsRef.current || !inputText.trim()) return;

        wsRef.current.send(JSON.stringify({
            type: 'text_input',
            text: inputText
        }));

        setMessages(prev => [...prev, { role: 'user', content: inputText }]);
        setInputText('');
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            setStatus('Voice input not supported in this browser');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setStatus('Listening stopped');
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            setStatus('Listening...');
        }
    };

    const endSession = () => {
        if (!wsRef.current) return;

        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }

        wsRef.current.send(JSON.stringify({
            type: 'end_session'
        }));

        // Redirect to complete page
        setTimeout(() => {
            window.location.href = '/complete';
        }, 500);
    };

    // Format time remaining
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
            `}} />
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background elements */}
                <div style={{
                    position: 'absolute',
                    width: '600px',
                    height: '600px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    top: '-15%',
                    right: '-10%',
                    filter: 'blur(80px)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    bottom: '-10%',
                    left: '-5%',
                    filter: 'blur(60px)',
                    pointerEvents: 'none'
                }} />

                {/* Header */}
                <div style={{
                    padding: '2rem',
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.7)',
                            marginBottom: '0.5rem',
                            fontWeight: '600'
                        }}>
                            Interview Session
                        </div>
                        <h1 style={{
                            margin: 0,
                            fontSize: '1.75rem',
                            fontWeight: 'bold',
                            letterSpacing: '-0.02em',
                            textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}>
                            {university} · {program}
                        </h1>
                    </div>

                    {/* Timer Display */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: '600'
                        }}>
                            Time Remaining
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: timeRemaining < 60 ? '#ef4444' : '#ffffff',
                            fontFamily: 'monospace',
                            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                            padding: '0.5rem 1.5rem',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '12px',
                            border: `2px solid ${timeRemaining < 60 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.3)'}`,
                            transition: 'all 0.3s ease'
                        }}>
                            {formatTime(timeRemaining)}
                        </div>
                    </div>
                    {isConnected && (
                        <button
                            onClick={endSession}
                            style={{
                                padding: '0.75rem 2rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#fff',
                                background: 'rgba(255,255,255,0.2)',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                backdropFilter: 'blur(10px)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.9)';
                                e.currentTarget.style.borderColor = '#ef4444';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            End Interview
                        </button>
                    )}
                </div>

                {/* Status Bar */}
                <div style={{
                    padding: '1rem 2rem',
                    background: 'rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isConnected ? '#10b981' : 'rgba(255,255,255,0.3)',
                        boxShadow: isConnected ? '0 0 12px #10b981' : 'none',
                        animation: isConnected ? 'pulse 2s infinite' : 'none'
                    }} />
                    <div style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: '500'
                    }}>
                        {status}
                    </div>
                </div>

                {/* Main Content with Avatar and Controls */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    gap: '2rem',
                    padding: '2rem',
                    position: 'relative',
                    zIndex: 1
                }}>
                    {/* Left Side - Avatar and User Camera */}
                    <div style={{
                        flex: '0 0 500px',
<<<<<<< HEAD
                        height: '800px',
                        background: 'rgba(0,0,0,0.2)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
=======
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
>>>>>>> 20c631dd818eab37cc5484e0f210d8e394708d56
                    }}>
                        {/* Avatar Section */}
                        <div style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                        }}>
                            <ReadyPlayerMeAvatar onAvatarReady={handleAvatarReady} />
                        </div>

                        {/* User Camera */}
                        <div style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                            position: 'relative'
                        }}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)' // Mirror effect
                                }}
                            />
                            {!cameraEnabled && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '0.875rem'
                                }}>
                                    Camera disabled
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls and Transcript - Right Side */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        overflowY: 'auto',
                        maxHeight: '600px'
                    }}>
                        {isConnected && (
                            <>
                                {/* Voice Control */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2rem'
                                }}>
                                    <button
                                        onClick={toggleListening}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            background: isListening
                                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                : 'rgba(255,255,255,0.2)',
                                            border: `3px solid ${isListening ? '#10b981' : 'rgba(255,255,255,0.3)'}`,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2.5rem',
                                            transition: 'all 0.3s ease',
                                            boxShadow: isListening ? '0 0 40px rgba(16, 185, 129, 0.6), 0 8px 20px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.2)',
                                            position: 'relative',
                                            backdropFilter: 'blur(10px)',
                                            animation: isListening ? 'float 3s ease-in-out infinite' : 'none'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        <span>🎤</span>
                                        {isListening && (
                                            <>
                                                <div style={{
                                                    position: 'absolute',
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '50%',
                                                    border: '3px solid #10b981',
                                                    animation: 'pulse 2s infinite'
                                                }} />
                                                <div style={{
                                                    position: 'absolute',
                                                    width: '110%',
                                                    height: '110%',
                                                    borderRadius: '50%',
                                                    border: '2px solid #10b981',
                                                    animation: 'pulse 2s infinite',
                                                    animationDelay: '0.5s'
                                                }} />
                                            </>
                                        )}
                                    </button>
                                    {transcript && (
                                        <div style={{
                                            padding: '1.5rem 2rem',
                                            background: 'rgba(255,255,255,0.15)',
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            fontSize: '1.1rem',
                                            color: '#fff',
                                            fontStyle: 'italic',
                                            textAlign: 'center',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            width: '100%'
                                        }}>
                                            "{transcript}"
                                        </div>
                                    )}
                                </div>

                                {/* Text Input */}
                                <div>
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                                        placeholder="Or type your response here..."
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1.5rem',
                                            fontSize: '1rem',
                                            color: '#fff',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '2px solid rgba(255,255,255,0.2)',
                                            borderRadius: '12px',
                                            outline: 'none',
                                            backdropFilter: 'blur(10px)',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.15)';
                                            e.target.style.borderColor = 'rgba(255,255,255,0.4)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.1)';
                                            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {/* Conversation */}
                        {(messages.length > 0 || currentInterviewerMessage) && (
                            <div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,0.7)',
                                    marginBottom: '1.5rem',
                                    fontWeight: '600'
                                }}>
                                    Conversation
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '1rem 1.5rem',
                                                background: msg.role === 'user'
                                                    ? 'rgba(59,130,246,0.15)'
                                                    : 'rgba(147,51,234,0.15)',
                                                backdropFilter: 'blur(10px)',
                                                borderRadius: '12px',
                                                border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.3)' : 'rgba(147,51,234,0.3)'}`,
                                                fontSize: '0.95rem',
                                                lineHeight: '1.6'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: 'rgba(255,255,255,0.6)',
                                                marginBottom: '0.5rem',
                                                letterSpacing: '0.1em',
                                                fontWeight: '600',
                                                textTransform: 'uppercase'
                                            }}>
                                                {msg.role === 'user' ? 'You' : 'Interviewer'}
                                            </div>
                                            {msg.content}
                                        </div>
                                    ))}
                                    {currentInterviewerMessage && (
                                        <div style={{
                                            padding: '1rem 1.5rem',
                                            background: 'rgba(147,51,234,0.2)',
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(147,51,234,0.4)',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.6'
                                        }}>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: 'rgba(255,255,255,0.6)',
                                                marginBottom: '0.5rem',
                                                letterSpacing: '0.1em',
                                                fontWeight: '600',
                                                textTransform: 'uppercase'
                                            }}>
                                                Interviewer
                                            </div>
                                            {currentInterviewerMessage}
                                            <span style={{
                                                display: 'inline-block',
                                                width: '2px',
                                                height: '1.2em',
                                                background: '#10b981',
                                                marginLeft: '4px',
                                                animation: 'blink 1s infinite',
                                                verticalAlign: 'middle'
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}