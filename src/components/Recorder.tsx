'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Pause, Play, Square, Pin, Clock } from 'lucide-react';
import { Keypoint } from '@/lib/types';
import KeypointInput from './KeypointInput';

interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob, keypoints: Keypoint[]) => void;
  isUploading?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function Recorder({ onRecordingComplete, isUploading = false }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [showKeypointModal, setShowKeypointModal] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        onRecordingComplete(audioBlob, keypoints);
        
        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setPermissionDenied(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleAddKeypoint = useCallback(() => {
    setCurrentTimestamp(elapsedTime);
    setShowKeypointModal(true);
  }, [elapsedTime]);

  const handleKeypointSubmit = (note: string) => {
    setKeypoints((prev) => [...prev, { timestamp: currentTimestamp, note }]);
    setShowKeypointModal(false);
  };

  const handleKeypointCancel = () => {
    setShowKeypointModal(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Timer display */}
      <div className="mb-8 text-center">
        <div className="text-6xl font-mono font-light text-white tracking-tight mb-2">
          {formatTime(elapsedTime)}
        </div>
        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
            {isPaused ? 'Paused' : 'Recording'}
          </div>
        )}
      </div>

      {/* Main record button */}
      <div className="relative mb-8">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isUploading}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 flex items-center justify-center shadow-2xl shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Mic className="w-10 h-10 text-white" />
          </button>
        ) : (
          <div className="flex items-center gap-4">
            {/* Pause/Resume button */}
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-all active:scale-95"
            >
              {isPaused ? (
                <Play className="w-7 h-7 text-white ml-1" />
              ) : (
                <Pause className="w-7 h-7 text-white" />
              )}
            </button>

            {/* Recording indicator */}
            <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/30 ${!isPaused ? 'recording-pulse' : ''}`}>
              <Mic className="w-10 h-10 text-white" />
            </div>

            {/* Stop button */}
            <button
              onClick={stopRecording}
              disabled={isUploading}
              className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          </div>
        )}
      </div>

      {/* Permission denied message */}
      {permissionDenied && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center max-w-sm">
          Microphone access denied. Please allow microphone access in your browser settings.
        </div>
      )}

      {/* Add keypoint button - only visible when recording */}
      {isRecording && (
        <button
          onClick={handleAddKeypoint}
          disabled={isPaused}
          className="flex items-center gap-2 px-5 py-3 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-medium rounded-xl transition-all active:scale-95 disabled:opacity-50 mb-8"
        >
          <Pin className="w-5 h-5" />
          Add Key Point
        </button>
      )}

      {/* Keypoints list */}
      {keypoints.length > 0 && (
        <div className="w-full max-w-sm">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Key Points ({keypoints.length})
          </h3>
          <div className="space-y-2">
            {keypoints.map((kp, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl"
              >
                <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-1 rounded">
                  {formatTime(kp.timestamp)}
                </span>
                <span className="text-sm text-zinc-300 truncate">{kp.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keypoint input modal */}
      {showKeypointModal && (
        <KeypointInput
          timestamp={currentTimestamp}
          onSubmit={handleKeypointSubmit}
          onCancel={handleKeypointCancel}
        />
      )}
    </div>
  );
}


