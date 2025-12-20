'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type TranscriptionStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'error';

interface UseSonioxTranscriptionOptions {
  audioUrl: string;
  lectureId?: string;
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
  pollingInterval?: number;
  maxPollingTime?: number; // in milliseconds
}

interface UseSonioxTranscriptionReturn {
  status: TranscriptionStatus;
  transcript: string | null;
  error: string | null;
  isPolling: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

export function useSonioxTranscription({
  audioUrl,
  lectureId,
  onComplete,
  onError,
  pollingInterval = 2000,
  maxPollingTime = 30 * 60 * 1000, // 30 minutes default
}: UseSonioxTranscriptionOptions): UseSonioxTranscriptionReturn {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    pollingStartTimeRef.current = null;
  }, []);

  // Check status with Soniox
  const checkStatus = useCallback(async (jobId: string) => {
    // Check timeout
    if (pollingStartTimeRef.current) {
      const elapsed = Date.now() - pollingStartTimeRef.current;
      if (elapsed > maxPollingTime) {
        stop();
        if (isMountedRef.current) {
          setStatus('error');
          setError('Transcription timed out after 30 minutes');
          onError?.('Transcription timed out');
        }
        return;
      }
    }

    try {
      const response = await fetch(`/api/soniox/status?jobId=${encodeURIComponent(jobId)}`);
      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.status === 'completed') {
        // Stop polling
        stop();
        
        // Save transcript
        setTranscript(data.text);
        setStatus('completed');
        
        // Callback
        onComplete?.(data.text);
      } else if (data.status === 'error') {
        // Stop polling
        stop();
        
        // Save error
        setError(data.error || 'Transcription failed');
        setStatus('error');
        
        // Callback
        onError?.(data.error || 'Transcription failed');
      }
      // If still processing, continue polling (interval handles this)
    } catch (err) {
      console.error('Error checking status:', err);
      // Don't stop polling on network errors - let it retry
    }
  }, [stop, maxPollingTime, onComplete, onError]);

  // Start polling for a job
  const startPolling = useCallback((jobId: string) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    jobIdRef.current = jobId;
    pollingStartTimeRef.current = Date.now();

    // Start polling every N seconds
    intervalRef.current = setInterval(() => {
      checkStatus(jobId);
    }, pollingInterval);

    // Also check immediately
    checkStatus(jobId);
  }, [checkStatus, pollingInterval]);

  // Start transcription
  const start = useCallback(async () => {
    if (!audioUrl) {
      const errorMsg = 'No audio URL provided';
      setError(errorMsg);
      setStatus('error');
      onError?.(errorMsg);
      return;
    }

    // Reset state
    setStatus('starting');
    setError(null);
    setTranscript(null);

    try {
      // Step 1: Call /start route
      const response = await fetch('/api/soniox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl, lectureId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start transcription');
      }

      const data = await response.json();
      const jobId = data.job_id;

      if (!jobId) {
        throw new Error('No job_id returned from server');
      }

      // Step 2: Start polling for status
      if (isMountedRef.current) {
        setStatus('processing');
        startPolling(jobId);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start transcription';
        setError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);
      }
    }
  }, [audioUrl, lectureId, startPolling, onError]);

  return {
    status,
    transcript,
    error,
    isPolling,
    start,
    stop,
  };
}

export default useSonioxTranscription;
