'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PreparePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const university = searchParams.get('university') || 'General';
    const program = searchParams.get('program') || 'All';
    const duration = searchParams.get('duration') || '10';

    const [countdown, setCountdown] = useState<number | null>(null);
    const [isReady, setIsReady] = useState(false);

    const startCountdown = () => {
        setIsReady(true);
        setCountdown(3);
    };

    // Prefetch the interview page to reduce lag
    useEffect(() => {
        router.prefetch(`/interview?university=${encodeURIComponent(university)}&program=${encodeURIComponent(program)}&duration=${duration}`);
    }, [university, program, duration, router]);

    useEffect(() => {
        if (countdown === null || countdown === 0) return;

        const timer = setTimeout(() => {
            if (countdown === 1) {
                // Navigate to interview page
                router.push(`/interview?university=${encodeURIComponent(university)}&program=${encodeURIComponent(program)}&duration=${duration}`);
            } else {
                setCountdown(countdown - 1);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, university, program, duration, router]);

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            overflow: 'hidden',
            margin: 0,
            padding: 0
        }}>
            {/* Animated background shapes */}
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                top: '-10%',
                right: '-10%',
                filter: 'blur(60px)'
            }} />
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                bottom: '-10%',
                left: '-10%',
                filter: 'blur(60px)'
            }} />

            <div style={{
                maxWidth: '700px',
                width: '100%',
                padding: '0 2rem',
                position: 'relative',
                zIndex: 1,
                textAlign: 'center'
            }}>
                {!isReady ? (
                    <>
                        {/* Preparation Instructions */}
                        <div style={{
                            marginBottom: '2.5rem'
                        }}>
                            <h1 style={{
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                margin: '0 0 1rem 0',
                                letterSpacing: '-0.03em',
                                textShadow: '0 2px 20px rgba(0,0,0,0.2)'
                            }}>
                                Get Ready
                            </h1>
                            <p style={{
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: '1.2rem',
                                fontWeight: '300',
                                margin: 0
                            }}>
                                Your interview with {university} - {program}
                            </p>
                        </div>

                        {/* Instructions Card */}
                        <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            borderRadius: '20px',
                            padding: '2rem',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)',
                            marginBottom: '2rem',
                            textAlign: 'left'
                        }}>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                color: '#2d3748',
                                marginBottom: '1rem'
                            }}>
                                Before we begin:
                            </h2>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.875rem'
                            }}>
                                {[
                                    { icon: '🎤', text: 'Make sure your microphone is working and you\'re in a quiet environment' },
                                    { icon: '📷', text: 'Your camera will be enabled during the interview (you can check yourself)' },
                                    { icon: '⏱️', text: `This is a ${duration}-minute interview session` },
                                    { icon: '💬', text: 'Speak naturally - the AI will ask follow-up questions' },
                                    { icon: '✨', text: 'Relax and be yourself! This is practice, not the real thing' }
                                ].map((item, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: 'rgba(102,126,234,0.05)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(102,126,234,0.1)'
                                    }}>
                                        <span style={{
                                            fontSize: '1.25rem',
                                            flexShrink: 0
                                        }}>
                                            {item.icon}
                                        </span>
                                        <p style={{
                                            margin: 0,
                                            color: '#4a5568',
                                            fontSize: '0.9rem',
                                            lineHeight: '1.4'
                                        }}>
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={startCountdown}
                            style={{
                                padding: '1.5rem 3rem',
                                fontSize: '1.2rem',
                                fontWeight: '600',
                                color: '#ffffff',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 8px 25px rgba(102,126,234,0.4)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 35px rgba(102,126,234,0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102,126,234,0.4)';
                            }}
                        >
                            I'm Ready - Start Interview
                        </button>
                    </>
                ) : (
                    /* Countdown */
                    <div style={{
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: '24px',
                        padding: '4rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <p style={{
                            fontSize: '1.5rem',
                            color: '#4a5568',
                            marginBottom: '2rem'
                        }}>
                            Starting in...
                        </p>
                        <div style={{
                            fontSize: '8rem',
                            fontWeight: 'bold',
                            color: '#667eea',
                            lineHeight: 1,
                            animation: 'pulse 1s ease-in-out',
                            textShadow: '0 4px 20px rgba(102,126,234,0.3)'
                        }}>
                            {countdown}
                        </div>
                        <style dangerouslySetInnerHTML={{__html: `
                            @keyframes pulse {
                                0% { transform: scale(1); opacity: 1; }
                                50% { transform: scale(1.1); opacity: 0.8; }
                                100% { transform: scale(1); opacity: 1; }
                            }
                        `}} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PreparePage() {
    return (
        <Suspense fallback={
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
                <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading...</div>
            </div>
        }>
            <PreparePageContent />
        </Suspense>
    );
}
