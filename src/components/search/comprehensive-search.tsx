'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  Star,
  Download,
  Calendar,
  Tag as TagIcon,
  Code,
  TrendingUp,
  SortAsc,
  SortDesc,
  Grid3x3,
  List,
  Bookmark,
  ExternalLink,
  BarChart3,
  Clock,
  Save,
  Settings2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { EnhancedSearchBar } from './enhanced-search-bar';
import { SearchResults } from './search-results';
import { useEnhancedSearch, useTrendingSearches } from '@/hooks/use-enhanced-search';
import { useCategories } from '@/hooks/use-database';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import type { SearchFilters, SavedSearch } from '@/types';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant', icon: Search },
  { value: 'newest', label: 'Newest First', icon: Calendar },
  { value: 'downloads', label: 'Most Downloaded', icon: Download },
  { value: 'rating', label: 'Highest Rated', icon: Star },
  { value: 'updated', label: 'Recently Updated', icon: Clock },
  { value: 'trending', label: 'Trending Now', icon: TrendingUp },
];

const VIEW_MODES = [
  { value: 'grid', label: 'Grid View', icon: Grid3x3 },
  { value: 'list', label: 'List View', icon: List },
] as const;

interface ComprehensiveSearchProps {
  initialFilters?: SearchFilters;
  showSidebar?: boolean;
  compactMode?: boolean;
  className?: string;
}

