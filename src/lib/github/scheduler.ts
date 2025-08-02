import * as cron from 'node-cron';
import { githubSyncer } from './sync';
import { quotaManager } from './quota';
import type { GitHubRepositorySync } from '@/types';

export interface SchedulerConfig {
  syncInterval: string; // Cron expression
  staleCheckInterval: string;
  quotaCheckInterval: string;
  maxConcurrentSyncs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface SchedulerStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  queuedJobs: number;
  runningJobs: number;
  lastRun: Date | null;
  nextRun: Date | null;
  averageJobTime: number;
}

export class GitHubScheduler {
  private config: SchedulerConfig;
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private runningJobs: Set<string> = new Set();
  private jobQueue: Array<() => Promise<void>> = [];
  private stats: SchedulerStats = {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    queuedJobs: 0,
    runningJobs: 0,
    lastRun: null,
    nextRun: null,
    averageJobTime: 0,
  };
  private jobTimes: number[] = [];

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      syncInterval: '0 */6 * * *', // Every 6 hours
      staleCheckInterval: '0 */2 * * *', // Every 2 hours
      quotaCheckInterval: '*/15 * * * *', // Every 15 minutes
      maxConcurrentSyncs: 5,
      maxRetries: 3,
      retryDelayMs: 5 * 60 * 1000, // 5 minutes
      ...config,
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    this.setupSyncJob();
    this.setupStaleCheckJob();
    this.setupQuotaCheckJob();
    this.startJobProcessor();
    
    console.log('GitHub scheduler started with config:', this.config);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`Stopped scheduled task: ${name}`);
    }
    this.tasks.clear();
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Schedule a custom job
   */
  scheduleJob(name: string, cronExpression: string, job: () => Promise<void>): void {
    if (this.tasks.has(name)) {
      throw new Error(`Job with name '${name}' already exists`);
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.executeJob(name, job);
    }, { scheduled: false });

    this.tasks.set(name, task);
    task.start();
    
    console.log(`Scheduled job '${name}' with expression '${cronExpression}'`);
  }

  /**
   * Cancel a scheduled job
   */
  cancelJob(name: string): boolean {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      console.log(`Cancelled job: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Queue a job for immediate execution
   */
  queueJob(job: () => Promise<void>): void {
    this.jobQueue.push(job);
    this.stats.queuedJobs++;
  }

  /**
   * Force sync of specific repository
   */
  async forceSyncRepository(repositorySync: GitHubRepositorySync): Promise<void> {
    await this.executeJob(`force-sync-${repositorySync.id}`, async () => {
      await githubSyncer.syncRepository(repositorySync, { force: true });
    });
  }

  /**
   * Force sync of all repositories for a user
   */
  async forceSyncUser(userId: string): Promise<void> {
    await this.executeJob(`force-sync-user-${userId}`, async () => {
      await githubSyncer.syncUserRepositories(userId, { force: true });
    });
  }

  // Private methods

  private setupSyncJob(): void {
    this.scheduleJob('regular-sync', this.config.syncInterval, async () => {
      console.log('Starting regular GitHub sync job');
      
      // Get repositories that need syncing
      const repositories = await this.getRepositoriesForSync();
      
      // Process in batches to respect rate limits
      const batchSize = this.config.maxConcurrentSyncs;
      for (let i = 0; i < repositories.length; i += batchSize) {
        const batch = repositories.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(repo => githubSyncer.syncRepository(repo))
        );
        
        // Wait between batches to avoid overwhelming GitHub API
        if (i + batchSize < repositories.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`Completed regular sync for ${repositories.length} repositories`);
    });
  }

  private setupStaleCheckJob(): void {
    this.scheduleJob('stale-check', this.config.staleCheckInterval, async () => {
      console.log('Starting stale repository check');
      
      const results = await githubSyncer.syncStaleRepositories(24); // 24 hours
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`Stale check completed: ${successful} successful, ${failed} failed`);
    });
  }

  private setupQuotaCheckJob(): void {
    this.scheduleJob('quota-check', this.config.quotaCheckInterval, async () => {
      // Check quota status for all users
      const users = await this.getAllGitHubUsers();
      
      for (const user of users) {
        const quota = quotaManager.getQuota(user.id);
        if (quota) {
          const status = quotaManager.getQuotaStatus(user.id);
          const criticalResources = status.filter(s => 
            s.status === 'critical' || s.status === 'exhausted'
          );
          
          if (criticalResources.length > 0) {
            console.warn(`User ${user.id} has critical quota status:`, criticalResources);
            // Could trigger notifications here
          }
        }
      }
    });
  }

  private startJobProcessor(): void {
    setInterval(() => {
      this.processJobQueue();
    }, 1000); // Check queue every second
  }

  private async processJobQueue(): Promise<void> {
    if (this.jobQueue.length === 0 || this.runningJobs.size >= this.config.maxConcurrentSyncs) {
      return;
    }

    const job = this.jobQueue.shift();
    if (!job) return;

    this.stats.queuedJobs--;
    
    await this.executeJob('queued-job', job);
  }

  private async executeJob(name: string, job: () => Promise<void>): Promise<void> {
    if (this.runningJobs.has(name)) {
      console.log(`Job ${name} already running, skipping`);
      return;
    }

    const startTime = Date.now();
    this.runningJobs.add(name);
    this.stats.runningJobs++;
    this.stats.totalJobs++;

    try {
      await this.executeWithRetry(job);
      this.stats.successfulJobs++;
      console.log(`Job ${name} completed successfully`);
    } catch (error) {
      this.stats.failedJobs++;
      console.error(`Job ${name} failed:`, error);
    } finally {
      const jobTime = Date.now() - startTime;
      this.jobTimes.push(jobTime);
      
      // Keep only last 100 job times for average calculation
      if (this.jobTimes.length > 100) {
        this.jobTimes.shift();
      }
      
      this.stats.averageJobTime = this.jobTimes.reduce((a, b) => a + b, 0) / this.jobTimes.length;
      this.stats.lastRun = new Date();
      this.stats.runningJobs--;
      this.runningJobs.delete(name);
    }
  }

  private async executeWithRetry(job: () => Promise<void>): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        await job();
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          console.log(`Job attempt ${attempt} failed, retrying in ${this.config.retryDelayMs}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }
    
    throw lastError;
  }

  private async getRepositoriesForSync(): Promise<GitHubRepositorySync[]> {
    // This would fetch from database
    // Return repositories that are enabled for sync
    return [];
  }

  private async getAllGitHubUsers(): Promise<Array<{ id: string }>> {
    // This would fetch from database
    // Return users with GitHub integration
    return [];
  }
}

