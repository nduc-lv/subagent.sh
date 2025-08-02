import { supabase } from './client';
import type { 
  Review, 
  ReviewDraft, 
  ReviewFilters, 
  ReviewStatistics, 
  ReviewResponse,
  ReviewFlag,
  ReviewVote,
  ReviewFlagReason
} from '@/types';

export class ReviewsDatabase {
  private client = supabase;

  // Get reviews for an agent with filters and pagination
  async getReviews(agentId: string, filters: ReviewFilters = {}) {
    const {
      rating = [],
      verification_level = [],
      has_response,
      sort_by = 'newest',
      search,
      verified_only,
      limit = 10,
      offset = 0
    } = filters;

    let query = this.client
      .from('reviews')
      .select(`
        *,
        user:user_id(id, username, full_name, avatar_url),
        agent:agent_id(id, name, author_id),
        response:review_responses(*,
          user:user_id(id, username, full_name, avatar_url)
        )
      `)
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .range(offset, offset + limit - 1);

    // Apply filters
    if (rating.length > 0) {
      query = query.in('overall_rating', rating);
    }

    if (verification_level.length > 0) {
      query = query.in('verification_level', verification_level);
    }

    if (has_response !== undefined) {
      if (has_response) {
        query = query.not('review_responses', 'is', null);
      } else {
        query = query.is('review_responses', null);
      }
    }

    if (verified_only) {
      query = query.eq('is_verified_purchase', true);
    }

    if (search) {
      query = query.textSearch('fts', search, {
        config: 'english'
      });
    }

    // Apply sorting
    switch (sort_by) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'rating_high':
        query = query.order('overall_rating', { ascending: false });
        break;
      case 'rating_low':
        query = query.order('overall_rating', { ascending: true });
        break;
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'quality':
        query = query.order('quality_score', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get user votes for these reviews if user is authenticated
    const reviewIds = data?.map(r => r.id) || [];
    let userVotes: Record<string, ReviewVote> = {};
    
    if (reviewIds.length > 0) {
      try {
        const { data: user } = await this.client.auth.getUser();
        if (user.user?.id) {
          const votes = await this.getUserVotes(reviewIds, user.user.id);
          userVotes = votes.reduce((acc, vote) => {
            acc[vote.review_id] = vote;
            return acc;
          }, {} as Record<string, ReviewVote>);
        }
      } catch (err) {
        // Ignore auth errors
      }
    }

    // Attach user votes to reviews
    const reviewsWithVotes = data?.map(review => ({
      ...review,
      user_vote: userVotes[review.id] || null
    })) || [];

    return {
      data: reviewsWithVotes,
      hasMore: data ? data.length === limit : false
    };
  }

  // Get review statistics for an agent
  async getReviewStatistics(agentId: string): Promise<ReviewStatistics> {
    try {
      const { data, error } = await this.client
        .rpc('get_review_statistics', { agent_uuid: agentId });

      if (error) {
        console.warn('Error fetching review statistics, returning defaults:', error);
        // Return default values if the RPC function doesn't exist or fails
        return {
          total_reviews: 0,
          average_rating: 0,
          rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          category_ratings: {
            usability: 0,
            documentation: 0,
            performance: 0,
            reliability: 0
          },
          recent_reviews: 0,
          verified_reviews: 0,
          response_rate: 0
        };
      }
      
      const result = data?.[0] || {};
      
      // Ensure all required fields exist with defaults
      // Map the RPC function result to expected format
      return {
        total_reviews: result.total_reviews || 0,
        average_rating: parseFloat(result.average_rating) || 0,
        rating_distribution: result.rating_distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        category_ratings: {
          usability: parseFloat(result.usability_avg) || 0,
          documentation: parseFloat(result.documentation_avg) || 0,
          performance: parseFloat(result.performance_avg) || 0,
          reliability: parseFloat(result.reliability_avg) || 0
        },
        recent_reviews: result.total_reviews || 0, // Use total_reviews as recent for now
        verified_reviews: result.verified_reviews || 0,
        response_rate: 0 // Calculate this later if needed
      };
    } catch (error) {
      console.warn('Exception fetching review statistics, returning defaults:', error);
      // Return safe defaults if any error occurs
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        category_ratings: {
          usability: 0,
          documentation: 0,
          performance: 0,
          reliability: 0
        },
        recent_reviews: 0,
        verified_reviews: 0,
        response_rate: 0
      };
    }
  }

