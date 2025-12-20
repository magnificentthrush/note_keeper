'use client';

import { TranscriptResponse, TranscriptUtterance } from '@/lib/types';

interface TranscriptRendererProps {
  transcript: TranscriptResponse;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSpeakerLabel(speaker: string): string {
  // Convert speaker letter to readable label
  // Speaker A is typically the main speaker/instructor
  if (speaker === 'A') return 'Speaker 1 (Instructor)';
  if (speaker === 'B') return 'Speaker 2';
  if (speaker === 'C') return 'Speaker 3';
  return `Speaker ${speaker}`;
}

function getSpeakerColor(speaker: string): string {
  // Different colors for different speakers
  const colors: Record<string, string> = {
    'A': 'text-[var(--accent)]',
    'B': 'text-[var(--success)]',
    'C': 'text-[var(--warning)]',
  };
  return colors[speaker] || 'text-[var(--text-secondary)]';
}

export default function TranscriptRenderer({ transcript }: TranscriptRendererProps) {
  // If no utterances, show the raw text
  if (!transcript.utterances || transcript.utterances.length === 0) {
    if (transcript.text) {
      return (
        <div className="prose-transcript">
          <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {transcript.text}
          </p>
        </div>
      );
    }
    return (
      <div className="text-center py-8">
        <p className="text-[var(--text-muted)]">No transcript available.</p>
      </div>
    );
  }

  // Group consecutive utterances by speaker for better readability
  const groupedUtterances: { speaker: string; start: number; texts: string[] }[] = [];
  
  transcript.utterances.forEach((utterance: TranscriptUtterance) => {
    const lastGroup = groupedUtterances[groupedUtterances.length - 1];
    
    if (lastGroup && lastGroup.speaker === utterance.speaker) {
      // Same speaker, add to existing group
      lastGroup.texts.push(utterance.text);
    } else {
      // Different speaker, create new group
      groupedUtterances.push({
        speaker: utterance.speaker,
        start: utterance.start,
        texts: [utterance.text],
      });
    }
  });

  return (
    <div className="prose-transcript space-y-4">
      {/* Duration info */}
      {transcript.audio_duration > 0 && (
        <div className="text-sm text-[var(--text-muted)] mb-6 pb-4 border-b border-[var(--border)]">
          Total duration: {formatTime(transcript.audio_duration * 1000)}
        </div>
      )}

      {/* Utterances */}
      {groupedUtterances.map((group, index) => (
        <div key={index} className="flex gap-3">
          {/* Timestamp */}
          <div className="flex-shrink-0 w-14 pt-0.5">
            <span className="text-xs font-mono text-[var(--text-muted)]">
              [{formatTime(group.start)}]
            </span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Speaker label */}
            <span className={`text-sm font-medium ${getSpeakerColor(group.speaker)} mb-1 block`}>
              {getSpeakerLabel(group.speaker)}
            </span>
            
            {/* Transcript text */}
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {group.texts.join(' ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

