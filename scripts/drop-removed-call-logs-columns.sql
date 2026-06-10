-- Drop call_logs columns removed from Bland webhook mapping

DROP INDEX IF EXISTS idx_call_logs_twilio_sid;
DROP INDEX IF EXISTS idx_call_logs_inbound;

ALTER TABLE call_logs
  DROP COLUMN IF EXISTS inbound,
  DROP COLUMN IF EXISTS answered_by,
  DROP COLUMN IF EXISTS twilio_sid,
  DROP COLUMN IF EXISTS pathway_version,
  DROP COLUMN IF EXISTS bland_timezone,
  DROP COLUMN IF EXISTS bland_created_at,
  DROP COLUMN IF EXISTS bland_updated_at;
