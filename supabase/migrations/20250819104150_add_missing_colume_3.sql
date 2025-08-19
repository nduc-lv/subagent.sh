ALTER TABLE public.agents
  -- Basic fields
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,

  -- Sub-agent specific
  ADD COLUMN IF NOT EXISTS agent_type TEXT
    CHECK (agent_type IN ('subagent','tool','integration')),
  ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS raw_markdown TEXT,
  ADD COLUMN IF NOT EXISTS parsed_metadata JSONB DEFAULT '{}'::jsonb,

  -- GitHub integration
  ADD COLUMN IF NOT EXISTS github_issues INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS github_last_updated TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS github_language TEXT,
  ADD COLUMN IF NOT EXISTS github_topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS github_license TEXT,
  ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_github_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS github_sha TEXT,

  -- Original Author Attribution
  ADD COLUMN IF NOT EXISTS original_author_github_username TEXT,
  ADD COLUMN IF NOT EXISTS original_author_github_url TEXT,
  ADD COLUMN IF NOT EXISTS original_author_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS github_owner_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_source TEXT CHECK (import_source IN ('manual','github_import','api')),
  ADD COLUMN IF NOT EXISTS github_import_hash TEXT,

  -- Metadata
  ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installation_instructions TEXT,
  ADD COLUMN IF NOT EXISTS usage_examples TEXT,
  ADD COLUMN IF NOT EXISTS compatibility_notes TEXT,

  -- Stats
  ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0,

  -- Settings
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;