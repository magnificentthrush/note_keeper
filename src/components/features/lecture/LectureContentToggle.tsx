'use client';

import { useState } from 'react';
import { FileText, ScrollText } from 'lucide-react';
import Card from '@/components/ui/Card';
import NoteRenderer from './NoteRenderer';
import TranscriptRenderer from './TranscriptRenderer';
import { TranscriptResponse } from '@/lib/types';

interface LectureContentToggleProps {
  notes: string | null;
  transcript: TranscriptResponse | null;
}

type TabType = 'notes' | 'transcript';

export default function LectureContentToggle({ notes, transcript }: LectureContentToggleProps) {
  // Default to notes, fallback to transcript if notes not available
  const defaultTab: TabType = notes ? 'notes' : (transcript ? 'transcript' : 'notes');
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  const hasNotes = !!notes;
  const hasTranscript = !!transcript;

  // If neither exists, show a message
  if (!hasNotes && !hasTranscript) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--text-muted)]">No content available yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg w-fit">
        {/* AI Notes tab */}
        <button
          onClick={() => setActiveTab('notes')}
          disabled={!hasNotes}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'notes'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : hasNotes
                ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                : 'text-[var(--text-muted)] cursor-not-allowed opacity-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          AI Notes
        </button>

        {/* Transcription tab */}
        <button
          onClick={() => setActiveTab('transcript')}
          disabled={!hasTranscript}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'transcript'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : hasTranscript
                ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                : 'text-[var(--text-muted)] cursor-not-allowed opacity-50'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Transcription
        </button>
      </div>

      {/* Content card */}
      <Card className="p-8">
        {/* AI Notes content */}
        {activeTab === 'notes' && hasNotes && (
          <NoteRenderer content={notes} />
        )}

        {/* Transcription content */}
        {activeTab === 'transcript' && hasTranscript && (
          <TranscriptRenderer transcript={transcript} />
        )}

        {/* Fallback messages */}
        {activeTab === 'notes' && !hasNotes && (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)]">AI notes are not available for this lecture.</p>
          </div>
        )}

        {activeTab === 'transcript' && !hasTranscript && (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)]">Transcription is not available for this lecture.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

