'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Loader2, Check, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Lecture } from '@/lib/types';

interface AddFromUncategorizedButtonProps {
  folderId: string;
}

export default function AddFromUncategorizedButton({ folderId }: AddFromUncategorizedButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uncategorizedLectures, setUncategorizedLectures] = useState<Lecture[]>([]);
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchUncategorizedLectures();
    }
  }, [isOpen]);

  const fetchUncategorizedLectures = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/uncategorized-lectures');
      if (response.ok) {
        const data = await response.json();
        setUncategorizedLectures(data.lectures || []);
      }
    } catch (error) {
      console.error('Error fetching uncategorized lectures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLecture = (lectureId: string) => {
    setSelectedLectures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lectureId)) {
        newSet.delete(lectureId);
      } else {
        newSet.add(lectureId);
      }
      return newSet;
    });
  };

  const handleAddSelected = async () => {
    if (selectedLectures.size === 0) return;

    setIsMoving(true);
    try {
      // Move each selected lecture to this folder
      const movePromises = Array.from(selectedLectures).map(lectureId =>
        fetch('/api/move-lecture', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lectureId, folderId }),
        })
      );

      await Promise.all(movePromises);

      setSelectedLectures(new Set());
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error moving lectures:', error);
      alert('Failed to move some lectures');
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLectures(new Set());
  };

  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Add from Uncategorized
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : uncategorizedLectures.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">No uncategorized lectures</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  All your lectures are organized in folders.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {uncategorizedLectures.map(lecture => (
                  <button
                    key={lecture.id}
                    onClick={() => toggleLecture(lecture.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedLectures.has(lecture.id)
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                        : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedLectures.has(lecture.id)
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'border-[var(--border)]'
                    }`}>
                      {selectedLectures.has(lecture.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        {lecture.title || 'Untitled Lecture'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(lecture.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {uncategorizedLectures.length > 0 && (
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
              <p className="text-sm text-[var(--text-muted)]">
                {selectedLectures.size} selected
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddSelected}
                  disabled={selectedLectures.size === 0 || isMoving}
                  isLoading={isMoving}
                >
                  <Plus className="w-4 h-4" />
                  Add to Folder
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
      <Plus className="w-4 h-4" />
      Add from Uncategorized
    </Button>
  );
}



