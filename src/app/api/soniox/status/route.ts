import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

// Soniox API endpoint - GET to check status
// Documentation: https://soniox.com/docs/stt/api-reference
const SONIOX_API_BASE_URL = 'https://api.soniox.com';
const SONIOX_API_ENDPOINT = '/v1/transcriptions';

// Helper function to translate any non-English text to English using Gemini
async function translateToEnglish(text: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ No Gemini API key, returning original text');
    return text;
  }

  // Check if text contains non-ASCII characters (likely Urdu/Arabic script)
  const hasNonEnglish = /[^\x00-\x7F]/.test(text);
  if (!hasNonEnglish) {
    console.log('✅ Text appears to be English-only, no translation needed');
    return text;
  }

  console.log('🔄 Translating non-English text to English...');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a translator. Translate the following transcript to English ONLY. 
The transcript contains mixed Urdu and English. 
- Keep any English parts exactly as they are
- Translate ALL Urdu/non-English text to natural English
- Do NOT add any commentary, notes, or explanations
- Return ONLY the translated transcript text
- Preserve the flow and meaning of the original

Transcript to translate:
${text}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const translatedText = response.text();

    if (translatedText && translatedText.trim().length > 0) {
      console.log('✅ Translation completed successfully');
      return translatedText.trim();
    }
  } catch (error) {
    console.error('❌ Translation failed:', error);
  }

  // Return original if translation fails
  return text;
}

