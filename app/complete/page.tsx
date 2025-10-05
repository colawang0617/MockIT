'use client';

import { useRouter } from 'next/navigation';

export default function CompletePage() {
    const router = useRouter();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated background shapes */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                top: '-15%',
                left: '-10%',
                filter: 'blur(80px)',
                animation: 'float 6s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                bottom: '-15%',
                right: '-10%',
                filter: 'blur(80px)',
                animation: 'float 8s ease-in-out infinite'
            }} />

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    25% { transform: translateY(-20px) translateX(10px); }
                    50% { transform: translateY(0px) translateX(20px); }
                    75% { transform: translateY(20px) translateX(10px); }
                }
                @keyframes celebrate {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `}} />

            <div style={{
                maxWidth: '600px',
                width: '100%',
                padding: '0 2rem',
                position: 'relative',
                zIndex: 1,
                textAlign: 'center'
            }}>
                {/* Success Icon */}
                <div style={{
                    fontSize: '5rem',
                    marginBottom: '2rem',
                    animation: 'celebrate 2s ease-in-out infinite'
                }}>
                    🎉
                </div>

                {/* Card Container */}
                <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '24px',
                    padding: '3rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    marginBottom: '2rem'
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: '#2d3748',
                        margin: '0 0 1rem 0',
                        letterSpacing: '-0.02em'
                    }}>
                        Congratulations!
                    </h1>

                    <p style={{
                        fontSize: '1.2rem',
                        color: '#4a5568',
                        lineHeight: '1.6',
                        marginBottom: '2rem'
                    }}>
                        You've completed your mock interview session. Great job on taking this step to prepare for your future!
                    </p>

                    <div style={{
                        background: 'rgba(102,126,234,0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        border: '1px solid rgba(102,126,234,0.2)'
                    }}>
                        <p style={{
                            fontSize: '1rem',
                            color: '#667eea',
                            fontWeight: '600',
                            margin: '0 0 0.5rem 0'
                        }}>
                            💡 Pro Tip
                        </p>
                        <p style={{
                            fontSize: '0.95rem',
                            color: '#4a5568',
                            margin: 0,
                            lineHeight: '1.5'
                        }}>
                            The more you practice, the more confident you'll become. Consider doing another session with different durations to improve further!
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/home')}
                        style={{
                            width: '100%',
                            padding: '1.25rem 2rem',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 15px rgba(102,126,234,0.4)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(102,126,234,0.5)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4)';
                        }}
                    >
                        Back to Home
                    </button>
                </div>

                <p style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.9rem'
                }}>
                    Keep practicing and you'll ace the real thing! 🌟
                </p>
            </div>
        </div>
    );
}
