# 📚 Complete Project Guide: AI Mock Interview System

> **Author's Note**: This guide is designed to teach you every aspect of this project, from architecture to implementation details. Read it sequentially for the best learning experience.

---

## Table of Contents
1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Technology Stack Deep Dive](#2-technology-stack-deep-dive)
3. [File-by-File Breakdown](#3-file-by-file-breakdown)
4. [Core Concepts & Patterns](#4-core-concepts--patterns)
5. [Data Flow & Communication](#5-data-flow--communication)
6. [Key Learning Takeaways](#6-key-learning-takeaways)

---

## 1. Project Overview & Architecture

### What This Project Does
This is a **real-time AI-powered mock interview system** that simulates college admissions interviews. It uses:
- Voice input/output for natural conversation
- AI to generate interview questions and responses
- Real-time interruption detection (like a real human)
- Database storage for analytics and review

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌────────────────┐      ┌──────────────────────────────┐  │
│  │   Setup Page   │─────▶│    Interview Page            │  │
│  │  (page.tsx)    │      │  - Voice Input (Web Speech)  │  │
│  │                │      │  - Audio Output (Web Audio)  │  │
│  └────────────────┘      │  - Real-time UI Updates      │  │
│                          └──────────┬───────────────────┘  │
└─────────────────────────────────────┼──────────────────────┘
                                      │
                              WebSocket Connection
                              (Bidirectional)
                                      │
┌─────────────────────────────────────┼──────────────────────┐
│                      NEXT.JS SERVER  │                      │
│  ┌───────────────────────────────────▼─────────────────┐  │
│  │  Custom Server (server/index.ts)                     │  │
│  │  ├─ Next.js HTTP Server                              │  │
│  │  └─ WebSocket Server (websocket.ts)                  │  │
│  └───────────────────┬──────────────┬───────────────────┘  │
│                      │              │                       │
│         ┌────────────▼────┐    ┌───▼──────────────┐       │
│         │ AI Interviewer  │    │ Voice Generator  │       │
│         │ (Gemini API)    │    │ (ElevenLabs TTS) │       │
│         └─────────────────┘    └──────────────────┘       │
│                      │                                      │
│         ┌────────────▼────────────┐                        │
│         │  Question Bank System   │                        │
│         │  (question.json)        │                        │
│         └─────────────────────────┘                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   Snowflake DB      │
                │  - Session Data     │
                │  - Conversations    │
                │  - Analytics        │
                └─────────────────────┘
```

### Why This Architecture?

1. **WebSocket over HTTP**: Real-time bidirectional communication needed for:
   - Streaming AI responses
   - Interrupt detection while user speaks
   - Live status updates

2. **Custom Next.js Server**: Next.js doesn't support WebSockets by default, so we created a custom server that runs both Next.js AND WebSocket on the same port (3000)

3. **Client-Side Voice**: Using browser's Web Speech API is:
   - Free (no API costs)
   - Low latency (no network round-trip)
   - Privacy-friendly (audio doesn't leave browser)

---

## 2. Technology Stack Deep Dive

### Frontend Technologies

#### **Next.js 14 (App Router)**
- **What**: React framework with server-side rendering
- **Why**: Better SEO, faster initial loads, easy API routes
- **Where Used**: All pages (`app/` directory)
- **Key Feature**: App Router (newer than Pages Router)

**Example from project:**
```tsx
// app/page.tsx - Setup page
'use client'; // This makes it a Client Component (can use hooks, state)

export default function SetupPage() {
  const [university, setUniversity] = useState(''); // Client-side state
  const router = useRouter(); // Client-side navigation
  // ...
}
```

**Learning Point**: Notice the `'use client'` directive. Without it, this would be a Server Component (no useState, useEffect, etc.). We need client components for interactive UIs.

#### **React Hooks Used**

1. **useState** - Manage component state
```tsx
const [isListening, setIsListening] = useState(false);
```

2. **useRef** - Hold mutable values that don't trigger re-renders
```tsx
const wsRef = useRef<WebSocket | null>(null); // Persists across renders
```

3. **useEffect** - Side effects (setup, cleanup)
```tsx
useEffect(() => {
  // Setup code (runs once on mount)
  return () => {
    // Cleanup code (runs on unmount)
  };
}, []); // Empty dependency array = run once
```

4. **useSearchParams** - Read URL query parameters
```tsx
const university = searchParams.get('university'); // Gets ?university=MIT
```

#### **TypeScript**
- **What**: JavaScript with static types
- **Why**: Catch errors before runtime, better IDE autocomplete
- **Example**:
```tsx
interface InterviewSession {
  sessionId: string;        // Must be string
  userId: string;
  conversationHistory: Array<{  // Array of objects with specific shape
    role: 'interviewer' | 'user';  // Can only be these two values
    content: string;
    timestamp: Date;
  }>;
}
```

### Backend Technologies

#### **Node.js with TypeScript**
- **What**: JavaScript runtime for server-side code
- **Why**: Same language (TypeScript) across frontend/backend
- **Where**: All `server/` files

#### **WebSocket (ws library)**
- **What**: Protocol for real-time bidirectional communication
- **Why**: HTTP is request-response. WebSocket is persistent connection.
- **How it works**:

```
Traditional HTTP:
Client: "Hey server, send me data" ──▶ Server
Client: ◀── "Here's the data"     Server
[Connection closes]

WebSocket:
Client: "Start connection" ──▶ Server
        ◀────────────────── "Connected"
[Connection stays open]
Client: "User said hello" ──▶ Server
Client: ◀── "AI response"  Server
Client: "More input" ──▶ Server
        ... ongoing ...
```

### AI & Voice Technologies

#### **Google Gemini API**
- **Model**: gemini-2.0-flash-exp
- **Purpose**: Generate interview questions and responses
- **Key Feature**: Streaming (sends response word-by-word, not all at once)

```typescript
const result = await genAI.models.generateContentStream({
  model: "gemini-2.0-flash-exp",
  contents: prompt,
});

// Streams chunks as they're generated
for await (const chunk of result) {
  const text = chunk.text; // Each chunk is a piece of the response
  yield text; // Send to client immediately
}
```

**Why Streaming?**: User sees response appearing in real-time (better UX) instead of waiting 5+ seconds for complete response.

#### **ElevenLabs Text-to-Speech**
- **Purpose**: Convert AI text responses to natural voice
- **Voice ID**: 'JBFqnCBsd6RMkjVDRZzb' (you can change this)
- **Format**: MP3, 44.1kHz, 128kbps
- **Output**: Audio file saved locally, then sent to browser

#### **Web Speech API (Browser)**
- **Purpose**: Convert user's voice to text (Speech-to-Text)
- **Cost**: FREE (built into Chrome/Edge)
- **How it works**:

```tsx
const recognition = new (window as any).webkitSpeechRecognition();
recognition.continuous = true;  // Keep listening
recognition.interimResults = true; // Get partial results while speaking

recognition.onresult = (event) => {
  // event.results[i][0].transcript contains the text
  // isFinal tells you if it's complete or still being spoken
};

recognition.start(); // Start listening
```
## 🧠 Avatar and Lip Sync System

### 🎭 Overview
This project integrates a **Ready Player Me** 3D avatar into a React + Three.js environment.  
The avatar visually reacts to audio input — moving its mouth and facial features based on sound frequencies in real time.

The system uses:
- **React Three Fiber** for rendering 3D models.
- **Ready Player Me GLB avatars** with blend/morph targets for facial animation.
- **Web Audio API** for analyzing microphone or audio file signals.
- A **custom viseme detection algorithm** to drive mouth shapes.

---

### 🧍‍♂️ Avatar Rendering

The component `ReadyPlayerMeAvatar` renders the avatar in a 3D scene:

- Loads Ready Player Me `.glb` model using `GLTFLoader`.
- Finds all available morph targets (for example: `mouthOpen`, `viseme_aa`, `viseme_O`, etc.).
- Smoothly interpolates between morph target weights to create realistic movement.
- Uses ambient, directional, and point lights for realistic shading.
- Camera and user interaction are handled through `OrbitControls`.

#### Key files:
- **`ReadyPlayerMeAvatar.tsx`** — main React component.
- **`AvatarModel`** — handles the 3D model loading and animation logic.

---

### 🗣️ Lip Sync Analyzer

The **LipSyncAnalyzer** class is responsible for "listening" to sound frequencies and mapping them to **visemes** (mouth shapes).

It works by:
1. Capturing incoming audio through `AnalyserNode` (Web Audio API).
2. Reading the frequency data into a `Uint8Array`.
3. Identifying:
   - Overall volume (amplitude)
   - Dominant frequency
   - Spectral centroid (brightness)
4. Using those values to pick a viseme label (`aa`, `O`, `E`, `SS`, etc.).
5. Scaling the viseme’s **weight** to drive morph target values on the avatar.

#### Example mapping:

| Detected Viseme | Approx. Mouth Shape | Morph Targets Activated |
|------------------|--------------------|--------------------------|
| `aa`             | Wide open (as in *car*) | `mouthOpen`, `jawOpen`, `viseme_aa` |
| `O`              | Rounded lips | `mouthFunnel`, `viseme_O` |
| `I` / `E`        | Smiling sound | `mouthSmile`, `viseme_I` |
| `FF`             | Teeth-on-lip shape | `mouthRollLower`, `viseme_FF` |
| `sil`            | Silence / closed | All targets set to 0 |

#### Smoothing:
Lip movement uses **lerp interpolation** between current and target morph weights for natural animation:

```ts
THREE.MathUtils.lerp(currentWeight, targetWeight, 0.2)
```
### Database

#### **Snowflake**
- **What**: Cloud data warehouse (like PostgreSQL but for big data)
- **Why**: Scalable, great for analytics, separates storage/compute
- **Tables**:
  - `interview_sessions` - Session metadata
  - `conversation_messages` - Full transcript
  - `qa_pairs` - Extracted Q&A for analysis

---

## 3. File-by-File Breakdown

### 📁 Root Configuration Files

#### `package.json`
**Purpose**: Project metadata and dependencies

**Key sections:**
```json
{
  "scripts": {
    "dev": "tsx server/index.ts",  // Runs custom server (not next dev)
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.1.6",              // React framework
    "react": "^19.0.0",             // UI library
    "ws": "^8.18.0",                // WebSocket server
    "@google/genai": "^0.23.0",     // Gemini AI
    "@elevenlabs/api": "^0.27.1",   // Text-to-speech
    "snowflake-sdk": "^2.2.2"       // Database
  }
}
```

**Learning Point**: `tsx` is a TypeScript executor. `tsx server/index.ts` runs TypeScript directly without compilation step.

#### `tsconfig.json`
**Purpose**: TypeScript compiler configuration

**Key settings:**
```json
{
  "compilerOptions": {
    "target": "ES2017",           // JavaScript version to compile to
    "lib": ["dom", "ES2017"],     // Available APIs
    "jsx": "preserve",            // Don't compile JSX (Next.js handles it)
    "moduleResolution": "bundler", // How to resolve imports
    "paths": {
      "@/*": ["./*"]              // Alias: import X from '@/server/...'
    }
  }
}
```

#### `next-env.d.ts`
**Purpose**: TypeScript definitions for Next.js types
**What it does**: Auto-generated, provides types for Next.js APIs
**Should you edit?**: No, Next.js manages this

---

### 📁 app/ - Next.js Frontend

#### `app/layout.tsx`
**Purpose**: Root layout wrapper for all pages

**What happens here:**
- Sets page metadata (title, description)
- Wraps all pages with common HTML structure
- Applies global styles

```tsx
export const metadata = {
  title: 'Mock Interview',
  description: 'AI-powered interview practice',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
      {/* 'children' is the actual page content */}
    </html>
  );
}
```

**Learning Point**: This runs on EVERY page. Don't put page-specific logic here.

#### `app/page.tsx` - Setup Page
**Purpose**: Entry point where users enter institution and program

**Flow:**
1. User types institution (e.g., "MIT")
2. User types program (e.g., "Computer Science")
3. Click "Start Interview" → Navigate to `/interview?university=MIT&program=Computer+Science`

**Key Code Patterns:**

```tsx
// Controlled input pattern
<input
  value={university}  // Value comes from state
  onChange={(e) => setUniversity(e.target.value)}  // Update state on change
/>
```

**Why controlled?**: React controls the value. Enables validation, formatting, etc.

```tsx
// Navigation with query parameters
router.push(`/interview?university=${encodeURIComponent(university)}&program=${encodeURIComponent(program)}`);
```

**Why encodeURIComponent?**: Handles spaces, special characters in URLs safely.

**UI Techniques Used:**
- CSS-in-JS (inline styles)
- Gradient backgrounds with blur effects
- Glassmorphism (frosted glass effect with `backdropFilter: 'blur(10px)'`)
- Conditional styling based on focus state
- Hover effects with `onMouseOver`/`onMouseOut`

#### `app/interview/page.tsx` - Interview Page
**Purpose**: Main interview interface with voice I/O

**Architecture:** This is a complex component with multiple responsibilities:

1. **WebSocket Management** (lines 105-237)
2. **Voice Recognition Setup** (lines 24-103)
3. **Audio Playback** (lines 183-226)
4. **UI Rendering** (lines 306-680)

**Let's break down each part:**

##### **1. WebSocket Connection**

```tsx
const connectWebSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/interview`);

  ws.onopen = () => {
    // Initialize session
    ws.send(JSON.stringify({
      type: 'init',
      userId: 'test_user',
      university: university,
      program: program
    }));
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    // Handle different message types
  };
};
```

**Message Types:**
- `session_ready` - Server confirms session created
- `start_listening` - Auto-start voice recognition
- `interviewer_text_chunk` - Streaming AI response (word by word)
- `interviewer_message` - Complete AI message
- `interviewer_audio` - Voice audio (base64 encoded)
- `interrupt` - AI is interrupting user
- `session_ended` - Interview finished

**Learning Point**: WebSocket communication is event-driven. You send JSON, receive JSON, and handle each message type differently.

##### **2. Web Speech API Setup**

```tsx
useEffect(() => {
  if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
    const recognition = new SpeechRecognition();

    recognition.continuous = true;  // Don't stop after one phrase
    recognition.interimResults = true;  // Get partial results

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Send interim results for interruption detection
      if (interimTranscript) {
        wsRef.current.send(JSON.stringify({
          type: 'speech_interim',
          text: interimTranscript
        }));
      }

      // Send final transcript as user message
      if (finalTranscript) {
        wsRef.current.send(JSON.stringify({
          type: 'text_input',
          text: finalTranscript.trim()
        }));
      }
    };
  }
}, []);
```

**Why two types of results?**
- **Interim**: "Hello my na..." (still speaking)
- **Final**: "Hello my name is John" (finished phrase)

**Why send interim?**: For interruption detection! If user speaks while AI talks, we can interrupt immediately without waiting for final result.

##### **3. Audio Playback**

```tsx
case 'interviewer_audio':
  const binaryString = atob(data.audio);  // Decode base64
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  currentAudioSourceRef.current = source;  // Store for interruption
  source.start();

  source.onended = () => {
    currentAudioSourceRef.current = null;
    setStatus('Ready - Your turn');
  };
```

**Web Audio API Flow:**
1. Decode base64 string to binary
2. Decode binary to audio buffer
3. Create audio source from buffer
4. Connect to speakers (destination)
5. Play

**Why store `currentAudioSourceRef`?**: So we can call `source.stop()` if user interrupts!

##### **4. UI State Management**

**State variables explained:**
```tsx
const [isConnected, setIsConnected] = useState(false);  // WebSocket connection status
const [sessionId, setSessionId] = useState<string | null>(null);  // Unique session ID
const [status, setStatus] = useState('Initializing...');  // Status bar text
const [messages, setMessages] = useState<Array<...>>([]);  // Chat history
const [inputText, setInputText] = useState('');  // Text input box
const [isListening, setIsListening] = useState(false);  // Mic on/off
const [transcript, setTranscript] = useState('');  // Current speech (interim)
const [currentInterviewerMessage, setCurrentInterviewerMessage] = useState('');  // Streaming response
```

**Refs explained** (don't trigger re-renders):
```tsx
const wsRef = useRef<WebSocket | null>(null);  // WebSocket instance
const recognitionRef = useRef<any>(null);  // Speech recognition instance
const audioContextRef = useRef<AudioContext | null>(null);  // Web Audio context
const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);  // Playing audio
```

**Learning Point**: Use `useState` for values that affect UI. Use `useRef` for values that don't (like API clients, timers, DOM references).

---

### 📁 server/ - Backend Logic

#### `server/index.ts` - Custom Next.js Server
**Purpose**: Runs both Next.js AND WebSocket on same port

**Why custom server?**: Next.js's built-in server doesn't support WebSockets.

```tsx
import next from 'next';
import { createServer } from 'http';
import { setupWebSocketServer } from './websocket';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);  // Let Next.js handle HTTP requests
  });

  setupWebSocketServer(server);  // Attach WebSocket to same server

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
```

**Flow:**
1. Create HTTP server
2. Tell Next.js to handle HTTP routes
3. Attach WebSocket server to same HTTP server
4. Listen on port 3000

**Learning Point**: HTTP and WebSocket can share the same port. WebSocket "upgrades" HTTP connection.

#### `server/websocket.ts` - WebSocket Server & Session Management
**Purpose**: Core backend logic for interview sessions

**Session Data Structure:**
```typescript
export interface InterviewSession {
  sessionId: string;              // Unique ID (e.g., "session_1234567890")
  userId: string;                 // User identifier
  targetUniversity: string;       // e.g., "MIT"
  targetProgram: string;          // e.g., "Computer Science"
  questionBank: QuestionBank;     // Manages relevant questions
  currentDifficulty: number;      // Tracks question difficulty progression
  conversationHistory: Array<{    // Full transcript
    role: 'interviewer' | 'user';
    content: string;
    timestamp: Date;
  }>;
  speechTracker: SpeechTracker;   // Tracks user speech patterns
}
```

**Sessions Storage:**
```typescript
const sessions = new Map<string, InterviewSession>();
```

**Why Map?**: Fast lookup by sessionId. Like a dictionary/object but better for dynamic keys.

**Message Handlers:**

1. **`init`** - Create new session
```typescript
case 'init':
  sessionId = `session_${Date.now()}`;
  const questionBank = new QuestionBank(targetUniversity, targetProgram);

  sessions.set(sessionId, {
    sessionId,
    userId: message.userId,
    targetUniversity,
    targetProgram,
    questionBank,
    currentDifficulty: 1,
    conversationHistory: [],
    speechTracker: new SpeechTracker()
  });

  // Get first question and send it
  const firstQuestion = questionBank.getOpeningQuestion();
  const greeting = `Hi! Thanks for taking the time to interview for ${targetProgram} at ${targetUniversity}. Let's get started. ${firstQuestion.question_text}`;

  // Send text
  ws.send(JSON.stringify({
    type: 'interviewer_message',
    text: greeting
  }));

  // Auto-start listening
  ws.send(JSON.stringify({
    type: 'start_listening'
  }));

  // Generate voice (async, doesn't block)
  generateVoiceAudio(greeting).then(base64Audio => {
    ws.send(JSON.stringify({
      type: 'interviewer_audio',
      audio: base64Audio
    }));
  });
```

**Learning Point**: `async` operations are sent in background. Text appears immediately, audio arrives when ready.

2. **`speech_interim`** - Real-time interruption detection
```typescript
case 'speech_interim':
  const interimSession = sessions.get(sessionId);
  const speechDuration = interimSession.speechTracker.getSpeechDuration();

  const interruption = await analyzeForInterruption(
    message.text,
    interimSession.conversationHistory,
    speechDuration
  );

  if (interruption.shouldInterrupt) {
    // Stop user's speech recognition
    ws.send(JSON.stringify({
      type: 'interrupt',
      reason: interruption.reason
    }));

    // Send interruption text
    ws.send(JSON.stringify({
      type: 'interviewer_message',
      text: interruption.interruptionText,
      isInterruption: true
    }));

    // Generate voice for interruption
    generateVoiceAudio(interruption.interruptionText).then(audio => {
      ws.send(JSON.stringify({
        type: 'interviewer_audio',
        audio
      }));
    });
  }
```

**How interruption works:**
- User speaks → Browser sends interim text every ~100ms
- Server analyzes: too long? too vague? pausing?
- If yes → Generate quick interruption → Send back
- Browser stops user's mic, plays AI interruption

3. **`text_input`** - User's complete message
```typescript
case 'text_input':
  const session = sessions.get(sessionId);
  session.conversationHistory.push({
    role: 'user',
    content: message.text,
    timestamp: new Date()
  });

  // Generate AI response (streaming)
  let fullResponse = '';
  const generator = generateInterviewerResponse(session, message.text);

  for await (const chunk of generator) {
    fullResponse += chunk;
    // Send each chunk as it arrives
    ws.send(JSON.stringify({
      type: 'interviewer_text_chunk',
      chunk: chunk
    }));
  }

  // Add complete response to history
  session.conversationHistory.push({
    role: 'interviewer',
    content: fullResponse,
    timestamp: new Date()
  });

  // Generate voice for complete response
  const audio = await generateVoiceAudio(fullResponse);
  ws.send(JSON.stringify({
    type: 'interviewer_audio',
    audio: audio
  }));
```

**Why streaming text?**: User sees AI "thinking" in real-time. Much better UX than waiting.

4. **`end_session`** - Save to database
```typescript
case 'end_session':
  const session = sessions.get(sessionId);

  // Save to Snowflake
  await saveCompleteInterviewSession(
    sessionId,
    session.userId,
    session.targetUniversity,
    session.targetProgram,
    session.conversationHistory
  );

  sessions.delete(sessionId);  // Remove from memory

  ws.send(JSON.stringify({
    type: 'session_ended',
    message: 'Interview session completed'
  }));
```

#### `server/aiInterviewer.ts` - AI Response Generation
**Purpose**: Generate interviewer responses using Gemini AI

**System Prompt** (tells AI how to behave):
```typescript
const INTERVIEWER_SYSTEM_PROMPT = `You are an experienced college admissions interviewer. Conduct a natural, conversational interview.

Guidelines:
- Keep responses SHORT and conversational (1-3 sentences max)
- Ask ONE question at a time
- Show genuine interest and follow up on what the student says
- Be warm but professional
- Ask follow-up questions based on their answers
- Occasionally interrupt politely to dig deeper or redirect
- Start with an icebreaker, then transition to deeper questions about their goals, experiences, and fit

Remember: This is a CONVERSATION, not an interrogation. Be human-like and natural.`;
```

**Prompt Construction:**
```typescript
export function generateInterviewerResponse(
  session: InterviewSession,
  userInput: string
): AsyncGenerator<string> {
  // Build conversation context
  const conversationContext = session.conversationHistory
    .map(msg => `${msg.role === 'interviewer' ? 'Interviewer' : 'Student'}: ${msg.content}`)
    .join('\n');

  // Get available questions
  const questionContext = session.questionBank.getQuestionContext();

  const prompt = `${INTERVIEWER_SYSTEM_PROMPT}

${questionContext}

Previous conversation:
${conversationContext}

Student: ${userInput}

Interviewer (respond naturally, ask follow-ups related to ${session.targetProgram} at ${session.targetUniversity}):`;

  return (async function*() {
    yield* generateStreamingResponse(prompt);
  })();
}
```

**Why include conversation history?**: AI needs context to ask relevant follow-ups.

**Async Generator Pattern:**
```typescript
export async function* generateStreamingResponse(prompt: string): AsyncGenerator<string> {
  const result = await genAI.models.generateContentStream({
    model: "gemini-2.0-flash-exp",
    contents: prompt,
  });

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) {
      yield text;  // Send this chunk immediately
    }
  }
}
```

**Learning Point**: `async function*` is an async generator. It can `yield` values over time instead of returning all at once.

**Usage:**
```typescript
const generator = generateInterviewerResponse(session, "I love coding");

for await (const chunk of generator) {
  console.log(chunk);  // "That's", " great", "! What", " languages", "..."
}
```

#### `server/interruptionEngine.ts` - Interruption Logic
**Purpose**: Detect when AI should interrupt user

**Heuristics (rules) used:**
```typescript
export async function analyzeForInterruption(
  userText: string,
  conversationHistory: InterviewSession['conversationHistory'],
  speechDuration: number
): Promise<InterruptionTrigger> {
  const wordCount = userText.split(' ').length;
  const hasLongPause = speechDuration > 4000;  // 4 seconds
  const isTooLong = wordCount > 150;
  const isVague = hasVagueIndicators(userText);

  // Don't interrupt too quickly
  if (wordCount < 15) {
    return { shouldInterrupt: false, reason: 'none' };
  }

  // Interrupt if rambling
  if (isTooLong) {
    return {
      shouldInterrupt: true,
      reason: 'rambling',
      interruptionText: await generateInterruption('rambling', userText, conversationHistory)
    };
  }

  // Interrupt if vague (with randomness)
  if (isVague && wordCount > 30 && Math.random() > 0.4) {
    return {
      shouldInterrupt: true,
      reason: 'clarification_needed',
      interruptionText: await generateInterruption('clarification', userText, conversationHistory)
    };
  }

  // Natural pause - maybe follow up
  if (hasLongPause && wordCount > 20 && Math.random() > 0.7) {
    return {
      shouldInterrupt: true,
      reason: 'pause',
      interruptionText: await generateInterruption('followup', userText, conversationHistory)
    };
  }

  return { shouldInterrupt: false, reason: 'none' };
}
```

**Vague Indicators:**
```typescript
function hasVagueIndicators(text: string): boolean {
  const vaguePatterns = [
    /\b(um+|uh+|like|you know|kind of|sort of|i guess|maybe|probably)\b/gi,
    /\b(stuff|things|something|whatever)\b/gi,
  ];

  let vagueCount = 0;
  for (const pattern of vaguePatterns) {
    const matches = text.match(pattern);
    if (matches) vagueCount += matches.length;
  }

  return vagueCount > 3;  // More than 3 vague words = vague answer
}
```

**Why regex?**: Pattern matching. `/\b(um+|uh+)\b/gi` means:
- `\b` = word boundary
- `um+` = "um", "umm", "ummm", etc.
- `|` = OR
- `g` = global (find all matches)
- `i` = case insensitive

**Generate Contextual Interruption:**
```typescript
async function generateInterruption(
  type: 'rambling' | 'clarification' | 'followup',
  userText: string,
  conversationHistory: InterviewSession['conversationHistory']
): Promise<string> {
  const prompts = {
    rambling: `The student is rambling. Politely interrupt and refocus them with a specific question.`,
    clarification: `The student gave a vague answer. Interrupt gently to ask for a specific example.`,
    followup: `The student paused. Jump in with an engaging follow-up question to dig deeper.`
  };

  const context = conversationHistory.slice(-3)  // Last 3 messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `You are an interviewer. ${prompts[type]}
Recent conversation:
${context}

Interrupt naturally with a brief (1 sentence) question:`;

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: prompt,
  });

  return result.text || "Could you tell me more about that?";
}
```

**Speech Tracker Class:**
```typescript
export class SpeechTracker {
  private lastSpeechTime: number = 0;
  private totalWords: number = 0;
  private pauseStart: number | null = null;

  onSpeechStart() {
    this.lastSpeechTime = Date.now();
    this.pauseStart = null;
  }

  onSpeechEnd() {
    this.pauseStart = Date.now();
  }

  addWords(count: number) {
    this.totalWords += count;
  }

  getSpeechDuration(): number {
    return Date.now() - this.lastSpeechTime;
  }

  getPauseDuration(): number {
    if (!this.pauseStart) return 0;
    return Date.now() - this.pauseStart;
  }
}
```

**Why track time?**: Detect pauses (user stopped talking), long speeches, etc.

#### `server/questionBank.ts` - Question Management
**Purpose**: Filter and serve relevant questions from question.json

**Question Interface:**
```typescript
export interface Question {
  university: string;          // "MIT", "Stanford", or "General"
  program: string;             // "Computer Science", "Business", "All", etc.
  question_text: string;       // The actual question
  category: string;            // "personal", "academic", "motivation", etc.
  difficulty_level: number;    // 1-5
  source: string;              // Where question came from
}
```

**QuestionBank Class:**
```typescript
export class QuestionBank {
  private questions: Question[];
  private usedQuestions: Set<string> = new Set();

  constructor(
    private targetUniversity: string,
    private targetProgram: string
  ) {
    this.questions = this.loadRelevantQuestions();
  }

  private loadRelevantQuestions(): Question[] {
    const relevant: Question[] = [];

    for (const q of questions) {
      const isRelevant =
        // Exact university match
        (q.university === this.targetUniversity) ||
        // General questions for all universities
        (q.university === 'General' && (
          q.program === 'All' ||
          q.program === this.targetProgram ||
          this.isProgramMatch(q.program, this.targetProgram)
        ));

      if (isRelevant) {
        relevant.push(q as Question);
      }
    }

    // Sort: school-specific first, then by difficulty
    relevant.sort((a, b) => {
      if (a.university !== 'General' && b.university === 'General') return -1;
      if (a.university === 'General' && b.university !== 'General') return 1;
      return a.difficulty_level - b.difficulty_level;
    });

    return relevant;
  }
}
```

**Program Matching:**
```typescript
private isProgramMatch(questionProgram: string, targetProgram: string): boolean {
  const stemPrograms = ['Computer Science', 'Engineering', 'Mathematics', 'Physics', 'Chemistry'];

  if (questionProgram === 'STEM' && stemPrograms.includes(targetProgram)) {
    return true;
  }

  return questionProgram.toLowerCase().includes(targetProgram.toLowerCase()) ||
         targetProgram.toLowerCase().includes(questionProgram.toLowerCase());
}
```

**Get Opening Question:**
```typescript
getOpeningQuestion(): Question {
  const openingQuestions = this.questions.filter(q =>
    q.difficulty_level === 1 &&
    (q.category === 'personal' || q.category === 'motivation')
  );

  const question = openingQuestions[Math.floor(Math.random() * openingQuestions.length)];
  this.usedQuestions.add(question.question_text);  // Mark as used
  return question;
}
```

**Provide Context to AI:**
```typescript
getQuestionContext(): string {
  const remainingQuestions = this.questions
    .filter(q => !this.usedQuestions.has(q.question_text))
    .slice(0, 5)  // Top 5 unused questions
    .map(q => `- ${q.question_text} (${q.category})`)
    .join('\n');

  return `Target School: ${this.targetUniversity}
Target Program: ${this.targetProgram}

Available interview questions to draw from:
${remainingQuestions}

When asking follow-ups, stay relevant to the school and program context.`;
}
```

**Why provide to AI?**: So AI knows what questions are available and stays on topic.

#### `server/voiceGenerator.ts` - Text-to-Speech Wrapper
**Purpose**: Clean interface for voice generation

```typescript
import { textToSpeechAudio } from '../Elevenlabs/textToSpeechAudio';
import { readFile } from 'fs/promises';

export async function generateVoiceAudio(text: string): Promise<string> {
  try {
    console.log('Generating audio for text:', text.substring(0, 50) + '...');

    // Generate audio file
    const audioFile = await textToSpeechAudio(text);

    // Read file
    const audioBuffer = await readFile(audioFile);

    // Convert to base64 (for sending over WebSocket)
    const base64Audio = audioBuffer.toString('base64');

    console.log('✅ Audio generated successfully');
    return base64Audio;
  } catch (error) {
    console.error('❌ Voice generation error:', error);
    throw error;
  }
}
```

**Why base64?**: WebSocket sends text. Base64 encodes binary data as text.

**Why separate file?**: Single Responsibility Principle. All voice logic in one place.

---

### 📁 Elevenlabs/ - Text-to-Speech

#### `Elevenlabs/textToSpeechAudio.ts`
**Purpose**: Convert text to speech audio file

```typescript
import { ElevenLabs } from "@elevenlabs/api";
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';

const elevenlabs = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const textToSpeechAudio = async (text: string): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    const audio = await elevenlabs.textToSpeech.stream(
      'JBFqnCBsd6RMkjVDRZzb',  // Voice ID
      {
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
      }
    );

    const fileName = `${uuid()}.mp3`;  // Random filename
    const fileStream = createWriteStream(fileName);
    const nodeAudioStream = Readable.fromWeb(audio as any);

    nodeAudioStream.pipe(fileStream);  // Stream audio to file

    fileStream.on('finish', () => resolve(fileName));
    fileStream.on('error', reject);
  });
};
```

**Voice Settings Explained:**
- `stability: 0` = More expressive, varies intonation
- `similarityBoost: 0` = Don't boost similarity to original voice
- `useSpeakerBoost: true` = Enhance speaker characteristics
- `speed: 1.0` = Normal speed

**Why streaming?**: Saves memory. Audio streams directly to file instead of loading all into RAM.

**Learning Point**: Node.js streams are powerful for handling large data (files, network, etc.) efficiently.

---

### 📁 GeminiAPI/ - AI Text Generation

#### `GeminiAPI/generate.ts`
**Purpose**: Generate AI text responses (alternative to server/aiInterviewer.ts)

This file was used in earlier versions. Now `server/aiInterviewer.ts` handles AI generation.

**Key difference:**
- `generate.ts`: Saves output to file
- `aiInterviewer.ts`: Streams output to WebSocket

---

### 📁 Snowflake/ - Database

#### `Snowflake/lib/snowflake.ts` - Database Connection
**Purpose**: Manage Snowflake connection and queries

```typescript
import snowflake from 'snowflake-sdk';

let connection: any = null;

export function getSnowflakeConnection() {
  if (!connection) {
    connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      database: 'INTERVIEW_PREP',
      schema: 'INTERVIEW_DATA',
      warehouse: 'COMPUTE_WH',
    });
  }
  return connection;
}
```

**Singleton Pattern**: Only create one connection, reuse it.

**Execute Query:**
```typescript
export async function executeQuery(query: string, binds: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const conn = getSnowflakeConnection();

    if (!conn.isUp()) {
      conn.connect((err) => {
        if (err) {
          reject(err);
          return;
        }
        runQuery();
      });
    } else {
      runQuery();
    }

    function runQuery() {
      conn.execute({
        sqlText: query,
        binds: binds,  // Prevent SQL injection
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      });
    }
  });
}
```

**Why binds?**: Security. Prevents SQL injection attacks.

**Bad (vulnerable):**
```typescript
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
// If userInput = "' OR '1'='1" → Returns all users!
```

**Good (safe):**
```typescript
const query = `SELECT * FROM users WHERE email = ?`;
executeQuery(query, [userInput]);  // Binds are sanitized
```

#### `Snowflake/lib/db/sessions.ts` - Session Database Operations
**Purpose**: Save interview sessions to database

**Save Complete Session:**
```typescript
export async function saveCompleteInterviewSession(
  sessionId: string,
  userId: string,
  targetUniversity: string,
  targetProgram: string,
  conversationHistory: ConversationMessage[]
) {
  console.log('Saving complete interview session:', sessionId);

  try {
    // 1. Save main session record
    await executeQuery(
      `INSERT INTO interview_sessions
       (session_id, user_id, target_university, target_program, status, started_at, completed_at)
       VALUES (?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP())`,
      [
        sessionId,
        userId,
        targetUniversity,
        targetProgram,
        conversationHistory[0]?.timestamp || new Date()
      ]
    );

    // 2. Save all conversation messages
    for (const message of conversationHistory) {
      const messageId = uuid();
      await executeQuery(
        `INSERT INTO conversation_messages
         (message_id, session_id, role, content, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [messageId, sessionId, message.role, message.content, message.timestamp]
      );
    }

    // 3. Extract Q&A pairs
    for (let i = 0; i < conversationHistory.length - 1; i++) {
      const current = conversationHistory[i];
      const next = conversationHistory[i + 1];

      if (current.role === 'interviewer' && next.role === 'user') {
        const qaId = uuid();
        const qualityScore = Math.min(10, Math.max(1, next.content.split(' ').length / 10));

        await executeQuery(
          `INSERT INTO qa_pairs
           (qa_id, session_id, question_text, answer_text, quality_score)
           VALUES (?, ?, ?, ?, ?)`,
          [qaId, sessionId, current.content, next.content, qualityScore]
        );
      }
    }

    console.log('✅ Complete interview session saved successfully');
    return sessionId;
  } catch (error) {
    console.error('❌ Failed to save interview session:', error);
    throw error;
  }
}
```

**Three Tables Strategy:**
1. **interview_sessions**: Metadata (who, what school, when)
2. **conversation_messages**: Full transcript (every message)
3. **qa_pairs**: Extracted Q&A for analysis

**Why extract Q&A?**: Makes analytics easier. "Show me all answers to 'Why this school?'" question.

**Quality Score Heuristic:**
```typescript
const qualityScore = Math.min(10, Math.max(1, answer.split(' ').length / 10));
```

Simple formula: longer answer = higher score (up to 10). You can improve this with AI later!

#### `Snowflake/schema.sql` - Database Schema
**Purpose**: Define table structures

```sql
CREATE TABLE IF NOT EXISTS interview_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    target_university VARCHAR(255) NOT NULL,
    target_program VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress',
    started_at TIMESTAMP_NTZ NOT NULL,
    completed_at TIMESTAMP_NTZ,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP_NTZ NOT NULL,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
);

