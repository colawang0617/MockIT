import { createUser, getUserByEmail } from './snowflake/lib/db/users';
import { savePortfolio } from './snowflake/lib/db/portfolios';
import 'dotenv/config';

async function testSnowflake() {
    try {
        console.log('🧪 Testing Snowflake connection...');
        
        // 1. Create user
        const userId = await createUser(
            'test@example.com',
            'Test User',
            'hashed_password_123'
        );
        console.log('✅ User created:', userId);
        
        // 2. Get user
        const user = await getUserByEmail('test@example.com');
        console.log('✅ User retrieved:', user);
        
        // 3. Save portfolio
        const portfolioId = await savePortfolio(userId, {
            gpa: 3.8,
            testScores: { sat: 1450, act: 32 },
            extracurriculars: [
                { name: 'Robotics Club', role: 'President' },
                { name: 'Debate Team', role: 'Member' }
            ],
            essays: 'My college essay text...',
            achievements: [
                'National Merit Scholar',
                'Science Fair Winner'
            ]
        });
        console.log('✅ Portfolio saved:', portfolioId);
        
        console.log('🎉 All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSnowflake();