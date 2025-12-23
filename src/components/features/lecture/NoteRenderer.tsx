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
          pre: ({ children, ...props }) => (
            <pre className="overflow-x-auto" {...props}>
              {children}
            </pre>
          ),
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
          code: ({ children, ...props }) => (
            <code {...props}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
