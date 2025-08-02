import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LazyComponent, OptimizedImage, Skeleton } from '@/lib/performance/react-optimizations';
import { ArrowRight, Code, Zap, Users, Search, Star, Globe, BarChart3, Server, Plug, CheckCircle, BookOpen, Eye, Rocket, Brain, Shield, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { UnifiedSearchWidget } from '@/components/search/unified-search-widget';
import { FeaturedAgentsSection } from '@/components/home/featured-agents-section';

import { db } from '@/lib/supabase/database';

// Format number for display (e.g., 1200 -> "1.2k")
function formatNumber(num: number | undefined | null): string {
  if (!num || typeof num !== 'number') return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
}

// Icon mapping for categories
const iconMap: Record<string, any> = {
  'web-development': Globe,
  'data-science': BarChart3,
  'devops': Server,
  'api-tools': Plug,
  'testing': CheckCircle,
  'documentation': BookOpen,
  'development-tools': Eye,
  'mobile-development': Rocket,
  'ai-ml': Brain,
  'security': Shield,
  'database': Server,
  'design': Sparkles,
  'analytics': BarChart3,
  'automation': Zap,
  'blockchain': CheckCircle,
  'communication': Users,
  'content-management': BookOpen,
  'ecommerce': Globe,
  'education': BookOpen,
  'finance': BarChart3,
  'gaming': Rocket,
  'healthcare': Shield,
  'iot': Server,
  'productivity': Zap,
  'utilities': Code,
};

const colorMap: Record<string, string> = {
  'web-development': 'text-blue-500',
  'data-science': 'text-green-500',
  'devops': 'text-purple-500',
  'api-tools': 'text-orange-500',
  'testing': 'text-red-500',
  'documentation': 'text-indigo-500',
  'development-tools': 'text-pink-500',
  'mobile-development': 'text-teal-500',
  'ai-ml': 'text-cyan-500',
  'security': 'text-amber-500',
  'database': 'text-emerald-500',
  'design': 'text-violet-500',
  'analytics': 'text-lime-500',
  'automation': 'text-yellow-500',
  'blockchain': 'text-orange-600',
  'communication': 'text-blue-600',
  'content-management': 'text-purple-600',
  'ecommerce': 'text-green-600',
  'education': 'text-indigo-600',
  'finance': 'text-emerald-600',
  'gaming': 'text-pink-600',
  'healthcare': 'text-red-600',
  'iot': 'text-teal-600',
  'productivity': 'text-amber-600',
  'utilities': 'text-gray-500',
};

// Fetch platform stats
async function getPlatformStats() {
  try {
    const stats = await db.getPlatformStats();
    return stats;
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    // Fallback stats - these should rarely be used since the DB function exists
    return {
      total_agents: 25, // Updated to reflect current actual count
      avg_rating: 4.5,
      total_downloads: 1000
    };
  }
}

// Fetch category stats for homepage
async function getCategoryStats() {
  try {
    const categories = await db.getCategoryStats();
    return categories.slice(0, 10); // Limit to top 10
  } catch (error) {
    console.error('Error fetching category stats:', error);
    // Fallback categories
    return [];
  }
}

// Fetch featured agents directly from database - limit to exactly 3
async function getFeaturedAgents() {
  try {
    const data = await db.getFeaturedAgents(3);
    
    if (!data || data.length === 0) {
      // Return fallback data if no featured agents found
      return [
        {
          id: 'fallback-1',
          title: 'API Documentation Generator',
          description: 'Automatically generate comprehensive API documentation from your code',
          author: 'Community',
          authorUsername: null,
          category: 'Documentation',
          tags: ['api', 'documentation', 'automation'],
          rating: 4.8,
          downloads: 1250,
          views: 2500,
          forks: 15,
          lastUpdated: new Date().toLocaleDateString(),
          featured: true,
          verified: false,
          authorAvatar: null,
          authorGitHubUrl: null,
          isGitHubAuthor: false,
        },
        {
          id: 'fallback-2',
          title: 'Test Case Generator',
          description: 'Generate comprehensive test cases for your functions and classes',
          author: 'Community',
          authorUsername: null,
          category: 'Testing',
          tags: ['testing', 'automation', 'quality'],
          rating: 4.6,
          downloads: 892,
          views: 1800,
          forks: 8,
          lastUpdated: new Date().toLocaleDateString(),
          featured: true,
          verified: false,
          authorAvatar: null,
          authorGitHubUrl: null,
          isGitHubAuthor: false,
        },
        {
          id: 'fallback-3',
          title: 'Code Review Assistant',
          description: 'Intelligent code review suggestions and best practice recommendations',
          author: 'Community',
          authorUsername: null,
          category: 'Code Review',
          tags: ['review', 'quality', 'best-practices'],
          rating: 4.9,
          downloads: 2105,
          views: 4200,
          forks: 25,
          lastUpdated: new Date().toLocaleDateString(),
          featured: true,
          verified: false,
          authorAvatar: null,
          authorGitHubUrl: null,
          isGitHubAuthor: false,
        },
      ];
    }

    // Check if data is already transformed (from optimized function)
    if (data[0]?.title && data[0]?.featured !== undefined) {
      return data;
    }

    // Transform the raw data to match the expected format for AgentCard
    return data.map(agent => ({
      id: agent.id,
      title: agent.name,
      description: agent.description || '',
      author: agent.original_author_github_username || (agent.profiles?.full_name && agent.profiles.full_name.trim()) || agent.profiles?.username || 'Anonymous',
      authorUsername: agent.profiles?.username,
      category: agent.categories?.name || 'General',
      tags: (agent.tags || []).slice(0, 3),
      rating: parseFloat(agent.rating_average || '0'),
      downloads: agent.download_count || 0,
      views: agent.view_count || 0,
      forks: agent.github_forks || 0,
      lastUpdated: new Date(agent.updated_at).toLocaleDateString(),
      featured: agent.is_featured || false,
      verified: agent.is_verified || false,
      authorAvatar: agent.github_owner_avatar_url,
      authorGitHubUrl: agent.original_author_github_url,
      isGitHubAuthor: !!agent.original_author_github_username,
    }));
  } catch (error) {
    console.error('Error fetching featured agents:', error);
    // Return fallback data if database fails
    return [
      {
        id: 'fallback-1',
        title: 'API Documentation Generator',
        description: 'Automatically generate comprehensive API documentation from your code',
        author: 'Community',
        authorUsername: null,
        category: 'Documentation',
        tags: ['api', 'documentation', 'automation'],
        rating: 4.8,
        downloads: 1250,
        views: 2500,
        forks: 15,
        lastUpdated: new Date().toLocaleDateString(),
        featured: true,
        verified: false,
        authorAvatar: null,
        authorGitHubUrl: null,
        isGitHubAuthor: false,
      },
      {
        id: 'fallback-2',
        title: 'Test Case Generator',
        description: 'Generate comprehensive test cases for your functions and classes',
        author: 'Community',
        authorUsername: null,
        category: 'Testing',
        tags: ['testing', 'automation', 'quality'],
        rating: 4.6,
        downloads: 892,
        views: 1800,
        forks: 8,
        lastUpdated: new Date().toLocaleDateString(),
        featured: true,
        verified: false,
        authorAvatar: null,
        authorGitHubUrl: null,
        isGitHubAuthor: false,
      },
      {
        id: 'fallback-3',
        title: 'Code Review Assistant',
        description: 'Intelligent code review suggestions and best practice recommendations',
        author: 'Community',
        authorUsername: null,
        category: 'Code Review',
        tags: ['review', 'quality', 'best-practices'],
        rating: 4.9,
        downloads: 2105,
        views: 4200,
        forks: 25,
        lastUpdated: new Date().toLocaleDateString(),
        featured: true,
        verified: false,
        authorAvatar: null,
        authorGitHubUrl: null,
        isGitHubAuthor: false,
      },
    ];
  }
}

export default async function Home() {
  // Fetch data from the database
  const [featuredAgents, platformStats, categoryStats] = await Promise.all([
    getFeaturedAgents(),
    getPlatformStats(),
    getCategoryStats()
  ]);

  // Use real category data or fallback
  const displayCategories = categoryStats.length > 0 ? categoryStats : [
    { name: 'Development Tools', slug: 'development-tools', agent_count: 13 },
    { name: 'DevOps', slug: 'devops', agent_count: 4 },
    { name: 'Testing', slug: 'testing', agent_count: 4 },
    { name: 'Security', slug: 'security', agent_count: 1 },
    { name: 'Documentation', slug: 'documentation', agent_count: 1 },
    { name: 'Database', slug: 'database', agent_count: 1 },
    { name: 'Design', slug: 'design', agent_count: 1 },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section with Search Widget */}
      <section className="pt-8 sm:pt-16 pb-12 sm:pb-24">
        <UnifiedSearchWidget 
          variant="hero" 
          showTrending={true} 
          showCategories={true}
          className="mb-8 sm:mb-12"
          platformStats={platformStats}
          showSuggestions={false}
        />
        
        <div className="text-center mt-6 sm:mt-8">
          <div className="flex flex-col justify-center gap-3 sm:gap-4 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/agents">
                Explore All Agents <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/submit">Submit Your Agent</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-16 pb-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/20 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground/90">
            Why Choose Subagents.sh?
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="border-border/60 bg-gradient-to-br from-card via-card/98 to-card/95 hover:shadow-lg hover:shadow-primary/8 transition-all duration-300 hover:border-border/80">
              <CardHeader>
                <Code className="text-primary mb-4 h-10 w-10" />
                <CardTitle className="text-foreground/90">Developer-First</CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  Built by developers, for developers. Every sub-agent is
                  designed to solve real development challenges.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/60 bg-gradient-to-br from-card via-card/98 to-card/95 hover:shadow-lg hover:shadow-primary/8 transition-all duration-300 hover:border-border/80">
              <CardHeader>
                <Zap className="text-primary mb-4 h-10 w-10" />
                <CardTitle className="text-foreground/90">Instant Integration</CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  Copy, paste, and start using sub-agents immediately. No
                  complex setup or configuration required.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/60 bg-gradient-to-br from-card via-card/98 to-card/95 hover:shadow-lg hover:shadow-primary/8 transition-all duration-300 hover:border-border/80">
              <CardHeader>
                <Users className="text-primary mb-4 h-10 w-10" />
                <CardTitle className="text-foreground/90">Community-Driven</CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  Join a growing community of developers sharing their best
                  automation tools and workflows.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-12 sm:py-16 md:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/50 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text">
              Popular Categories
            </h2>
            <p className="text-muted-foreground/90 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Explore our most popular agent categories, each packed with powerful tools to enhance your development workflow
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {displayCategories.map((category) => {
              const IconComponent = iconMap[category.slug] || Code;
              const iconColor = colorMap[category.slug] || 'text-gray-500';
              
              return (
                <Link
                  key={category.name}
                  href={`/categories/${category.slug}`}
                  className="block group"
                >
                  <div className="relative p-3 sm:p-4 md:p-5 rounded-xl border border-border/60 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-sm hover:bg-card hover:border-border/80 hover:shadow-lg hover:shadow-primary/8 transition-all duration-300 hover:scale-[1.03] h-full flex flex-col group-hover:translate-y-[-2px]">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative flex items-center justify-between mb-3">
                      <div className="relative">
                        <IconComponent className={`h-5 w-5 ${iconColor} transition-all duration-300 group-hover:scale-110`} />
                        <div className={`absolute inset-0 h-5 w-5 ${iconColor} opacity-10 scale-150 group-hover:scale-[2] transition-transform duration-500 pointer-events-none`} />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    
                    <div className="relative flex-1">
                      <h3 className="text-sm font-semibold mb-2 leading-tight group-hover:text-primary transition-colors duration-300">{category.name}</h3>
                      <p className="text-muted-foreground text-xs font-medium">
                        {category.agent_count} agents
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Sub-Agents Preview */}
      <FeaturedAgentsSection featuredAgents={featuredAgents} />

      {/* Stats Section */}
      <section className="pt-12 sm:pt-16 pb-6 sm:pb-8 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatNumber(platformStats.total_agents)}+
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Agents Available
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-primary">
                {platformStats.avg_rating}/5
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Average Rating
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-primary">
                {formatNumber(platformStats.total_downloads)}+
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                Total Downloads
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-8 pb-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-bold">
            Ready to Supercharge Your Development?
          </h2>
          <p className="text-muted-foreground mb-8 text-xl">
            Join thousands of developers using sub-agents to automate their
            workflow
          </p>
          <Button size="lg" asChild>
            <Link href="/agents">
              <Search className="mr-2 h-4 w-4" />
              Start Exploring
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}