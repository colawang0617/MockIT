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
    const isAIPlayingAudioRef = useRef(false);
    const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const conversationEndRef = useRef<HTMLDivElement | null>(null);

    // Handle avatar ready
    const handleAvatarReady = (controls: AvatarControls) => {
        avatarControlsRef.current = controls;
        console.log('Avatar ready for lip sync');
    };

    // Handle window resize for responsive layout
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Set initial value
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                // CRITICAL: Ignore speech while AI is playing audio (prevent echo)
                if (isAIPlayingAudioRef.current) {
                    console.log('🔇 Ignoring speech - AI is currently speaking');
                    return;
                }

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

                // Require minimum speech length to avoid picking up background noise
                if (currentTranscript.trim().length < 3) {
                    return;
                }

                setTranscript(currentTranscript);

                // Clear any existing timeout
                if (speechTimeoutRef.current) {
                    clearTimeout(speechTimeoutRef.current);
                }

                // IMMEDIATE INTERRUPTION: If user speaks while AI is talking, stop AI immediately
                if (isAIPlayingAudioRef.current && currentTranscript.trim().split(' ').length >= 3) {
                    console.log('🛑 User interrupting AI - stopping audio immediately');

                    // Stop audio immediately
                    if (currentAudioSourceRef.current) {
                        currentAudioSourceRef.current.stop();
                        currentAudioSourceRef.current = null;
                    }
                    if (avatarControlsRef.current) {
                        avatarControlsRef.current.stopAudio();
                    }

                    isAIPlayingAudioRef.current = false;

                    // Notify server
                    if (wsRef.current) {
                        wsRef.current.send(JSON.stringify({
                            type: 'user_interrupt',
                            text: currentTranscript
                        }));
                    }

                    setStatus('You interrupted - continue speaking');
                }

                // Send interim updates for interruption detection (only if substantial)
                if (wsRef.current && currentTranscript && currentTranscript.trim().split(' ').length >= 5) {
                    wsRef.current.send(JSON.stringify({
                        type: 'speech_interim',
                        text: currentTranscript
                    }));
                }

                // Send final transcript to server with longer debounce for natural conversation
                // Allow user to finish their complete thought before sending
                if (finalTranscript && wsRef.current) {
                    speechTimeoutRef.current = setTimeout(() => {
                        const trimmedText = finalTranscript.trim();
                        const wordCount = trimmedText.split(/\s+/).length;

                        // Only send if it's a meaningful response
                        if (trimmedText.length >= 10 && wordCount >= 2) {
                            wsRef.current?.send(JSON.stringify({
                                type: 'text_input',
                                text: trimmedText
                            }));

                            setMessages(prev => [...prev, {
                                role: 'user',
                                content: trimmedText
                            }]);
                            setTranscript('');
                            console.log(`📤 Sent: "${trimmedText}" (${wordCount} words)`);
                        } else {
                            console.log(`⏭️ Skipped short speech: "${trimmedText}" (too short)`);
                            setTranscript(''); // Clear transcript anyway
                        }
                    }, 2000); // 2 seconds - natural breathing pause between phrases
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
                        // Auto-start voice recognition (always on for real-time feel)
                        if (recognitionRef.current && !isListening) {
                            try {
                                recognitionRef.current.start();
                                setStatus('Ready - Speak naturally');
                                console.log('🎤 Auto-started voice recognition');
                            } catch (e) {
                                console.log('Voice recognition already running');
                            }
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
                            // CRITICAL: Mark AI as playing audio to prevent echo
                            isAIPlayingAudioRef.current = true;

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

                                // Mark AI as finished playing
                                isAIPlayingAudioRef.current = false;

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
                                    isAIPlayingAudioRef.current = false;
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
                            isAIPlayingAudioRef.current = false;
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

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages, currentInterviewerMessage]);

    // Auto-connect on mount - small delay for page to render
    useEffect(() => {
        if (!hasAutoStarted.current) {
            hasAutoStarted.current = true;
            // Small delay to ensure page elements are ready
            setTimeout(() => {
                connectWebSocket();
                enableCamera();
            }, 100); // Reduced from 500ms to 100ms - just enough for rendering
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
                @keyframes slideIn {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes glow {
                    0%, 100% {
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    50% {
                        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
                    }
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                    opacity: 1 !important;
                }
                input::-webkit-input-placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                }
                input::-moz-placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                }
                input:-ms-input-placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                }
            `}} />
            <div style={{
                height: '100vh',
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
                    padding: isMobile ? '1rem' : '1.5rem 2rem',
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 10,
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    gap: isMobile ? '0.75rem' : '1rem'
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
                            fontSize: isMobile ? '1.1rem' : '1.5rem',
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
                            fontSize: isMobile ? '1.25rem' : '1.75rem',
                            fontWeight: 'bold',
                            color: timeRemaining < 60 ? '#ef4444' : '#ffffff',
                            fontFamily: 'monospace',
                            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                            padding: isMobile ? '0.4rem 1rem' : '0.5rem 1.5rem',
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
                                padding: isMobile ? '0.6rem 1.25rem' : '0.75rem 2rem',
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
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
                    gap: isMobile ? '0.75rem' : '1rem',
                    padding: isMobile ? '0.75rem' : '1rem',
                    position: 'relative',
                    zIndex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    flexDirection: isMobile ? 'column' : 'row'
                }}>
                    {/* Left Side - Avatar and User Camera */}
                    <div style={{
                        flex: isMobile ? '0 0 35%' : '0 0 35%',
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        gap: isMobile ? '0.5rem' : '0.75rem',
                        minHeight: 0
                    }}>
                        {/* Avatar Section - 50% */}
                        <div style={{
                            flex: '1 1 50%',
                            minHeight: 0,
                            background: 'rgba(0,0,0,0.2)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                        }}>
                            <ReadyPlayerMeAvatar onAvatarReady={handleAvatarReady} />
                        </div>

                        {/* User Camera - 50% */}
                        <div style={{
                            flex: '1 1 50%',
                            minHeight: 0,
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
                        flex: isMobile ? '1' : '1 1 65%',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                        position: 'relative'
                    }}>
                        {isConnected && (
                            <>
                                {/* Scrollable conversation area */}
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isMobile ? '0.75rem' : '1.5rem',
                                    paddingBottom: isMobile ? '0.75rem' : '1rem'
                                }}>
                                    {/* Voice Indicator - Auto-listening */}
                                    {transcript && (
                                    <div style={{
                                        padding: isMobile ? '1rem 1.25rem' : '1.5rem 2rem',
                                        background: 'rgba(255,255,255,0.08)',
                                        backdropFilter: 'blur(20px) saturate(180%)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        fontSize: isMobile ? '0.95rem' : '1.1rem',
                                        color: '#fff',
                                        fontStyle: 'italic',
                                        textAlign: 'center',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                        width: '100%',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#10b981',
                                                boxShadow: '0 0 12px #10b981',
                                                animation: 'pulse 2s infinite'
                                            }} />
                                            <span style={{
                                                fontSize: '0.75rem',
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                                color: 'rgba(255,255,255,0.7)',
                                                fontWeight: '600'
                                            }}>Listening</span>
                                        </div>
                                        "{transcript}"
                                    </div>
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
                                    {messages.map((msg, idx) => {
                                        const isLatest = idx === messages.length - 1;
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: isMobile ? '0.875rem 1.25rem' : '1rem 1.5rem',
                                                    background: isLatest
                                                        ? (msg.role === 'user' ? 'rgba(59,130,246,0.25)' : 'rgba(147,51,234,0.25)')
                                                        : (msg.role === 'user' ? 'rgba(59,130,246,0.15)' : 'rgba(147,51,234,0.15)'),
                                                    backdropFilter: 'blur(10px)',
                                                    borderRadius: '12px',
                                                    border: isLatest
                                                        ? `2px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.5)' : 'rgba(147,51,234,0.5)'}`
                                                        : `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.3)' : 'rgba(147,51,234,0.3)'}`,
                                                    fontSize: isMobile ? '0.875rem' : '0.95rem',
                                                    lineHeight: '1.6',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: isLatest ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                                    animation: isLatest ? 'slideIn 0.4s ease-out, glow 2s ease-in-out infinite' : 'none'
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
                                        );
                                    })}
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
                                    {/* Scroll anchor */}
                                    <div ref={conversationEndRef} style={{ height: '1px' }} />
                                </div>
                            </div>
                                    )}
                                </div>

                                {/* Sticky Text Input - iOS Style */}
                                <div style={{
                                    padding: isMobile ? '0.75rem 0' : '1rem 0'
                                }}>
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                                        placeholder="Type your message..."
                                        style={{
                                            width: '100%',
                                            padding: isMobile ? '0.875rem 1.25rem' : '1rem 1.5rem',
                                            fontSize: isMobile ? '0.95rem' : '1rem',
                                            color: '#fff',
                                            background: 'rgba(255,255,255,0.08)',
                                            backdropFilter: 'blur(20px) saturate(180%)',
                                            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                            border: '1px solid rgba(255,255,255,0.18)',
                                            borderRadius: '20px',
                                            outline: 'none',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.12)';
                                            e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                                            e.target.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12), 0 0 0 4px rgba(255,255,255,0.08)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.08)';
                                            e.target.style.borderColor = 'rgba(255,255,255,0.18)';
                                            e.target.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}