'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Download,
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Users,
  Target,
  Award,
  Clock
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
import { LoadingSpinner } from '@/components/ui/loading';
import { useAgentPerformanceMetrics } from '@/hooks/use-database';
import { cn } from '@/lib/utils';

interface AgentPerformanceDashboardProps {
  agentId: string;
  agent?: any;
  className?: string;
}

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
];

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export function AgentPerformanceDashboard({ 
  agentId, 
  agent, 
  className 
}: AgentPerformanceDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const { metrics, loading, error } = useAgentPerformanceMetrics(agentId, parseInt(selectedPeriod));

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Unable to load performance metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = Object.keys(metrics.downloads).map(date => ({
    date,
    downloads: metrics.downloads[date] || 0,
    views: metrics.views[date] || 0,
  })).slice(-parseInt(selectedPeriod));

  // Calculate trends
  const halfwayPoint = Math.floor(chartData.length / 2);
  const firstHalf = chartData.slice(0, halfwayPoint);
  const secondHalf = chartData.slice(halfwayPoint);

  const firstHalfDownloads = firstHalf.reduce((sum, day) => sum + day.downloads, 0);
  const secondHalfDownloads = secondHalf.reduce((sum, day) => sum + day.downloads, 0);
  const downloadTrend = secondHalfDownloads - firstHalfDownloads;

  const firstHalfViews = firstHalf.reduce((sum, day) => sum + day.views, 0);
  const secondHalfViews = secondHalf.reduce((sum, day) => sum + day.views, 0);
  const viewTrend = secondHalfViews - firstHalfViews;

  // Calculate conversion rate (downloads / views)
  const conversionRate = metrics.totalViews > 0 
    ? ((metrics.totalDownloads / metrics.totalViews) * 100).toFixed(1)
    : '0.0';

  // Engagement metrics for pie chart
  const engagementData = [
    { name: 'Downloads', value: metrics.totalDownloads, color: COLORS[0] },
    { name: 'Views', value: metrics.totalViews - metrics.totalDownloads, color: COLORS[1] },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const StatCard = ({ 
    title, 
    value, 
    trend, 
    icon: Icon, 
    color = 'default' 
  }: {
    title: string;
    value: string | number;
    trend?: number;
    icon: any;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center mt-1">
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                ) : (
                  <Activity className="h-4 w-4 text-muted-foreground mr-1" />
                )}
                <span className={cn(
                  "text-sm",
                  trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {trend > 0 ? '+' : ''}{trend} this period
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            color === 'downloads' ? 'bg-green-100 text-green-600' :
            color === 'views' ? 'bg-blue-100 text-blue-600' :
            color === 'rating' ? 'bg-yellow-100 text-yellow-600' :
            'bg-muted text-muted-foreground'
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Track your agent's engagement and growth metrics
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Downloads"
          value={metrics.totalDownloads.toLocaleString()}
          trend={downloadTrend}
          icon={Download}
          color="downloads"
        />
        <StatCard
          title="Total Views"
          value={metrics.totalViews.toLocaleString()}
          trend={viewTrend}
          icon={Eye}
          color="views"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
        />
        <StatCard
          title="Rating"
          value={agent?.rating_average?.toFixed(1) || '0.0'}
          icon={Star}
          color="rating"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downloads & Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
            <CardDescription>
              Downloads and views for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="downloads" fill={COLORS[0]} name="Downloads" />
                <Bar dataKey="views" fill={COLORS[1]} name="Views" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Breakdown</CardTitle>
            <CardDescription>
              Ratio of downloads to views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              {engagementData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
          <CardDescription>
            Daily activity trends for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                labelFormatter={(value) => formatDate(value as string)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="downloads" 
                stroke={COLORS[0]} 
                strokeWidth={2}
                name="Downloads"
                dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke={COLORS[1]} 
                strokeWidth={2}
                name="Views"
                dot={{ fill: COLORS[1], strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>
            AI-powered recommendations to improve your agent's performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionRate === '0.0' && metrics.totalViews > 10 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Low Conversion Rate</p>
                  <p className="text-sm text-yellow-700">
                    Your agent has views but no downloads. Consider improving your description or adding a demo.
                  </p>
                </div>
              </div>
            )}
            
            {downloadTrend > 0 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Growing Popularity</p>
                  <p className="text-sm text-green-700">
                    Your agent downloads are trending upward! Consider promoting it more or adding new features.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.totalViews > 0 && parseFloat(conversionRate) > 5 && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">High Conversion Rate</p>
                  <p className="text-sm text-blue-700">
                    Excellent! Your agent has a {conversionRate}% conversion rate. Consider creating similar agents.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.totalViews === 0 && (
              <div className="flex items-start space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <Eye className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Needs Visibility</p>
                  <p className="text-sm text-gray-700">
                    Your agent hasn't been viewed yet. Try adding more tags, improving your description, or sharing it on social media.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}