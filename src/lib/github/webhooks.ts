import { Webhooks } from '@octokit/webhooks';
import { createHmac } from 'crypto';
import type { GitHubWebhookEvent, GitHubWebhookPayload } from '@/types';

export interface WebhookHandlerOptions {
  secret?: string;
  path?: string;
  log?: typeof console;
}

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
}

export class GitHubWebhookHandler {
  private webhooks?: Webhooks;
  private secret?: string;
  private log: typeof console;

  constructor(options: WebhookHandlerOptions = {}) {
    this.secret = options.secret;
    this.log = options.log || console;

    if (this.secret) {
      this.webhooks = new Webhooks({
        secret: this.secret,
        log: this.log,
      });
    }
  }

  /**
   * Validate webhook signature
   */
  validateSignature(payload: string, signature: string): WebhookValidationResult {
    if (!this.secret) {
      return { valid: true }; // No secret configured, skip validation
    }

    if (!signature) {
      return { valid: false, error: 'Missing signature' };
    }

    try {
      const expectedSignature = this.generateSignature(payload, this.secret);
      const isValid = this.compareSignatures(signature, expectedSignature);
      
      return { valid: isValid, error: isValid ? undefined : 'Invalid signature' };
    } catch (error) {
      return { valid: false, error: `Signature validation failed: ${error}` };
    }
  }

  /**
   * Parse webhook payload
   */
  parsePayload(body: string, headers: Record<string, string>): GitHubWebhookEvent | null {
    try {
      const eventType = headers['x-github-event'];
      const deliveryId = headers['x-github-delivery'];
      
      if (!eventType) {
        throw new Error('Missing x-github-event header');
      }

      const payload = JSON.parse(body);
      
      return {
        action: eventType,
        repository: payload.repository,
        sender: payload.sender,
        installation: payload.installation,
      };
    } catch (error) {
      this.log.error('Failed to parse webhook payload:', error);
      return null;
    }
  }

  /**
   * Store webhook payload for processing
   */
  async storeWebhookPayload(
    eventType: string,
    payload: any,
    signature: string,
    deliveryId: string
  ): Promise<string> {
    const webhookPayload: Omit<GitHubWebhookPayload, 'id' | 'created_at'> = {
      webhook_id: 0, // This should be set based on the webhook
      event_type: eventType,
      action: payload.action,
      payload,
      signature,
      delivery_id: deliveryId,
      processed: false,
    };

    // Store in database and return ID
    // This would be implemented with actual database calls
    const id = `webhook_${Date.now()}`;
    console.log('Storing webhook payload:', id, webhookPayload);
    
    return id;
  }

  /**
   * Mark webhook payload as processed
   */
  async markPayloadProcessed(payloadId: string, error?: string): Promise<void> {
    console.log(`Marking webhook payload ${payloadId} as processed`, error ? `with error: ${error}` : '');
    
    // Update database record
    // This would be implemented with actual database calls
  }

  /**
   * Handle different webhook events
   */
  setupEventHandlers(handlers: {
    onPush?: (payload: any) => Promise<void>;
    onRelease?: (payload: any) => Promise<void>;
    onRepository?: (payload: any) => Promise<void>;
    onStar?: (payload: any) => Promise<void>;
    onFork?: (payload: any) => Promise<void>;
    onIssues?: (payload: any) => Promise<void>;
    onPullRequest?: (payload: any) => Promise<void>;
    onWatch?: (payload: any) => Promise<void>;
    onError?: (error: Error, payload?: any) => Promise<void>;
  }): void {
    if (!this.webhooks) {
      throw new Error('Webhooks instance not initialized. Secret is required for event handlers.');
    }

    if (handlers.onPush) {
      this.webhooks.on('push', handlers.onPush);
    }

    if (handlers.onRelease) {
      this.webhooks.on(['release.published', 'release.edited', 'release.deleted'], handlers.onRelease);
    }

    if (handlers.onRepository) {
      this.webhooks.on([
        'repository.created',
        'repository.edited',
        'repository.deleted',
        'repository.publicized',
        'repository.privatized'
      ], handlers.onRepository);
    }

    if (handlers.onStar) {
      this.webhooks.on(['star.created', 'star.deleted'], handlers.onStar);
    }

    if (handlers.onFork) {
      this.webhooks.on('fork', handlers.onFork);
    }

    if (handlers.onIssues) {
      this.webhooks.on(['issues.opened', 'issues.closed', 'issues.edited'], handlers.onIssues);
    }

    if (handlers.onPullRequest) {
      this.webhooks.on([
        'pull_request.opened',
        'pull_request.closed',
        'pull_request.edited'
      ], handlers.onPullRequest);
    }

    if (handlers.onWatch) {
      this.webhooks.on('watch', handlers.onWatch);
    }

    if (handlers.onError) {
      this.webhooks.onError(handlers.onError);
    }
  }

  /**
   * Process webhook with Octokit
   */
  async processWebhook(payload: string, signature: string, headers: Record<string, string>): Promise<void> {
    if (!this.webhooks) {
      throw new Error('Webhooks instance not initialized');
    }

    await this.webhooks.verifyAndReceive({
      id: headers['x-github-delivery'] || 'unknown',
      name: headers['x-github-event'] as any,
      signature,
      payload,
    });
  }

