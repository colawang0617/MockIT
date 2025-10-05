import { createServer } from 'http';
import next from 'next';
import { setupWebSocketServer } from './websocket';
import { initTempAudioDirectory } from './voiceFileManager';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(async () => {
    const server = createServer((req, res) => {
        handle(req, res);
    });

    // Initialize temp audio directory with auto-cleanup
    await initTempAudioDirectory();

    // Setup WebSocket server
    setupWebSocketServer(server);

    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
        console.log(`> WebSocket ready on ws://localhost:${port}/ws/interview`);
    });
});
