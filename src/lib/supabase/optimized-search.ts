// Optimized search implementation with caching and lightweight queries
import { connectionPool } from './connection-pool';
import { simpleSearchAgents, simpleGetFacets } from './simple-client';
import type { SearchFilters, SearchResult, Agent, SearchFacets } from '@/types';

interface SearchCache {
  [key: string]: {
    results: SearchResult[] | SearchFacets;
    timestamp: number;
    ttl: number;
  };
}

export class OptimizedSearch {
  private searchCache: SearchCache = {};
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for search results
  private readonly FACETS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for facets
  private facetsPromise: Promise<any> | null = null; // Keep track of in-flight facets request

  // Ultra-fast search bypassing complex abstractions
  async searchAgents(filters: SearchFilters & { limit?: number; offset?: number }): Promise<SearchResult[]> {
    const cacheKey = this.generateSearchCacheKey(filters);
    
    // Check cache first
    const cached = this.searchCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('🎯 Returning cached results');
      return cached.results;
    }

    try {
      console.log('🚀 Using simple search (bypassing connection pool)');
      // Use ultra-simple search bypassing all abstractions
      const results = await simpleSearchAgents(filters);
      
      // Cache results
      this.searchCache[cacheKey] = {
        results,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      };

      // Clean old cache entries
      this.cleanupSearchCache();
      
      return results;
    } catch (error) {
      console.error('Simple search failed:', error?.message || error);
      // Return empty results instead of trying complex fallbacks
      return [];
    }
  }

  // Optimized search with simplified queries to avoid hanging
  private async performOptimizedSearch(filters: SearchFilters & { limit?: number; offset?: number }): Promise<SearchResult[]> {
    const {
      query = '',
      category,
      tags = [],
      language,
      framework,
      sortBy = 'newest',
      featured,
      limit = 20,
      offset = 0
    } = filters;

    // Check if connectionPool is available
    if (!connectionPool) {
      throw new Error('Connection pool not initialized');
    }

    // Build simplified query WITHOUT expensive joins to avoid hanging
    return connectionPool.executeSelect(
      'agents',
      (q) => {
        let queryBuilder = q.select(`
          id,
          name,
          description,
          slug,
          category_id,
          tags,
          github_language,
          github_url,
          rating_average,
          rating_count,
          download_count,
          view_count,
          github_stars,
          is_featured,
          status,
          created_at,
          updated_at,
          author_id,
          original_author_github_username,
          original_author_github_url,
          original_author_avatar_url,
          github_owner_avatar_url
        `)
        .eq('status', 'published')
        .range(offset, offset + limit - 1);

        // Apply filters efficiently
        if (category) {
          queryBuilder = queryBuilder.eq('category_id', category);
        }

        // Simplified filtering to avoid expensive operations
        if (featured !== undefined) {
          queryBuilder = queryBuilder.eq('is_featured', featured);
        }

        if (language) {
          queryBuilder = queryBuilder.eq('github_language', language);
        }

        // Temporarily disable expensive array operations to prevent hanging
        // TODO: Optimize tags filtering with proper database indexes
        // if (tags.length > 0) {
        //   queryBuilder = queryBuilder.overlaps('tags', tags);
        // }

        // Simplified text search to avoid hanging on large text fields
        if (query.trim() && query.length >= 2) {
          // Use simple ILIKE instead of full text search for now
          queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        }

        // Optimized sorting
        switch (sortBy) {
          case 'rating':
            queryBuilder = queryBuilder.order('rating_average', { ascending: false });
            break;
          case 'downloads':
            queryBuilder = queryBuilder.order('download_count', { ascending: false });
            break;
          case 'views':
            queryBuilder = queryBuilder.order('view_count', { ascending: false });
            break;
          case 'stars':
            queryBuilder = queryBuilder.order('github_stars', { ascending: false, nullsLast: true });
            break;
          case 'updated':
            queryBuilder = queryBuilder.order('updated_at', { ascending: false });
            break;
          case 'relevance':
            if (query.trim()) {
              // Sort by rating for relevance when searching
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

        return queryBuilder;
      },
      { 
        timeout: 8000, // 8 second timeout
        retries: 1,
        cache: true,
        cacheTTL: this.CACHE_TTL
      }
    );
  }

  // Ultra-basic fallback search without any joins or expensive operations
  private async performBasicSearch(filters: SearchFilters & { limit?: number; offset?: number }): Promise<SearchResult[]> {
    const { query = '', limit = 20, offset = 0 } = filters;
    
    try {
      return connectionPool.executeSelect(
        'agents',
        (q) => q
          .select(`
            id,
            name,
            description,
            slug,
            rating_average,
            download_count,
            created_at,
            category_id,
            author_id
          `)
          .eq('status', 'published')
          .limit(limit), // Use limit instead of range to avoid offset issues
        { 
          timeout: 3000, // Very short timeout
          retries: 0,
          cache: true,
          cacheTTL: this.CACHE_TTL
        }
      );
    } catch (error) {
      console.error('Basic search failed:', error);
      return [];
    }
  }

  // Get trending agents with caching
  async getTrendingAgents(limit = 10): Promise<SearchResult[]> {
    const cacheKey = `trending_${limit}`;
    const cached = this.searchCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL * 2) {
      return cached.results;
    }

    try {
      const results = await connectionPool.executeSelect(
        'agents',
        (q) => q
          .select(`
            id,
            name,
            description,
            slug,
            rating_average,
            download_count,
            view_count,
            created_at,
            category_id,
            author_id
          `)
          .eq('status', 'published')
          .limit(limit), // Remove expensive ordering by view_count for now
        {
          timeout: 3000, // Short timeout
          cache: true,
          cacheTTL: this.CACHE_TTL * 2
        }
      );

      this.searchCache[cacheKey] = {
        results,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL * 2
      };

      return results;
    } catch (error) {
      console.error('Failed to get trending agents:', error);
      return [];
    }
  }

  // Get featured agents with caching
  async getFeaturedAgents(limit = 6): Promise<SearchResult[]> {
    const cacheKey = `featured_${limit}`;
    const cached = this.searchCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL * 3) {
      return cached.results;
    }

    try {
      // Use simple search to get proper author data
      const results = await simpleSearchAgents({
        featured: true,
        limit,
        sortBy: 'rating'
      });

      this.searchCache[cacheKey] = {
        results,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL * 3
      };

      return results as SearchResult[];
    } catch (error) {
      console.error('Failed to get featured agents:', error);
      return [];
    }
  }

  // Get search facets using simple client (bypassing complex abstractions)
  async getSearchFacets(): Promise<any> {
    const cacheKey = 'search_facets';
    const cached = this.searchCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < this.FACETS_CACHE_TTL) {
      console.log('🎯 Returning cached facets');
      return cached.results;
    }

    // If there's already a request in flight, return that promise to prevent duplicate requests
    if (this.facetsPromise) {
      console.log('🔄 Returning existing facets promise');
      return this.facetsPromise;
    }

    // Create and store the promise
    this.facetsPromise = this.fetchFacetsInternal();
    
    try {
      const facets = await this.facetsPromise;
      this.facetsPromise = null; // Clear the promise after completion
      return facets;
    } catch (error) {
      this.facetsPromise = null; // Clear the promise on error
      throw error;
    }
  }

  private async fetchFacetsInternal(): Promise<SearchFacets> {
    const cacheKey = 'search_facets';
    
    try {
      console.log('🚀 Using simple facets (bypassing connection pool)');
      
      // Use ultra-simple facets function
      const facets = await simpleGetFacets();

      // Cache successful results
      this.searchCache[cacheKey] = {
        results: facets,
        timestamp: Date.now(),
        ttl: this.FACETS_CACHE_TTL
      };

      return facets;
    } catch (error) {
      console.error('Simple facets failed:', (error as any)?.message || error);

      // Return basic fallback facets
      const fallbackFacets: SearchFacets = {
        categories: [
          { name: 'Web Development', value: 'web-development', count: 0 },
          { name: 'Data Processing', value: 'data-processing', count: 0 },
          { name: 'AI & ML', value: 'ai-ml', count: 0 }
        ],
        languages: [
          { name: 'JavaScript', count: 0 },
          { name: 'Python', count: 0 },
          { name: 'TypeScript', count: 0 }
        ],
        frameworks: [],
        tags: [
          { name: 'automation', count: 0 },
          { name: 'development', count: 0 }
        ]
      };
      
      // Cache fallback for short time to retry soon
      this.searchCache[cacheKey] = {
        results: fallbackFacets,
        timestamp: Date.now(),
        ttl: 30000 // 30 seconds - retry sooner for failed requests
      };

      return fallbackFacets;
    }
  }

  // Preload facets in the background to improve perceived performance
  async preloadFacets(): Promise<void> {
    try {
      // Only preload if not already cached
      const cacheKey = 'search_facets';
      const cached = this.searchCache[cacheKey];
      
      if (!cached || Date.now() - cached.timestamp >= this.FACETS_CACHE_TTL) {
        console.log('🚀 Preloading facets...');
        // Fire and forget - don't await this
        this.getSearchFacets().catch(err => {
          console.warn('Facets preload failed:', err);
        });
      }
    } catch (error) {
      console.warn('Facets preload error:', error);
    }
  }

  // Optimized facet queries with fallback to simple queries
  private async getCategoriesFacets(): Promise<Array<{ value: string; count: number }>> {
    const startTime = Date.now();
    try {
      console.debug('Starting categories facets query...');
      
      // Unified client handling - use direct client for both client and server
      const { supabase } = await import('./client');
      const client = supabase;
      
      if (!client) {
        throw new Error('Failed to create Supabase client for categories');
      }
      
      // Simple, fast query with AbortSignal timeout protection (Supabase best practice)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Categories query aborted due to timeout');
      }, 10000); // 10 seconds timeout
      
      try {
        const { data, error } = await client
          .from('categories')
          .select('id, name, slug')
          .order('name')
          .limit(20)
          .abortSignal(controller.signal); // Use AbortSignal for proper timeout handling
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Categories query error:', error);
          throw error;
        }
        
        const result = (data || []).map((cat: any) => ({
          value: cat.name,
          count: 0 // Will be updated when we have proper aggregation
        }));
        
        console.debug(`Categories facets completed in ${Date.now() - startTime}ms, found ${result.length} categories`);
        
        // Add performance analysis in development
        if (process.env.NODE_ENV === 'development' && result.length === 0) {
          console.debug('Categories query returned no results - checking query performance');
        }
        
        return result;
      } catch (queryError) {
        clearTimeout(timeoutId);
        throw queryError;
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed to get categories facets after ${duration}ms:`, {
        error: (error as any)?.message || error?.toString() || 'Unknown error',
        errorType: typeof error,
        duration
      });
      
      // Return comprehensive default categories if database query fails
      return [
        { value: 'Web Development', count: 0 },
        { value: 'Data Processing', count: 0 },
        { value: 'AI & ML', count: 0 },
        { value: 'API Tools', count: 0 },
        { value: 'Testing', count: 0 },
        { value: 'Documentation', count: 0 },
        { value: 'DevOps', count: 0 },
        { value: 'Security', count: 0 }
      ];
    }
  }

  private async getLanguagesFacets(): Promise<Array<{ value: string; count: number }>> {
    const startTime = Date.now();
    try {
      console.debug('Starting languages facets query...');
      
      // Unified client handling
      const { supabase } = await import('./client');
      const client = supabase;
      
      if (!client) {
        throw new Error('Failed to create Supabase client for languages');
      }
      
      // Optimized query with AbortSignal timeout protection (Supabase best practice)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Languages query aborted due to timeout');
      }, 10000); // 10 seconds timeout
      
      try {
        // Ultra-simplified query to prevent hanging - remove ordering for now
        const { data, error } = await client
          .from('agents')
          .select('github_language')
          .eq('status', 'published')
          .not('github_language', 'is', null)
          .limit(200) // Further reduced limit to prevent hanging
          .abortSignal(controller.signal); // Use AbortSignal for proper timeout handling
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Languages query error:', error);
          throw error;
        }

        // Count occurrences of each language
        const languageCounts: { [key: string]: number } = {};
        (data || []).forEach((agent: any) => {
          if (agent.github_language) {
            languageCounts[agent.github_language] = (languageCounts[agent.github_language] || 0) + 1;
          }
        });

        const result = Object.entries(languageCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15); // Top 15 languages
        
        console.debug(`Languages facets completed in ${Date.now() - startTime}ms, found ${result.length} languages`);
        return result;
      } catch (queryError) {
        clearTimeout(timeoutId);
        throw queryError;
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed to get languages facets after ${duration}ms:`, {
        error: (error as any)?.message || error?.toString() || 'Unknown error',
        errorType: typeof error,
        duration
      });
      
      // Return popular languages as fallback
      return [
        { value: 'JavaScript', count: 0 },
        { value: 'Python', count: 0 },
        { value: 'TypeScript', count: 0 },
        { value: 'Go', count: 0 },
        { value: 'Rust', count: 0 },
        { value: 'Java', count: 0 },
        { value: 'PHP', count: 0 },
        { value: 'C++', count: 0 }
      ];
    }
  }

  private async getFrameworksFacets(): Promise<Array<{ value: string; count: number }>> {
    const startTime = Date.now();
    try {
      console.debug('Starting frameworks facets query...');
      
      // Since the 'framework' column doesn't exist in the agents table,
      // we could potentially extract from github_topics or tags in the future.
      // For now, return empty array quickly to avoid timeouts.
      console.debug('Framework facets not available - framework column does not exist in agents table');
      
      const duration = Date.now() - startTime;
      console.debug(`Frameworks facets completed in ${duration}ms (empty result)`);
      
      return [];
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed to get frameworks facets after ${duration}ms:`, {
        error: (error as any)?.message || error?.toString() || 'Unknown error',
        errorType: typeof error,
        duration
      });
      return [];
    }
  }

  private async getTopTagsFacets(): Promise<Array<{ value: string; count: number }>> {
    const startTime = Date.now();
    try {
      console.debug('Starting tags facets query...');
      
      // Unified client handling
      const { supabase } = await import('./client');
      const client = supabase;
      
      if (!client) {
        throw new Error('Failed to create Supabase client for tags');
      }
      
      // Optimized query with AbortSignal timeout protection (Supabase best practice)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Tags query aborted due to timeout');
      }, 10000); // 10 seconds timeout
      
      try {
        // Ultra-simplified query to prevent hanging - remove ordering for now  
        const { data, error } = await client
          .from('agents')
          .select('tags')
          .eq('status', 'published')
          .not('tags', 'is', null)
          .limit(100) // Much smaller limit to prevent hanging
          .abortSignal(controller.signal); // Use AbortSignal for proper timeout handling
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Tags query error:', error);
          throw error;
        }

        // Count occurrences of each tag
        const tagCounts: { [key: string]: number } = {};
        (data || []).forEach((agent: any) => {
          if (agent.tags && Array.isArray(agent.tags)) {
            agent.tags.forEach((tag: string) => {
              if (tag && typeof tag === 'string' && tag.trim()) {
                const normalizedTag = tag.trim().toLowerCase();
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
              }
            });
          }
        });

        const result = Object.entries(tagCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 30); // Top 30 tags
        
        console.debug(`Tags facets completed in ${Date.now() - startTime}ms, found ${result.length} tags`);
        return result;
      } catch (queryError) {
        clearTimeout(timeoutId);
        throw queryError;
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Failed to get tags facets after ${duration}ms:`, {
        error: (error as any)?.message || error?.toString() || 'Unknown error',
        errorType: typeof error,
        duration
      });
      
      // Return common tags as fallback
      return [
        { value: 'automation', count: 0 },
        { value: 'development', count: 0 },
        { value: 'productivity', count: 0 },
        { value: 'testing', count: 0 },
        { value: 'api', count: 0 },
        { value: 'cli', count: 0 },
        { value: 'deployment', count: 0 },
        { value: 'ci-cd', count: 0 },
        { value: 'monitoring', count: 0 },
        { value: 'documentation', count: 0 }
      ];
    }
  }

  // Cache management
  private generateSearchCacheKey(filters: any): string {
    return JSON.stringify(filters);
  }

  private cleanupSearchCache() {
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.searchCache)) {
      if (now - entry.timestamp > entry.ttl) {
        delete this.searchCache[key];
      }
    }
  }

  // Clear all search cache
  clearCache() {
    this.searchCache = {};
    connectionPool.clearCache('search');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      searchCacheSize: Object.keys(this.searchCache).length,
      ...connectionPool.getCacheStats()
    };
  }
}

// Singleton instance
export const optimizedSearch = new OptimizedSearch();