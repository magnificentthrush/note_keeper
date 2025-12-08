'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Mic, User } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/record', icon: Mic, label: 'Record' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 md:hidden z-50">
      <div className="flex items-center justify-around h-16 px-4 pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'
                }`}
              />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


