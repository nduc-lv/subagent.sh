import { NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (Feature Policy replacement)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
  ].join(', '),
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
} as const;

/**
 * Content Security Policy configuration
 */
export function getCSPHeader(nonce?: string): string {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co https://api.github.com https://github.com wss://*.supabase.co https://va.vercel-scripts.com",
    "frame-src 'self' https://github.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  
  if (nonce) {
    // Replace unsafe-inline with nonce for scripts
    const scriptIndex = cspDirectives.findIndex(d => d.startsWith('script-src'));
    if (scriptIndex !== -1) {
      cspDirectives[scriptIndex] = cspDirectives[scriptIndex].replace(
        "'unsafe-inline'", 
        `'nonce-${nonce}'`
      );
    }
  }
  
  return cspDirectives.join('; ');
}

/**
 * Apply security headers to a response
 */
export function withSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Set CSP header
  response.headers.set('Content-Security-Policy', getCSPHeader(nonce));
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for Node.js environments
    const { randomBytes } = require('crypto');
    return randomBytes(16).toString('hex');
  }
}

/**
 * Validate request origin for CORS
 */
export function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = [
    'https://subagents.sh',
    'https://www.subagents.sh',
    ...(process.env.NODE_ENV === 'development' ? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ] : []),
  ];
  
  return allowedOrigins.includes(origin);
}

/**
 * Sanitize error messages for production
 */
export function sanitizeError(error: unknown, isProduction: boolean = process.env.NODE_ENV === 'production'): string {
  if (!isProduction) {
    return error instanceof Error ? error.message : String(error);
  }
  
  // In production, return generic error messages
  return 'An error occurred while processing your request';
}

/**
 * Log security events
 */
export function logSecurityEvent(event: string, details: Record<string, any>, request?: Request): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
    referer: request?.headers.get('referer') || 'unknown',
  };
  
  // In production, you might want to send this to a security monitoring service
  console.warn('SECURITY EVENT:', JSON.stringify(logData));
}