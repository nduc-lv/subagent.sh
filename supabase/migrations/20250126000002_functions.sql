-- Database functions for the Subagents platform

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate agent rating
CREATE OR REPLACE FUNCTION calculate_agent_rating(agent_uuid UUID)
RETURNS TABLE(average_rating DECIMAL(3,2), total_reviews INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ROUND(AVG(rating)::DECIMAL, 2), 0.00) as average_rating,
        COUNT(*)::INTEGER as total_reviews
    FROM public.reviews 
    WHERE agent_id = agent_uuid AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to update agent rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_agent_id UUID;
    rating_data RECORD;
BEGIN
    -- Get the agent_id from either NEW or OLD record
    IF TG_OP = 'DELETE' THEN
        target_agent_id := OLD.agent_id;
    ELSE
        target_agent_id := NEW.agent_id;
    END IF;
    
    -- Calculate new rating
    SELECT * INTO rating_data FROM calculate_agent_rating(target_agent_id);
    
    -- Update the agent's rating
    UPDATE public.agents 
    SET 
        rating_average = rating_data.average_rating,
        rating_count = rating_data.total_reviews
    WHERE id = target_agent_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent rating
CREATE TRIGGER update_agent_rating_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_agent_rating();

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    upvotes INTEGER;
    downvotes INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Handle deletion
        IF OLD.agent_id IS NOT NULL THEN
            -- Update agent vote counts would go here if we track them
            NULL;
        ELSIF OLD.review_id IS NOT NULL THEN
            -- Update review helpful count
            SELECT COUNT(*) INTO upvotes 
            FROM public.votes 
            WHERE review_id = OLD.review_id AND vote_type = 'upvote';
            
            UPDATE public.reviews 
            SET helpful_count = upvotes 
            WHERE id = OLD.review_id;
        END IF;
    ELSE
        -- Handle insert/update
        IF NEW.agent_id IS NOT NULL THEN
            -- Update agent vote counts would go here if we track them
            NULL;
        ELSIF NEW.review_id IS NOT NULL THEN
            -- Update review helpful count
            SELECT COUNT(*) INTO upvotes 
            FROM public.votes 
            WHERE review_id = NEW.review_id AND vote_type = 'upvote';
            
            UPDATE public.reviews 
            SET helpful_count = upvotes 
            WHERE id = NEW.review_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Function to update category agent count
CREATE OR REPLACE FUNCTION update_category_agent_count()
RETURNS TRIGGER AS $$
DECLARE
    old_category_id UUID;
    new_category_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_category_id := OLD.category_id;
    ELSIF TG_OP = 'INSERT' THEN
        new_category_id := NEW.category_id;
    ELSE -- UPDATE
        old_category_id := OLD.category_id;
        new_category_id := NEW.category_id;
    END IF;
    
    -- Update old category count
    IF old_category_id IS NOT NULL THEN
        UPDATE public.categories 
        SET agent_count = (
            SELECT COUNT(*) 
            FROM public.agents 
            WHERE category_id = old_category_id AND status = 'published'
        )
        WHERE id = old_category_id;
    END IF;
    
    -- Update new category count
    IF new_category_id IS NOT NULL AND (old_category_id IS NULL OR old_category_id != new_category_id) THEN
        UPDATE public.categories 
        SET agent_count = (
            SELECT COUNT(*) 
            FROM public.agents 
            WHERE category_id = new_category_id AND status = 'published'
        )
        WHERE id = new_category_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update category agent count
CREATE TRIGGER update_category_agent_count_trigger
    AFTER INSERT OR UPDATE OF category_id, status OR DELETE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION update_category_agent_count();

-- Function to update collection agent count
CREATE OR REPLACE FUNCTION update_collection_agent_count()
RETURNS TRIGGER AS $$
DECLARE
    collection_uuid UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        collection_uuid := OLD.collection_id;
    ELSE
        collection_uuid := NEW.collection_id;
    END IF;
    
    UPDATE public.collections 
    SET agent_count = (
        SELECT COUNT(*) 
        FROM public.collection_agents 
        WHERE collection_id = collection_uuid
    )
    WHERE id = collection_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update collection agent count
CREATE TRIGGER update_collection_agent_count_trigger
    AFTER INSERT OR DELETE ON public.collection_agents
    FOR EACH ROW EXECUTE FUNCTION update_collection_agent_count();

-- Function to update download count
CREATE OR REPLACE FUNCTION update_download_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.agents 
    SET download_count = (
        SELECT COUNT(*) 
        FROM public.agent_downloads 
        WHERE agent_id = NEW.agent_id
    )
    WHERE id = NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update download count
CREATE TRIGGER update_download_count_trigger
    AFTER INSERT ON public.agent_downloads
    FOR EACH ROW EXECUTE FUNCTION update_download_count();

-- Function to update view count
CREATE OR REPLACE FUNCTION update_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.agents 
    SET view_count = (
        SELECT COUNT(*) 
        FROM public.agent_views 
        WHERE agent_id = NEW.agent_id
    )
    WHERE id = NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update view count
CREATE TRIGGER update_view_count_trigger
    AFTER INSERT ON public.agent_views
    FOR EACH ROW EXECUTE FUNCTION update_view_count();

-- Function to generate collection slug
CREATE OR REPLACE FUNCTION generate_collection_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'));
        NEW.slug := regexp_replace(NEW.slug, '\s+', '-', 'g');
        NEW.slug := trim(both '-' from NEW.slug);
        
        -- Ensure uniqueness for the user
        WHILE EXISTS (
            SELECT 1 FROM public.collections 
            WHERE user_id = NEW.user_id AND slug = NEW.slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        ) LOOP
            NEW.slug := NEW.slug || '-' || extract(epoch from now())::bigint;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate collection slug
