import type { GitHubApiQuota } from '@/types';

export interface QuotaLimits {
  core: { limit: number; remaining: number; reset: Date };
  search: { limit: number; remaining: number; reset: Date };
  graphql: { limit: number; remaining: number; reset: Date };
  integration_manifest: { limit: number; remaining: number; reset: Date };
  source_import: { limit: number; remaining: number; reset: Date };
}

export interface QuotaAlert {
  type: 'warning' | 'critical' | 'exhausted';
  resource: string;
  remaining: number;
  limit: number;
  resetTime: Date;
  message: string;
}

export class GitHubQuotaManager {
  private quotaCache = new Map<string, QuotaLimits>();
  private alertHandlers: Array<(alert: QuotaAlert) => void> = [];
  private warningThreshold = 0.1; // 10% remaining
  private criticalThreshold = 0.05; // 5% remaining

  /**
   * Update quota information from API response headers
   */
  updateQuota(userId: string, headers: Record<string, string>): QuotaLimits {
    const quota: QuotaLimits = {
      core: {
        limit: parseInt(headers['x-ratelimit-limit'] || '5000'),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '5000'),
        reset: new Date(parseInt(headers['x-ratelimit-reset'] || '0') * 1000),
      },
      search: {
        limit: parseInt(headers['x-ratelimit-limit'] || '30'),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '30'),
        reset: new Date(parseInt(headers['x-ratelimit-reset'] || '0') * 1000),
      },
      graphql: {
        limit: parseInt(headers['x-ratelimit-limit'] || '5000'),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '5000'),
        reset: new Date(parseInt(headers['x-ratelimit-reset'] || '0') * 1000),
      },
      integration_manifest: {
        limit: parseInt(headers['x-ratelimit-limit'] || '5000'),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '5000'),
        reset: new Date(parseInt(headers['x-ratelimit-reset'] || '0') * 1000),
      },
      source_import: {
        limit: parseInt(headers['x-ratelimit-limit'] || '100'),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '100'),
        reset: new Date(parseInt(headers['x-ratelimit-reset'] || '0') * 1000),
      },
    };

    this.quotaCache.set(userId, quota);
    this.checkQuotaAlerts(userId, quota);
    this.persistQuota(userId, quota);

    return quota;
  }

  /**
   * Get current quota for user
   */
  getQuota(userId: string): QuotaLimits | null {
    return this.quotaCache.get(userId) || null;
  }

  /**
   * Check if request can be made without exceeding limits
   */
  canMakeRequest(userId: string, resource: keyof QuotaLimits = 'core'): boolean {
    const quota = this.getQuota(userId);
    if (!quota) return true; // No quota info, allow request

    const resourceQuota = quota[resource];
    return resourceQuota.remaining > 0 && new Date() < resourceQuota.reset;
  }

  /**
   * Calculate wait time until quota resets
   */
  getWaitTime(userId: string, resource: keyof QuotaLimits = 'core'): number {
    const quota = this.getQuota(userId);
    if (!quota) return 0;

    const resourceQuota = quota[resource];
    if (resourceQuota.remaining > 0) return 0;

    const now = new Date().getTime();
    const resetTime = resourceQuota.reset.getTime();
    return Math.max(0, resetTime - now);
  }

  /**
   * Get quota status for all resources
   */
  getQuotaStatus(userId: string): { resource: string; status: 'ok' | 'warning' | 'critical' | 'exhausted' }[] {
    const quota = this.getQuota(userId);
    if (!quota) return [];

    return Object.entries(quota).map(([resource, data]) => ({
      resource,
      status: this.getResourceStatus(data.remaining, data.limit),
    }));
  }

  /**
   * Predict quota exhaustion time
   */
  predictExhaustion(userId: string, resource: keyof QuotaLimits = 'core'): Date | null {
    const quota = this.getQuota(userId);
    if (!quota) return null;

    const resourceQuota = quota[resource];
    const usage = this.getUsageRate(userId, resource);
    
    if (usage <= 0) return null; // No usage pattern

    const timeToExhaustion = (resourceQuota.remaining / usage) * 60 * 1000; // Convert to ms
    return new Date(Date.now() + timeToExhaustion);
  }

  /**
   * Register alert handler
   */
  onQuotaAlert(handler: (alert: QuotaAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Set quota thresholds
   */
  setThresholds(warning: number, critical: number): void {
    this.warningThreshold = warning;
    this.criticalThreshold = critical;
  }

  /**
   * Optimize request distribution across time
   */
  getOptimalRequestTime(userId: string, resource: keyof QuotaLimits = 'core'): Date {
    const quota = this.getQuota(userId);
    if (!quota) return new Date();

    const resourceQuota = quota[resource];
    
    if (resourceQuota.remaining > resourceQuota.limit * this.warningThreshold) {
      return new Date(); // Can make request immediately
    }

    // Distribute remaining requests evenly until reset
    const now = Date.now();
    const resetTime = resourceQuota.reset.getTime();
    const timeUntilReset = resetTime - now;
    
    if (timeUntilReset <= 0) {
      return new Date(); // Quota should have reset
    }

    const optimalDelay = timeUntilReset / Math.max(1, resourceQuota.remaining);
    return new Date(now + optimalDelay);
  }

  /**
   * Bulk request planning
   */
  planBulkRequests(
    userId: string,
    requestCount: number,
    resource: keyof QuotaLimits = 'core'
  ): { canExecute: boolean; schedule: Date[]; waitTime?: number } {
    const quota = this.getQuota(userId);
    if (!quota) {
      return {
        canExecute: true,
        schedule: Array(requestCount).fill(null).map(() => new Date()),
      };
    }

    const resourceQuota = quota[resource];
    
    if (resourceQuota.remaining < requestCount) {
      return {
        canExecute: false,
        schedule: [],
        waitTime: this.getWaitTime(userId, resource),
      };
    }

    // Create optimal schedule
    const schedule: Date[] = [];
    const now = Date.now();
    const resetTime = resourceQuota.reset.getTime();
    const interval = Math.max(1000, (resetTime - now) / requestCount); // At least 1 second between requests

    for (let i = 0; i < requestCount; i++) {
      schedule.push(new Date(now + i * interval));
    }

    return { canExecute: true, schedule };
  }

  // Private methods

  private checkQuotaAlerts(userId: string, quota: QuotaLimits): void {
    for (const [resource, data] of Object.entries(quota)) {
      const percentage = data.remaining / data.limit;
      let alertType: QuotaAlert['type'] | null = null;

      if (data.remaining === 0) {
        alertType = 'exhausted';
      } else if (percentage <= this.criticalThreshold) {
        alertType = 'critical';
      } else if (percentage <= this.warningThreshold) {
        alertType = 'warning';
      }

      if (alertType) {
        const alert: QuotaAlert = {
          type: alertType,
          resource,
          remaining: data.remaining,
          limit: data.limit,
          resetTime: data.reset,
          message: this.generateAlertMessage(alertType, resource, data.remaining, data.limit, data.reset),
        };

        this.alertHandlers.forEach(handler => {
          try {
            handler(alert);
          } catch (error) {
            console.error('Error in quota alert handler:', error);
          }
        });
      }
    }
  }

  private generateAlertMessage(
    type: QuotaAlert['type'],
    resource: string,
    remaining: number,
    limit: number,
    reset: Date
  ): string {
    const percentage = Math.round((remaining / limit) * 100);
    const resetIn = Math.round((reset.getTime() - Date.now()) / (60 * 1000));

    switch (type) {
      case 'exhausted':
        return `GitHub ${resource} quota exhausted. Resets in ${resetIn} minutes.`;
      case 'critical':
        return `GitHub ${resource} quota critically low: ${remaining}/${limit} (${percentage}%) remaining. Resets in ${resetIn} minutes.`;
      case 'warning':
        return `GitHub ${resource} quota low: ${remaining}/${limit} (${percentage}%) remaining. Resets in ${resetIn} minutes.`;
      default:
        return `GitHub ${resource} quota alert: ${remaining}/${limit} remaining.`;
    }
  }

  private getResourceStatus(remaining: number, limit: number): 'ok' | 'warning' | 'critical' | 'exhausted' {
    if (remaining === 0) return 'exhausted';
    
    const percentage = remaining / limit;
    if (percentage <= this.criticalThreshold) return 'critical';
    if (percentage <= this.warningThreshold) return 'warning';
    
    return 'ok';
  }

  private getUsageRate(userId: string, resource: keyof QuotaLimits): number {
    // This would calculate requests per minute based on historical data
    // For now, returning a placeholder
    return 1; // 1 request per minute
  }

  private async persistQuota(userId: string, quota: QuotaLimits): Promise<void> {
    try {
      const quotaRecord: Omit<GitHubApiQuota, 'id'> = {
        user_id: userId,
        rate_limit_remaining: quota.core.remaining,
        rate_limit_reset: quota.core.reset.toISOString(),
        core_remaining: quota.core.remaining,
        core_reset: quota.core.reset.toISOString(),
        search_remaining: quota.search.remaining,
        search_reset: quota.search.reset.toISOString(),
        graphql_remaining: quota.graphql.remaining,
        graphql_reset: quota.graphql.reset.toISOString(),
        integration_manifest_remaining: quota.integration_manifest.remaining,
        integration_manifest_reset: quota.integration_manifest.reset.toISOString(),
        source_import_remaining: quota.source_import.remaining,
        source_import_reset: quota.source_import.reset.toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store in database
      console.log('Persisting quota for user:', userId, quotaRecord);
    } catch (error) {
      console.error('Failed to persist quota:', error);
    }
  }
}

/**
 * Request throttling and queuing
 */
export class GitHubRequestThrottler {
  private requestQueue: Array<{
    userId: string;
    resource: keyof QuotaLimits;
    request: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: number;
    timestamp: number;
  }> = [];

  private processing = false;
  private quotaManager: GitHubQuotaManager;

  constructor(quotaManager: GitHubQuotaManager) {
    this.quotaManager = quotaManager;
  }

  /**
   * Queue a request with throttling
   */
  async throttledRequest<T>(
    userId: string,
    request: () => Promise<T>,
    options: {
      resource?: keyof QuotaLimits;
      priority?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { resource = 'core', priority = 5, timeout = 30000 } = options;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      const wrappedResolve = (value: T) => {
        clearTimeout(timeoutId);
        resolve(value);
      };

      const wrappedReject = (error: any) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      this.requestQueue.push({
        userId,
        resource,
        request,
        resolve: wrappedResolve,
        reject: wrappedReject,
        priority,
        timestamp: Date.now(),
      });

      this.requestQueue.sort((a, b) => {
        // Sort by priority (higher first), then by timestamp (older first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift();
      if (!item) continue;

      try {
        // Check if we can make the request
        if (!this.quotaManager.canMakeRequest(item.userId, item.resource)) {
          const waitTime = this.quotaManager.getWaitTime(item.userId, item.resource);
          
          if (waitTime > 0) {
            // Put request back in queue and wait
            this.requestQueue.unshift(item);
            await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000))); // Max 1 minute wait
            continue;
          }
        }

        // Execute the request
        const result = await item.request();
        item.resolve(result);

      } catch (error) {
        item.reject(error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; processing: boolean } {
    return {
      size: this.requestQueue.length,
      processing: this.processing,
    };
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.requestQueue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
  }
}

/**
 * Quota monitoring and reporting
 */
export class GitHubQuotaMonitor {
  private quotaManager: GitHubQuotaManager;
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor(quotaManager: GitHubQuotaManager) {
    this.quotaManager = quotaManager;
  }

  /**
   * Start monitoring quota usage
   */
  startMonitoring(intervalMinutes: number = 5): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    this.reportingInterval = setInterval(() => {
      this.generateQuotaReport();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
  }

  /**
   * Generate quota usage report
   */
  private generateQuotaReport(): void {
    // This would generate comprehensive quota reports
    console.log('Generating quota usage report...');
    
    // Report would include:
    // - Current quota levels for all users
    // - Usage patterns and trends
    // - Alerts and recommendations
    // - Cost analysis (if using GitHub Apps)
  }

  /**
   * Get quota dashboard data
   */
  getDashboardData(): any {
    return {
      totalUsers: 0, // Count of users with GitHub integration
      quotaAlerts: [], // Current quota alerts
      usageStats: {}, // Usage statistics
      recommendations: [], // Optimization recommendations
    };
  }
}

// Export singleton instances
export const quotaManager = new GitHubQuotaManager();
export const requestThrottler = new GitHubRequestThrottler(quotaManager);
export const quotaMonitor = new GitHubQuotaMonitor(quotaManager);

// Export factory functions
export function createQuotaManager(): GitHubQuotaManager {
  return new GitHubQuotaManager();
}

export function createRequestThrottler(quotaManager: GitHubQuotaManager): GitHubRequestThrottler {
  return new GitHubRequestThrottler(quotaManager);
}