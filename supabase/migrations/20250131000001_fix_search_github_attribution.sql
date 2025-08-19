-- Fix search function to include GitHub attribution fields
-- This ensures search results show proper GitHub author information

-- Drop the existing function first
DROP FUNCTION IF EXISTS enhanced_search_agents(text,uuid,text[],text,text,numeric,timestamp with time zone,timestamp with time zone,boolean,text,integer,integer,uuid,text);

-- Update the enhanced search function to include GitHub attribution fields
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
    original_author_github_username TEXT,
    original_author_github_url TEXT,
    original_author_avatar_url TEXT,
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
        AND (search_query = '' OR to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || COALESCE(a.detailed_description, '') || ' ' || immuatable_array_to_string(a.tags, ' ')) @@ search_tsquery)
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
        a.original_author_github_username,
        a.original_author_github_url,
        a.original_author_avatar_url,
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
                    setweight(to_tsvector('english', immuatable_array_to_string(a.tags, ' ')), 'C') ||
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
        AND (search_query = '' OR to_tsvector('english', a.name || ' ' || COALESCE(a.description, '') || ' ' || COALESCE(a.detailed_description, '') || ' ' || immuatable_array_to_string(a.tags, ' ')) @@ search_tsquery)
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
                    setweight(to_tsvector('english', immuatable_array_to_string(a.tags, ' ')), 'C') ||
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