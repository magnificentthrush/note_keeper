'use client';

import { useMemo } from 'react';

interface NoteRendererProps {
  content: string;
}

// Simple markdown parser for common patterns
function parseMarkdown(text: string): string {
  let html = text;

  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold text - handle **[IMPORTANT: ...]** specially
  html = html.replace(
    /\*\*\[IMPORTANT: (.*?)\]\*\*/g,
    '<div class="keypoint-highlight"><strong>📌 IMPORTANT:</strong> $1</div>'
  );
  
  // Regular bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered lists
  html = html.replace(/^\s*[-*]\s+(.*$)/gm, '<li>$1</li>');
  
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*$)/gm, '<li>$1</li>');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Blockquotes
  html = html.replace(/^&gt;\s*(.*$)/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Paragraphs - wrap lines that aren't already wrapped
  html = html.replace(/^(?!<[hlubo]|<div|<hr)(.*\S.*)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  // Add line breaks
  html = html.replace(/\n\n/g, '\n');

  return html;
}

export default function NoteRenderer({ content }: NoteRendererProps) {
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className="markdown-notes prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}


