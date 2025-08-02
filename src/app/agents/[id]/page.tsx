'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Download, 
  Eye, 
  GitFork, 
  Calendar, 
  User, 
  Tag as TagIcon, 
  ExternalLink,
  Github,
  BookmarkPlus,
  Bookmark,
  Copy,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  Clock,
  ArrowLeft,
  Code2,
  Package,
  Zap,
  Globe,
  Link as LinkIcon,
  Info,
  Shield
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading';
import { AgentCard } from '@/components/ui/agent-card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SimpleAgentReviews } from '@/components/reviews/simple-agent-reviews';

// Import hooks with error handling
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { getAgentAvatarUrl } from '@/lib/utils/github-avatar';
import { 
  useAgent,
  useRelatedAgents,
  useBookmarks,
  useAnalytics,
  useAgentMutations,
  useAgentVersionHistory
} from '@/hooks/use-database';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const agentId = params.id as string;
  
  const { agent, loading, error } = useAgent(agentId);
  const { agents: relatedAgents } = useRelatedAgents(agentId);
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { trackView, trackDownload } = useAnalytics();
  const { deleteAgent, duplicateAgent } = useAgentMutations();
  const { versions } = useAgentVersionHistory(agentId);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'versions' | 'reviews'>('overview');

  // Check if agent is bookmarked
  useEffect(() => {
    if (bookmarks && agentId) {
      setIsBookmarked(bookmarks.some((b: any) => b.agent_id === agentId));
    }
  }, [bookmarks, agentId]);

  // Track view on mount
  useEffect(() => {
    if (agentId) {
      trackView(agentId);
    }
  }, [agentId, trackView]);

  const isOwner = user && agent && agent.author_id === user.id;

  const handleBookmark = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    try {
      await toggleBookmark(agentId);
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const handleDownload = async () => {
    if (!agent?.github_repo_url) return;
    
    await trackDownload(agentId);
    window.open(agent.github_repo_url, '_blank');
  };

  const handleCopyCode = async () => {
    if (!agent?.github_repo_url) return;
    
    try {
      await navigator.clipboard.writeText(agent.github_repo_url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyContent = async () => {
    const content = agent?.raw_markdown || agent?.content;
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: agent?.name,
          text: agent?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      // Fallback to copy URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  const handleEdit = () => {
    router.push(`/agents/${agentId}/edit`);
  };

  const handleDuplicate = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    try {
      const duplicated = await duplicateAgent(agentId);
      router.push(`/agents/${duplicated.id}/edit`);
    } catch (err) {
      console.error('Failed to duplicate agent:', err);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;

    setIsDeleting(true);
    try {
      await deleteAgent(agentId);
      router.push('/agents');
    } catch (err) {
      console.error('Failed to delete agent:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center py-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Agent Not Found</h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                The agent you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Button onClick={() => router.push('/agents')} className="bg-gradient-to-r from-primary to-primary/80">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
            </motion.div>
          </div>
        </div>
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
            {/* Back Navigation */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => router.back()}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Agent Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
              {/* Left: Main Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                    {agent.name}
                  </h1>
                  {agent.featured && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>

                {agent.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                    {agent.description}
                  </p>
                )}

                {/* Author & Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage 
                        src={agent.github_owner_avatar_url}
                        alt={agent.original_author_github_username || agent.profiles?.full_name || 'User'}
                      />
                      <AvatarFallback>
                        {(agent.original_author_github_username || agent.profiles?.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {(agent.original_author_github_username || agent.profiles?.username) ? (
                      <Link 
                        href={agent.original_author_github_url || `/user/${agent.original_author_github_username || agent.profiles?.username}`}
                        className="font-medium text-foreground hover:text-primary transition-colors duration-200"
                        target={agent.original_author_github_url ? "_blank" : undefined}
                        rel={agent.original_author_github_url ? "noopener noreferrer" : undefined}
                      >
                        {agent.original_author_github_username || agent.profiles?.full_name || agent.profiles?.username || 'Anonymous'}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">
                        {agent.original_author_github_username || agent.profiles?.full_name || agent.profiles?.username || 'Anonymous'}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {formatDate(agent.updated_at)}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span>v{agent.version}</span>
                  </div>
                </div>

                {/* Tags */}
                {agent.tags && agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {agent.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="bg-muted/20">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Stats & Actions */}
              <div className="lg:w-96 space-y-4">
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">{agent.rating_average?.toFixed(1) || '0.0'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                    <Download className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold">{formatNumber(agent.download_count || 0)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold">{formatNumber(agent.view_count || 0)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
                    <GitFork className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold">{formatNumber(agent.github_forks || 0)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {agent.github_repo_url && (
                    <Button onClick={handleDownload} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleBookmark}
                      className={cn(
                        "transition-colors",
                        isBookmarked && "text-primary border-primary bg-primary/10"
                      )}
                    >
                      {isBookmarked ? (
                        <Bookmark className="w-4 h-4 mr-2 fill-current" />
                      ) : (
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                      )}
                      {isBookmarked ? 'Saved' : 'Save'}
                    </Button>

                    <Button variant="outline" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        More Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isOwner && (
                        <>
                          <DropdownMenuItem onClick={handleEdit}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Agent
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={handleDuplicate}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyCode}>
                        {copySuccess ? (
                          <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {copySuccess ? 'Copied!' : 'Copy URL'}
                      </DropdownMenuItem>
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Agent
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
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
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp, ownerOnly: true },
                { id: 'versions', label: 'Versions', icon: Clock },
                { id: 'reviews', label: 'Reviews', icon: Star },
              ].map((tab) => {
                if (tab.ownerOnly && !isOwner) return null;
                
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'overview' | 'analytics' | 'versions' | 'reviews')}
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
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Detailed Description */}
                  {agent.detailed_description && (
                    <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                            {agent.detailed_description}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Sub-Agent Content - Display the actual agent content/markdown */}
                  {(agent.raw_markdown || agent.content) && (
                    <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Code2 className="w-5 h-5" />
                              Sub-Agent Content
                            </CardTitle>
                            <CardDescription>
                              The actual sub-agent implementation and instructions
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyContent}
                            className="shrink-0"
                          >
                            {copySuccess ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Content
                              </>
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                            {agent.raw_markdown || agent.content}
                          </div>
                        </div>
                        {agent.github_url && (
                          <div className="mt-4 pt-4 border-t border-border/60">
                            <Button variant="outline" size="sm" asChild>
                              <a href={agent.github_url} target="_blank" rel="noopener noreferrer">
                                <Github className="w-4 h-4 mr-2" />
                                View Source on GitHub
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Related Agents */}
                  {relatedAgents && relatedAgents.length > 0 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-primary" />
                          Related Agents
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Other agents you might find interesting
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {relatedAgents.slice(0, 4).map((relatedAgent: any) => (
                          <AgentCard
                            key={relatedAgent.id}
                            id={relatedAgent.id}
                            title={relatedAgent.name}
                            description={relatedAgent.description || ''}
                            author={relatedAgent.original_author_github_username || relatedAgent.profiles?.full_name || relatedAgent.profiles?.username || 'Anonymous'}
                            category={relatedAgent.categories?.name || 'Uncategorized'}
                            tags={relatedAgent.tags || []}
                            rating={relatedAgent.rating_average || 0}
                            downloads={relatedAgent.download_count || 0}
                            views={relatedAgent.view_count || 0}
                            forks={relatedAgent.github_forks || 0}
                            lastUpdated={formatDate(relatedAgent.updated_at)}
                            featured={relatedAgent.featured || false}
                            authorAvatar={getAgentAvatarUrl(relatedAgent)}
                            onClick={() => router.push(`/agents/${relatedAgent.id}`)}
                            className="h-auto"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Resources */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-card/50 to-card/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <LinkIcon className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Resources</h3>
                    </div>
                    <div className="space-y-2">
                      {agent.github_repo_url && (
                        <a
                          href={agent.github_repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-border/60 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-2">
                            <Github className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            <span className="text-sm font-medium">View on GitHub</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        </a>
                      )}
                      
                      {agent.documentation_url && (
                        <a
                          href={agent.documentation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-border/60 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            <span className="text-sm font-medium">Documentation</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        </a>
                      )}
                      
                      {agent.demo_url && (
                        <a
                          href={agent.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-border/60 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            <span className="text-sm font-medium">Live Demo</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        </a>
                      )}

                      {agent.homepage_url && (
                        <a
                          href={agent.homepage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-border/60 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            <span className="text-sm font-medium">Homepage</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        </a>
                      )}
                      
                      {!agent.github_repo_url && !agent.documentation_url && !agent.demo_url && !agent.homepage_url && (
                        <p className="text-sm text-muted-foreground text-center py-4">No external resources available</p>
                      )}
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-card/50 to-card/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <Code2 className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Technical Details</h3>
                    </div>
                    <div className="space-y-3">
                      {agent.language && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Language</span>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                            <span className="text-xs font-medium text-blue-600">{agent.language}</span>
                          </div>
                        </div>
                      )}
                      
                      {agent.framework && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Framework</span>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
                            <span className="text-xs font-medium text-purple-600">{agent.framework}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">License</span>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                          <Shield className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">{agent.license || 'Not specified'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Version</span>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <Package className="w-3 h-3 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">{agent.version}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Author Info */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-card/50 to-card/30 border border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Author</h3>
                    </div>
                    {(agent.original_author_github_username || agent.profiles?.username) ? (
                      <Link 
                        href={agent.original_author_github_url || `/user/${agent.original_author_github_username || agent.profiles?.username}`}
                        className="flex items-center gap-3 hover:bg-muted/20 rounded-lg p-2 -m-2 transition-all duration-200 group"
                        target={agent.original_author_github_url ? "_blank" : undefined}
                        rel={agent.original_author_github_url ? "noopener noreferrer" : undefined}
                      >
                        <Avatar className="w-10 h-10 border-2 border-border/40 group-hover:border-primary/40">
                          <AvatarImage 
                            src={agent.github_owner_avatar_url}
                            alt={agent.original_author_github_username || agent.profiles?.full_name || 'User'}
                          />
                          <AvatarFallback>
                            {(agent.original_author_github_username || agent.profiles?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors duration-200">
                            {agent.original_author_github_username || agent.profiles?.full_name || agent.profiles?.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{agent.original_author_github_username || agent.profiles?.username || 'anonymous'}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-border/40">
                          <AvatarImage 
                            src={agent.github_owner_avatar_url}
                            alt={agent.original_author_github_username || agent.profiles?.full_name || 'User'}
                          />
                          <AvatarFallback>
                            {(agent.original_author_github_username || agent.profiles?.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm">
                            {agent.original_author_github_username || agent.profiles?.full_name || agent.profiles?.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{agent.original_author_github_username || agent.profiles?.username || 'anonymous'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && isOwner && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-xl font-semibold mb-3">Analytics Dashboard</h3>
                    <p className="text-muted-foreground">
                      Detailed analytics and performance metrics coming soon.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'versions' && (
              <motion.div
                key="versions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-card via-card/98 to-card/95 border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Version History
                    </CardTitle>
                    <CardDescription>
                      Track changes and updates to this agent over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {versions && versions.length > 0 ? (
                      <div className="space-y-4">
                        {versions.map((version: any, index: number) => (
                          <div key={version.id || index} className="flex items-start space-x-4 p-4 border border-border/60 rounded-lg bg-muted/10">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">Version {agent.version}</h4>
                                <Badge variant="default">
                                  Active
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Current version
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(agent.updated_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                        <h3 className="text-xl font-semibold mb-3">No Version History</h3>
                        <p className="text-muted-foreground">
                          Version history will appear here when changes are made to the agent.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SimpleAgentReviews agent={agent} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Agent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}