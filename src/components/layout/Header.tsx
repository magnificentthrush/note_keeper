import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  backHref?: string;
  actions?: ReactNode;
}

export default function Header({ backHref, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="h-full px-4 md:px-8 flex items-center justify-between relative">
        {backHref && (
          <Link
            href={backHref}
            className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 flex-shrink-0 md:mr-0 mr-auto z-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2 md:relative md:left-0 md:translate-x-0">
          <Image
            src="/darkmode_logo.svg"
            alt="NoteKeeper Logo"
            width={62}
            height={62}
            className="w-[62px] h-[62px]"
          />
          <span className="text-2xl font-black tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', letterSpacing: '-0.02em' }}>NoteKeeper</span>
        </div>
        {actions && <div className="flex items-center gap-3 flex-shrink-0 z-10">{actions}</div>}
      </div>
    </header>
  );
}
