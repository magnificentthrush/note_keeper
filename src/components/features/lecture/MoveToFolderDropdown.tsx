'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FolderInput, FolderOpen, Loader2, Check, Plus } from 'lucide-react';
import { Folder } from '@/lib/types';

interface MoveToFolderDropdownProps {
  lectureId: string;
  currentFolderId: string | null;
  onMoved?: () => void;
}

export default function MoveToFolderDropdown({ 
  lectureId, 
  currentFolderId,
  onMoved 
}: MoveToFolderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewFolderName('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMove = async (folderId: string | null) => {
    if (folderId === currentFolderId) {
      setIsOpen(false);
      return;
    }

    setIsMoving(true);
    try {
      const response = await fetch('/api/move-lecture', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId, folderId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move lecture');
      }

      setIsOpen(false);
      router.refresh();
      onMoved?.();
    } catch (error) {
      console.error('Error moving lecture:', error);
      alert(error instanceof Error ? error.message : 'Failed to move lecture');
    } finally {
      setIsMoving(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        // Move to the newly created folder
        await handleMove(data.folder.id);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsCreatingFolder(false);
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleButtonClick}
        disabled={isMoving}
        className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
        title="Move to folder"
      >
        {isMoving ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
        ) : (
          <FolderInput className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--accent)]" />
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--text-muted)] px-2">Move to folder</p>
          </div>

          {isLoading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {/* Uncategorized option */}
              <button
                onClick={() => handleMove(null)}
                disabled={isMoving}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-left ${
                  currentFolderId === null ? 'bg-[var(--accent)]/10' : ''
                }`}
              >
                <span className="text-sm text-[var(--text-secondary)]">Uncategorized</span>
                {currentFolderId === null && <Check className="w-4 h-4 text-[var(--accent)]" />}
              </button>

              {folders.length > 0 && <div className="border-t border-[var(--border)]" />}

              {/* Folders list */}
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  disabled={isMoving}
                  className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-left ${
                    currentFolderId === folder.id ? 'bg-[var(--accent)]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-[var(--warning)]" />
                    <span className="text-sm text-[var(--text-primary)]">{folder.name}</span>
                  </div>
                  {currentFolderId === folder.id && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-[var(--border)]">
            {isCreating ? (
              <div className="p-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewFolderName('');
                      }
                    }}
                    placeholder="Folder name..."
                    className="flex-1 px-2 py-1.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                    autoFocus
                    disabled={isCreatingFolder}
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    className="p-1.5 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/80 disabled:opacity-50"
                  >
                    {isCreatingFolder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--accent)]"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create new folder</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

