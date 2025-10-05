import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import 'dotenv/config';
import {createWriteStream} from 'fs';
import {v4 as uuid} from 'uuid';
import { Readable } from 'stream';
import { getTempAudioPath } from '../server/voiceFileManager';


const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// Stream TTS: Process text chunks and yield audio chunks in real-time
export async function* textToSpeechStream(textChunks: AsyncIterable<string>) {
    let buffer = '';
    const sentenceEndings = /[.!?]\s+/;

    for await (const chunk of textChunks) {
        buffer += chunk;

        // Process complete sentences
        const sentences = buffer.split(sentenceEndings);
        buffer = sentences.pop() || ''; // Keep incomplete sentence in buffer

        for (const sentence of sentences) {
            if (sentence.trim()) {
                const audio = await elevenlabs.textToSpeech.stream('JBFqnCBsd6RMkjVDRZzb', {
                    text: sentence.trim(),
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

                yield audio;
            }
        }
    }

    // Process remaining buffer
    if (buffer.trim()) {
        const audio = await elevenlabs.textToSpeech.stream('JBFqnCBsd6RMkjVDRZzb', {
            text: buffer.trim(),
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

        yield audio;
    }
}

// Original function for batch processing
export const textToSpeechAudio = async (text: string): Promise<string> => {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const audio = await elevenlabs.textToSpeech.stream('JBFqnCBsd6RMkjVDRZzb', {
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
            const filePath = getTempAudioPath(fileName);
            const fileStream = createWriteStream(filePath);

            const nodeAudioStream = Readable.fromWeb(audio as any);

            nodeAudioStream.pipe(fileStream);

            fileStream.on('finish', () => resolve(filePath));
            fileStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
};
