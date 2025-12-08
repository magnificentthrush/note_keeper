'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Lecture } from '@/lib/types';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

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

function StatusBadge({ status }: { status: Lecture['status'] }) {
  const config = {
    recording: { icon: Clock, text: 'Recording', variant: 'warning' as const, animate: false },
    processing: { icon: Loader2, text: 'Processing', variant: 'info' as const, animate: true },
    completed: { icon: CheckCircle2, text: 'Ready', variant: 'success' as const, animate: false },
    error: { icon: AlertCircle, text: 'Error', variant: 'error' as const, animate: false },
  };
  const { icon, text, variant, animate } = config[status] || config.error;
  return <Badge icon={icon} text={text} variant={variant} animate={animate} />;
}

interface LectureCardProps {
  lecture: Lecture;
}

export default function LectureCard({ lecture }: LectureCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      const response = await fetch(`/api/delete-lecture?lectureId=${lecture.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete lecture');
      }

      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error deleting lecture:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete lecture');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <Card hover className="p-5 h-full group relative">
      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--error)]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 z-10 disabled:opacity-50"
        title="Delete lecture"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--error)]" />
        ) : (
          <Trash2 className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--error)]" />
        )}
      </button>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div 
          className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-20 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-[var(--text-primary)] text-center font-medium">
            Delete this recording?
          </p>
          <p className="text-xs text-[var(--text-muted)] text-center">
            This action cannot be undone.
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

      <Link href={`/lecture/${lecture.id}`} className="block">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <StatusBadge status={lecture.status} />
        </div>
        
        <h3 className="font-semibold text-[var(--text-primary)] mb-1 line-clamp-1">
          {lecture.title || 'Untitled Lecture'}
        </h3>
        
        <p className="text-sm text-[var(--text-muted)] mb-3">
          {formatRelativeDate(lecture.created_at)}
        </p>
        
        {lecture.user_keypoints && lecture.user_keypoints.length > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            {lecture.user_keypoints.length} key point{lecture.user_keypoints.length !== 1 ? 's' : ''}
          </p>
        )}
      </Link>
    </Card>
  );
}



