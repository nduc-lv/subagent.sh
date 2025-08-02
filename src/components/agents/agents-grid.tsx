'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  RefreshCw, 
  Zap, 
  Download, 
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AgentCard } from '@/components/ui/agent-card';
import { AgentCardSkeleton } from '@/components/ui/skeleton';
import { LazyComponent, Skeleton } from '@/lib/performance/react-optimizations';
import { cn } from '@/lib/utils';

interface AgentsGridProps {
  agents: any[];
  loading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list' | 'compact';
  user?: any;
  selectedAgents: string[];
  toggleAgentSelection: (agentId: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  hasMore: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  formatDate: (dateString: string | null | undefined) => string;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  agents,
  loading,
  error,
  viewMode,
  user,
  selectedAgents,
  toggleAgentSelection,
  hasActiveFilters,
  clearFilters,
  hasMore,
  currentPage,
  setCurrentPage,
  formatDate
}) => {
  const router = useRouter();

  // Loading state
  if (loading && agents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "grid gap-8",
          viewMode === 'grid' 
            ? "grid-cols-1 lg:grid-cols-2" 
            : viewMode === 'list'
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-2"
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <AgentCardSkeleton />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center py-24"
      >
        <Card className="max-w-md mx-auto backdrop-blur-md bg-destructive/5 border-destructive/20">
          <CardContent className="p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-destructive">Search Error</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // No results
  if (!loading && !error && agents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center py-24"
      >
        <Card className="max-w-lg mx-auto backdrop-blur-md bg-muted/5 border-border/30">
          <CardContent className="p-12">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-20 h-20 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Search className="w-10 h-10 text-primary" />
            </motion.div>
            
            <h3 className="text-2xl font-bold mb-4">No agents found</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              {hasActiveFilters 
                ? "Try adjusting your search criteria or clear filters to see more results."
                : "It looks like there are no agents available at the moment."
              }
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {hasActiveFilters && (
                <Button 
                  onClick={clearFilters} 
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear all filters
                </Button>
              )}
              {user && (
                <Button 
                  onClick={() => router.push('/submit')}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create the first agent
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Results grid
  return (
    <>
      <div
        className={cn(
          "grid gap-4 sm:gap-6 lg:gap-8",
          viewMode === 'grid' 
            ? "grid-cols-1 lg:grid-cols-2" 
            : viewMode === 'list'
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-2"
        )}
      >
        {agents.map((agent, index) => (
          <LazyComponent
            key={agent.id}
            placeholder={
              <div className="relative group">
                <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm h-80">
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <Skeleton variant="rectangular" width="80px" height="24px" />
                      <Skeleton variant="circular" width="24px" height="24px" />
                    </div>
                    <Skeleton variant="text" width="70%" height="20px" />
                    <Skeleton variant="text" width="100%" height="16px" />
                    <Skeleton variant="text" width="90%" height="16px" />
                    <div className="flex gap-2">
                      <Skeleton variant="rectangular" width="60px" height="20px" />
                      <Skeleton variant="rectangular" width="50px" height="20px" />
                      <Skeleton variant="rectangular" width="70px" height="20px" />
                    </div>
                    <div className="flex justify-between items-center mt-auto">
                      <div className="flex items-center gap-2">
                        <Skeleton variant="circular" width="24px" height="24px" />
                        <Skeleton variant="text" width="60px" height="14px" />
                      </div>
                      <Skeleton variant="rectangular" width="80px" height="32px" />
                    </div>
                  </div>
                </div>
              </div>
            }
            rootMargin="100px"
            threshold={0.1}
          >
            <div className="relative group">
              {user && (
                <div className={cn(
                  "absolute top-2 right-2 z-20 transition-all duration-300",
                  selectedAgents.includes(agent.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <Checkbox
                    checked={selectedAgents.includes(agent.id)}
                    onCheckedChange={() => toggleAgentSelection(agent.id)}
                    className="h-4 w-4 bg-background/90 border-border hover:border-primary transition-colors shadow-lg backdrop-blur-sm rounded-sm"
                  />
                </div>
              )}
              
              <AgentCard
                id={agent.id}
                title={agent.name}
                description={agent.description || ''}
                author={(agent as any).original_author_github_username || (agent as any).profiles?.username || 'Unknown'}
                authorUsername={(agent as any).original_author_github_username || (agent as any).profiles?.username}
                category={(agent as any).categories?.name || 'Uncategorized'}
                tags={agent.tags || []}
                rating={agent.rating_average}
                downloads={agent.download_count}
                views={agent.view_count}
                forks={agent.github_forks}
                lastUpdated={formatDate(agent.updated_at)}
                featured={agent.is_featured}
                isGitHubAuthor={!!(agent as any).original_author_github_username}
                authorAvatar={(agent as any).github_owner_avatar_url}
                authorGitHubUrl={(agent as any).original_author_github_url}
                onClick={() => router.push(`/agents/${agent.id}`)}
                className={cn(
                  "relative border border-border/60 hover:border-border transition-colors hover:shadow-lg",
                  viewMode === 'list' && 'h-auto',
                  viewMode === 'compact' && 'h-auto'
                )}
              />
            </div>
          </LazyComponent>
        ))}
      </div>

      {/* Load More */}
      {agents.length > 0 && hasMore && (
        <div className="flex justify-center mt-12">
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={loading}
            variant="outline"
            className="min-w-[160px]"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                </motion.div>
                Loading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Load More
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
};