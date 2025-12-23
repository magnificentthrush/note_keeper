import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, Pin, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import LectureContentToggle from '@/components/features/lecture/LectureContentToggle';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Lecture, Keypoint } from '@/lib/types';
import RefreshButton from './RefreshButton';
import EditableTitle from './EditableTitle';
import ProcessingStatus from './ProcessingStatus';
import FactCheckSection from '@/components/features/lecture/FactCheckSection';

export const dynamic = 'force-dynamic';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LecturePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: lecture, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !lecture) notFound();

  const typedLecture = lecture as Lecture;
  const keypoints = typedLecture.user_keypoints || [];

  const needsRetry = typedLecture.final_notes && (
    typedLecture.final_notes.includes('quota') ||
    typedLecture.final_notes.includes('Transcript Available') ||
    typedLecture.final_notes.includes('Error')
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="md:pl-64">
        <Header
          backHref="/dashboard"
          // Sidebar already shows the brand on desktop; show brand only on mobile to avoid duplicate logo.
          brandVisibility="mobile"
          actions={
            typedLecture.status === 'completed' && (
              <Badge
                icon={FileText}
                text="Notes Ready"
                variant="success"
              />
            )
          }
        />
        {/* Page title - below header */}
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="px-4 md:px-8 py-4">
            <EditableTitle lectureId={id} initialTitle={typedLecture.title || 'Untitled Lecture'} />
            <p className="text-sm text-[var(--text-muted)] mt-1">{formatDate(typedLecture.created_at)}</p>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {/* Processing - with auto-polling */}
          {typedLecture.status === 'processing' && (
            <ProcessingStatus
              lectureId={id}
              sonioxJobId={typedLecture.soniox_job_id}
            />
          )}

          {/* Error */}
          {typedLecture.status === 'error' && (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-[var(--error)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Processing failed
              </h2>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                There was an error processing your lecture. This might be due to audio quality or a temporary issue.
              </p>
              <Link href="/record">
                <Button>
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </Link>
            </Card>
          )}

          {/* Completed */}
          {typedLecture.status === 'completed' && (typedLecture.final_notes || typedLecture.transcript_json) && (
            <div className="space-y-6">
              {/* Retry notice */}
              {needsRetry && (
                <Card className="p-4 border-[var(--warning)]/30 bg-[var(--warning)]/5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--warning)]">
                      AI notes generation incomplete. Click to retry.
                    </p>
                    <RefreshButton lectureId={id} canRetry={true} />
                  </div>
                </Card>
              )}

              {/* Keypoints */}
              {keypoints.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                    <Pin className="w-4 h-4 text-[var(--accent)]" />
                    Your Key Points ({keypoints.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {keypoints.map((kp: Keypoint, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg text-sm"
                      >
                        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span className="text-[var(--accent-light)] font-mono text-xs">
                          {formatTime(kp.timestamp)}
                        </span>
                        <span className="text-[var(--text-secondary)]">{kp.note}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Notes and Transcript Toggle */}
              <LectureContentToggle
                notes={typedLecture.final_notes}
                transcript={typedLecture.transcript_json}
              />

              {/* Fact check section (only if there are items) */}
              {Array.isArray(typedLecture.fact_checks) && typedLecture.fact_checks.length > 0 && (
                <FactCheckSection items={typedLecture.fact_checks} />
              )}
            </div>
          )}

          {/* Recording */}
          {typedLecture.status === 'recording' && (
            <Card className="p-12 text-center">
              <p className="text-[var(--text-muted)]">
                This lecture is still being recorded.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
