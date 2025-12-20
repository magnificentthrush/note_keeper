'use client';

import { AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface AbortConfirmationDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AbortConfirmationDialog({ onConfirm, onCancel }: AbortConfirmationDialogProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <Card 
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[var(--error)]/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-[var(--error)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Abort Recording?
              </h3>
            </div>
          </div>

          {/* Message */}
          <p className="text-[var(--text-secondary)] mb-6">
            Are you sure you want to abort this recording? All progress will be lost and cannot be recovered.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
            >
              Continue Recording
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
            >
              Yes, Abort
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