CREATE TABLE IF NOT EXISTS qa_pairs (
    qa_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    quality_score FLOAT,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (session_id) REFERENCES interview_sessions(session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_session_id ON qa_pairs(session_id);
```

**Learning Points:**
- `VARCHAR(255)` = Variable-length string, max 255 chars
- `TEXT` = Large text (no limit)
- `TIMESTAMP_NTZ` = Timestamp without timezone
- `FOREIGN KEY` = Enforces relationship (messages must belong to valid session)
- `INDEX` = Makes queries faster (like book index)

**Why indexes?**: Finding sessions by user_id without index = scan entire table. With index = instant lookup.

#### `Snowflake/setup_schema.ts` - Schema Setup Script
**Purpose**: Automatically create tables

```typescript
import { executeQuery } from './lib/snowflake';
import { readFile } from 'fs/promises';

async function setupSchema() {
  console.log('🔧 Setting up Snowflake schema...');

  const schemaSQL = await readFile('./Snowflake/schema.sql', 'utf-8');

  const statements = schemaSQL
    .split(';')  // Split by semicolon
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));  // Remove comments

  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await executeQuery(statement);
      console.log('✅ Success');
    } catch (error) {
      console.error(`❌ Failed:`, error);
    }
  }

  console.log('🎉 Schema setup completed!');
}

