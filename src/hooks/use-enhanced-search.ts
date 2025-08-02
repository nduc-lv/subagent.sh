'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabase/database';
import { useAuth } from '@/contexts/auth-context';
import type { 
  SearchState, 
  SearchFilters, 
  EnhancedSearchFilters,
  SearchResult, 
  SearchFacets,
  SavedSearch,
  SearchSuggestion 
} from '@/types';

// Custom hook for managing search state and interactions
export function useEnhancedSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Initialize state from URL parameters
  const initialFilters: SearchFilters = useMemo(() => ({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    language: searchParams.get('language') || undefined,
    framework: searchParams.get('framework') || undefined,
    ratingMin: searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    featured: searchParams.get('featured') === 'true',
    sortBy: (searchParams.get('sort') as any) || 'relevance'
  }), [searchParams]);

  // Main search state
  const [searchState, setSearchState] = useState<SearchState>({
    query: initialFilters.query || '',
    filters: initialFilters,
    results: [],
    loading: false,
    error: null,
    facets: null,
    totalResults: 0,
    currentPage: 1,
    hasMore: true,
    suggestions: [],
    recentSearches: [],
    savedSearches: []
  });

  // Session management for analytics
  const [sessionId] = useState(() => 
    crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)
  );

  // Debounced search input
  const [searchInput, setSearchInput] = useState(searchState.query);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update URL when filters change
  const updateURL = useCallback((filters: SearchFilters) => {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.category) params.set('category', filters.category);
    if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.language) params.set('language', filters.language);
    if (filters.framework) params.set('framework', filters.framework);
    if (filters.ratingMin) params.set('rating', filters.ratingMin.toString());
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.featured) params.set('featured', 'true');
    if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sort', filters.sortBy);
    
    const newUrl = `/agents${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [router]);

  // Perform search
  const performSearch = useCallback(async (
    filters: SearchFilters, 
    page = 1, 
    append = false,
    skipLoadingState = false
  ) => {
    try {
      // Only set loading state if we're not skipping it (to prevent flashing during debounce)
      if (!skipLoadingState) {
        setSearchState(prev => ({ 
          ...prev, 
          loading: true, 
          error: null,
          currentPage: page
        }));
      }

      const limit = 20;
      const offset = (page - 1) * limit;

      const enhancedFilters: EnhancedSearchFilters = {
        ...filters,
        limit,
        offset,
        userId: user?.id,
        sessionId
      };

      const results = await db.searchAgents(enhancedFilters);
      
      setSearchState(prev => ({
        ...prev,
        results: append ? [...prev.results, ...results] : results,
        loading: false,
        totalResults: results.length < limit ? offset + results.length : offset + results.length + 1,
        hasMore: results.length === limit,
        filters,
        currentPage: page
      }));

      // Update URL
      updateURL(filters);

    } catch (error) {
      setSearchState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }));
    }
  }, [user?.id, sessionId, updateURL]);

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      const newFilters = { ...searchState.filters, query };
      // Skip loading state for debounced searches to prevent flashing
      performSearch(newFilters, 1, false, true);
    }, 800); // Increased from 300ms to 800ms

    setSearchTimeout(timeout);
  }, [searchState.filters, performSearch]); // Removed searchTimeout from deps to prevent infinite loop

  // Handle search input changes
  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value);
    setSearchState(prev => ({ ...prev, query: value }));
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Load search facets
  const loadFacets = useCallback(async () => {
    try {
      const facets = await db.getSearchFacets();
      setSearchState(prev => ({ ...prev, facets }));
    } catch (error) {
      console.warn('Failed to load search facets:', error);
    }
  }, []);

  // Load search suggestions
  const loadSuggestions = useCallback(async (prefix: string) => {
    if (prefix.length < 2) {
      setSearchState(prev => ({ ...prev, suggestions: [] }));
      return;
    }

    try {
      const suggestions = await db.getSearchSuggestions(prefix, 8);
      setSearchState(prev => ({ ...prev, suggestions }));
    } catch (error) {
      console.warn('Failed to load suggestions:', error);
    }
  }, []);

  // Load recent searches
  const loadRecentSearches = useCallback(async () => {
    if (!user?.id) return;

    try {
      const recentSearches = await db.getUserRecentSearches(user.id, 10);
      setSearchState(prev => ({ ...prev, recentSearches }));
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }, [user?.id]);

  // Load saved searches
  const loadSavedSearches = useCallback(async () => {
    if (!user?.id) return;

    try {
      const savedSearches = await db.getUserSavedSearches(user.id);
      setSearchState(prev => ({ ...prev, savedSearches }));
    } catch (error) {
      console.warn('Failed to load saved searches:', error);
    }
  }, [user?.id]);

  // Filter management
  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    const newFilters = { ...searchState.filters, [key]: value };
    // Skip loading state for filter changes to prevent flashing
    performSearch(newFilters, 1, false, true);
  }, [searchState.filters, performSearch]);

  const toggleTag = useCallback((tag: string) => {
    const currentTags = searchState.filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    updateFilter('tags', newTags);
  }, [searchState.filters.tags, updateFilter]);

  const clearFilters = useCallback(() => {
    const clearedFilters: SearchFilters = {
      query: '',
      sortBy: 'relevance'
    };
    setSearchInput('');
    // Skip loading state for clearing filters to prevent flashing
    performSearch(clearedFilters, 1, false, true);
  }, [performSearch]);

  const clearFilter = useCallback((key: keyof SearchFilters) => {
    const newFilters = { ...searchState.filters };
    if (key === 'tags') {
      newFilters[key] = [];
    } else {
      delete newFilters[key];
    }
    if (key === 'query') {
      setSearchInput('');
    }
    // Skip loading state for clearing individual filters to prevent flashing
    performSearch(newFilters, 1, false, true);
  }, [searchState.filters, performSearch]);

  // Pagination
  const loadMore = useCallback(() => {
    if (!searchState.loading && searchState.hasMore) {
      performSearch(searchState.filters, searchState.currentPage + 1, true);
    }
  }, [searchState.loading, searchState.hasMore, searchState.filters, searchState.currentPage, performSearch]);

  // Saved search management
  const saveCurrentSearch = useCallback(async (name: string) => {
    if (!user?.id) throw new Error('Must be logged in');

    const savedSearch = await db.createSavedSearch({
      user_id: user.id,
      name,
      query: searchState.query,
      filters: searchState.filters,
      is_alert: false,
      alert_frequency: 'daily'
    });

    setSearchState(prev => ({
      ...prev,
      savedSearches: [savedSearch, ...prev.savedSearches]
    }));

    return savedSearch;
  }, [user?.id, searchState.query, searchState.filters]);

  const deleteSavedSearch = useCallback(async (id: string) => {
    await db.deleteSavedSearch(id);
    setSearchState(prev => ({
      ...prev,
      savedSearches: prev.savedSearches.filter(s => s.id !== id)
    }));
  }, []);

  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    const filters = {
      ...savedSearch.filters,
      query: savedSearch.query || ''
    } as SearchFilters;
    
    setSearchInput(filters.query || '');
    performSearch(filters, 1, false);
  }, [performSearch]);

  // Initialize
  useEffect(() => {
    loadFacets();
    loadRecentSearches();
    loadSavedSearches();
  }, [loadFacets, loadRecentSearches, loadSavedSearches]);

  // Initial search - only if there are meaningful filters
  useEffect(() => {
    const hasInitialFilters = initialFilters.query || 
                             initialFilters.category || 
                             (initialFilters.tags && initialFilters.tags.length > 0) ||
                             initialFilters.featured;
    
    if (hasInitialFilters) {
      performSearch(initialFilters, 1, false);
    }
  }, []); // Only run once on mount

  // Load suggestions when search input changes (with debounce)
  useEffect(() => {
    const suggestionTimeout = setTimeout(() => {
      if (searchInput.length >= 2) {
        loadSuggestions(searchInput);
      } else {
        setSearchState(prev => ({ ...prev, suggestions: [] }));
      }
    }, 500); // Add debounce for suggestions

    return () => clearTimeout(suggestionTimeout);
  }, [searchInput, loadSuggestions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Derived state
  const hasActiveFilters = useMemo(() => {
    const { query, category, tags, language, framework, ratingMin, dateFrom, dateTo, featured } = searchState.filters;
    return !!(query || category || (tags && tags.length > 0) || language || framework || ratingMin || dateFrom || dateTo || featured);
  }, [searchState.filters]);

  const isEmpty = useMemo(() => {
    return !searchState.loading && searchState.results.length === 0;
  }, [searchState.loading, searchState.results.length]);

  return {
    // State
    searchState,
    searchInput,
    hasActiveFilters,
    isEmpty,

    // Actions
    handleSearchInput,
    updateFilter,
    toggleTag,
    clearFilters,
    clearFilter,
    loadMore,
    performSearch,

    // Search suggestions
    loadSuggestions,

    // Saved searches
    saveCurrentSearch,
    deleteSavedSearch,
    loadSavedSearch,

    // Utilities
    refreshFacets: loadFacets
  };
}

// Hook for search analytics (admin/user dashboard)
export function useSearchAnalytics(userId?: string, daysBack = 30) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const data = await db.getSearchAnalytics(userId, daysBack);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [userId, daysBack]);

  return { analytics, loading, error };
}

// Hook for trending searches
export function useTrendingSearches(daysBack = 7, limit = 10) {
  const [trendingSearches, setTrendingSearches] = useState<Array<{ query: string; search_count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrendingSearches() {
      try {
        setLoading(true);
        setError(null);
        const data = await db.getTrendingSearches(daysBack, limit);
        setTrendingSearches(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trending searches');
      } finally {
        setLoading(false);
      }
    }

    fetchTrendingSearches();
  }, [daysBack, limit]);

  return { trendingSearches, loading, error };
}