import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { Plus, FileText, FolderOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import LectureCard from '@/components/features/lecture/LectureCard';
import { FolderCard, CreateFolderButton } from '@/components/features/folder';
import { Lecture, Folder } from '@/lib/types';
import TabSwitcher from './TabSwitcher';

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const currentTab = params.tab || 'courses';
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  // Fetch folders with lecture count
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch uncategorized lectures (no folder)
  const { data: uncategorizedLectures } = await supabase
    .from('lectures')
    .select('*')
    .eq('user_id', user.id)
    .is('folder_id', null)
    .order('created_at', { ascending: false });

  // Get lecture counts per folder
  const { data: lectureCounts } = await supabase
    .from('lectures')
    .select('folder_id')
    .eq('user_id', user.id)
    .not('folder_id', 'is', null);

  // Calculate lecture count per folder
  const folderLectureCounts: Record<string, number> = {};
  lectureCounts?.forEach(lecture => {
    if (lecture.folder_id) {
      folderLectureCounts[lecture.folder_id] = (folderLectureCounts[lecture.folder_id] || 0) + 1;
    }
  });

  // Add lecture_count to folders
  const foldersWithCount: Folder[] = (folders || []).map(folder => ({
    ...folder,
    lecture_count: folderLectureCounts[folder.id] || 0,
  }));

  const totalFolders = foldersWithCount.length;
  const totalUncategorized = uncategorizedLectures?.length || 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            {/* New Recording button - hidden on mobile, shown on desktop */}
            <Link href="/record" className="hidden md:block">
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
        {/* Tab Switcher - Only show if there's content in at least one tab */}
        {!(totalFolders === 0 && totalUncategorized === 0) && (
          <Suspense fallback={<div className="h-12 mb-6" />}>
            <TabSwitcher foldersCount={totalFolders} uncategorizedCount={totalUncategorized} />
          </Suspense>
        )}

        {/* New Recording button - shown on mobile above content */}
        <div className="mb-6 md:hidden">
          <Link href="/record">
            <Button className="w-full">
              <Plus className="w-4 h-4" />
              New Recording
            </Button>
          </Link>
        </div>

        {/* Empty State - Only show if both tabs are empty */}
        {totalFolders === 0 && totalUncategorized === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              Get started
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md">
              Create a course folder to organize your lectures, or start recording right away.
            </p>
            <div className="flex gap-4">
              <Link href="/record">
                <Button size="lg">
                  <Plus className="w-5 h-5" />
                  Start Recording
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Courses Tab Content */}
            {currentTab === 'courses' && (
              <section>
                {totalFolders > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {foldersWithCount.map((folder) => (
                      <FolderCard key={folder.id} folder={folder} />
                    ))}
                    <CreateFolderButton />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-4">
                      <FolderOpen className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                      No courses yet
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-4 max-w-md">
                      Create a course folder to organize your lectures.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Uncategorized Tab Content */}
            {currentTab === 'uncategorized' && (
              <section>
                {totalUncategorized > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {uncategorizedLectures?.map((lecture: Lecture) => (
                      <LectureCard key={lecture.id} lecture={lecture} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                      No uncategorized lectures
                    </h2>
                    <p className="text-[var(--text-secondary)] max-w-md">
                      All your lectures are organized in courses.
                    </p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
