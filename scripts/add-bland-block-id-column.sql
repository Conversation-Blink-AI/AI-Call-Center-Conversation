-- Migration: Add bland_block_id column to phone_numbers table
-- This column stores the block ID returned from Bland AI API when blocking numbers
-- Used to unblock numbers later when wallet balance becomes positive

-- Add the bland_block_id column
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS bland_block_id INTEGER;

-- Create index for better query performance (only on non-null values)
CREATE INDEX IF NOT EXISTS idx_phone_numbers_bland_block_id 
ON phone_numbers(bland_block_id) 
WHERE bland_block_id IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN phone_numbers.bland_block_id IS 'Stores the Bland AI block rule ID returned when blocking this number. Used for unblocking via DELETE /v1/blocked_numbers/{block_id}. Set to NULL after successful unblocking.';


