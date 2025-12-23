import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { FactCheckItem, Keypoint, TranscriptResponse } from '@/lib/types';

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

export function formatKeypointsForPrompt(keypoints: Keypoint[]): string {
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

export function formatTranscriptForPrompt(transcript: TranscriptResponse): string {
  if (!transcript.utterances || transcript.utterances.length === 0) {
    return transcript.text || 'No transcript available.';
  }

  return transcript.utterances
    .map((utterance) => {
      const speaker =
        utterance.speaker === 'A'
          ? 'Speaker 1 (Instructor)'
          : `Speaker ${utterance.speaker}`;
      const startMins = Math.floor(utterance.start / 60000);
      const startSecs = Math.floor((utterance.start % 60000) / 1000);
      return `[${startMins}:${startSecs.toString().padStart(2, '0')}] ${speaker}: ${utterance.text}`;
    })
    .join('\n\n');
}

export async function generateSonioxNotesWithLLM(params: {
  formattedTranscript: string;
  formattedKeypoints: string;
}): Promise<string> {
  const { formattedTranscript, formattedKeypoints } = params;

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
  - IMPORTANT: If the instructor *mentions or describes* an equation/formula (even in words), you MUST include the actual equation in LaTeX.
    Example: “minus b plus minus root b squared minus 4ac over 2a” → $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

STRUCTURE:
- Use ## for main topics/sections
- Use ### for subtopics if needed
- Use bullet points for key points within each section
- Include specific details, examples, and explanations under each point
- If user marked key points during recording, highlight them with: **🔖 USER NOTE: [note]**

CRITICAL: Capture the full depth of the lecture content. Include all important details, examples, and explanations that the instructor provided.

MANDATORY EQUATIONS SECTION:
- At the END of the notes, add a section titled: "## Formulas & Equations (LaTeX)"
- List EVERY equation/formula mentioned (or described in words) as LaTeX. If none, include the heading and write: "None mentioned."`;

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
- Preserve technical terms and specific details exactly as stated
- Ensure every mentioned/described formula is included as LaTeX and also appears in the final "## Formulas & Equations (LaTeX)" section`;

  const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;

  if (hasGemini) {
    const genAI = getGeminiClient();
    const modelsToTry = [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
    ].filter(Boolean) as string[];

    let lastError: Error | null = null;
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([{ text: systemPrompt }, { text: userPrompt }]);
        const text = result.response.text();

        if (text && text.trim().length > 0) return text;
        throw new Error('Empty response from model');
      } catch (modelError) {
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        // avoid hammering rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error(
      `All Gemini models failed. Tried: ${modelsToTry.join(', ')}. Last error: ${lastError?.message}`
    );
  }

  if (!!process.env.OPENAI_API_KEY) {
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
  }

  throw new Error('No LLM API key configured. Please set either GOOGLE_GEMINI_API_KEY or OPENAI_API_KEY');
}

export function extractTitleFromNotes(notes: string): string | null {
  const headingMatch = notes.match(/^#{1,2}\s+(.+)$/m);
  if (headingMatch) {
    let title = headingMatch[1].trim();
    title = title.replace(/\*\*/g, '').replace(/[*_~`]/g, '').trim();
    if (title.length > 100) title = title.substring(0, 97) + '...';
    if (title.length >= 3 && title.length <= 100) return title;
  }
  return null;
}

function extractJsonArray(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // ignore
  }

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

  return items.slice(0, 10);
}

export async function generateFactChecksWithGemini(params: {
  notes: string;
  transcriptText: string;
}): Promise<FactCheckItem[]> {
  const { notes, transcriptText } = params;

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

      const result = await model.generateContent([{ text: systemPrompt }, { text: userPrompt }]);
      const text = result.response.text();
      const arr = extractJsonArray(text);
      return sanitizeFactChecks(arr);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.warn('Fact-check generation failed; continuing without fact checks. Last error:', lastError?.message);
  return [];
}



