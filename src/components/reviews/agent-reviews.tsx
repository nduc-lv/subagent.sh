'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Star,
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReviewForm } from './review-form';
import { ReviewList } from './review-list';
import { ReviewSummary } from './review-summary';
import { LoadingSpinner } from '@/components/ui/loading';
import { 
  useReviews, 
  useReviewStatistics, 
  useReviewMutations, 
  useReviewDrafts,
  useUserReview 
} from '@/hooks/use-reviews';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import type { Agent, ReviewFilters, Review } from '@/types';

interface AgentReviewsProps {
  agent: Agent;
  defaultFilters?: ReviewFilters;
  compact?: boolean;
  showWriteButton?: boolean;
  className?: string;
}

export function AgentReviews({
  agent,
  defaultFilters = { sort_by: 'newest', limit: 10, offset: 0 },
  compact = false,
  showWriteButton = true,
  className
}: AgentReviewsProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReviewFilters>(defaultFilters);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'analytics'>('reviews');

  // Properly use hooks (cannot be wrapped in try-catch)
  const reviewsHook = useReviews(agent.id, filters);
  const { reviews, loading, error, hasMore, refetch, loadMore } = reviewsHook;

  const statsHook = useReviewStatistics(agent.id);
  const { statistics, loading: statsLoading, error: statsError } = statsHook;

  const userReviewHook = useUserReview(agent.id);
  const { review: userReview, loading: userReviewLoading } = userReviewHook;

  const draftsHook = useReviewDrafts(agent.id);
  const { draft, saveDraft, deleteDraft } = draftsHook;

  const mutationsHook = useReviewMutations();
  const { 
    submitReview, 
    updateReview, 
    deleteReview: deleteReviewMutation, 
    voteOnReview, 
    flagReview, 
    respondToReview, 
    loading: mutationLoading 
  } = mutationsHook;

  const isAuthor = user?.id === agent.author_id;
  const hasUserReview = !!userReview;
  const canWriteReview = user && !hasUserReview && !isAuthor;

  const handleSubmitReview = async (reviewData: Partial<Review>) => {
    try {
      if (editingReview) {
        await updateReview(editingReview.id, reviewData);
      } else {
        await submitReview(agent.id, reviewData);
        // Delete draft after successful submission
        if (draft) {
          await deleteDraft();
        }
      }
      
      setShowReviewForm(false);
      setEditingReview(null);
      await refetch();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await deleteReviewMutation(reviewId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const handleVote = async (reviewId: string, voteType: 'upvote' | 'downvote') => {
    try {
      await voteOnReview(reviewId, voteType);
      await refetch();
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleFlag = async (reviewId: string, reason: string, description?: string) => {
    try {
      await flagReview(reviewId, reason, description);
      // Show success message
      alert('Review has been flagged for moderation.');
    } catch (error) {
      console.error('Failed to flag review:', error);
    }
  };

  const handleResponse = async (reviewId: string) => {
    const content = prompt('Enter your response to this review:');
    if (!content) return;

    try {
      await respondToReview(reviewId, content);
      await refetch();
    } catch (error) {
      console.error('Failed to respond to review:', error);
    }
  };

  const handleFiltersChange = (newFilters: ReviewFilters) => {
    setFilters(newFilters);
  };

  const handleCancelForm = () => {
    setShowReviewForm(false);
    setEditingReview(null);
  };

  if (compact) {
    return (
      <div className={cn("space-y-4", className)}>
        {statistics && !statsError && (
          <ReviewSummary statistics={statistics} compact />
        )}
        
        {reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="text-sm p-3 border rounded">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < review.overall_rating 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{review.user?.username}</span>
                </div>
                {review.title && (
                  <h4 className="font-medium mb-1">{review.title}</h4>
                )}
                <p className="text-muted-foreground line-clamp-2">
                  {review.content}
                </p>
              </div>
            ))}
            
            <Button variant="outline" size="sm" className="w-full">
              View All {statistics?.total_reviews} Reviews
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Reviews
            </h2>
            
            {statistics && (
              <Badge variant="secondary">
                {statistics.total_reviews} review{statistics.total_reviews !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Toggle */}
            {statistics && statistics.total_reviews > 0 && (
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={activeTab === 'reviews' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('reviews')}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Reviews
                </Button>
                <Button
                  variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('analytics')}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </div>
            )}

            {/* Write Review Button */}
            {canWriteReview && showWriteButton && (
              <Button
                onClick={() => setShowReviewForm(true)}
                className="gap-2"
                disabled={mutationLoading}
              >
                <Plus className="h-4 w-4" />
                Write Review
              </Button>
            )}

            {/* Edit Review Button */}
            {hasUserReview && (
              <Button
                variant="outline"
                onClick={() => handleEditReview(userReview)}
                className="gap-2"
                disabled={mutationLoading}
              >
                <Edit className="h-4 w-4" />
                Edit Review
              </Button>
            )}
          </div>
        </div>

        {/* User's Review Status */}
        {user && !userReviewLoading && (
          <AnimatePresence>
            {hasUserReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-green-200/50 bg-gradient-to-br from-green-50/60 to-green-50/30 dark:from-green-950/30 dark:to-green-950/20 backdrop-blur-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        You've reviewed this agent
                      </span>
                      <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-green-500/15 to-green-500/10 text-green-700 dark:text-green-400 border-0">
                        {userReview.overall_rating} stars
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {!hasUserReview && !isAuthor && canWriteReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/20 backdrop-blur-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">
                          Share your experience with this agent
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowReviewForm(true)}
                        className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-sm hover:shadow-md transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        Write Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {isAuthor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/60 to-orange-50/30 dark:from-orange-950/30 dark:to-orange-950/20 backdrop-blur-sm">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        You can't review your own agent, but you can respond to reviews
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Review Summary */}
              {statistics && !statsLoading && !statsError && (
                <ReviewSummary 
                  statistics={statistics}
                  showTrends
                  className="mb-6"
                />
              )}

              {/* Reviews List */}
              <ReviewList
                agentId={agent.id}
                reviews={reviews}
                statistics={statistics}
                loading={loading}
                error={error}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onLoadMore={loadMore}
                hasMore={hasMore}
                onVote={handleVote}
                onFlag={handleFlag}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
                onResponse={isAuthor ? handleResponse : undefined}
                currentUserId={user?.id}
                agentAuthorId={agent.author_id}
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && statistics && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Review Analytics</CardTitle>
                  <CardDescription>
                    Detailed insights into your reviews and ratings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Engagement Metrics */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Engagement</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Reviews</span>
                          <span className="font-medium">{statistics.total_reviews}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Recent (30d)</span>
                          <span className="font-medium">{statistics.recent_reviews}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Response Rate</span>
                          <span className="font-medium">{statistics.response_rate.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Quality Metrics */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Quality</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Average Rating</span>
                          <span className="font-medium">{statistics.average_rating.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Verified Reviews</span>
                          <span className="font-medium">{statistics.verified_reviews}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">5-Star Reviews</span>
                          <span className="font-medium">{statistics.rating_distribution['5'] || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Category Performance */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Category Ratings</h3>
                      <div className="space-y-3">
                        {Object.entries(statistics.category_ratings).map(([category, rating]) => (
                          <div key={category} className="flex justify-between">
                            <span className="text-sm text-muted-foreground capitalize">{category}</span>
                            <span className="font-medium">{rating.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && !error && reviews.length === 0 && (!statistics || statistics.total_reviews === 0) && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground mb-4">
                This agent hasn't received any reviews yet.
              </p>
              {canWriteReview && (
                <Button onClick={() => setShowReviewForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Be the First to Review
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? 'Edit Review' : 'Write a Review'}
            </DialogTitle>
            <DialogDescription>
              Share your experience with {agent.name} to help other users make informed decisions.
            </DialogDescription>
          </DialogHeader>
          
          <ReviewForm
            agent={agent}
            existingReview={editingReview || undefined}
            draft={draft || undefined}
            onSubmit={handleSubmitReview}
            onSaveDraft={saveDraft}
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}