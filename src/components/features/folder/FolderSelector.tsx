'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, ChevronDown, Plus, Loader2, Check } from 'lucide-react';
import { Folder } from '@/lib/types';

interface FolderSelectorProps {
  selectedFolderId: string | null;
  onFolderChange: (folderId: string | null) => void;
}

export default function FolderSelector({ selectedFolderId, onFolderChange }: FolderSelectorProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
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
        setFolders(prev => [data.folder, ...prev]);
        onFolderChange(data.folder.id);
        setNewFolderName('');
        setIsCreating(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        Course / Folder
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)]/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-[var(--warning)]" />
          <span className={selectedFolder ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
            {isLoading ? 'Loading...' : selectedFolder?.name || 'No folder (uncategorized)'}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden">
          {/* No folder option */}
          <button
            type="button"
            onClick={() => {
              onFolderChange(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors ${
              !selectedFolderId ? 'bg-[var(--accent)]/10' : ''
            }`}
          >
            <span className="text-[var(--text-secondary)]">No folder (uncategorized)</span>
            {!selectedFolderId && <Check className="w-4 h-4 text-[var(--accent)]" />}
          </button>

          <div className="border-t border-[var(--border)]" />

          {/* Existing folders */}
          <div className="max-h-48 overflow-y-auto">
            {folders.map(folder => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  onFolderChange(folder.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors ${
                  selectedFolderId === folder.id ? 'bg-[var(--accent)]/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-4 h-4 text-[var(--warning)]" />
                  <span className="text-[var(--text-primary)]">{folder.name}</span>
                </div>
                {selectedFolderId === folder.id && <Check className="w-4 h-4 text-[var(--accent)]" />}
              </button>
            ))}
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Create new folder */}
          {isCreating ? (
            <div className="p-3">
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
                  className="flex-1 px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-[var(--text-primary)]"
                  autoFocus
                  disabled={isCreatingFolder}
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="p-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80 disabled:opacity-50 transition-colors"
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
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--accent)]"
            >
              <Plus className="w-4 h-4" />
              <span>Create new folder</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

