'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowRight,
  SlidersHorizontal,
  Loader2,
  Archive,
  Trash2,
  FolderPlus,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { UnifiedSearchWidget } from '@/components/search/unified-search-widget';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} from '@/components/ui/dialog';

// Import our reusable components
import { FilterSidebar } from '@/components/agents/filter-sidebar';
import { ActiveFilters } from '@/components/agents/active-filters';
import { ResultsHeader } from '@/components/agents/results-header';
import { AgentsGrid } from '@/components/agents/agents-grid';

import { 
  useDebouncedAgentSearch, 
  useCategories, 
  useSearchFacets,
  useBulkAgentOperations,
  useUserCollections
} from '@/hooks/use-database';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import type { SearchFilters } from '@/types';
import { LazyComponent, withPerformance, useDebouncedValue, Skeleton } from '@/lib/performance/react-optimizations';


const AgentsPageContent = withPerformance(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { results, loading, error, search, lastBatchSize } = useDebouncedAgentSearch(500);
  const { facets, loading: facetsLoading } = useSearchFacets();
  const { collections } = useUserCollections(user?.id);
  const { bulkUpdate, bulkDelete, bulkAddToCollection, loading: bulkLoading } = useBulkAgentOperations();

  // Memoize facets data to prevent flickering
  const stableFacets = useMemo(() => {
    if (!facets) {
      return {
        languages: [],
        frameworks: [],
        tags: [],
        categories: []
      };
    }
    return facets;
  }, [facets]);

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    type: 'delete' | 'archive' | 'addToCollection' | null;
    data?: any;
  }>({ type: null });

  // Search State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(
    searchParams.get('frameworks')?.split(',').filter(Boolean) || []
  );
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'relevance');
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get('featured') === 'true');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    if (selectedFrameworks.length > 0) params.set('frameworks', selectedFrameworks.join(','));
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (featuredOnly) params.set('featured', 'true');
    
    const newUrl = `/agents${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedCategory, selectedTags, selectedFrameworks, sortBy, featuredOnly, router]);

  // Search when filters change with improved initial load handling
  useEffect(() => {
    // Always use timeout for consistent behavior and to allow auth to settle
    const timeoutId = setTimeout(() => {
      const filters: SearchFilters & { limit: number; offset: number } = {
        query: searchQuery,
        category: selectedCategory || undefined,
        tags: selectedTags,
        frameworks: selectedFrameworks,
        sortBy: sortBy as any,
        featured: featuredOnly ? true : undefined,
        limit,
        offset: (currentPage - 1) * limit
      };

      try {
        search(filters);
      } catch (err) {
        console.error('Search error in agents page:', err);
      }
    }, 200); // Shorter delay for better responsiveness but still allows auth to settle

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedTags, selectedFrameworks, sortBy, featuredOnly, currentPage, limit]);

  // Update hasMore when results change
  useEffect(() => {
    // If the last batch returned fewer results than the limit, there are no more results
    setHasMore(lastBatchSize >= limit);
  }, [lastBatchSize, limit]);

  // Handle search input - now optimized for debounced search
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  // Only search when user explicitly triggers it (Enter key or search button)
  // Removed auto-search on typing for more deliberate search experience

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Selection handlers
  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const selectAllAgents = () => {
    setSelectedAgents(results.map(agent => agent.id));
  };

  const clearSelection = () => {
    setSelectedAgents([]);
  };

  const isAllSelected = selectedAgents.length === results.length && results.length > 0;
  const isSomeSelected = selectedAgents.length > 0 && selectedAgents.length < results.length;

  // Filter handlers
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1);
  }, []);


  const toggleFramework = useCallback((framework: string) => {
    setSelectedFrameworks(prev =>
      prev.includes(framework)
        ? prev.filter(f => f !== framework)
        : [...prev, framework]
    );
    setCurrentPage(1);
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setSelectedCategory('');
    setSelectedTags([]);
    setSelectedFrameworks([]);
    setSortBy('relevance');
    setFeaturedOnly(false);
    setCurrentPage(1);
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    try {
      await bulkDelete(selectedAgents);
      setSelectedAgents([]);
      setBulkActionDialog({ type: null });
      // Refresh results
      handleSearch();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const handleBulkArchive = async () => {
    try {
      await bulkUpdate(selectedAgents, { status: 'archived' });
      setSelectedAgents([]);
      setBulkActionDialog({ type: null });
      // Refresh results
      handleSearch();
    } catch (err) {
      console.error('Bulk archive failed:', err);
    }
  };

  const handleBulkAddToCollection = async (collectionId: string) => {
    try {
      await bulkAddToCollection(collectionId, selectedAgents);
      setSelectedAgents([]);
      setBulkActionDialog({ type: null });
    } catch (err) {
      console.error('Failed to add to collection:', err);
    }
  };

  const hasActiveFilters = Boolean(searchQuery) || Boolean(selectedCategory) || selectedTags.length > 0 || 
    selectedFrameworks.length > 0 || featuredOnly;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return 'Recently';
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
      
      const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Check if days is a finite number
      if (!isFinite(days)) {
        return 'Recently';
      }
      
      // Handle edge cases
      if (days === 0) {
        return 'Today';
      } else if (days === -1) {
        return 'Yesterday';
      } else if (days < -30) {
        return new Intl.DateTimeFormat('en', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        }).format(date);
      }
      
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(days, 'day');
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Recently';
    }
  };


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-16 pb-16">

        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Browse Sub-Agents
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              Discover and explore powerful sub-agents crafted by the community.
            </p>

            {user && (
              <Button 
                onClick={() => router.push('/submit')}
                className="mb-8"
              >
                <Zap className="w-4 h-4 mr-2" />
                Create Your Agent
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </motion.div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl mx-auto"
          >
            <UnifiedSearchWidget
              variant="page"
              placeholder="Search for agents, tools, or functionality..."
              searchValue={searchInput}
              onSearchValueChange={setSearchInput}
              onSearch={handleSearch}
              showTrending={true}
              showSuggestions={false}
              className="mb-4"
            />
            
            {/* Mobile Filter Button */}
            <div className="flex justify-center lg:hidden mt-4">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="relative px-6 backdrop-blur-sm">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">
                          {(selectedCategory ? 1 : 0) + selectedTags.length + selectedFrameworks.length + (searchQuery ? 1 : 0) + (featuredOnly ? 1 : 0)}
                        </span>
                      </div>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search results
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar
                      featuredOnly={featuredOnly}
                      setFeaturedOnly={setFeaturedOnly}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      selectedFrameworks={selectedFrameworks}
                      setSelectedFrameworks={setSelectedFrameworks}
                      categories={categories}
                      facets={stableFacets}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Spacing Section */}
      <div className="h-8"></div>

      {/* Main Content Area */}
      <section className="relative mt-16 pb-24">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Active Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <ActiveFilters
            hasActiveFilters={hasActiveFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSearchInput={setSearchInput}
            featuredOnly={featuredOnly}
            setFeaturedOnly={setFeaturedOnly}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
            selectedTags={selectedTags}
            toggleTag={toggleTag}
            selectedFrameworks={selectedFrameworks}
            toggleFramework={toggleFramework}
            clearFilters={clearFilters}
            onPageChange={setCurrentPage}
          />
          </motion.div>

          {/* Selection and Bulk Actions */}
          <AnimatePresence>
            {selectedAgents.length > 0 && user && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl border border-primary/20 backdrop-blur-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isSomeSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllAgents();
                            } else {
                              clearSelection();
                            }
                          }}
                          className="data-[state=checked]:bg-primary border-primary/50"
                        />
                        <span className="text-sm font-medium text-primary">
                          {selectedAgents.length} selected
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearSelection}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background/50"
                        >
                          Clear
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Add to Collection */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background/50">
                              <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                              Add to Collection
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="backdrop-blur-md bg-card/95">
                            {collections.map(collection => (
                              <DropdownMenuItem
                                key={collection.id}
                                onClick={() => handleBulkAddToCollection(collection.id)}
                                className="cursor-pointer"
                              >
                                <FolderPlus className="h-4 w-4 mr-2" />
                                {collection.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Archive */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBulkActionDialog({ type: 'archive' })}
                          className="h-8 px-3 text-xs text-orange-600 hover:bg-orange-500/10"
                        >
                          <Archive className="h-3.5 w-3.5 mr-1.5" />
                          Archive
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBulkActionDialog({ type: 'delete' })}
                          className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            className="flex gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <motion.div 
                className="sticky top-8"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
              >
                <Card className="border border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <SlidersHorizontal className="w-5 h-5 text-primary" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <FilterSidebar
                      featuredOnly={featuredOnly}
                      setFeaturedOnly={setFeaturedOnly}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      selectedFrameworks={selectedFrameworks}
                      setSelectedFrameworks={setSelectedFrameworks}
                      categories={categories}
                      facets={stableFacets}
                      onPageChange={setCurrentPage}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Results */}
            <motion.div 
              className="flex-1 min-w-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              <ResultsHeader
                loading={loading}
                resultsCount={results.length}
                hasActiveFilters={hasActiveFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
                viewMode={viewMode}
                setViewMode={setViewMode}
                user={user}
                isAllSelected={isAllSelected}
                isSomeSelected={isSomeSelected}
                selectAllAgents={selectAllAgents}
                clearSelection={clearSelection}
                onPageChange={setCurrentPage}
              />

              <AgentsGrid
                agents={results}
                loading={loading}
                error={error}
                viewMode={viewMode}
                user={user}
                selectedAgents={selectedAgents}
                toggleAgentSelection={toggleAgentSelection}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
                hasMore={hasMore}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                formatDate={formatDate}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Bulk Action Dialogs */}
      <Dialog open={bulkActionDialog.type === 'delete'} onOpenChange={() => setBulkActionDialog({ type: null })}>
        <DialogContent>
          <DialogHeader>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl text-center text-destructive">Delete Agents</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedAgents.length}</span> agent{selectedAgents.length !== 1 ? 's' : ''}? 
              <br />
              <span className="text-destructive font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => setBulkActionDialog({ type: null })}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="flex-1"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkActionDialog.type === 'archive'} onOpenChange={() => setBulkActionDialog({ type: null })}>
        <DialogContent>
          <DialogHeader>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Archive className="w-6 h-6 text-orange-600" />
            </div>
            <DialogTitle className="text-xl text-center text-orange-600">Archive Agents</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Are you sure you want to archive <span className="font-semibold text-foreground">{selectedAgents.length}</span> agent{selectedAgents.length !== 1 ? 's' : ''}? 
              <br />
              <span className="text-muted-foreground">They will be hidden from public view but can be restored later.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => setBulkActionDialog({ type: null })}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleBulkArchive}
              disabled={bulkLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  return false; // Always re-render for now, can be optimized further
});

AgentsPageContent.displayName = 'AgentsPageContent';

export default function AgentsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AgentsPageContent />
    </Suspense>
  );
}