'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  redirectTo = '/auth/signin',
  requireAuth = true,
  fallback 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!loading && !hasRedirected) {
      if (requireAuth && !user) {
        // Store the intended destination
        const currentPath = window.location.pathname + window.location.search;
        sessionStorage.setItem('auth_redirect', currentPath);
        setHasRedirected(true);
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        // If user is logged in but shouldn't be (e.g., on sign-in page)
        setHasRedirected(true);
        router.push('/profile');
      }
    }
  }, [user, loading, requireAuth, redirectTo, router, hasRedirected]);

  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect
  }

  if (!requireAuth && user) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}