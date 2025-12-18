import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { AssemblyAI } from 'assemblyai';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Keypoint, TranscriptResponse } from '@/lib/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function getAssemblyAIClient() {
  return new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY!,
  });
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not set in environment variables');
  }
  
  return new GoogleGenerativeAI(apiKey);
}

// Generate notes using the configured LLM provider
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

  // Check which LLM provider to use (prefer Gemini if available, fallback to OpenAI)
  const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;

  if (hasGemini) {
    // Prefer Gemini (free tier) if available
    console.log('Using Google Gemini for note generation');
    const genAI = getGeminiClient();
    
    // Try different model names in order of preference
    // Note: Model availability depends on your API key, region, and API version
    const modelNames = [
      process.env.GEMINI_MODEL, // User-specified model (highest priority)
      'gemini-1.5-flash',       // Latest fast model (recommended for free tier)
      'gemini-1.5-pro',         // Latest pro model
      'gemini-pro',             // Legacy model
      'gemini-2.5-flash-lite',  // Newer flash variant
      'gemini-3-pro',           // Latest pro variant (may require paid tier)
    ].filter(Boolean) as string[];
    
    let lastError: Error | null = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.4, // Lower temperature for more factual, less creative output
          },
        });
        
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          console.log(`Successfully used model: ${modelName}`);
          return text;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Model ${modelName} failed:`, errorMessage);
        lastError = error instanceof Error ? error : new Error(String(error));
        // Continue to next model
      }
    }
    
    // If all models failed, throw the last error with helpful message
    throw new Error(
      `All Gemini models failed. Last error: ${lastError?.message}. ` +
      `Available models might have changed. Please check Google AI Studio or set GEMINI_MODEL in .env.local`
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

// Extract a title from the generated notes
function extractTitleFromNotes(notes: string): string | null {
  // Try to find the first markdown heading (# or ##)
  const headingMatch = notes.match(/^#{1,2}\s+(.+)$/m);
  if (headingMatch) {
    let title = headingMatch[1].trim();
    // Remove any markdown formatting like ** or *
    title = title.replace(/\*+/g, '').trim();
    // Remove common prefixes
    title = title.replace(/^(Lecture Notes:|Notes:|Study Notes:|Summary:)\s*/i, '').trim();
    if (title.length > 3) {
      // Truncate to 60 characters max
      return title.length > 60 ? title.substring(0, 57) + '...' : title;
    }
  }
  
  // Try to find the first bold text as a title candidate
  const boldMatch = notes.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) {
    const title = boldMatch[1].trim();
    if (title.length > 3 && title.length < 80) {
      return title.length > 60 ? title.substring(0, 57) + '...' : title;
    }
  }
  
  // Try to get a meaningful phrase from the first paragraph
  const lines = notes.split('\n').filter(line => line.trim().length > 10);
  if (lines.length > 0) {
    let firstLine = lines[0].trim();
    // Remove markdown formatting
    firstLine = firstLine.replace(/^[#*>\-\s]+/, '').trim();
    if (firstLine.length > 10) {
      // Take first sentence or truncate
      const sentenceEnd = firstLine.search(/[.!?]/);
      if (sentenceEnd > 0 && sentenceEnd < 60) {
        return firstLine.substring(0, sentenceEnd);
      }
      return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
    }
  }
  
  return null;
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
      // Initialize AssemblyAI client for transcription
      const assemblyai = getAssemblyAIClient();

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

      // Step 2: Generate notes with LLM (Gemini or OpenAI)
      const formattedTranscript = formatTranscriptForPrompt(transcriptData);
      const formattedKeypoints = formatKeypointsForPrompt(lecture.user_keypoints || []);

      let notes: string;
      try {
        console.log('Generating notes with LLM...');
        console.log('Gemini API Key present:', !!process.env.GOOGLE_GEMINI_API_KEY);
        console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
        
        notes = await generateNotesWithLLM(formattedTranscript, formattedKeypoints);
        console.log('Notes generated successfully, length:', notes.length);
      } catch (llmError: unknown) {
        const errorObj = llmError as { status?: number; statusText?: string; message?: string; code?: string; type?: string; error?: unknown };
        console.error('LLM API error details:', {
          status: errorObj?.status,
          statusText: errorObj?.statusText,
          message: errorObj?.message,
          code: errorObj?.code,
          type: errorObj?.type,
          error: errorObj?.error,
        });
        
        const errorMessage = errorObj?.message || '';
        const errorStatus = errorObj?.status;
        
        // Check for specific quota/billing errors
        const isQuotaError = 
          errorStatus === 429 || 
          errorMessage.includes('quota') || 
          errorMessage.includes('billing') ||
          errorMessage.includes('limit') ||
          errorMessage.includes('exceeded');
        
        // Check for authentication errors
        const isAuthError = 
          errorStatus === 401 || 
          errorMessage.includes('Invalid API key') ||
          errorMessage.includes('Incorrect API key') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('API key');
        
        if (isAuthError) {
          throw new Error(`LLM API authentication failed. Please check your API key in .env.local file. Error: ${errorMessage}`);
        }
        
        if (isQuotaError) {
          // Save transcript without AI notes if quota exceeded
          notes = `## Transcript Available\n\n**Note:** AI note generation is temporarily unavailable due to API quota limits.\n\nThe transcript has been saved below:\n\n${transcriptData.text || 'Transcript text not available'}`;
          console.warn('LLM quota exceeded, saving transcript only');
        } else {
          // For other errors, throw with better message
          throw new Error(`LLM API error: ${errorMessage || 'Failed to generate notes. Status: ' + errorStatus}`);
        }
      }

      // Save notes and update status
      // Also auto-generate title from notes if user didn't provide one
      const updateData: { final_notes: string; status: string; title?: string } = {
        final_notes: notes,
        status: 'completed',
      };

      // Check if the lecture has a default/untitled title
      if (!lecture.title || lecture.title === 'Untitled Lecture') {
        const extractedTitle = extractTitleFromNotes(notes);
        if (extractedTitle) {
          updateData.title = extractedTitle;
          console.log('Auto-generated title from notes:', extractedTitle);
        }
      }

      await supabase
        .from('lectures')
        .update(updateData)
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
