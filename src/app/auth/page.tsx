'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mail, Lock, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setError('Check your email to confirm your account');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-[var(--text-primary)]">NoteKeeper</span>
          </div>

          <h1 className="text-4xl font-bold text-[var(--text-primary)] leading-tight mb-4">
            Transform lectures<br />into study notes
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-md">
            Record your lectures, add key points, and let AI generate comprehensive study notes automatically.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--accent)] font-semibold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">Record</h3>
              <p className="text-sm text-[var(--text-muted)]">Capture lectures with one click</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--accent)] font-semibold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">Annotate</h3>
              <p className="text-sm text-[var(--text-muted)]">Add key points as you listen</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--accent)] font-semibold">3</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">Generate</h3>
              <p className="text-sm text-[var(--text-muted)]">AI creates detailed study notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-[var(--text-primary)]">NoteKeeper</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-[var(--text-secondary)]">
              {isLogin ? 'Sign in to continue' : 'Get started for free'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full h-12 pl-11 pr-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full h-12 pl-11 pr-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg text-sm ${
                error.includes('Check your email')
                  ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20'
                  : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20'
              }`}>
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12" isLoading={loading}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center mt-6 text-[var(--text-secondary)]">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-[var(--accent)] hover:text-[var(--accent-light)] font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