export function ComprehensiveSearch({
  initialFilters,
  showSidebar = true,
  compactMode = false,
  className
}: ComprehensiveSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { trendingSearches } = useTrendingSearches();
  
  const {
    searchState,
    searchInput,
    hasActiveFilters,
    isEmpty,
    handleSearchInput,
    updateFilter,
    toggleTag,
    clearFilters,
    clearFilter,
    loadMore,
    saveCurrentSearch,
    deleteSavedSearch,
    loadSavedSearch,
    refreshFacets
  } = useEnhancedSearch();

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (searchParams.get('view') as 'grid' | 'list') || 'grid'
  );
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    tags: true,
    technical: false,
    rating: false,
    date: false,
    advanced: false
  });

  // Filter state for complex filters
  const [localRatingRange, setLocalRatingRange] = useState([0]);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // Derived state
  const resultCount = searchState.totalResults;
  const isLoading = searchState.loading;
  const facets = searchState.facets;

  // Update URL when view mode changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }
    
    const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
    router.replace(newUrl, { scroll: false });
  }, [viewMode, searchParams, router]);

  // Handle rating filter
  const handleRatingChange = useCallback((value: number[]) => {
    setLocalRatingRange(value);
    updateFilter('ratingMin', value[0] > 0 ? value[0] : undefined);
  }, [updateFilter]);

  // Handle date range filter
  const handleDateRangeChange = useCallback((from?: string, to?: string) => {
    setDateRange({ from, to });
    updateFilter('dateFrom', from);
    updateFilter('dateTo', to);
  }, [updateFilter]);

  // Save current search
  const handleSaveSearch = useCallback(async () => {
    if (!saveSearchName.trim()) return;
    
    try {
      await saveCurrentSearch(saveSearchName.trim());
      setShowSaveDialog(false);
      setSaveSearchName('');
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  }, [saveSearchName, saveCurrentSearch]);

  // Toggle section expansion
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Filter sections
  const FilterSection = ({ 
    title, 
    icon: Icon, 
    section, 
    children, 
    count 
  }: { 
    title: string; 
    icon: React.ElementType; 
    section: keyof typeof expandedSections; 
    children: React.ReactNode;
    count?: number;
  }) => (
    <Collapsible 
      open={expandedSections[section]} 
      onOpenChange={() => toggleSection(section)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto font-medium"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
            {count && (
              <Badge variant="outline" className="ml-auto">
                {count}
              </Badge>
            )}
          </div>
          {expandedSections[section] ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  // Categories filter
  const CategoriesFilter = () => (
    <FilterSection title="Categories" icon={Sliders} section="categories" count={categories.length}>
      <div className="space-y-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => updateFilter('category', 
              searchState.filters.category === category.id ? undefined : category.id
            )}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
              searchState.filters.category === category.id
                ? "bg-terminal-green/10 text-terminal-green border border-terminal-green/20"
                : "hover:bg-muted"
            )}
          >
            {category.icon && (
              <span className="text-lg" style={{ color: category.color }}>
                {category.icon}
              </span>
            )}
            <span className="flex-1">{category.name}</span>
            <Badge variant="outline" className="text-xs">
              {category.agent_count}
            </Badge>
          </button>
        ))}
      </div>
    </FilterSection>
  );

  // Tags filter with cloud layout
  const TagsFilter = () => {
    const popularTags = facets?.tags?.slice(0, 20) || [];
    
    return (
      <FilterSection title="Popular Tags" icon={TagIcon} section="tags" count={popularTags.length}>
        <div className="flex flex-wrap gap-2">
          {popularTags.map(tag => (
            <Badge
              key={tag.name}
              variant={searchState.filters.tags?.includes(tag.name) ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                searchState.filters.tags?.includes(tag.name)
                  ? "bg-terminal-green text-terminal-green-foreground"
                  : "hover:bg-terminal-green/10 hover:text-terminal-green"
              )}
              onClick={() => toggleTag(tag.name)}
            >
              {tag.name}
              <span className="ml-1 text-xs opacity-75">
                {tag.count}
              </span>
            </Badge>
          ))}
        </div>
      </FilterSection>
    );
  };

  // Technical filters (language, framework)
  const TechnicalFilters = () => {
    const languages = facets?.languages?.slice(0, 10) || [];
    const frameworks = facets?.frameworks?.slice(0, 10) || [];

    return (
      <FilterSection title="Technical" icon={Code} section="technical">
        <div className="space-y-4">

          {/* Frameworks */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Frameworks</Label>
            <div className="space-y-1">
              {frameworks.map(framework => (
                <label
                  key={framework.name}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox
                    checked={searchState.filters.framework === framework.name}
                    onCheckedChange={(checked) => 
                      updateFilter('framework', checked ? framework.name : undefined)
                    }
                  />
                  <span className="text-sm flex-1">{framework.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {framework.count}
                  </Badge>
                </label>
              ))}
            </div>
          </div>
        </div>
      </FilterSection>
    );
  };

  // Rating filter
  const RatingFilter = () => (
    <FilterSection title="Minimum Rating" icon={Star} section="rating">
      <div className="space-y-3">
        <div className="px-2">
          <Slider
            value={localRatingRange}
            onValueChange={setLocalRatingRange}
            onValueCommit={handleRatingChange}
            max={5}
            min={0}
            step={0.5}
            className="w-full"
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Any rating</span>
          <span>{localRatingRange[0]}+ stars</span>
        </div>
      </div>
    </FilterSection>
  );

  // Date range filter
  const DateFilter = () => (
    <FilterSection title="Date Range" icon={Calendar} section="date">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateRange.from || ''}
              onChange={(e) => handleDateRangeChange(e.target.value, dateRange.to)}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateRange.to || ''}
              onChange={(e) => handleDateRangeChange(dateRange.from, e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
        {(dateRange.from || dateRange.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDateRangeChange(undefined, undefined)}
            className="w-full"
          >
            Clear dates
          </Button>
        )}
      </div>
    </FilterSection>
  );

  // Advanced filters
  const AdvancedFilters = () => (
    <FilterSection title="Advanced" icon={Settings2} section="advanced">
      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <Switch
            checked={searchState.filters.featured || false}
            onCheckedChange={(checked) => updateFilter('featured', checked || undefined)}
          />
          <span className="text-sm">Featured agents only</span>
        </label>
      </div>
    </FilterSection>
  );

  // Active filters display
  const ActiveFilters = () => {
    if (!hasActiveFilters) return null;

    const activeFilters = [];
    
    if (searchState.filters.query) {
      activeFilters.push({
        key: 'query',
        label: `Search: "${searchState.filters.query}"`,
        onRemove: () => clearFilter('query')
      });
    }
    
    if (searchState.filters.category) {
      const category = categories.find(c => c.id === searchState.filters.category);
      activeFilters.push({
        key: 'category',
        label: category?.name || 'Category',
        onRemove: () => clearFilter('category')
      });
    }

    searchState.filters.tags?.forEach(tag => {
      activeFilters.push({
        key: `tag-${tag}`,
        label: tag,
        onRemove: () => toggleTag(tag)
      });
    });

    if (searchState.filters.language) {
      activeFilters.push({
        key: 'language',
        label: `Language: ${searchState.filters.language}`,
        onRemove: () => clearFilter('language')
      });
    }

    if (searchState.filters.framework) {
      activeFilters.push({
        key: 'framework',
        label: `Framework: ${searchState.filters.framework}`,
        onRemove: () => clearFilter('framework')
      });
    }

    if (searchState.filters.ratingMin) {
      activeFilters.push({
        key: 'rating',
        label: `Rating: ${searchState.filters.ratingMin}+ stars`,
        onRemove: () => clearFilter('ratingMin')
      });
    }

    if (searchState.filters.featured) {
      activeFilters.push({
        key: 'featured',
        label: 'Featured only',
        onRemove: () => clearFilter('featured')
      });
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border"
      >
        <span className="text-sm font-medium">Active filters:</span>
        
        {activeFilters.map(filter => (
          <Badge
            key={filter.key}
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
            onClick={filter.onRemove}
          >
            {filter.label}
            <X className="h-3 w-3" />
          </Badge>
        ))}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto text-xs"
        >
          Clear all
        </Button>
      </motion.div>
    );
  };

  // Saved searches sidebar
  const SavedSearches = () => {
    if (!user || searchState.savedSearches.length === 0) return null;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {searchState.savedSearches.slice(0, 5).map(savedSearch => (
            <div
              key={savedSearch.id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group"
              onClick={() => loadSavedSearch(savedSearch)}
            >
              <span className="flex-1 text-sm truncate">{savedSearch.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSavedSearch(savedSearch.id);
                }}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  // Trending searches
  const TrendingSearches = () => {
    if (trendingSearches.length === 0) return null;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {trendingSearches.slice(0, 5).map((trend, index) => (
            <button
              key={trend.query}
              onClick={() => handleSearchInput(trend.query)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left"
            >
              <span className="text-xs text-muted-foreground w-4">
                #{index + 1}
              </span>
              <span className="flex-1 text-sm truncate">{trend.query}</span>
              <Badge variant="outline" className="text-xs">
                {trend.search_count}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header with search and controls */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Enhanced Search Bar */}
          <div className="flex-1">
            <EnhancedSearchBar
              value={searchInput}
              onChange={handleSearchInput}
              onSearch={() => {}} // Already handled by debounced search
              suggestions={searchState.suggestions}
              recentSearches={searchState.recentSearches}
              placeholder="Search agents, tags, descriptions..."
              className="w-full"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2 flex-wrap">
            {/* Mobile Filters */}
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs">
                      {Object.values(searchState.filters).filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Search Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search results
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  <CategoriesFilter />
                  <TagsFilter />
                  <TechnicalFilters />
                  <RatingFilter />
                  <DateFilter />
                  <AdvancedFilters />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORT_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => updateFilter('sortBy', option.value)}
                      className={cn(
                        searchState.filters.sortBy === option.value && 
                        "bg-terminal-green/10 text-terminal-green"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode */}
            <div className="hidden sm:flex border rounded-md">
              {VIEW_MODES.map(mode => {
                const Icon = mode.icon;
                return (
                  <Button
                    key={mode.value}
                    variant={viewMode === mode.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode.value)}
                    className={cn(
                      mode.value === 'grid' && "rounded-r-none",
                      mode.value === 'list' && "rounded-l-none"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>

            {/* Save Search */}
            {user && hasActiveFilters && (
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                    <DialogDescription>
                      Save your current search filters for quick access later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="search-name">Search Name</Label>
                    <Input
                      id="search-name"
                      value={saveSearchName}
                      onChange={(e) => setSaveSearchName(e.target.value)}
                      placeholder="Enter a name for this search..."
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSaveSearch}
                      disabled={!saveSearchName.trim()}
                    >
                      Save Search
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              onClick={refreshFacets}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        <AnimatePresence>
          {hasActiveFilters && (
            <div className="mt-4">
              <ActiveFilters />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-8 space-y-4">
              <SavedSearches />
              <TrendingSearches />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-0">
                  <CategoriesFilter />
                  <TagsFilter />
                  <TechnicalFilters />
                  <RatingFilter />
                  <DateFilter />
                  <AdvancedFilters />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground">
              {isLoading && searchState.results.length === 0 ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : (
                <>
                  {resultCount > 0 ? (
                    `${resultCount.toLocaleString()} agent${resultCount === 1 ? '' : 's'} found`
                  ) : (
                    'No agents found'
                  )}
                  {searchState.filters.query && (
                    <span className="ml-1">
                      for "{searchState.filters.query}"
                    </span>
                  )}
                </>
              )}
            </div>

            {resultCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>
                  Showing {searchState.results.length} of {resultCount}
                </span>
              </div>
            )}
          </div>

          {/* Search Results */}
          <SearchResults
            results={searchState.results}
            loading={isLoading && searchState.results.length === 0}
            error={searchState.error}
            viewMode={viewMode}
            onLoadMore={loadMore}
            hasMore={searchState.hasMore}
            isEmpty={isEmpty}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </div>
      </div>
    </div>
  );
}