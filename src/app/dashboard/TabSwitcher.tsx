'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FolderOpen, FileText } from 'lucide-react';

type TabType = 'courses' | 'uncategorized';

interface TabSwitcherProps {
  foldersCount: number;
  uncategorizedCount: number;
}

export default function TabSwitcher({ foldersCount, uncategorizedCount }: TabSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'courses';

  const setTab = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'courses') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] mb-6">
      <button
        onClick={() => setTab('courses')}
        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
          currentTab === 'courses'
            ? 'text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <FolderOpen className="w-4 h-4" />
        <span>Courses</span>
        <span className="text-xs text-[var(--text-muted)]">({foldersCount})</span>
        {currentTab === 'courses' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
        )}
      </button>
      <button
        onClick={() => setTab('uncategorized')}
        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
          currentTab === 'uncategorized'
            ? 'text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Uncategorized</span>
        <span className="text-xs text-[var(--text-muted)]">({uncategorizedCount})</span>
        {currentTab === 'uncategorized' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
        )}
      </button>
    </div>
  );
}

