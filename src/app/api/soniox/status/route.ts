import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Soniox API endpoint - GET to check status
// Documentation: https://soniox.com/docs/stt/api-reference
const SONIOX_API_BASE_URL = 'https://api.soniox.com';
const SONIOX_API_ENDPOINT = '/v1/transcriptions';

// Helper function to process tokens into readable text
// Based on renderTokens() from Soniox documentation
function processTokens(tokens: Array<{
  text: string;
  speaker?: string | number;
  language?: string;
  translation_status?: string;
}>): string {
  const textParts: string[] = [];
  let currentSpeaker: string | number | null = null;
  let currentLanguage: string | null = null;

  // Process all tokens in order
  for (const token of tokens) {
    let { text, speaker, language } = token;
    const isTranslation = token.translation_status === 'translation';

    // Speaker changed -> add a speaker tag
    if (speaker !== undefined && speaker !== currentSpeaker) {
      if (currentSpeaker !== null) textParts.push('\n\n');
      currentSpeaker = speaker;
      currentLanguage = null; // Reset language on speaker changes
      textParts.push(`Speaker ${currentSpeaker}:`);
    }

    // Language changed -> add a language or translation tag
    if (language !== undefined && language !== currentLanguage) {
      currentLanguage = language;
      const prefix = isTranslation ? '[Translation] ' : '';
      textParts.push(`\n${prefix}[${currentLanguage}] `);
      text = text.trimStart();
    }

    textParts.push(text);
  }

  return textParts.join('');
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
      } catch (e) {
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
      // Status is completed - fetch the actual transcript
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
      console.log('📋 Full transcript data structure:', JSON.stringify(transcriptData, null, 2).substring(0, 2000));

      // When translation is enabled, Soniox returns translations array with English translation
      // Priority: Use English translation; do NOT include original Urdu text
      let finalTranscript = '';
      
      // 1) translations array (preferred)
      if (Array.isArray(transcriptData.translations) && transcriptData.translations.length > 0) {
        const englishTranslation = transcriptData.translations.find(
          (t: { target_language?: string }) => t.target_language === 'en'
        ) || transcriptData.translations[0];
        
        if (englishTranslation?.text) {
          finalTranscript = englishTranslation.text;
          console.log('✅ Using English translation from translations array');
        }
      }
      
      // 2) translation object (alternate structure)
      if (!finalTranscript && transcriptData.translation?.text) {
        finalTranscript = transcriptData.translation.text;
        console.log('✅ Using translation.text from translation object');
      }
      
      // 3) tokens: use only translation tokens
      if (!finalTranscript && Array.isArray(transcriptData.tokens)) {
        const translationTokens = transcriptData.tokens.filter(
          (t: { translation_status?: string }) => t.translation_status === 'translation'
        );
        if (translationTokens.length > 0) {
          finalTranscript = translationTokens.map((t: { text: string }) => t.text).join('');
          console.log('✅ Extracted English translation from translation tokens');
        } else {
          console.warn('⚠️ No translation tokens found; not using original text to avoid Urdu output');
        }
      }
      
      // 4) If still empty, return empty string to ensure no Urdu is returned
      if (!finalTranscript) {
        finalTranscript = '';
        console.warn('⚠️ No English translation found; returning empty transcript to avoid Urdu output');
      }

      return NextResponse.json({
        status: 'completed',
        text: finalTranscript,
        // Also return raw tokens for potential future processing
        tokens: transcriptData.tokens,
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
