'use client';

import { AlertTriangle, ShieldCheck } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { FactCheckItem } from '@/lib/types';

function severityVariant(severity: FactCheckItem['severity']): 'warning' | 'error' | 'success' {
  if (severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  return 'success';
}

function severityLabel(severity: FactCheckItem['severity']): string {
  if (severity === 'high') return 'High';
  if (severity === 'medium') return 'Medium';
  return 'Low';
}

export default function FactCheckSection({ items }: { items: FactCheckItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Card className="p-6 border-[var(--warning)]/30 bg-[var(--warning)]/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--warning)]" />
            Fact-check (possible mistakes)
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Only shown when the AI is highly confident something taught is incorrect.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[var(--warning)]">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">{items.length}</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {it.claim}
              </p>
              <Badge
                text={severityLabel(it.severity)}
                variant={severityVariant(it.severity)}
              />
            </div>

            {it.source_quote && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                <span className="font-medium">Quote:</span> “{it.source_quote}”
              </p>
            )}

            <div className="mt-3 grid gap-2">
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Correction:</span>{' '}
                {it.correction}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Why:</span>{' '}
                {it.rationale}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Confidence: {Math.round((it.confidence ?? 0) * 100)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}


