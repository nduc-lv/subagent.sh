'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid3x3, 
  List, 
  MoreHorizontal,
  Star,
  Download,
  Eye,
  GitFork,
  Calendar,
  User,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share2,
  Filter,
  SortAsc,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types';

export type ViewMode = 'grid' | 'list' | 'compact';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isEmpty?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onBookmarkToggle?: (agentId: string) => void;
  className?: string;
}

interface SearchResultCardProps {
  agent: SearchResult;
  viewMode: ViewMode;
  onClick: () => void;
  onBookmarkToggle?: (agentId: string) => void;
}

function SearchResultCard({ 
  agent, 
  viewMode, 
  onClick, 
  onBookmarkToggle 
}: SearchResultCardProps) {
  const formatDate = (dateString: string) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle?.(agent.id);
  };

  if (viewMode === 'compact') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-terminal-green"
          onClick={onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{agent.name}</h3>
                  {agent.featured && (
                    <Badge variant="default" className="bg-yellow-500 text-yellow-50">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {agent.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {agent.author_username}
                  </div>
                  
                  {agent.category_name && (
                    <Badge variant="outline" className="text-xs">
                      {agent.category_name}
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {agent.rating_average.toFixed(1)}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {agent.download_count}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {onBookmarkToggle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBookmarkClick}
                    className="h-8 w-8 p-0"
                  >
                    {agent.is_bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-terminal-green" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200"
          onClick={onClick}
        >
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{agent.name}</h3>
                    {agent.featured && (
                      <Badge variant="default" className="bg-yellow-500 text-yellow-50">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  {onBookmarkToggle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBookmarkClick}
                    >
                      {agent.is_bookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-terminal-green" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {agent.description}
                </p>

                {/* Tags */}
                {agent.tags && agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.tags.slice(0, 6).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {agent.tags.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{agent.tags.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Author & Category */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={agent.github_owner_avatar_url || agent.author_avatar_url} />
                    </Avatar>
                    <span>{agent.original_author_github_username || agent.author_full_name || agent.author_username}</span>
                  </div>
                  
                  {agent.category_name && (
                    <Badge variant="secondary">
                      {agent.category_name}
                    </Badge>
                  )}
                  
                  {agent.language && (
                    <Badge variant="outline">
                      {agent.language}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{agent.rating_average.toFixed(1)}</span>
                    <span>({agent.rating_count} reviews)</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{agent.download_count.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{agent.view_count.toLocaleString()}</span>
                  </div>
                  
                  {agent.github_forks > 0 && (
                    <div className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      <span>{agent.github_forks}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(agent.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view (default)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 h-full"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 line-clamp-1">{agent.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={agent.github_owner_avatar_url || agent.author_avatar_url} />
                </Avatar>
                <span>{agent.original_author_github_username || agent.author_username}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {agent.featured && (
                <Star className="h-4 w-4 text-yellow-500" />
              )}
              
              {onBookmarkToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmarkClick}
                  className="h-8 w-8 p-0"
                >
                  {agent.is_bookmarked ? (
                    <BookmarkCheck className="h-4 w-4 text-terminal-green" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[60px]">
            {agent.description}
          </p>

          {/* Category & Language */}
          <div className="flex items-center gap-2 mb-4">
            {agent.category_name && (
              <Badge variant="secondary" className="text-xs">
                {agent.category_name}
              </Badge>
            )}
            
            {agent.language && (
              <Badge variant="outline" className="text-xs">
                {agent.language}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {agent.tags && agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {agent.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {agent.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{agent.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>{agent.rating_average.toFixed(1)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{agent.download_count}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{agent.view_count}</span>
            </div>
            
            <span>{formatDate(agent.updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SearchResults({
  results,
  loading,
  error,
  viewMode,
  onLoadMore,
  hasMore = false,
  isEmpty = false,
  hasActiveFilters = false,
  onClearFilters,
  onBookmarkToggle,
  className
}: SearchResultsProps) {
  if (error) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="text-destructive mb-2 font-medium">Search Error</div>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!loading && results.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Filter className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No agents found</h3>
        <p className="text-muted-foreground mb-4">
          Try adjusting your search criteria or clear filters to see more results.
        </p>
        {hasActiveFilters && onClearFilters && (
          <Button onClick={onClearFilters} variant="outline">
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Results Grid/List */}
      <motion.div
        layout
        className={cn(
          "grid gap-4",
          {
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-3': viewMode === 'grid',
            'grid-cols-1': viewMode === 'list' || viewMode === 'compact',
            'gap-3': viewMode === 'compact'
          }
        )}
      >
        <AnimatePresence mode="popLayout">
          {results.map((agent) => (
            <SearchResultCard
              key={agent.id}
              agent={agent}
              viewMode={viewMode}
              onClick={() => {
                // Navigate to agent detail page
                window.location.href = `/agents/${agent.id}`;
              }}
              onBookmarkToggle={onBookmarkToggle}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Loading skeleton */}
      {loading && (
        <div className={cn(
          "grid gap-4",
          {
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-3': viewMode === 'grid',
            'grid-cols-1': viewMode === 'list' || viewMode === 'compact',
            'gap-3': viewMode === 'compact'
          }
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                  <div className="h-3 bg-muted rounded w-4/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && onLoadMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onLoadMore}
            variant="outline"
            size="lg"
            className="min-w-[140px]"
          >
            Load More Results
          </Button>
        </div>
      )}
    </div>
  );
}