import { promises as fs } from 'fs';
import path from 'path';

const TEMP_AUDIO_DIR = path.join(process.cwd(), 'temp_audio');
const MAX_FILE_AGE_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Run cleanup every 10 minutes

/**
 * Initialize the temp audio directory
 */
export async function initTempAudioDirectory() {
    try {
        await fs.mkdir(TEMP_AUDIO_DIR, { recursive: true });
        console.log('📁 Temp audio directory initialized:', TEMP_AUDIO_DIR);

        // Start periodic cleanup
        startPeriodicCleanup();
    } catch (error) {
        console.error('Failed to create temp audio directory:', error);
    }
}

/**
 * Get the temp audio directory path
 */
export function getTempAudioPath(filename: string): string {
    return path.join(TEMP_AUDIO_DIR, filename);
}

/**
 * Clean up old audio files
 */
export async function cleanupOldAudioFiles() {
    try {
        const files = await fs.readdir(TEMP_AUDIO_DIR);
        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
            if (!file.endsWith('.mp3')) continue;

            const filePath = path.join(TEMP_AUDIO_DIR, file);
            try {
                const stats = await fs.stat(filePath);
                const fileAge = now - stats.mtimeMs;

                if (fileAge > MAX_FILE_AGE_MS) {
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
            }
        }

        if (deletedCount > 0) {
            console.log(`🗑️  Cleaned up ${deletedCount} old audio file(s)`);
        }
    } catch (error) {
        console.error('Error during audio cleanup:', error);
    }
}

/**
 * Start periodic cleanup task
 */
function startPeriodicCleanup() {
    // Run cleanup immediately
    cleanupOldAudioFiles();

    // Then run every CLEANUP_INTERVAL_MS
    setInterval(() => {
        cleanupOldAudioFiles();
    }, CLEANUP_INTERVAL_MS);

    console.log(`🔄 Periodic audio cleanup started (every ${CLEANUP_INTERVAL_MS / 60000} minutes)`);
}

/**
 * Delete a specific audio file
 */
export async function deleteAudioFile(filename: string) {
    try {
        const filePath = path.join(TEMP_AUDIO_DIR, filename);
        await fs.unlink(filePath);
    } catch (error) {
        // File might already be deleted, ignore error
    }
}
