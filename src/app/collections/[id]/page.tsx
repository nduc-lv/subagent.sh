'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Edit3,
  Trash2,
  Plus,
  Share2,
  Copy,
  Eye,
  EyeOff,
  CheckSquare,
  X,
  MoreHorizontal,
  FolderOpen,
  Users,
  Calendar,
  ArrowUpDown,
  Grid3x3,
  List
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentCard } from '@/components/ui/agent-card';
import { LoadingSpinner } from '@/components/ui/loading';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Collection, Agent } from '@/types';

function CollectionPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const collectionId = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchCollection();
  }, [collectionId]);

  useEffect(() => {
    if (user && collection) {
      setIsOwner(collection.user_id === user.id);
    }
  }, [user, collection]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch collection details via API
      const response = await fetch(`/api/collections/${collectionId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Collection not found');
        }
        throw new Error('Failed to fetch collection');
      }

      const collectionData = await response.json();
      setCollection(collectionData);
      setEditName(collectionData.name);
      setEditDescription(collectionData.description || '');

      // Fetch collection agents with agent details using supabase client
      const { data: collectionAgents, error: agentsError } = await supabase
        .from('collection_agents')
        .select(`
          agent_id,
          order_index,
          agents (
            id,
            name,
            description,
            short_description,
            rating_average,
            rating_count,
            download_count,
            view_count,
            bookmark_count,
            created_at,
            updated_at,
            tags,
            github_forks,
            is_featured,
            author_id,
            categories (
              name,
              color
            ),
            profiles!agents_author_id_fkey (
              username,
              avatar_url
            )
          )
        `)
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true });

      if (agentsError) {
        console.warn('Error fetching collection agents:', agentsError);
        // Don't throw error for agents, just set empty array
        setAgents([]);
      } else {
        const agentsList = collectionAgents
          .map(ca => ca.agents)
          .filter(Boolean)
          .map(agent => ({
            ...agent,
            category: agent.categories,
            profiles: agent.profiles
          }));
        
        setAgents(agentsList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const selectAllAgents = () => {
    setSelectedAgents(agents.map(agent => agent.id));
  };

  const clearSelection = () => {
    setSelectedAgents([]);
  };

  const handleEditCollection = async () => {
    if (!collection || !isOwner) return;

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection');
      }

      const updatedCollection = await response.json();
      setCollection(updatedCollection);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update collection:', err);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collection || !isOwner) return;

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete collection');
      }
      
      router.push('/collections');
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleRemoveSelectedAgents = async () => {
    if (!collection || !isOwner || selectedAgents.length === 0) return;

    try {
      const { error } = await supabase
        .from('collection_agents')
        .delete()
        .eq('collection_id', collection.id)
        .in('agent_id', selectedAgents);

      if (error) throw error;

      // Update local state
      setAgents(prev => prev.filter(agent => !selectedAgents.includes(agent.id)));
      setSelectedAgents([]);
      setShowRemoveDialog(false);
    } catch (err) {
      console.error('Failed to remove agents:', err);
    }
  };

  const handleToggleVisibility = async () => {
    if (!collection || !isOwner) return;

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: collection.name,
          description: collection.description,
          is_public: !collection.is_public,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection');
      }

      const updatedCollection = await response.json();
      setCollection(updatedCollection);
    } catch (err) {
      console.error('Failed to update visibility:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const isAllSelected = selectedAgents.length === agents.length && agents.length > 0;
  const isSomeSelected = selectedAgents.length > 0 && selectedAgents.length < agents.length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Collection Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The collection you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/collections')}>
            Browse Collections
          </Button>
        </div>
      </div>
    );
  }

  if (!collection.is_public && !isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <EyeOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Private Collection</h1>
          <p className="text-muted-foreground mb-4">
            This collection is private and can only be viewed by its owner.
          </p>
          <Button onClick={() => router.push('/collections')}>
            Browse Public Collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-bold"
                    placeholder="Collection name"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-2 border rounded-md resize-none"
                    rows={3}
                    placeholder="Collection description"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleEditCollection} size="sm">
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)} 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{collection.name}</h1>
                    {!collection.is_public && (
                      <Badge variant="secondary">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                  {collection.description && (
                    <p className="text-lg text-muted-foreground mb-3">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FolderOpen className="w-4 h-4" />
                      <span>{agents.length} agents</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {formatDate(collection.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{collection.is_public ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Collection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleToggleVisibility}>
                        {collection.is_public ? (
                          <EyeOff className="w-4 h-4 mr-2" />
                        ) : (
                          <Eye className="w-4 h-4 mr-2" />
                        )}
                        {collection.is_public ? 'Make Private' : 'Make Public'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Collection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {isOwner && agents.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAllAgents();
                    } else {
                      clearSelection();
                    }
                  }}
                />
                <span className="text-sm">
                  {selectedAgents.length > 0 
                    ? `${selectedAgents.length} selected`
                    : 'Select all'
                  }
                </span>
              </div>
            )}

            {selectedAgents.length > 0 && isOwner && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Remove Selected
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Button onClick={() => router.push('/agents?collection=' + collection.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Agents
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {viewMode === 'grid' ? (
                    <Grid3x3 className="w-4 h-4" />
                  ) : (
                    <List className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setViewMode('grid')}>
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Grid View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('list')}>
                  <List className="w-4 h-4 mr-2" />
                  List View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Agents Grid */}
        {agents.length > 0 ? (
          <motion.div
            layout
            className={cn(
              "grid gap-6",
              viewMode === 'grid' 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1"
            )}
          >
            <AnimatePresence>
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative"
                >
                  {isOwner && (
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={() => toggleAgentSelection(agent.id)}
                        className="bg-background/80 backdrop-blur-sm"
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
                    featured={agent.featured}
                    isGitHubAuthor={!!(agent as any).original_author_github_username}
                    authorAvatar={(agent as any).original_author_avatar_url || (agent as any).profiles?.avatar_url}
                    authorGitHubUrl={(agent as any).original_author_github_url}
                    onClick={() => router.push(`/agents/${agent.id}`)}
                    className={cn(
                      viewMode === 'list' && 'h-auto',
                      isOwner && 'pl-12' // Space for checkbox
                    )}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
            <p className="text-muted-foreground mb-4">
              {isOwner 
                ? "Start building your collection by adding some agents."
                : "This collection doesn't have any agents yet."
              }
            </p>
            {isOwner && (
              <Button onClick={() => router.push('/agents')}>
                <Plus className="w-4 h-4 mr-2" />
                Browse Agents
              </Button>
            )}
          </div>
        )}

        {/* Delete Collection Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Collection</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{collection.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteCollection}>
                Delete Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Agents Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Agents</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedAgents.length} agent(s) from this collection?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveSelectedAgents}>
                Remove Agents
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <AuthGuard>
      <CollectionPageContent />
    </AuthGuard>
  );
}