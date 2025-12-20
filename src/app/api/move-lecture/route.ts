import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// PATCH /api/move-lecture - Move a lecture to a folder (or to uncategorized)
export async function PATCH(request: NextRequest) {
  try {
    const { lectureId, folderId } = await request.json();

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If folderId is provided, verify it belongs to the user
    if (folderId) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .single();

      if (folderError || !folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    // Update the lecture's folder_id
    const { data: lecture, error } = await supabase
      .from('lectures')
      .update({ folder_id: folderId || null })
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error moving lecture:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, lecture });
  } catch (error) {
    console.error('Error in PATCH /api/move-lecture:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



