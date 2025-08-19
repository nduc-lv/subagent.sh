-- Row Level Security (RLS) policies for the Subagents platform

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_sync_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert categories" ON public.categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update categories" ON public.categories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Agents policies
CREATE POLICY "Published agents are viewable by everyone" ON public.agents
    FOR SELECT USING (
        status = 'published' OR 
        auth.uid() = author_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can insert their own agents" ON public.agents
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own agents" ON public.agents
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own agents" ON public.agents
    FOR DELETE USING (auth.uid() = author_id);

-- Collections policies
CREATE POLICY "Public collections are viewable by everyone" ON public.collections
    FOR SELECT USING (
        is_public = true OR 
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can insert their own collections" ON public.collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON public.collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON public.collections
    FOR DELETE USING (auth.uid() = user_id);

-- Collection agents policies
CREATE POLICY "Collection agents viewable if collection is viewable" ON public.collection_agents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.collections c 
            WHERE c.id = collection_id 
            AND (c.is_public = true OR c.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage their collection agents" ON public.collection_agents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.collections c 
            WHERE c.id = collection_id 
            AND c.user_id = auth.uid()
        )
    );

-- Reviews policies
CREATE POLICY "Active reviews are viewable by everyone" ON public.reviews
    FOR SELECT USING (
        status = 'active' OR 
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Authenticated users can insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert votes" ON public.votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own votes" ON public.votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.votes
    FOR DELETE USING (auth.uid() = user_id);

-- Agent downloads policies
CREATE POLICY "Agent downloads are viewable by admins and owners" ON public.agent_downloads
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.agents a 
            WHERE a.id = agent_id 
            AND a.author_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert agent downloads" ON public.agent_downloads
    FOR INSERT WITH CHECK (true);

-- Agent views policies
CREATE POLICY "Agent views are viewable by admins and owners" ON public.agent_views
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.agents a 
            WHERE a.id = agent_id 
            AND a.author_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert agent views" ON public.agent_views
    FOR INSERT WITH CHECK (true);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow others" ON public.follows
    FOR INSERT WITH CHECK (
        auth.uid() = follower_id AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can manage their follows" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Bookmarks policies
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bookmarks" ON public.bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- GitHub sync log policies
CREATE POLICY "GitHub sync logs viewable by agent owners and admins" ON public.github_sync_log
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.agents a 
            WHERE a.id = agent_id 
            AND a.author_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage GitHub sync logs" ON public.github_sync_log
    FOR ALL USING (auth.role() = 'service_role');

-- Create helper function to check if user is admin (for future use)
-- no right
-- CREATE OR REPLACE FUNCTION auth.is_admin()
-- RETURNS BOOLEAN AS $$
-- BEGIN
--     RETURN EXISTS (
--         SELECT 1 FROM public.profiles
--         WHERE id = auth.uid()
--         AND (
--             -- Add admin check logic here when implementing admin roles
--             false -- Placeholder - replace with actual admin logic
--         )
--     );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- Create helper function to check agent ownership
-- CREATE OR REPLACE FUNCTION auth.owns_agent(agent_uuid UUID)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--     RETURN EXISTS (
--         SELECT 1 FROM public.agents
--         WHERE id = agent_uuid
--         AND author_id = auth.uid()
--     );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- Create helper function to check collection ownership
-- CREATE OR REPLACE FUNCTION auth.owns_collection(collection_uuid UUID)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--     RETURN EXISTS (
--         SELECT 1 FROM public.collections
--         WHERE id = collection_uuid
--         AND user_id = auth.uid()
--     );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;