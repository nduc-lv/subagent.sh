// Production query optimization utilities
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types';

interface QueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  enablePagination?: boolean;
  optimizeForRead?: boolean;
}

// Query cache for expensive operations
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export class QueryOptimizer {
  private client = supabase;

  // Clean expired cache entries
  private cleanCache() {
    const now = Date.now();
    for (const [key, entry] of queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        queryCache.delete(key);
      }
    }
  }

  // Generate cache key from query parameters
  private getCacheKey(table: string, params: any): string {
    return `${table}:${JSON.stringify(params)}`;
  }

  // Optimized agent search with intelligent caching
  async searchAgents(params: {
    query?: string;
    category?: string;
    tags?: string[];
    sortBy?: 'rating' | 'downloads' | 'newest' | 'trending';
    limit?: number;
    offset?: number;
    useCache?: boolean;
  }) {
    const cacheKey = this.getCacheKey('agents_search', params);
    const cacheTTL = 2 * 60 * 1000; // 2 minutes
    
    // Check cache first
    if (params.useCache !== false) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    let query = this.client
      .from('agents')
      .select(`
        id, name, slug, description, short_description,
        rating_average, rating_count, download_count, view_count,
        created_at, tags,
        categories(name, color),
        profiles!inner(username, avatar_url)
      `)
      .eq('status', 'published');

    // Add filters
    if (params.category) {
      query = query.eq('categories.slug', params.category);
    }

    if (params.tags && params.tags.length > 0) {
      query = query.overlaps('tags', params.tags);
    }

    if (params.query) {
      // Use full-text search for better performance
      query = query.textSearch('name,description,short_description', params.query);
    }

    // Add sorting
    switch (params.sortBy) {
      case 'rating':
        query = query.order('rating_average', { ascending: false });
        break;
      case 'downloads':
        query = query.order('download_count', { ascending: false });
        break;
      case 'trending':
        // Use materialized view for trending if available
        query = query.order('download_count', { ascending: false })
                    .order('rating_average', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Add pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Optimized search error:', error);
      return [];
    }

    // Cache results
    if (params.useCache !== false) {
      queryCache.set(cacheKey, {
        data: data || [],
        timestamp: Date.now(),
        ttl: cacheTTL
      });
      this.cleanCache();
    }

    return data || [];
  }

  // Optimized user profile query
  async getUserProfile(username: string, includeStats = true) {
    const cacheKey = this.getCacheKey('user_profile', { username, includeStats });
    const cacheTTL = 5 * 60 * 1000; // 5 minutes

    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Base profile query
    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, location, website_url, github_username, created_at')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return null;
    }

    let result: any = { profile };

    if (includeStats) {
      // Parallel queries for stats
      const [
        { data: agents },
        { count: reviewCount },
        { count: followersCount },
        { count: followingCount }
      ] = await Promise.all([
        this.client
          .from('agents')
          .select('download_count, view_count, rating_average, rating_count')
          .eq('author_id', profile.id)
          .eq('status', 'published'),
        this.client
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id),
        this.client
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profile.id),
        this.client
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profile.id)
      ]);

      // Calculate aggregated stats
      const stats = agents?.reduce((acc, agent) => ({
        totalAgents: acc.totalAgents + 1,
        totalDownloads: acc.totalDownloads + (agent.download_count || 0),
        totalViews: acc.totalViews + (agent.view_count || 0),
        avgRating: agent.rating_count > 0 
          ? (acc.avgRating * acc.ratedAgents + agent.rating_average) / (acc.ratedAgents + 1)
          : acc.avgRating,
        ratedAgents: agent.rating_count > 0 ? acc.ratedAgents + 1 : acc.ratedAgents
      }), {
        totalAgents: 0,
        totalDownloads: 0,
        totalViews: 0,
        avgRating: 0,
        ratedAgents: 0
      }) || {
        totalAgents: 0,
        totalDownloads: 0,
        totalViews: 0,
        avgRating: 0,
        ratedAgents: 0
      };

      result.stats = {
        ...stats,
        totalReviews: reviewCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0
      };
    }

    // Cache result
    queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
    this.cleanCache();

    return result;
  }

  // Optimized categories with agent counts
  async getCategories() {
    const cacheKey = 'categories_with_counts';
    const cacheTTL = 15 * 60 * 1000; // 15 minutes

    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const { data, error } = await this.client
      .from('categories')
      .select(`
        id, name, slug, description, color, icon,
        agents!inner(count)
      `)
      .order('agent_count', { ascending: false });

    if (error) {
      console.error('Categories query error:', error);
      return [];
    }

    // Cache result
    queryCache.set(cacheKey, {
      data: data || [],
      timestamp: Date.now(),
      ttl: cacheTTL
    });
    this.cleanCache();

    return data || [];
  }

  // Get cache statistics
  getCacheStats() {
    this.cleanCache();
    return {
      entries: queryCache.size,
      keys: Array.from(queryCache.keys()),
      memoryUsage: JSON.stringify(Array.from(queryCache.values())).length
    };
  }

  // Clear all cache
  clearCache() {
    queryCache.clear();
  }
}

// Singleton instance
export const queryOptimizer = new QueryOptimizer();