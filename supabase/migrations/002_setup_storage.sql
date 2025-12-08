-- Storage bucket setup for lecture-audio
-- This file provides SQL to create the bucket and set up RLS policies
-- Note: Bucket creation via SQL requires Supabase CLI or manual creation in dashboard
-- Run the bucket creation first, then apply the policies below

-- Step 1: Create the bucket (run this in Supabase SQL Editor if bucket doesn't exist)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('lecture-audio', 'lecture-audio', false)
-- ON CONFLICT (id) DO NOTHING;

-- Step 2: Create RLS policy for uploading files to user's own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 3: Create RLS policy for reading files from user's own folder
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 4: Create RLS policy for updating files in user's own folder
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 5: Create RLS policy for deleting files from user's own folder
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

