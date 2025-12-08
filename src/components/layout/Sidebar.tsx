'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Mic, User, BookOpen } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/record', icon: Mic, label: 'New Recording' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-[var(--text-primary)] block">NoteKeeper</span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">AI Notes</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 px-3">
          Menu
        </p>
        <div className="space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)) || (href === '/dashboard' && pathname === '/dashboard');
            
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] text-white shadow-lg shadow-[var(--accent)]/25'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:translate-x-1'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 m-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">NoteKeeper v1.0</p>
        <p className="text-[10px] text-[var(--text-muted)]">AI-Powered Lecture Notes</p>
      </div>
    </aside>
  );
}
