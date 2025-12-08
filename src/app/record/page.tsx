'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Recorder from '@/components/Recorder';
import BottomNav from '@/components/BottomNav';
import { Keypoint } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function RecordPage() {
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const router = useRouter();
  const supabase = createClient();

  const handleRecordingComplete = async (audioBlob: Blob, keypoints: Keypoint[]) => {
    const lectureTitle = title.trim() || `Lecture ${new Date().toLocaleDateString()}`;
    
    setIsUploading(true);
    setUploadStatus('Creating lecture...');

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user is authenticated
      console.log('User authenticated:', user.id, user.email);

      // Create lecture record first
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .insert({
          user_id: user.id,
          title: lectureTitle,
          user_keypoints: keypoints,
          status: 'processing',
        })
        .select()
        .single();

      if (lectureError) {
        console.error('Lecture creation error:', {
          message: lectureError.message,
          details: lectureError.details,
          hint: lectureError.hint,
          code: lectureError.code,
        });
        throw new Error(`Failed to create lecture: ${lectureError.message || JSON.stringify(lectureError)}`);
      }
      
      if (!lecture) {
        throw new Error('Failed to create lecture: No data returned');
      }

      setUploadStatus('Uploading audio...');

      // Upload via API route to avoid CORS and RLS issues
      // The API route uses service role client which bypasses RLS
      console.log('Uploading via API route (bypasses CORS and RLS)...');
      
      const fileExt = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${user.id}/${lecture.id}.${fileExt}`;
      
      console.log('Uploading file:', fileName, 'Size:', audioBlob.size, 'Type:', audioBlob.type);
      
      // Get auth session for API route
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication session is invalid. Please sign out and sign in again.');
      }

      // Create FormData for API route
      const formData = new FormData();
      formData.append('file', audioBlob, `${lecture.id}.${fileExt}`);
      formData.append('userId', user.id);
      formData.append('lectureId', lecture.id);

      // Upload via API route
      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Upload API error:', errorData);
        throw new Error(errorData.error || 'Failed to upload audio');
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload successful:', uploadResult);
      
      const publicUrl = uploadResult.url;
      
      // For private buckets, we should use signed URLs instead
      // But for now, store the path and generate signed URLs in the API route

      // Update lecture with audio URL
      const { error: updateError } = await supabase
        .from('lectures')
        .update({ audio_url: publicUrl })
        .eq('id', lecture.id);

      if (updateError) {
        console.error('Update error:', {
          message: updateError.message,
          details: updateError.details,
        });
        throw new Error(`Failed to update lecture: ${updateError.message || JSON.stringify(updateError)}`);
      }

      setUploadStatus('Processing with AI...');

      // Trigger AI processing
      const response = await fetch('/api/process-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: lecture.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process lecture');
      }

      // Redirect to lecture view
      router.push(`/lecture/${lecture.id}`);
    } catch (error) {
      console.error('Error uploading recording:', error);
      
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Try to extract message from Supabase error
        const errorObj = error as { message?: string; error?: string; details?: string };
        errorMessage = errorObj.message || errorObj.error || errorObj.details || JSON.stringify(error);
      }
      
      setUploadStatus(`Error: ${errorMessage}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="px-4 py-4 flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lecture title (optional)"
            className="flex-1 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-8 max-w-2xl mx-auto">
        {isUploading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Processing your lecture</h2>
            <p className="text-zinc-400 text-center">{uploadStatus}</p>
            <p className="text-zinc-500 text-sm mt-4 text-center max-w-xs">
              This may take a few minutes. We&apos;re transcribing your audio and generating detailed notes.
            </p>
          </div>
        ) : (
          <Recorder onRecordingComplete={handleRecordingComplete} isUploading={isUploading} />
        )}
      </main>

      <BottomNav />
    </div>
  );
}


