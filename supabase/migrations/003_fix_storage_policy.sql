-- Fix broken INSERT policy for lecture-audio storage bucket
-- This migration drops the malformed policy and creates a corrected one

-- Step 1: Drop the broken INSERT policy
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;

-- Step 2: Create the corrected INSERT policy
-- This policy allows authenticated users to upload files to the lecture-audio bucket
-- but only to folders that match their auth.uid()
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 3: Verify the policy was created correctly
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN with_check::text LIKE '%bucket_id%' AND with_check::text LIKE '%lecture-audio%' THEN '✅ Has bucket check'
    ELSE '❌ Missing bucket check'
  END as bucket_check,
  CASE 
    WHEN with_check::text LIKE '%auth.uid()%' THEN '✅ Has user check'
    ELSE '❌ Missing user check'
  END as user_check,
  CASE 
    WHEN with_check::text LIKE '%foldername%' THEN '✅ Has folder check'
    ELSE '❌ Missing folder check'
  END as folder_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname = 'Users can upload to their own folder';

