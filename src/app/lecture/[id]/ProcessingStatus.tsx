'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';

interface ProcessingStatusProps {
  lectureId: string;
  sonioxJobId?: string | null;
}

type ProcessingState = 'idle' | 'processing' | 'generating_notes' | 'completed' | 'error';

const statusMessages: Record<ProcessingState, { title: string; description: string }> = {
  idle: {
    title: 'Waiting to start',
    description: 'Preparing your lecture for processing...',
  },
  processing: {
    title: 'Transcribing audio',
    description: 'Converting your lecture audio to text. This may take a few minutes.',
  },
  generating_notes: {
    title: 'Generating notes',
    description: 'AI is creating structured study notes from your transcript...',
  },
  completed: {
    title: 'Complete!',
    description: 'Your lecture has been processed successfully.',
  },
  error: {
    title: 'Processing failed',
    description: 'There was an error processing your lecture.',
  },
};

export default function ProcessingStatus({ lectureId, sonioxJobId }: ProcessingStatusProps) {
  const router = useRouter();
  const [state, setState] = useState<ProcessingState>('processing');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for status using GET endpoint
  const checkStatus = useCallback(async () => {
    if (!sonioxJobId) return;

    try {
      // Use GET with query params as per the new API
      const response = await fetch(`/api/soniox/status?jobId=${sonioxJobId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check status');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Now generate notes from the transcript
        setState('generating_notes');

        // Call complete endpoint to generate notes
        const completeResponse = await fetch('/api/soniox/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lectureId,
            transcriptText: data.transcript || data.text, // Use transcript field (or fallback to text for compatibility)
          }),
        });

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json();
          throw new Error(errorData.error || 'Failed to generate notes');
        }

        // Refresh the page to show completed lecture
        router.refresh();
      } else if (data.status === 'error') {
        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setState('error');
        // Show detailed error message from Soniox
        const errorMsg = data.error || data.error_message || 'Transcription failed';
        setError(errorMsg);
        console.error('Transcription error:', data.error_type, errorMsg);
      }
      // If still processing, continue polling
    } catch (err) {
      console.error('Error checking status:', err);
      // Don't stop polling on network errors
    }
  }, [sonioxJobId, lectureId, router]);

  // Start polling when component mounts
  useEffect(() => {
    if (!sonioxJobId) {
      setState('idle');
      return;
    }

    // Initial check
    checkStatus();

    // Set up polling every 2 seconds
    intervalRef.current = setInterval(checkStatus, 2000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sonioxJobId, checkStatus]);

  const currentStatus = statusMessages[state];

  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-6">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {currentStatus.title}
      </h2>
      <p className="text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
        {currentStatus.description}
      </p>
      {error && (
        <p className="text-sm text-[var(--error)] mb-4">
          Error: {error}
        </p>
      )}
      <div className="flex justify-center gap-2 mt-2">
        <div className="flex gap-1.5">
          {['processing', 'generating_notes'].map((step, i) => {
            const steps = ['processing', 'generating_notes'];
            const currentIndex = steps.indexOf(state);
            const isActive = i <= currentIndex;
            const isCurrent = steps[i] === state;

            return (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-[var(--accent)] animate-pulse'
                    : isActive
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--border)]'
                }`}
              />
            );
          })}
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-4">
        This page will automatically update when processing is complete.
      </p>
    </Card>
  );
}
