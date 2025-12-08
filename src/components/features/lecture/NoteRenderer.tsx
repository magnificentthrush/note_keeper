'use client';

import React from 'react';

interface NoteRendererProps {
  content: string;
}

export default function NoteRenderer({ content }: NoteRendererProps) {
  // Simple markdown parser
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';

    const flushList = () => {
      if (listItems.length > 0) {
        if (listType === 'ul') {
          elements.push(
            <ul key={`list-${elements.length}`} className="list-disc list-inside mb-4 space-y-1">
              {listItems.map((item, i) => (
                <li key={i} className="text-[var(--text-secondary)]">{parseInline(item)}</li>
              ))}
            </ul>
          );
        } else {
          elements.push(
            <ol key={`list-${elements.length}`} className="list-decimal list-inside mb-4 space-y-1">
              {listItems.map((item, i) => (
                <li key={i} className="text-[var(--text-secondary)]">{parseInline(item)}</li>
              ))}
            </ol>
          );
        }
        listItems = [];
        inList = false;
      }
    };

    const parseInline = (text: string) => {
      // Bold
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>');
      // Italic
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Code
      text = text.replace(/`(.+?)`/g, '<code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--accent-light)] text-sm font-mono">$1</code>');
      
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">
            {parseInline(trimmed.slice(4))}
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-xl font-semibold text-[var(--text-primary)] mt-8 mb-4 pb-2 border-b border-[var(--border)]">
            {parseInline(trimmed.slice(3))}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={index} className="text-2xl font-bold text-[var(--text-primary)] mt-8 mb-4">
            {parseInline(trimmed.slice(2))}
          </h1>
        );
      }
      // User keypoint highlight
      else if (trimmed.startsWith('📌') || trimmed.startsWith('🔑') || trimmed.startsWith('**Key Point:**') || trimmed.includes('[USER NOTE]')) {
        flushList();
        elements.push(
          <div key={index} className="user-note">
            <p className="text-[var(--text-primary)]">{parseInline(trimmed)}</p>
          </div>
        );
      }
      // Blockquote
      else if (trimmed.startsWith('>')) {
        flushList();
        elements.push(
          <blockquote key={index} className="border-l-3 border-[var(--accent)] pl-4 my-4 text-[var(--text-muted)] italic">
            {parseInline(trimmed.slice(1).trim())}
          </blockquote>
        );
      }
      // Unordered list
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList || listType !== 'ul') {
          flushList();
          inList = true;
          listType = 'ul';
        }
        listItems.push(trimmed.slice(2));
      }
      // Ordered list
      else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || listType !== 'ol') {
          flushList();
          inList = true;
          listType = 'ol';
        }
        listItems.push(trimmed.replace(/^\d+\.\s/, ''));
      }
      // Paragraph
      else if (trimmed) {
        flushList();
        elements.push(
          <p key={index} className="text-[var(--text-secondary)] mb-4 leading-relaxed">
            {parseInline(trimmed)}
          </p>
        );
      }
      // Empty line
      else {
        flushList();
      }
    });

    flushList();
    return elements;
  };

  return (
    <div className="prose-notes">
      {parseMarkdown(content)}
    </div>
  );
}
