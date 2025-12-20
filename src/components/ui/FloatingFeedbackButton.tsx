'use client';

import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

export default function FloatingFeedbackButton() {
  return (
    <Link
      href="/feedback"
      className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 px-4 py-3 bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-medium rounded-full shadow-lg shadow-[var(--accent)]/30 hover:shadow-xl hover:shadow-[var(--accent)]/40 transition-all duration-300 hover:scale-105"
    >
      <MessageSquareText className="w-5 h-5" />
      <span className="hidden sm:inline">Feedback</span>
    </Link>
  );
}