setupSchema();
```

**Usage**: Run `tsx Snowflake/setup_schema.ts` once to create tables.

---

### 📁 question.json - Question Database

**Structure:**
```json
[
  {
    "university": "General",
    "program": "All",
    "question_text": "Tell me about yourself.",
    "category": "personal",
    "difficulty_level": 1,
    "source": "Common Interview Questions"
  },
  {
    "university": "MIT",
    "program": "Computer Science",
    "question_text": "What specific research areas at MIT excite you?",
    "category": "academic",
    "difficulty_level": 3,
    "source": "MIT Interview Guide"
  }
]
```

**Categories:**
- `personal` - About you
- `academic` - School/studies
- `motivation` - Why this school
- `extracurricular` - Activities
- `career` - Future plans

**Difficulty Levels:**
- 1: Icebreaker (Tell me about yourself)
- 2-3: Moderate (Why this program?)
- 4-5: Deep (Ethical dilemma scenarios)

**How it's used:**
1. QuestionBank filters by university/program
2. Picks opening question (difficulty 1, personal/motivation)
3. Provides context to AI for follow-ups
4. Tracks used questions to avoid repeats

---

## 4. Core Concepts & Patterns

### Pattern 1: Async/Await
**What**: Handle asynchronous operations cleanly

**Example:**
```typescript
// Old way (callback hell)
readFile('file.txt', (err, data) => {
  if (err) {
    console.error(err);
  } else {
    processData(data, (err, result) => {
      if (err) {
        console.error(err);
      } else {
        saveResult(result, (err) => {
          // ...nested forever
        });
      }
    });
  }
});

