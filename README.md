# 🎤 Nopiro - AI-Powered Mock Interview System

> **Transform your interview preparation with cutting-edge AI technology**

Nopiro is a comprehensive AI-powered mock interview platform that simulates real college admissions interviews using advanced voice recognition, natural language processing, and 3D avatar technology. Practice with an intelligent interviewer that adapts to your responses and provides realistic interview experiences.

## ✨ Features

### 🎯 Core Interview Features
- **Real-time Voice Conversations**: Natural speech-to-speech interaction with AI interviewer
- **3D Avatar with Lip Sync**: Interactive Ready Player Me avatar that visually responds to audio
- **Smart Interruption Detection**: AI intelligently interrupts when you're rambling or need redirection
- **Multiple Interview Formats**: 2-minute quick practice, 10-minute standard, or 30-minute comprehensive sessions
- **University-Specific Questions**: Tailored questions for specific institutions (MIT, Stanford, etc.)
- **Program-Specific Content**: Customized questions based on your field of study

### 🎨 User Experience
- **Beautiful Modern UI**: Glassmorphism design with animated backgrounds
- **User Camera Integration**: See yourself during the interview for confidence building
- **Preparation Page**: Pre-interview instructions with countdown timer
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Status Updates**: Live feedback on interview progress

### 🔧 Technical Features
- **WebSocket Real-time Communication**: Low-latency bidirectional messaging
- **Streaming AI Responses**: AI responses appear word-by-word for natural flow
- **Audio File Management**: Automatic cleanup of temporary audio files
- **Database Integration**: Session storage and analytics with Snowflake
- **Educational Context System**: AI-enhanced responses with university-specific insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Chrome/Edge browser (for Web Speech API)
- API keys for Gemini AI and ElevenLabs

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Nopiro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # AI APIs
   GEMINI_API_KEY=your_gemini_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # Database (Optional - for analytics)
   SNOWFLAKE_ACCOUNT=your_snowflake_account
   SNOWFLAKE_USERNAME=your_snowflake_username
   SNOWFLAKE_PASSWORD=your_snowflake_password
   ```

4. **Set up the database (Optional)**
   ```bash
   npx tsx Snowflake/setup_users_table.ts
   npx tsx Snowflake/setup_schema.ts
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 How to Use

### 1. **Login/Signup** (Optional)
- Create an account or sign in with email/password
- Account data is stored locally for development

### 2. **Setup Your Interview**
- Select your target university (MIT, Stanford, General, etc.)
- Choose your program (Computer Science, Business, etc.)
- Pick interview duration:
  - **2 minutes**: Quick practice (1-2 questions)
  - **10 minutes**: Standard interview (3-5 questions)
  - **30 minutes**: Comprehensive session (8-10 questions)

### 3. **Prepare for Interview**
- Review pre-interview instructions
- Ensure microphone and camera permissions
- Click "I'm Ready" for 3-second countdown

### 4. **Conduct Interview**
- AI interviewer will ask questions and listen to your responses
- Speak naturally - the system handles interruptions and follow-ups
- Watch your 3D avatar react to the conversation
- See yourself in the camera view for confidence building

### 5. **Session Completion**
- Interview automatically ends based on time/duration limits
- Session data is saved to database for review
- Receive completion confirmation

