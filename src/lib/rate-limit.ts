import { trackRateLimit } from './monitoring';

// Simple in-memory rate limiting (for development/simple deployments)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
let cleanupCounter = 0;

// Rate limit configurations
const rateLimitConfigs = {
  api: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 requests per hour  
  auth: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  createAgent: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 requests per hour
  search: { limit: 200, windowMs: 60 * 60 * 1000 }, // 200 requests per hour
  upload: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 requests per hour
  heavy: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 requests per hour
  admin: { limit: 50, windowMs: 60 * 60 * 1000 }, // 50 requests per hour for admin endpoints
};

export type RateLimitType = keyof typeof rateLimitConfigs;

interface RateLimitOptions {
  type: RateLimitType;
  identifier: string;
  userId?: string;
}

export async function checkRateLimit({ type, identifier, userId }: RateLimitOptions) {
  const config = rateLimitConfigs[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;
  
  // Clean up expired entries more deterministically
  // Clean every 100 requests or if store gets too large
  cleanupCounter = (cleanupCounter || 0) + 1;
  if (cleanupCounter % 100 === 0 || rateLimitStore.size > 10000) {
    cleanupExpiredEntries(now);
  }
  
  let record = rateLimitStore.get(key);
  
  // Reset if window has expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  const success = record.count <= config.limit;
  const remaining = Math.max(0, config.limit - record.count);
  
  if (!success) {
    // Track rate limit hit
    trackRateLimit(config.limit, remaining, Math.floor(record.resetTime / 1000));
    
    console.warn(`Rate limit exceeded for ${type}:`, {
      identifier,
      userId,
      limit: config.limit,
      remaining,
      reset: new Date(record.resetTime),
    });
  }

  return {
    success,
    limit: config.limit,
    remaining,
    reset: new Date(record.resetTime),
  };
}

// Middleware helper for Next.js API routes
export function withRateLimit(type: RateLimitType) {
  return function rateLimitMiddleware(
    handler: (req: any, res: any) => Promise<any>
  ) {
    return async function (req: any, res: any) {
      // Get identifier (IP address or user ID)
      const identifier = req.ip || 
        req.headers['x-forwarded-for'] || 
        req.headers['x-real-ip'] || 
        'unknown';

      const userId = req.user?.id || req.headers['x-user-id'];

      const rateLimitResult = await checkRateLimit({
        type,
        identifier: `${type}:${identifier}`,
        userId,
      });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', typeof rateLimitResult.reset === 'number' ? rateLimitResult.reset : rateLimitResult.reset.getTime());

      if (!rateLimitResult.success) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${Math.ceil(
            ((typeof rateLimitResult.reset === 'number' ? rateLimitResult.reset * 1000 : rateLimitResult.reset.getTime()) - Date.now()) / 1000
          )} seconds.`,
          retryAfter: Math.ceil(
            ((typeof rateLimitResult.reset === 'number' ? rateLimitResult.reset * 1000 : rateLimitResult.reset.getTime()) - Date.now()) / 1000
          ),
        });
      }

      return handler(req, res);
    };
  };
}

// Helper for client-side rate limit checking
export async function clientRateLimit(
  type: RateLimitType,
  userId?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/internal/rate-limit-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, userId }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Client rate limit check failed:', error);
    return true; // Allow on error
  }
}

// Helper to clean up expired entries
function cleanupExpiredEntries(now: number) {
  let cleaned = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired rate limit entries`);
  }
}

// Cleanup old rate limit data (should be run periodically)
export async function cleanupRateLimitData() {
  const now = Date.now();
  cleanupExpiredEntries(now);
}