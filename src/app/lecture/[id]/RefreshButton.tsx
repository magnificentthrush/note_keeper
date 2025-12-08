'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';

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

  const handleRetryProcessing = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/process-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to process lecture'}`);
      } else {
        // Refresh the page to see updated status
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to retry processing'}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex gap-3">
      {canRetry && (
        <button
          onClick={handleRetryProcessing}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {isRetrying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Retry AI Notes
            </>
          )}
        </button>
      )}
      <button
        onClick={handleRefresh}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all disabled:opacity-50"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
}


