async function testSaveInterview() {
    const response = await fetch('http://localhost:3000/api/saveInterviewData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'test-user-123',
            targetId: 'test-target-456',
            questions: ['Tell me about yourself'],
            answers: ['I am a student...']
        })
    });
    
    const data = await response.json();
    console.log('Response:', data);
}

testSaveInterview();