// Modern way (async/await)
try {
  const data = await readFile('file.txt');
  const result = await processData(data);
  await saveResult(result);
} catch (error) {
  console.error(error);
}
```

**In this project:**
```typescript
// Generate voice and send
const audio = await generateVoiceAudio(text);
ws.send(JSON.stringify({ type: 'interviewer_audio', audio }));
```

### Pattern 2: Promises
**What**: Represents eventual completion/failure of async operation

**Example:**
```typescript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('Done!');
  }, 1000);
});

promise.then(result => {
  console.log(result);  // 'Done!' after 1 second
});

// Or with async/await
const result = await promise;
console.log(result);
```

**In this project:**
```typescript
export const textToSpeechAudio = async (text: string): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    // ...generate audio
    fileStream.on('finish', () => resolve(fileName));
    fileStream.on('error', reject);
  });
};
```

### Pattern 3: Event-Driven Architecture
**What**: Actions trigger events, listeners respond

**Example:**
```typescript
// Emit events
websocket.on('message', (data) => {
  console.log('Received:', data);
});

websocket.on('close', () => {
  console.log('Connection closed');
});

// Send message (triggers 'message' event on other side)
websocket.send('Hello!');
```

**In this project:**
```typescript
// WebSocket events
ws.onopen = () => { /* Connection opened */ };
ws.onmessage = (event) => { /* Message received */ };
ws.onclose = () => { /* Connection closed */ };
ws.onerror = (error) => { /* Error occurred */ };

