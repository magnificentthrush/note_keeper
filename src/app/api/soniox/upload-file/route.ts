import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Soniox API endpoint for file upload
const SONIOX_API_BASE_URL = 'https://api.soniox.com';
const SONIOX_FILES_ENDPOINT = '/v1/files';

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'audio_url is required' }, { status: 400 });
    }

    // Check for API key
    const sonioxApiKey = process.env.SONIOX_API_KEY;
    if (!sonioxApiKey) {
      return NextResponse.json(
        { error: 'SONIOX_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Fetch the audio file from the URL
    console.log('📥 Fetching audio file from URL:', audioUrl);
    const audioResponse = await fetch(audioUrl);
    
    if (!audioResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio file: ${audioResponse.statusText}` },
        { status: 500 }
      );
    }

    const audioBlob = await audioResponse.blob();
    console.log('✅ Audio file fetched, size:', audioBlob.size, 'type:', audioBlob.type);

    // Upload to Soniox
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm'); // Soniox will detect the format

    console.log('📤 Uploading to Soniox:', `${SONIOX_API_BASE_URL}${SONIOX_FILES_ENDPOINT}`);
    
    const sonioxResponse = await fetch(`${SONIOX_API_BASE_URL}${SONIOX_FILES_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sonioxApiKey}`,
        // Don't set Content-Type - let fetch set it with boundary for FormData
      },
      body: formData,
    });

    if (!sonioxResponse.ok) {
      const errorText = await sonioxResponse.text();
      console.error('❌ Soniox file upload error:', sonioxResponse.status, errorText);
      return NextResponse.json(
        { error: `Soniox upload failed: ${errorText}` },
        { status: sonioxResponse.status }
      );
    }

    const fileData = await sonioxResponse.json();
    console.log('✅ File uploaded to Soniox, file_id:', fileData.id);

    return NextResponse.json({
      file_id: fileData.id,
    });
  } catch (error) {
    console.error('❌ Error uploading file to Soniox:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    );
  }
}

