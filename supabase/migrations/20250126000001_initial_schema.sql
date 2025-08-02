-- Subagents Platform Database Schema
-- This migration creates the complete database schema for the Subagents platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- Create enum types
CREATE TYPE agent_status AS ENUM ('draft', 'published', 'archived', 'under_review');
CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');
CREATE TYPE review_status AS ENUM ('active', 'hidden', 'flagged');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website_url TEXT,
    github_username TEXT,
    twitter_username TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Categories table
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT, -- Lucide icon name
    color TEXT DEFAULT '#6366f1', -- Hex color for category
    agent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Agents table
CREATE TABLE public.agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    detailed_description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status agent_status DEFAULT 'draft',
    version TEXT DEFAULT '1.0.0',
    tags TEXT[] DEFAULT '{}',
    
    -- GitHub integration
    github_repo_url TEXT,
    github_repo_name TEXT,
    github_owner TEXT,
    github_stars INTEGER DEFAULT 0,
    github_forks INTEGER DEFAULT 0,
    github_last_commit TIMESTAMP WITH TIME ZONE,
    github_sync_enabled BOOLEAN DEFAULT FALSE,
    
    -- URLs and resources
    documentation_url TEXT,
    demo_url TEXT,
    homepage_url TEXT,
    
    -- Metadata
    license TEXT,
    language TEXT, -- Primary programming language
    framework TEXT, -- Framework used (if applicable)
    
    -- Stats (computed)
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    
    -- Settings
    featured BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT description_length CHECK (char_length(description) <= 500),
    CONSTRAINT version_format CHECK (version ~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$'),
    CONSTRAINT rating_range CHECK (rating_average >= 0 AND rating_average <= 5),
    CONSTRAINT tags_limit CHECK (array_length(tags, 1) <= 20)
);

-- Collections table (user-curated lists of agents)
CREATE TABLE public.collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT TRUE,
    slug TEXT,
    agent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    CONSTRAINT description_length CHECK (char_length(description) <= 1000),
    UNIQUE(user_id, slug)
);

-- Junction table for collections and agents
CREATE TABLE public.collection_agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(collection_id, agent_id)
);

-- Reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    status review_status DEFAULT 'active',
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT title_length CHECK (char_length(title) <= 200),
    CONSTRAINT content_length CHECK (char_length(content) <= 5000),
    UNIQUE(agent_id, user_id) -- One review per user per agent
);

-- Votes table (for agents, reviews, etc.)
CREATE TABLE public.votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Polymorphic references (vote on different types of content)
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
    
    vote_type vote_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one vote per user per item
    CONSTRAINT vote_target_check CHECK (
        (agent_id IS NOT NULL AND review_id IS NULL) OR
        (agent_id IS NULL AND review_id IS NOT NULL)
    ),
    UNIQUE(user_id, agent_id) WHERE agent_id IS NOT NULL,
    UNIQUE(user_id, review_id) WHERE review_id IS NOT NULL
);

-- Agent downloads tracking
CREATE TABLE public.agent_downloads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Allow anonymous downloads
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    download_type TEXT DEFAULT 'direct', -- 'direct', 'clone', 'zip'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent spam downloads (same user/IP within 1 hour)
    CONSTRAINT unique_user_download UNIQUE(agent_id, user_id, date_trunc('hour', created_at)) DEFERRABLE INITIALLY DEFERRED
);

-- Agent views tracking
CREATE TABLE public.agent_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Allow anonymous views
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent spam views (same session within 1 hour)
    CONSTRAINT unique_session_view UNIQUE(agent_id, session_id, date_trunc('hour', created_at)) DEFERRABLE INITIALLY DEFERRED
);

-- Following/follower relationships
CREATE TABLE public.follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);

-- Agent bookmarks/favorites
CREATE TABLE public.bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, agent_id)
);

-- GitHub sync log
CREATE TABLE public.github_sync_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success', 'error', 'pending'
    message TEXT,
    data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT status_check CHECK (status IN ('success', 'error', 'pending'))
);

-- Create indexes for performance
CREATE INDEX idx_agents_category ON public.agents(category_id);
CREATE INDEX idx_agents_author ON public.agents(author_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_featured ON public.agents(featured) WHERE featured = true;
CREATE INDEX idx_agents_rating ON public.agents(rating_average DESC);
CREATE INDEX idx_agents_downloads ON public.agents(download_count DESC);
CREATE INDEX idx_agents_created ON public.agents(created_at DESC);
CREATE INDEX idx_agents_updated ON public.agents(updated_at DESC);
CREATE INDEX idx_agents_tags ON public.agents USING GIN(tags);
CREATE INDEX idx_agents_github_repo ON public.agents(github_owner, github_repo_name) WHERE github_repo_url IS NOT NULL;

-- Text search indexes
CREATE INDEX idx_agents_search ON public.agents USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || array_to_string(tags, ' ')));
CREATE INDEX idx_categories_search ON public.categories USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_profiles_search ON public.profiles USING GIN(to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(username, '') || ' ' || COALESCE(bio, '')));

-- Indexes for relationships
CREATE INDEX idx_reviews_agent ON public.reviews(agent_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_votes_agent ON public.votes(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_votes_review ON public.votes(review_id) WHERE review_id IS NOT NULL;
CREATE INDEX idx_votes_user ON public.votes(user_id);
CREATE INDEX idx_collection_agents_collection ON public.collection_agents(collection_id);
CREATE INDEX idx_collection_agents_position ON public.collection_agents(collection_id, position);
CREATE INDEX idx_downloads_agent ON public.agent_downloads(agent_id);
CREATE INDEX idx_downloads_created ON public.agent_downloads(created_at DESC);
CREATE INDEX idx_views_agent ON public.agent_views(agent_id);
CREATE INDEX idx_views_created ON public.agent_views(created_at DESC);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_agent ON public.bookmarks(agent_id);
CREATE INDEX idx_github_sync_agent ON public.github_sync_log(agent_id);
CREATE INDEX idx_github_sync_status ON public.github_sync_log(status);

-- Partial indexes for better performance
CREATE INDEX idx_agents_published ON public.agents(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_reviews_active ON public.reviews(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_collections_public ON public.collections(created_at DESC) WHERE is_public = true;