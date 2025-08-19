-- If you prefer "content" over "detailed_description", either add it or rename:
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Core fields
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS agent_type TEXT
    CHECK (agent_type IN ('subagent','tool','integration')),
  ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS raw_markdown TEXT,
  ADD COLUMN IF NOT EXISTS parsed_metadata JSONB DEFAULT '{}'::jsonb;

-- GitHub-related deltas
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS github_issues INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS github_topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_github_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS github_sha TEXT,
  ADD COLUMN IF NOT EXISTS original_author_github_username TEXT,
  ADD COLUMN IF NOT EXISTS original_author_github_url TEXT,
  ADD COLUMN IF NOT EXISTS original_author_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS github_owner_avatar_url TEXT;

-- Import flow
DO $$ BEGIN
  CREATE TYPE import_source AS ENUM ('manual','github_import','api');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_source import_source,
  ADD COLUMN IF NOT EXISTS github_import_hash TEXT;

-- Docs/metadata from your model
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installation_instructions TEXT,
  ADD COLUMN IF NOT EXISTS usage_examples TEXT,
  ADD COLUMN IF NOT EXISTS compatibility_notes TEXT;

-- Stats/settings
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
