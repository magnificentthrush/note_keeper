-- Add pricing/willingness to pay columns to feedback table
ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS willing_to_pay BOOLEAN,
ADD COLUMN IF NOT EXISTS not_willing_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN feedback.willing_to_pay IS 'Whether user is willing to pay Rs 300/month for subscription';
COMMENT ON COLUMN feedback.not_willing_reason IS 'Reason provided if user is not willing to pay';

