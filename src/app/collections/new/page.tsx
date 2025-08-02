'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Globe, Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';

function NewCollectionPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setLoading(true);
    try {
      const slug = generateSlug(formData.name);
      
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          slug,
          is_public: formData.is_public
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create collection');
      }

      const collection = await response.json();
      router.push(`/collections/${collection.id}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
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
            <Link href="/collections">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collections
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Create New Collection</h1>
          <p className="text-muted-foreground mt-2">
            Organize your favorite subagents into a curated collection
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
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
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name for your collection
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Help others understand what this collection contains
                </p>
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
                  disabled={loading || !formData.name.trim()}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Collection'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/collections">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">What happens next?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your collection will be created and you can start adding agents</li>
              <li>• Browse the agent directory to find and add relevant subagents</li>
              <li>• Share your public collections with the community</li>
              <li>• Edit your collection details anytime</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function NewCollectionPage() {
  return (
    <AuthGuard>
      <NewCollectionPageContent />
    </AuthGuard>
  );
}