import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Keypoint, TranscriptResponse } from '@/lib/types';
import {
  extractTitleFromNotes,
  formatKeypointsForPrompt,
  formatTranscriptForPrompt,
  generateFactChecksWithGemini,
  generateSonioxNotesWithLLM,
} from '@/lib/notes/soniox-llm';

export const dynamic = 'force-dynamic';

type RegenerateMode = 'draft' | 'replace';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lectureId = body?.lectureId as string | undefined;
    const requestedMode = body?.mode as RegenerateMode | undefined;

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    const transcript = (lecture as { transcript_json?: TranscriptResponse | null }).transcript_json;
    if (!transcript || typeof transcript !== 'object') {
      return NextResponse.json({ error: 'Transcript not available for regeneration' }, { status: 400 });
    }

    const transcriptText = (transcript as TranscriptResponse).text || '';
    const formattedTranscript = formatTranscriptForPrompt(transcript);
    const keypoints = (lecture as { user_keypoints?: Keypoint[] }).user_keypoints || [];
    const formattedKeypoints = formatKeypointsForPrompt(keypoints);

    const notes = await generateSonioxNotesWithLLM({ formattedTranscript, formattedKeypoints });

    // If lecture is "Untitled Lecture", allow regeneration to populate a better title (only on replace)
    const extractedTitle = lecture.title === 'Untitled Lecture' ? extractTitleFromNotes(notes) : null;

    const notesEdited = !!(lecture as { notes_edited?: boolean }).notes_edited;
    const mode: RegenerateMode =
      requestedMode === 'replace' || requestedMode === 'draft'
        ? requestedMode
        : (notesEdited ? 'draft' : 'replace');

    if (mode === 'draft') {
      const { error: updateError } = await supabase
        .from('lectures')
        .update({
          ai_notes: notes,
          // keep final_notes untouched to preserve user edits
        })
        .eq('id', lectureId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to save regenerated draft notes:', updateError);
        return NextResponse.json({ error: 'Failed to save regenerated notes' }, { status: 500 });
      }

      return NextResponse.json({ success: true, mode: 'draft' });
    }

    // mode === 'replace': overwrite final_notes and reset edited flag
    let factChecks = [];
    try {
      factChecks = await generateFactChecksWithGemini({ notes, transcriptText });
    } catch (e) {
      console.warn('Fact-check regeneration failed; continuing without fact checks:', e);
      factChecks = [];
    }

    const updateData: Record<string, unknown> = {
      final_notes: notes,
      ai_notes: notes,
      notes_edited: false,
      status: 'completed',
      fact_checks: factChecks,
    };
    if (extractedTitle) updateData.title = extractedTitle;

    const { error: updateError } = await supabase
      .from('lectures')
      .update(updateData)
      .eq('id', lectureId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to replace notes:', updateError);
      return NextResponse.json({ error: 'Failed to replace notes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: 'replace' });
  } catch (error) {
    console.error('Error regenerating notes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate notes' },
      { status: 500 }
    );
  }
}


