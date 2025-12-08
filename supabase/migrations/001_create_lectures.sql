-- Create lectures table
CREATE TABLE lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  audio_url TEXT,
  transcript_json JSONB,
  user_keypoints JSONB DEFAULT '[]',
  final_notes TEXT,
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

-- Create policy for users to CRUD their own lectures
CREATE POLICY "Users can CRUD own lectures" ON lectures
  FOR ALL USING (auth.uid() = user_id);

-- Create index for faster user queries
CREATE INDEX idx_lectures_user_id ON lectures(user_id);
CREATE INDEX idx_lectures_created_at ON lectures(created_at DESC);

-- Storage bucket setup instructions:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create a new bucket named "lecture-audio"
-- 3. Set it to private (authenticated access only)
-- 4. Add RLS policy:
--    - Allow authenticated users to upload to their own folder: ((bucket_id = 'lecture-audio'::text) AND (auth.uid() = (storage.foldername(name))[1]::uuid))
--    - Allow authenticated users to read their own files

