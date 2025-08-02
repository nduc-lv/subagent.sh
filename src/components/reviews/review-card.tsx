'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  User, 
  Calendar, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Flag, 
  Edit, 
  Trash2,
  MoreHorizontal,
  Shield,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Target,
  Book,
  Zap,
  Wrench,
  Quote,
  Image as ImageIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Rating } from '@/components/ui/rating';
import { cn } from '@/lib/utils';
import type { Review, ReviewVote, ReviewResponse } from '@/types';

interface ReviewCardProps {
  review: Review;
  userVote?: ReviewVote;
  showAgent?: boolean;
  isOwner?: boolean;
  isAuthor?: boolean;
  onVote?: (reviewId: string, voteType: 'upvote' | 'downvote') => Promise<void>;
  onFlag?: (reviewId: string, reason: string, description?: string) => Promise<void>;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => Promise<void>;
  onResponse?: (reviewId: string) => void;
  className?: string;
}

const categoryIcons = {
  usability: Target,
  documentation: Book,
  performance: Zap,
  reliability: Wrench
};

const verificationBadges = {
  verified_user: { icon: Shield, label: 'Verified User', color: 'bg-green-500' },
  github: { icon: CheckCircle, label: 'GitHub Verified', color: 'bg-blue-500' },
  email: { icon: CheckCircle, label: 'Email Verified', color: 'bg-yellow-500' },
  none: null
};

