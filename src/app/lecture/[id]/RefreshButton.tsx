'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';

interface RefreshButtonProps {
  lectureId: string;
  canRetry?: boolean;
}

export default function RefreshButton({ lectureId, canRetry = false }: RefreshButtonProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/process-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId, retryNotes: true }),
      });

      if (!response.ok) {
        console.error('Retry failed');
      }
      router.refresh();
    } catch (error) {
      console.error('Retry error:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (canRetry) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRetry}
        isLoading={isRetrying}
      >
        <Zap className="w-4 h-4" />
        Retry AI Notes
      </Button>
    );
  }

  return (
    <Button variant="secondary" onClick={handleRefresh}>
      <RefreshCw className="w-4 h-4" />
      Check Status
    </Button>
  );
}
