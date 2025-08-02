import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { withSecurityHeaders, logSecurityEvent, isValidOrigin } from '@/lib/security-headers';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Enhance cookie security and persistence in middleware
            const enhancedOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              httpOnly: name.includes('refresh') ? true : false,
              maxAge: name.includes('refresh') ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
              path: '/',
            };
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const enhancedOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              httpOnly: name.includes('refresh') ? true : false,
              maxAge: name.includes('refresh') ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
              path: '/',
            };
            supabaseResponse.cookies.set(name, value, enhancedOptions);
          });
        },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        flowType: 'pkce'
      },
      db: {
        schema: 'public'
      }
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Try to get user and refresh session if needed
  let user = null;
  try {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    
    if (error && error.message.includes('JWT expired')) {
      // Try to refresh the session
      try {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && session?.user) {
          user = session.user;
        }
      } catch (refreshError) {
        // Session refresh failed - user will need to re-authenticate
      }
    } else {
      user = currentUser;
    }
  } catch (error) {
    // Error getting user - will be handled by auth guard
  }

  // Define protected routes that require authentication
  const protectedRoutes = [
    '/profile',
    '/submit',
    '/collections',
    '/bookmarks',
  ];

  // Define auth routes that should redirect if user is already logged in
  const authRoutes = ['/auth/signin', '/auth/signup'];

  const { pathname } = request.nextUrl;

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    logSecurityEvent('unauthorized_access_attempt', {
      path: pathname,
      route_type: 'protected'
    }, request);
    
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return withSecurityHeaders(NextResponse.redirect(redirectUrl));
  }

  // Redirect authenticated users from auth routes to profile
  if (isAuthRoute && user) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/profile', request.url)));
  }

  // Log suspicious activity
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /dirb/i,
    /gobuster/i,
    /burp/i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent) || pattern.test(pathname))) {
    logSecurityEvent('suspicious_request', {
      path: pathname,
      user_agent: userAgent,
    }, request);
  }

  // Add security headers to all responses
  const responseWithHeaders = withSecurityHeaders(supabaseResponse);

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return responseWithHeaders;
}
