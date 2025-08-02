'use client';

import { useState, useEffect } from 'react';
import { Camera, Github, Globe, MapPin, Save, Loader2, AlertTriangle, Trash2, User, Calendar, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

function ProfilePageContent() {
  const { user, profile, updateProfile, deleteAccount, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    website_url: profile?.website_url || '',
    location: profile?.location || '',
    twitter_username: profile?.twitter_username || '',
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        website_url: profile.website_url || '',
        location: profile.location || '',
        twitter_username: profile.twitter_username || '',
      });
    }
  }, [profile]);

  if (!user) {
    return null; // This should not happen due to AuthGuard, but just in case
  }

  // Show loading state while auth is initializing or profile is being loaded
  if (loading || !profile) {
    return (
      <div className="min-h-screen relative">
        {/* Background gradients */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/50 to-transparent pointer-events-none" />
        </div>
        
        <div className="relative container max-w-4xl mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading your profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile(formData);
      if (error) {
        // TODO: Show error toast
      } else {
        setIsEditing(false);
        // TODO: Show success toast
      }
    } catch (error) {
      // Error updating profile - user feedback could be added here
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: profile?.username || '',
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      website_url: profile?.website_url || '',
      location: profile?.location || '',
      twitter_username: profile?.twitter_username || '',
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        // TODO: Show error toast
      } else {
        // Redirect to homepage after successful deletion
        router.push('/');
      }
    } catch (error) {
      // Error deleting account - user feedback could be added here
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    }
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

  return (
    <div className="min-h-screen relative">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/50 to-transparent pointer-events-none" />
      </div>
      
      <div className="relative container max-w-4xl mx-auto py-8">
        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
        >
          {/* Modern Header */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-md rounded-2xl border border-border/60" />
            <div className="relative p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <User className="h-8 w-8 text-primary" />
                      <div className="absolute inset-0 h-8 w-8 text-primary/20 scale-150 animate-pulse" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text">
                      Profile Settings
                    </h1>
                  </div>
                  <p className="text-muted-foreground/80 text-lg leading-relaxed max-w-2xl">
                    Manage your account settings and profile information with ease
                  </p>
                </div>
                
                {!isEditing ? (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </motion.div>
                ) : (
                  <div className="flex space-x-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" onClick={handleCancel} className="backdrop-blur-sm">
                        Cancel
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Profile Avatar Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="group relative cursor-pointer overflow-hidden rounded-2xl transform transition-transform duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-md border border-border/60 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <Camera className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground/90">Profile Picture</h2>
              </div>
              
              <div className="flex items-center space-x-6">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative"
                >
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                    <AvatarImage 
                      src={profile.avatar_url || undefined} 
                      alt={profile.full_name || profile.username || 'User'} 
                    />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-foreground font-bold">
                      {getInitials(profile.full_name, profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-primary/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                    <Github className="h-3 w-3 text-primary-foreground" />
                  </div>
                </motion.div>
                
                <div className="space-y-3 flex-1">
                  <div className="space-y-2">
                    <p className="text-foreground/80 font-medium">
                      Synced from GitHub
                    </p>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                      Your profile picture is automatically synced from your GitHub account and stays up to date
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" size="sm" disabled className="backdrop-blur-sm border-border/60 hover:bg-muted/40">
                      <Camera className="h-4 w-4 mr-2" />
                      Managed by GitHub
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Basic Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="group relative overflow-hidden rounded-2xl transform transition-transform duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-md border border-border/60 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground/90">Basic Information</h2>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div 
                    className="space-y-3"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Label htmlFor="username" className="text-sm font-medium text-foreground/80">Username</Label>
                    <Input
                      id="username"
                      value={isEditing ? formData.username : profile.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter username"
                      className="backdrop-blur-sm border-border/60 bg-background/50 hover:bg-background/70 focus:bg-background/80 transition-all duration-300"
                    />
                  </motion.div>
                  
                  <motion.div 
                    className="space-y-3"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Label htmlFor="full_name" className="text-sm font-medium text-foreground/80">Full Name</Label>
                    <Input
                      id="full_name"
                      value={isEditing ? formData.full_name : profile.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter full name"
                      className="backdrop-blur-sm border-border/60 bg-background/50 hover:bg-background/70 focus:bg-background/80 transition-all duration-300"
                    />
                  </motion.div>
                </div>

                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Label htmlFor="bio" className="text-sm font-medium text-foreground/80">Bio</Label>
                  <Input
                    id="bio"
                    value={isEditing ? formData.bio : profile.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself"
                    className="backdrop-blur-sm border-border/60 bg-background/50 hover:bg-background/70 focus:bg-background/80 transition-all duration-300"
                  />
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Label htmlFor="location" className="text-sm font-medium text-foreground/80">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      id="location"
                      className="pl-10 backdrop-blur-sm border-border/60 bg-background/50 hover:bg-background/70 focus:bg-background/80 transition-all duration-300"
                      value={isEditing ? formData.location : profile.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      disabled={!isEditing}
                      placeholder="City, Country"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Social Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="group relative overflow-hidden rounded-2xl transform transition-transform duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-md border border-border/60 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground/90">Social Links</h2>
              </div>
              
              <div className="space-y-6">
                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Label htmlFor="github_username" className="text-sm font-medium text-foreground/80">GitHub Username</Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      id="github_username"
                      className="pl-10 backdrop-blur-sm border-border/60 bg-background/50"
                      value={profile.github_username || ''}
                      disabled
                      placeholder="Synced from GitHub"
                    />
                    <div className="absolute right-3 top-3">
                      <div className="bg-primary/90 backdrop-blur-sm rounded-full p-1 shadow-lg">
                        <Shield className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Your GitHub username is automatically synced and securely managed
                  </p>
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Label htmlFor="website_url" className="text-sm font-medium text-foreground/80">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      id="website_url"
                      className="pl-10 backdrop-blur-sm border-border/60 bg-background/50 hover:bg-background/70 focus:bg-background/80 transition-all duration-300"
                      type="url"
                      value={isEditing ? formData.website_url : profile.website_url || ''}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Label htmlFor="twitter_username" className="text-sm font-medium text-foreground/80">Twitter Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground z-10 font-medium">@</span>
                    <Input
                      id="twitter_username"
                      className="pl-8 backdrop-blur-sm border-border/60 bg-background/50 hover:bg-background/70 focus:bg-background/80 transition-all duration-300"
                      value={isEditing ? formData.twitter_username : profile.twitter_username || ''}
                      onChange={(e) => setFormData({ ...formData, twitter_username: e.target.value })}
                      disabled={!isEditing}
                      placeholder="twitter_handle"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Account Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="group relative overflow-hidden rounded-2xl transform transition-transform duration-300 ease-out hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card to-card/95 backdrop-blur-md border border-border/60 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground/90">Account Information</h2>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div 
                    className="space-y-3"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input 
                      value={user.email || ''} 
                      disabled 
                      className="backdrop-blur-sm border-border/60 bg-background/30 font-medium"
                    />
                  </motion.div>
                  
                  <motion.div 
                    className="space-y-3"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Member Since
                    </Label>
                    <Input 
                      value={new Date(profile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} 
                      disabled 
                      className="backdrop-blur-sm border-border/60 bg-background/30 font-medium"
                    />
                  </motion.div>
                </div>
                
                <motion.div 
                  className="space-y-3"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    User ID
                  </Label>
                  <Input 
                    value={user.id} 
                    disabled 
                    className="font-mono text-sm backdrop-blur-sm border-border/60 bg-background/30 text-muted-foreground" 
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Danger Zone Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="group relative overflow-hidden rounded-2xl transform transition-transform duration-300 ease-out hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-1 hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-red-950/30 to-red-950/20 backdrop-blur-md border border-red-500/30 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-red-600/5 to-red-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h2 className="text-xl font-bold text-red-100">Danger Zone</h2>
              </div>
              
              <div className="space-y-4">
                <motion.div 
                  className="p-5 rounded-xl bg-gradient-to-br from-red-950/60 via-red-950/40 to-red-950/30 backdrop-blur-sm border border-red-500/40"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <h4 className="font-semibold text-red-100 text-lg">Delete Account</h4>
                      <p className="text-sm text-red-300/90 leading-relaxed">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <ul className="text-sm text-red-400/80 space-y-2 mt-3">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                          All your agents will be removed
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                          All your reviews will be deleted
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                          Your profile information will be permanently erased
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                          This action is irreversible
                        </li>
                      </ul>
                    </div>
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <DialogTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-red-50 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                          </Button>
                        </motion.div>
                      </DialogTrigger>
                      <DialogContent className="max-w-md backdrop-blur-xl">
                        <DialogHeader>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <DialogTitle className="text-red-900 dark:text-red-100">Delete Account</DialogTitle>
                          </div>
                          <DialogDescription className="text-red-700 dark:text-red-300">
                            This action will permanently delete your account and all associated data. This cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-3">
                              The following will be permanently deleted:
                            </p>
                            <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                Your profile and account information
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                All agents you've created
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                All reviews you've written
                              </li>
                              <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                All votes and interactions
                              </li>
                            </ul>
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="delete-confirmation" className="text-sm font-medium">
                              Type <span className="font-mono bg-muted px-2 py-1 rounded text-xs">DELETE</span> to confirm:
                            </Label>
                            <Input
                              id="delete-confirmation"
                              value={deleteConfirmation}
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              placeholder="Type DELETE to confirm"
                              className="border-red-200 dark:border-red-800 focus:border-red-400 backdrop-blur-sm"
                            />
                          </div>
                        </div>

                        <DialogFooter className="gap-3">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowDeleteDialog(false);
                                setDeleteConfirmation('');
                              }}
                              disabled={isDeleting}
                              className="backdrop-blur-sm"
                            >
                              Cancel
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="destructive"
                              onClick={handleDeleteAccount}
                              disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                              className="gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Delete Account
                                </>
                              )}
                            </Button>
                          </motion.div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard fallback={
      <div className="min-h-screen relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/50 to-transparent pointer-events-none" />
        </div>
        
        <div className="relative container max-w-4xl mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Verifying authentication...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </AuthGuard>
  );
}