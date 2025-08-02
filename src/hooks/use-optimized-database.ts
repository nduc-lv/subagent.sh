'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { SearchFilters, Agent, Category, SearchResult, SearchFacets } from '@/types';
import type { Database } from '@/types/supabase';

// Direct Supabase client - no abstraction layers
// Using imported supabase client

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCacheKey(prefix: string, params: any): string {
  return `${prefix}:${JSON.stringify(params)}`;
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any, ttl: number) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
  // Clean old entries
  if (cache.size > 100) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, 20).forEach(([k]) => cache.delete(k));
  }
}

// Optimized agent search using direct SDK
export function useOptimizedAgentSearch(delay = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const search = useCallback(async (filters: SearchFilters & { limit?: number; offset?: number }) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if query is too short (but allow empty queries for browsing)
    if (filters.query && filters.query.length > 0 && filters.query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey('search', filters);
    const cached = getCachedData<SearchResult[]>(cacheKey);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        console.debug('Starting optimized search with filters:', filters);
        setLoading(true);
        abortControllerRef.current = new AbortController();

        const { 
          query = '', 
          category, 
          tags = [], 
          languages = [], 
          frameworks = [],
          sortBy = 'newest', 
          featured,
          limit = 20,
          offset = 0
        } = filters;

        // Build query using Supabase SDK directly
        let queryBuilder = supabase
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
            github_stars,
            is_featured,
            tags,
            github_language,
            created_at,
            updated_at,
            category_id,
            author_id,
            categories:category_id(id, name, slug, color),
            profiles:author_id(id, username, full_name, avatar_url)
          `)
          .eq('status', 'published')
          .abortSignal(abortControllerRef.current.signal);

        // Apply filters
        if (category) {
          queryBuilder = queryBuilder.eq('category_id', category);
        }

        if (featured !== undefined) {
          queryBuilder = queryBuilder.eq('is_featured', featured);
        }

        if (languages.length > 0) {
          queryBuilder = queryBuilder.in('github_language', languages);
        }

        // For tags, use contains for better performance than overlaps
        if (tags.length > 0) {
          // Build OR conditions for tags
          const tagConditions = tags.map(tag => `tags.cs.{${tag}}`).join(',');
          queryBuilder = queryBuilder.or(tagConditions);
        }

        // Text search
        if (query.trim()) {
          // Use simple text search for now - can optimize with full text search later
          try {
            queryBuilder = queryBuilder.or(
              `name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%`
            );
          } catch (searchError) {
            console.warn('Text search failed, continuing without text filter:', searchError);
          }
        }

        // Sorting
        switch (sortBy) {
          case 'rating':
            queryBuilder = queryBuilder
              .order('rating_average', { ascending: false, nullsFirst: false })
              .order('rating_count', { ascending: false });
            break;
          case 'downloads':
            queryBuilder = queryBuilder.order('download_count', { ascending: false });
            break;
          case 'views':
            queryBuilder = queryBuilder.order('view_count', { ascending: false });
            break;
          case 'stars':
            queryBuilder = queryBuilder.order('github_stars', { ascending: false, nullsFirst: false });
            break;
          case 'updated':
            queryBuilder = queryBuilder.order('updated_at', { ascending: false });
            break;
          case 'relevance':
            if (query.trim()) {
              queryBuilder = queryBuilder.order('rating_average', { ascending: false });
            } else {
              queryBuilder = queryBuilder.order('created_at', { ascending: false });
            }
            break;
          case 'newest':
          default:
            queryBuilder = queryBuilder.order('created_at', { ascending: false });
            break;
        }

        // Pagination
        queryBuilder = queryBuilder.range(offset, offset + limit - 1);

        console.debug('Executing Supabase query...');
        const { data, error: queryError } = await queryBuilder;

        console.debug('Query completed:', { dataCount: data?.length, error: queryError });
        if (queryError) throw queryError;

        // Transform data to match expected format
        const transformedResults: SearchResult[] = (data || []).map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          description: agent.description,
          short_description: agent.short_description,
          github_url: agent.github_url,
          rating_average: agent.rating_average,
          rating_count: agent.rating_count,
          download_count: agent.download_count,
          view_count: agent.view_count,
          github_stars: agent.github_stars,
          is_featured: agent.is_featured,
          tags: agent.tags || [],
          github_language: agent.github_language,
          created_at: agent.created_at,
          updated_at: agent.updated_at,
          category_id: agent.category_id,
          author_id: agent.author_id,
          categories: agent.categories || null,
          profiles: agent.profiles || null
        }));

        console.debug('Search completed successfully:', { resultsCount: transformedResults.length });
        setResults(transformedResults);
        setCachedData(cacheKey, transformedResults, 2 * 60 * 1000); // 2 minute cache

      } catch (err: any) {
        // Check for abort errors in multiple ways
        if (err?.name === 'AbortError' || 
            err?.message?.includes('abort') || 
            err?.message?.includes('AbortError') ||
            err?.code === 'ABORT' ||
            err?.details?.includes('abort')) {
          return;
        }
        console.error('Search error:', {
          message: err?.message || 'Unknown error',
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
          error: err
        });
        setError(err?.message || 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { results, loading, error, search };
}

// Optimized categories with counts
export function useOptimizedCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      const cacheKey = 'categories';
      const cached = getCachedData<Category[]>(cacheKey);
      if (cached) {
        setCategories(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get categories with agent count using direct SDK
        const { data, error: queryError } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            slug,
            description,
            color,
            icon,
            agent_count
          `)
          .order('agent_count', { ascending: false });

        if (queryError) throw queryError;

        const categoriesData = (data || []) as Category[];
        setCategories(categoriesData);
        setCachedData(cacheKey, categoriesData, 15 * 60 * 1000); // 15 minute cache

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { categories, loading, error };
}

// Optimized facets using RPC for aggregation
export function useOptimizedSearchFacets() {
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFacets() {
      const cacheKey = 'facets';
      const cached = getCachedData<SearchFacets>(cacheKey);
      if (cached) {
        setFacets(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Parallel fetching for better performance
        const [categoriesRes, languagesRes, tagsRes] = await Promise.all([
          // Categories
          supabase
            .from('categories')
            .select('name, slug, agent_count')
            .gt('agent_count', 0)
            .order('agent_count', { ascending: false })
            .limit(20),

          // Top languages - using a simple aggregation
          supabase
            .from('agents')
            .select('github_language')
            .eq('status', 'published')
            .not('github_language', 'is', null)
            .limit(500), // Get sample for counting

          // Top tags - using a simple aggregation  
          supabase
            .from('agents')
            .select('tags')
            .eq('status', 'published')
            .not('tags', 'is', null)
            .limit(300) // Get sample for counting
        ]);

        // Process categories
        const categories = (categoriesRes.data || []).map(cat => ({
          name: cat.name,
          value: cat.slug,
          count: cat.agent_count || 0
        }));

        // Process languages
        const languageCounts: { [key: string]: number } = {};
        (languagesRes.data || []).forEach(agent => {
          if (agent.github_language) {
            languageCounts[agent.github_language] = (languageCounts[agent.github_language] || 0) + 1;
          }
        });
        const languages = Object.entries(languageCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15);

        // Process tags
        const tagCounts: { [key: string]: number } = {};
        (tagsRes.data || []).forEach(agent => {
          if (agent.tags && Array.isArray(agent.tags)) {
            agent.tags.forEach((tag: string) => {
              if (tag) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              }
            });
          }
        });
        const tags = Object.entries(tagCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 30);

        const facetsData: SearchFacets = {
          categories,
          languages,
          frameworks: [], // Not implemented yet
          tags
        };

        setFacets(facetsData);
        setCachedData(cacheKey, facetsData, 10 * 60 * 1000); // 10 minute cache

      } catch (err) {
        console.error('Facets error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch facets');
        
        // Set default facets on error
        setFacets({
          categories: [],
          languages: [],
          frameworks: [],
          tags: []
        });
      } finally {
        setLoading(false);
      }
    }

    fetchFacets();
  }, []);

  return { facets, loading, error };
}

