# Storage Bucket Setup Guide

The upload error is occurring because the Supabase Storage bucket needs to be created and configured. Follow these steps:

## Step 1: Create the Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"**
5. Enter bucket name: `lecture-audio`
6. Set bucket to **Private** (uncheck "Public bucket")
7. Click **"Create bucket"**

## Step 2: Set Up RLS Policies

1. In Supabase Dashboard, go to **Storage** → **Policies**
2. Click on the `lecture-audio` bucket
3. Click **"New Policy"**

Or run the SQL from `supabase/migrations/002_setup_storage.sql` in the **SQL Editor**.

### Required Policies:

#### Policy 1: Allow uploads to own folder
- Policy name: "Users can upload to their own folder"
- Operation: INSERT
- Target roles: authenticated
- USING expression: Leave empty
- WITH CHECK expression:
```sql
bucket_id = 'lecture-audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 2: Allow reading own files
- Policy name: "Users can read their own files"
- Operation: SELECT
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'lecture-audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 3: Allow updating own files
- Policy name: "Users can update their own files"
- Operation: UPDATE
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'lecture-audio' AND (storage.foldername(name))[1] = auth.uid()::text
```
- WITH CHECK expression:
```sql
bucket_id = 'lecture-audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 4: Allow deleting own files
- Policy name: "Users can delete their own files"
- Operation: DELETE
- Target roles: authenticated
- USING expression:
```sql
bucket_id = 'lecture-audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

## Step 3: Quick Setup via SQL (Recommended)

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the contents of `supabase/migrations/002_setup_storage.sql`
3. Click **Run**

**Note:** If the bucket doesn't exist yet, you'll need to create it manually first in the Storage section (Step 1).

## Step 4: Verify Setup

After setting up, try uploading a recording again. The error should be resolved.

## Troubleshooting

- **"Bucket not found"**: Make sure you created the bucket named exactly `lecture-audio`
- **"new row violates row-level security"**: Make sure all 4 RLS policies are created
- **Network error**: Check that your Supabase URL and keys are correct in `.env.local`

