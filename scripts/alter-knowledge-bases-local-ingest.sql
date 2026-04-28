-- Switch knowledge_bases to local ingestion (no Bland KB API).
-- - bland_kb_id becomes optional (nullable + drop UNIQUE) since we no longer
--   own a remote Bland KB id for new rows.
-- - Add kb_text: the AI-distilled snippet that gets injected into the
--   pathway "Knowledge Base" node's `kb` field on export.
--
-- Safe to run multiple times.
--
--   psql "$DATABASE_URL" -f scripts/alter-knowledge-bases-local-ingest.sql

-- Drop the UNIQUE constraint on bland_kb_id (named or via index lookup).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'knowledge_bases'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%bland_kb_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.knowledge_bases DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Drop any leftover unique index on bland_kb_id.
DROP INDEX IF EXISTS public.knowledge_bases_bland_kb_id_key;

-- Make bland_kb_id nullable (legacy rows still hold their value).
ALTER TABLE public.knowledge_bases
  ALTER COLUMN bland_kb_id DROP NOT NULL;

-- Distilled snippet that goes into the pathway node's `kb` field.
ALTER TABLE public.knowledge_bases
  ADD COLUMN IF NOT EXISTS kb_text text;
