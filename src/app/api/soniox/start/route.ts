import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Soniox API endpoint - POST to start transcription
// Documentation: https://soniox.com/docs/stt/api-reference
const SONIOX_API_BASE_URL = 'https://api.soniox.com';
const SONIOX_API_ENDPOINT = '/v1/transcriptions';

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, lectureId, useFileUpload = true } = await request.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'audio_url is required' }, { status: 400 });
    }

    // Check for API key
    const sonioxApiKey = process.env.SONIOX_API_KEY;
    if (!sonioxApiKey) {
      console.error('❌ SONIOX_API_KEY is not configured in environment variables');
      return NextResponse.json(
        { error: 'SONIOX_API_KEY is not configured' },
        { status: 500 }
      );
    }
    
    console.log('✅ API Key found:', sonioxApiKey.substring(0, 8) + '...' + sonioxApiKey.substring(sonioxApiKey.length - 4));
    
    // DEBUG: Log the audio URL
    console.log('DEBUG: Soniox Start URL:', audioUrl);
    
    // Pre-flight check: Validate audio URL integrity
    console.log('🔍 Performing pre-flight check on audio URL...');
    try {
      const headResponse = await fetch(audioUrl, { 
        method: 'HEAD',
        // Add a timeout to avoid hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!headResponse.ok) {
        throw new Error(`HEAD request failed: ${headResponse.status} ${headResponse.statusText}`);
      }
      
      const contentType = headResponse.headers.get('content-type') || '';
      const contentLength = headResponse.headers.get('content-length');
      const contentLengthNum = contentLength ? parseInt(contentLength, 10) : null;
      
      console.log('🔍 Pre-flight check results:');
      console.log('   Content-Type:', contentType);
      console.log('   Content-Length:', contentLength, contentLengthNum !== null ? `(${contentLengthNum} bytes)` : '(not provided)');
      
      // Validate Content-Type - reject error pages
      if (contentType.includes('text/html') || contentType.includes('application/xml')) {
        const errorMsg = `Invalid audio URL: Content-Type is "${contentType}" (likely an error page, not audio)`;
        console.error('❌ Pre-flight check failed:', errorMsg);
        return NextResponse.json(
          { error: errorMsg },
          { status: 400 }
        );
      }
      
      // Validate Content-Length - must be > 0
      if (contentLengthNum !== null && contentLengthNum !== undefined && contentLengthNum === 0) {
        const errorMsg = `Invalid audio URL: Content-Length is 0 (file appears to be empty)`;
        console.error('❌ Pre-flight check failed:', errorMsg);
        return NextResponse.json(
          { error: errorMsg },
          { status: 400 }
        );
      }
      
      // Warn if Content-Length is missing but don't fail (some servers don't provide it)
      if (contentLengthNum === null || contentLengthNum === undefined) {
        console.warn('⚠️ Content-Length header not provided by server (will continue anyway)');
      }
      
      console.log('✅ Pre-flight check passed - URL appears to be valid audio file');
    } catch (preflightError) {
      // Handle timeout or network errors
      if (preflightError instanceof Error && preflightError.name === 'TimeoutError') {
        const errorMsg = 'Pre-flight check timeout: Audio URL did not respond within 10 seconds';
        console.error('❌ Pre-flight check error:', errorMsg);
        return NextResponse.json(
          { error: errorMsg },
          { status: 400 }
        );
      }
      
      const errorMsg = `Pre-flight check failed: ${preflightError instanceof Error ? preflightError.message : 'Unknown error'}`;
      console.error('❌ Pre-flight check error:', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }
    
    // Option 1: Upload file to Soniox first (recommended for webm files)
    // Option 2: Use audio_url directly (may not work for all formats)
    let fileId: string | null = null;
    
    if (useFileUpload) {
      try {
        console.log('📤 Uploading audio file to Soniox first...');
        
        // Fetch the audio file from the URL
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
        }
        
        const audioBlob = await audioResponse.blob();
        console.log('✅ Audio file fetched, size:', audioBlob.size, 'type:', audioBlob.type);

        // Upload to Soniox
        // FormData is available in Node.js 18+ globally
        const formData = new FormData();
        
        // Determine file extension from blob type or URL
        // Prioritize blob type over URL for accuracy
        let filename = 'audio.webm'; // Default fallback
        const blobType = audioBlob.type.toLowerCase();
        
        if (blobType === 'audio/mp4' || blobType.includes('mp4')) {
          filename = 'audio.mp4';
        } else if (audioUrl.includes('.mp3')) {
          filename = 'audio.mp3';
        } else if (audioUrl.includes('.wav')) {
          filename = 'audio.wav';
        } else if (audioUrl.includes('.m4a')) {
          filename = 'audio.m4a';
        } else if (blobType.includes('webm')) {
          filename = 'audio.webm';
        } else if (blobType.includes('ogg')) {
          filename = 'audio.ogg';
        }
        
        console.log('📁 Audio blob type:', audioBlob.type, '→ Filename:', filename);
        
        // Append Blob directly - FormData accepts Blob in Node.js
        formData.append('file', audioBlob, filename);

        const uploadUrl = `${SONIOX_API_BASE_URL}/v1/files`;
        console.log('📤 Uploading to Soniox:', uploadUrl, 'File:', filename, 'Size:', audioBlob.size);
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sonioxApiKey}`,
            // Don't set Content-Type - let fetch set it with boundary for FormData
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          fileId = uploadData.id;
          console.log('✅ File uploaded to Soniox successfully, file_id:', fileId);
        } else {
          const errorText = await uploadResponse.text();
          console.warn('⚠️ File upload failed (status:', uploadResponse.status, '), falling back to audio_url');
          console.warn('Upload error details:', errorText);
        }
      } catch (uploadError) {
        console.warn('⚠️ File upload exception, falling back to audio_url:', uploadError);
        if (uploadError instanceof Error) {
          console.warn('Error message:', uploadError.message);
        }
      }
    }

    console.log('📤 Calling Soniox API:', `${SONIOX_API_BASE_URL}${SONIOX_API_ENDPOINT}`);

    // Build config object according to Soniox documentation
    const config: Record<string, unknown> = {
      // Use async model for transcription
      model: 'stt-async-v3',
      
      // Set language hints for bilingual support (English and Urdu)
      language_hints: ['en', 'ur'],
      
      // Enable language identification - each token will include a "language" field
      enable_language_identification: true,
      
      // Enable speaker diarization - each token will include a "speaker" field
      enable_speaker_diarization: true,
    };

    // Use file_id if available, otherwise fall back to audio_url
    if (fileId) {
      config.file_id = fileId;
      console.log('✅ Using file_id for transcription:', fileId);
    } else {
      config.audio_url = audioUrl;
      console.log('⚠️ WARNING: Falling back to audio_url (file upload may have failed):', audioUrl);
    }

    console.log('📋 Transcription config being sent to Soniox:', JSON.stringify(config, null, 2));

    // Call Soniox to start transcription
    const sonioxResponse = await fetch(`${SONIOX_API_BASE_URL}${SONIOX_API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    console.log('📥 Soniox Response Status:', sonioxResponse.status, sonioxResponse.statusText);

    if (!sonioxResponse.ok) {
      let errorText: string;
      let errorJson: unknown;
      
      try {
        const responseText = await sonioxResponse.text();
        console.log('❌ Soniox Error Response Body:', responseText);
        
        try {
          errorJson = JSON.parse(responseText);
          errorText = (errorJson as { error?: string; message?: string }).error 
                   || (errorJson as { error?: string; message?: string }).message 
                   || responseText;
        } catch {
          errorText = responseText || sonioxResponse.statusText;
        }
      } catch (e) {
        errorText = `HTTP ${sonioxResponse.status}: ${sonioxResponse.statusText}`;
      }
      
      console.error('❌ Soniox API Error:', {
        status: sonioxResponse.status,
        statusText: sonioxResponse.statusText,
        error: errorText,
        url: `${SONIOX_API_BASE_URL}${SONIOX_API_ENDPOINT}`,
      });
      
      return NextResponse.json(
        { 
          error: `Soniox API error (${sonioxResponse.status}): ${errorText || sonioxResponse.statusText}`,
          details: {
            status: sonioxResponse.status,
            url: `${SONIOX_API_BASE_URL}${SONIOX_API_ENDPOINT}`,
          }
        },
        { status: 500 }
      );
    }

    const sonioxData = await sonioxResponse.json();
    console.log('✅ Soniox API Response:', JSON.stringify(sonioxData, null, 2));
    
    // Extract transcription ID from response (field name is "id")
    const transcriptionId = sonioxData.id;

    if (!transcriptionId) {
      console.error('❌ No transcription id in response:', sonioxData);
      return NextResponse.json(
        { 
          error: 'No transcription id returned from Soniox',
          response: sonioxData
        },
        { status: 500 }
      );
    }

    console.log('✅ Soniox transcription started successfully!');
    console.log('   Transcription ID:', transcriptionId);
    console.log('   Used method:', fileId ? 'file_id (uploaded)' : 'audio_url (direct)');
    console.log('   Lecture ID:', lectureId || 'none');

    // If lectureId provided, update the database
    if (lectureId) {
      const supabase = await createServiceClient();
      const { error: updateError } = await supabase
        .from('lectures')
        .update({
          status: 'processing',
          soniox_job_id: transcriptionId, // Store as soniox_job_id for compatibility
        })
        .eq('id', lectureId);
        
      if (updateError) {
        console.error('⚠️ Failed to update lecture in database:', updateError);
      } else {
        console.log('✅ Lecture record updated in database');
      }
    }

    // Return transcription_id immediately to frontend (as job_id for compatibility)
    return NextResponse.json({
      job_id: transcriptionId,
      // Include debug info to help verify the fix is working
      debug: {
        used_file_upload: !!fileId,
        file_id: fileId || null,
        method: fileId ? 'file_id' : 'audio_url',
      },
    });
  } catch (error) {
    console.error('❌ Error starting Soniox transcription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start transcription' },
      { status: 500 }
    );
  }
}
