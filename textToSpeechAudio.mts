import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import 'dotenv/config'; 
import {createWriteStream} from 'fs';
import {v4 as uuid} from 'uuid';


const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export const textToSpeechAudio = async (text: string): Promise<string> => {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const audio = await elevenlabs.textToSpeech.stream('uxKr2vlA4hYgXZR1oPRT', {
                text,
                modelId: "eleven_multilingual_v2",
                outputFormat: "mp3_44100_128",
                optimizeStreamingLatency: 4,
                voiceSettings: {
                    stability: 0,
                    similarityBoost: 0,
                    useSpeakerBoost: true,
                    speed: 1.0,
                },
            });
            const fileName = `${uuid()}.mp3`;
            const fileStream = createWriteStream(fileName);

            for await (const chunk of audio) {
                fileStream.write(chunk);
            }
            fileStream.end();

            fileStream.on('finish', () => resolve(fileName));
            fileStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });   
};
