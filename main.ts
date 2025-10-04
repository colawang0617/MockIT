import {textToSpeechStream} from "./Elevenlabs/textToSpeechAudio"
import {generateAIAnswers} from "./GeminiAPI/generate"
import { Readable } from 'stream';
import {v4 as uuid} from 'uuid';
import {createWriteStream} from 'fs';


async function main() {
    try{
        console.log('Starting real-time AI + TTS streaming...\n');

        const fileName = `${uuid()}.mp3`;
        const fileStream = createWriteStream(fileName);
        let audioChunkCount = 0;

        // Stream: AI generates text → TTS converts to audio → Save to file
        for await (const audioStream of textToSpeechStream(generateAIAnswers("Give an introduction to University of Waterloo"))) {
            audioChunkCount++;
            console.log(`[Audio chunk ${audioChunkCount}] Converting sentence to speech...`);

            const nodeAudioStream = Readable.fromWeb(audioStream as any);

            // Pipe audio to file as it arrives
            await new Promise<void>((resolve, reject) => {
                nodeAudioStream.on('data', (chunk) => {
                    fileStream.write(chunk);
                });
                nodeAudioStream.on('end', resolve);
                nodeAudioStream.on('error', reject);
            });
        }

        fileStream.end();
        await new Promise<void>((resolve) => fileStream.on('finish', resolve));

        console.log(`\n✓ Complete audio file created: ${fileName}`);
        console.log(`Total audio chunks: ${audioChunkCount}`);
    } catch(error){
        console.error(`Error:`, error);
    }
}


main();