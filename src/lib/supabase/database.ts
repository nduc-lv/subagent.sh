import { supabase } from './client';
import { createServiceClient } from './service';
import { connectionPool } from './connection-pool';
import { optimizedSearch } from './optimized-search';
import { autoCategorizAgent, getCategorizationConfidence } from '@/lib/utils/auto-categorizer';
import type { 
  Database, 
  Agent, 
  SearchFilters, 
  EnhancedSearchFilters,
  SearchResult, 
  TrendingAgent,
  SearchAnalytics,
  SavedSearch,
  SearchSuggestion,
  SearchFacets
} from '@/types';

export class SupabaseDatabase {
  private client = supabase;
  private _serviceClient?: ReturnType<typeof createServiceClient>;

  // Lazy-load service client (server-side only)
  private get serviceClient() {
    if (typeof window !== 'undefined') {
      throw new Error('Service client cannot be used on the client side');
    }
    
    if (!this._serviceClient) {
      this._serviceClient = createServiceClient();
    }
    
    return this._serviceClient;
  }

  // Agent CRUD operations
  async createAgent(agentData: Partial<Agent>) {
    const { data, error } = await this.client
      .from('agents')
      .insert(agentData)
      .select('*')
      .single();

    if (error) throw error;
    
    // Fetch with relationships separately to avoid join errors
    if (data) {
      const { data: agentWithRelations } = await this.client
        .from('agents')
        .select(`
          *,
          categories:category_id(name, slug),
          profiles:author_id(username, full_name, avatar_url)
        `)
        .eq('id', data.id)
        .single();
      
      return agentWithRelations || data;
    }
    
    return data;
  }

  // Batch create multiple agents
  async createAgents(agentsData: Partial<Agent>[]) {
    // Use service client to bypass RLS for imports
    const { data, error } = await this.serviceClient
      .from('agents')
      .insert(agentsData)
      .select('*');

    if (error) throw error;
    
    // Fetch with relationships separately using service client
    if (data && data.length > 0) {
      const ids = data.map(agent => agent.id);
      const { data: agentsWithRelations } = await this.serviceClient
        .from('agents')
        .select(`
          *,
          categories:category_id(name, slug),
          profiles:author_id(username, full_name, avatar_url)
        `)
        .in('id', ids);
      
      return agentsWithRelations || data;
    }
    
    return data || [];
  }

