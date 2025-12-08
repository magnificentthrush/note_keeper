import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
}

export default function Header({ title, subtitle, backHref, actions }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            {title && (
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