// Speech recognition events
recognition.onstart = () => { /* Started listening */ };
recognition.onresult = (event) => { /* Got speech result */ };
recognition.onerror = (event) => { /* Recognition error */ };
recognition.onend = () => { /* Stopped listening */ };
```

### Pattern 4: Streaming
**What**: Process data as it arrives, not all at once

**Benefits:**
- Lower latency (start processing immediately)
- Lower memory (don't load everything)
- Better UX (progressive loading)

**Example:**
```typescript
// Without streaming (wait for complete response)
const response = await generateAIResponse(prompt);
console.log(response);  // All at once after 5 seconds

// With streaming (get chunks as generated)
for await (const chunk of generateStreamingResponse(prompt)) {
  console.log(chunk);  // "Hello" "world" "!" (as generated)
}
```

**In this project:**
```typescript
// AI text streaming
for await (const chunk of generator) {
  fullResponse += chunk;
  ws.send(JSON.stringify({
    type: 'interviewer_text_chunk',
    chunk: chunk  // Send immediately
  }));
}

// Audio streaming (to file)
const audioStream = await elevenlabs.textToSpeech.stream(...);
audioStream.pipe(fileStream);  // Stream to disk
```

### Pattern 5: Singleton
**What**: Only one instance of a class/object

**Why**: Share state, save resources (connections, caches, etc.)

**Example:**
```typescript
class Database {
  private static instance: Database;

