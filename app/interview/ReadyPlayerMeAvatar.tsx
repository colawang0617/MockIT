'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

interface AvatarModelProps {
  avatarUrl: string;
  audioAnalyser: AnalyserNode | null;
}

export interface AvatarControls {
  playAudio: (audioUrl: string) => Promise<void>;
  stopAudio: () => void;
}

interface ReadyPlayerMeAvatarProps {
  onAvatarReady?: (controls: AvatarControls) => void;
  avatarUrl?: string;
}

// Enhanced viseme detection based on frequency analysis
class LipSyncAnalyzer {
  private dataArray: Uint8Array<ArrayBuffer>;
  private previousVolume: number = 0;
  private smoothingFactor: number = 0.7;

  constructor(private analyser: AnalyserNode) {
    // Ensure fftSize is set before creating the data array
    if (!analyser.fftSize) {
      analyser.fftSize = 512;
    }
    this.dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }

  analyze(): { viseme: string; weight: number } {
    // Recreate array if size changed
    if (this.dataArray.length !== this.analyser.frequencyBinCount) {
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }
    this.analyser.getByteFrequencyData(this.dataArray);

    const volume = this.getVolume();
    const dominantFreq = this.getDominantFrequency();
    const spectralCentroid = this.getSpectralCentroid();

    // Smooth volume changes
    const smoothedVolume = this.previousVolume * this.smoothingFactor + 
                          volume * (1 - this.smoothingFactor);
    this.previousVolume = smoothedVolume;

    const viseme = this.determineViseme(smoothedVolume, dominantFreq, spectralCentroid);
    const weight = Math.min(smoothedVolume / 100, 1);

    return { viseme, weight };
  }

  private getVolume(): number {
    const sum = this.dataArray.reduce((a, b) => a + b, 0);
    return sum / this.dataArray.length;
  }

  private getDominantFrequency(): number {
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }
    
    const sampleRate = this.analyser.context.sampleRate;
    const nyquist = sampleRate / 2;
    return (maxIndex / this.dataArray.length) * nyquist;
  }

  private getSpectralCentroid(): number {
    let weightedSum = 0;
    let sum = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      weightedSum += i * this.dataArray[i];
      sum += this.dataArray[i];
    }
    
    return sum === 0 ? 0 : weightedSum / sum;
  }

  private determineViseme(volume: number, dominantFreq: number, spectralCentroid: number): string {
    if (volume < 8) return 'sil';

    // Low frequencies (vowels)
    if (dominantFreq < 300) {
      if (spectralCentroid < 50) return 'U';
      if (spectralCentroid < 100) return 'O';
      return 'aa';
    }
    
    // Mid frequencies
    if (dominantFreq < 1000) {
      if (volume > 40) return 'aa';
      return spectralCentroid > 100 ? 'I' : 'E';
    }
    
    // High frequencies (consonants)
    if (dominantFreq < 3000) {
      if (volume > 50) return 'SS';
      if (volume > 30) return 'CH';
      return 'TH';
    }
    
    if (volume > 35) return 'FF';
    return 'PP';
  }
}

