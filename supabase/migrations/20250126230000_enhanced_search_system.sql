-- Enhanced Search and Filtering System
-- This migration adds advanced search capabilities, analytics, and performance optimizations

-- Create search analytics table
CREATE TABLE public.search_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    filters JSONB DEFAULT '{}',
    result_count INTEGER DEFAULT 0,
    clicked_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    search_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved searches table
CREATE TABLE public.saved_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    query TEXT,
    filters JSONB DEFAULT '{}',
    is_alert BOOLEAN DEFAULT FALSE,
    alert_frequency TEXT DEFAULT 'daily', -- daily, weekly, monthly
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    UNIQUE(user_id, name)
);

-- Create search suggestions/autocomplete table
CREATE TABLE public.search_suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    term TEXT NOT NULL UNIQUE,
    frequency INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create materialized view for search facets (for better performance)
CREATE MATERIALIZED VIEW public.search_facets AS
SELECT
    'languages' as facet_type,
    language as value,
    COUNT(*) as count
FROM public.agents
WHERE status = 'published' AND language IS NOT NULL
GROUP BY language

UNION ALL

SELECT
    'frameworks' as facet_type,
    framework as value,
    COUNT(*) as count
FROM public.agents
WHERE status = 'published' AND framework IS NOT NULL
GROUP BY framework

UNION ALL

SELECT
    'tags' as facet_type,
    unnest(tags) as value,
    COUNT(*) as count
FROM public.agents
WHERE status = 'published' AND tags IS NOT NULL AND array_length(tags, 1) > 0
GROUP BY unnest(tags)

UNION ALL

SELECT
    'categories' as facet_type,
    c.name as value,
    COUNT(a.id) as count
FROM public.categories c
LEFT JOIN public.agents a ON c.id = a.category_id AND a.status = 'published'
GROUP BY c.id, c.name;

-- Create unique index for refresh
CREATE UNIQUE INDEX idx_search_facets_type_value ON public.search_facets(facet_type, value);

-- Enhanced search indexes for better performance
CREATE INDEX idx_agents_compound_search ON public.agents(status, featured, category_id, language, framework) WHERE status = 'published';
CREATE INDEX idx_agents_text_search_gin ON public.agents USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(detailed_description, '') || ' ' || array_to_string(tags, ' ')));
CREATE INDEX idx_agents_tags_gin ON public.agents USING GIN(tags);

-- Performance indexes
CREATE INDEX idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX idx_search_analytics_created ON public.search_analytics(created_at DESC);
CREATE INDEX idx_search_analytics_user ON public.search_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX idx_search_suggestions_term ON public.search_suggestions(term);
CREATE INDEX idx_search_suggestions_frequency ON public.search_suggestions(frequency DESC);

-- Function to refresh search facets
CREATE OR REPLACE FUNCTION refresh_search_facets()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.search_facets;
END;
$$ LANGUAGE plpgsql;

