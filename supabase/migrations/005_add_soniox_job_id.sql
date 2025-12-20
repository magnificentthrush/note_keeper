-- Add soniox_job_id column to lectures table for tracking async transcription jobs
ALTER TABLE lectures
  ADD COLUMN IF NOT EXISTS soniox_job_id TEXT;

-- Create index for faster lookups by soniox_job_id
CREATE INDEX IF NOT EXISTS idx_lectures_soniox_job_id ON lectures(soniox_job_id);

