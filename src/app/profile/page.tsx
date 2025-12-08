'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || null);
      setLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* User info card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <User className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Signed in as</p>
                  <p className="text-white font-medium">{email}</p>
                </div>
              </div>
            </div>

            {/* Sign out button */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-xl transition-all disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>

            {/* App info */}
            <div className="text-center pt-8">
              <p className="text-zinc-600 text-sm">NoteKeeper v1.0.0</p>
              <p className="text-zinc-700 text-xs mt-1">
                AI-powered lecture notes
              </p>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}


