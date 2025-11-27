-- Add Bland.ai built-in variables to call_logs table
-- Run this migration to add location and phone number fields

-- Add new columns for Bland.ai built-in variables
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50), -- The other party's number (always the other party)
ADD COLUMN IF NOT EXISTS country VARCHAR(10), -- Country code (e.g., US)
ADD COLUMN IF NOT EXISTS state VARCHAR(10), -- State/province abbreviation (e.g., CA)
ADD COLUMN IF NOT EXISTS city VARCHAR(100), -- Full city name, capitalized
ADD COLUMN IF NOT EXISTS zip VARCHAR(20), -- Zip code
ADD COLUMN IF NOT EXISTS short_from VARCHAR(50), -- Outbound number with country code removed
ADD COLUMN IF NOT EXISTS short_to VARCHAR(50), -- Inbound number with country code removed
ADD COLUMN IF NOT EXISTS call_timezone TIMESTAMP WITH TIME ZONE, -- {{now}} - Current time in call's timezone
ADD COLUMN IF NOT EXISTS call_time_utc TIMESTAMP WITH TIME ZONE; -- {{now_utc}} - Current time in UTC

-- Add indexes for the new location fields
CREATE INDEX IF NOT EXISTS idx_call_logs_country ON call_logs(country);
CREATE INDEX IF NOT EXISTS idx_call_logs_state ON call_logs(state);
CREATE INDEX IF NOT EXISTS idx_call_logs_city ON call_logs(city);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number ON call_logs(phone_number);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_logs' 
AND column_name IN ('phone_number', 'country', 'state', 'city', 'zip', 'short_from', 'short_to', 'call_timezone', 'call_time_utc')
ORDER BY ordinal_position;

