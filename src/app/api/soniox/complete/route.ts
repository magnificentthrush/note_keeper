import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TranscriptResponse, Keypoint, FactCheckItem } from '@/lib/types';
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
  const systemPrompt = `You are an expert academic assistant. Create DETAILED, COMPREHENSIVE study notes from this transcript. Capture all specific examples, technical terms, and explanations. Do not summarize too heavily; preserve the depth of the original content.

STRICT RULES:
- **ONLY** include what the instructor actually said - DO NOT add external information
- Capture ALL specific examples, definitions, technical terms, and explanations mentioned
- Preserve the depth and detail of the original content - do NOT over-summarize
- Use markdown formatting (headers for topics, bullet points for key points)
- Organize content into clear hierarchical sections based on the transcript flow
- If the transcript is unclear or audio quality was poor, note that briefly
- If there are mathematical equations/formulas, represent them in LaTeX math:
  - Inline math: $...$
  - Display math (own line): $$...$$
  - Do NOT spell equations out in English if you can express them as LaTeX.

STRUCTURE:
- Use ## for main topics/sections
- Use ### for subtopics if needed
- Use bullet points for key points within each section
- Include specific details, examples, and explanations under each point
- If user marked key points during recording, highlight them with: **🔖 USER NOTE: [note]**

CRITICAL: Capture the full depth of the lecture content. Include all important details, examples, and explanations that the instructor provided.`;

  const userPrompt = `Create DETAILED, COMPREHENSIVE study notes from this lecture transcript. Capture all specific examples, technical terms, and explanations. Preserve the full depth of the content.

## ⭐ USER'S MARKED KEY POINTS:
${formattedKeypoints}

Find these timestamps in the transcript and include them in your notes with the format: **🔖 USER NOTE: [the user's note]**

## Lecture Transcript:
${formattedTranscript}

Create detailed notes that:
- Capture ALL specific examples, definitions, and explanations mentioned
- Organize content into clear topics/sections using headers and subheaders
- Use bullet points with full detail (not just summaries)
- Include the user's marked key points at the relevant sections
- Maintain the original flow and order of topics from the transcript
- Preserve technical terms and specific details exactly as stated`;

  const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;

  if (hasGemini) {
    console.log('Using Google Gemini for note generation');
    console.log('Initializing Google AI...');
    const genAI = getGeminiClient();

    // Paid quota available: prioritize high-quality 2.5 model, then fast 2.0 lite, then 1.5 fallback
    const modelsToTry = [
      process.env.GEMINI_MODEL,    // User-specified model (highest priority)
      'gemini-2.5-flash',          // Primary (high quality, paid quota)
      'gemini-2.0-flash-lite',     // Backup (high speed)
      'gemini-1.5-flash',          // Fallback
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

        // 2 second delay before trying the next model to avoid hammering rate limits (e.g., 429)
        await new Promise((resolve) => setTimeout(resolve, 2000));
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

function extractJsonArray(text: string): unknown[] | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // ignore
  }

  // Try to extract the first JSON array from free-form output
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start >= 0 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function sanitizeFactChecks(raw: unknown): FactCheckItem[] {
  if (!Array.isArray(raw)) return [];

  const items: FactCheckItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;

    const claim = typeof obj.claim === 'string' ? obj.claim.trim() : '';
    const correction = typeof obj.correction === 'string' ? obj.correction.trim() : '';
    const rationale = typeof obj.rationale === 'string' ? obj.rationale.trim() : '';
    const confidence =
      typeof obj.confidence === 'number'
        ? obj.confidence
        : typeof obj.confidence === 'string'
          ? Number(obj.confidence)
          : NaN;
    const severityRaw = typeof obj.severity === 'string' ? obj.severity.toLowerCase().trim() : '';
    const severity: FactCheckItem['severity'] =
      severityRaw === 'high' || severityRaw === 'medium' || severityRaw === 'low' ? severityRaw : 'low';
    const source_quote = typeof obj.source_quote === 'string' ? obj.source_quote.trim() : undefined;

    // Conservative: only keep high-confidence, well-formed items
    if (!claim || !correction || !rationale) continue;
    if (!Number.isFinite(confidence) || confidence < 0.75) continue;

    items.push({
      claim,
      correction,
      rationale,
      confidence: Math.max(0, Math.min(1, confidence)),
      severity,
      source_quote,
    });
  }

  // Keep it short
  return items.slice(0, 10);
}

async function generateFactChecksWithGemini(params: {
  notes: string;
  transcriptText: string;
}): Promise<FactCheckItem[]> {
  const { notes, transcriptText } = params;

  // Skip if transcript is clearly empty/no-speech placeholder
  const transcriptTrimmed = (transcriptText || '').trim();
  const isNoSpeech = transcriptTrimmed.startsWith('[No speech detected');
  if (isNoSpeech || notes.trim().length < 200) return [];

  const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;
  if (!hasGemini) return [];

  const genAI = getGeminiClient();
  const modelsToTry = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
  ].filter(Boolean) as string[];

  const systemPrompt = `You are a careful academic fact-checker.

Goal: Identify statements that are likely WRONG (factually incorrect) in the lecture content.

STRICT RULES:
- Be conservative: if you are not highly confident a statement is wrong, OUTPUT [].
- Only flag items that are clearly incorrect according to well-established knowledge.
- Do NOT nitpick opinions, teaching style, or ambiguous phrasing.
- The lecture notes below are derived from the transcript; ONLY flag claims that are explicitly present.
- Output MUST be a pure JSON array (no markdown, no prose).
- Each item MUST include: claim, correction, rationale, confidence (0..1), severity (low|medium|high), source_quote.
- confidence must be >= 0.75 only when you are highly confident.
- Keep at most 10 items.`;

  const transcriptExcerpt =
    transcriptTrimmed.length > 12000 ? transcriptTrimmed.slice(0, 12000) + '\n...[truncated]...' : transcriptTrimmed;

  const userPrompt = `Analyze the lecture notes + transcript excerpt and find ONLY the clearly wrong statements.
If there are no clear factual errors, return [].

Lecture notes:
${notes}

Transcript excerpt (optional supporting context):
${transcriptExcerpt}

Return JSON array of objects with keys:
- claim: string (what lecturer taught that is wrong)
- correction: string (the correct information)
- rationale: string (brief explanation why it's wrong)
- confidence: number (0..1)
- severity: "low"|"medium"|"high"
- source_quote: string (verbatim quote from notes or transcript that contains the claim)`;

  let lastError: Error | null = null;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.2 },
      });

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const text = result.response.text();
      const arr = extractJsonArray(text);
      const sanitized = sanitizeFactChecks(arr);
      return sanitized;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.warn('Fact-check generation failed; continuing without fact checks. Last error:', lastError?.message);
  return [];
}

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
    const notes = await generateNotesWithLLM(formattedTranscript, formattedKeypoints);

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

