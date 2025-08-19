// Server-only optimized database functions
// This file should only be imported in server-side code
import { supabase } from './client';

// Simple server-side cache
const serverCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCachedData<T>(key: string): T | null {
  const cached = serverCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  serverCache.delete(key);
  return null;
}

function setCachedData(key: string, data: any, ttl: number) {
  serverCache.set(key, { data, timestamp: Date.now(), ttl });
  // Limit cache size
  if (serverCache.size > 50) {
    const firstKey = serverCache.keys().next().value;
    if (firstKey) serverCache.delete(firstKey);
  }
}

// Use regular client for simplicity - this avoids SSR/static generation issues
async function getServerClient() {
  return supabase;
}

// Optimized platform stats
export async function getOptimizedPlatformStats() {
  const cacheKey = 'platform_stats';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const client = await getServerClient();
    
    // Try RPC function first (if it exists)
    const { data: rpcData, error: rpcError } = await client.rpc('get_platform_stats');
    
    if (!rpcError && rpcData && rpcData.length > 0) {
      const stats = rpcData[0]; // RPC returns array, take first item
      setCachedData(cacheKey, stats, 5 * 60 * 1000); // 5 minutes
      return stats;
    }

    // Fallback to manual aggregation with parallel queries
    const [
      { count: totalAgents },
      { data: downloadData },
      { data: ratingData }
    ] = await Promise.all([
      client.from('agents').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      client.from('agents').select('download_count').eq('status', 'published'),
      client.from('agents').select('rating_average, rating_count').eq('status', 'published').gt('rating_count', 0)
    ]);

    const totalDownloads = (downloadData || []).reduce((sum: number, agent: any) => 
      sum + (agent.download_count || 0), 0
    );

    // Calculate average rating
    let avgRating = 0;
    if (ratingData && ratingData.length > 0) {
      const totalRating = ratingData.reduce((sum: number, agent: any) => 
        sum + (agent.rating_average || 0), 0
      );
      avgRating = totalRating / ratingData.length;
    }

    const stats = {
      total_agents: totalAgents || 0,
      avg_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
      total_downloads: totalDownloads
    };

    setCachedData(cacheKey, stats, 5 * 60 * 1000);
    return stats;

  } catch (error) {
    console.error('Failed to get platform stats:', error);
    // Return fallback data
    return {
      total_agents: 0,
      avg_rating: 0,
      total_downloads: 0
    };
  }
}

// Optimized category stats
export async function getOptimizedCategoryStats() {
  const cacheKey = 'category_stats';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const client = await getServerClient();
    
    const { data, error } = await client
      .from('categories')
      .select('id, name, slug, agent_count')
      .gt('agent_count', 0)
      .order('agent_count', { ascending: false })
      .limit(10);

    if (error) throw error;

    const stats = data || [];
    setCachedData(cacheKey, stats, 10 * 60 * 1000); // 10 minutes
    return stats;

  } catch (error) {
    console.error('Failed to get category stats:', error);
    return [];
  }
}

// Optimized featured agents
export async function getOptimizedFeaturedAgents(limit = 3) {
  const cacheKey = `featured_agents_${limit}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const client = await getServerClient();
    
    const { data, error } = await client
      .from('agents')
      .select(`
        id,
        name,
        slug,
        description,
        short_description,
        github_url,
        rating_average,
        rating_count,
        download_count,
        view_count,
        is_featured,
        tags,
        created_at,
        updated_at,
        category_id,
        author_id,
        categories:category_id(id, name, slug),
        profiles:author_id(id, username, full_name, avatar_url, github_username)
      `)
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('rating_average', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Transform to match expected format
    const featuredAgents = (data || []).map((agent: any) => ({
      id: agent.id,
      title: agent.name,
      description: agent.short_description || agent.description,
      author: (agent.profiles?.full_name && agent.profiles.full_name.trim()) || agent.profiles?.username || 'Unknown',
      authorUsername: agent.profiles?.username,
      category: agent.categories?.name || 'Uncategorized',
      tags: agent.tags || [],
      rating: agent.rating_average || 0,
      downloads: agent.download_count || 0,
      views: agent.view_count || 0,
      forks: 0, // Not tracked yet
      lastUpdated: agent.updated_at || agent.created_at,
      featured: true,
      verified: false, // Not implemented yet
      authorAvatar: agent.profiles?.avatar_url,
      authorGitHubUrl: agent.profiles?.github_username 
        ? `https://github.com/${agent.profiles.github_username}` 
        : null,
      isGitHubAuthor: !!agent.profiles?.github_username
    }));

    setCachedData(cacheKey, featuredAgents, 5 * 60 * 1000); // 5 minutes
    return featuredAgents;

  } catch (error) {
    console.error('Failed to get featured agents:', error.message);
    return [];
  }
}

// Get agent by ID (for detail pages)
export async function getOptimizedAgentById(id: string) {
  const cacheKey = `agent_${id}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const client = await getServerClient();
    
    const { data, error } = await client
      .from('agents')
      .select(`
        *,
        categories:category_id(id, name, slug, color),
        profiles:author_id(id, username, full_name, avatar_url, github_username, bio)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    setCachedData(cacheKey, data, 2 * 60 * 1000); // 2 minutes
    return data;

  } catch (error) {
    console.error('Failed to get agent by ID:', error);
    throw error;
  }
}

// Get user's agents (for profile pages)
export async function getOptimizedUserAgents(userId: string, includeAll = false) {
  const cacheKey = `user_agents_${userId}_${includeAll}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const client = await getServerClient();
    
    let query = client
      .from('agents')
      .select(`
        *,
        categories:category_id(id, name, slug, color)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (!includeAll) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;

    if (error) throw error;

    setCachedData(cacheKey, data || [], 2 * 60 * 1000); // 2 minutes
    return data || [];

  } catch (error) {
    console.error('Failed to get user agents:', error);
    return [];
  }
}

// Get user dashboard data (agents + collections + stats)
export async function getOptimizedUserDashboardData(userId: string) {
  const cacheKey = `user_dashboard_${userId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const client = await getServerClient();
    
    // Fetch user agents and collections in parallel
    const [agentsRes, collectionsRes] = await Promise.all([
      client
        .from('agents')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(50), // Get all for stats, limit display later
      
      client
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (agentsRes.error) throw agentsRes.error;
    if (collectionsRes.error) throw collectionsRes.error;

    const agents = agentsRes.data || [];
    const collections = collectionsRes.data || [];

    // Calculate stats
    const stats = {
      totalAgents: agents.length,
      totalDownloads: agents.reduce((sum, agent) => sum + (agent.download_count || 0), 0),
      totalViews: agents.reduce((sum, agent) => sum + (agent.view_count || 0), 0),
      totalCollections: collections.length
    };

    const dashboardData = {
      stats,
      recentAgents: agents.slice(0, 5),
      recentCollections: collections.slice(0, 5)
    };

    setCachedData(cacheKey, dashboardData, 2 * 60 * 1000); // 2 minutes
    return dashboardData;

  } catch (error) {
    console.error('Failed to get user dashboard data:', error);
    // Return fallback data
    return {
      stats: {
        totalAgents: 0,
        totalDownloads: 0,
        totalViews: 0,
        totalCollections: 0
      },
      recentAgents: [],
      recentCollections: []
    };
  }
}

// Clear server cache (useful for testing)
export function clearServerCache() {
  serverCache.clear();
}