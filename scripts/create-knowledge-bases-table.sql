CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bland_kb_id text,
  name text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED', 'DELETED')),
  type text NOT NULL CHECK (type IN ('FILE', 'TEXT', 'WEB_SCRAPE')),
  text_content text,
  kb_text text,
  file_name text,
  file_size bigint,
  file_type text,
  base_url text,
  source_urls text,
  bland_raw_response jsonb,
  bland_created_at timestamptz,
  bland_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON public.knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_status ON public.knowledge_bases(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_updated_at ON public.knowledge_bases(updated_at DESC);
