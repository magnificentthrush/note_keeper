'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Keypoint } from '@/lib/types';
import Recorder from '@/components/features/recording/Recorder';
import { FolderSelector } from '@/components/features/folder';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader2, LayoutDashboard, User } from 'lucide-react';

function RecordPageContent() {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isLockedFromUrl, setIsLockedFromUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get folderId from URL if present
    const urlFolderId = searchParams.get('folderId');
    if (urlFolderId) {
      setFolderId(urlFolderId);
      setIsLockedFromUrl(true); // Lock the folder selection when coming from URL
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth');
      } else {
        setUser({ id: user.id });
      }
    });
  }, [router]);

  const handleRecordingComplete = async (audioBlob: Blob, keypoints: Keypoint[]) => {
    if (!user) {
      setUploadStatus('Error: Not authenticated');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading recording...');

    try {
      const lectureId = crypto.randomUUID();

      // Upload via API route
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('userId', user.id);
      formData.append('lectureId', lectureId);

      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const audioUrl = uploadResult.signedUrl || uploadResult.url;

      setUploadStatus('Creating lecture record...');

      // Create lecture record with folder_id
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from('lectures')
        .insert({
          id: lectureId,
          user_id: user.id,
          folder_id: folderId, // Include folder_id
          title: title || 'Untitled Lecture',
          audio_url: uploadResult.url,
          user_keypoints: keypoints.map(kp => ({ timestamp: kp.timestamp, note: kp.note })),
          status: 'processing',
        });

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      setUploadStatus('Processing lecture with AI...');

      // Process with AI
      const processResponse = await fetch('/api/process-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId,
          audioUrl,
          keypoints: keypoints.map(kp => ({ timestamp: kp.timestamp, note: kp.note })),
        }),
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        console.error('Processing error:', error);
      }

      router.push(`/lecture/${lectureId}`);
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-[var(--text-primary)]">New Recording</h1>
            <p className="hidden md:block text-sm text-[var(--text-muted)] mt-1">Record a lecture and let AI generate notes</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <LayoutDashboard className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="px-2 md:px-3">
                <User className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Profile</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
          {/* Folder selector */}
          <Card className="p-6 mb-6">
            <FolderSelector
              selectedFolderId={folderId}
              onFolderChange={setFolderId}
              readOnly={isLockedFromUrl}
            />
          </Card>

          {/* Title input */}
          <Card className="p-6 mb-6">
            <Input
              label="Lecture Title"
              placeholder="e.g., Introduction to Machine Learning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Card>

          {/* Recorder */}
          <Card className="p-6">
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)] mb-4" />
                <p className="text-[var(--text-secondary)]">{uploadStatus}</p>
              </div>
            ) : (
              <Recorder onRecordingComplete={handleRecordingComplete} isUploading={isUploading} />
            )}
          </Card>
      </main>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <RecordPageContent />
    </Suspense>
  );
}
