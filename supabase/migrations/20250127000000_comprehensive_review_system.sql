-- Comprehensive Review System Migration
-- This migration enhances the existing review system with advanced features

-- Create enum types for enhanced review system
CREATE TYPE review_category AS ENUM ('usability', 'documentation', 'performance', 'reliability', 'overall');
CREATE TYPE moderation_action AS ENUM ('approve', 'hide', 'remove', 'flag');
CREATE TYPE verification_level AS ENUM ('none', 'email', 'github', 'verified_user');

-- Drop existing reviews table to recreate with enhanced structure
DROP TABLE IF EXISTS public.reviews CASCADE;

-- Enhanced reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Rating system
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    usability_rating INTEGER CHECK (usability_rating >= 1 AND usability_rating <= 5),
    documentation_rating INTEGER CHECK (documentation_rating >= 1 AND documentation_rating <= 5),
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    
    -- Content
    title TEXT CHECK (char_length(title) <= 200),
    content TEXT CHECK (char_length(content) <= 10000),
    
    -- Features
    pros TEXT[] DEFAULT '{}',
    cons TEXT[] DEFAULT '{}',
    use_case TEXT CHECK (char_length(use_case) <= 1000),
    
    -- Metadata
    status review_status DEFAULT 'active',
    verification_level verification_level DEFAULT 'none',
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Images and attachments
    image_urls TEXT[] DEFAULT '{}',
    
    -- Moderation
    flagged_count INTEGER DEFAULT 0,
    last_flagged_at TIMESTAMP WITH TIME ZONE,
    moderation_notes TEXT,
    moderated_by UUID REFERENCES public.profiles(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Edit tracking
    edit_count INTEGER DEFAULT 0,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    edit_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(agent_id, user_id), -- One review per user per agent
    CHECK (edit_count >= 0),
    CHECK (helpful_count >= 0),
    CHECK (not_helpful_count >= 0),
    CHECK (flagged_count >= 0),
    CHECK (array_length(image_urls, 1) <= 5) -- Max 5 images per review
);

-- Review responses table (for agent authors to respond to reviews)
CREATE TABLE public.review_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    status review_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id) -- One response per review
);

-- Review votes table (for helpful/not helpful voting)
CREATE TABLE public.review_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- Review flags table (for reporting inappropriate content)
CREATE TABLE public.review_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fake', 'off_topic', 'harassment', 'other')),
    description TEXT CHECK (char_length(description) <= 500),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id) -- One flag per user per review
);

-- Review edit history table
CREATE TABLE public.review_edit_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
    title_before TEXT,
    content_before TEXT,
    title_after TEXT,
    content_after TEXT,
    edit_reason TEXT,
    edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review drafts table (for saving review drafts)
CREATE TABLE public.review_drafts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Draft content
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    usability_rating INTEGER CHECK (usability_rating >= 1 AND usability_rating <= 5),
    documentation_rating INTEGER CHECK (documentation_rating >= 1 AND documentation_rating <= 5),
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    title TEXT,
    content TEXT,
    pros TEXT[] DEFAULT '{}',
    cons TEXT[] DEFAULT '{}',
    use_case TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, user_id) -- One draft per user per agent
);

-- Review analytics table
CREATE TABLE public.review_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Review metrics
    total_reviews INTEGER DEFAULT 0,
    new_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_distribution JSONB DEFAULT '{}', -- {"1": 0, "2": 1, "3": 5, "4": 10, "5": 15}
    
    -- Category ratings
    avg_usability_rating DECIMAL(3,2) DEFAULT 0.00,
    avg_documentation_rating DECIMAL(3,2) DEFAULT 0.00,
    avg_performance_rating DECIMAL(3,2) DEFAULT 0.00,
    avg_reliability_rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- Engagement metrics
    total_votes INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage of reviews with responses
    
    -- Quality metrics
    verified_reviews INTEGER DEFAULT 0,
    flagged_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, period_start, period_end)
);

-- Update the votes table to handle review voting
ALTER TABLE public.votes 
ADD COLUMN review_vote_id UUID REFERENCES public.review_votes(id) ON DELETE CASCADE;

-- Update the constraint to handle the new review voting
ALTER TABLE public.votes 
DROP CONSTRAINT vote_target_check;

