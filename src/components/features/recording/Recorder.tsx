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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const getSupportedMimeType = (): string => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } 
      });
      
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        onRecordingComplete(audioBlob, keypoints);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setPermissionDenied(false);
      timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
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

  return (
    <div className="flex flex-col items-center py-12">
      {/* Timer */}
      <div className="mb-10 text-center">
        <div className="text-7xl font-mono font-light text-[var(--text-primary)] tracking-tight mb-3">
          {formatTime(elapsedTime)}
        </div>
        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-[var(--warning)]' : 'bg-[var(--error)] animate-recording'}`} />
            {isPaused ? 'Paused' : 'Recording'}
          </div>
        )}
        {!isRecording && elapsedTime === 0 && (
          <p className="text-sm text-[var(--text-muted)]">Click to start recording</p>
        )}
      </div>

      {/* Controls */}
      <div className="mb-10">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isUploading}
            className="w-28 h-28 rounded-full bg-[var(--error)] hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 transition-fast disabled:opacity-50"
          >
            <Mic className="w-12 h-12 text-white" />
          </button>
        ) : (
          <div className="flex items-center gap-6">
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center transition-fast"
            >
              {isPaused ? <Play className="w-6 h-6 text-[var(--text-primary)] ml-0.5" /> : <Pause className="w-6 h-6 text-[var(--text-primary)]" />}
            </button>

            <div className={`w-28 h-28 rounded-full bg-[var(--error)] flex items-center justify-center shadow-lg shadow-red-500/20 ${!isPaused ? 'animate-recording' : ''}`}>
              <Mic className="w-12 h-12 text-white" />
            </div>

            <button
              onClick={stopRecording}
              disabled={isUploading}
              className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center transition-fast disabled:opacity-50"
            >
              <Square className="w-5 h-5 text-[var(--text-primary)] fill-current" />
            </button>
          </div>
        )}
      </div>

      {/* Permission error */}
      {permissionDenied && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-sm text-center max-w-md">
          Microphone access denied. Please allow microphone access in your browser settings.
        </div>
      )}

      {/* Add keypoint */}
      {isRecording && (
        <button
          onClick={handleAddKeypoint}
          disabled={isPaused}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent-light)] font-medium rounded-lg transition-fast disabled:opacity-50 mb-10"
        >
          <Pin className="w-4 h-4" />
          Add Key Point
        </button>
      )}

      {/* Keypoints */}
      {keypoints.length > 0 && (
        <div className="w-full max-w-md">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Key Points ({keypoints.length})
          </h3>
          <div className="space-y-2">
            {keypoints.map((kp, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
                <span className="text-xs font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded">
                  {formatTime(kp.timestamp)}
                </span>
                <span className="text-sm text-[var(--text-secondary)] truncate">{kp.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showKeypointModal && (
        <KeypointInput
          timestamp={currentTimestamp}
          onSubmit={handleKeypointSubmit}
          onCancel={() => setShowKeypointModal(false)}
        />
      )}
    </div>
  );
}
