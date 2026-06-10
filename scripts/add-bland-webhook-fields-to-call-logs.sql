-- Add additional Bland.ai webhook fields to call_logs table

ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS transferred_to VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS record_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS completed BOOLEAN,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS queue_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pre_transfer_duration INTEGER,
  ADD COLUMN IF NOT EXISTS post_transfer_duration INTEGER,
  ADD COLUMN IF NOT EXISTS language VARCHAR(50),
  ADD COLUMN IF NOT EXISTS placement_group VARCHAR(50),
  ADD COLUMN IF NOT EXISTS region VARCHAR(50),
  ADD COLUMN IF NOT EXISTS call_local_time TEXT,
  ADD COLUMN IF NOT EXISTS transcripts_json JSONB,
  ADD COLUMN IF NOT EXISTS pathway_logs_json JSONB,
  ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_call_logs_transferred_at ON call_logs(transferred_at);
