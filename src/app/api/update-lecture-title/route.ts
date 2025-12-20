import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const { lectureId, title } = await request.json();

    if (!lectureId || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Lecture ID and title are required' },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update title (RLS ensures user can only update their own lectures)
    const { data, error } = await supabase
      .from('lectures')
      .update({ title: trimmedTitle })
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lecture title:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lecture not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lecture: data });
  } catch (error) {
    console.error('Error in update-lecture-title:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