  private constructor() {
    // Private: can't call `new Database()`
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}

// Usage
const db1 = Database.getInstance();
const db2 = Database.getInstance();
console.log(db1 === db2);  // true (same instance)
```

**In this project:**
```typescript
let connection: any = null;

export function getSnowflakeConnection() {
  if (!connection) {
    connection = snowflake.createConnection({...});
  }
  return connection;  // Always same connection
}
```

### Pattern 6: Separation of Concerns
**What**: Each module has one job

**Benefits:**
- Easier to understand
- Easier to test
- Easier to maintain

**In this project:**
```
server/
  ├── index.ts           → Start server
  ├── websocket.ts       → Handle WebSocket connections
  ├── aiInterviewer.ts   → Generate AI responses
  ├── voiceGenerator.ts  → Generate voice audio
  ├── questionBank.ts    → Manage questions
  └── interruptionEngine.ts → Detect interruptions
```

Each file has ONE responsibility. Clean!

---

## 5. Data Flow & Communication

### Flow 1: Starting an Interview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User enters "MIT", "Computer Science"
       │    Clicks "Start Interview"
       ▼
┌─────────────────────────────────────┐
│  router.push('/interview?          │
│    university=MIT&program=CS')     │
└──────┬──────────────────────────────┘
       │ 2. Browser navigates to interview page
       ▼
┌─────────────────────────────────────┐
│  Interview Page Loads               │
│  - Parse URL params                 │
│  - Create WebSocket connection      │
│  - Setup speech recognition         │
└──────┬──────────────────────────────┘
       │ 3. Send 'init' message
       │    { type: 'init', university: 'MIT', program: 'CS' }
       ▼
┌──────────────────────────────────────┐
│  Server (websocket.ts)               │
│  - Create session                    │
│  - Create QuestionBank               │
│  - Get opening question              │
└──────┬───────────────────────────────┘
       │ 4. Send greeting + question
       │    { type: 'interviewer_message', text: '...' }
       │    { type: 'start_listening' }
       ▼
┌──────────────────────────────────────┐
│  Browser                             │
│  - Display message                   │
│  - Start microphone                  │
│  - Wait for audio                    │
└──────┬───────────────────────────────┘
       │ 5. Generate voice (async)
       │    textToSpeechAudio(greeting)
       ▼
┌──────────────────────────────────────┐
│  ElevenLabs API                      │
│  - Generate MP3 file                 │
│  - Return filename                   │
└──────┬───────────────────────────────┘
       │ 6. Read file, encode base64
       │    { type: 'interviewer_audio', audio: '...' }
       ▼
┌──────────────────────────────────────┐
│  Browser                             │
│  - Decode base64                     │
│  - Play audio                        │
└──────────────────────────────────────┘
```

### Flow 2: User Responds

```
┌─────────────┐
│   Browser   │
│  (Listening)│
└──────┬──────┘
       │ 1. User speaks: "I love coding"
       │    Speech Recognition detects
       ▼
┌─────────────────────────────────────┐
│  recognition.onresult               │
│  - Get interim results              │
│  - Send to server continuously      │
│    { type: 'speech_interim', text: 'I lo...' }
│    { type: 'speech_interim', text: 'I love cod...' }
└──────┬──────────────────────────────┘
       │ 2. Server checks for interruption
       │    analyzeForInterruption()
       ▼
┌──────────────────────────────────────┐
│  interruptionEngine.ts               │
│  - Check word count (< 150)          │
│  - Check vagueness (OK)              │
│  - Check pause (no pause)            │
│  → No interruption needed            │
└──────┬───────────────────────────────┘
       │ 3. User finishes: "I love coding"
       │    isFinal = true
       ▼
┌──────────────────────────────────────┐
│  Browser                             │
│  - Send final transcript             │
│    { type: 'text_input', text: 'I love coding' }
└──────┬───────────────────────────────┘
       │ 4. Server processes
       ▼
┌──────────────────────────────────────┐
│  websocket.ts                        │
│  - Add to conversation history       │
│  - Generate AI response              │
└──────┬───────────────────────────────┘
       │ 5. Call AI
       ▼
┌──────────────────────────────────────┐
│  aiInterviewer.ts                    │
│  - Build prompt with context         │
│  - Call Gemini API (streaming)       │
└──────┬───────────────────────────────┘
       │ 6. Stream chunks
       │    "That's", " great", "! What", " languages", "..."
       ▼
┌──────────────────────────────────────┐
│  websocket.ts                        │
│  - Send each chunk immediately       │
│    { type: 'interviewer_text_chunk', chunk: "That's" }
│    { type: 'interviewer_text_chunk', chunk: " great" }
└──────┬───────────────────────────────┘
       │ 7. Browser displays chunks
       ▼
┌──────────────────────────────────────┐
│  Browser UI                          │
│  "That's"                            │
│  "That's great"                      │
│  "That's great! What"                │
│  ... (updates in real-time)          │
└──────┬───────────────────────────────┘
       │ 8. Complete response ready
       │    { type: 'interviewer_message', text: '...' }
       ▼
┌──────────────────────────────────────┐
│  Server generates voice              │
│  - Call generateVoiceAudio()         │
│  - Send audio                        │
│    { type: 'interviewer_audio', audio: '...' }
└──────┬───────────────────────────────┘
       │ 9. Play audio
       ▼
┌──────────────────────────────────────┐
│  Browser plays audio                 │
│  - Keep microphone listening         │
│    (for potential interruptions)     │
└──────────────────────────────────────┘
```

### Flow 3: Interruption Detection

```
┌─────────────┐
│   Browser   │
│  (AI talking)
└──────┬──────┘
       │ User starts speaking while AI talks
       │ "um... wait... I mean... you know... stuff"
       ▼
┌─────────────────────────────────────┐
│  Speech Recognition                  │
│  - Sends interim results             │
│    { type: 'speech_interim', text: 'um wait' }
│    { type: 'speech_interim', text: 'um wait I mean' }
│    { type: 'speech_interim', text: 'um wait I mean you know stuff' }
└──────┬──────────────────────────────┘
       │ Each update triggers analysis
       ▼
┌──────────────────────────────────────┐
│  interruptionEngine.ts               │
│  analyzeForInterruption()            │
│  - Word count: 6 (> 5, continue)     │
│  - Vague indicators: "um", "I mean", │
│    "you know", "stuff" = 4 vague words│
│  - 4 > 3 threshold → VAGUE!          │
│  → shouldInterrupt = true            │
└──────┬───────────────────────────────┘
       │ Generate interruption
       ▼
┌──────────────────────────────────────┐
│  Gemini API (quick prompt)           │
│  "Student gave vague answer. Ask for │
│   specific example."                 │
│  → Response: "Can you give me a      │
│     specific example?"               │
└──────┬───────────────────────────────┘
       │ Send interruption
       ▼
┌──────────────────────────────────────┐
│  Server → Browser                    │
│  { type: 'interrupt', reason: 'vague' }
│  { type: 'interviewer_message',      │
│    text: 'Can you give me a specific │
│           example?',                 │
│    isInterruption: true }            │
└──────┬───────────────────────────────┘
       │ Handle interruption
       ▼
┌──────────────────────────────────────┐
│  Browser                             │
│  - Stop current AI audio playback    │
│    currentAudioSourceRef.current.stop()
│  - Clear user's transcript           │
│  - Display interruption message      │
│  - Play interruption audio           │
└──────────────────────────────────────┘
```

### Flow 4: Ending Session

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ User clicks "End Interview"
       ▼
┌─────────────────────────────────────┐
│  endSession()                        │
│  - Stop speech recognition           │
│  - Send end message                  │
│    { type: 'end_session' }           │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  websocket.ts                        │
│  - Get session from Map              │
│  - Extract conversation history      │
└──────┬───────────────────────────────┘
       │ Save to database
       ▼
┌──────────────────────────────────────┐
│  saveCompleteInterviewSession()      │
│  1. Insert session record            │
│     INSERT INTO interview_sessions   │
│  2. Insert all messages              │
│     INSERT INTO conversation_messages│
│  3. Extract and insert Q&A pairs     │
│     INSERT INTO qa_pairs             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Snowflake Database                  │
│  [Session data now stored]           │
└──────┬───────────────────────────────┘
       │ Confirm saved
       ▼
┌──────────────────────────────────────┐
│  Server                              │
│  - Delete session from memory        │
│    sessions.delete(sessionId)        │
│  - Send confirmation                 │
│    { type: 'session_ended' }         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Browser                             │
│  - Show "Session ended" status       │
│  - Disconnect WebSocket              │
└──────────────────────────────────────┘
```

---

## 6. Key Learning Takeaways

### 1. Real-Time Communication
- **HTTP**: Request-response. Client asks, server answers, done.
- **WebSocket**: Persistent connection. Both can send anytime.
- **Use WebSocket when**: Chat, notifications, live updates, games

### 2. Streaming vs Batch
- **Batch**: Get everything at once (simple, but slower UX)
- **Streaming**: Get pieces as ready (complex, but better UX)
- **Use Streaming when**: Large responses, live data, progressive loading

### 3. Async Programming
- **Callback**: Old, leads to callback hell
- **Promise**: Better, but still verbose
- **Async/Await**: Modern, clean, looks like sync code
- **Use Async/Await** for cleaner code

### 4. Event-Driven vs Polling
- **Polling**: Check for updates every X seconds (wasteful)
- **Event-Driven**: Get notified when something happens (efficient)
- **Use Events** for real-time apps

### 5. Client-Side vs Server-Side
- **Client-Side**: Runs in browser (React, speech recognition)
  - Pros: Instant, no server load, works offline
  - Cons: User can see/modify code, limited by browser
- **Server-Side**: Runs on your server (Node.js, AI, database)
  - Pros: Private, powerful, controlled
  - Cons: Network latency, server costs

**Best Practice**: Do what makes sense where.
- Voice input: Client (low latency, privacy)
- AI generation: Server (requires API keys, powerful)
- UI state: Client (instant updates)
- Data storage: Server (persistence, security)

### 6. State Management
- **Component State** (`useState`): Local to one component
- **Refs** (`useRef`): Persistent across renders, doesn't trigger re-render
- **Props**: Pass data down from parent to child
- **Context**: Share data across many components (not used in this project, but useful)

**Rule**: Use simplest solution that works.

### 7. TypeScript Benefits
1. **Catch errors early**: Before runtime
2. **Better autocomplete**: IDE knows what's available
3. **Documentation**: Types explain what data looks like
4. **Refactoring**: Change types, find all affected code

### 8. Database Design
- **Normalize**: Split data into logical tables
- **Index**: Speed up common queries
- **Foreign Keys**: Enforce relationships
- **Transactions**: Multiple operations succeed/fail together (not shown, but important)

### 9. API Design
- **RESTful**: HTTP methods (GET, POST, PUT, DELETE) for CRUD
- **WebSocket**: Custom messages with `type` field
- **GraphQL**: Query exactly what you need (not used here)

### 10. Error Handling
```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error('Failed:', error);
  // Graceful degradation or user notification
}
```

**Always handle errors!** Especially for:
- Network requests
- File operations
- Database queries
- User input

---

## 7. Further Learning Resources

### Topics to Explore Next

1. **Authentication & Authorization**
   - User login/signup
   - JWT tokens
   - Session management
   - OAuth (Google, GitHub)

2. **Testing**
   - Unit tests (individual functions)
   - Integration tests (multiple components)
   - E2E tests (full user flows)
   - Frameworks: Jest, Vitest, Playwright

3. **Performance Optimization**
   - Code splitting
   - Lazy loading
   - Caching
   - CDN
   - Database query optimization

4. **Deployment**
   - Vercel (easiest for Next.js)
   - AWS (most flexible)
   - Docker containers
   - CI/CD pipelines

5. **Security**
   - XSS prevention
   - CSRF protection
   - SQL injection prevention (already doing this!)
   - Rate limiting
   - Input validation

### Recommended Reading

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **WebSocket Guide**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## 8. Common Debugging Strategies

### Problem: "WebSocket won't connect"
**Check:**
1. Is server running? (`npm run dev`)
2. Correct URL? (`ws://localhost:3000/ws/interview`)
3. Browser console errors?
4. Server console logs?

