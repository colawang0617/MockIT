import { textToSpeechAudio } from "./textToSpeechAudio.mts";
import { readFileSync } from 'fs';

const tt = readFileSync ('./short.txt', 'utf-8');

async function main() {
    try{
        const fileName = await textToSpeechAudio(tt);
        console.log(`Audio created: ${fileName}`);
    } catch(error){
        console.error(`Error:`,error);
    }
}

main();