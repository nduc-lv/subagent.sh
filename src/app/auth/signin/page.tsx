'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Github, AlertCircle, Code, Sparkles, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AuthButton } from '@/components/auth/auth-button';
import Link from 'next/link';

function SignInPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const details = searchParams.get('details');
    const message = searchParams.get('message');
    
    if (errorParam) {
      let errorMessage = '';
      let helpText = '';
      
      switch (errorParam) {
        case 'auth_callback_failed':
          errorMessage = 'Authentication failed. Please try again.';
          helpText = 'This usually happens due to network issues or browser security settings.';
          break;
        case 'access_denied':
          errorMessage = 'Access was denied during GitHub authorization.';
          helpText = 'You cancelled the authorization process. Click "Sign in with GitHub" to try again.';
          break;
        case 'exchange_failed':
          errorMessage = `Code exchange failed: ${details || message || 'Unknown error'}`;
          helpText = 'There was an issue exchanging the authorization code. This is usually temporary.';
          break;
        case 'exception':
          errorMessage = `Authentication error: ${details || message || 'Unknown exception'}`;
          helpText = 'An unexpected error occurred during authentication.';
          break;
        case 'no_code':
          errorMessage = 'No authorization code received from GitHub.';
          helpText = 'GitHub did not provide an authorization code. Please try signing in again.';
          break;
        case 'timeout':
          errorMessage = message || 'Authentication request timed out.';
          helpText = 'The authentication process took too long. Please check your connection and try again.';
          break;
        case 'callback_timeout':
          errorMessage = 'Authentication callback timed out.';
          helpText = 'The callback from GitHub took too long to process. Please try again.';
          break;
        default:
          errorMessage = message || `Authentication error: ${errorParam}${details ? ` - ${details}` : ''}`;
          helpText = 'An unexpected error occurred. Please try again or contact support if the issue persists.';
      }
      
      setError(`${errorMessage}${helpText ? `\n\n💡 ${helpText}` : ''}`);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-muted/10 to-purple-500/8 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/50 to-transparent pointer-events-none" />
      
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative mx-auto max-w-md w-full px-6 space-y-8">
        {/* Logo and title */}
        <div className="text-center space-y-6">
          <Link href="/" className="inline-flex items-center justify-center space-x-3 group">
            <span className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              subagents.sh
            </span>
          </Link>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-lg text-muted-foreground/90">
              Sign in to continue building with Claude Code sub-agents
            </p>
          </div>
        </div>

        {/* Main sign-in card */}
        <Card className="border-border/60 bg-gradient-to-br from-card via-card/98 to-card/95 backdrop-blur-md shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Sign in to your account</CardTitle>
            <CardDescription className="text-center text-muted-foreground/80">
              Connect with GitHub to access all features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-start space-x-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <AuthButton 
              variant="default" 
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground/80 space-y-1">
              <p>
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features section */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center space-y-2 group">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Instant Access</p>
          </div>
          <div className="text-center space-y-2 group">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Secure Auth</p>
          </div>
          <div className="text-center space-y-2 group">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Premium Tools</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <AuthGuard requireAuth={false}>
      <SignInPageContent />
    </AuthGuard>
  );
}