import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lectureId = searchParams.get('lectureId');

    if (!lectureId) {
      return NextResponse.json(
        { error: 'Missing lectureId parameter' },
        { status: 400 }
      );
    }

    // Verify the lecture belongs to the user
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('id, audio_url, user_id')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !lecture) {
      return NextResponse.json(
        { error: 'Lecture not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete audio file from storage if it exists
    if (lecture.audio_url) {
      try {
        // Extract file path from URL
        // Format: https://project.supabase.co/storage/v1/object/sign/lecture-audio/userId/lectureId.ext?token=...
        // Or: https://project.supabase.co/storage/v1/object/public/lecture-audio/userId/lectureId.ext
        const urlParts = lecture.audio_url.split('/');
        const audioIndex = urlParts.findIndex(part => part === 'lecture-audio');
        
        if (audioIndex !== -1 && audioIndex < urlParts.length - 1) {
          // Get the path after 'lecture-audio'
          const pathParts = urlParts.slice(audioIndex + 1);
          // Remove query params if present
          const filePath = pathParts.join('/').split('?')[0];
          
          const serviceClient = await createServiceClient();
          const { error: deleteError } = await serviceClient.storage
            .from('lecture-audio')
            .remove([filePath]);

          if (deleteError) {
            console.error('Error deleting audio file:', deleteError);
            // Continue with database deletion even if file deletion fails
          } else {
            console.log('Audio file deleted:', filePath);
          }
        }
      } catch (storageError) {
        console.error('Error processing audio file deletion:', storageError);
        // Continue with database deletion
      }
    }

    // Delete lecture record from database
    const { error: deleteError } = await supabase
      .from('lectures')
      .delete()
      .eq('id', lectureId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting lecture:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete lecture' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}



