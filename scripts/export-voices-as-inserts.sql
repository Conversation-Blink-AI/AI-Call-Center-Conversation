-- =============================================================================
-- 1) Run this file against the SOURCE database (dev) — the DB that has data.
-- 2) Copy the printed rows (each line is a full SQL statement).
-- 3) Run those statements on the TARGET database (main/prod).
--
-- Example:
--   psql "$DEV_DATABASE_URL" -f scripts/export-voices-as-inserts.sql -t -A > voices_inserts.sql
--   # Review voices_inserts.sql, then:
--   psql "$MAIN_DATABASE_URL" -f voices_inserts.sql
--
-- Uses ON CONFLICT (voice_id) so re-running updates existing rows safely.
-- =============================================================================

SELECT concat(
  'INSERT INTO voices (name, description, voice_id, tags, gender) VALUES (',
  quote_literal(name), ', ',
  quote_literal(description), ', ',
  quote_literal(voice_id), ', ',
  quote_literal(tags::text), '::text[], ',
  CASE WHEN gender IS NULL THEN 'NULL' ELSE quote_literal(gender::text) END,
  ') ON CONFLICT (voice_id) DO UPDATE SET ',
  'name = EXCLUDED.name, ',
  'description = EXCLUDED.description, ',
  'tags = EXCLUDED.tags, ',
  'gender = EXCLUDED.gender, ',
  'updated_at = NOW();'
) AS insert_statement
FROM voices
ORDER BY name;
