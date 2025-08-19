'use client';

import { useState } from 'react';
import { Github, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface AuthButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function AuthButton({ 
  className, 
  variant = 'default', 
  size = 'sm' 
}: AuthButtonProps) {
  const { user, loading, signInWithGitHub, signOut } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await signInWithGitHub();
      if (error) {
        console.error('Sign in error:', error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      console.log("Successfully");
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (user) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleSignIn}
      disabled={isSigningIn}
    >
      {isSigningIn ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Github className="h-4 w-4 mr-2" />
          Sign in with GitHub
        </>
      )}
    </Button>
  );
}