### Problem: "Voice not working"
**Check:**
1. Browser supports webkitSpeechRecognition? (Chrome/Edge only)
2. Microphone permissions granted?
3. HTTPS required for production (HTTP ok for localhost)
4. Check browser console for recognition errors

### Problem: "AI not responding"
**Check:**
1. Gemini API key valid? (check .env)
2. Network request successful? (check server logs)
3. WebSocket messages being sent? (browser console)
4. Error in AI generation? (server logs)

### Problem: "Audio not playing"
**Check:**
1. ElevenLabs API key valid?
2. Audio file generated? (check root directory for .mp3 files)
3. Base64 encoding correct?
4. Browser audio context initialized?

### General Debugging Tips

1. **Console Logs**: Add `console.log()` everywhere
2. **Debugger**: Use `debugger;` statement or breakpoints
3. **Network Tab**: Check browser DevTools → Network
4. **React DevTools**: Install extension to inspect state
5. **Server Logs**: Watch terminal output
6. **Error Messages**: Read them carefully! They usually tell you exactly what's wrong

---

## 9. Project Structure Best Practices

### Folder Organization
```
project/
├── app/              → Frontend (Next.js pages)
├── server/           → Backend logic
├── Elevenlabs/       → External API wrappers
├── GeminiAPI/        → External API wrappers
├── Snowflake/        → Database logic
├── public/           → Static assets
└── node_modules/     → Dependencies (never edit)
```

