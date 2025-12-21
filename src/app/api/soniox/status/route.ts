import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Soniox API endpoint - GET to check status
// Documentation: https://soniox.com/docs/stt/api-reference
const SONIOX_API_BASE_URL = 'https://api.soniox.com';
const SONIOX_API_ENDPOINT = '/v1/transcriptions';

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

      // Prefer English translation; fallback to original text only if translation missing
      let finalTranscript = transcriptData.text || '';

      if (Array.isArray(transcriptData.translations) && transcriptData.translations.length > 0) {
        const engTranslation = transcriptData.translations.find(
          (t: { target_language?: string }) => t.target_language === 'en'
        );
        if (engTranslation?.text) {
          finalTranscript = engTranslation.text;
          console.log('✅ Using English translation from translations array');
        }
      }

      return NextResponse.json({
        status: 'completed',
        transcript: finalTranscript,
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
