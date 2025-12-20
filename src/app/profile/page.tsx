'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, FileText, Clock, Plus, LayoutDashboard, Edit2, Check, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setEmail(user.email || null);
      setName(user.user_metadata?.full_name || null);

      // Get lecture stats
      const { data: lectures } = await supabase
        .from('lectures')
        .select('status')
        .eq('user_id', user.id);

      if (lectures) {
        setStats({
          total: lectures.length,
          completed: lectures.filter(l => l.status === 'completed').length,
        });
      }

      setLoading(false);
    };
    loadData();
  }, [supabase, router]);

  const handleStartEditName = () => {
    setEditedName(name || '');
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editedName.trim() || null }
      });

      if (error) throw error;

      setName(editedName.trim() || null);
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Failed to update name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/record">
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
                New Recording
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-8 py-8 space-y-6">
          {/* User info */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Name section */}
                {isEditingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Enter your name"
                      className="flex-1 px-3 py-1.5 text-lg font-medium bg-[var(--bg-primary)] border border-[var(--accent)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-[var(--text-primary)]"
                      autoFocus
                      disabled={isSavingName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEditName();
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="p-1.5 text-[var(--success)] hover:bg-[var(--success)]/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Save"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      disabled={isSavingName}
                      className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                      {name || <span className="text-[var(--text-muted)] italic">No name set</span>}
                    </p>
                    <button
                      onClick={handleStartEditName}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                      title="Edit name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-sm text-[var(--text-muted)]">{email}</p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">{stats.total}</p>
                  <p className="text-sm text-[var(--text-muted)]">Total Lectures</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">{stats.completed}</p>
                  <p className="text-sm text-[var(--text-muted)]">Notes Generated</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sign out */}
          <Card className="p-6">
            <h3 className="font-medium text-[var(--text-primary)] mb-4">Account Actions</h3>
            <Button variant="danger" onClick={handleSignOut} isLoading={signingOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </Card>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-sm text-[var(--text-muted)]">NoteKeeper v1.0.0</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">AI-powered lecture notes</p>
        </div>
      </main>
    </div>
  );
}
