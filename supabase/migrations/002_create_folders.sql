-- Create folders table for organizing lectures by course
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to CRUD their own folders
CREATE POLICY "Users can CRUD own folders" ON folders
  FOR ALL USING (auth.uid() = user_id);

-- Add folder_id to lectures table
ALTER TABLE lectures 
  ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_created_at ON folders(created_at DESC);
CREATE INDEX idx_lectures_folder_id ON lectures(folder_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on folders
CREATE TRIGGER update_folders_updated_at 
    BEFORE UPDATE ON folders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();