  /**
   * Validate webhook event types
   */
  isValidEventType(eventType: string): boolean {
    const validEvents = [
      'push',
      'release',
      'repository',
      'star',
      'fork',
      'issues',
      'pull_request',
      'watch',
      'ping',
    ];

    return validEvents.includes(eventType);
  }

  /**
   * Extract repository information from payload
   */
  extractRepositoryInfo(payload: any): { owner: string; repo: string; fullName: string } | null {
    if (!payload.repository) {
      return null;
    }

    const repository = payload.repository;
    return {
      owner: repository.owner.login,
      repo: repository.name,
      fullName: repository.full_name,
    };
  }

  /**
   * Check if payload indicates a significant change
   */
  isSignificantChange(eventType: string, payload: any): boolean {
    switch (eventType) {
      case 'push':
        // Only main/master branch pushes are significant
        const ref = payload.ref;
        return ref === 'refs/heads/main' || ref === 'refs/heads/master';
      
      case 'release':
        // Published releases are significant
        return payload.action === 'published';
      
      case 'repository':
        // Repository updates, publicity changes are significant
        return ['updated', 'publicized', 'privatized'].includes(payload.action);
      
      case 'star':
      case 'fork':
      case 'watch':
        // Social events are always significant for metrics
        return true;
      
      case 'issues':
      case 'pull_request':
        // Opening/closing is significant
        return ['opened', 'closed'].includes(payload.action);
      
      default:
        return false;
    }
  }

  /**
   * Rate limit webhook processing
   */
  private rateLimitCache = new Map<string, number>();
  
  shouldProcessWebhook(repositoryFullName: string, eventType: string): boolean {
    const key = `${repositoryFullName}:${eventType}`;
    const now = Date.now();
    const lastProcessed = this.rateLimitCache.get(key) || 0;
    
    // Limit processing to once per minute per repository per event type
    const rateLimitMs = 60 * 1000;
    
    if (now - lastProcessed < rateLimitMs) {
      return false;
    }
    
    this.rateLimitCache.set(key, now);
    
    // Clean up old entries
    if (this.rateLimitCache.size > 1000) {
      const cutoff = now - rateLimitMs * 2;
      for (const [k, v] of this.rateLimitCache.entries()) {
        if (v < cutoff) {
          this.rateLimitCache.delete(k);
        }
      }
    }
    
    return true;
  }

  // Private helper methods

  private generateSignature(payload: string, secret: string): string {
    return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  }

  private compareSignatures(signature1: string, signature2: string): boolean {
    if (signature1.length !== signature2.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature1.length; i++) {
      result |= signature1.charCodeAt(i) ^ signature2.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * Webhook processing utilities
 */
export class WebhookProcessor {
  private handler: GitHubWebhookHandler;
  private processingQueue: Array<{ payload: any; timestamp: number }> = [];
  private isProcessing = false;

  constructor(handler: GitHubWebhookHandler) {
    this.handler = handler;
  }

  /**
   * Queue webhook for processing
   */
  async queueWebhook(payload: any): Promise<void> {
    this.processingQueue.push({ payload, timestamp: Date.now() });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queued webhooks
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const item = this.processingQueue.shift();
      if (!item) continue;

      try {
        await this.processWebhookItem(item.payload);
      } catch (error) {
        console.error('Failed to process webhook:', error);
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  private async processWebhookItem(payload: any): Promise<void> {
    // Process individual webhook payload
    console.log('Processing webhook payload:', payload);
    
    // This would trigger the actual sync operations
    // Implementation would depend on the specific event type and payload
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; processing: boolean } {
    return {
      size: this.processingQueue.length,
      processing: this.isProcessing,
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.processingQueue = [];
  }
}

/**
 * Webhook security utilities
 */
export class WebhookSecurity {
  /**
   * Validate webhook source IP
   */
  static isValidGitHubIP(ip: string): boolean {
    // GitHub webhook IP ranges (these should be kept up to date)
    const githubRanges = [
      '192.30.252.0/22',
      '185.199.108.0/22',
      '140.82.112.0/20',
      '143.55.64.0/20',
      '2a0a:a440::/29',
      '2606:50c0::/32',
    ];

    // This is a simplified check - in production, you'd want to use a proper CIDR library
    return true; // Placeholder implementation
  }

  /**
   * Validate webhook timestamp
   */
  static isValidTimestamp(timestamp: string, toleranceMinutes: number = 5): boolean {
    try {
      const webhookTime = new Date(timestamp).getTime();
      const now = Date.now();
      const tolerance = toleranceMinutes * 60 * 1000;

      return Math.abs(now - webhookTime) <= tolerance;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize webhook payload
   */
  static sanitizePayload(payload: any): any {
    // Remove potentially sensitive fields
    const sensitiveFields = ['access_token', 'password', 'secret', 'private_key'];
    
    function removeSensitiveFields(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(removeSensitiveFields);
      }
      
      if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            cleaned[key] = removeSensitiveFields(value);
          }
        }
        return cleaned;
      }
      
      return obj;
    }

    return removeSensitiveFields(payload);
  }
}

// Export default webhook handler
export const webhookHandler = new GitHubWebhookHandler();

// Export factory for creating webhook handlers
export function createWebhookHandler(options: WebhookHandlerOptions): GitHubWebhookHandler {
  return new GitHubWebhookHandler(options);
}