function AvatarModel({ avatarUrl, audioAnalyser }: AvatarModelProps) {
  const gltf = useLoader(GLTFLoader, avatarUrl) as GLTF;
  const modelRef = useRef<THREE.Group>(null);
  const morphTargetMeshes = useRef<THREE.Mesh[]>([]);
  const lipSyncAnalyzer = useRef<LipSyncAnalyzer | null>(null);
  const targetWeights = useRef<Map<string, number>>(new Map());
  const currentWeights = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (gltf) {
      morphTargetMeshes.current = [];
      gltf.scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.morphTargetDictionary &&
          child.morphTargetInfluences
        ) {
          morphTargetMeshes.current.push(child);
          console.log('Found morph targets:', Object.keys(child.morphTargetDictionary));
        }
      });
    }
  }, [gltf]);

  useEffect(() => {
    if (audioAnalyser && audioAnalyser.frequencyBinCount > 0) {
      lipSyncAnalyzer.current = new LipSyncAnalyzer(audioAnalyser);
    }
  }, [audioAnalyser]);

  useFrame(() => {
    if (!audioAnalyser || !lipSyncAnalyzer.current || morphTargetMeshes.current.length === 0) {
      return;
    }

    const { viseme, weight } = lipSyncAnalyzer.current.analyze();

    // Map visemes to Ready Player Me morph targets
    const visemeToMorphTargets: { [key: string]: { [key: string]: number } } = {
      'sil': {},
      'aa': { 'mouthOpen': 1.0, 'jawOpen': 0.8, 'viseme_aa': 1.0 },
      'E': { 'mouthSmile': 0.8, 'viseme_E': 1.0 },
      'I': { 'mouthSmile': 0.7, 'mouthDimple': 0.4, 'viseme_I': 1.0 },
      'O': { 'mouthFunnel': 0.9, 'viseme_O': 1.0 },
      'U': { 'mouthPucker': 0.9, 'viseme_U': 1.0 },
      'PP': { 'mouthPucker': 0.7, 'mouthPress': 0.6, 'viseme_PP': 1.0 },
      'FF': { 'mouthRollLower': 0.7, 'mouthRollUpper': 0.5, 'viseme_FF': 1.0 },
      'TH': { 'mouthOpen': 0.4, 'mouthSmile': 0.4, 'viseme_TH': 1.0 },
      'DD': { 'jawOpen': 0.5, 'mouthSmile': 0.4, 'viseme_DD': 1.0 },
      'kk': { 'jawOpen': 0.6, 'viseme_kk': 1.0 },
      'CH': { 'mouthFunnel': 0.6, 'mouthPucker': 0.5, 'viseme_CH': 1.0 },
      'SS': { 'mouthSmile': 0.6, 'mouthPress': 0.4, 'viseme_SS': 1.0 },
      'nn': { 'mouthClose': 0.5, 'viseme_nn': 1.0 },
      'RR': { 'mouthShrugUpper': 0.5, 'viseme_RR': 1.0 }
    };

    // Set target weights based on current viseme
    targetWeights.current.clear();
    const morphTargets = visemeToMorphTargets[viseme] || {};
    Object.entries(morphTargets).forEach(([target, value]) => {
      targetWeights.current.set(target, value * weight);
    });

    // Apply smooth interpolation to morph targets
    const lerpFactor = 0.2;

    morphTargetMeshes.current.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;

      if (!dict || !influences) return;

      Object.keys(dict).forEach((morphName) => {
        const index = dict[morphName];
        const targetWeight = targetWeights.current.get(morphName) || 0;
        const currentWeight = currentWeights.current.get(morphName) || 0;

        const newWeight = THREE.MathUtils.lerp(currentWeight, targetWeight, lerpFactor);
        currentWeights.current.set(morphName, newWeight);
        influences[index] = newWeight;
      });
    });
  });

  return (
    <primitive 
      ref={modelRef} 
      object={gltf.scene} 
      position={[0, -6, 0]} 
      scale={3.5}
    />
  );
}

export default function ReadyPlayerMeAvatar({ 
  onAvatarReady,
  avatarUrl = 'https://models.readyplayer.me/68e14b123448aa53be3e5c57.glb'
}: ReadyPlayerMeAvatarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const [currentViseme, setCurrentViseme] = useState('sil');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (onAvatarReady) {
      onAvatarReady({ playAudio, stopAudio });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const monitorAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedVolume = average / 255;
    setVolume(normalizedVolume);

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(monitorAudio);
    }
  };

  const playAudio = async (audioUrl: string): Promise<void> => {
    try {
      // Stop any currently playing audio
      stopAudio();

      // Create audio context if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        sourceRef.current = null; // Reset source when context is recreated
      }

      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Create analyser
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Always create a new source for the new audio element
      const source = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current = source;
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);

      await audio.play();
      setIsPlaying(true);
      monitorAudio();

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          setIsPlaying(false);
          setVolume(0);
          setCurrentViseme('sil');
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          resolve();
        };

        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          setIsPlaying(false);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      throw error;
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setVolume(0);
    setCurrentViseme('sil');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' ,backgroundImage: 'url("/backgrounds/background2.jpg")', // path to background image
      backgroundSize: 'cover',
      backgroundPosition: 'center',}}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 35 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <pointLight position={[0, 2, 1]} intensity={0.5} />
        
        <AvatarModel 
          avatarUrl={avatarUrl}
          audioAnalyser={analyserRef.current}
        />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={1.5}
          maxDistance={4}
          target={[0, 0, 0]}
        />
      </Canvas>
      
      {/* Enhanced volume indicator with viseme display */}
      {isPlaying && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black bg-opacity-60 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex justify-between items-center text-white text-sm mb-2">
              <span className="font-semibold">Audio Level</span>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-purple-500 bg-opacity-30 px-2 py-1 rounded">
                  Viseme: {currentViseme}
                </span>
                <span className="font-mono">{(volume * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-75 shadow-lg"
                style={{ 
                  width: `${volume * 100}%`,
                  boxShadow: volume > 0.3 ? '0 0 10px rgba(139, 92, 246, 0.5)' : 'none'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