// Featured agents hook
export function useOptimizedFeaturedAgents(limit = 6) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeatured() {
      const cacheKey = getCacheKey('featured', { limit });
      const cached = getCachedData<Agent[]>(cacheKey);
      if (cached) {
        setAgents(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('agents')
          .select(`
            *,
            categories:category_id(name, slug, color),
            profiles:author_id(username, full_name, avatar_url)
          `)
          .eq('status', 'published')
          .eq('is_featured', true)
          .order('rating_average', { ascending: false })
          .limit(limit);

        if (queryError) throw queryError;

        setAgents(data || []);
        setCachedData(cacheKey, data || [], 5 * 60 * 1000); // 5 minute cache

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch featured agents');
      } finally {
        setLoading(false);
      }
    }

    fetchFeatured();
  }, [limit]);

  return { agents, loading, error };
}

// Trending agents hook
export function useOptimizedTrendingAgents(limit = 10) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrending() {
      const cacheKey = getCacheKey('trending', { limit });
      const cached = getCachedData<Agent[]>(cacheKey);
      if (cached) {
        setAgents(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Simple trending calculation: recent agents with high engagement
        const { data, error: queryError } = await supabase
          .from('agents')
          .select(`
            *,
            categories:category_id(name, slug, color),
            profiles:author_id(username, full_name, avatar_url)
          `)
          .eq('status', 'published')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
          .order('view_count', { ascending: false })
          .limit(limit);

        if (queryError) throw queryError;

        setAgents(data || []);
        setCachedData(cacheKey, data || [], 5 * 60 * 1000); // 5 minute cache

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trending agents');
      } finally {
        setLoading(false);
      }
    }

    fetchTrending();
  }, [limit]);

  return { agents, loading, error };
}

