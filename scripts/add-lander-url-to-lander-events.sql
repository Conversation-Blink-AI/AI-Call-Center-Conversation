-- Add lander_url column to lander_events table

ALTER TABLE lander_events
  ADD COLUMN IF NOT EXISTS lander_url TEXT;

CREATE INDEX IF NOT EXISTS idx_lander_events_lander_url ON lander_events(lander_url);
