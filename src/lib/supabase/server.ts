import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types';

export async function createClient() {
  const cookieStore = await cookies();

  return createSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Enhance cookie security and persistence
              const enhancedOptions = {
                ...options,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                httpOnly: name.includes('refresh') ? true : false, // Only refresh tokens should be httpOnly
                maxAge: name.includes('refresh') ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30 days for refresh, 7 days for access
                path: '/',
              };
              cookieStore.set(name, value, enhancedOptions);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn('Could not set cookies in server component:', error);
          }
        },
      },
      auth: {
        // Enable auto refresh tokens on server side too
        autoRefreshToken: true,
        // Persist session 
        persistSession: true,
        // Use PKCE flow for better security
        flowType: 'pkce'
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'subagents-server-client'
        }
      }
    }
  );
}

export const createServerClient = createClient;
