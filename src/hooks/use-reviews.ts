'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './use-supabase';
import type { 
  Review, 
  ReviewDraft, 
  ReviewFilters, 
  ReviewStatistics, 
  ReviewResponse,
  ReviewFlag,
  ReviewVote
} from '@/types';

// Create a reviews database service (we'll implement this next)
import { reviewsDb } from '@/lib/supabase/reviews-database';

export function useReviews(agentId: string, filters: ReviewFilters = {}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = useCallback(async (append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, hasMore: more } = await reviewsDb.getReviews(agentId, filters);
      
      if (append) {
        setReviews(prev => [...prev, ...data]);
      } else {
        setReviews(data);
      }
      
      setHasMore(more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [agentId, JSON.stringify(filters)]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const nextFilters = {
      ...filters,
      offset: (filters.offset || 0) + (filters.limit || 10)
    };
    
    try {
      const { data, hasMore: more } = await reviewsDb.getReviews(agentId, nextFilters);
      setReviews(prev => [...prev, ...data]);
      setHasMore(more);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more reviews');
    }
  }, [agentId, filters, hasMore, loading]);

  return { 
    reviews, 
    loading, 
    error, 
    hasMore, 
    refetch: () => fetchReviews(false), 
    loadMore 
  };
}

export function useReviewStatistics(agentId: string) {
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatistics() {
      try {
        setLoading(true);
        setError(null);
        const data = await reviewsDb.getReviewStatistics(agentId);
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();
  }, [agentId]);

  return { statistics, loading, error };
}

export function useReviewMutations() {
  const { user } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = async (agentId: string, reviewData: Partial<Review>) => {
    if (!user?.id) throw new Error('Must be logged in to submit a review');

    setLoading(true);
    try {
      setError(null);
      const data = await reviewsDb.createReview({
        ...reviewData,
        agent_id: agentId,
        user_id: user.id
      });
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    if (!user?.id) throw new Error('Must be logged in to update a review');

    setLoading(true);
    try {
      setError(null);
      const data = await reviewsDb.updateReview(reviewId, updates, user.id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!user?.id) throw new Error('Must be logged in to delete a review');

    setLoading(true);
    try {
      setError(null);
      await reviewsDb.deleteReview(reviewId, user.id);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const voteOnReview = async (reviewId: string, voteType: 'upvote' | 'downvote') => {
    if (!user?.id) throw new Error('Must be logged in to vote on reviews');

    try {
      setError(null);
      const data = await reviewsDb.voteOnReview(reviewId, user.id, voteType);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote on review';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const flagReview = async (reviewId: string, reason: string, description?: string) => {
    if (!user?.id) throw new Error('Must be logged in to flag reviews');

    try {
      setError(null);
      const data = await reviewsDb.flagReview(reviewId, user.id, reason, description);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to flag review';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const respondToReview = async (reviewId: string, content: string) => {
    if (!user?.id) throw new Error('Must be logged in to respond to reviews');

    setLoading(true);
    try {
      setError(null);
      const data = await reviewsDb.respondToReview(reviewId, user.id, content);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitReview,
    updateReview,
    deleteReview,
    voteOnReview,
    flagReview,
    respondToReview,
    loading,
    error
  };
}

export function useReviewDrafts(agentId?: string) {
  const { user } = useSupabase();
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDraft() {
      if (!user?.id || !agentId) {
        setDraft(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await reviewsDb.getReviewDraft(agentId, user.id);
        setDraft(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch draft');
      } finally {
        setLoading(false);
      }
    }

    fetchDraft();
  }, [user?.id, agentId]);

  const saveDraft = async (draftData: Partial<ReviewDraft>) => {
    if (!user?.id || !agentId) throw new Error('Must be logged in to save drafts');

    try {
      setError(null);
      const data = await reviewsDb.saveReviewDraft({
        ...draftData,
        agent_id: agentId,
        user_id: user.id
      });
      setDraft(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteDraft = async () => {
    if (!user?.id || !agentId) throw new Error('Must be logged in to delete drafts');

    try {
      setError(null);
      await reviewsDb.deleteReviewDraft(agentId, user.id);
      setDraft(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete draft';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return { draft, loading, error, saveDraft, deleteDraft };
}

export function useUserReview(agentId: string) {
  const { user } = useSupabase();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserReview() {
      if (!user?.id) {
        setReview(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await reviewsDb.getUserReview(agentId, user.id);
        setReview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user review');
      } finally {
        setLoading(false);
      }
    }

    fetchUserReview();
  }, [user?.id, agentId]);

  return { review, loading, error, refetch: () => fetchUserReview() };
}

export function useReviewVotes(reviewIds: string[]) {
  const { user } = useSupabase();
  const [votes, setVotes] = useState<Record<string, ReviewVote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVotes() {
      if (!user?.id || reviewIds.length === 0) {
        setVotes({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await reviewsDb.getUserVotes(reviewIds, user.id);
        const votesMap = data.reduce((acc, vote) => {
          acc[vote.review_id] = vote;
          return acc;
        }, {} as Record<string, ReviewVote>);
        setVotes(votesMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch votes');
      } finally {
        setLoading(false);
      }
    }

    fetchVotes();
  }, [user?.id, JSON.stringify(reviewIds)]);

  return { votes, loading, error };
}

export function useReviewModeration() {
  const { user } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moderateReview = async (reviewId: string, action: 'approve' | 'hide' | 'remove', notes?: string) => {
    if (!user?.id) throw new Error('Must be logged in to moderate reviews');

    setLoading(true);
    try {
      setError(null);
      const data = await reviewsDb.moderateReview(reviewId, user.id, action, notes);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to moderate review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFlags = async (reviewId: string) => {
    try {
      setError(null);
      const data = await reviewsDb.getReviewFlags(reviewId);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flags';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const resolveFlag = async (flagId: string, status: 'resolved' | 'dismissed') => {
    if (!user?.id) throw new Error('Must be logged in to resolve flags');

    try {
      setError(null);
      const data = await reviewsDb.resolveFlag(flagId, user.id, status);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve flag';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    moderateReview,
    getFlags,
    resolveFlag,
    loading,
    error
  };
}