-- Allow status = 'DELETED' for Bland soft-delete sync.
-- Required if the table was created with CHECK (status IN ('PROCESSING','COMPLETED','FAILED')) only.
--
--   psql "$DATABASE_URL" -f scripts/alter-knowledge-bases-add-deleted-status.sql

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
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%status%'
      AND pg_get_constraintdef(c.oid) LIKE '%IN%'
  LOOP
    EXECUTE format('ALTER TABLE public.knowledge_bases DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.knowledge_bases
  ADD CONSTRAINT knowledge_bases_status_check
  CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED', 'DELETED'));
