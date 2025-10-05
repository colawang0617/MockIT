'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true); // Toggle between login/signup
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);
    const router = useRouter();

    const handleAuth = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError('');

        // Instant login - store credentials and redirect
        // No database needed for this demo
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', `user_${Date.now()}`);

        // Simulate a brief loading for UX
        setTimeout(() => {
            router.push('/');
        }, 500);
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
                maxWidth: '450px',
                width: '100%',
                padding: '0 2rem',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Title */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        margin: '0 0 0.5rem 0',
                        letterSpacing: '-0.03em',
                        textShadow: '0 2px 20px rgba(0,0,0,0.2)'
                    }}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '1rem',
                        fontWeight: '300'
                    }}>
                        {isLogin ? 'Sign in to continue your interview practice' : 'Sign up to start practicing'}
                    </p>
                </div>

                {/* Card Container */}
                <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    width: '100%'
                }}>
                    {/* Email Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            fontSize: '0.875rem',
                            fontWeight: '600'
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
                                padding: '1rem',
                                fontSize: '1rem',
                                color: '#2d3748',
                                background: '#ffffff',
                                border: `2px solid ${focused === 'email' ? '#667eea' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: focused === 'email' ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Password Input */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            fontSize: '0.875rem',
                            fontWeight: '600'
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
                                padding: '1rem',
                                fontSize: '1rem',
                                color: '#2d3748',
                                background: '#ffffff',
                                border: `2px solid ${focused === 'password' ? '#667eea' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: focused === 'password' ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem',
                            background: 'rgba(239,68,68,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#dc2626',
                            fontSize: '0.875rem'
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
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#ffffff',
                            background: (loading || !email.trim() || !password.trim())
                                ? '#cbd5e0'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: (loading || !email.trim() || !password.trim()) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: (loading || !email.trim() || !password.trim())
                                ? 'none'
                                : '0 4px 15px rgba(102,126,234,0.4)'
                        }}
                        onMouseOver={(e) => {
                            if (!loading && email.trim() && password.trim()) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102,126,234,0.5)';
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4)';
                        }}
                    >
                        {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                    </button>

                    {/* Toggle Login/Signup */}
                    <div style={{
                        marginTop: '1.5rem',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: '#4a5568'
                    }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            style={{
                                color: '#667eea',
                                fontWeight: '600',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