CREATE TRIGGER generate_collection_slug_trigger
    BEFORE INSERT OR UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION generate_collection_slug();

-- Function for fuzzy search across agents
CREATE OR REPLACE FUNCTION search_agents(
    search_query TEXT DEFAULT '',
    category_filter UUID DEFAULT NULL,
    tag_filters TEXT[] DEFAULT '{}',
    sort_by TEXT DEFAULT 'relevance',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    category_id UUID,
    category_name TEXT,
    author_id UUID,
    author_username TEXT,
    rating_average DECIMAL(3,2),
    rating_count INTEGER,
    download_count INTEGER,
    view_count INTEGER,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    search_rank REAL
) AS $$
DECLARE
    search_tsquery TSQUERY;
BEGIN
    -- Prepare search query
    IF search_query != '' THEN
        search_tsquery := plainto_tsquery('english', search_query);
    END IF;
    
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.category_id,
        c.name as category_name,
        a.author_id,
        p.username as author_username,
        a.rating_average,
        a.rating_count,
        a.download_count,
        a.view_count,
        a.tags,
        a.created_at,
        a.updated_at,
        CASE 
            WHEN search_query = '' THEN 0::REAL
            ELSE ts_rank(
                to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || array_to_string(a.tags, ' ')),
                search_tsquery
            )
        END as search_rank
    FROM public.agents a
    LEFT JOIN public.categories c ON a.category_id = c.id
    LEFT JOIN public.profiles p ON a.author_id = p.id
    WHERE 
        a.status = 'published'
        AND (search_query = '' OR to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || array_to_string(a.tags, ' ')) @@ search_tsquery)
        AND (category_filter IS NULL OR a.category_id = category_filter)
        AND (array_length(tag_filters, 1) IS NULL OR a.tags && tag_filters)
    ORDER BY
        CASE 
            WHEN sort_by = 'relevance' AND search_query != '' THEN ts_rank(to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || array_to_string(a.tags, ' ')), search_tsquery)
            WHEN sort_by = 'rating' THEN a.rating_average
            WHEN sort_by = 'downloads' THEN a.download_count
            WHEN sort_by = 'newest' THEN extract(epoch from a.created_at)
            WHEN sort_by = 'updated' THEN extract(epoch from a.updated_at)
            ELSE extract(epoch from a.created_at)
        END DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to sync GitHub repository data
CREATE OR REPLACE FUNCTION sync_github_repo(agent_uuid UUID, repo_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    sync_id UUID;
BEGIN
    -- Create sync log entry
    INSERT INTO public.github_sync_log (agent_id, status, message, data)
    VALUES (agent_uuid, 'pending', 'Starting GitHub sync', repo_data)
    RETURNING id INTO sync_id;
    
    BEGIN
        -- Update agent with GitHub data
        UPDATE public.agents
        SET 
            github_stars = COALESCE((repo_data->>'stargazers_count')::INTEGER, github_stars),
            github_forks = COALESCE((repo_data->>'forks_count')::INTEGER, github_forks),
            github_last_commit = CASE 
                WHEN repo_data->>'pushed_at' IS NOT NULL 
                THEN (repo_data->>'pushed_at')::TIMESTAMP WITH TIME ZONE
                ELSE github_last_commit
            END,
            description = CASE 
                WHEN description IS NULL OR description = '' 
                THEN COALESCE(repo_data->>'description', description)
                ELSE description
            END,
            homepage_url = CASE 
                WHEN homepage_url IS NULL OR homepage_url = '' 
                THEN COALESCE(repo_data->>'homepage', homepage_url)
                ELSE homepage_url
            END,
            language = COALESCE(repo_data->>'language', language),
            license = CASE 
                WHEN license IS NULL OR license = '' 
                THEN COALESCE(repo_data->'license'->>'name', license)
                ELSE license
            END
        WHERE id = agent_uuid;
        
        -- Update sync log as successful
        UPDATE public.github_sync_log
        SET 
            status = 'success',
            message = 'GitHub sync completed successfully',
            completed_at = NOW()
        WHERE id = sync_id;
        
        RETURN TRUE;
        
    EXCEPTION WHEN OTHERS THEN
        -- Update sync log with error
        UPDATE public.github_sync_log
        SET 
            status = 'error',
            message = 'GitHub sync failed: ' || SQLERRM,
            completed_at = NOW()
        WHERE id = sync_id;
        
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending agents
CREATE OR REPLACE FUNCTION get_trending_agents(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    category_name TEXT,
    author_username TEXT,
    rating_average DECIMAL(3,2),
    download_count INTEGER,
    recent_downloads INTEGER,
    trend_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        c.name as category_name,
        p.username as author_username,
        a.rating_average,
        a.download_count,
        COUNT(ad.id)::INTEGER as recent_downloads,
        (COUNT(ad.id) * 0.7 + a.rating_average * a.rating_count * 0.3)::DECIMAL as trend_score
    FROM public.agents a
    LEFT JOIN public.categories c ON a.category_id = c.id
    LEFT JOIN public.profiles p ON a.author_id = p.id
    LEFT JOIN public.agent_downloads ad ON a.id = ad.agent_id 
        AND ad.created_at >= NOW() - INTERVAL '%s days' USING days_back
    WHERE a.status = 'published'
    GROUP BY a.id, a.name, a.description, c.name, p.username, a.rating_average, a.download_count, a.rating_count
    ORDER BY trend_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;