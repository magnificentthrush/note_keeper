import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lectureId = body?.lectureId as string | undefined;
    const notes = body?.notes as string | undefined;

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }
    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error: updateError } = await supabase
      .from('lectures')
      .update({
        final_notes: notes.trim(),
        notes_edited: true,
        // User-edited notes can invalidate fact checks; clear to avoid showing stale results.
        fact_checks: null,
      })
      .eq('id', lectureId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update notes:', updateError);
      return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update notes' },
      { status: 500 }
    );
  }
}



