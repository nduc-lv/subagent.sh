-- Add platform stats function
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE(
    total_agents INTEGER,
    avg_rating DECIMAL(3,2),
    total_downloads INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_agents,
        COALESCE(ROUND(AVG(rating_average), 2), 0.00)::DECIMAL(3,2) as avg_rating,
        COALESCE(SUM(download_count), 0)::INTEGER as total_downloads
    FROM public.agents 
    WHERE status = 'published';
END;
$$ LANGUAGE plpgsql;