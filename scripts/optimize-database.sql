-- Database Optimization Script for Subagents.sh
-- Run this script to create performance indexes and optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Drop existing indexes if they exist (to recreate with better definitions)
DROP INDEX IF EXISTS idx_agents_status_author;
DROP INDEX IF EXISTS idx_agents_category_status;
DROP INDEX IF EXISTS idx_agents_created_status;
DROP INDEX IF EXISTS idx_agents_rating_status;
DROP INDEX IF EXISTS idx_agents_downloads_status;
DROP INDEX IF EXISTS idx_agents_views_status;
DROP INDEX IF EXISTS idx_agents_tags_gin;
DROP INDEX IF EXISTS idx_agents_fts;

-- Core Agents table indexes for performance
CREATE INDEX CONCURRENTLY idx_agents_status_author ON agents(status, author_id);
CREATE INDEX CONCURRENTLY idx_agents_category_status ON agents(category_id, status) WHERE status = 'published';
CREATE INDEX CONCURRENTLY idx_agents_created_status ON agents(created_at DESC, status) WHERE status = 'published';
CREATE INDEX CONCURRENTLY idx_agents_rating_status ON agents(rating_average DESC, status) WHERE status = 'published' AND rating_count > 0;
CREATE INDEX CONCURRENTLY idx_agents_downloads_status ON agents(download_count DESC, status) WHERE status = 'published';
CREATE INDEX CONCURRENTLY idx_agents_views_status ON agents(view_count DESC, status) WHERE status = 'published';
CREATE INDEX CONCURRENTLY idx_agents_tags_gin ON agents USING gin(tags);

-- Full-text search index for agents
CREATE INDEX CONCURRENTLY idx_agents_fts ON agents 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(short_description, ''))) 
WHERE status = 'published';

-- Reviews table indexes
CREATE INDEX CONCURRENTLY idx_reviews_agent_status ON reviews(agent_id, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_reviews_user_status ON reviews(user_id, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX CONCURRENTLY idx_reviews_rating ON reviews(overall_rating DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_reviews_fts ON reviews 
USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))) 
WHERE status = 'active';

-- Profiles table indexes
CREATE UNIQUE INDEX CONCURRENTLY idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_profiles_github_username ON profiles(github_username) WHERE github_username IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_profiles_created ON profiles(created_at DESC);

-- Social features indexes
CREATE INDEX CONCURRENTLY idx_follows_follower ON follows(follower_id);
CREATE INDEX CONCURRENTLY idx_follows_following ON follows(following_id);
CREATE INDEX CONCURRENTLY idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX CONCURRENTLY idx_bookmarks_agent ON bookmarks(agent_id);

-- Categories table indexes
CREATE UNIQUE INDEX CONCURRENTLY idx_categories_slug ON categories(slug);
CREATE INDEX CONCURRENTLY idx_categories_agent_count ON categories(agent_count DESC);

-- Analytics tables indexes
CREATE INDEX CONCURRENTLY idx_agent_views_agent_created ON agent_views(agent_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_agent_downloads_agent_created ON agent_downloads(agent_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_agent_views_created ON agent_views(created_at DESC);
CREATE INDEX CONCURRENTLY idx_agent_downloads_created ON agent_downloads(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_agents_category_rating ON agents(category_id, rating_average DESC) WHERE status = 'published' AND rating_count > 0;
CREATE INDEX CONCURRENTLY idx_agents_author_created ON agents(author_id, created_at DESC) WHERE status = 'published';

-- Optimize for trending/popular queries
CREATE INDEX CONCURRENTLY idx_agents_trending ON agents(
  (download_count + view_count * 0.1 + rating_average * rating_count * 10) DESC,
  created_at DESC
) WHERE status = 'published';

-- GitHub integration indexes
CREATE INDEX CONCURRENTLY idx_agents_github_url ON agents(github_url) WHERE github_url IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_agents_sync_enabled ON agents(sync_enabled, last_github_sync) WHERE sync_enabled = true;

-- Create materialized view for popular agents (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_agents AS
SELECT 
  a.id,
  a.name,
  a.slug,
  a.short_description,
  a.rating_average,
  a.rating_count,
  a.download_count,
  a.view_count,
  a.created_at,
  c.name as category_name,
  c.color as category_color,
  p.username as author_username,
  p.avatar_url as author_avatar
FROM agents a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN profiles p ON a.author_id = p.id
WHERE a.status = 'published'
  AND a.rating_count > 0
ORDER BY (a.download_count + a.view_count * 0.1 + a.rating_average * a.rating_count * 10) DESC
LIMIT 100;

-- Create unique index on materialized view
CREATE UNIQUE INDEX ON popular_agents(id);

-- Create function to refresh popular agents view
CREATE OR REPLACE FUNCTION refresh_popular_agents()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_agents;
END;
$$ LANGUAGE plpgsql;

-- Update table statistics for better query planning
ANALYZE agents;
ANALYZE reviews;
ANALYZE profiles;
ANALYZE categories;
ANALYZE follows;
ANALYZE bookmarks;
ANALYZE agent_views;
ANALYZE agent_downloads;