'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Flag, 
  Eye, 
  EyeOff, 
  Trash2, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare
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
  DialogFooter
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReviewModeration } from '@/hooks/use-reviews';
import { cn } from '@/lib/utils';
import type { Review, ReviewFlag } from '@/types';

interface ReviewModerationProps {
  review: Review;
  onReviewModerated?: (reviewId: string, action: string) => void;
  className?: string;
}

export function ReviewModeration({
  review,
  onReviewModerated,
  className
}: ReviewModerationProps) {
  const [showFlagsDialog, setShowFlagsDialog] = useState(false);
  const [flags, setFlags] = useState<ReviewFlag[]>([]);
  const [moderationNotes, setModerationNotes] = useState('');
  
  const { moderateReview, getFlags, resolveFlag, loading } = useReviewModeration();

  const handleViewFlags = async () => {
    try {
      const flagData = await getFlags(review.id);
      setFlags(flagData);
      setShowFlagsDialog(true);
    } catch (error) {
      console.error('Failed to fetch flags:', error);
    }
  };

  const handleModerate = async (action: 'approve' | 'hide' | 'remove') => {
    try {
      await moderateReview(review.id, action, moderationNotes);
      onReviewModerated?.(review.id, action);
    } catch (error) {
      console.error('Failed to moderate review:', error);
    }
  };

  const handleResolveFlag = async (flagId: string, status: 'resolved' | 'dismissed') => {
    try {
      await resolveFlag(flagId, status);
      // Refresh flags
      const flagData = await getFlags(review.id);
      setFlags(flagData);
    } catch (error) {
      console.error('Failed to resolve flag:', error);
    }
  };

  const getFlagStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'reviewed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
      case 'dismissed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'hidden': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'flagged': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      <Card className={cn("border-orange-200 bg-orange-50 dark:bg-orange-950/30", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Review Moderation
            </CardTitle>
            <Badge 
              variant="outline" 
              className={getReviewStatusColor(review.status)}
            >
              {review.status.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            Manage this review's visibility and address flags
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Review Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Quality Score</span>
              <div className="font-medium">{review.quality_score.toFixed(1)}/5.0</div>
            </div>
            <div>
              <span className="text-muted-foreground">Flags</span>
              <div className="font-medium">{review.flagged_count}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Helpful Votes</span>
              <div className="font-medium">{review.helpful_count}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Votes</span>
              <div className="font-medium">{review.total_votes}</div>
            </div>
          </div>

          {/* Flags Summary */}
          {review.flagged_count > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {review.flagged_count} flag{review.flagged_count > 1 ? 's' : ''} reported
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewFlags}
                  className="border-red-200 text-red-700 hover:bg-red-100"
                >
                  View Details
                </Button>
              </div>
            </div>
          )}

          {/* Moderation Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Moderation Notes</label>
            <textarea
              value={moderationNotes}
              onChange={(e) => setModerationNotes(e.target.value)}
              placeholder="Add notes about your moderation decision..."
              rows={3}
              className="w-full p-2 border rounded-md text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Last moderated: {review.moderated_at ? new Date(review.moderated_at).toLocaleDateString() : 'Never'}
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={loading}>
                    <Shield className="h-4 w-4 mr-2" />
                    Moderate
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleModerate('approve')}
                    className="text-green-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleModerate('hide')}
                    className="text-orange-600"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleModerate('remove')}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flags Dialog */}
      <Dialog open={showFlagsDialog} onOpenChange={setShowFlagsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Flags</DialogTitle>
            <DialogDescription>
              Manage flags reported for this review
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {flags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No flags found for this review
              </div>
            ) : (
              flags.map((flag) => (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className="capitalize text-xs"
                        >
                          {flag.reason.replace('_', ' ')}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={cn("text-xs", getFlagStatusColor(flag.status))}
                        >
                          {flag.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Reported by {(flag as any).user?.username || 'Anonymous'} &bull; {' '}
                        {new Date(flag.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {flag.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveFlag(flag.id, 'resolved')}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveFlag(flag.id, 'dismissed')}
                          className="text-gray-600 border-gray-200 hover:bg-gray-50"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>

                  {flag.description && (
                    <div className="text-sm bg-muted/50 p-2 rounded">
                      <strong>Details:</strong> {flag.description}
                    </div>
                  )}

                  {flag.resolved_at && (
                    <div className="text-xs text-muted-foreground">
                      Resolved on {new Date(flag.resolved_at).toLocaleDateString()}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}