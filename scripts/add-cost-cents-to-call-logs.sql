-- Add cost_cents column to call_logs table if it doesn't exist
-- This allows tracking call costs in the call_logs table

ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS cost_cents INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN call_logs.cost_cents IS 'Call cost in cents (nullable)';
