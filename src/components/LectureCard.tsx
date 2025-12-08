'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lecture } from '@/lib/types';
import { FileText, Clock, Loader2, AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LectureCardProps {
  lecture: Lecture;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

function StatusBadge({ status }: { status: Lecture['status'] }) {
  const config = {
    recording: {
      icon: Clock,
      text: 'Recording',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      animate: false,
    },
    processing: {
      icon: Loader2,
      text: 'Processing',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      animate: true,
    },
    completed: {
      icon: CheckCircle2,
      text: 'Ready',
      className: 'bg-green-500/10 text-green-400 border-green-500/20',
      animate: false,
    },
    error: {
      icon: AlertCircle,
      text: 'Error',
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
      animate: false,
    },
  };

  const { icon: Icon, text, className, animate } = config[status] || config.error;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${animate ? 'animate-spin' : ''}`} />
      {text}
    </span>
  );
}

export default function LectureCard({ lecture }: LectureCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const keypointCount = lecture.user_keypoints?.length || 0;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);

    try {
      // Delete audio file from storage if it exists
      if (lecture.audio_url) {
        // Extract file path from URL
        const urlParts = lecture.audio_url.split('/');
        const fileName = urlParts.slice(urlParts.indexOf('lecture-audio') + 1).join('/');
        
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('lecture-audio')
            .remove([fileName]);
          
          if (storageError) {
            console.warn('Error deleting audio file:', storageError);
            // Continue with lecture deletion even if storage deletion fails
          }
        }
      }

      // Delete lecture record
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lecture.id);

      if (error) {
        throw error;
      }

      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error deleting lecture:', error);
      alert(`Failed to delete lecture: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="relative group/card bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all">
        <Link
          href={`/lecture/${lecture.id}`}
          className="block"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover/card:bg-violet-500/20 transition-colors flex-shrink-0">
                <FileText className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white group-hover/card:text-violet-300 transition-colors line-clamp-1">
                  {lecture.title || 'Untitled Lecture'}
                </h3>
                <p className="text-sm text-zinc-500">{formatDate(lecture.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={lecture.status} />
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 flex items-center justify-center transition-all opacity-0 group-hover/card:opacity-100 disabled:opacity-50"
                title="Delete lecture"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          {keypointCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              {keypointCount} key point{keypointCount !== 1 ? 's' : ''} marked
            </div>
          )}
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Delete Lecture?</h3>
                <p className="text-sm text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-6">
              Are you sure you want to delete &quot;{lecture.title || 'Untitled Lecture'}&quot;? 
              This will permanently delete the lecture and all associated audio files.
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

