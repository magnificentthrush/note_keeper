# Debugging Storage Upload Issue

If you've fixed the policy in Supabase but still getting NetworkError, try these steps:

## Step 1: Clear Browser Cache & Refresh Session

1. **Hard refresh your browser**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear browser cache** for localhost:3000
3. **Sign out and sign back in** to refresh the auth token

## Step 2: Verify Policy is Actually Applied

Run this SQL in Supabase SQL Editor to verify the policy exists and is correct:

```sql
SELECT 
  policyname,
  cmd,
  with_check,
  pg_get_expr(with_check, 'storage.objects'::regclass) as "Check Expression"
FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass
  AND polname = 'Users can upload to their own folder';
```

**Expected result:** Should show a WITH CHECK expression containing:
- `bucket_id = 'lecture-audio'`
- `(storage.foldername(name))[1] = auth.uid()::text`

## Step 3: Check for Policy Conflicts

Sometimes multiple INSERT policies can conflict. Check:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND cmd = 'INSERT'
ORDER BY policyname;
```

If you see multiple INSERT policies, they might be conflicting. Keep only the correct one.

## Step 4: Test with Fresh Session

The auth token might be stale. Try:

1. Sign out completely
2. Close browser tab
3. Open new tab and sign in again
4. Try upload immediately

## Step 5: Check Browser Console

After trying to upload, check the browser console. You should see:
- ✅ Session valid messages
- 📁 Path check messages
- 🚀 Upload attempt messages

These help diagnose where it's failing.

## Step 6: Verify Bucket Configuration

```sql
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id = 'lecture-audio';
```

Should return:
- `id = 'lecture-audio'`
- `public = false` (must be private)

## Step 7: Manual Policy Recreation

If nothing works, force recreate the policy:

```sql
-- Drop all INSERT policies
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
          AND schemaname = 'storage'
          AND cmd = 'INSERT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol_name);
    END LOOP;
END $$;

-- Create fresh policy
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lecture-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Wait 10 seconds, then try again
```

## Step 8: Check Network Tab

1. Open browser DevTools → Network tab
2. Try uploading
3. Look for the storage upload request
4. Check:
   - Request URL (should be to your Supabase storage endpoint)
   - Request Method (should be POST)
   - Response Status (if visible)
   - Response headers for error details

## Common Issues

1. **Stale auth token**: Sign out/in to refresh
2. **Browser cache**: Hard refresh (Ctrl+Shift+R)
3. **Policy propagation delay**: Wait 10-30 seconds after creating policy
4. **Multiple conflicting policies**: Remove duplicates
5. **CORS issue**: Unlikely with Supabase, but check browser console for CORS errors

## If Still Not Working

Check the browser console for the detailed log messages added to the code. They will show:
- Whether the session is valid
- Whether the file path matches what's expected
- The exact error from Supabase

Share those console logs for further debugging.

