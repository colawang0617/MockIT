'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
    const [university, setUniversity] = useState('');
    const [program, setProgram] = useState('');
    const [duration, setDuration] = useState<number>(10); // Default 10 minutes
    const [focused, setFocused] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [validationError, setValidationError] = useState<string>('');
    const router = useRouter();

    // Common universities and programs for validation
    const commonUniversities = [
        'MIT', 'Stanford', 'Harvard', 'Princeton', 'Yale', 'Columbia',
        'University of Chicago', 'University of Pennsylvania', 'Caltech', 'Duke',
        'Northwestern', 'Dartmouth', 'Brown', 'Cornell', 'Johns Hopkins',
        'Rice', 'Vanderbilt', 'Notre Dame', 'UCLA', 'UC Berkeley',
        'Georgetown', 'Carnegie Mellon', 'Emory', 'Washington University in St. Louis',
        'University of Michigan', 'New York University', 'University of Southern California',
        'University of North Carolina at Chapel Hill', 'University of Virginia',
        'University of Texas at Austin', 'Georgia Institute of Technology',
        'Tufts University', 'Boston College', 'Boston University',
        'Rutgers University', 'Indiana University Bloomington',
        'University of Wisconsin–Madison', 'University of Illinois Urbana–Champaign'
    ];

    const commonPrograms = [
        'Computer Science', 'Engineering', 'Business', 'Economics', 'STEM',
        'Pre-Med', 'Medicine', 'Biomedical Engineering', 'Communication',
        'Humanities', 'Politics', 'Public Health', 'Film', 'Journalism',
        'International Relations', 'Art and Technology', 'Physics', 'Chemistry',
        'Biology', 'Mathematics', 'Psychology', 'Sociology', 'History',
        'English', 'Philosophy', 'Law', 'Architecture', 'Design'
    ];

    // Check if user is logged in
    useEffect(() => {
        const email = localStorage.getItem('userEmail');
        if (!email) {
            // Redirect to login if not authenticated
            router.push('/');
        } else {
            setUserEmail(email);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        router.push('/');
    };

    const validateInput = (text: string, validList: string[]): boolean => {
        // Check for minimum length
        if (text.trim().length < 3) return false;

        // Check if contains only valid characters (letters, spaces, hyphens, ampersands)
        if (!/^[a-zA-Z\s\-&]+$/.test(text)) return false;

        // Check for exact match (case insensitive)
        const exactMatch = validList.some(item =>
            item.toLowerCase() === text.trim().toLowerCase()
        );
        if (exactMatch) return true;

        // Check for partial match (fuzzy matching)
        const partialMatch = validList.some(item =>
            item.toLowerCase().includes(text.trim().toLowerCase()) ||
            text.trim().toLowerCase().includes(item.toLowerCase())
        );

        return partialMatch;
    };

    const startInterview = () => {
        if (!university.trim() || !program.trim()) {
            setValidationError('Please fill in all fields');
            return;
        }

        // Validate university
        if (!validateInput(university, commonUniversities)) {
            setValidationError('Please enter a valid university name (e.g., MIT, Stanford, Harvard)');
            return;
        }

        // Validate program
        if (!validateInput(program, commonPrograms)) {
            setValidationError('Please enter a valid program (e.g., Computer Science, Business, Engineering)');
            return;
        }

        setValidationError('');
        router.push(`/prepare?university=${encodeURIComponent(university)}&program=${encodeURIComponent(program)}&duration=${duration}`);
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
                {/* User Info & Logout */}
                {userEmail && (
                    <div style={{
                        marginBottom: '2rem',
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <span style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: '0.9rem'
                        }}>
                            👤 {userEmail}
                        </span>
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.85rem',
                                color: '#fff',
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.8)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}

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
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {/* Validation Error */}
                    {validationError && (
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '0.75rem',
                            background: 'rgba(239,68,68,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#dc2626',
                            fontSize: '0.875rem',
                            width: '100%',
                            maxWidth: '400px',
                            textAlign: 'center'
                        }}>
                            {validationError}
                        </div>
                    )}

                    {/* University Input */}
                    <div style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}>
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
                            onChange={(e) => {
                                setUniversity(e.target.value);
                                setValidationError('');
                            }}
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
                                boxShadow: focused === 'uni' ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Program Input */}
                    <div style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}>
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
                            onChange={(e) => {
                                setProgram(e.target.value);
                                setValidationError('');
                            }}
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
                                boxShadow: focused === 'prog' ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Duration Selection */}
                    <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '400px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#4a5568',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            Interview Duration
                        </label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.75rem'
                        }}>
                            {[2, 10, 30].map((mins) => (
                                <button
                                    key={mins}
                                    onClick={() => setDuration(mins)}
                                    style={{
                                        padding: '1rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: duration === mins ? '#fff' : '#4a5568',
                                        background: duration === mins
                                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                            : '#ffffff',
                                        border: `2px solid ${duration === mins ? '#667eea' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: duration === mins ? '0 4px 12px rgba(102,126,234,0.3)' : 'none'
                                    }}
                                    onMouseOver={(e) => {
                                        if (duration !== mins) {
                                            e.currentTarget.style.borderColor = '#667eea';
                                            e.currentTarget.style.background = 'rgba(102,126,234,0.05)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (duration !== mins) {
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.background = '#ffffff';
                                        }
                                    }}
                                >
                                    {mins} min{mins > 1 ? 's' : ''}
                                </button>
                            ))}
                        </div>
                        <p style={{
                            marginTop: '0.5rem',
                            fontSize: '0.75rem',
                            color: '#a0aec0'
                        }}>
                            {duration === 2 && '1-2 questions · Quick practice'}
                            {duration === 10 && '3-5 questions · Standard interview'}
                            {duration === 30 && '8-10 questions · Comprehensive session'}
                        </p>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startInterview}
                        disabled={!university.trim() || !program.trim()}
                        style={{
                            width: '100%',
                            maxWidth: '400px',
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
