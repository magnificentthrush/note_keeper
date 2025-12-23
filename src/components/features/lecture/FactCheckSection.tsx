'use client';

import { AlertTriangle, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 prose-notes prose-notes-compact">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children, ...props }) => (
                      <p className="text-sm font-medium text-[var(--text-primary)]" {...props}>
                        {children}
                      </p>
                    ),
                  }}
                >
                  {it.claim}
                </ReactMarkdown>
              </div>
              <Badge
                text={severityLabel(it.severity)}
                variant={severityVariant(it.severity)}
              />
            </div>

            {it.source_quote && (
              <div className="prose-notes prose-notes-compact mb-3">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children, ...props }) => (
                      <p className="text-xs text-[var(--text-muted)]" {...props}>
                        <span className="font-medium">Quote:</span> {children}
                      </p>
                    ),
                  }}
                >
                  {it.source_quote}
                </ReactMarkdown>
              </div>
            )}

            <div className="mt-3 space-y-3">
              <div className="prose-notes prose-notes-compact">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children, ...props }) => (
                      <p className="text-sm text-[var(--text-secondary)]" {...props}>
                        <span className="font-semibold text-[var(--text-primary)]">Correction:</span>{' '}
                        {children}
                      </p>
                    ),
                  }}
                >
                  {it.correction}
                </ReactMarkdown>
              </div>
              <div className="prose-notes prose-notes-compact">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: ({ children, ...props }) => (
                      <p className="text-sm text-[var(--text-secondary)]" {...props}>
                        <span className="font-semibold text-[var(--text-primary)]">Why:</span>{' '}
                        {children}
                      </p>
                    ),
                  }}
                >
                  {it.rationale}
                </ReactMarkdown>
              </div>
              <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                Confidence: {Math.round((it.confidence ?? 0) * 100)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}