export function ReviewCard({
  review,
  userVote,
  showAgent = false,
  isOwner = false,
  isAuthor = false,
  onVote,
  onFlag,
  onEdit,
  onDelete,
  onResponse,
  className
}: ReviewCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagDescription, setFlagDescription] = useState('');
  const [showFullContent, setShowFullContent] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const categoryRatings = [
    { key: 'usability', value: review.usability_rating, label: 'Usability' },
    { key: 'documentation', value: review.documentation_rating, label: 'Documentation' },
    { key: 'performance', value: review.performance_rating, label: 'Performance' },
    { key: 'reliability', value: review.reliability_rating, label: 'Reliability' }
  ].filter(rating => rating.value && rating.value > 0);

  const verification = verificationBadges[review.verification_level];
  const contentPreview = review.content.length > 300 ? review.content.slice(0, 300) + '...' : review.content;
  const shouldTruncate = review.content.length > 300;

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!onVote || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(review.id, voteType);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleFlag = async () => {
    if (!onFlag || !flagReason) return;

    try {
      await onFlag(review.id, flagReason, flagDescription);
      setShowFlagDialog(false);
      setFlagReason('');
      setFlagDescription('');
    } catch (error) {
      console.error('Failed to flag review:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getQualityBadge = (score: number) => {
    if (score >= 4.5) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 3.5) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 2.5) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Basic', color: 'bg-gray-500' };
  };

  const qualityBadge = getQualityBadge(review.quality_score);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full", className)}
      >
        <Card className={cn(
          "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 border-border/60 hover:border-border/80 bg-gradient-to-br from-card via-card/98 to-card/95",
          review.status === 'flagged' && "border-destructive/50 bg-gradient-to-br from-destructive/5 via-destructive/3 to-destructive/5"
        )}>
          {/* Gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <CardHeader className="pb-4 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {review.user?.username ? (
                  <Link 
                    href={`/user/${review.user.username}`}
                    className="hover:scale-105 transition-transform duration-200"
                  >
                    <Avatar className="h-10 w-10 border border-border/30 shadow-sm cursor-pointer hover:border-primary/50">
                      {review.user?.avatar_url ? (
                        <img 
                          src={review.user.avatar_url} 
                          alt={review.user.username || 'User'} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary/60" />
                        </div>
                      )}
                    </Avatar>
                  </Link>
                ) : (
                  <Avatar className="h-10 w-10 border border-border/30 shadow-sm">
                    {review.user?.avatar_url ? (
                      <img 
                        src={review.user.avatar_url} 
                        alt={review.user.username || 'User'} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary/60" />
                      </div>
                    )}
                  </Avatar>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {review.user?.username ? (
                      <Link 
                        href={`/user/${review.user.username}`}
                        className="hover:text-primary transition-colors duration-200"
                      >
                        <h4 className="font-semibold text-base text-foreground/90 cursor-pointer">
                          {review.user?.full_name || review.user?.username || 'Anonymous'}
                        </h4>
                      </Link>
                    ) : (
                      <h4 className="font-semibold text-base text-foreground/90">
                        {review.user?.full_name || review.user?.username || 'Anonymous'}
                      </h4>
                    )}
                    
                    {verification && (
                      <Badge variant="secondary" className="h-5 text-xs bg-gradient-to-r from-primary/15 to-primary/10 border-0">
                        <verification.icon className="h-3 w-3 mr-1" />
                        {verification.label}
                      </Badge>
                    )}

                    {review.is_verified_purchase && (
                      <Badge variant="secondary" className="h-5 text-xs bg-gradient-to-r from-green-500/15 to-green-500/10 text-green-700 dark:text-green-400 border-0">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified Use
                      </Badge>
                    )}

                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-5 text-xs border-0",
                        qualityBadge.color === 'bg-green-500' && "bg-gradient-to-r from-green-500/20 to-green-500/15 text-green-700 dark:text-green-400",
                        qualityBadge.color === 'bg-blue-500' && "bg-gradient-to-r from-blue-500/20 to-blue-500/15 text-blue-700 dark:text-blue-400",
                        qualityBadge.color === 'bg-yellow-500' && "bg-gradient-to-r from-yellow-500/20 to-yellow-500/15 text-yellow-700 dark:text-yellow-400",
                        qualityBadge.color === 'bg-gray-500' && "bg-gradient-to-r from-gray-500/20 to-gray-500/15 text-gray-700 dark:text-gray-400"
                      )}
                    >
                      {qualityBadge.label} Review
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                    
                    {review.edit_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        <span>Edited {review.edit_count} time{review.edit_count > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    {showAgent && review.agent && (
                      <div className="flex items-center gap-1">
                        <span>for</span>
                        <span className="font-medium">{review.agent.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(review)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Review
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete?.(review.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Review
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {isAuthor && !review.response && (
                    <>
                      <DropdownMenuItem onClick={() => onResponse?.(review.id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond to Review
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => setShowFlagDialog(true)}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report Review
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title and Overall Rating */}
            <div className="space-y-3 mt-4">
              {review.title && (
                <h3 className="text-lg font-semibold leading-tight text-foreground/90">
                  {review.title}
                </h3>
              )}
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5 transition-all",
                        i < review.overall_rating 
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" 
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-foreground/80">
                    {review.overall_rating}.0
                  </span>
                </div>
                
                {categoryRatings.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground/60">&bull;</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
                      onClick={() => setShowImages(!showImages)}
                    >
                      Category ratings
                      {showImages ? <EyeOff className="h-3 w-3 ml-1" /> : <Eye className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                )}
              </div>

              {/* Category Ratings */}
              <AnimatePresence>
                {showImages && categoryRatings.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2"
                  >
                    {categoryRatings.map((rating) => {
                      const Icon = categoryIcons[rating.key as keyof typeof categoryIcons];
                      return (
                        <div key={rating.key} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{rating.label}</span>
                          <Rating value={rating.value!} size="sm" maxValue={5} />
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {/* Review Content */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">
                {showFullContent || !shouldTruncate ? review.content : contentPreview}
              </div>
              {shouldTruncate && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2"
                  onClick={() => setShowFullContent(!showFullContent)}
                >
                  {showFullContent ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>

            {/* Pros and Cons */}
            {(review.pros?.length || review.cons?.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {review.pros && review.pros.length > 0 && (
                  <div className="space-y-2 bg-gradient-to-br from-green-50/50 to-green-50/30 dark:from-green-950/20 dark:to-green-950/10 p-4 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                      <ThumbsUp className="h-4 w-4" />
                      Pros
                    </h4>
                    <ul className="space-y-1">
                      {review.pros.map((pro, index) => (
                        <li key={index} className="text-sm flex items-start gap-2 text-foreground/80">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.cons && review.cons.length > 0 && (
                  <div className="space-y-2 bg-gradient-to-br from-red-50/50 to-red-50/30 dark:from-red-950/20 dark:to-red-950/10 p-4 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                      <ThumbsDown className="h-4 w-4" />
                      Cons
                    </h4>
                    <ul className="space-y-1">
                      {review.cons.map((con, index) => (
                        <li key={index} className="text-sm flex items-start gap-2 text-foreground/80">
                          <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Use Case */}
            {review.use_case && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                  <Quote className="h-4 w-4" />
                  Use Case
                </h4>
                <p className="text-sm text-muted-foreground italic">
                  "{review.use_case}"
                </p>
              </div>
            )}

            {/* Images */}
            {review.image_urls && review.image_urls.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Screenshots
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {review.image_urls.map((url, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setExpandedImage(url)}
                      className="relative group"
                    >
                      <img
                        src={url}
                        alt={`Review screenshot ${index + 1}`}
                        className="w-full h-20 object-cover rounded border cursor-pointer"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Author Response */}
            {review.response && (
              <div className="relative bg-gradient-to-br from-blue-50/50 to-blue-50/30 dark:from-blue-950/20 dark:to-blue-950/10 p-4 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-l-lg" />
                <div className="flex items-center gap-2 mb-2 pl-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-sm text-foreground/90">Author Response</span>
                  <Badge variant="secondary" className="h-5 text-xs bg-gradient-to-r from-blue-500/15 to-blue-500/10 text-blue-700 dark:text-blue-400 border-0">
                    {review.response.user?.username || 'Author'}
                  </Badge>
                </div>
                <p className="text-sm text-foreground/80 pl-2">{review.response.content}</p>
                <p className="text-xs text-muted-foreground mt-2 pl-2">
                  {formatDate(review.response.created_at)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('upvote')}
                  disabled={isVoting}
                  className={cn(
                    "h-8 gap-2 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all",
                    userVote?.vote_type === 'upvote' && "text-green-600 bg-green-50 dark:bg-green-950/30"
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">{review.helpful_count}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('downvote')}
                  disabled={isVoting}
                  className={cn(
                    "h-8 gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all",
                    userVote?.vote_type === 'downvote' && "text-red-600 bg-red-50 dark:bg-red-950/30"
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">{review.not_helpful_count}</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {review.flagged_count > 0 && (
                  <Badge variant="outline" className="h-5 text-xs text-orange-600 border-orange-300">
                    <Flag className="h-3 w-3 mr-1" />
                    {review.flagged_count} flag{review.flagged_count > 1 ? 's' : ''}
                  </Badge>
                )}
                <span>{review.total_votes} vote{review.total_votes !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
            <DialogDescription>
              Help us maintain quality by reporting inappropriate content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a reason</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="fake">Fake review</option>
                <option value="off_topic">Off topic</option>
                <option value="harassment">Harassment</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional details (optional)</label>
              <textarea
                value={flagDescription}
                onChange={(e) => setFlagDescription(e.target.value)}
                placeholder="Provide additional context..."
                rows={3}
                className="w-full p-2 border rounded-md resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleFlag} disabled={!flagReason}>
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review Screenshot</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Review screenshot"
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}