'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  Search, 
  Star, 
  Clock, 
  TrendingUp, 
  Shield, 
  MessageSquare,
  ChevronDown,
  SortAsc,
  SortDesc,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReviewCard } from './review-card';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import type { Review, ReviewFilters, ReviewStatistics, VerificationLevel } from '@/types';

interface ReviewListProps {
  agentId?: string;
  reviews: Review[];
  statistics?: ReviewStatistics;
  loading?: boolean;
  error?: string | null;
  filters: ReviewFilters;
  onFiltersChange: (filters: ReviewFilters) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  showAgent?: boolean;
  onVote?: (reviewId: string, voteType: 'upvote' | 'downvote') => Promise<void>;
  onFlag?: (reviewId: string, reason: string, description?: string) => Promise<void>;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => Promise<void>;
  onResponse?: (reviewId: string) => void;
  currentUserId?: string;
  agentAuthorId?: string;
  className?: string;
}

const sortOptions = [
  { value: 'newest', label: 'Newest First', icon: Clock },
  { value: 'oldest', label: 'Oldest First', icon: Clock },
  { value: 'rating_high', label: 'Highest Rating', icon: Star },
  { value: 'rating_low', label: 'Lowest Rating', icon: Star },
  { value: 'helpful', label: 'Most Helpful', icon: TrendingUp },
  { value: 'quality', label: 'Best Quality', icon: Shield }
];

const verificationOptions: { value: VerificationLevel; label: string }[] = [
  { value: 'verified_user', label: 'Verified Users' },
  { value: 'github', label: 'GitHub Verified' },
  { value: 'email', label: 'Email Verified' },
  { value: 'none', label: 'Unverified' }
];

export function ReviewList({
  agentId,
  reviews,
  statistics,
  loading,
  error,
  filters,
  onFiltersChange,
  onLoadMore,
  hasMore = false,
  showAgent = false,
  onVote,
  onFlag,
  onEdit,
  onDelete,
  onResponse,
  currentUserId,
  agentAuthorId,
  className
}: ReviewListProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== filters.search) {
        onFiltersChange({ ...filters, search: searchQuery, offset: 0 });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSortChange = (sortBy: string) => {
    onFiltersChange({ ...filters, sort_by: sortBy as any, offset: 0 });
  };

  const handleRatingFilter = (ratings: number[]) => {
    onFiltersChange({ ...filters, rating: ratings.length ? ratings : undefined, offset: 0 });
  };

  const handleVerificationFilter = (levels: VerificationLevel[]) => {
    onFiltersChange({ 
      ...filters, 
      verification_level: levels.length ? levels : undefined, 
      offset: 0 
    });
  };

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return;
    
    setLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  const currentSort = sortOptions.find(option => option.value === filters.sort_by) || sortOptions[0];
  const selectedRatings = filters.rating || [];
  const selectedVerifications = filters.verification_level || [];

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Review Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.total_reviews}</div>
              <div className="text-sm text-muted-foreground">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                {statistics.average_rating.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.verified_reviews}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.response_rate.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Response Rate</div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm">Rating Distribution</h4>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = statistics.rating_distribution[rating] || 0;
                const percentage = statistics.total_reviews > 0 
                  ? (count / statistics.total_reviews) * 100 
                  : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-6">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Ratings */}
          {Object.values(statistics.category_ratings).some(rating => rating > 0) && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm">Category Ratings</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statistics.category_ratings).map(([category, rating]) => (
                  rating > 0 && (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{category}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderFilters = () => (
    <div className="mb-6 space-y-4">
      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <currentSort.icon className="h-4 w-4" />
                {currentSort.label}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={cn(
                    "gap-2",
                    filters.sort_by === option.value && "bg-accent"
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "gap-2",
              showFilters && "bg-accent"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {(selectedRatings.length > 0 || selectedVerifications.length > 0 || filters.has_response !== undefined || filters.verified_only) && (
              <Badge variant="terminal" className="ml-1 h-4 w-4 p-0 text-xs">
                {[
                  selectedRatings.length > 0 ? 1 : 0,
                  selectedVerifications.length > 0 ? 1 : 0,
                  filters.has_response !== undefined ? 1 : 0,
                  filters.verified_only ? 1 : 0
                ].reduce((a, b) => a + b, 0)}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rating Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rating</label>
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map(rating => (
                      <label key={rating} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedRatings.includes(rating)}
                          onChange={(e) => {
                            const newRatings = e.target.checked
                              ? [...selectedRatings, rating]
                              : selectedRatings.filter(r => r !== rating);
                            handleRatingFilter(newRatings);
                          }}
                          className="rounded"
                        />
                        <div className="flex items-center gap-1">
                          {rating}
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-muted-foreground">and up</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Verification Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Level</label>
                  <div className="space-y-1">
                    {verificationOptions.map(option => (
                      <label key={option.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedVerifications.includes(option.value)}
                          onChange={(e) => {
                            const newVerifications = e.target.checked
                              ? [...selectedVerifications, option.value]
                              : selectedVerifications.filter(v => v !== option.value);
                            handleVerificationFilter(newVerifications);
                          }}
                          className="rounded"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Other Filters */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Options</label>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.has_response === true}
                        onChange={(e) => {
                          onFiltersChange({
                            ...filters,
                            has_response: e.target.checked ? true : undefined,
                            offset: 0
                          });
                        }}
                        className="rounded"
                      />
                      Has author response
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.verified_only === true}
                        onChange={(e) => {
                          onFiltersChange({
                            ...filters,
                            verified_only: e.target.checked ? true : undefined,
                            offset: 0
                          });
                        }}
                        className="rounded"
                      />
                      Verified users only
                    </label>
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedRatings.length > 0 || selectedVerifications.length > 0 || filters.has_response !== undefined || filters.verified_only) && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        rating: undefined,
                        verification_level: undefined,
                        has_response: undefined,
                        verified_only: undefined,
                        offset: 0
                      });
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  const renderReviews = () => {
    if (loading && reviews.length === 0) {
      return (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Reviews</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      );
    }

    if (reviews.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reviews Found</h3>
            <p className="text-muted-foreground">
              {filters.search || selectedRatings.length > 0 || selectedVerifications.length > 0
                ? 'Try adjusting your search or filters.'
                : 'Be the first to leave a review for this agent.'
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ReviewCard
                review={review}
                userVote={review.user_vote}
                showAgent={showAgent}
                isOwner={currentUserId === review.user_id}
                isAuthor={agentAuthorId === currentUserId}
                onVote={onVote}
                onFlag={onFlag}
                onEdit={onEdit}
                onDelete={onDelete}
                onResponse={onResponse}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Load More */}
        {hasMore && (
          <div className="text-center pt-6">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Reviews'
              )}
            </Button>
          </div>
        )}

        {!hasMore && reviews.length > 5 && (
          <div className="text-center text-sm text-muted-foreground pt-6">
            You've seen all reviews
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {renderStatistics()}
      {renderFilters()}
      {renderReviews()}
    </div>
  );
}