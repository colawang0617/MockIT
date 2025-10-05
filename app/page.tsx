'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const router = useRouter();

    const handleAuth = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError('');

        // Simple authentication - store in localStorage
        try {
            if (isLogin) {
                // Check if user exists in localStorage
                const storedUser = localStorage.getItem(email);
                if (!storedUser) {
                    setError('No account found with this email');
                    setLoading(false);
                    return;
                }

                const userData = JSON.parse(storedUser);
                if (userData.password !== password) {
                    setError('Incorrect password');
                    setLoading(false);
                    return;
                }

                // Sign in successful
                localStorage.setItem('currentUser', email);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userId', `user_${Date.now()}`);
                setTimeout(() => {
                    router.push('/home');
                }, 500);
            } else {
                // Check if user already exists
                const existingUser = localStorage.getItem(email);
                if (existingUser) {
                    setError('Account already exists with this email');
                    setLoading(false);
                    return;
                }

                // Create new account
                localStorage.setItem(email, JSON.stringify({ email, password }));
                localStorage.setItem('currentUser', email);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userId', `user_${Date.now()}`);

                setTimeout(() => {
                    router.push('/home');
                }, 500);
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('Authentication failed. Please try again.');
            setLoading(false);
        }
    };

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
            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                }
            `}</style>

            {/* Animated gradient orbs */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
                borderRadius: '50%',
                top: '-15%',
                left: '-10%',
                filter: 'blur(60px)',
                animation: 'float 20s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
                borderRadius: '50%',
                bottom: '-10%',
                right: '-5%',
                filter: 'blur(60px)',
                animation: 'float 15s ease-in-out infinite reverse'
            }} />
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                borderRadius: '50%',
                top: '40%',
                right: '5%',
                filter: 'blur(50px)',
                animation: 'float 18s ease-in-out infinite'
            }} />

            {/* Geometric shapes */}
            <div style={{
                position: 'absolute',
                width: '250px',
                height: '250px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                top: '15%',
                left: '10%',
                animation: 'rotate 25s linear infinite, pulse 8s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                border: '2px solid rgba(255,255,255,0.08)',
                borderRadius: '63% 37% 54% 46% / 55% 48% 52% 45%',
                bottom: '20%',
                left: '20%',
                animation: 'rotate 30s linear infinite reverse, pulse 6s ease-in-out infinite'
            }} />
            <div style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                border: '2px solid rgba(255,255,255,0.07)',
                borderRadius: '50% 50% 30% 70% / 50% 50% 70% 30%',
                top: '25%',
                right: '15%',
                animation: 'rotate 35s linear infinite, pulse 10s ease-in-out infinite'
            }} />

            {/* Dot pattern overlay */}
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                opacity: 0.3
            }} />

            <div style={{
                maxWidth: '480px',
                width: '100%',
                padding: '0 2rem',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Branding */}
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '5rem',
                        fontWeight: '900',
                        color: '#ffffff',
                        margin: '0 0 1rem 0',
                        letterSpacing: '-0.05em',
                        textShadow: '0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.2)',
                        background: 'linear-gradient(to bottom right, #ffffff 0%, rgba(255,255,255,0.85) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: '1'
                    }}>
                        Nopiro
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: '1.15rem',
                        fontWeight: '400',
                        letterSpacing: '0.03em',
                        textShadow: '0 2px 15px rgba(0,0,0,0.2)',
                        margin: '0'
                    }}>
                        {isLogin ? 'Master Your Interview Skills' : 'Begin Your Success Journey'}
                    </p>
                </div>

                {/* Card Container */}
                <div style={{
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: '28px',
                    padding: '3rem',
                    boxShadow: '0 25px 70px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Inner glow effect */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '28px',
                        background: 'radial-gradient(circle at top left, rgba(255,255,255,0.3) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Email Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused(null)}
                            placeholder="your.email@example.com"
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                fontSize: '1rem',
                                color: '#1a202c',
                                background: focused === 'email' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                                border: `2px solid ${focused === 'email' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}`,
                                borderRadius: '14px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: focused === 'email'
                                    ? '0 0 0 4px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.15)'
                                    : '0 2px 8px rgba(0,0,0,0.1)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Password Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocused('password')}
                            onBlur={() => setFocused(null)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                            placeholder="••••••••"
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                fontSize: '1rem',
                                color: '#1a202c',
                                background: focused === 'password' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                                border: `2px solid ${focused === 'password' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}`,
                                borderRadius: '14px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: focused === 'password'
                                    ? '0 0 0 4px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.15)'
                                    : '0 2px 8px rgba(0,0,0,0.1)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.875rem 1rem',
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: '12px',
                            border: '2px solid rgba(239,68,68,0.4)',
                            color: '#dc2626',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            boxShadow: '0 2px 8px rgba(239,68,68,0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleAuth}
                        disabled={loading || !email.trim() || !password.trim()}
                        style={{
                            width: '100%',
                            padding: '1.15rem',
                            fontSize: '1.05rem',
                            fontWeight: '700',
                            color: '#ffffff',
                            background: (loading || !email.trim() || !password.trim())
                                ? 'rgba(255,255,255,0.3)'
                                : 'linear-gradient(135deg, #5568d3 0%, #6a3f9a 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            cursor: (loading || !email.trim() || !password.trim()) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: (loading || !email.trim() || !password.trim())
                                ? 'none'
                                : '0 6px 20px rgba(0,0,0,0.3)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}
                        onMouseOver={(e) => {
                            if (!loading && email.trim() && password.trim()) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                        }}
                    >
                        {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                    </button>

                    {/* Toggle Login/Signup */}
                    <div style={{
                        marginTop: '1.75rem',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            style={{
                                color: '#ffffff',
                                fontWeight: '700',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textUnderlineOffset: '3px',
                                textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
