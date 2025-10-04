'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
    const [university, setUniversity] = useState('');
    const [program, setProgram] = useState('');
    const [focused, setFocused] = useState<string | null>(null);
    const router = useRouter();

    const startInterview = () => {
        if (!university.trim() || !program.trim()) {
            return;
        }
        router.push(`/interview?university=${encodeURIComponent(university)}&program=${encodeURIComponent(program)}`);
    };

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
                width: '500px',
                height: '500px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                top: '-10%',
                left: '-10%',
                filter: 'blur(60px)'
            }} />
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                bottom: '-10%',
                right: '-10%',
                filter: 'blur(60px)'
            }} />

            <div style={{
                maxWidth: '500px',
                width: '100%',
                padding: '0 2rem',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Title */}
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        margin: '0 0 1rem 0',
                        letterSpacing: '-0.03em',
                        textShadow: '0 2px 20px rgba(0,0,0,0.2)'
                    }}>
                        Mock Interview
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '1.1rem',
                        fontWeight: '300'
                    }}>
                        Practice for your dream school
                    </p>
                </div>

                {/* Card Container */}
                <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '24px',
                    padding: '3rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {/* University Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            Dream Institution
                        </label>
                        <input
                            type="text"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            onFocus={() => setFocused('uni')}
                            onBlur={() => setFocused(null)}
                            placeholder="e.g., MIT, Stanford, Harvard"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                color: '#2d3748',
                                background: '#ffffff',
                                border: `2px solid ${focused === 'uni' ? '#667eea' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: focused === 'uni' ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none'
                            }}
                        />
                    </div>

                    {/* Program Input */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            Dream Program
                        </label>
                        <input
                            type="text"
                            value={program}
                            onChange={(e) => setProgram(e.target.value)}
                            onFocus={() => setFocused('prog')}
                            onBlur={() => setFocused(null)}
                            onKeyDown={(e) => e.key === 'Enter' && startInterview()}
                            placeholder="e.g., Computer Science, Business"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1rem',
                                color: '#2d3748',
                                background: '#ffffff',
                                border: `2px solid ${focused === 'prog' ? '#667eea' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: focused === 'prog' ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none'
                            }}
                        />
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startInterview}
                        disabled={!university.trim() || !program.trim()}
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: '#ffffff',
                            background: (!university.trim() || !program.trim())
                                ? '#cbd5e0'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: (!university.trim() || !program.trim()) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: (!university.trim() || !program.trim())
                                ? 'none'
                                : '0 4px 15px rgba(102,126,234,0.4)'
                        }}
                        onMouseOver={(e) => {
                            if (university.trim() && program.trim()) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102,126,234,0.5)';
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4)';
                        }}
                    >
                        Start Interview →
                    </button>

                    {/* Hint */}
                    <p style={{
                        marginTop: '1.5rem',
                        textAlign: 'center',
                        color: '#a0aec0',
                        fontSize: '0.875rem'
                    }}>
                        Your interview will begin automatically
                    </p>
                </div>
            </div>
        </div>
    );
}