ALTER TABLE public.votes 
ADD CONSTRAINT vote_target_check CHECK (
    (agent_id IS NOT NULL AND review_id IS NULL AND review_vote_id IS NULL) OR
    (agent_id IS NULL AND review_id IS NOT NULL AND review_vote_id IS NULL) OR
    (agent_id IS NULL AND review_id IS NULL AND review_vote_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX idx_reviews_agent_id ON public.reviews(agent_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_overall_rating ON public.reviews(overall_rating);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX idx_reviews_updated_at ON public.reviews(updated_at DESC);
CREATE INDEX idx_reviews_helpful_count ON public.reviews(helpful_count DESC);
CREATE INDEX idx_reviews_quality_score ON public.reviews(quality_score DESC);
CREATE INDEX idx_reviews_verification ON public.reviews(verification_level);

CREATE INDEX idx_review_responses_review_id ON public.review_responses(review_id);
CREATE INDEX idx_review_responses_user_id ON public.review_responses(user_id);

CREATE INDEX idx_review_votes_review_id ON public.review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON public.review_votes(user_id);
CREATE INDEX idx_review_votes_type ON public.review_votes(vote_type);

CREATE INDEX idx_review_flags_review_id ON public.review_flags(review_id);
CREATE INDEX idx_review_flags_status ON public.review_flags(status);
CREATE INDEX idx_review_flags_reason ON public.review_flags(reason);

CREATE INDEX idx_review_drafts_agent_user ON public.review_drafts(agent_id, user_id);
CREATE INDEX idx_review_drafts_updated ON public.review_drafts(updated_at DESC);

CREATE INDEX idx_review_analytics_agent ON public.review_analytics(agent_id);
CREATE INDEX idx_review_analytics_period ON public.review_analytics(period_start, period_end);

-- Full-text search indexes
CREATE INDEX idx_reviews_search ON public.reviews USING GIN(to_tsvector('english', 
    COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || array_to_string(COALESCE(pros, '{}'), ' ') || ' ' || array_to_string(COALESCE(cons, '{}'), ' ')
));

-- Partial indexes for better performance
CREATE INDEX idx_reviews_active ON public.reviews(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_reviews_flagged ON public.reviews(flagged_count) WHERE flagged_count > 0;
CREATE INDEX idx_reviews_verified ON public.reviews(created_at DESC) WHERE is_verified_purchase = true;

-- Functions for review system

-- Function to calculate review quality score
CREATE OR REPLACE FUNCTION calculate_review_quality_score(review_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    review_record RECORD;
    quality_score DECIMAL := 0.00;
    content_length INTEGER;
    vote_ratio DECIMAL;
BEGIN
    SELECT * INTO review_record FROM public.reviews WHERE id = review_id;
    
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    -- Base score from verification
    IF review_record.verification_level = 'verified_user' THEN
        quality_score := quality_score + 2.0;
    ELSIF review_record.verification_level = 'github' THEN
        quality_score := quality_score + 1.5;
    ELSIF review_record.verification_level = 'email' THEN
        quality_score := quality_score + 1.0;
    END IF;
    
    -- Score from verified purchase
    IF review_record.is_verified_purchase THEN
        quality_score := quality_score + 1.5;
    END IF;
    
    -- Score from content quality
    content_length := COALESCE(char_length(review_record.content), 0);
    IF content_length > 500 THEN
        quality_score := quality_score + 2.0;
    ELSIF content_length > 200 THEN
        quality_score := quality_score + 1.0;
    ELSIF content_length > 50 THEN
        quality_score := quality_score + 0.5;
    END IF;
    
    -- Score from having pros/cons
    IF array_length(review_record.pros, 1) > 0 OR array_length(review_record.cons, 1) > 0 THEN
        quality_score := quality_score + 1.0;
    END IF;
    
    -- Score from category ratings
    IF review_record.usability_rating IS NOT NULL OR 
       review_record.documentation_rating IS NOT NULL OR 
       review_record.performance_rating IS NOT NULL OR 
       review_record.reliability_rating IS NOT NULL THEN
        quality_score := quality_score + 1.0;
    END IF;
    
    -- Score from helpfulness votes
    IF review_record.total_votes > 0 THEN
        vote_ratio := CAST(review_record.helpful_count AS DECIMAL) / review_record.total_votes;
        quality_score := quality_score + (vote_ratio * 2.0);
    END IF;
    
    -- Penalty for flags
    IF review_record.flagged_count > 0 THEN
        quality_score := quality_score - (review_record.flagged_count * 0.5);
    END IF;
    
    -- Normalize to 0-5 scale
    quality_score := LEAST(5.00, GREATEST(0.00, quality_score));
    
    -- Update the review record
    UPDATE public.reviews SET quality_score = quality_score WHERE id = review_id;
    
    RETURN quality_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update agent rating when reviews change
CREATE OR REPLACE FUNCTION update_agent_rating(agent_uuid UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL;
    review_count INTEGER;
    category_ratings RECORD;
BEGIN
    -- Calculate overall rating
    SELECT 
        COALESCE(AVG(overall_rating), 0.00)::DECIMAL(3,2),
        COUNT(*)
    INTO avg_rating, review_count
    FROM public.reviews 
    WHERE agent_id = agent_uuid AND status = 'active';
    
    -- Calculate category-specific ratings
    SELECT 
        COALESCE(AVG(usability_rating), 0.00)::DECIMAL(3,2) as avg_usability,
        COALESCE(AVG(documentation_rating), 0.00)::DECIMAL(3,2) as avg_documentation,
        COALESCE(AVG(performance_rating), 0.00)::DECIMAL(3,2) as avg_performance,
        COALESCE(AVG(reliability_rating), 0.00)::DECIMAL(3,2) as avg_reliability
    INTO category_ratings
    FROM public.reviews 
    WHERE agent_id = agent_uuid AND status = 'active';
    
    -- Update agent record
    UPDATE public.agents 
    SET 
        rating_average = avg_rating,
        rating_count = review_count,
        updated_at = NOW()
    WHERE id = agent_uuid;
    
    -- Update/create analytics record for current period
    INSERT INTO public.review_analytics (
        agent_id,
        period_start,
        period_end,
        total_reviews,
        average_rating,
        avg_usability_rating,
        avg_documentation_rating,
        avg_performance_rating,
        avg_reliability_rating
    ) VALUES (
        agent_uuid,
        date_trunc('month', CURRENT_DATE),
        (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date,
        review_count,
        avg_rating,
        category_ratings.avg_usability,
        category_ratings.avg_documentation,
        category_ratings.avg_performance,
        category_ratings.avg_reliability
    )
    ON CONFLICT (agent_id, period_start, period_end)
    DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        avg_usability_rating = EXCLUDED.avg_usability_rating,
        avg_documentation_rating = EXCLUDED.avg_documentation_rating,
        avg_performance_rating = EXCLUDED.avg_performance_rating,
        avg_reliability_rating = EXCLUDED.avg_reliability_rating;
END;
$$ LANGUAGE plpgsql;

-- Function to get review statistics for an agent
CREATE OR REPLACE FUNCTION get_review_statistics(agent_uuid UUID)
RETURNS TABLE (
    total_reviews INTEGER,
    average_rating DECIMAL,
    rating_distribution JSONB,
    category_ratings JSONB,
    recent_reviews INTEGER,
    verified_reviews INTEGER,
    response_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH review_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            AVG(overall_rating)::DECIMAL(3,2) as avg_rating,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::INTEGER as recent,
            COUNT(*) FILTER (WHERE is_verified_purchase = true)::INTEGER as verified,
            AVG(usability_rating)::DECIMAL(3,2) as avg_usability,
            AVG(documentation_rating)::DECIMAL(3,2) as avg_documentation,
            AVG(performance_rating)::DECIMAL(3,2) as avg_performance,
            AVG(reliability_rating)::DECIMAL(3,2) as avg_reliability
        FROM public.reviews 
        WHERE agent_id = agent_uuid AND status = 'active'
    ),
    rating_dist AS (
        SELECT jsonb_object_agg(
            rating::text, 
            count
        ) as distribution
        FROM (
            SELECT 
                overall_rating as rating,
                COUNT(*)::INTEGER as count
            FROM public.reviews 
            WHERE agent_id = agent_uuid AND status = 'active'
            GROUP BY overall_rating
        ) sub
    ),
    response_stats AS (
        SELECT 
            (COUNT(rr.id)::DECIMAL / NULLIF(COUNT(r.id), 0) * 100)::DECIMAL(5,2) as rate
        FROM public.reviews r
        LEFT JOIN public.review_responses rr ON r.id = rr.review_id
        WHERE r.agent_id = agent_uuid AND r.status = 'active'
    )
    SELECT 
        rs.total,
        rs.avg_rating,
        COALESCE(rd.distribution, '{}'::jsonb),
        jsonb_build_object(
            'usability', rs.avg_usability,
            'documentation', rs.avg_documentation,
            'performance', rs.avg_performance,
            'reliability', rs.avg_reliability
        ),
        rs.recent,
        rs.verified,
        COALESCE(resp.rate, 0.00)
    FROM review_stats rs
    CROSS JOIN rating_dist rd
    CROSS JOIN response_stats resp;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update ratings and quality scores
CREATE OR REPLACE FUNCTION trigger_update_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_agent_rating(NEW.agent_id);
        PERFORM calculate_review_quality_score(NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_agent_rating(OLD.agent_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reviews_update_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_update_agent_rating();

-- Trigger to update review vote counts
CREATE OR REPLACE FUNCTION trigger_update_review_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE public.reviews 
            SET 
                helpful_count = helpful_count + 1,
                total_votes = total_votes + 1
            WHERE id = NEW.review_id;
        ELSE
            UPDATE public.reviews 
            SET 
                not_helpful_count = not_helpful_count + 1,
                total_votes = total_votes + 1
            WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE public.reviews 
            SET 
                helpful_count = helpful_count - 1,
                total_votes = total_votes - 1
            WHERE id = OLD.review_id;
        ELSE
            UPDATE public.reviews 
            SET 
                not_helpful_count = not_helpful_count - 1,
                total_votes = total_votes - 1
            WHERE id = OLD.review_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_votes_update_counts
    AFTER INSERT OR DELETE ON public.review_votes
    FOR EACH ROW EXECUTE FUNCTION trigger_update_review_votes();

-- Trigger to update flag counts
CREATE OR REPLACE FUNCTION trigger_update_review_flags()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reviews 
        SET 
            flagged_count = flagged_count + 1,
            last_flagged_at = NOW()
        WHERE id = NEW.review_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reviews 
        SET flagged_count = flagged_count - 1
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_flags_update_counts
    AFTER INSERT OR DELETE ON public.review_flags
    FOR EACH ROW EXECUTE FUNCTION trigger_update_review_flags();

-- Set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_responses_updated_at 
    BEFORE UPDATE ON public.review_responses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_drafts_updated_at 
    BEFORE UPDATE ON public.review_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();