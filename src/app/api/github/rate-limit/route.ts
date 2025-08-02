import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { githubApp } from '@/lib/github/app';

async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * GET /api/github/rate-limit - Check GitHub API rate limits
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    // Get user's GitHub session
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const githubToken = githubApp.getGitHubTokenFromSession(session);
    
    let userRateLimit = null;
    let appRateLimit = null;
    
    // Check user's rate limit if they have a token
    if (githubToken) {
      try {
        const userOctokit = await githubApp.getUserOctokit(githubToken);
        const { data } = await userOctokit.rest.rateLimit.get();
        userRateLimit = {
          limit: data.rate.limit,
          remaining: data.rate.remaining,
          reset: new Date(data.rate.reset * 1000).toISOString(),
          used: data.rate.limit - data.rate.remaining,
        };
      } catch (error) {
        console.error('Error checking user rate limit:', error);
      }
    }
    
    // Check app rate limit as fallback
    try {
      const appOctokit = await githubApp.getAppOctokit();
      const { data } = await appOctokit.rest.rateLimit.get();
      appRateLimit = {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000).toISOString(),
        used: data.rate.limit - data.rate.remaining,
      };
    } catch (error) {
      console.error('Error checking app rate limit:', error);
    }
    
    return NextResponse.json({
      success: true,
      hasUserToken: !!githubToken,
      userRateLimit,
      appRateLimit,
      recommendation: githubToken 
        ? 'Using your GitHub token for API requests'
        : 'Consider signing in with GitHub for better rate limits',
    });

  } catch (error) {
    console.error('GitHub rate limit check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to check rate limits', message: String(error) },
      { status: 500 }
    );
  }
}