// Optimized user dashboard data hook
export function useOptimizedUserDashboard(userId?: string) {
  const [data, setData] = useState<{
    stats: {
      totalAgents: number;
      totalDownloads: number;
      totalViews: number;
      totalCollections: number;
    };
    recentAgents: any[];
    recentCollections: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    const cacheKey = getCacheKey('user_dashboard', { userId });
    const cached = getCachedData(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user agents and collections in parallel using direct SDK
      const [agentsRes, collectionsRes] = await Promise.all([
        supabase
          .from('agents')
          .select('*')
          .eq('author_id', userId)
          .order('created_at', { ascending: false })
          .limit(50), // Get all for stats, limit display later
        
        supabase
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

      setData(dashboardData);
      setCachedData(cacheKey, dashboardData, 2 * 60 * 1000); // 2 minute cache

    } catch (err) {
      console.error('Dashboard data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      
      // Set default data on error
      setData({
        stats: {
          totalAgents: 0,
          totalDownloads: 0,
          totalViews: 0,
          totalCollections: 0
        },
        recentAgents: [],
        recentCollections: []
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}

// Optimized user bookmarks hook
export function useOptimizedUserBookmarks(userId?: string) {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!userId) return;

    const cacheKey = getCacheKey('user_bookmarks', { userId });
    const cached = getCachedData(cacheKey);
    if (cached) {
      setBookmarks(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user bookmarks with agent data in a single optimized query
      const { data, error: queryError } = await supabase
        .from('bookmarks')
        .select(`
          id,
          created_at,
          agents:agent_id(
            id,
            name,
            description,
            slug,
            tags,
            rating_average,
            rating_count,
            download_count,
            view_count,
            github_forks,
            updated_at,
            is_featured,
            status,
            categories:category_id(id, name, slug),
            profiles:author_id(id, username, full_name, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .eq('agents.status', 'published')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Transform data to match expected format
      const bookmarkedAgents = (data || [])
        .filter(bookmark => bookmark.agents) // Filter out bookmarks with deleted agents
        .map(bookmark => ({
          ...bookmark.agents,
          bookmarked_at: bookmark.created_at,
          bookmark_id: bookmark.id,
          author: bookmark.agents.profiles,
          categories: bookmark.agents.categories
        }));

      setBookmarks(bookmarkedAgents);
      setCachedData(cacheKey, bookmarkedAgents, 3 * 60 * 1000); // 3 minute cache

    } catch (err) {
      console.error('Bookmarks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return { bookmarks, loading, error, refetch: fetchBookmarks };
}