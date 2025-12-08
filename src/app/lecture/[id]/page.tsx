import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Pin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import NoteRenderer from '@/components/NoteRenderer';
import { Lecture, Keypoint } from '@/lib/types';
import RefreshButton from './RefreshButton';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function LecturePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: lecture, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !lecture) {
    notFound();
  }

  const typedLecture = lecture as Lecture;
  const keypoints = typedLecture.user_keypoints || [];

  return (
    <div className="min-h-screen bg-zinc-950 pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="px-4 py-4 flex items-center gap-4 max-w-3xl mx-auto">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {typedLecture.title || 'Untitled Lecture'}
            </h1>
            <p className="text-sm text-zinc-500 truncate">
              {formatDate(typedLecture.created_at)}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-3xl mx-auto">
        {/* Processing state */}
        {typedLecture.status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Processing your lecture
            </h2>
            <p className="text-zinc-400 mb-6 max-w-sm">
              We&apos;re transcribing your audio and generating detailed study notes. This usually takes a few minutes.
            </p>
            <RefreshButton />
          </div>
        )}

        {/* Error state */}
        {typedLecture.status === 'error' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Processing failed
            </h2>
            <p className="text-zinc-400 mb-6 max-w-sm">
              There was an error processing your lecture. This might be due to audio quality or a temporary issue.
            </p>
            <Link
              href="/record"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>
          </div>
        )}

        {/* Completed - show notes */}
        {typedLecture.status === 'completed' && typedLecture.final_notes && (
          <>
            {/* Key points summary */}
            {keypoints.length > 0 && (
              <div className="mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Pin className="w-4 h-4 text-violet-400" />
                  Your Key Points ({keypoints.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {keypoints.map((kp: Keypoint, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-sm"
                    >
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-violet-300 font-mono text-xs">
                        {formatTime(kp.timestamp)}
                      </span>
                      <span className="text-zinc-300">{kp.note}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes content */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
              <NoteRenderer content={typedLecture.final_notes} />
            </div>
          </>
        )}

        {/* Recording state - shouldn't normally be seen here */}
        {typedLecture.status === 'recording' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-zinc-400">
              This lecture is still being recorded.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

