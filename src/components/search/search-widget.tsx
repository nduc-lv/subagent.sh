'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  TrendingUp, 
  Star, 
  ArrowRight,
  Sparkles,
  Zap,
  Code,
  BarChart3,
  Globe,
  Smartphone,
  Server,
  Shield,
  Palette,
  BookOpen,
  CheckCircle,
  Database,
  Cpu,
  FileText,
  Users,
  Calendar,
  Mail,
  MessageSquare,
  Heart,
  Settings,
  ChevronRight
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EnhancedSearchBar } from './enhanced-search-bar';
import { useTrendingSearches } from '@/hooks/use-enhanced-search';
import { useCategories } from '@/hooks/use-database';
import { cn } from '@/lib/utils';

// Icon mapping for category icons
const iconMap: Record<string, React.ComponentType<any>> = {
  Code,
  BarChart3,
  Globe,
  Smartphone,
  Server,
  Shield,
  Palette,
  BookOpen,
  CheckCircle,
  Database,
  Cpu,
  FileText,
  Users,
  Calendar,
  Mail,
  MessageSquare,
  Heart,
  Settings,
  Zap,
  Star,
  Search,
  TrendingUp
};

const getIcon = (iconName: string) => {
  const IconComponent = iconMap[iconName];
  return IconComponent || Code; // fallback to Code icon
};

// Format number for display (e.g., 1200 -> "1.2k")
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
}

interface SearchWidgetProps {
  variant?: 'default' | 'hero' | 'compact' | 'minimal';
  showTrending?: boolean;
  showCategories?: boolean;
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  platformStats?: {
    total_agents: number;
    avg_rating: number;
    total_downloads: number;
  };
}

export function SearchWidget({
  variant = 'default',
  showTrending = true,
  showCategories = true,
  placeholder = "Search agents...",
  className,
  onSearch,
  platformStats
}: SearchWidgetProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { trendingSearches } = useTrendingSearches(7, 5);
  const { categories } = useCategories();

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      if (onSearch) {
        onSearch(finalQuery);
      } else {
        router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
      }
    }
  };

  const handleTrendingClick = (trendingQuery: string) => {
    setQuery(trendingQuery);
    handleSearch(trendingQuery);
  };

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/search?category=${categoryId}`);
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("w-full max-w-md", className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-12"
          />
          <Button
            size="sm"
            onClick={() => handleSearch()}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("w-full max-w-lg", className)}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            
            {showTrending && trendingSearches.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Trending
                </div>
                <div className="flex flex-wrap gap-1">
                  {trendingSearches.slice(0, 3).map((trend) => (
                    <Badge
                      key={trend.query}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-terminal-green hover:text-terminal-green-foreground"
                      onClick={() => handleTrendingClick(trend.query)}
                    >
                      {trend.query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn("w-full max-w-4xl mx-auto text-center space-y-8", className)}>
        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-terminal-green via-blue-500 to-purple-500 bg-clip-text text-transparent leading-relaxed min-h-[1.2em]">
            Find Your Perfect Agent
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover powerful sub-agents to enhance your workflow. Search by functionality, 
            technology, or browse our curated categories.
          </p>
        </motion.div>

        {/* Enhanced Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-2xl mx-auto"
        >
          <EnhancedSearchBar
            value={query}
            onChange={setQuery}
            onSearch={() => handleSearch()}
            suggestions={[]}
            recentSearches={[]}
            placeholder="Search for agents, tools, or functionality..."
            className="h-14 text-lg"
          />
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center items-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{formatNumber(platformStats?.total_agents || 0)}+ Agents</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span>{platformStats?.avg_rating || 0}/5 Average</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>{formatNumber(platformStats?.total_downloads || 0)}+ Downloads</span>
          </div>
        </motion.div>

        {/* Trending & Categories */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Trending Searches */}
          {showTrending && trendingSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-terminal-green" />
                Trending Searches
              </h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {trendingSearches.map((trend, index) => (
                  <motion.div
                    key={trend.query}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                  >
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-terminal-green hover:text-terminal-green-foreground transition-colors"
                      onClick={() => handleTrendingClick(trend.query)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {trend.query}
                      <span className="ml-1 text-xs opacity-75">
                        {trend.search_count}
                      </span>
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("w-full max-w-2xl space-y-6", className)}>
      {/* Search Bar */}
      <EnhancedSearchBar
        value={query}
        onChange={setQuery}
        onSearch={() => handleSearch()}
        suggestions={[]}
        recentSearches={[]}
        placeholder={placeholder}
      />

      {/* Trending & Categories */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Trending Searches */}
        {showTrending && trendingSearches.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending Searches
            </h4>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((trend) => (
                <Badge
                  key={trend.query}
                  variant="outline"
                  className="cursor-pointer hover:bg-terminal-green hover:text-terminal-green-foreground"
                  onClick={() => handleTrendingClick(trend.query)}
                >
                  {trend.query}
                </Badge>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}