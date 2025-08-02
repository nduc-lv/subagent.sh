'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website_url: string | null;
  bio: string | null;
  location: string | null;
  github_username: string | null;
  twitter_username: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error?: any }>;
  deleteAccount: () => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple profile fetch
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      // Silent fail - profile will remain null
    }
  };

  // Simple profile creation
  const createProfile = async (user: User) => {
    try {
      const githubData = user.user_metadata;
      const profileData = {
        id: user.id,
        username: githubData?.user_name || githubData?.login,
        full_name: githubData?.full_name || user.email?.split('@')[0],
        avatar_url: githubData?.avatar_url,
        bio: githubData?.bio,
        website_url: githubData?.blog,
        github_username: githubData?.user_name || githubData?.login,
        location: githubData?.location,
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      // Silent fail - profile will remain null
    }
  };

  // Initialize auth
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // Helper function to handle user session
    const handleUserSession = async (user: any) => {
      try {
        // Try to get existing profile, create if doesn't exist
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (existingProfile) {
          setProfile(existingProfile);
        } else {
          await createProfile(user);
        }
      } catch (error) {
        // Continue even if profile operations fail
      }
    };

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await handleUserSession(session.user);
        }
        
        initialized = true;
        // Small delay to ensure React state updates properly
        setTimeout(() => setLoading(false), 0);
      } catch (error) {
        if (mounted) {
          initialized = true;
          setTimeout(() => setLoading(false), 0);
        }
      }
    };

    // Listen for auth changes - following official Supabase pattern
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Skip initial SIGNED_IN event if we already initialized
        if (event === 'SIGNED_IN' && initialized) {
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle OAuth provider tokens according to official docs
        if (session && session.provider_token) {
          window.localStorage.setItem('oauth_provider_token', session.provider_token);
        }

        if (session && session.provider_refresh_token) {
          window.localStorage.setItem('oauth_provider_refresh_token', session.provider_refresh_token);
        }

        if (event === 'SIGNED_OUT') {
          // Clear tokens on logout
          window.localStorage.removeItem('oauth_provider_token');
          window.localStorage.removeItem('oauth_provider_refresh_token');
          setProfile(null);
          initialized = false;
        }
        
        if (session?.user && event !== 'SIGNED_IN') {
          await handleUserSession(session.user);
        } else if (!session?.user) {
          setProfile(null);
        }
        
        // Always ensure loading is set to false
        setTimeout(() => setLoading(false), 0);
      }
    );

    // Start initialization
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with GitHub - following official Supabase pattern
  const signInWithGitHub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'read:user user:email'
        }
      });

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('OAuth Sign-in Error:', error.message);
      return { data: null, error };
    }
  };

  // Sign out - following official Supabase pattern
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error.message);
      return { error };
    }
  };

  // Update profile
  const updateProfile = async (data: Partial<Profile>) => {
    try {
      if (!user) {
        return { error: 'No user logged in' };
      }

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      if (!user) {
        return { error: 'No user logged in' };
      }

      // Delete profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        return { error: profileError };
      }

      // Delete user account
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        return { error: authError };
      }

      // Clear local state
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signInWithGitHub,
    signOut,
    updateProfile,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}