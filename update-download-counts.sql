-- Manually update the sample agents to have realistic download counts
-- This will fix the homepage showing 19.8K+ downloads

-- Update existing sample agents with realistic download counts
UPDATE public.agents SET download_count = 127 WHERE name = 'Code Formatter Pro';
UPDATE public.agents SET download_count = 89 WHERE name = 'ML Pipeline Builder';
UPDATE public.agents SET download_count = 203 WHERE name = 'Docker Swarm Manager';
UPDATE public.agents SET download_count = 67 WHERE name = 'Component Library Generator';
UPDATE public.agents SET download_count = 156 WHERE name = 'Security Scanner CLI';
UPDATE public.agents SET download_count = 94 WHERE name = 'API Documentation Generator';
UPDATE public.agents SET download_count = 178 WHERE name = 'Test Automation Framework';
UPDATE public.agents SET download_count = 52 WHERE name = 'Database Migration Tool';

-- Also update view counts to be proportional
UPDATE public.agents SET view_count = 312 WHERE name = 'Code Formatter Pro';
UPDATE public.agents SET view_count = 267 WHERE name = 'ML Pipeline Builder';
UPDATE public.agents SET view_count = 589 WHERE name = 'Docker Swarm Manager';
UPDATE public.agents SET view_count = 198 WHERE name = 'Component Library Generator';
UPDATE public.agents SET view_count = 445 WHERE name = 'Security Scanner CLI';
UPDATE public.agents SET view_count = 278 WHERE name = 'API Documentation Generator';
UPDATE public.agents SET view_count = 423 WHERE name = 'Test Automation Framework';
UPDATE public.agents SET view_count = 167 WHERE name = 'Database Migration Tool';

-- Verify the changes
SELECT name, download_count, view_count FROM public.agents WHERE status = 'published' ORDER BY download_count DESC;