-- Function to update search suggestions
CREATE OR REPLACE FUNCTION update_search_suggestion(search_term TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.search_suggestions (term, frequency, last_used)
    VALUES (LOWER(search_term), 1, NOW())
    ON CONFLICT (term) 
    DO UPDATE SET 
        frequency = search_suggestions.frequency + 1,
        last_used = NOW();
END;
$$ LANGUAGE plpgsql;

-- Enhanced search function with analytics and better ranking
CREATE OR REPLACE FUNCTION enhanced_search_agents(
    search_query TEXT DEFAULT '',
    category_filter UUID DEFAULT NULL,
    tag_filters TEXT[] DEFAULT '{}',
    language_filter TEXT DEFAULT NULL,
    framework_filter TEXT DEFAULT NULL,
    rating_min DECIMAL DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    featured_only BOOLEAN DEFAULT FALSE,
    sort_by TEXT DEFAULT 'relevance',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    user_id_param UUID DEFAULT NULL,
    session_id_param TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    detailed_description TEXT,
    category_id UUID,
    category_name TEXT,
    category_slug TEXT,
    category_icon TEXT,
    category_color TEXT,
    author_id UUID,
    author_username TEXT,
    author_full_name TEXT,
    author_avatar_url TEXT,
    rating_average DECIMAL(3,2),
    rating_count INTEGER,
    download_count INTEGER,
    view_count INTEGER,
    github_stars INTEGER,
    github_forks INTEGER,
    tags TEXT[],
    language TEXT,
    framework TEXT,
    license TEXT,
    featured BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    search_rank REAL,
    is_bookmarked BOOLEAN
) AS $$
DECLARE
    search_tsquery TSQUERY;
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    search_duration INTEGER;
    result_count_var INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- Prepare search query
    IF search_query != '' THEN
        search_tsquery := plainto_tsquery('english', search_query);
        -- Update search suggestions
        PERFORM update_search_suggestion(search_query);
    END IF;
    
    -- Get result count for analytics
    SELECT COUNT(*) INTO result_count_var
    FROM public.agents a
    WHERE 
        a.status = 'published'
        AND (search_query = '' OR to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || COALESCE(a.detailed_description, '') || ' ' || array_to_string(a.tags, ' ')) @@ search_tsquery)
        AND (category_filter IS NULL OR a.category_id = category_filter)
        AND (array_length(tag_filters, 1) IS NULL OR a.tags && tag_filters)
        AND (language_filter IS NULL OR a.language = language_filter)
        AND (framework_filter IS NULL OR a.framework = framework_filter)
        AND (rating_min IS NULL OR a.rating_average >= rating_min)
        AND (date_from IS NULL OR a.created_at >= date_from)
        AND (date_to IS NULL OR a.created_at <= date_to)
        AND (NOT featured_only OR a.featured = TRUE);
    
    -- Record search analytics
    IF search_query != '' OR category_filter IS NOT NULL OR array_length(tag_filters, 1) > 0 THEN
        INSERT INTO public.search_analytics (
            query, user_id, session_id, filters, result_count
        ) VALUES (
            search_query,
            user_id_param,
            session_id_param,
            jsonb_build_object(
                'category', category_filter,
                'tags', tag_filters,
                'language', language_filter,
                'framework', framework_filter,
                'rating_min', rating_min,
                'date_from', date_from,
                'date_to', date_to,
                'featured_only', featured_only,
                'sort_by', sort_by
            ),
            result_count_var
        );
    END IF;
    
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.detailed_description,
        a.category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.icon as category_icon,
        c.color as category_color,
        a.author_id,
        p.username as author_username,
        p.full_name as author_full_name,
        p.avatar_url as author_avatar_url,
        a.rating_average,
        a.rating_count,
        a.download_count,
        a.view_count,
        a.github_stars,
        a.github_forks,
        a.tags,
        a.language,
        a.framework,
        a.license,
        a.featured,
        a.created_at,
        a.updated_at,
        a.published_at,
        CASE 
            WHEN search_query = '' THEN 
                -- Default ranking when no search query
                CASE sort_by
                    WHEN 'rating' THEN a.rating_average
                    WHEN 'downloads' THEN a.download_count::REAL / 1000.0
                    WHEN 'trending' THEN (a.download_count * 0.3 + a.rating_average * a.rating_count * 0.7)::REAL
                    ELSE extract(epoch from a.created_at)::REAL
                END
            ELSE 
                -- Text search ranking with boosts
                ts_rank_cd(
                    setweight(to_tsvector('english', a.name), 'A') ||
                    setweight(to_tsvector('english', COALESCE(a.description, '')), 'B') ||
                    setweight(to_tsvector('english', array_to_string(a.tags, ' ')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(a.detailed_description, '')), 'D'),
                    search_tsquery,
                    32
                ) * 
                -- Boost factors
                (CASE WHEN a.featured THEN 1.5 ELSE 1.0 END) *
                (CASE WHEN a.rating_average > 4.0 THEN 1.3 WHEN a.rating_average > 3.0 THEN 1.1 ELSE 1.0 END) *
                (CASE WHEN a.download_count > 1000 THEN 1.2 WHEN a.download_count > 100 THEN 1.1 ELSE 1.0 END)
        END as search_rank,
        CASE 
            WHEN user_id_param IS NULL THEN FALSE
            ELSE EXISTS(
                SELECT 1 FROM public.bookmarks b 
                WHERE b.user_id = user_id_param AND b.agent_id = a.id
            )
        END as is_bookmarked
    FROM public.agents a
    LEFT JOIN public.categories c ON a.category_id = c.id
    LEFT JOIN public.profiles p ON a.author_id = p.id
    WHERE 
        a.status = 'published'
        AND (search_query = '' OR to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || COALESCE(a.detailed_description, '') || ' ' || array_to_string(a.tags, ' ')) @@ search_tsquery)
        AND (category_filter IS NULL OR a.category_id = category_filter)
        AND (array_length(tag_filters, 1) IS NULL OR a.tags && tag_filters)
        AND (language_filter IS NULL OR a.language = language_filter)
        AND (framework_filter IS NULL OR a.framework = framework_filter)
        AND (rating_min IS NULL OR a.rating_average >= rating_min)
        AND (date_from IS NULL OR a.created_at >= date_from)
        AND (date_to IS NULL OR a.created_at <= date_to)
        AND (NOT featured_only OR a.featured = TRUE)
    ORDER BY
        CASE 
            WHEN sort_by = 'relevance' AND search_query != '' THEN 
                ts_rank_cd(
                    setweight(to_tsvector('english', a.name), 'A') ||
                    setweight(to_tsvector('english', COALESCE(a.description, '')), 'B') ||
                    setweight(to_tsvector('english', array_to_string(a.tags, ' ')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(a.detailed_description, '')), 'D'),
                    search_tsquery,
                    32
                ) * 
                (CASE WHEN a.featured THEN 1.5 ELSE 1.0 END) *
                (CASE WHEN a.rating_average > 4.0 THEN 1.3 WHEN a.rating_average > 3.0 THEN 1.1 ELSE 1.0 END) *
                (CASE WHEN a.download_count > 1000 THEN 1.2 WHEN a.download_count > 100 THEN 1.1 ELSE 1.0 END)
            WHEN sort_by = 'rating' THEN a.rating_average
            WHEN sort_by = 'downloads' THEN a.download_count
            WHEN sort_by = 'newest' THEN extract(epoch from a.created_at)
            WHEN sort_by = 'updated' THEN extract(epoch from a.updated_at)
            WHEN sort_by = 'trending' THEN (a.download_count * 0.3 + a.rating_average * a.rating_count * 0.7)
            ELSE extract(epoch from a.created_at)
        END DESC,
        -- Secondary sort by created_at for consistency
        a.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
    
    end_time := clock_timestamp();
    search_duration := extract(milliseconds from (end_time - start_time));
    
    -- Update search analytics with timing
    UPDATE public.search_analytics 
    SET search_time_ms = search_duration
    WHERE id = (
        SELECT id FROM public.search_analytics 
        ORDER BY created_at DESC 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(query_prefix TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(suggestion TEXT, frequency INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.term as suggestion,
        s.frequency
    FROM public.search_suggestions s
    WHERE s.term ILIKE query_prefix || '%'
    ORDER BY s.frequency DESC, s.last_used DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(query TEXT, search_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.query,
        COUNT(*) as search_count
    FROM public.search_analytics sa
    WHERE 
        sa.created_at >= NOW() - INTERVAL '%s days' USING days_back
        AND char_length(sa.query) > 0
    GROUP BY sa.query
    ORDER BY search_count DESC, MAX(sa.created_at) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get search analytics
CREATE OR REPLACE FUNCTION get_search_analytics(
    user_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_searches BIGINT,
    unique_queries BIGINT,
    avg_results INTEGER,
    top_queries TEXT[],
    search_trends JSONB
) AS $$
DECLARE
    trends JSONB;
BEGIN
    -- Calculate daily search trends
    SELECT jsonb_object_agg(
        date_part('day', created_at)::TEXT,
        day_count
    ) INTO trends
    FROM (
        SELECT 
            date_trunc('day', created_at) as search_day,
            COUNT(*) as day_count
        FROM public.search_analytics
        WHERE 
            created_at >= NOW() - INTERVAL '%s days' USING days_back
            AND (user_id_param IS NULL OR user_id = user_id_param)
        GROUP BY date_trunc('day', created_at)
        ORDER BY search_day
    ) daily_trends;
    
    RETURN QUERY
    SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT query) as unique_queries,
        COALESCE(AVG(result_count)::INTEGER, 0) as avg_results,
        ARRAY(
            SELECT query 
            FROM public.search_analytics 
            WHERE 
                created_at >= NOW() - INTERVAL '%s days' USING days_back
                AND (user_id_param IS NULL OR user_id = user_id_param)
                AND char_length(query) > 0
            GROUP BY query 
            ORDER BY COUNT(*) DESC 
            LIMIT 5
        ) as top_queries,
        COALESCE(trends, '{}'::JSONB) as search_trends
    FROM public.search_analytics
    WHERE 
        created_at >= NOW() - INTERVAL '%s days' USING days_back
        AND (user_id_param IS NULL OR user_id = user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-refresh search facets
CREATE OR REPLACE FUNCTION auto_refresh_search_facets()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh if it's been more than 1 hour since last refresh
    IF (
        SELECT extract(epoch from (NOW() - pg_stat_get_db_stat_reset_time(
            (SELECT oid FROM pg_database WHERE datname = current_database())
        ))) > 3600
    ) THEN
        PERFORM refresh_search_facets();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh facets when agents are modified
CREATE TRIGGER auto_refresh_facets_on_agent_change
    AFTER INSERT OR UPDATE OR DELETE ON public.agents
    FOR EACH STATEMENT EXECUTE FUNCTION auto_refresh_search_facets();

-- Add trigger to saved searches
CREATE TRIGGER update_saved_searches_updated_at 
    BEFORE UPDATE ON public.saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial refresh of search facets
SELECT refresh_search_facets();