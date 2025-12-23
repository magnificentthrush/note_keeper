'use client';

import { useState } from 'react';
import { Edit2, Save, X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import NoteRenderer from './NoteRenderer';
import { useRouter } from 'next/navigation';

interface EditableNotesProps {
  lectureId: string;
  notes: string;
  notesEdited: boolean;
  aiNotes: string | null;
}

export default function EditableNotes({ lectureId, notes, notesEdited, aiNotes }: EditableNotesProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isApplyingAI, setIsApplyingAI] = useState(false);

  const hasAIDraft = aiNotes && aiNotes !== notes;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/lectures/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId, notes: editedContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save notes');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert(error instanceof Error ? error.message : 'Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(notes);
    setIsEditing(false);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/lectures/regenerate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lectureId, 
          mode: notesEdited ? 'draft' : 'replace' 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate notes');
      }

      router.refresh();
    } catch (error) {
      console.error('Error regenerating notes:', error);
      alert(error instanceof Error ? error.message : 'Failed to regenerate notes');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApplyAI = async () => {
    if (!aiNotes) return;
    
    setIsApplyingAI(true);
    try {
      const response = await fetch('/api/lectures/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId, notes: aiNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply AI notes');
      }

      router.refresh();
    } catch (error) {
      console.error('Error applying AI notes:', error);
      alert(error instanceof Error ? error.message : 'Failed to apply AI notes');
    } finally {
      setIsApplyingAI(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with badge and action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge
            icon={notesEdited ? Edit2 : Sparkles}
            text={notesEdited ? 'Edited by you' : 'AI Notes'}
            variant={notesEdited ? 'default' : 'success'}
          />
          {hasAIDraft && (
            <Badge
              icon={Sparkles}
              text="New AI version available"
              variant="default"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                isLoading={isRegenerating}
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate AI Notes
              </Button>
              {hasAIDraft && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplyAI}
                  isLoading={isApplyingAI}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Apply AI Version
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content card */}
      <Card className="p-8">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[400px] p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="Edit your notes here..."
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                isLoading={isSaving}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <NoteRenderer content={notes} />
        )}
      </Card>
    </div>
  );
}


