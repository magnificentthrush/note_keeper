'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Loader2 } from 'lucide-react';

interface EditableTitleProps {
  lectureId: string;
  initialTitle: string;
}

export default function EditableTitle({ lectureId, initialTitle }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    const newTitle = title.trim() || 'Untitled Lecture';
    if (newTitle === initialTitle) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/update-lecture-title', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId,
          title: newTitle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update title');
      }

      setTitle(newTitle);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating title:', error);
      alert(error instanceof Error ? error.message : 'Failed to update title');
      setTitle(initialTitle);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
        {title}
      </h1>
      <button
        onClick={() => setIsEditing(true)}
        className="p-1.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all"
        title="Rename lecture"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}

