-- Voices catalog (used by GET /api/voices, admin voices, voice previews).
-- Run against your main/prod database, e.g.:
--   psql "$DATABASE_URL" -f scripts/create-voices-table.sql
-- Or paste into your host’s SQL console (DigitalOcean, RDS, etc.).

CREATE TABLE IF NOT EXISTS voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    voice_id VARCHAR(255) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    gender VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS voices_voice_id_key ON voices (voice_id);
CREATE INDEX IF NOT EXISTS voices_name_idx ON voices (name);

COMMENT ON TABLE voices IS 'Bland (or provider) voice catalog; voice_id must match provider API id for samples/calls.';

-- After creating the table, load rows from your dev DB (replace voice_id with real Bland IDs):
--
--   INSERT INTO voices (name, description, voice_id, tags, gender) VALUES
--   ('Chris', 'Calm and clear voice with a neutral tone.', 'YOUR_BLAND_VOICE_ID',
--    ARRAY['male','american','neutral','narration'], 'male'),
--   ('clara', 'Clear, friendly voice with a neutral accent.', 'YOUR_BLAND_VOICE_ID',
--    ARRAY['female','neutral accent','friendly','narration'], 'female');
--
-- Easiest: on dev, run:
--   SELECT name, description, voice_id, tags, gender FROM voices ORDER BY name;
-- Then INSERT the same values into prod (or use pg_dump --data-only --table=voices on dev).
