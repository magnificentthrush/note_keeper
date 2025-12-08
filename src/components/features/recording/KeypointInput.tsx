'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface KeypointInputProps {
  timestamp: number;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function KeypointInput({ timestamp, onSubmit, onCancel }: KeypointInputProps) {
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim()) {
      onSubmit(note.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Add Key Point</h3>
            <p className="text-sm text-[var(--text-muted)]">at {formatTime(timestamp)}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-fast text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter important point..."
            className="w-full h-12 px-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent mb-4"
          />

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!note.trim()} className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
