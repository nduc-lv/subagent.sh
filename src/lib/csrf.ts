import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Create a CSRF token hash for verification
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Set CSRF token in cookies
 */
export function setCSRFToken(): string {
  const token = generateCSRFToken();
  const cookieStore = cookies();
  
  // Set the token in an httpOnly cookie
  cookieStore.set(CSRF_TOKEN_NAME, hashToken(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  
  // Return the unhashed token to be used in forms/headers
  return token;
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  try {
    const cookieStore = cookies();
    const storedTokenHash = cookieStore.get(CSRF_TOKEN_NAME)?.value;
    
    if (!storedTokenHash) {
      return false;
    }
    
    // Check for token in header or form data
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    let bodyToken: string | null = null;
    
    // For form submissions, try to get token from body
    if (request.headers.get('content-type')?.includes('application/json')) {
      // For JSON requests, token should be in header
      bodyToken = headerToken;
    } else {
      // For form submissions, we'd need to parse the body
      // This is a simplified implementation - in practice you'd parse form data
      bodyToken = headerToken;
    }
    
    if (!bodyToken) {
      return false;
    }
    
    // Verify the token
    const providedTokenHash = hashToken(bodyToken);
    return storedTokenHash === providedTokenHash;
    
  } catch (error) {
    console.error('CSRF token verification failed:', error);
    return false;
  }
}

/**
 * CSRF protection middleware for API routes
 */
export function requireCSRFToken(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    // Skip CSRF for GET requests (they should be idempotent)
    if (request.method === 'GET') {
      return handler(request);
    }
    
    // Skip CSRF for requests from allowed origins (API clients)
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      'https://subagents.sh',
      'http://localhost:3000',
    ].filter(Boolean);
    
    if (origin && allowedOrigins.includes(origin)) {
      if (!verifyCSRFToken(request)) {
        return new Response(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    return handler(request);
  };
}

/**
 * Get CSRF token for client-side use
 */
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Try to get from meta tag (if set by server)
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  
  return null;
}