import { textToSpeechAudio } from '../elevenlabs/textToSpeechAudio';
import { readFile } from 'fs/promises';

/**
 * Generates voice audio from text and returns base64 encoded audio
 */
export async function generateVoiceAudio(text: string): Promise<string> {
    try {
        console.log('Generating audio for text:', text.substring(0, 50) + '...');
        const audioFile = await textToSpeechAudio(text);
        const audioBuffer = await readFile(audioFile);
        const base64Audio = audioBuffer.toString('base64');
        console.log('✅ Audio generated successfully');
        return base64Audio;
    } catch (error) {
        console.error('❌ Voice generation error:', error);
        throw error;
    }
}
