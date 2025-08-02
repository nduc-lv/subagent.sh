'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Globe, Lock, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
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

interface Collection {
  id: string;
  name: string;
  description?: string;
  slug: string;
  user_id: string;
  author_id: string;
  is_public: boolean;
  agent_count: number;
  created_at: string;
  updated_at: string;
}

function EditCollectionPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true
  });

  useEffect(() => {
    fetchCollection();
  }, [collectionId]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/collections/${collectionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const collectionData = await response.json();
      
      // Check if user owns this collection
      if (!user || collectionData.user_id !== user.id) {
        router.push('/collections');
        return;
      }

      setCollection(collectionData);
      setFormData({
        name: collectionData.name,
        description: collectionData.description || '',
        is_public: collectionData.is_public
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection || !formData.name.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_public: formData.is_public
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update collection');
      }

      const updatedCollection = await response.json();
      setCollection(updatedCollection);
      
      // Redirect back to collection view
      router.push(`/collections/${collectionId}`);
    } catch (error) {
      console.error('Error updating collection:', error);
      setError('Failed to update collection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!collection) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete collection');
      }

      router.push('/collections');
    } catch (error) {
      console.error('Error deleting collection:', error);
      setError('Failed to delete collection');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePublicToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_public: checked
    }));
  };

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'Collection not found'}
            </p>
            <Button asChild>
              <Link href="/collections">Back to Collections</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/collections/${collectionId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collection
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Edit Collection</h1>
          <p className="text-muted-foreground mt-2">
            Update your collection details and settings
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Collection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Collection Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Data Analysis Tools"
                  required
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what this collection is about..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Visibility */}
              <div className="space-y-4">
                <Label>Visibility</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {formData.is_public ? (
                      <Globe className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">
                        {formData.is_public ? 'Public' : 'Private'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formData.is_public
                          ? 'Anyone can view and discover this collection'
                          : 'Only you can view this collection'
                        }
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={handlePublicToggle}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={saving || !formData.name.trim()}
                  className="flex-1"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/collections/${collectionId}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Delete Collection</div>
                <div className="text-sm text-muted-foreground">
                  Permanently delete this collection and remove all agents from it.
                  This action cannot be undone.
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Collection</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{collection.name}"? This will remove 
                all agents from the collection. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Collection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}

export default function EditCollectionPage() {
  return (
    <AuthGuard>
      <EditCollectionPageContent />
    </AuthGuard>
  );
}