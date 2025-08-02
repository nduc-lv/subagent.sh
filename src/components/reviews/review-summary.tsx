'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Users, 
  Shield, 
  MessageSquare, 
  TrendingUp, 
  Target,
  Book,
  Zap,
  Wrench,
  Award,
  CheckCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rating } from '@/components/ui/rating';
import { cn } from '@/lib/utils';
import type { ReviewStatistics } from '@/types';

interface ReviewSummaryProps {
  statistics: ReviewStatistics;
  compact?: boolean;
  showTrends?: boolean;
  className?: string;
}

const categoryIcons = {
  usability: { icon: Target, color: 'text-blue-500' },
  documentation: { icon: Book, color: 'text-green-500' },
  performance: { icon: Zap, color: 'text-yellow-500' },
  reliability: { icon: Wrench, color: 'text-purple-500' }
};

export function ReviewSummary({
  statistics,
  compact = false,
  showTrends = false,
  className
}: ReviewSummaryProps) {
  // Ensure statistics object has required fields with defaults
  const safeStatistics = {
    total_reviews: statistics?.total_reviews || 0,
    average_rating: statistics?.average_rating || 0,
    rating_distribution: statistics?.rating_distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    category_ratings: statistics?.category_ratings || {
      usability: 0,
      documentation: 0,
      performance: 0,
      reliability: 0
    },
    recent_reviews: statistics?.recent_reviews || 0,
    verified_reviews: statistics?.verified_reviews || 0,
    response_rate: statistics?.response_rate || 0
  };

  const getQualityLevel = (rating: number) => {
    if (rating >= 4.5) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
    if (rating >= 4.0) return { label: 'Very Good', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };
    if (rating >= 3.5) return { label: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (rating >= 3.0) return { label: 'Fair', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' };
    return { label: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' };
  };

  const qualityLevel = getQualityLevel(safeStatistics.average_rating);
  const verificationRate = safeStatistics.total_reviews > 0 
    ? (safeStatistics.verified_reviews / safeStatistics.total_reviews) * 100 
    : 0;

  if (compact) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{safeStatistics.average_rating.toFixed(1)}</div>
                <Rating 
                  value={safeStatistics.average_rating} 
                  size="sm" 
                  showValue={false}
                  className="justify-center"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {safeStatistics.total_reviews} review{safeStatistics.total_reviews !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn(qualityLevel.bgColor, qualityLevel.color)}>
                {qualityLevel.label}
              </Badge>
              
              {safeStatistics.verified_reviews > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {safeStatistics.verified_reviews} verified
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Review Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold">{safeStatistics.average_rating.toFixed(1)}</span>
            <div className="text-left">
              <Rating 
                value={safeStatistics.average_rating} 
                size="lg" 
                showValue={false}
              />
              <div className="text-sm text-muted-foreground">
                {safeStatistics.total_reviews} review{safeStatistics.total_reviews !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          <Badge 
            variant="secondary" 
            className={cn(
              "text-sm px-3 py-1",
              qualityLevel.bgColor, 
              qualityLevel.color
            )}
          >
            {qualityLevel.label} Rating
          </Badge>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Rating Distribution</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = safeStatistics.rating_distribution[rating] || 0;
              const percentage = safeStatistics.total_reviews > 0 
                ? (count / safeStatistics.total_reviews) * 100 
                : 0;
              
              return (
                <motion.div 
                  key={rating} 
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rating * 0.1 }}
                >
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm w-2">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  
                  <div className="flex-1">
                    <Progress 
                      value={percentage} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </div>
                  
                  <div className="text-xs text-muted-foreground w-10 text-right">
                    {percentage.toFixed(0)}%
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Category Ratings */}
        {safeStatistics.category_ratings && Object.values(safeStatistics.category_ratings).some(rating => rating > 0) && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Category Breakdown</h4>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(safeStatistics.category_ratings || {}).map(([category, rating]) => {
                if (rating === 0) return null;
                
                const categoryInfo = categoryIcons[category as keyof typeof categoryIcons];
                const percentage = (rating / 5) * 100;
                
                return (
                  <motion.div 
                    key={category}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-2 w-28">
                      <categoryInfo.icon className={cn("h-4 w-4", categoryInfo.color)} />
                      <span className="text-sm capitalize">{category}</span>
                    </div>
                    
                    <div className="flex-1">
                      <Progress 
                        value={percentage} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="flex items-center gap-1 w-12">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-lg font-semibold">{safeStatistics.verified_reviews}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Verified ({verificationRate.toFixed(0)}%)
            </div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-semibold">{safeStatistics.response_rate.toFixed(0)}%</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Response Rate
            </div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-lg font-semibold">{safeStatistics.recent_reviews}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Recent (30d)
            </div>
          </motion.div>
        </div>

        {/* Quality Indicators */}
        {(verificationRate >= 50 || safeStatistics.response_rate >= 70 || safeStatistics.average_rating >= 4.5) && (
          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm mb-3">Quality Indicators</h4>
            <div className="flex flex-wrap gap-2">
              {safeStatistics.average_rating >= 4.5 && (
                <Badge variant="outline" className="gap-1 bg-yellow-50 border-yellow-200 text-yellow-700">
                  <Award className="h-3 w-3" />
                  Highly Rated
                </Badge>
              )}
              
              {verificationRate >= 50 && (
                <Badge variant="outline" className="gap-1 bg-green-50 border-green-200 text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  Well Verified
                </Badge>
              )}
              
              {safeStatistics.response_rate >= 70 && (
                <Badge variant="outline" className="gap-1 bg-blue-50 border-blue-200 text-blue-700">
                  <MessageSquare className="h-3 w-3" />
                  Responsive Author
                </Badge>
              )}
              
              {safeStatistics.total_reviews >= 20 && (
                <Badge variant="outline" className="gap-1 bg-purple-50 border-purple-200 text-purple-700">
                  <Users className="h-3 w-3" />
                  Well Reviewed
                </Badge>
              )}
            </div>
          </div>
        )}

        {showTrends && safeStatistics.recent_reviews > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">
                {safeStatistics.recent_reviews} new review{safeStatistics.recent_reviews !== 1 ? 's' : ''} this month
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}