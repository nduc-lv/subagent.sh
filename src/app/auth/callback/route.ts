import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/security-headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  // Debug: Log the full URL and search params
  console.log('🔍 OAuth Callback Debug:', {
    fullUrl: request.url,
    searchParams: Object.fromEntries(searchParams.entries()),
    hasCode: !!code,
    hasError: !!error,
    error,
    origin
  });
  
  // Log authentication attempts for security monitoring
  logSecurityEvent('github_oauth_callback', {
    has_code: !!code,
    has_error: !!error,
    error_type: error,
    state_present: !!state,
    user_agent: request.headers.get('user-agent'),
  }, request);


  if (error) {
    return NextResponse.redirect(`${origin}/auth/signin?error=${error}&message=${encodeURIComponent('GitHub OAuth error occurred')}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=no_code&message=${encodeURIComponent('No authorization code received from GitHub')}`);
  }
    
    // Check where to redirect - prefer stored redirect or default to profile
    const storedRedirect = searchParams.get('redirect') || 
                          (typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null);
    const defaultRedirect = storedRedirect && storedRedirect.startsWith('/') ? storedRedirect : '/profile';
    
    let response = NextResponse.redirect(`${origin}${defaultRedirect}`);

    const supabase = await createClient();

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        logSecurityEvent('github_oauth_exchange_failed', {
          error: exchangeError.message,
          code_length: code.length,
        }, request);
        
        return NextResponse.redirect(
          `${origin}/auth/signin?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`
        );
      }
      
      if (data?.session) {
        logSecurityEvent('github_oauth_success', {
          user_id: data.session.user.id,
          email: data.session.user.email,
        }, request);
        
        // Add a small delay to ensure cookies are properly set
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return response;
    } catch (error) {
      logSecurityEvent('github_oauth_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }, request);
      
      return NextResponse.redirect(
        `${origin}/auth/signin?error=auth_error&message=${encodeURIComponent('Authentication error occurred. Please try again.')}`
      );
    }
}