  async updateAgent(id: string, updates: Partial<Agent>) {
    const { data, error } = await this.client
      .from('agents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    
    // Fetch with relationships separately to avoid join errors
    if (data) {
      const { data: agentWithRelations } = await this.client
        .from('agents')
        .select(`
          *,
          categories:category_id(name, slug),
          profiles:author_id(username, full_name, avatar_url)
        `)
        .eq('id', data.id)
        .single();
      
      return agentWithRelations || data;
    }
    
    return data;
  }

  async deleteAgent(id: string) {
    const { error } = await this.client
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async getAgents(filters: SearchFilters = {}) {
    const {
      query = '',
      category,
      tags = [],
      sortBy = 'newest',
      status = 'published',
      featured,
      language,
      framework
    } = filters;

    let queryBuilder = this.client
      .from('agents')
      .select(`
        *,
        categories:category_id(name, slug),
        profiles:author_id(username, full_name, avatar_url)
      `)
      .eq('status', status);

    // Apply filters
    if (category) {
      queryBuilder = queryBuilder.eq('category_id', category);
    }

    if (tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', tags);
    }

    if (featured !== undefined) {
      queryBuilder = queryBuilder.eq('is_featured', featured);
    }

    if (language) {
      queryBuilder = queryBuilder.eq('github_language', language);
    }

    if (framework) {
      queryBuilder = queryBuilder.eq('framework', framework);
    }

    if (query) {
      queryBuilder = queryBuilder.textSearch('fts', query);
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        queryBuilder = queryBuilder.order('rating_average', { ascending: false });
        break;
      case 'downloads':
        queryBuilder = queryBuilder.order('download_count', { ascending: false });
        break;
      case 'updated':
        queryBuilder = queryBuilder.order('updated_at', { ascending: false });
        break;
      case 'newest':
      default:
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
        break;
    }

    return queryBuilder;
  }

  async getUserAgents(userId: string, includeAll = false) {
    // Use optimized version
    try {
      const { getOptimizedUserAgents } = await import('./server-only');
      return getOptimizedUserAgents(userId, includeAll);
    } catch (error) {
      console.warn('Failed to load optimized user agents, using fallback:', error);
    }

    let query = this.client
      .from('agents')
      .select(`
        *,
        categories:category_id(name, slug, icon, color)
      `)
      .eq('author_id', userId)
      .order('updated_at', { ascending: false });

    if (!includeAll) {
      query = query.neq('status', 'archived');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async duplicateAgent(agentId: string, userId: string) {
    // Get the original agent
    const original = await this.getAgentById(agentId);
    if (!original) throw new Error('Agent not found');

    // Create a copy with new data
    const duplicateData = {
      ...original,
      id: undefined,
      name: `${original.name} (Copy)`,
      author_id: userId,
      status: 'draft' as const,
      download_count: 0,
      view_count: 0,
      rating_average: 0,
      rating_count: 0,
      featured: false,
      created_at: undefined,
      updated_at: undefined,
      published_at: undefined
    };

    return this.createAgent(duplicateData);
  }

  async searchAgents(filters: EnhancedSearchFilters): Promise<SearchResult[]> {
    // Use optimized search implementation with caching and connection pooling
    const searchFilters: SearchFilters & { limit?: number; offset?: number } = {
      query: filters.query,
      category: filters.category,
      tags: filters.tags,
      language: filters.language,
      framework: filters.framework,
      featured: filters.featured,
      sortBy: filters.sortBy,
      limit: filters.limit,
      offset: filters.offset
    };

    try {
      // Track search analytics if user/session provided
      if (filters.userId || filters.sessionId) {
        this.trackSearchAnalytics(filters.query || '', filters.userId, filters.sessionId);
      }

      return await optimizedSearch.searchAgents(searchFilters);
    } catch (error) {
      console.error('Database search failed:', {
        error: error?.message || error,
        stack: error?.stack,
        filters: searchFilters
      });
      
      // Try a simple fallback search directly with Supabase client
      try {
        const { data, error: fallbackError } = await this.client
          .from('agents')
          .select(`
            id,
            name,
            description,
            slug,
            rating_average,
            download_count,
            view_count,
            created_at,
            updated_at,
            original_author_github_username,
            original_author_github_url,
            original_author_avatar_url,
            github_owner_avatar_url,
            categories!inner(name),
            profiles!agents_author_id_fkey(username, avatar_url)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(searchFilters.limit || 20);

        if (fallbackError) {
          console.error('Fallback search also failed:', fallbackError);
          return [];
        }

        return data || [];
      } catch (fallbackError) {
        console.error('Both searches failed:', fallbackError);
        return [];
      }
    }
  }

  async getTrendingAgents(daysBack = 7, limit = 20) {
    const { data, error } = await this.client.rpc('get_trending_agents', {
      days_back: daysBack,
      limit_count: limit
    });

    if (error) throw error;
    return data as TrendingAgent[];
  }

  async getAgentById(id: string) {
    // Use optimized version
    try {
      const { getOptimizedAgentById } = await import('./server-only');
      return getOptimizedAgentById(id);
    } catch (error) {
      console.warn('Failed to load optimized agent by ID, using fallback:', error);
    }

    const { data, error } = await this.client
      .from('agents')
      .select(`
        *,
        categories:category_id(name, slug),
        profiles:author_id(username, full_name, avatar_url, bio, github_username)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getAgentReviews(agentId: string) {
    const { data, error } = await this.client
      .from('reviews')
      .select(`
        *,
        profiles:user_id(username, full_name, avatar_url)
      `)
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getUserVote(userId: string, agentId?: string, reviewId?: string) {
    let query = this.client
      .from('votes')
      .select('*')
      .eq('user_id', userId);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    } else if (reviewId) {
      query = query.eq('review_id', reviewId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async toggleVote(userId: string, voteType: 'upvote' | 'downvote', agentId?: string, reviewId?: string) {
    // First check if user already voted
    const existingVote = await this.getUserVote(userId, agentId, reviewId);

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote if same type
        const { error } = await this.client
          .from('votes')
          .delete()
          .eq('id', existingVote.id);
        if (error) throw error;
        return null;
      } else {
        // Update vote type
        const { data, error } = await this.client
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    } else {
      // Create new vote
      const voteData: any = {
        user_id: userId,
        vote_type: voteType
      };

      if (agentId) voteData.agent_id = agentId;
      if (reviewId) voteData.review_id = reviewId;

      const { data, error } = await this.client
        .from('votes')
        .insert(voteData)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Category operations
  async getCategories() {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  async getCategoryBySlug(slug: string) {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  }

  // Collection operations
  async getUserCollections(userId: string, includePrivate = false) {
    let query = this.client
      .from('collections')
      .select(`
        *,
        collection_agents(count)
      `)
      .eq('author_id', userId)
      .order('updated_at', { ascending: false });

    if (!includePrivate) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getCollectionAgents(collectionId: string) {
    const { data, error } = await this.client
      .from('collection_agents')
      .select(`
        *,
        agents(*)
      `)
      .eq('collection_id', collectionId)
      .order('position');

    if (error) throw error;
    return data;
  }

  async addAgentToCollection(collectionId: string, agentId: string) {
    // Get the next position
    const { count } = await this.client
      .from('collection_agents')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    const position = (count || 0) + 1;

    const { data, error } = await this.client
      .from('collection_agents')
      .insert({
        collection_id: collectionId,
        agent_id: agentId,
        position
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Bookmark operations
  async getUserBookmarks(userId: string) {
    const { data, error } = await this.client
      .from('bookmarks')
      .select(`
        id,
        created_at,
        agents!inner(
          *,
          categories:category_id(name, slug),
          profiles:author_id(username, full_name, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the data to match the expected format
    return data?.map(bookmark => ({
      ...bookmark.agents,
      bookmarked_at: bookmark.created_at,
      bookmark_id: bookmark.id,
      author: bookmark.agents.profiles,
      categories: bookmark.agents.categories
    })) || [];
  }

  async toggleBookmark(userId: string, agentId: string) {
    // Check if bookmark exists
    const { data: existing } = await this.client
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      const { error } = await this.client
        .from('bookmarks')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return { action: 'removed' };
    } else {
      // Add bookmark
      const { data, error } = await this.client
        .from('bookmarks')
        .insert({ user_id: userId, agent_id: agentId })
        .select()
        .single();
      if (error) throw error;
      return { action: 'added', data };
    }
  }

  // Analytics operations
  async trackAgentView(agentId: string, userId?: string, sessionId?: string, metadata: any = {}) {
    const viewData: any = {
      agent_id: agentId,
      session_id: sessionId,
      ip_address: metadata.ip,
      user_agent: metadata.userAgent,
      referrer: metadata.referrer
    };

    if (userId) viewData.user_id = userId;

    const { error } = await this.client
      .from('agent_views')
      .insert(viewData);

    // Don't throw error for view tracking to avoid breaking user experience
    if (error) {
      console.warn('Failed to track agent view:', error);
    }
  }

  async trackAgentDownload(agentId: string, userId?: string, downloadType = 'direct', metadata: any = {}) {
    const downloadData: any = {
      agent_id: agentId,
      download_type: downloadType,
      ip_address: metadata.ip,
      user_agent: metadata.userAgent,
      referrer: metadata.referrer
    };

    if (userId) downloadData.user_id = userId;

    const { error } = await this.client
      .from('agent_downloads')
      .insert(downloadData);

    if (error) throw error;
  }

  // Draft management
  async saveDraft(agentData: Partial<Agent>, userId: string) {
    const draftData = {
      ...agentData,
      author_id: userId,
      status: 'draft' as const
    };

    if (agentData.id) {
      return this.updateAgent(agentData.id, draftData);
    } else {
      return this.createAgent(draftData);
    }
  }

  async publishAgent(agentId: string) {
    return this.updateAgent(agentId, {
      status: 'published',
      published_at: new Date().toISOString()
    });
  }

  async archiveAgent(agentId: string) {
    return this.updateAgent(agentId, {
      status: 'archived'
    });
  }

  // Related agents
  async getRelatedAgents(agentId: string, limit = 6) {
    const agent = await this.getAgentById(agentId);
    if (!agent) return [];

    // Build the query
    let query = this.client
      .from('agents')
      .select(`
        *,
        categories:category_id(name, slug),
        profiles:author_id(username, full_name, avatar_url)
      `)
      .eq('status', 'published')
      .neq('id', agentId);

    // Add category or tags filter
    if (agent.category_id || (agent.tags && agent.tags.length > 0)) {
      const orConditions = [];
      
      if (agent.category_id) {
        orConditions.push(`category_id.eq.${agent.category_id}`);
      }
      
      if (agent.tags && agent.tags.length > 0) {
        // Properly format the tags array for the overlaps operator
        const formattedTags = agent.tags.map(tag => `"${tag}"`).join(',');
        orConditions.push(`tags.ov.{${formattedTags}}`);
      }
      
      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    }

    const { data, error } = await query
      .order('rating_average', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Bulk operations
  async bulkUpdateAgents(agentIds: string[], updates: Partial<Agent>) {
    const { data, error } = await this.client
      .from('agents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', agentIds)
      .select();

    if (error) throw error;
    return data;
  }

  async bulkDeleteAgents(agentIds: string[]) {
    const { error } = await this.client
      .from('agents')
      .delete()
      .in('id', agentIds);

    if (error) throw error;
    return true;
  }

  async bulkAddToCollection(collectionId: string, agentIds: string[]) {
    // Use the API route instead of direct database access
    const response = await fetch(`/api/collections/${collectionId}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        agent_ids: agentIds
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add to collection');
    }

    return await response.json();
  }

  // Agent permissions
  async checkAgentOwnership(agentId: string, userId: string) {
    const { data, error } = await this.client
      .from('agents')
      .select('author_id')
      .eq('id', agentId)
      .single();

    if (error) throw error;
    return data?.author_id === userId;
  }

  // GitHub integration
  async syncGitHubRepo(agentId: string, repoData: any) {
    const { data, error } = await this.client.rpc('sync_github_repo', {
      agent_uuid: agentId,
      repo_data: repoData
    });

    if (error) throw error;
    return data;
  }

  async getGitHubSyncHistory(agentId: string) {
    const { data, error } = await this.client
      .from('github_sync_log')
      .select('*')
      .eq('agent_id', agentId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Agent versions and history
  async getAgentVersionHistory(agentId: string) {
    // This would require a versions table in the future
    // For now, return GitHub sync history as a proxy
    return this.getGitHubSyncHistory(agentId);
  }

  // Performance metrics
  async getAgentPerformanceMetrics(agentId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [downloads, views] = await Promise.all([
      this.client
        .from('agent_downloads')
        .select('created_at')
        .eq('agent_id', agentId)
        .gte('created_at', startDate.toISOString()),
      this.client
        .from('agent_views')
        .select('created_at')
        .eq('agent_id', agentId)
        .gte('created_at', startDate.toISOString())
    ]);

    if (downloads.error) throw downloads.error;
    if (views.error) throw views.error;

    // Group by day
    const downloadsByDay: Record<string, number> = {};
    const viewsByDay: Record<string, number> = {};

    downloads.data?.forEach(download => {
      const day = download.created_at.split('T')[0];
      downloadsByDay[day] = (downloadsByDay[day] || 0) + 1;
    });

    views.data?.forEach(view => {
      const day = view.created_at.split('T')[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    return {
      downloads: downloadsByDay,
      views: viewsByDay,
      totalDownloads: downloads.data?.length || 0,
      totalViews: views.data?.length || 0
    };
  }

  // Enhanced search facets using materialized view
  async getSearchFacets(): Promise<SearchFacets> {
    // Use optimized search facets with heavy caching
    return optimizedSearch.getSearchFacets();
  }

  // Preload facets to improve performance
  async preloadSearchFacets(): Promise<void> {
    return optimizedSearch.preloadFacets();
  }

  // Track search analytics (non-blocking)
  private async trackSearchAnalytics(query: string, userId?: string, sessionId?: string) {
    try {
      // Don't block on analytics - fire and forget
      const analyticsData: any = {
        query: query.trim(),
        session_id: sessionId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      };

      if (userId) analyticsData.user_id = userId;

      this.client
        .from('search_analytics')
        .insert(analyticsData)
        .then(() => {}) // Ignore success
        .catch(() => {}); // Ignore errors
    } catch (error) {
      // Ignore analytics errors to not break search
    }
  }

  // Search suggestions and autocomplete
  async getSearchSuggestions(queryPrefix: string, limit = 10): Promise<SearchSuggestion[]> {
    const { data, error } = await this.client.rpc('get_search_suggestions', {
      query_prefix: queryPrefix.toLowerCase(),
      limit_count: limit
    });

    if (error) throw error;
    return data as SearchSuggestion[];
  }

  // Trending searches
  async getTrendingSearches(daysBack = 7, limit = 10) {
    const { data, error } = await this.client.rpc('get_trending_searches', {
      days_back: daysBack,
      limit_count: limit
    });

    if (error) throw error;
    return data as Array<{ query: string; search_count: number }>;
  }

  // Search analytics
  async getSearchAnalytics(userId?: string, daysBack = 30) {
    const { data, error } = await this.client.rpc('get_search_analytics', {
      user_id_param: userId || null,
      days_back: daysBack
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  // Track search result click
  async trackSearchClick(searchAnalyticsId: string, agentId: string) {
    const { error } = await this.client
      .from('search_analytics')
      .update({ clicked_agent_id: agentId })
      .eq('id', searchAnalyticsId);

    if (error) throw error;
  }

  // Saved searches
  async getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
    const { data, error } = await this.client
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as SavedSearch[];
  }

  async createSavedSearch(savedSearch: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at'>): Promise<SavedSearch> {
    const { data, error } = await this.client
      .from('saved_searches')
      .insert(savedSearch)
      .select()
      .single();

    if (error) throw error;
    return data as SavedSearch;
  }

  async updateSavedSearch(id: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
    const { data, error } = await this.client
      .from('saved_searches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SavedSearch;
  }

  async deleteSavedSearch(id: string): Promise<void> {
    const { error } = await this.client
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Recent searches for user (from local storage or analytics)
  async getUserRecentSearches(userId: string, limit = 10): Promise<string[]> {
    const { data, error } = await this.client
      .from('search_analytics')
      .select('query')
      .eq('user_id', userId)
      .not('query', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Deduplicate and return only unique queries
    const uniqueQueries = [...new Set(data?.map(item => item.query) || [])];
    return uniqueQueries;
  }

  // Refresh search facets manually
  async refreshSearchFacets(): Promise<void> {
    const { error } = await this.client.rpc('refresh_search_facets');
    if (error) throw error;
  }

  // Check if user has bookmark
  async isAgentBookmarked(userId: string, agentId: string) {
    const { data, error } = await this.client
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  // Get featured agents
  async getFeaturedAgents(limit = 3) {
    // Use optimized version
    try {
      const { getOptimizedFeaturedAgents } = await import('./server-only');
      return getOptimizedFeaturedAgents(limit);
    } catch (error) {
      console.warn('Failed to load optimized featured agents, using fallback:', error);
      // Use optimized search with caching
      return optimizedSearch.getFeaturedAgents(limit);
    }
  }

  // Get platform statistics
  async getPlatformStats() {
    // Use optimized version
    try {
      const { getOptimizedPlatformStats } = await import('./server-only');
      return getOptimizedPlatformStats();
    } catch (error) {
      console.warn('Failed to load optimized platform stats, using fallback:', error);
    }

    const { data, error } = await this.client.rpc('get_platform_stats');
    
    if (error) {
      console.warn('Failed to get platform stats, using fallback:', error);
      // Fallback to basic queries
      const [agentsResult, ratingsResult, downloadsResult] = await Promise.all([
        this.client.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        this.client.from('agents').select('rating_average, rating_count').eq('status', 'published').gt('rating_count', 0),
        this.client.from('agents').select('download_count').eq('status', 'published')
      ]);

      const totalAgents = agentsResult.count || 0;
      const avgRating = ratingsResult.data?.length ? 
        ratingsResult.data.reduce((sum, agent) => sum + (agent.rating_average || 0), 0) / ratingsResult.data.length : 0;
      const totalDownloads = downloadsResult.data?.reduce((sum, agent) => sum + (agent.download_count || 0), 0) || 0;

      return {
        total_agents: totalAgents,
        avg_rating: Math.round(avgRating * 10) / 10,
        total_downloads: totalDownloads
      };
    }
    
    return data?.[0] || { total_agents: 0, avg_rating: 0, total_downloads: 0 };
  }

  // Get category statistics for homepage
  async getCategoryStats() {
    // Use optimized version
    try {
      const { getOptimizedCategoryStats } = await import('./server-only');
      return getOptimizedCategoryStats();
    } catch (error) {
      console.warn('Failed to load optimized category stats, using fallback:', error);
    }

    const { data, error } = await this.client
      .from('categories')
      .select('id, name, slug, agent_count')
      .gt('agent_count', 0)
      .order('agent_count', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('Failed to get category stats:', error);
      return [];
    }

    return data || [];
  }

  // Ensure user profile exists (for imports)
  async ensureUserProfile(userId: string, userData: any) {
    // Check if profile exists
    const { data: existingProfile } = await this.serviceClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Create profile using service client
      const { error } = await this.serviceClient
        .from('profiles')
        .insert({
          id: userId,
          username: userData.email?.split('@')[0] || `user-${userId.slice(0, 8)}`,
          full_name: userData.user_metadata?.full_name || userData.user_metadata?.name || null,
          avatar_url: userData.user_metadata?.avatar_url || null,
        });

      if (error) {
        console.warn('Failed to create user profile:', error);
        // Don't throw error - the agent creation might still work if profile exists elsewhere
      }
    }
  }

  // Import deduplication and attribution helpers
  async checkForExistingImport(githubUrl: string, originalAuthor: string, agentName: string): Promise<Agent | null> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .eq('github_url', githubUrl)
      .eq('original_author_github_username', originalAuthor)
      .eq('name', agentName)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createAgentWithAttribution(agentData: Partial<Agent>, importContext: {
    importerId: string;
    originalAuthor?: {
      username: string;
      url: string;
      avatarUrl: string;
    };
    importSource: 'manual' | 'github_import' | 'api';
    skipIfExists?: boolean;
    overwriteExisting?: boolean;
  }): Promise<Agent> {
    const { importerId, originalAuthor, importSource, skipIfExists, overwriteExisting } = importContext;

    // Generate import hash for deduplication
    const importHash = originalAuthor && agentData.github_url 
      ? `${agentData.github_url}:${originalAuthor.username}:${agentData.name}`
      : undefined;

    // Check for existing imports if GitHub URL provided
    if (agentData.github_url && originalAuthor && agentData.name) {
      const existing = await this.checkForExistingImport(
        agentData.github_url, 
        originalAuthor.username, 
        agentData.name
      );

      if (existing) {
        if (skipIfExists) {
          return existing;
        }
        if (overwriteExisting) {
          // Update existing agent
          const { data, error } = await this.serviceClient
            .from('agents')
            .update({
              ...agentData,
              imported_by: importerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select('*')
            .single();

          if (error) throw error;
          return data;
        }
        throw new Error(`Agent "${agentData.name}" from ${agentData.github_url} already exists. Use skipIfExists or overwriteExisting options.`);
      }
    }

    // Auto-categorize if no category is set
    let categoryId = agentData.category_id;
    if (!categoryId) {
      try {
        const categories = await this.getCategories();
        const autoCategoryId = autoCategorizAgent(agentData as Agent, categories);
        if (autoCategoryId) {
          categoryId = autoCategoryId;
          console.log(`Auto-categorized agent "${agentData.name}" to category: ${categories.find(c => c.id === autoCategoryId)?.name}`);
        }
      } catch (error) {
        console.warn('Failed to auto-categorize agent:', error);
      }
    }

    // Prepare agent data with attribution
    const agentToCreate: Partial<Agent> = {
      ...agentData,
      // Set attribution fields
      author_id: originalAuthor ? importerId : importerId, // For imported agents, use importer as author for now
      imported_by: originalAuthor ? importerId : undefined,
      original_author_github_username: originalAuthor?.username,
      original_author_github_url: originalAuthor?.url,
      original_author_avatar_url: originalAuthor?.avatarUrl,
      github_owner_avatar_url: originalAuthor?.avatarUrl,
      import_source: importSource,
      github_import_hash: importHash,
      // Set auto-categorized category if available
      category_id: categoryId,
    };

    // Create the agent
    const { data, error } = await this.serviceClient
      .from('agents')
      .insert(agentToCreate)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async createAgentsWithAttribution(
    agentsData: Partial<Agent>[], 
    importContext: {
      importerId: string;
      originalAuthor?: {
        username: string;
        url: string;
        avatarUrl: string;
      };
      importSource: 'manual' | 'github_import' | 'api';
      skipIfExists?: boolean;
      overwriteExisting?: boolean;
    }
  ): Promise<{
    created: Agent[];
    skipped: Array<{ name: string; reason: string }>;
    failed: Array<{ name: string; error: string }>;
  }> {
    const created: Agent[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const agentData of agentsData) {
      try {
        // Check if this would be a duplicate first
        if (agentData.github_url && importContext.originalAuthor && agentData.name) {
          const existing = await this.checkForExistingImport(
            agentData.github_url,
            importContext.originalAuthor.username,
            agentData.name
          );

          if (existing) {
            if (importContext.skipIfExists) {
              skipped.push({
                name: agentData.name,
                reason: 'Already exists (skipped)'
              });
              continue;
            }
            if (importContext.overwriteExisting) {
              skipped.push({
                name: agentData.name,
                reason: 'Already exists (will be updated)'
              });
            }
          }
        }

        const agent = await this.createAgentWithAttribution(agentData, importContext);
        created.push(agent);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to create agent ${agentData.name}:`, error);
        
        // Check if this is a duplicate error that we should handle gracefully
        if (errorMessage.includes('already exists')) {
          skipped.push({
            name: agentData.name || 'Unknown',
            reason: 'Already exists'
          });
        } else {
          failed.push({
            name: agentData.name || 'Unknown',
            error: errorMessage
          });
        }
      }
    }

    return { created, skipped, failed };
  }

  /**
   * Auto-categorize existing agents that don't have categories
   */
  async categorizeExistingAgents(options: {
    dryRun?: boolean;
    minConfidenceScore?: number;
  } = {}): Promise<{
    categorized: Array<{ id: string; name: string; category: string; confidence: string }>;
    skipped: Array<{ name: string; reason: string }>;
  }> {
    const { dryRun = false, minConfidenceScore = 2 } = options;

    console.log('🔍 Finding uncategorized agents...');
    
    // Get all agents without categories
    const { data: uncategorizedAgents, error: agentsError } = await this.client
      .from('agents')
      .select('*')
      .is('category_id', null);

    if (agentsError) {
      throw agentsError;
    }

    if (!uncategorizedAgents || uncategorizedAgents.length === 0) {
      return { categorized: [], skipped: [] };
    }

    console.log(`📊 Found ${uncategorizedAgents.length} uncategorized agents`);

    // Get all categories
    const categories = await this.getCategories();
    
    const categorized: Array<{ id: string; name: string; category: string; confidence: string }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    // Process each agent
    for (const agent of uncategorizedAgents) {
      const categoryId = autoCategorizAgent(agent, categories);
      
      if (categoryId) {
        const category = categories.find(c => c.id === categoryId);
        const confidence = getCategorizationConfidence(agent, categories, categoryId);
        
        categorized.push({
          id: agent.id,
          name: agent.name,
          category: category?.name || 'Unknown',
          confidence
        });

        // Apply update if not a dry run
        if (!dryRun) {
          const { error } = await this.serviceClient
            .from('agents')
            .update({ category_id: categoryId })
            .eq('id', agent.id);

          if (error) {
            console.error(`❌ Failed to update ${agent.name}:`, error);
            skipped.push({
              name: agent.name,
              reason: `Update failed: ${error.message}`
            });
            // Remove from categorized array
            categorized.pop();
          } else {
            console.log(`✨ ${agent.name} → ${category?.name} (${confidence} confidence)`);
          }
        } else {
          console.log(`🔍 [DRY RUN] ${agent.name} → ${category?.name} (${confidence} confidence)`);
        }
      } else {
        skipped.push({
          name: agent.name,
          reason: 'No suitable category found'
        });
        console.log(`⚠️  Skipped: ${agent.name} - no suitable category found`);
      }
    }

    return { categorized, skipped };
  }
}

// Export singleton instance
export const db = new SupabaseDatabase();

// Re-export reviews database
export { reviewsDb } from './reviews-database';