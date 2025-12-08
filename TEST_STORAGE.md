# Testing Storage Upload - RLS Policy Check

The NetworkError suggests RLS policies might not be set up correctly. Here's how to verify:

## Quick Test SQL

Run this in Supabase SQL Editor to check if policies exist:

```sql
-- Check existing policies for lecture-audio bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    qual::text LIKE '%lecture-audio%' 
    OR with_check::text LIKE '%lecture-audio%'
  );
```

## Expected Policies

You should see 4 policies with these commands:
1. **INSERT** - for uploading files
2. **SELECT** - for reading files  
3. **UPDATE** - for updating files
4. **DELETE** - for deleting files

## If Policies Are Missing

Run this complete SQL in Supabase SQL Editor:

```sql
-- Delete any existing policies first (optional, only if you want to recreate)
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create INSERT policy (most important for uploads)
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create SELECT policy
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create UPDATE policy
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

-- Create DELETE policy
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Verify Bucket Exists

```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'lecture-audio';
```

This should return one row with `id = 'lecture-audio'` and `public = false`.

## Common Issues

1. **Bucket name mismatch**: Must be exactly `lecture-audio` (lowercase, hyphen)
2. **Missing WITH CHECK**: INSERT policies require `WITH CHECK`, not just `USING`
3. **Wrong folder structure**: The policy expects files in format `{user_id}/{filename}`
4. **Policy not applied to bucket**: Make sure policies reference `bucket_id = 'lecture-audio'`

## After Fixing Policies

1. Clear browser cache or hard refresh (Ctrl+Shift+R)
2. Try uploading again
3. Check browser console for more detailed error messages

