'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Star,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Import the proper review hooks
import { 
  useReviews, 
  useReviewStatistics, 
  useReviewMutations, 
  useUserReview 
} from '@/hooks/use-reviews';

interface SimpleAgentReviewsProps {
  agent: any;
  className?: string;
}

export function SimpleAgentReviews({ agent, className }: SimpleAgentReviewsProps) {
  const { user } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');

  const isAuthor = user && agent && (agent.author_id === user.id);

  // Use real database hooks with error handling
  const { reviews = [], loading, error, refetch } = useReviews(agent?.id, { limit: 10, offset: 0 }) || {};
  const { statistics, loading: statsLoading } = useReviewStatistics(agent?.id) || {};
  const { review: userReview, loading: userReviewLoading } = useUserReview(agent?.id) || {};
  const { submitReview, voteOnReview, loading: isSubmitting } = useReviewMutations() || {};

  const hasUserReview = !!userReview;
  const canWriteReview = user && !hasUserReview && !isAuthor;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !reviewText.trim() || !submitReview) return;

    try {
      await submitReview(agent?.id, {
        overall_rating: rating,
        title: reviewTitle.trim() || undefined,
        content: reviewText.trim(),
        status: 'active'
      });
      
      setShowReviewForm(false);
      setRating(0);
      setReviewTitle('');
      setReviewText('');
      
      // Refresh reviews list
      if (refetch) {
        await refetch();
      }
      
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleHelpfulVote = async (reviewId: string) => {
    if (!voteOnReview) return;
    
    try {
      await voteOnReview(reviewId, 'upvote');
      // Refresh reviews to show updated counts
      if (refetch) {
        await refetch();
      }
    } catch (error) {
      console.error('Failed to vote on review:', error);
    }
  };

  if (!agent?.id) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Agent not found</p>
        </div>
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
            
            <Badge variant="secondary">
              {statistics?.total_reviews || 0} review{(statistics?.total_reviews || 0) !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Write Review Button */}
          {canWriteReview && (
            <Button
              onClick={() => setShowReviewForm(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Write Review
            </Button>
          )}
        </div>

        {/* User Status */}
        {user && !userReviewLoading && (
          <>
            {hasUserReview && (
              <Card className="border-green-200/50 bg-gradient-to-br from-green-50/60 to-green-50/30 dark:from-green-950/30 dark:to-green-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      You've reviewed this agent
                    </span>
                    <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-green-500/15 to-green-500/10 text-green-700 dark:text-green-400 border-0">
                      {userReview?.overall_rating || 0} stars
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAuthor && (
              <Card className="border-orange-200/50 bg-gradient-to-br from-orange-50/60 to-orange-50/30 dark:from-orange-950/30 dark:to-orange-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      You can't review your own agent, but you can respond to reviews
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isAuthor && !hasUserReview && canWriteReview && (
              <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/60 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/20">
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
                      className="gap-2"
                      disabled={isSubmitting}
                    >
                      <Plus className="h-4 w-4" />
                      Write Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Review Summary */}
        {!statsLoading && statistics && (statistics.total_reviews || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Review Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">{(statistics.average_rating || 0).toFixed(1)}</div>
                  <div className="flex justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4 stroke-2",
                          i < Math.round(statistics.average_rating || 0)
                            ? "text-yellow-500"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Based on {statistics.total_reviews || 0} reviews
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(statistics.rating_distribution || {}).reverse().map(([rating, count]) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="w-4 text-sm">{rating}</span>
                      <Star className="h-3 w-3 text-yellow-500 stroke-2" />
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(statistics.total_reviews || 0) > 0 ? ((count as number) / (statistics.total_reviews || 1)) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{statistics.total_reviews || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Reviews</div>
                  </div>
                  {(statistics.verified_reviews || 0) > 0 && (
                    <div className="text-center">
                      <div className="text-lg font-semibold">{statistics.verified_reviews || 0}</div>
                      <div className="text-xs text-muted-foreground">Verified</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading reviews...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium mb-2">Error Loading Reviews</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        {!loading && !error && reviews && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-4 w-4 stroke-2",
                                    i < review.overall_rating
                                      ? "text-yellow-500"
                                      : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="font-semibold">
                              {review.user?.full_name || review.user?.username || 'Anonymous'}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-semibold mb-2">{review.title}</h4>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(review.created_at)}
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground leading-relaxed">
                        {review.content}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {review.helpful_count || 0} people found this helpful
                          </span>
                        </div>
                        {user && user.id !== review.user_id && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleHelpfulVote(review.id)}
                            disabled={isSubmitting}
                          >
                            Helpful
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && reviews && reviews.length === 0 && (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with {agent?.name || 'this agent'} to help other users make informed decisions.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitReview} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 stroke-2",
                        star <= rating
                          ? "text-yellow-500"
                          : "text-muted-foreground hover:text-yellow-500"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">Title (optional)</label>
              <Input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Give your review a title..."
                className="w-full"
              />
            </div>

            {/* Review Text */}
            <div>
              <label className="text-sm font-medium mb-2 block">Your Review</label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this agent..."
                rows={4}
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviewForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!rating || !reviewText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}