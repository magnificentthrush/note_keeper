import { LucideIcon } from 'lucide-react';

interface BadgeProps {
  icon?: LucideIcon;
  text: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  animate?: boolean;
}

export default function Badge({ icon: Icon, text, variant = 'default', animate = false }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)]',
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border ${variants[variant]}`}>
      {Icon && <Icon className={`w-3 h-3 ${animate ? 'animate-spin' : ''}`} />}
      {text}
    </span>
  );
}
