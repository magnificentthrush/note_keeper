'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface NoteRendererProps {
  content: string;
}

export default function NoteRenderer({ content }: NoteRendererProps) {
  return (
    <div className="prose-notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children, ...props }) => {
            const text = children?.toString?.() ?? '';
            const isUserNote = typeof text === 'string' && text.includes('🔖 USER NOTE');
            if (isUserNote) {
              return (
                <div className="user-note">
                  <p className="text-[var(--text-primary)]" {...props}>
                    {children}
                  </p>
                </div>
              );
            }
            return (
              <p {...props}>
                {children}
              </p>
            );
          },
          code: ({ inline, children, ...props }) => {
            if (inline) {
              return (
                <code {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto">
                <code {...props}>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