/**
 * Job management utilities
 */
export class GitHubJobManager {
  private scheduler: GitHubScheduler;
  private jobHistory: Array<{
    id: string;
    name: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed';
    error?: string;
    metadata?: any;
  }> = [];

  constructor(scheduler: GitHubScheduler) {
    this.scheduler = scheduler;
  }

  /**
   * Create a sync job for specific repository
   */
  async createRepositorySyncJob(repositorySync: GitHubRepositorySync, options: {
    priority?: 'low' | 'normal' | 'high';
    delay?: number;
    force?: boolean;
  } = {}): Promise<string> {
    const jobId = `sync-${repositorySync.id}-${Date.now()}`;
    
    const job = async () => {
      await githubSyncer.syncRepository(repositorySync, { 
        force: options.force 
      });
    };

    if (options.delay) {
      setTimeout(() => {
        this.scheduler.queueJob(job);
      }, options.delay);
    } else {
      this.scheduler.queueJob(job);
    }

    return jobId;
  }

  /**
   * Create bulk sync job
   */
  async createBulkSyncJob(repositorySyncs: GitHubRepositorySync[]): Promise<string> {
    const jobId = `bulk-sync-${Date.now()}`;
    
    const job = async () => {
      const batchSize = 10;
      for (let i = 0; i < repositorySyncs.length; i += batchSize) {
        const batch = repositorySyncs.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(repo => githubSyncer.syncRepository(repo))
        );
        
        // Delay between batches
        if (i + batchSize < repositorySyncs.length) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    this.scheduler.queueJob(job);
    return jobId;
  }

  /**
   * Schedule periodic user sync
   */
  scheduleUserSync(userId: string, cronExpression: string): void {
    this.scheduler.scheduleJob(`user-sync-${userId}`, cronExpression, async () => {
      await githubSyncer.syncUserRepositories(userId);
    });
  }

  /**
   * Get job history
   */
  getJobHistory(limit: number = 50): typeof this.jobHistory {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Cancel all running jobs
   */
  cancelAllJobs(): void {
    // This would cancel all running and queued jobs
    console.log('Cancelling all GitHub sync jobs');
  }
}

/**
 * Sync optimization utilities
 */
export class GitHubSyncOptimizer {
  /**
   * Determine optimal sync schedule for repository
   */
  static getOptimalSyncSchedule(repositorySync: GitHubRepositorySync): string {
    // High activity repos: sync more frequently
    // Low activity repos: sync less frequently
    
    // This is a simplified implementation
    // In reality, you'd analyze commit frequency, stars, etc.
    
    const isHighActivity = true; // Placeholder logic
    
    if (isHighActivity) {
      return '0 */2 * * *'; // Every 2 hours
    } else {
      return '0 0 */3 * *'; // Every 3 days
    }
  }

  /**
   * Optimize sync order based on priority
   */
  static optimizeSyncOrder(repositories: GitHubRepositorySync[]): GitHubRepositorySync[] {
    return repositories.sort((a, b) => {
      // Sort by priority factors:
      // 1. Recently updated repositories first
      // 2. Repositories with more stars
      // 3. Repositories with auto-update enabled
      
      if (a.auto_update !== b.auto_update) {
        return a.auto_update ? -1 : 1;
      }
      
      // Add more sorting logic based on repository metadata
      return 0;
    });
  }

  /**
   * Calculate sync load and suggest optimal timing
   */
  static calculateSyncLoad(repositories: GitHubRepositorySync[]): {
    estimatedTime: number;
    recommendedBatchSize: number;
    suggestedDelay: number;
  } {
    const avgSyncTime = 30000; // 30 seconds per repository (estimated)
    const estimatedTime = repositories.length * avgSyncTime;
    
    return {
      estimatedTime,
      recommendedBatchSize: Math.min(10, Math.max(1, Math.floor(repositories.length / 10))),
      suggestedDelay: Math.max(1000, estimatedTime / repositories.length),
    };
  }
}

// Export singleton scheduler
export const githubScheduler = new GitHubScheduler();

// Export factory function
export function createGitHubScheduler(config?: Partial<SchedulerConfig>): GitHubScheduler {
  return new GitHubScheduler(config);
}