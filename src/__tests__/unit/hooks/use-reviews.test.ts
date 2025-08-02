import { renderHook, waitFor } from '@/__tests__/utils/test-utils';
import { act } from '@testing-library/react';
import { 
  useReviews, 
  useReviewStatistics,
  useReviewMutations,
  useReviewDrafts,
  useUserReview,
  useReviewVotes,
  useReviewModeration
} from '@/hooks/use-reviews';
import { ReviewFactory, UserFactory } from '@/__tests__/factories';

// Mock the reviews database module
jest.mock('@/lib/supabase/reviews-database', () => ({
  reviewsDb: {
    getReviews: jest.fn(),
    getReviewStatistics: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
    deleteReview: jest.fn(),
    voteOnReview: jest.fn(),
    flagReview: jest.fn(),
    respondToReview: jest.fn(),
    getReviewDraft: jest.fn(),
    saveReviewDraft: jest.fn(),
    deleteReviewDraft: jest.fn(),
    getUserReview: jest.fn(),
    getUserVotes: jest.fn(),
    moderateReview: jest.fn(),
    getReviewFlags: jest.fn(),
    resolveFlag: jest.fn(),
  },
}));

// Mock the useSupabase hook
jest.mock('@/hooks/use-supabase', () => ({
  useSupabase: jest.fn(() => ({
    user: { id: 'test-user-1', email: 'test@example.com' },
    session: { access_token: 'test-token' },
  })),
}));

const { reviewsDb } = require('@/lib/supabase/reviews-database');

