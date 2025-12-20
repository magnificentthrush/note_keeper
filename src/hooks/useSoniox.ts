'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type SonioxStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'error';

interface UseSonioxOptions {
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
  pollingInterval?: number;
}

interface UseSonioxReturn {
  status: SonioxStatus;
  transcript: string | null;
  error: string | null;
  isPolling: boolean;
  startTranscription: (audioUrl: string, lectureId?: string) => Promise<void>;
  stopPolling: () => void;
}

export function useSoniox(options: UseSonioxOptions = {}): UseSonioxReturn {
  const { 
    onComplete, 
    onError, 
    pollingInterval = 2000 
  } = options;

  const [status, setStatus] = useState<SonioxStatus>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const checkStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/soniox/status?jobId=${jobId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        // Stop polling
        stopPolling();
        
        // Save transcript
        setTranscript(data.text);
        setStatus('completed');
        
        // Callback
        onComplete?.(data.text);
      } else if (data.status === 'error') {
        // Stop polling
        stopPolling();
        
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
  }, [stopPolling, onComplete, onError]);

  const startPolling = useCallback((jobId: string) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    jobIdRef.current = jobId;

    // Start polling every 2 seconds
    intervalRef.current = setInterval(() => {
      checkStatus(jobId);
    }, pollingInterval);

    // Also check immediately
    checkStatus(jobId);
  }, [checkStatus, pollingInterval]);

  const startTranscription = useCallback(async (audioUrl: string, lectureId?: string) => {
    // Reset state
    setStatus('starting');
    setError(null);
    setTranscript(null);

    try {
      // Step 1: Call /start route with audio URL
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
        throw new Error('No job_id returned');
      }

      // Step 2: Start polling for status
      setStatus('processing');
      startPolling(jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start transcription';
      setError(errorMessage);
      setStatus('error');
      onError?.(errorMessage);
    }
  }, [startPolling, onError]);

  return {
    status,
    transcript,
    error,
    isPolling,
    startTranscription,
    stopPolling,
  };
}

export default useSoniox;

