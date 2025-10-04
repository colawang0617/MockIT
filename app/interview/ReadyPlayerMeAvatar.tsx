'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

interface AvatarModelProps {
  avatarUrl: string;
  currentViseme: string;
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

function AvatarModel({ avatarUrl, currentViseme, audioAnalyser }: AvatarModelProps) {
  const gltf = useLoader(GLTFLoader, avatarUrl) as GLTF;
  const modelRef = useRef<THREE.Group>(null);
  const morphTargetMeshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (gltf) {
      // Find all meshes with morph targets
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

  useFrame(() => {
    if (!audioAnalyser || morphTargetMeshes.current.length === 0) return;

    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioAnalyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedVolume = average / 255;

    // Apply viseme based on volume
    morphTargetMeshes.current.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;

      if (!dict || !influences) return;

      // Reset all visemes
      Object.keys(dict).forEach((key) => {
        if (key.startsWith('viseme_')) {
          influences[dict[key]] = 0;
        }
      });

      // Apply current viseme based on volume
      let visemeKey = 'viseme_sil'; // Default closed mouth

      if (normalizedVolume > 0.5) {
        visemeKey = 'viseme_aa'; // Wide open
      } else if (normalizedVolume > 0.35) {
        visemeKey = 'viseme_O'; // Rounded
      } else if (normalizedVolume > 0.2) {
        visemeKey = 'viseme_E'; // Smile
      } else if (normalizedVolume > 0.1) {
        visemeKey = 'viseme_I'; // Slightly open
      }

      if (dict[visemeKey] !== undefined) {
        influences[dict[visemeKey]] = Math.min(normalizedVolume * 1.5, 1.0);
      }
    });
  });

  return (
    <primitive 
      ref={modelRef} 
      object={gltf.scene} 
      position={[0, -1.5, 0]} 
      scale={1.8}
    />
  );
}

export default function ReadyPlayerMeAvatar({ 
  onAvatarReady,
  avatarUrl = 'https://models.readyplayer.me/68e14b123448aa53be3e5c57.glb'
}: ReadyPlayerMeAvatarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const [currentViseme, setCurrentViseme] = useState('neutral');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Expose playAudio function to parent
    if (onAvatarReady) {
      onAvatarReady({ playAudio, stopAudio });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const monitorVolume = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedVolume = average / 255;
    setVolume(normalizedVolume);

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(monitorVolume);
    }
  };

  const playAudio = async (audioUrl: string): Promise<void> => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);

      await audio.play();
      setIsPlaying(true);
      monitorVolume();

      audio.onended = () => {
        setIsPlaying(false);
        setVolume(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setVolume(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        
        <AvatarModel 
          avatarUrl={avatarUrl}
          currentViseme={currentViseme}
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
      
      {/* Volume indicator overlay */}
      {isPlaying && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black bg-opacity-50 rounded-lg p-3">
            <div className="flex justify-between text-white text-sm mb-2">
              <span>Audio Level</span>
              <span>{(volume * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-75"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}