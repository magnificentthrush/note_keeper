import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, BookOpen } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import LectureCard from '@/components/LectureCard';
import { Lecture } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: lectures, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lectures:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="px-4 py-4 flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-white">My Lectures</h1>
            <p className="text-sm text-zinc-500">
              {lectures?.length || 0} lecture{lectures?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/record"
            className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/25 transition-all active:scale-95 md:hidden"
          >
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        {lectures && lectures.length > 0 ? (
          <div className="space-y-3">
            {lectures.map((lecture: Lecture) => (
              <LectureCard key={lecture.id} lecture={lecture} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No lectures yet
            </h2>
            <p className="text-zinc-500 mb-6 max-w-xs">
              Start recording your first lecture and let AI generate detailed study notes for you.
            </p>
            <Link
              href="/record"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              New Recording
            </Link>
          </div>
        )}
      </main>

      {/* Desktop sidebar hint - hidden on mobile */}
      <aside className="hidden md:flex fixed right-8 bottom-8">
        <Link
          href="/record"
          className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-2xl shadow-xl shadow-violet-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Recording
        </Link>
      </aside>

      <BottomNav />
    </div>
  );
}

