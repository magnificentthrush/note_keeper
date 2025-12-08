import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { AssemblyAI } from 'assemblyai';
import OpenAI from 'openai';
import { Keypoint, TranscriptResponse } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function getAssemblyAIClient() {
  return new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY!,
  });
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
}

function formatKeypointsForPrompt(keypoints: Keypoint[]): string {
  if (!keypoints || keypoints.length === 0) {
    return 'No key points were marked during this lecture.';
  }
  
  return keypoints
    .map((kp) => {
      const mins = Math.floor(kp.timestamp / 60);
      const secs = kp.timestamp % 60;
      return `- At ${mins}:${secs.toString().padStart(2, '0')}: "${kp.note}"`;
    })
    .join('\n');
}

function formatTranscriptForPrompt(transcript: TranscriptResponse): string {
  if (!transcript.utterances || transcript.utterances.length === 0) {
    return transcript.text || 'No transcript available.';
  }

  return transcript.utterances
    .map((utterance) => {
      const speaker = utterance.speaker === 'A' ? 'Speaker 1 (Instructor)' : `Speaker ${utterance.speaker}`;
      const startMins = Math.floor(utterance.start / 60000);
      const startSecs = Math.floor((utterance.start % 60000) / 1000);
      return `[${startMins}:${startSecs.toString().padStart(2, '0')}] ${speaker}: ${utterance.text}`;
    })
    .join('\n\n');
}

export async function POST(request: NextRequest) {
  try {
    const { lectureId } = await request.json();

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Get the lecture record
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .single();

    if (fetchError || !lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    if (!lecture.audio_url) {
      return NextResponse.json({ error: 'No audio file found' }, { status: 400 });
    }

    // If the URL is a public URL but bucket is private, we need to generate a signed URL
    // Extract the file path from the URL
    let audioUrl = lecture.audio_url;
    const publicUrlPattern = /\/storage\/v1\/object\/public\/lecture-audio\/(.+)/;
    const match = audioUrl.match(publicUrlPattern);
    
    if (match) {
      // Extract file path and generate signed URL
      const filePath = match[1];
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('lecture-audio')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (!signedUrlError && signedUrlData?.signedUrl) {
        audioUrl = signedUrlData.signedUrl;
        console.log('Generated signed URL for AssemblyAI');
      } else {
        console.warn('Failed to generate signed URL, using original URL:', signedUrlError);
      }
    }

    // Update status to processing
    await supabase
      .from('lectures')
      .update({ status: 'processing' })
      .eq('id', lectureId);

    try {
      // Initialize clients inside the request handler
      const assemblyai = getAssemblyAIClient();
      const openai = getOpenAIClient();

      // Step 1: Transcribe with AssemblyAI
      // Use the signed URL if we generated one, otherwise use the original URL
      const transcript = await assemblyai.transcripts.transcribe({
        audio_url: audioUrl,
        speaker_labels: true,
      });

      if (transcript.status === 'error') {
        throw new Error(transcript.error || 'Transcription failed');
      }

      const transcriptData: TranscriptResponse = {
        id: transcript.id,
        status: transcript.status,
        text: transcript.text || '',
        utterances: transcript.utterances?.map((u) => ({
          speaker: u.speaker,
          text: u.text,
          start: u.start,
          end: u.end,
          confidence: u.confidence,
          words: u.words?.map((w) => ({
            text: w.text,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
            speaker: w.speaker || u.speaker,
          })) || [],
        })) || [],
        audio_duration: transcript.audio_duration || 0,
      };

      // Save transcript
      await supabase
        .from('lectures')
        .update({ transcript_json: transcriptData })
        .eq('id', lectureId);

      // Step 2: Generate notes with OpenAI
      const formattedTranscript = formatTranscriptForPrompt(transcriptData);
      const formattedKeypoints = formatKeypointsForPrompt(lecture.user_keypoints || []);

      const systemPrompt = `You are an expert study assistant and note-taker. Your job is to create comprehensive, well-organized study notes from lecture transcripts.

Guidelines:
- Create clear, hierarchical notes with main topics and subtopics
- Use markdown formatting (headers, bullet points, bold for emphasis)
- Summarize key concepts concisely but thoroughly
- When the transcript content aligns with or relates to a user-marked timestamp/note, highlight it using this format: **[IMPORTANT: User's note here]**
- Include speaker context when relevant (e.g., when the instructor emphasizes something or answers a student question)
- Add a brief summary at the end
- If the transcript is unclear or audio quality was poor, note that in your response`;

      const userPrompt = `Please create detailed study notes from this lecture.

## User's Key Points (timestamps they marked as important):
${formattedKeypoints}

## Lecture Transcript:
${formattedTranscript}

Create comprehensive study notes that incorporate and highlight the user's marked key points.`;

      let notes: string;
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        });

        notes = completion.choices[0]?.message?.content || 'Unable to generate notes.';
      } catch (openaiError: any) {
        console.error('OpenAI API error:', openaiError);
        
        // Handle quota/billing errors
        if (openaiError?.status === 429 || openaiError?.message?.includes('quota')) {
          // Save transcript without AI notes if quota exceeded
          notes = `## Transcript Available\n\n**Note:** AI note generation is temporarily unavailable due to API quota limits. The transcript has been saved below.\n\n${transcriptData.text || 'Transcript text not available'}`;
          
          console.warn('OpenAI quota exceeded, saving transcript only');
        } else {
          // For other errors, throw to be caught by outer try-catch
          throw new Error(`OpenAI API error: ${openaiError?.message || 'Failed to generate notes'}`);
        }
      }

      // Save notes and update status
      await supabase
        .from('lectures')
        .update({
          final_notes: notes,
          status: 'completed',
        })
        .eq('id', lectureId);

      return NextResponse.json({ success: true, lectureId });
    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Provide user-friendly error messages
      let errorMessage = 'Processing failed';
      if (processingError instanceof Error) {
        if (processingError.message.includes('quota') || processingError.message.includes('429')) {
          errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI billing or wait for quota to reset.';
        } else if (processingError.message.includes('AssemblyAI')) {
          errorMessage = 'Transcription service error. Please check your AssemblyAI API key and quota.';
        } else {
          errorMessage = processingError.message;
        }
      }
      
      // Update status to error with helpful message
      await supabase
        .from('lectures')
        .update({ 
          status: 'error',
          final_notes: `## Error\n\n${errorMessage}\n\nPlease try again later or check your API service quotas.`
        })
        .eq('id', lectureId);

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
