-- Complete fix for homepage stats showing 19.8K+ downloads
-- This will create the RPC function and update the sample data

-- 1. Create the get_platform_stats function
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

-- 2. Update existing sample agents with realistic download counts
UPDATE public.agents SET download_count = 127 WHERE name = 'Code Formatter Pro';
UPDATE public.agents SET download_count = 89 WHERE name = 'ML Pipeline Builder';
UPDATE public.agents SET download_count = 203 WHERE name = 'Docker Swarm Manager';
UPDATE public.agents SET download_count = 67 WHERE name = 'Component Library Generator';
UPDATE public.agents SET download_count = 156 WHERE name = 'Security Scanner CLI';
UPDATE public.agents SET download_count = 94 WHERE name = 'API Documentation Generator';
UPDATE public.agents SET download_count = 178 WHERE name = 'Test Automation Framework';
UPDATE public.agents SET download_count = 52 WHERE name = 'Database Migration Tool';

-- 3. Update view counts to be proportional
UPDATE public.agents SET view_count = 312 WHERE name = 'Code Formatter Pro';
UPDATE public.agents SET view_count = 267 WHERE name = 'ML Pipeline Builder';
UPDATE public.agents SET view_count = 589 WHERE name = 'Docker Swarm Manager';
UPDATE public.agents SET view_count = 198 WHERE name = 'Component Library Generator';
UPDATE public.agents SET view_count = 445 WHERE name = 'Security Scanner CLI';
UPDATE public.agents SET view_count = 278 WHERE name = 'API Documentation Generator';
UPDATE public.agents SET view_count = 423 WHERE name = 'Test Automation Framework';
UPDATE public.agents SET view_count = 167 WHERE name = 'Database Migration Tool';

-- 4. Test the function
SELECT * FROM get_platform_stats();

-- 5. Verify individual agent counts
SELECT name, download_count, view_count FROM public.agents WHERE status = 'published' ORDER BY download_count DESC;