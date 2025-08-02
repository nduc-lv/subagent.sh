'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  User, 
  MapPin, 
  Globe, 
  Calendar, 
  Github, 
  Twitter, 
  Star, 
  Users, 
  BookOpen, 
  Activity,
  Heart,
  Eye,
  Download,
  MessageSquare,
  Award,
  Code,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { AgentCard } from '@/components/ui/agent-card';
import { cn } from '@/lib/utils';

interface PublicProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website_url?: string;
  github_username?: string;
  twitter_username?: string;
  location?: string;
  created_at: string;
}

interface UserStats {
  total_agents: number;
  total_reviews: number;
  total_downloads: number;
  total_views: number;
  total_bookmarks: number;
  average_rating: number;
  followers_count: number;
  following_count: number;
}

interface UserAgent {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  rating_average: number;
  rating_count: number;
  download_count: number;
  view_count: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  github_forks: number;
  is_featured: boolean;
  category?: {
    name: string;
    color: string;
  };
}

interface UserReview {
  id: string;
  title?: string;
  content: string;
  rating: number;
  created_at: string;
  agent: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (username) {
      fetchUserData();
    }
  }, [username]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, website_url, github_username, twitter_username, location, created_at')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        setError('User not found');
        return;
      }

      const userProfile = profileData as PublicProfile;
      setProfile(userProfile);

      // Fetch user's agents
      const { data: agentsData } = await supabase
        .from('agents')
        .select(`
          id, name, slug, description, short_description, 
          rating_average, rating_count, download_count, view_count, 
          bookmark_count, created_at, updated_at, tags, 
          github_forks, is_featured,
          categories(name, color)
        `)
        .eq('author_id', userProfile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (agentsData) {
        const agentsList = agentsData.map((agent: any) => ({
          ...agent,
          category: agent.categories ? {
            name: agent.categories.name,
            color: agent.categories.color
          } : null
        }));
        setAgents(agentsList);
      }

      // Fetch user's reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id, title, content, overall_rating, created_at,
          agents(id, name, slug)
        `)
        .eq('user_id', userProfile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (reviewsData) {
        const reviewsList = reviewsData.map((review: any) => ({
          id: review.id,
          title: review.title,
          content: review.content,
          rating: review.overall_rating,
          created_at: review.created_at,
          agent: {
            id: review.agents.id,
            name: review.agents.name,
            slug: review.agents.slug
          }
        }));
        setReviews(reviewsList);
      }

      // Calculate user statistics with optimized parallel queries
      const [
        agentStatsResult,
        { count: totalReviews },
        { count: followersCount },
        { count: followingCount }
      ] = await Promise.all([
        // Combined query to get both count and stats in one call
        supabase
          .from('agents')
          .select('download_count, view_count, bookmark_count, rating_average, rating_count')
          .eq('author_id', userProfile.id)
          .eq('status', 'published'),
        // Optimized count-only queries
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', userProfile.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userProfile.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userProfile.id)
      ]);

      // Process agent stats - calculate totals in a single pass
      const agentStats = agentStatsResult.data || [];
      let totalDownloads = 0;
      let totalViews = 0;
      let totalBookmarks = 0;
      let totalRatingSum = 0;
      let ratedAgentsCount = 0;

      agentStats.forEach(agent => {
        totalDownloads += agent.download_count || 0;
        totalViews += agent.view_count || 0;
        totalBookmarks += agent.bookmark_count || 0;
        
        if (agent.rating_count > 0) {
          totalRatingSum += agent.rating_average;
          ratedAgentsCount++;
        }
      });

      const userStats: UserStats = {
        total_agents: agentStats.length,
        total_reviews: totalReviews || 0,
        total_downloads: totalDownloads,
        total_views: totalViews,
        total_bookmarks: totalBookmarks,
        average_rating: ratedAgentsCount > 0 ? totalRatingSum / ratedAgentsCount : 0,
        followers_count: followersCount || 0,
        following_count: followingCount || 0
      };

      setStats(userStats);

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name?: string, username?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="animate-pulse space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted"></div>
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">User Not Found</h3>
            <p className="text-muted-foreground">
              {error || 'The user profile you\'re looking for doesn\'t exist.'}
            </p>
            <Button asChild className="mt-4">
              <Link href="/agents">Browse Agents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* User Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
              {/* Left: Main Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                    <AvatarImage 
                      src={profile.avatar_url || undefined} 
                      alt={profile.full_name || profile.username || 'User'} 
                    />
                    <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                      {getInitials(profile.full_name, profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                      {profile.full_name || profile.username}
                    </h1>
                    {profile.full_name && (
                      <p className="text-muted-foreground text-lg">@{profile.username}</p>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                    {profile.bio}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {profile.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(profile.created_at)}</span>
                  </div>
                  {stats && stats.followers_count > 0 && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{stats.followers_count} followers</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap items-center gap-2">
                  {profile.website_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </a>
                    </Button>
                  )}
                  
                  {profile.github_username && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </a>
                    </Button>
                  )}
                  
                  {profile.twitter_username && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://twitter.com/${profile.twitter_username}`} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Right: Stats */}
              {stats && (
                <div className="lg:w-96 space-y-4">
                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                      <Code className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold">{stats.total_agents}</span>
                      <span className="text-xs text-muted-foreground">agents</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                      <Download className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold">{stats.total_downloads.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">downloads</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                      <Eye className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold">{stats.total_views.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">views</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-semibold">{stats.average_rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">rating</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border-b border-border/60 mb-12"
          >
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'agents', label: `Agents (${stats?.total_agents || agents.length})`, icon: Code },
                { id: 'reviews', label: `Reviews (${stats?.total_reviews || reviews.length})`, icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </motion.div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Recent Agents */}
                {agents.length > 0 && (
                  <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-primary" />
                          Recent Agents
                        </CardTitle>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/user/${username}/agents`}>View All</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {agents.slice(0, 4).map((agent) => (
                          <AgentCard
                            key={agent.id}
                            id={agent.id}
                            title={agent.name}
                            description={agent.short_description || agent.description || ''}
                            author={profile.full_name || profile.username || 'Anonymous'}
                            authorUsername={profile.username}
                            category={agent.category?.name || 'Uncategorized'}
                            tags={agent.tags || []}
                            rating={agent.rating_average || 0}
                            downloads={agent.download_count || 0}
                            views={agent.view_count || 0}
                            forks={agent.github_forks || 0}
                            lastUpdated={formatDate(agent.updated_at)}
                            featured={agent.is_featured || false}
                            authorAvatar={profile.avatar_url}
                            onClick={() => window.location.href = `/agents/${agent.id}`}
                            className="border border-border/60 hover:border-border transition-colors hover:shadow-lg"
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Reviews */}
                {reviews.length > 0 && (
                  <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          Recent Reviews
                        </CardTitle>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/user/${username}/reviews`}>View All</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {reviews.slice(0, 3).map((review) => (
                          <Card key={review.id} className="hover:shadow-md transition-shadow border-border/40">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < review.rating 
                                            ? 'text-yellow-400' 
                                            : 'text-muted-foreground/30'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium">for</span>
                                  <Link 
                                    href={`/agents/${review.agent.id}`}
                                    className="text-sm font-semibold hover:text-primary transition-colors"
                                  >
                                    {review.agent.name}
                                  </Link>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                              {review.title && (
                                <h4 className="font-medium mb-2">{review.title}</h4>
                              )}
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {review.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {agents.length === 0 && reviews.length === 0 && (
                  <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                    <CardContent className="text-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                      <p className="text-muted-foreground">
                        {profile.username} hasn't created any agents or written any reviews yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Agents Tab */}
            {activeTab === 'agents' && (
              <div>
                {agents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        id={agent.id}
                        title={agent.name}
                        description={agent.short_description || agent.description || ''}
                        author={profile.full_name || profile.username || 'Anonymous'}
                        authorUsername={profile.username}
                        category={agent.category?.name || 'Uncategorized'}
                        tags={agent.tags || []}
                        rating={agent.rating_average || 0}
                        downloads={agent.download_count || 0}
                        views={agent.view_count || 0}
                        forks={agent.github_forks || 0}
                        lastUpdated={formatDate(agent.updated_at)}
                        featured={agent.is_featured || false}
                        authorAvatar={profile.avatar_url}
                        onClick={() => window.location.href = `/agents/${agent.id}`}
                        className="border border-border/60 hover:border-border transition-colors hover:shadow-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                    <CardContent className="text-center py-12">
                      <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                      <p className="text-muted-foreground">
                        {profile.username} hasn't created any agents yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id} className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating 
                                        ? 'text-yellow-400' 
                                        : 'text-muted-foreground/30'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-muted-foreground">for</span>
                              <Link 
                                href={`/agents/${review.agent.id}`}
                                className="font-semibold hover:text-primary transition-colors"
                              >
                                {review.agent.name}
                              </Link>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-semibold text-lg mb-3">{review.title}</h4>
                          )}
                          <p className="text-muted-foreground">
                            {review.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                    <CardContent className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                      <p className="text-muted-foreground">
                        {profile.username} hasn't written any reviews yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}