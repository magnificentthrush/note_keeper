'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Loader2 } from 'lucide-react';

interface EditableFolderNameProps {
  folderId: string;
  initialName: string;
}

export default function EditableFolderName({ folderId, initialName }: EditableFolderNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    const newName = name.trim() || 'Untitled Folder';
    if (newName === initialName) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          name: newName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder name');
      }

      setName(newName);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating folder name:', error);
      alert(error instanceof Error ? error.message : 'Failed to update folder name');
      setName(initialName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(initialName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-3 py-1.5 text-xl font-bold bg-[var(--bg-primary)] border border-[var(--accent)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-[var(--text-primary)] min-w-[200px]"
          autoFocus
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-2 text-[var(--success)] hover:bg-[var(--success)]/10 rounded-lg transition-colors"
          title="Save"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 group">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">
        {name}
      </h1>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all"
        title="Rename folder"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}

