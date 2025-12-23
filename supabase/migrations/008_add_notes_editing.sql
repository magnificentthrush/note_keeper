-- Add support for user-edited notes + safe AI regeneration drafts
ALTER TABLE lectures
ADD COLUMN IF NOT EXISTS notes_edited BOOLEAN NOT NULL DEFAULT FALSE;

-- Stores the latest AI-generated notes (draft), so regeneration doesn't overwrite user edits
ALTER TABLE lectures
ADD COLUMN IF NOT EXISTS ai_notes TEXT;



