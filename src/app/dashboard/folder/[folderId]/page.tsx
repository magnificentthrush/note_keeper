import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import LectureCard from '@/components/features/lecture/LectureCard';
import { Lecture, Folder } from '@/lib/types';
import EditableFolderName from './EditableFolderName';
import AddFromUncategorizedButton from './AddFromUncategorizedButton';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ folderId: string }>;
}

export default async function FolderPage({ params }: PageProps) {
  const { folderId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  // Fetch folder
  const { data: folder, error: folderError } = await supabase
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .eq('user_id', user.id)
    .single();

  if (folderError || !folder) {
    notFound();
  }

  // Fetch lectures in this folder
  const { data: lectures } = await supabase
    .from('lectures')
    .select('*')
    .eq('user_id', user.id)
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });

  const typedFolder = folder as Folder;
  const lectureCount = lectures?.length || 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <EditableFolderName folderId={folderId} initialName={typedFolder.name} />
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {lectureCount} lecture{lectureCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            {/* New Recording button - hidden on mobile, shown on desktop */}
            <Link href={`/record?folderId=${folderId}`} className="hidden md:block">
              <Button>
                <Plus className="w-4 h-4" />
                New Recording
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* New Recording button - shown on mobile above lectures */}
        <div className="mb-6 md:hidden">
          <Link href={`/record?folderId=${folderId}`}>
            <Button className="w-full">
              <Plus className="w-4 h-4" />
              New Recording
            </Button>
          </Link>
        </div>

        {lectures && lectures.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {lectures.map((lecture: Lecture) => (
                <LectureCard key={lecture.id} lecture={lecture} />
              ))}
            </div>
            {/* Add from Uncategorized button - at the end of lectures */}
            <div className="mt-6">
              <AddFromUncategorizedButton folderId={folderId} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              No lectures yet
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md">
              Start recording your first lecture in this course.
            </p>
            <Link href={`/record?folderId=${folderId}`}>
              <Button size="lg">
                <Plus className="w-5 h-5" />
                Start Recording
              </Button>
            </Link>
            {/* Add from Uncategorized button - also shown in empty state */}
            <div className="mt-6">
              <AddFromUncategorizedButton folderId={folderId} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

