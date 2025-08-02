'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Filter,
  Download,
  Eye,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useSearchAnalytics, useTrendingSearches } from '@/hooks/use-enhanced-search';
import { cn } from '@/lib/utils';

interface SearchAnalyticsDashboardProps {
  userId?: string;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
    period: string;
  };
  icon: React.ElementType;
  className?: string;
}

function MetricCard({ title, value, change, icon: Icon, className }: MetricCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-sm mt-2",
                change.trend === 'up' ? "text-green-600" : "text-red-600"
              )}>
                {change.trend === 'up' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                <span className="font-medium">
                  {Math.abs(change.value)}%
                </span>
                <span className="text-muted-foreground">
                  vs {change.period}
                </span>
              </div>
            )}
          </div>
          <div className="p-3 bg-muted rounded-full">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SearchAnalyticsDashboard({ 
  userId, 
  className 
}: SearchAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('30');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { analytics, loading, error } = useSearchAnalytics(userId, parseInt(timeRange));
  const { trendingSearches } = useTrendingSearches(parseInt(timeRange), 10);

  // Mock additional analytics data for demo
  const [additionalMetrics] = useState({
    clickThroughRate: 68.5,
    avgSearchTime: 1.2,
    resultsPerSearch: 12.4,
    popularFilters: [
      { name: 'Category', usage: 45 },
      { name: 'Tags', usage: 38 },
      { name: 'Language', usage: 28 },
      { name: 'Rating', usage: 22 },
      { name: 'Date Range', usage: 15 }
    ],
    searchPatterns: [
      { pattern: 'Single keyword', percentage: 35 },
      { pattern: 'Multiple keywords', percentage: 28 },
      { pattern: 'With filters', percentage: 25 },
      { pattern: 'Category browse', percentage: 12 }
    ]
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-8 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-destructive mb-2">Failed to load analytics</div>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Analytics</h2>
          <p className="text-muted-foreground">
            {userId ? 'Your search activity' : 'Platform-wide search metrics'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Searches"
          value={analytics?.total_searches || 0}
          change={{ value: 12.5, trend: 'up', period: 'last period' }}
          icon={Search}
        />
        
        <MetricCard
          title="Unique Queries"
          value={analytics?.unique_queries || 0}
          change={{ value: 8.3, trend: 'up', period: 'last period' }}
          icon={Target}
        />
        
        <MetricCard
          title="Avg Results"
          value={analytics?.avg_results || 0}
          change={{ value: 3.2, trend: 'down', period: 'last period' }}
          icon={BarChart3}
        />
        
        <MetricCard
          title="Click-through Rate"
          value={`${additionalMetrics.clickThroughRate}%`}
          change={{ value: 5.1, trend: 'up', period: 'last period' }}
          icon={Eye}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingSearches.slice(0, 8).map((search, index) => (
                <motion.div
                  key={search.query}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index < 3 ? "bg-terminal-green text-terminal-green-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{search.query}</span>
                  </div>
                  <Badge variant="outline">
                    {search.search_count} searches
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filter Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {additionalMetrics.popularFilters.map((filter, index) => (
                <div key={filter.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{filter.name}</span>
                    <span className="text-muted-foreground">{filter.usage}%</span>
                  </div>
                  <Progress value={filter.usage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Search Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {additionalMetrics.searchPatterns.map((pattern, index) => (
                <div key={pattern.pattern} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{pattern.pattern}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div 
                        className="h-2 bg-terminal-green rounded-full transition-all duration-500"
                        style={{ width: `${pattern.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {pattern.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg Search Time</span>
                  <span className="text-sm text-muted-foreground">
                    {additionalMetrics.avgSearchTime}s
                  </span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Results per Search</span>
                  <span className="text-sm text-muted-foreground">
                    {additionalMetrics.resultsPerSearch}
                  </span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">User Satisfaction</span>
                  <span className="text-sm text-muted-foreground">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Queries Table */}
      {analytics?.top_queries && analytics.top_queries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Search Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.top_queries.map((query, index) => (
                <div
                  key={query}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{query}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}