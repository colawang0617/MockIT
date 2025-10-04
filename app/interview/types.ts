export interface AvatarControls {
    playAudio: (audioUrl: string) => Promise<void>;
    stopAudio: () => void;
  }
  
  export interface InterviewMessage {
    role: 'user' | 'assistant';
    content: string;
    audioUrl?: string;
  }