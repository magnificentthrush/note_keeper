import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import LectureCard from '@/components/features/lecture/LectureCard';
import { Lecture } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: lectures } = await supabase
    .from('lectures')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {lectures?.length || 0} lecture{lectures?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            <Link href="/record">
              <Button>
                <Plus className="w-4 h-4" />
                New Recording
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {lectures && lectures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {lectures.map((lecture: Lecture) => (
              <LectureCard key={lecture.id} lecture={lecture} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              No lectures yet
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md">
              Start recording your first lecture and let AI generate detailed study notes automatically.
            </p>
            <Link href="/record">
              <Button size="lg">
                <Plus className="w-5 h-5" />
                Start Recording
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
