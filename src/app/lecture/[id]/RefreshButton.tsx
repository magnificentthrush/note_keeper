'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function RefreshButton() {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <button
      onClick={handleRefresh}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all"
    >
      <RefreshCw className="w-4 h-4" />
      Check Status
    </button>
  );
}


