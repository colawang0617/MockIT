import { NextRequest, NextResponse } from 'next/server';

// Fast in-memory authentication (instant response)
const mockUsers = new Map<string, { userId: string; password: string }>();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        if (action === 'signup') {
            if (mockUsers.has(email)) {
                return NextResponse.json(
                    { message: 'Email already registered' },
                    { status: 409 }
                );
            }

            const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            mockUsers.set(email, { userId, password });
            console.log('✅ User signed up:', email, userId);

            return NextResponse.json({
                message: 'Account created successfully',
                userId
            }, { status: 201 });

        } else if (action === 'login') {
            const user = mockUsers.get(email);
            if (user && user.password === password) {
                console.log('✅ User logged in:', email);
                return NextResponse.json({
                    message: 'Login successful',
                    userId: user.userId
                }, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: 'Invalid email or password' },
                    { status: 401 }
                );
            }
        } else {
            return NextResponse.json(
                { message: 'Invalid action' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Auth API error:', error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
