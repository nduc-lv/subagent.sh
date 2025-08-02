'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bookmark,
  BookmarkMinus,
  Star,
  Zap,
  ArrowRight,
  SlidersHorizontal,
  Clock,
  Calendar,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingSpinner } from '@/components/ui/loading';
import { AgentCard } from '@/components/ui/agent-card';
import { useAuth } from '@/contexts/auth-context';
import { useUserBookmarks } from '@/hooks/use-database';
import { UnifiedSearchWidget } from '@/components/search/unified-search-widget';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Agent, Bookmark } from '@/types';

interface BookmarkedAgent extends Agent {
  bookmarked_at: string;
  bookmark_id: string;
}

function BookmarksPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookmarks: bookmarksData, loading, error, refetch } = useUserBookmarks(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'rating'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Auto-refresh bookmarks every 5 minutes to keep data current
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing bookmarks...');
      refetch();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [user, refetch]);

  const bookmarks = bookmarksData || [];

  const removeBookmark = async (agentId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      // Using imported supabase client

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user!.id)
        .eq('agent_id', agentId);

      if (error) {
        console.error('Error removing bookmark:', error);
      } else {
        // Refresh bookmarks after removal
        refetch();
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredAndSortedBookmarks = bookmarks
    .filter(bookmark => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        bookmark.name.toLowerCase().includes(query) ||
        bookmark.description?.toLowerCase().includes(query) ||
        bookmark.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.bookmarked_at).getTime() - new Date(a.bookmarked_at).getTime();
        case 'oldest':
          return new Date(a.bookmarked_at).getTime() - new Date(b.bookmarked_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating_average || 0) - (a.rating_average || 0);
        default:
          return 0;
      }
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  if (!user) {
    return null;
  }

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
              My Bookmarks
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your collection of saved sub-agents for quick access
            </p>
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
              placeholder="Search your bookmarks..."
              searchValue={searchInput}
              onSearchValueChange={setSearchInput}
              onSearch={handleSearch}
              showTrending={false}
              showSuggestions={false}
              className="mb-4"
            />
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative pb-24">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Stats and Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredAndSortedBookmarks.length}</span>
                {' '}bookmark{filteredAndSortedBookmarks.length !== 1 ? 's' : ''}
                {searchQuery && ' found'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refetch}
                disabled={loading}
                className="px-3 h-9"
              >
                {loading ? (
                  <Zap className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Refresh
              </Button>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px] h-9">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Newest First
                    </div>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Oldest First
                    </div>
                  </SelectItem>
                  <SelectItem value="name">
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Name A-Z
                    </div>
                  </SelectItem>
                  <SelectItem value="rating">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-2" />
                      Highest Rated
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-lg border">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none h-9"
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none h-9"
                >
                  List
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Bookmarks Grid/List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <LoadingSpinner />
              </div>
            ) : filteredAndSortedBookmarks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-16">
                  <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-3">
                    {searchQuery ? 'No matching bookmarks' : 'No bookmarks yet'}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchQuery 
                      ? 'Try adjusting your search query or browse all agents'
                      : 'Start exploring agents and bookmark your favorites for quick access'
                    }
                  </p>
                  <div className="flex gap-3 justify-center">
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery('');
                          setSearchInput('');
                        }}
                      >
                        Clear Search
                      </Button>
                    )}
                    <Button onClick={() => router.push('/agents')}>
                      <Zap className="w-4 h-4 mr-2" />
                      Browse Agents
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              )}>
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedBookmarks.map((agent, index) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="relative"
                    >
                      {/* Bookmark indicator badge */}
                      <div className="absolute top-12 right-2 z-10">
                        <Badge variant="outline" className="text-xs bg-background/90 backdrop-blur-sm">
                          <Bookmark className="h-3 w-3 mr-1 fill-current" />
                          {formatDate(agent.bookmarked_at)}
                        </Badge>
                      </div>
                      
                      {/* Remove bookmark button */}
                      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBookmark(agent.id);
                          }}
                          className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <BookmarkMinus className="h-4 w-4" />
                        </Button>
                      </div>

                      <AgentCard
                        id={agent.id}
                        title={agent.name}
                        description={agent.description || ''}
                        author={agent.original_author_github_username || agent.author?.full_name || agent.author?.username || 'Unknown'}
                        authorUsername={agent.original_author_github_username || agent.author?.username}
                        category={agent.categories?.name || 'Uncategorized'}
                        tags={agent.tags || []}
                        rating={agent.rating_average || 0}
                        downloads={agent.download_count || 0}
                        views={agent.view_count || 0}
                        forks={agent.github_forks || 0}
                        lastUpdated={formatDate(agent.updated_at)}
                        featured={agent.featured || false}
                        isGitHubAuthor={!!agent.original_author_github_username}
                        authorAvatar={agent.github_owner_avatar_url || agent.author?.avatar_url}
                        authorGitHubUrl={agent.original_author_github_url}
                        onClick={() => router.push(`/agents/${agent.id}`)}
                        className={cn(
                          "group relative border border-border/60 hover:border-border transition-colors hover:shadow-lg",
                          viewMode === 'list' && 'h-auto',
                          agent.featured && 'border-amber-400/50'
                        )}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingSpinner />}>
        <BookmarksPageContent />
      </Suspense>
    </AuthGuard>
  );
}