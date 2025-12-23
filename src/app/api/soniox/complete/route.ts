import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TranscriptResponse, FactCheckItem } from '@/lib/types';
import {
  extractTitleFromNotes,
  formatKeypointsForPrompt,
  formatTranscriptForPrompt,
  generateFactChecksWithGemini,
  generateSonioxNotesWithLLM,
} from '@/lib/notes/soniox-llm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lectureId, transcriptText } = body;

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    // Handle empty or missing transcript gracefully
    const finalTranscript = (transcriptText && typeof transcriptText === 'string' && transcriptText.trim().length > 0) 
      ? transcriptText 
      : "[No speech detected in this recording. The audio may be silent or too short.]";

    const supabase = await createServiceClient();

    // Get lecture record for user keypoints
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .single();

    if (fetchError || !lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    // Idempotency: If notes already exist (and lecture is already completed), do NOT regenerate/overwrite.
    // This prevents accidental double-calls (e.g., polling overlap) from changing notes or clearing fact checks.
    if ((lecture as { status?: string }).status === 'completed' && (lecture as { final_notes?: string | null }).final_notes) {
      console.log('✅ Lecture already completed with notes. Skipping regeneration:', lectureId);
      return NextResponse.json({
        success: true,
        lectureId,
        title: lecture.title,
        skipped: true,
      });
    }

    // Create a TranscriptResponse structure for compatibility
    // Soniox returns plain text, so we'll store it in a compatible format
    const transcriptResponse: TranscriptResponse = {
      id: (lecture as { soniox_job_id?: string }).soniox_job_id || lectureId,
      status: 'completed',
      text: finalTranscript,
      utterances: [], // Soniox tokens format is different, we'll use plain text for now
      audio_duration: 0,
    };

    // Save the transcript
    await supabase
      .from('lectures')
      .update({ transcript_json: transcriptResponse })
      .eq('id', lectureId);

    // Generate notes with LLM
    const formattedTranscript = formatTranscriptForPrompt(transcriptResponse);
    const formattedKeypoints = formatKeypointsForPrompt(lecture.user_keypoints || []);

    console.log('Generating notes for lecture:', lectureId);
    const notes = await generateSonioxNotesWithLLM({
      formattedTranscript,
      formattedKeypoints,
    });

    // Fact check pass (conservative: returns [] unless confident)
    let factChecks: FactCheckItem[] = [];
    try {
      console.log('Running fact-check pass with Gemini...');
      factChecks = await generateFactChecksWithGemini({ notes, transcriptText: finalTranscript });
      console.log(`Fact-check items: ${factChecks.length}`);
    } catch (e) {
      console.warn('Fact-check pass failed; continuing without fact checks:', e);
      factChecks = [];
    }

    // Extract title from notes if lecture title is "Untitled Lecture"
    let newTitle: string | undefined;
    if (lecture.title === 'Untitled Lecture') {
      const extractedTitle = extractTitleFromNotes(notes);
      if (extractedTitle) {
        newTitle = extractedTitle;
        console.log('Extracted title from notes:', newTitle);
      }
    }

    // Update lecture with notes and completed status
    const updateData: Record<string, unknown> = {
      final_notes: notes,
      ai_notes: notes,
      notes_edited: false,
      status: 'completed',
      fact_checks: factChecks,
    };

    if (newTitle) {
      updateData.title = newTitle;
    }

    const { error: updateError } = await supabase
      .from('lectures')
      .update(updateData)
      .eq('id', lectureId);

    if (updateError) {
      console.error('Failed to update lecture:', updateError);
      return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
    }

    console.log('Lecture processing complete:', lectureId);

    return NextResponse.json({
      success: true,
      lectureId,
      title: newTitle || lecture.title,
    });
  } catch (error) {
    console.error('Error completing transcription:', error);

    // Update lecture status to error
    if (request.body) {
      try {
        const body = await request.clone().json();
        if (body.lectureId) {
          const supabase = await createServiceClient();
          await supabase
            .from('lectures')
            .update({ status: 'error' })
            .eq('id', body.lectureId);
        }
      } catch {
        // Ignore parsing errors
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete transcription' },
      { status: 500 }
    );
  }
}

