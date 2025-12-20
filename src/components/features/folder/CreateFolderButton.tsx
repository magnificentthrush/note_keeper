'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Check, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function CreateFolderButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!folderName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      setFolderName('');
      setIsCreating(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setFolderName('');
    }
  };

  if (isCreating) {
    return (
      <Card className="p-5 h-full border-dashed border-2 border-[var(--border)]">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
            <FolderPlus className="w-5 h-5 text-[var(--accent)]" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Folder name..."
            className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            autoFocus
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!folderName.trim() || isSaving}
            isLoading={isSaving}
          >
            <Check className="w-4 h-4" />
            Create
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreating(false);
              setFolderName('');
            }}
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      hover 
      className="p-5 h-full border-dashed border-2 border-[var(--border)] cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
      onClick={() => setIsCreating(true)}
    >
      <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center mb-3">
        <FolderPlus className="w-6 h-6 text-[var(--accent)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-secondary)]">Create New Folder</p>
    </Card>
  );
}



