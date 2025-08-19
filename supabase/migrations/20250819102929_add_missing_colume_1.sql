ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS original_author_github_username TEXT;