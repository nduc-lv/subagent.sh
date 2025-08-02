'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Users, 
  MessageSquare, 
  Shield,
  Calendar,
  Filter,
  Download,
  Award,
  Target,
  Book,
  Zap,
  Wrench
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reviewsDb } from '@/lib/supabase/reviews-database';
import { cn } from '@/lib/utils';
import type { ReviewAnalytics, ReviewStatistics } from '@/types';

interface ReviewAnalyticsDashboardProps {
  agentId: string;
  className?: string;
}

const categoryIcons = {
  usability: Target,
  documentation: Book,
  performance: Zap,
  reliability: Wrench
};

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ReviewAnalyticsDashboard({
  agentId,
  className
}: ReviewAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<ReviewAnalytics[]>([]);
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [agentId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [analyticsData, statsData] = await Promise.all([
        reviewsDb.getReviewAnalytics(agentId, startDate.toISOString(), endDate.toISOString()),
        reviewsDb.getReviewStatistics(agentId)
      ]);

      setAnalytics(analyticsData);
      setStatistics(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvData = analytics.map(item => ({
      Period: `${item.period_start} to ${item.period_end}`,
      'Total Reviews': item.total_reviews,
      'New Reviews': item.new_reviews,
      'Average Rating': item.average_rating,
      'Verified Reviews': item.verified_reviews,
      'Flagged Reviews': item.flagged_reviews,
      'Response Rate': `${item.response_rate}%`
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-analytics-${agentId}-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const ratingTrendData = analytics.map(item => ({
    period: item.period_start,
    rating: item.average_rating,
    reviews: item.new_reviews
  }));

  const ratingDistributionData = statistics ? 
    Object.entries(statistics.rating_distribution).map(([rating, count]) => ({
      rating: `${rating} Stars`,
      count,
      percentage: statistics.total_reviews > 0 ? (count / statistics.total_reviews) * 100 : 0
    })) : [];

  const categoryRatingsData = statistics ?
    Object.entries(statistics.category_ratings).map(([category, rating]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      rating,
      icon: categoryIcons[category as keyof typeof categoryIcons]
    })).filter(item => item.rating > 0) : [];

  const qualityMetricsData = analytics.map(item => ({
    period: item.period_start,
    verified: item.verified_reviews,
    flagged: item.flagged_reviews,
    response_rate: item.response_rate
  }));

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-2">Error loading analytics</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={fetchAnalytics} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Analytics</h2>
          <p className="text-muted-foreground">
            Insights into your agent's reviews and ratings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportData} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">Average Rating</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {statistics?.average_rating.toFixed(1) || '0.0'}
                </div>
                <div className="text-xs text-muted-foreground">
                  out of 5.0
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Total Reviews</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {statistics?.total_reviews || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {statistics?.recent_reviews || 0} this month
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Verified Reviews</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {statistics?.verified_reviews || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {statistics && statistics.total_reviews > 0 
                    ? `${((statistics.verified_reviews / statistics.total_reviews) * 100).toFixed(0)}%`
                    : '0%'
                  } of total
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">Response Rate</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {statistics?.response_rate.toFixed(0) || 0}%
                </div>
                <div className="text-xs text-muted-foreground">
                  author responses
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Rating Trend</CardTitle>
              <CardDescription>
                Average rating over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={ratingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis domain={[0, 5]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any, name) => [
                      name === 'rating' ? value.toFixed(1) : value,
                      name === 'rating' ? 'Average Rating' : 'New Reviews'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="rating"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rating Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
              <CardDescription>
                Breakdown of star ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ratingDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ rating, percentage }) => percentage > 5 ? `${rating}: ${percentage.toFixed(0)}%` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ratingDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name, props) => [
                      `${value} reviews (${props.payload.percentage.toFixed(1)}%)`,
                      props.payload.rating
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Ratings */}
        {categoryRatingsData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>
                  Ratings by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryRatingsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip formatter={(value: any) => [value.toFixed(1), 'Rating']} />
                    <Bar dataKey="rating" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quality Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
              <CardDescription>
                Review quality indicators over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={qualityMetricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="verified"
                    stroke="#22c55e"
                    name="Verified Reviews"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="response_rate"
                    stroke="#3b82f6"
                    name="Response Rate %"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="flagged"
                    stroke="#ef4444"
                    name="Flagged Reviews"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quality Insights */}
      {statistics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quality Insights</CardTitle>
              <CardDescription>
                Key takeaways from your review data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statistics.average_rating >= 4.5 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <Award className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="font-medium text-green-700">Excellent Rating</div>
                      <div className="text-sm text-green-600">
                        Your agent has an outstanding {statistics.average_rating.toFixed(1)}/5 rating
                      </div>
                    </div>
                  </div>
                )}

                {statistics.response_rate >= 70 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-700">Responsive Author</div>
                      <div className="text-sm text-blue-600">
                        {statistics.response_rate.toFixed(0)}% response rate builds trust
                      </div>
                    </div>
                  </div>
                )}

                {statistics.verified_reviews / statistics.total_reviews >= 0.3 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <Shield className="h-8 w-8 text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-700">Well Verified</div>
                      <div className="text-sm text-purple-600">
                        {((statistics.verified_reviews / statistics.total_reviews) * 100).toFixed(0)}% of reviews are verified
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}