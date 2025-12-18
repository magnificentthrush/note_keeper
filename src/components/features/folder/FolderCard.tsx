'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderOpen, Trash2, Loader2, Edit2, Check, X, FileText } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Folder } from '@/lib/types';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface FolderCardProps {
  folder: Folder;
}

export default function FolderCard({ folder }: FolderCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(folder.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/folders?folderId=${folder.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete folder');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleSaveName = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const newName = editedName.trim() || 'Untitled Folder';
    if (newName === folder.name) {
      setIsEditing(false);
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          name: newName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder name');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating folder name:', error);
      alert(error instanceof Error ? error.message : 'Failed to update folder name');
      setEditedName(folder.name);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditedName(folder.name);
    setIsEditing(false);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName(e);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const lectureCount = folder.lecture_count || 0;

  return (
    <Card hover className="p-5 h-full group relative">
      {/* Action buttons container */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Edit button */}
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center transition-all duration-200"
            title="Rename folder"
          >
            <Edit2 className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--accent)]" />
          </button>
        )}
        
        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--error)]/20 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
          title="Delete folder"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--error)]" />
          ) : (
            <Trash2 className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--error)]" />
          )}
        </button>
      </div>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div 
          className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-20 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-[var(--text-primary)] text-center font-medium">
            Delete this folder?
          </p>
          <p className="text-xs text-[var(--text-muted)] text-center">
            Lectures will be moved to uncategorized.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <Link href={`/dashboard/folder/${folder.id}`} className="block">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-5 h-5 text-[var(--warning)]" />
          </div>
        </div>
        
        {/* Editable Name */}
        {isEditing ? (
          <div 
            className="flex items-center gap-2 mb-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-sm font-semibold bg-[var(--bg-primary)] border border-[var(--accent)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-[var(--text-primary)]"
              autoFocus
              disabled={isSavingName}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={handleSaveName}
              disabled={isSavingName}
              className="w-7 h-7 flex items-center justify-center text-[var(--success)] hover:bg-[var(--success)]/10 rounded-lg transition-colors"
              title="Save"
            >
              {isSavingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingName}
              className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h3 className="font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
            {folder.name}
          </h3>
        )}
        
        <p className="text-sm text-[var(--text-muted)] mb-3">
          {formatRelativeDate(folder.created_at)}
        </p>
      </Link>

      {/* Lecture count - Bottom Right */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <FileText className="w-3.5 h-3.5" />
        <span>{lectureCount} lecture{lectureCount !== 1 ? 's' : ''}</span>
      </div>
    </Card>
  );
}

