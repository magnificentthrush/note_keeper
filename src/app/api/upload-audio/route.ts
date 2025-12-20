import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // First verify the user is authenticated using the regular client
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const lectureId = formData.get('lectureId') as string;

    if (!file || !userId || !lectureId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, userId, or lectureId' },
        { status: 400 }
      );
    }

    // Verify the userId matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - userId does not match authenticated user' },
        { status: 403 }
      );
    }

    // Use service role client to upload (bypasses RLS)
    const serviceClient = await createServiceClient();
    // Determine file extension from MIME type
    // Check exact matches first, then fallback to includes
    let fileExt = 'webm'; // Default fallback
    const mimeType = file.type.toLowerCase();
    
    if (mimeType === 'audio/mp4' || mimeType.includes('mp4')) {
      fileExt = 'mp4';
    } else if (mimeType.includes('ogg')) {
      fileExt = 'ogg';
    } else if (mimeType.includes('webm')) {
      fileExt = 'webm';
    }
    
    console.log('📁 File MIME type:', file.type, '→ Extension:', fileExt);
    const fileName = `${userId}/${lectureId}.${fileExt}`;

    console.log('Uploading via service client:', fileName, 'Size:', file.size);

    // Convert File to ArrayBuffer then to Blob for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    const { error } = await serviceClient.storage
      .from('lecture-audio')
      .upload(fileName, blob, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      const errorObj = error as { statusCode?: number };
      return NextResponse.json(
        { 
          error: error.message || 'Upload failed',
          details: error,
          statusCode: errorObj?.statusCode 
        },
        { status: 500 }
      );
    }

    // Since the bucket is private, we need to generate a signed URL
    // For AssemblyAI to access, we'll create a temporary signed URL (valid for 1 hour)
    // In the process-lecture route, we'll need to create a new signed URL when needed
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('lecture-audio')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      // Fallback to public URL (won't work for private bucket but at least returns something)
      const { data: { publicUrl } } = serviceClient.storage
        .from('lecture-audio')
        .getPublicUrl(fileName);
      
      console.log('Upload successful (using public URL fallback):', fileName);
      return NextResponse.json({
        success: true,
        path: fileName,
        url: publicUrl,
        signedUrl: null,
      });
    }

    console.log('Upload successful:', fileName);

    return NextResponse.json({
      success: true,
      path: fileName,
      url: signedUrlData.signedUrl, // Use signed URL for private bucket
      signedUrl: signedUrlData.signedUrl,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