export async function GET(request: NextRequest) {
  try {
    // Get transcriptionId from query params (called jobId for compatibility)
    const { searchParams } = new URL(request.url);
    const transcriptionId = searchParams.get('jobId');

    if (!transcriptionId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Check for API key
    const sonioxApiKey = process.env.SONIOX_API_KEY;
    if (!sonioxApiKey) {
      return NextResponse.json(
        { error: 'SONIOX_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Check transcription status
    const statusUrl = `${SONIOX_API_BASE_URL}${SONIOX_API_ENDPOINT}/${transcriptionId}`;
    console.log('📤 Checking Soniox status:', statusUrl);

    const sonioxResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
      },
    });

    console.log('📥 Soniox Status Response:', sonioxResponse.status, sonioxResponse.statusText);

    if (!sonioxResponse.ok) {
      let errorText: string;
      
      try {
        const responseText = await sonioxResponse.text();
        console.log('❌ Soniox Status Error Response:', responseText);
        
        try {
          const errorJson = JSON.parse(responseText);
          errorText = (errorJson as { error?: string; message?: string }).error 
                   || (errorJson as { error?: string; message?: string }).message 
                   || responseText;
        } catch {
          errorText = responseText || sonioxResponse.statusText;
        }
      } catch {
        errorText = `HTTP ${sonioxResponse.status}: ${sonioxResponse.statusText}`;
      }
      
      if (sonioxResponse.status === 404) {
        return NextResponse.json({ 
          error: 'Transcription not found', 
          status: 'error',
          details: { transcriptionId, url: statusUrl }
        }, { status: 404 });
      }
      
      return NextResponse.json(
        { 
          error: `Soniox API error: ${errorText}`, 
          status: 'error',
          details: { transcriptionId, url: statusUrl }
        },
        { status: sonioxResponse.status }
      );
    }

    const data = await sonioxResponse.json();
    console.log('✅ Soniox Status Data:', JSON.stringify(data, null, 2));
    console.log('📋 Soniox Response Keys:', Object.keys(data));

    // Check status
    const sonioxStatus = data.status?.toLowerCase();
    
    if (sonioxStatus === 'error') {
      // Soniox returns error_type and error_message fields when status is error
      const errorMessage = data.error_message || data.error || data.message || 'Transcription failed';
      const errorType = data.error_type || 'unknown_error';
      
      console.error('❌ Soniox transcription error:', {
        error_type: errorType,
        error_message: errorMessage,
        transcription_id: transcriptionId,
      });
      
      return NextResponse.json({
        status: 'error',
        error: errorMessage,
        error_type: errorType,
      });
    }

    if (sonioxStatus === 'completed') {
      let finalTranscript = '';

      // 1) Try translations from status response first (preferred)
      if (data.translations && Array.isArray(data.translations) && data.translations.length > 0) {
        console.log(`Found ${data.translations.length} translations in status response`);
        const eng = data.translations.find(
          (t: { target_language?: string }) => t.target_language === 'en'
        );
        if (eng) {
          console.log('✅ Using English Translation from Status Object');
          finalTranscript = eng.text;
        }
      } else {
        console.log("⚠️ No 'translations' field found in status response");
      }

      // 2) Fallback: fetch raw transcript only if no translation found
      if (!finalTranscript) {
        console.log('⚠️ No translation found, fetching raw transcript...');
        const transcriptUrl = `${SONIOX_API_BASE_URL}${SONIOX_API_ENDPOINT}/${transcriptionId}/transcript`;
        console.log('📤 Fetching transcript from:', transcriptUrl);

        const transcriptResponse = await fetch(transcriptUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sonioxApiKey}`,
          },
        });

        if (!transcriptResponse.ok) {
          console.error('❌ Failed to fetch transcript:', transcriptResponse.status);
          return NextResponse.json({
            status: 'error',
            error: 'Failed to fetch transcript',
          }, { status: transcriptResponse.status });
        }

        const transcriptData = await transcriptResponse.json();
        console.log('✅ Transcript Data received');
        console.log('📋 Transcript Data keys:', Object.keys(transcriptData));
        console.log('📄 Transcript text value:', transcriptData.text ? `"${transcriptData.text.substring(0, 50)}..."` : 'empty/undefined');
        console.log('🔢 Tokens array length:', transcriptData.tokens?.length || 0);

        // Extract text from text field first, fallback to tokens if empty
        if (transcriptData.text && transcriptData.text.trim().length > 0) {
          finalTranscript = transcriptData.text;
          console.log('✅ Using text field from transcript data');
        } else if (transcriptData.tokens && Array.isArray(transcriptData.tokens) && transcriptData.tokens.length > 0) {
          // Extract text from tokens array
          console.log('⚠️ Text field is empty, extracting from tokens array...');
          const textFromTokens = transcriptData.tokens
            .map((token: { text?: string; word?: string }) => token.text || token.word || '')
            .filter((text: string) => text.trim().length > 0)
            .join(' ')
            .trim();
          
          if (textFromTokens.length > 0) {
            finalTranscript = textFromTokens;
            console.log(`✅ Extracted ${textFromTokens.length} characters from tokens`);
          } else {
            console.error('❌ Tokens array exists but contains no text');
          }
        } else {
          console.error('❌ Both text field and tokens array are empty or missing');
        }

        // Check if we still don't have a transcript
        if (!finalTranscript || finalTranscript.trim().length === 0) {
          // Soniox can return completed with an empty transcript when it detects no speech.
          // Treat this as a valid "no speech" result so the pipeline can complete gracefully.
          console.warn('⚠️ Transcript is empty. Treating as "no speech detected" and returning placeholder transcript.');
          finalTranscript =
            '[No speech detected in this recording. The audio may be silent, too quiet, or the microphone may not have captured input.]';
        }

        if (transcriptData.translations && Array.isArray(transcriptData.translations) && transcriptData.translations.length > 0) {
          console.log(`Found ${transcriptData.translations.length} translations`);
          const eng = transcriptData.translations.find(
            (t: { target_language?: string }) => t.target_language === 'en'
          );
          if (eng) {
            console.log('✅ Swapping original text for English translation (from transcript fetch)');
            finalTranscript = eng.text;
          }
        } else {
          console.log("⚠️ No 'translations' field found in transcript fetch response");
        }
      }

      // Final validation before post-processing
      if (!finalTranscript || finalTranscript.trim().length === 0) {
        console.warn('⚠️ Final transcript still empty after extraction attempts. Using placeholder transcript.');
        finalTranscript =
          '[No speech detected in this recording. The audio may be silent, too quiet, or the microphone may not have captured input.]';
      }

      // Post-process: Translate any remaining non-English text to English using Gemini
      finalTranscript = await translateToEnglish(finalTranscript);

      return NextResponse.json({
        status: 'completed',
        transcript: finalTranscript,
        is_empty_transcript: finalTranscript.startsWith('[No speech detected'),
      });
    }

    // Still processing (queued, transcribing, processing, etc.)
    return NextResponse.json({
      status: 'processing',
    });
  } catch (error) {
    console.error('❌ Error checking Soniox status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check status',
        status: 'error',
      },
      { status: 500 }
    );
  }
}
