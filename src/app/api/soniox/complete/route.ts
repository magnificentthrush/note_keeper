import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TranscriptResponse, Keypoint } from '@/lib/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Initialize LLM clients
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(apiKey);
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  return new OpenAI({ apiKey });
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

async function generateNotesWithLLM(
  formattedTranscript: string,
  formattedKeypoints: string
): Promise<string> {
  const systemPrompt = `You are a concise note-taker. Your job is to create structured, summarized notes ONLY from what the instructor actually said in the lecture transcript.

STRICT RULES:
- **ONLY** summarize what the instructor actually said - DO NOT add explanations, context, or information not present in the transcript
- DO NOT infer or expand on concepts beyond what was explicitly stated
- Keep notes concise and to the point - avoid redundancy
- Use markdown formatting (headers for topics, bullet points for key points)
- Organize content into clear hierarchical sections based on the transcript flow
- If the transcript is unclear or audio quality was poor, note that briefly

STRUCTURE:
- Use ## for main topics/sections
- Use bullet points for key points within each section
- Keep bullet points brief (1-2 sentences max per point)
- If user marked key points during recording, highlight them with: **🔖 USER NOTE: [note]**

CRITICAL: Do not add any information, explanations, or context that was not explicitly stated by the instructor in the transcript. Only summarize and organize what was actually said.`;

  const userPrompt = `Create concise, structured study notes from this lecture transcript. Only include information that the instructor actually said - do not add explanations or expand on concepts.

## ⭐ USER'S MARKED KEY POINTS:
${formattedKeypoints}

Find these timestamps in the transcript and include them in your notes with the format: **🔖 USER NOTE: [the user's note]**

## Lecture Transcript:
${formattedTranscript}

Create structured notes that:
- Summarize only what the instructor said (no additions or explanations)
- Organize content into clear topics/sections using headers
- Use bullet points for key points (keep each point concise)
- Include the user's marked key points at the relevant sections
- Maintain the original flow and order of topics from the transcript`;

  const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;

  if (hasGemini) {
    console.log('Using Google Gemini for note generation');
    console.log('Initializing Google AI...');
    const genAI = getGeminiClient();

    // Use discovered working models (gemini-2.5-flash was found to work via test script)
    const modelsToTry = [
      process.env.GEMINI_MODEL,   // User-specified model (highest priority)
      'gemini-2.5-flash',         // Latest stable model (discovered via ListModels)
      'gemini-2.5-flash-lite',    // Lighter version
      'gemini-2.5-pro',           // Pro version
      'gemini-flash-latest',      // Latest flash (fallback)
      'gemini-pro-latest',        // Latest pro (fallback)
    ].filter(Boolean) as string[];

    let lastError: Error | null = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Gemini model: ${modelName}`);
        // Explicitly specify the model - the SDK will handle the API version
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          { text: systemPrompt },
          { text: userPrompt },
        ]);
        const response = result.response;
        const text = response.text();
        
        if (text && text.trim().length > 0) {
          console.log(`✅ Successfully used Gemini model: ${modelName}`);
          return text;
        } else {
          throw new Error('Empty response from model');
        }
      } catch (modelError) {
        const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
        console.warn(`Model ${modelName} failed:`, errorMessage);
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        continue;
      }
    }

    // Provide detailed error message with models that were tried
    const modelsTried = modelsToTry.join(', ');
    throw new Error(
      `All Gemini models failed. Tried: ${modelsTried}. ` +
      `Last error: ${lastError?.message}. ` +
      `Please check Google AI Studio (https://aistudio.google.com) for available models or set GEMINI_MODEL in .env.local with a valid model name.`
    );
  } else if (!!process.env.OPENAI_API_KEY) {
    console.log('Using OpenAI for note generation');
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    });
    return completion.choices[0]?.message?.content || 'Unable to generate notes.';
  } else {
    throw new Error('No LLM API key configured. Please set either GOOGLE_GEMINI_API_KEY or OPENAI_API_KEY in .env.local');
  }
}

function extractTitleFromNotes(notes: string): string | null {
  const headingMatch = notes.match(/^#{1,2}\s+(.+)$/m);
  if (headingMatch) {
    let title = headingMatch[1].trim();
    title = title.replace(/\*\*/g, '').replace(/[*_~`]/g, '').trim();
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    if (title.length >= 3 && title.length <= 100) {
      return title;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { lectureId, transcriptText } = await request.json();

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    if (!transcriptText || typeof transcriptText !== 'string') {
      return NextResponse.json({ error: 'Transcript text is required' }, { status: 400 });
    }

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

    // Create a TranscriptResponse structure for compatibility
    // Soniox returns plain text, so we'll store it in a compatible format
    const transcriptResponse: TranscriptResponse = {
      id: (lecture as { soniox_job_id?: string }).soniox_job_id || lectureId,
      status: 'completed',
      text: transcriptText,
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
    const notes = await generateNotesWithLLM(formattedTranscript, formattedKeypoints);

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
      status: 'completed',
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