describe('useReviews Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches reviews successfully', async () => {
    const mockReviews = ReviewFactory.buildList(5, { agent_id: 'agent-1' });
    reviewsDb.getReviews.mockResolvedValue({ data: mockReviews, hasMore: false });

    const { result } = renderHook(() => useReviews('agent-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.reviews).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toEqual(mockReviews);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBe(null);
    expect(reviewsDb.getReviews).toHaveBeenCalledWith('agent-1', {});
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Failed to fetch reviews';
    reviewsDb.getReviews.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReviews('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('refetches reviews when agentId changes', async () => {
    const mockReviews1 = ReviewFactory.buildList(3, { agent_id: 'agent-1' });
    const mockReviews2 = ReviewFactory.buildList(3, { agent_id: 'agent-2' });
    
    reviewsDb.getReviews
      .mockResolvedValueOnce({ data: mockReviews1, hasMore: false })
      .mockResolvedValueOnce({ data: mockReviews2, hasMore: false });

    const { result, rerender } = renderHook(
      ({ agentId }) => useReviews(agentId),
      { initialProps: { agentId: 'agent-1' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toEqual(mockReviews1);

    rerender({ agentId: 'agent-2' });

    await waitFor(() => {
      expect(reviewsDb.getReviews).toHaveBeenCalledWith('agent-2', {});
    });

    await waitFor(() => {
      expect(result.current.reviews).toEqual(mockReviews2);
    });
  });

  it('loads more reviews when hasMore is true', async () => {
    const initialReviews = ReviewFactory.buildList(5, { agent_id: 'agent-1' });
    const moreReviews = ReviewFactory.buildList(3, { agent_id: 'agent-1' });
    
    reviewsDb.getReviews
      .mockResolvedValueOnce({ data: initialReviews, hasMore: true })
      .mockResolvedValueOnce({ data: moreReviews, hasMore: false });

    const { result } = renderHook(() => useReviews('agent-1', { limit: 5 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviews).toEqual(initialReviews);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.reviews).toEqual([...initialReviews, ...moreReviews]);
    expect(result.current.hasMore).toBe(false);
    expect(reviewsDb.getReviews).toHaveBeenCalledWith('agent-1', { limit: 5, offset: 5 });
  });

  it('does not load more when hasMore is false', async () => {
    const mockReviews = ReviewFactory.buildList(3, { agent_id: 'agent-1' });
    reviewsDb.getReviews.mockResolvedValue({ data: mockReviews, hasMore: false });

    const { result } = renderHook(() => useReviews('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = reviewsDb.getReviews.mock.calls.length;

    await act(async () => {
      await result.current.loadMore();
    });

    expect(reviewsDb.getReviews.mock.calls.length).toBe(initialCallCount);
  });

  it('refetches reviews', async () => {
    const mockReviews = ReviewFactory.buildList(3, { agent_id: 'agent-1' });
    reviewsDb.getReviews.mockResolvedValue({ data: mockReviews, hasMore: false });

    const { result } = renderHook(() => useReviews('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(reviewsDb.getReviews).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(reviewsDb.getReviews).toHaveBeenCalledTimes(2);
  });
});

describe('useReviewStatistics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches review statistics successfully', async () => {
    const mockStats = {
      total_reviews: 25,
      average_rating: 4.2,
      rating_distribution: { 5: 10, 4: 8, 3: 5, 2: 1, 1: 1 },
    };
    reviewsDb.getReviewStatistics.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useReviewStatistics('agent-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.statistics).toEqual(mockStats);
    expect(result.current.error).toBe(null);
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Failed to fetch statistics';
    reviewsDb.getReviewStatistics.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReviewStatistics('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.statistics).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useReviewMutations Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits review successfully', async () => {
    const reviewData = { rating: 5, title: 'Great agent!', content: 'Excellent work' };
    const createdReview = ReviewFactory.build({ ...reviewData, agent_id: 'agent-1', user_id: 'test-user-1' });
    reviewsDb.createReview.mockResolvedValue(createdReview);

    const { result } = renderHook(() => useReviewMutations());

    await act(async () => {
      const review = await result.current.submitReview('agent-1', reviewData);
      expect(review).toEqual(createdReview);
    });

    expect(reviewsDb.createReview).toHaveBeenCalledWith({
      ...reviewData,
      agent_id: 'agent-1',
      user_id: 'test-user-1',
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('updates review successfully', async () => {
    const reviewId = 'review-1';
    const updates = { content: 'Updated content' };
    const updatedReview = ReviewFactory.build({ id: reviewId, ...updates });
    
    reviewsDb.updateReview.mockResolvedValue(updatedReview);

    const { result } = renderHook(() => useReviewMutations());

    await act(async () => {
      const review = await result.current.updateReview(reviewId, updates);
      expect(review).toEqual(updatedReview);
    });

    expect(reviewsDb.updateReview).toHaveBeenCalledWith(reviewId, updates, 'test-user-1');
  });

  it('deletes review successfully', async () => {
    const reviewId = 'review-1';
    reviewsDb.deleteReview.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviewMutations());

    await act(async () => {
      const success = await result.current.deleteReview(reviewId);
      expect(success).toBe(true);
    });

    expect(reviewsDb.deleteReview).toHaveBeenCalledWith(reviewId, 'test-user-1');
  });

  it('votes on review successfully', async () => {
    const reviewId = 'review-1';
    const voteResult = { success: true };
    reviewsDb.voteOnReview.mockResolvedValue(voteResult);

    const { result } = renderHook(() => useReviewMutations());

    await act(async () => {
      const result_vote = await result.current.voteOnReview(reviewId, 'upvote');
      expect(result_vote).toEqual(voteResult);
    });

    expect(reviewsDb.voteOnReview).toHaveBeenCalledWith(reviewId, 'test-user-1', 'upvote');
  });

  it('flags review successfully', async () => {
    const reviewId = 'review-1';
    const flagResult = { success: true };
    reviewsDb.flagReview.mockResolvedValue(flagResult);

    const { result } = renderHook(() => useReviewMutations());

    await act(async () => {
      const result_flag = await result.current.flagReview(reviewId, 'spam', 'This is spam content');
      expect(result_flag).toEqual(flagResult);
    });

    expect(reviewsDb.flagReview).toHaveBeenCalledWith(reviewId, 'test-user-1', 'spam', 'This is spam content');
  });

  it('responds to review successfully', async () => {
    const reviewId = 'review-1';
    const responseContent = 'Thank you for the feedback!';
    const responseResult = ReviewFactory.build({ id: 'response-1' });
    reviewsDb.respondToReview.mockResolvedValue(responseResult);

    const { result } = renderHook(() => useReviewMutations());

    await act(async () => {
      const response = await result.current.respondToReview(reviewId, responseContent);
      expect(response).toEqual(responseResult);
    });

    expect(reviewsDb.respondToReview).toHaveBeenCalledWith(reviewId, 'test-user-1', responseContent);
  });

  it('handles submit review error', async () => {
    const errorMessage = 'Failed to submit review';
    reviewsDb.createReview.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReviewMutations());

    await expect(async () => {
      await act(async () => {
        await result.current.submitReview('agent-1', { overall_rating: 5 });
      });
    }).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useReviewDrafts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches draft successfully', async () => {
    const mockDraft = {
      id: 'draft-1',
      agent_id: 'agent-1',
      user_id: 'test-user-1',
      content: 'Draft content',
      rating: 4,
    };
    reviewsDb.getReviewDraft.mockResolvedValue(mockDraft);

    const { result } = renderHook(() => useReviewDrafts('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.draft).toEqual(mockDraft);
    expect(reviewsDb.getReviewDraft).toHaveBeenCalledWith('agent-1', 'test-user-1');
  });

  it('handles missing agentId', async () => {
    const { result } = renderHook(() => useReviewDrafts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.draft).toBe(null);
    expect(reviewsDb.getReviewDraft).not.toHaveBeenCalled();
  });

  it('saves draft successfully', async () => {
    const draftData = { content: 'New draft content', rating: 5 };
    const savedDraft = { id: 'draft-1', agent_id: 'agent-1', user_id: 'test-user-1', ...draftData };
    
    reviewsDb.getReviewDraft.mockResolvedValue(null);
    reviewsDb.saveReviewDraft.mockResolvedValue(savedDraft);

    const { result } = renderHook(() => useReviewDrafts('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const draft = await result.current.saveDraft(draftData);
      expect(draft).toEqual(savedDraft);
    });

    expect(reviewsDb.saveReviewDraft).toHaveBeenCalledWith({
      ...draftData,
      agent_id: 'agent-1',
      user_id: 'test-user-1',
    });
    expect(result.current.draft).toEqual(savedDraft);
  });

  it('deletes draft successfully', async () => {
    const mockDraft = { id: 'draft-1', agent_id: 'agent-1', user_id: 'test-user-1' };
    
    reviewsDb.getReviewDraft.mockResolvedValue(mockDraft);
    reviewsDb.deleteReviewDraft.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReviewDrafts('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const success = await result.current.deleteDraft();
      expect(success).toBe(true);
    });

    expect(reviewsDb.deleteReviewDraft).toHaveBeenCalledWith('agent-1', 'test-user-1');
    expect(result.current.draft).toBe(null);
  });
});

describe('useUserReview Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches user review successfully', async () => {
    const mockReview = ReviewFactory.build({ agent_id: 'agent-1', user_id: 'test-user-1' });
    reviewsDb.getUserReview.mockResolvedValue(mockReview);

    const { result } = renderHook(() => useUserReview('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.review).toEqual(mockReview);
    expect(reviewsDb.getUserReview).toHaveBeenCalledWith('agent-1', 'test-user-1');
  });

  it('handles no user review found', async () => {
    reviewsDb.getUserReview.mockResolvedValue(null);

    const { result } = renderHook(() => useUserReview('agent-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.review).toBe(null);
    expect(result.current.error).toBe(null);
  });
});

describe('useReviewVotes Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches user votes successfully', async () => {
    const reviewIds = ['review-1', 'review-2', 'review-3'];
    const mockVotes = [
      { review_id: 'review-1', user_id: 'test-user-1', vote_type: 'upvote' },
      { review_id: 'review-3', user_id: 'test-user-1', vote_type: 'downvote' },
    ];
    reviewsDb.getUserVotes.mockResolvedValue(mockVotes);

    const { result } = renderHook(() => useReviewVotes(reviewIds));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.votes).toEqual({
      'review-1': mockVotes[0],
      'review-3': mockVotes[1],
    });
    expect(reviewsDb.getUserVotes).toHaveBeenCalledWith(reviewIds, 'test-user-1');
  });

  it('handles empty review ids', async () => {
    const { result } = renderHook(() => useReviewVotes([]));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.votes).toEqual({});
    expect(reviewsDb.getUserVotes).not.toHaveBeenCalled();
  });
});

describe('useReviewModeration Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moderates review successfully', async () => {
    const moderationResult = { success: true };
    reviewsDb.moderateReview.mockResolvedValue(moderationResult);

    const { result } = renderHook(() => useReviewModeration());

    await act(async () => {
      const result_mod = await result.current.moderateReview('review-1', 'approve', 'Approved by moderator');
      expect(result_mod).toEqual(moderationResult);
    });

    expect(reviewsDb.moderateReview).toHaveBeenCalledWith('review-1', 'test-user-1', 'approve', 'Approved by moderator');
  });

  it('gets review flags successfully', async () => {
    const mockFlags = [
      { id: 'flag-1', review_id: 'review-1', reason: 'spam', status: 'pending' },
      { id: 'flag-2', review_id: 'review-1', reason: 'inappropriate', status: 'pending' },
    ];
    reviewsDb.getReviewFlags.mockResolvedValue(mockFlags);

    const { result } = renderHook(() => useReviewModeration());

    await act(async () => {
      const flags = await result.current.getFlags('review-1');
      expect(flags).toEqual(mockFlags);
    });

    expect(reviewsDb.getReviewFlags).toHaveBeenCalledWith('review-1');
  });

  it('resolves flag successfully', async () => {
    const resolveResult = { success: true };
    reviewsDb.resolveFlag.mockResolvedValue(resolveResult);

    const { result } = renderHook(() => useReviewModeration());

    await act(async () => {
      const result_resolve = await result.current.resolveFlag('flag-1', 'resolved');
      expect(result_resolve).toEqual(resolveResult);
    });

    expect(reviewsDb.resolveFlag).toHaveBeenCalledWith('flag-1', 'test-user-1', 'resolved');
  });

  it('handles moderation error', async () => {
    const errorMessage = 'Failed to moderate review';
    reviewsDb.moderateReview.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useReviewModeration());

    await expect(async () => {
      await act(async () => {
        await result.current.moderateReview('review-1', 'approve');
      });
    }).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
  });
});