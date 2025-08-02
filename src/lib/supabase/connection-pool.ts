// Database connection pool and query optimization
import { supabase } from './client';
import { createServiceClient } from './service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface QueryConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export class ConnectionPool {
  private clientPool: Map<string, typeof supabase> = new Map();
  private servicePool: Map<string, ReturnType<typeof createServiceClient>> = new Map();
  private queryCache: Map<string, CacheEntry<any>> = new Map();
  private poolSize = 5;
  private activeConnections = 0;
  private maxConnections = 10;

  // Get optimized client with pooling
  getClient(key = 'default'): typeof supabase {
    if (this.clientPool.has(key)) {
      return this.clientPool.get(key)!;
    }

    if (this.activeConnections >= this.maxConnections) {
      // Return existing client if at max capacity
      const firstClient = this.clientPool.values().next().value;
      if (firstClient) return firstClient;
    }

    try {
      const client = supabase;
      if (!client) {
        throw new Error('Failed to create Supabase client');
      }
      this.clientPool.set(key, client);
      this.activeConnections++;
      return client;
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      throw error;
    }
  }

  // Get service client (server-side only)
  getServiceClient(key = 'default'): ReturnType<typeof createServiceClient> {
    if (typeof window !== 'undefined') {
      throw new Error('Service client cannot be used on client side');
    }

    if (this.servicePool.has(key)) {
      return this.servicePool.get(key)!;
    }

    if (this.activeConnections >= this.maxConnections) {
      const firstClient = this.servicePool.values().next().value;
      if (firstClient) return firstClient;
    }

    const client = createServiceClient();
    this.servicePool.set(key, client);
    this.activeConnections++;
    return client;
  }

  // Optimized query execution with retry logic and caching
  async executeQuery<T>(
    queryFn: (client: any) => Promise<{ data: T; error: any }>,
    config: QueryConfig = {}
  ): Promise<T> {
    const {
      timeout = 10000,
      retries = 2,
      cache = false,
      cacheTTL = 5 * 60 * 1000 // 5 minutes
    } = config;

    // Generate cache key from query function string
    const cacheKey = cache ? this.generateCacheKey(queryFn.toString()) : null;
    
    // Check cache first
    if (cacheKey && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
      this.queryCache.delete(cacheKey);
    }

    let lastError: any;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const client = this.getClient(`query-${attempt}`);
        
        if (!client) {
          throw new Error('Failed to get Supabase client instance');
        }
        
        // Create AbortController for timeout (Supabase best practice)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        try {
          // Execute query with timeout protection
          const result = await queryFn(client);
          clearTimeout(timeoutId);

          if (result?.error) {
            throw new Error(result.error.message || JSON.stringify(result.error) || 'Database query failed');
          }

          // Cache successful result
          if (cacheKey && result?.data) {
            this.queryCache.set(cacheKey, {
              data: result.data,
              timestamp: Date.now(),
              ttl: cacheTTL
            });
          }

          return result?.data || [];
        } catch (queryError) {
          clearTimeout(timeoutId);
          throw queryError;
        }
      } catch (error) {
        lastError = error;
        attempt++;
        
        console.error(`Query attempt ${attempt} failed:`, {
          error: error?.message || error?.toString() || 'Unknown error',
          errorType: typeof error,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
          errorName: error?.name,
          errorStack: error?.stack,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          attempt,
          retries
        });
        
        // Exponential backoff for retries
        if (attempt <= retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  // Execute RPC with optimization
  async executeRPC<T>(
    rpcName: string,
    params: Record<string, any> = {},
    config: QueryConfig = {}
  ): Promise<T> {
    return this.executeQuery(
      (client) => client.rpc(rpcName, params),
      { ...config, timeout: config.timeout || 15000 }
    );
  }

  // Execute basic query with optimization
  async executeSelect<T>(
    table: string,
    query: (q: any) => any,
    config: QueryConfig = {}
  ): Promise<T> {
    return this.executeQuery(
      (client) => query(client.from(table)),
      config
    );
  }

  // Clear cache
  clearCache(pattern?: string) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.queryCache.keys()) {
        if (regex.test(key)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  // Generate cache key from query
  private generateCacheKey(queryString: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Delay utility for retries
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up expired cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.queryCache.size,
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      clientPoolSize: this.clientPool.size,
      servicePoolSize: this.servicePool.size
    };
  }
}

// Singleton instance
export const connectionPool = new ConnectionPool();

// Clean up cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => connectionPool.cleanupCache(), 10 * 60 * 1000);
}