**Rule**: Related code together, unrelated code separate.

### File Naming
- **Components**: PascalCase (InterviewPage.tsx)
- **Utilities**: camelCase (voiceGenerator.ts)
- **Constants**: UPPER_SNAKE_CASE (API_KEY)
- **Folders**: lowercase (server/, app/)

### Code Organization
```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types/Interfaces
interface Props {
  name: string;
}

// 3. Constants
const MAX_RETRIES = 3;

// 4. Component/Function
export function MyComponent({ name }: Props) {
  // 4a. Hooks
  const [count, setCount] = useState(0);

  // 4b. Event handlers
  const handleClick = () => {
    setCount(count + 1);
  };

  // 4c. Return/Render
  return <div onClick={handleClick}>{name}: {count}</div>;
}
```

---

## 10. Final Thoughts

This project demonstrates:
✅ Modern web development (Next.js, TypeScript, React)
✅ Real-time communication (WebSocket)
✅ AI integration (Gemini, ElevenLabs)
✅ Database operations (Snowflake)
✅ Browser APIs (Web Speech, Web Audio)
✅ Async programming (Promises, Streaming)
✅ State management (React hooks, refs)
✅ Code organization (separation of concerns)

**You now understand:**
- How frontend and backend communicate
- How real-time features work
- How AI APIs are integrated
- How voice I/O works in browsers
- How to structure a full-stack TypeScript project

**Next steps:**
1. Build analytics dashboard
2. Add user authentication
3. Improve interruption logic
4. Deploy to production
5. Add more features!

---

**Remember**: The best way to learn is to build, break, and fix things. Don't be afraid to experiment!

**Questions to ask yourself:**
- What happens if I change this?
- Can I add a new feature?
- What breaks if I remove this?
- How would I test this?

Happy coding! 🚀