  // Create a new review
  async createReview(reviewData: Partial<Review>) {
    const { data, error } = await this.client
      .from('reviews')
      .insert(reviewData)
      .select(`
        *,
        user:user_id(id, username, full_name, avatar_url),
        agent:agent_id(id, name, author_id)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Update an existing review
  async updateReview(reviewId: string, updates: Partial<Review>, userId: string) {
    // First check ownership
    const { data: existing } = await this.client
      .from('reviews')
      .select('user_id, edit_count')
      .eq('id', reviewId)
      .single();

    if (!existing || existing.user_id !== userId) {
      throw new Error('You can only edit your own reviews');
    }

    // Add edit tracking
    const editData = {
      ...updates,
      edit_count: existing.edit_count + 1,
      last_edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('reviews')
      .update(editData)
      .eq('id', reviewId)
      .select(`
        *,
        user:user_id(id, username, full_name, avatar_url),
        agent:agent_id(id, name, author_id)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a review
  async deleteReview(reviewId: string, userId: string) {
    // First check ownership
    const { data: existing } = await this.client
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .single();

    if (!existing || existing.user_id !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    const { error } = await this.client
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;
    return true;
  }

  // Vote on a review
  async voteOnReview(reviewId: string, userId: string, voteType: 'upvote' | 'downvote') {
    // Check if user already voted
    const { data: existingVote } = await this.client
      .from('review_votes')
      .select('*')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote if same type
        const { error } = await this.client
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id);
        
        if (error) throw error;
        return null;
      } else {
        // Update vote type
        const { data, error } = await this.client
          .from('review_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } else {
      // Create new vote
      const { data, error } = await this.client
        .from('review_votes')
        .insert({
          review_id: reviewId,
          user_id: userId,
          vote_type: voteType
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  // Flag a review
  async flagReview(reviewId: string, userId: string, reason: ReviewFlagReason, description?: string) {
    // Check if user already flagged this review
    const { data: existingFlag } = await this.client
      .from('review_flags')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existingFlag) {
      throw new Error('You have already flagged this review');
    }

    const { data, error } = await this.client
      .from('review_flags')
      .insert({
        review_id: reviewId,
        user_id: userId,
        reason,
        description
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Respond to a review (for agent authors)
  async respondToReview(reviewId: string, userId: string, content: string) {
    // Check if user is the agent author
    const { data: review } = await this.client
      .from('reviews')
      .select(`
        id,
        agent_id,
        agents!inner(author_id)
      `)
      .eq('id', reviewId)
      .single();

    if (!review || (review.agents as any)?.author_id !== userId) {
      throw new Error('Only the agent author can respond to reviews');
    }

    // Check if response already exists
    const { data: existingResponse } = await this.client
      .from('review_responses')
      .select('id')
      .eq('review_id', reviewId)
      .single();

    if (existingResponse) {
      throw new Error('A response already exists for this review');
    }

    const { data, error } = await this.client
      .from('review_responses')
      .insert({
        review_id: reviewId,
        user_id: userId,
        content
      })
      .select(`
        *,
        user:user_id(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Get user's review for a specific agent
  async getUserReview(agentId: string, userId: string) {
    const { data, error } = await this.client
      .from('reviews')
      .select(`
        *,
        user:user_id(id, username, full_name, avatar_url),
        agent:agent_id(id, name, author_id),
        response:review_responses(*,
          user:user_id(id, username, full_name, avatar_url)
        )
      `)
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
    
    return data;
  }

  // Get user votes for reviews
  async getUserVotes(reviewIds: string[], userId: string): Promise<ReviewVote[]> {
    const { data, error } = await this.client
      .from('review_votes')
      .select('*')
      .in('review_id', reviewIds)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  // Review drafts
  async getReviewDraft(agentId: string, userId: string) {
    const { data, error } = await this.client
      .from('review_drafts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async saveReviewDraft(draftData: Partial<ReviewDraft>) {
    const { data, error } = await this.client
      .from('review_drafts')
      .upsert(draftData, {
        onConflict: 'agent_id,user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteReviewDraft(agentId: string, userId: string) {
    const { error } = await this.client
      .from('review_drafts')
      .delete()
      .eq('agent_id', agentId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  // Moderation functions
  async moderateReview(reviewId: string, moderatorId: string, action: 'approve' | 'hide' | 'remove', notes?: string) {
    const status = action === 'approve' ? 'active' : 'hidden';
    
    const { data, error } = await this.client
      .from('reviews')
      .update({
        status,
        moderation_notes: notes,
        moderated_by: moderatorId,
        moderated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getReviewFlags(reviewId: string): Promise<ReviewFlag[]> {
    const { data, error } = await this.client
      .from('review_flags')
      .select(`
        *,
        user:user_id(id, username, full_name)
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async resolveFlag(flagId: string, resolvedBy: string, status: 'resolved' | 'dismissed') {
    const { data, error } = await this.client
      .from('review_flags')
      .update({
        status,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString()
      })
      .eq('id', flagId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Analytics
  async getReviewAnalytics(agentId: string, startDate?: string, endDate?: string) {
    let query = this.client
      .from('review_analytics')
      .select('*')
      .eq('agent_id', agentId)
      .order('period_start', { ascending: false });

    if (startDate) {
      query = query.gte('period_start', startDate);
    }

    if (endDate) {
      query = query.lte('period_end', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get reviews by user (for user profile)
  async getUserReviews(userId: string, limit = 10, offset = 0) {
    const { data, error } = await this.client
      .from('reviews')
      .select(`
        *,
        agent:agent_id(id, name, author_id),
        response:review_responses(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Calculate quality score for a review
  async calculateQualityScore(reviewId: string) {
    const { data, error } = await this.client
      .rpc('calculate_review_quality_score', { review_id: reviewId });

    if (error) throw error;
    return data;
  }
}

// Export singleton instance
export const reviewsDb = new ReviewsDatabase();