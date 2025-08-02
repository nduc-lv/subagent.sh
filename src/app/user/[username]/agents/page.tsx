'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Code,
  User,
  MapPin,
  Globe,
  Github,
  Calendar,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AgentCard } from '@/components/ui/agent-card';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface PublicProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  website_url?: string;
  github_username?: string;
  location?: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  rating_average: number;
  rating_count: number;
  download_count: number;
  view_count: number;
  github_forks: number;
  is_featured: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  category?: {
    name: string;
    color: string;
  };
}

export default function UserAgentsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    fetchUserData();
  }, [username]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) {
        setError('User not found');
        return;
      }

      setProfile(profileData);

      // Fetch user's agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          slug,
          description,
          short_description,
          rating_average,
          rating_count,
          download_count,
          view_count,
          github_forks,
          is_featured,
          tags,
          created_at,
          updated_at,
          category:category_id (
            name,
            color
          )
        `)
        .eq('author_id', profileData.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
      } else {
        setAgents(agentsData || []);
      }

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
            <div className="h-6 w-20 bg-muted rounded"></div>
            <div className="h-12 w-12 rounded-full bg-muted"></div>
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
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
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Back Navigation */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* User Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-6"
      >
        <Avatar className="h-20 w-20">
          <AvatarImage 
            src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username)}&background=random`} 
            alt={profile.full_name || profile.username}
          />
          <AvatarFallback className="text-xl">
            {getInitials(profile.full_name, profile.username)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {profile.full_name || profile.username}'s Agents
          </h1>
          <p className="text-muted-foreground mb-4">@{profile.username}</p>
          
          {profile.bio && (
            <p className="text-muted-foreground mb-4">{profile.bio}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </div>
            )}
            {profile.website_url && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <a 
                  href={profile.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Website
                </a>
              </div>
            )}
            {profile.github_username && (
              <div className="flex items-center gap-1">
                <Github className="h-4 w-4" />
                <a 
                  href={`https://github.com/${profile.github_username}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  @{profile.github_username}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {formatDate(profile.created_at)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">
            All Agents ({agents.length})
          </h2>
        </div>

        {agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <AgentCard
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
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  className="border border-border/60 hover:border-border transition-colors hover:shadow-lg"
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground">
                {profile.username} hasn't created any agents yet.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}