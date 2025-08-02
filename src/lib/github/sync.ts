import { GitHubClient, createAuthenticatedGitHubClient } from './client';
import { createAuthenticatedGitHubImporter } from './import';
import { db } from '@/lib/supabase/database';
import type {
  GitHubRepositorySync,
  GitHubSyncJob,
  GitHubSyncJobLog,
  GitHubRepository,
  GitHubCommit,
  GitHubRelease,
  Agent,
  GitHubWebhookEvent,
  GitHubSyncEvent
} from '@/types';

export interface SyncOptions {
  force?: boolean;
  dryRun?: boolean;
  skipWebhooks?: boolean;
  branch?: string;
  updateMetadata?: boolean;
  updateContent?: boolean;
}

export interface SyncResult {
  success: boolean;
  jobId?: string;
  changes: {
    metadata: boolean;
    content: boolean;
    version: boolean;
    tags: boolean;
  };
  errors: string[];
  warnings: string[];
  stats: {
    commits_processed: number;
    files_updated: number;
    processing_time_ms: number;
  };
}

export class GitHubSyncService {
  private client: GitHubClient;
  private eventHandlers: Map<GitHubSyncEvent, Array<(payload: any, context: any) => Promise<void>>> = new Map();

  constructor(token?: string) {
    this.client = token ? createAuthenticatedGitHubClient(token) : new GitHubClient();
    this.setupDefaultEventHandlers();
  }

  /**
   * Sync a specific repository
   */
  async syncRepository(repositorySync: GitHubRepositorySync, options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    
    // Create sync job
    const syncJob = await this.createSyncJob(repositorySync.id, 'full_sync');
    
    try {
      await this.updateSyncJobStatus(syncJob.id, 'running');
      
      const result = await this.performSync(repositorySync, syncJob, options);
      
      await this.updateSyncJobStatus(syncJob.id, result.success ? 'completed' : 'failed');
      
      result.stats.processing_time_ms = Date.now() - startTime;
      result.jobId = syncJob.id;
      
      return result;
    } catch (error) {
      await this.updateSyncJobStatus(syncJob.id, 'failed');
      await this.logSyncJob(syncJob.id, 'error', `Sync failed: ${error}`);
      
      return {
        success: false,
        jobId: syncJob.id,
        changes: { metadata: false, content: false, version: false, tags: false },
        errors: [String(error)],
        warnings: [],
        stats: {
          commits_processed: 0,
          files_updated: 0,
          processing_time_ms: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Sync all repositories for a user
   */
  async syncUserRepositories(userId: string, options: SyncOptions = {}): Promise<SyncResult[]> {
    // Get user's repository syncs
    const repositorySyncs = await this.getUserRepositorySyncs(userId);
    
    const results: SyncResult[] = [];
    
    for (const repoSync of repositorySyncs) {
      if (repoSync.sync_enabled) {
        try {
          const result = await this.syncRepository(repoSync, options);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            changes: { metadata: false, content: false, version: false, tags: false },
            errors: [String(error)],
            warnings: [],
            stats: { commits_processed: 0, files_updated: 0, processing_time_ms: 0 },
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Sync repositories that haven't been synced recently
   */
  async syncStaleRepositories(maxAgeHours: number = 24): Promise<SyncResult[]> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
    
    // Get stale repository syncs
    const staleRepos = await this.getStaleRepositorySyncs(cutoffTime);
    
    const results: SyncResult[] = [];
    
    for (const repoSync of staleRepos) {
      try {
        const result = await this.syncRepository(repoSync, { updateMetadata: true });
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          changes: { metadata: false, content: false, version: false, tags: false },
          errors: [String(error)],
          warnings: [],
          stats: { commits_processed: 0, files_updated: 0, processing_time_ms: 0 },
        });
      }
    }
    
    return results;
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(event: GitHubWebhookEvent, payload: any): Promise<void> {
    const { repository, action } = payload;
    
    if (!repository) return;
    
    // Find repository sync
    const repoSync = await this.getRepositorySyncByFullName(repository.full_name);
    if (!repoSync || !repoSync.sync_enabled) return;
    
    // Determine sync event type
    let syncEvent: GitHubSyncEvent;
    
    switch (event.action) {
      case 'push':
        syncEvent = 'push';
        break;
      case 'release':
        if (action === 'published') syncEvent = 'release.published';
        else if (action === 'updated') syncEvent = 'release.updated';
        else if (action === 'deleted') syncEvent = 'release.deleted';
        else return;
        break;
      case 'repository':
        if (action === 'created') syncEvent = 'repository.created';
        else if (action === 'updated') syncEvent = 'repository.updated';
        else if (action === 'deleted') syncEvent = 'repository.deleted';
        else if (action === 'publicized') syncEvent = 'repository.publicized';
        else if (action === 'privatized') syncEvent = 'repository.privatized';
        else return;
        break;
      case 'star':
        if (action === 'created') syncEvent = 'star.created';
        else if (action === 'deleted') syncEvent = 'star.deleted';
        else return;
        break;
      case 'fork':
        syncEvent = 'fork';
        break;
      case 'issues':
        if (action === 'opened') syncEvent = 'issues.opened';
        else if (action === 'closed') syncEvent = 'issues.closed';
        else return;
        break;
      case 'pull_request':
        if (action === 'opened') syncEvent = 'pull_request.opened';
        else if (action === 'closed') syncEvent = 'pull_request.closed';
        else if (action === 'merged') syncEvent = 'pull_request.merged';
        else return;
        break;
      case 'watch':
        if (action === 'started') syncEvent = 'watch.started';
        else if (action === 'stopped') syncEvent = 'watch.stopped';
        else return;
        break;
      default:
        return;
    }
    
    // Handle the event
    await this.triggerSyncEvent(syncEvent, payload, { repository_sync: repoSync });
  }

  /**
   * Setup webhook for repository
   */
  async setupWebhook(repositorySync: GitHubRepositorySync, webhookUrl: string, secret?: string): Promise<number> {
    const { owner, repo } = this.parseFullName(repositorySync.repository_full_name);
    
    const webhook = await this.client.createWebhook(
      owner,
      repo,
      {
        url: webhookUrl,
        content_type: 'json',
        secret,
      },
      [
        'push',
        'release',
        'repository',
        'star',
        'fork',
        'issues',
        'pull_request',
        'watch',
      ]
    );
    
    // Update repository sync with webhook ID
    await this.updateRepositorySync(repositorySync.id, { webhook_id: webhook.id });
    
    return webhook.id;
  }

  /**
   * Remove webhook for repository
   */
  async removeWebhook(repositorySync: GitHubRepositorySync): Promise<void> {
    if (!repositorySync.webhook_id) return;
    
    const { owner, repo } = this.parseFullName(repositorySync.repository_full_name);
    
    try {
      await this.client.deleteWebhook(owner, repo, repositorySync.webhook_id);
      await this.updateRepositorySync(repositorySync.id, { webhook_id: null });
    } catch (error) {
      // Webhook might already be deleted, just update our record
      await this.updateRepositorySync(repositorySync.id, { webhook_id: null });
    }
  }

  /**
   * Register event handler
   */
  onSyncEvent(event: GitHubSyncEvent, handler: (payload: any, context: any) => Promise<void>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Trigger sync event
   */
  private async triggerSyncEvent(event: GitHubSyncEvent, payload: any, context: any): Promise<void> {
    const handlers = this.eventHandlers.get(event) || [];
    
    for (const handler of handlers) {
      try {
        await handler(payload, context);
      } catch (error) {
        console.error(`Error in sync event handler for ${event}:`, error);
      }
    }
  }

  // Private implementation methods

  private async performSync(
    repositorySync: GitHubRepositorySync,
    syncJob: GitHubSyncJob,
    options: SyncOptions
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      changes: { metadata: false, content: false, version: false, tags: false },
      errors: [],
      warnings: [],
      stats: { commits_processed: 0, files_updated: 0, processing_time_ms: 0 },
    };

    await this.logSyncJob(syncJob.id, 'info', 'Starting repository sync');

    try {
      // Get repository data
      const { owner, repo } = this.parseFullName(repositorySync.repository_full_name);
      const repository = await this.client.getRepository(owner, repo);
      
      // Get agent
      const agent = await db.getAgentById(repositorySync.agent_id);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Check for changes since last sync
      const hasChanges = await this.detectChanges(repositorySync, repository, agent);
      
      if (!hasChanges && !options.force) {
        await this.logSyncJob(syncJob.id, 'info', 'No changes detected, skipping sync');
        result.success = true;
        return result;
      }

      // Perform sync operations
      if (options.updateMetadata !== false) {
        const metadataChanges = await this.syncMetadata(repository, agent, syncJob.id);
        result.changes.metadata = metadataChanges;
      }

      if (options.updateContent !== false) {
        const contentChanges = await this.syncContent(repository, agent, syncJob.id, repositorySync.config);
        result.changes.content = contentChanges;
      }

      // Update version from releases
      const versionChanges = await this.syncVersion(repository, agent, syncJob.id);
      result.changes.version = versionChanges;

      // Update tags from topics
      const tagChanges = await this.syncTags(repository, agent, syncJob.id);
      result.changes.tags = tagChanges;

      // Update repository sync record
      await this.updateRepositorySync(repositorySync.id, {
        last_sync_at: new Date().toISOString(),
        last_commit_sha: await this.getLatestCommitSha(owner, repo),
        sync_status: 'success',
        sync_error: null,
      });

      await this.logSyncJob(syncJob.id, 'info', 'Repository sync completed successfully');
      result.success = true;

    } catch (error) {
      await this.logSyncJob(syncJob.id, 'error', `Sync failed: ${error}`);
      result.errors.push(String(error));
      
      // Update repository sync status
      await this.updateRepositorySync(repositorySync.id, {
        sync_status: 'error',
        sync_error: String(error),
      });
    }

    return result;
  }

  private async syncMetadata(repository: GitHubRepository, agent: Agent, jobId: string): Promise<boolean> {
    const updates: Partial<Agent> = {};
    let hasChanges = false;

    // Update GitHub stats
    if (agent.github_stars !== repository.stargazers_count) {
      updates.github_stars = repository.stargazers_count;
      hasChanges = true;
    }

    if (agent.github_forks !== repository.forks_count) {
      updates.github_forks = repository.forks_count;
      hasChanges = true;
    }

    // Update description if repository description changed
    if (repository.description && repository.description !== agent.description) {
      updates.description = repository.description;
      hasChanges = true;
    }

    // Update homepage URL
    if (repository.homepage !== agent.homepage_url) {
      updates.homepage_url = repository.homepage || undefined;
      hasChanges = true;
    }

    // Update license
    if (repository.license?.name !== agent.license) {
      updates.license = repository.license?.name;
      hasChanges = true;
    }

    if (hasChanges) {
      await db.updateAgent(agent.id, updates);
      await this.logSyncJob(jobId, 'info', `Updated agent metadata: ${Object.keys(updates).join(', ')}`);
    }

    return hasChanges;
  }

  private async syncContent(
    repository: GitHubRepository,
    agent: Agent,
    jobId: string,
    config: GitHubRepositorySync['config']
  ): Promise<boolean> {
    if (!config.readme_as_description) return false;

    try {
      const { owner, repo } = this.parseFullName(repository.full_name);
      const readme = await this.client.getRepositoryReadme(owner, repo, config.branch);
      
      if (readme && readme !== agent.detailed_description) {
        await db.updateAgent(agent.id, { detailed_description: readme });
        await this.logSyncJob(jobId, 'info', 'Updated agent description from README');
        return true;
      }
    } catch (error) {
      await this.logSyncJob(jobId, 'warn', `Failed to sync README: ${error}`);
    }

    return false;
  }

  private async syncVersion(repository: GitHubRepository, agent: Agent, jobId: string): Promise<boolean> {
    try {
      const { owner, repo } = this.parseFullName(repository.full_name);
      const latestRelease = await this.client.getLatestRelease(owner, repo);
      
      if (latestRelease) {
        const version = latestRelease.tag_name.replace(/^v/, '');
        if (version !== agent.version) {
          await db.updateAgent(agent.id, { version });
          await this.logSyncJob(jobId, 'info', `Updated version to ${version} from latest release`);
          return true;
        }
      }
    } catch (error) {
      await this.logSyncJob(jobId, 'debug', `No releases found or failed to fetch: ${error}`);
    }

    return false;
  }

  private async syncTags(repository: GitHubRepository, agent: Agent, jobId: string): Promise<boolean> {
    if (!repository.topics || repository.topics.length === 0) return false;

    const newTags = [...new Set([...agent.tags, ...repository.topics])];
    
    if (newTags.length !== agent.tags.length || !newTags.every(tag => agent.tags.includes(tag))) {
      await db.updateAgent(agent.id, { tags: newTags });
      await this.logSyncJob(jobId, 'info', `Updated tags from repository topics: ${repository.topics.join(', ')}`);
      return true;
    }

    return false;
  }

  private async detectChanges(
    repositorySync: GitHubRepositorySync,
    repository: GitHubRepository,
    agent: Agent
  ): Promise<boolean> {
    // Check if repository was updated since last sync
    if (repositorySync.last_sync_at && repository.updated_at <= repositorySync.last_sync_at) {
      return false;
    }

    // Check for new commits
    if (repositorySync.last_commit_sha) {
      const { owner, repo } = this.parseFullName(repository.full_name);
      const latestCommit = await this.client.getLatestCommit(owner, repo);
      
      if (latestCommit && latestCommit.sha === repositorySync.last_commit_sha) {
        return false;
      }
    }

    return true;
  }

  private async getLatestCommitSha(owner: string, repo: string): Promise<string | null> {
    try {
      const commit = await this.client.getLatestCommit(owner, repo);
      return commit?.sha || null;
    } catch {
      return null;
    }
  }

  private parseFullName(fullName: string): { owner: string; repo: string } {
    const [owner, repo] = fullName.split('/');
    return { owner, repo };
  }

  // Database operations

  private async createSyncJob(repositorySyncId: string, jobType: GitHubSyncJob['job_type']): Promise<GitHubSyncJob> {
    // This would be implemented with actual database calls
    // For now, returning a mock object
    return {
      id: `sync_job_${Date.now()}`,
      repository_sync_id: repositorySyncId,
      job_type: jobType,
      status: 'pending',
      progress: 0,
      logs: [],
      metadata: {},
      created_at: new Date().toISOString(),
    };
  }

  private async updateSyncJobStatus(jobId: string, status: GitHubSyncJob['status']): Promise<void> {
    // Update sync job status in database
    console.log(`Updating sync job ${jobId} status to ${status}`);
  }

  private async logSyncJob(jobId: string, level: GitHubSyncJobLog['level'], message: string, metadata?: any): Promise<void> {
    // Log sync job message to database
    console.log(`[${level.toUpperCase()}] Sync Job ${jobId}: ${message}`, metadata);
  }

  private async getUserRepositorySyncs(userId: string): Promise<GitHubRepositorySync[]> {
    // Get user's repository syncs from database
    return [];
  }

  private async getStaleRepositorySyncs(cutoffTime: string): Promise<GitHubRepositorySync[]> {
    // Get stale repository syncs from database
    return [];
  }

  private async getRepositorySyncByFullName(fullName: string): Promise<GitHubRepositorySync | null> {
    // Get repository sync by full name from database
    return null;
  }

  private async updateRepositorySync(id: string, updates: Partial<GitHubRepositorySync>): Promise<void> {
    // Update repository sync in database
    console.log(`Updating repository sync ${id}:`, updates);
  }

  // Default event handlers

  private setupDefaultEventHandlers(): void {
    // Handle push events
    this.onSyncEvent('push', async (payload, context) => {
      const { repository_sync } = context;
      if (repository_sync.auto_update) {
        await this.syncRepository(repository_sync, { updateContent: true });
      }
    });

    // Handle release events
    this.onSyncEvent('release.published', async (payload, context) => {
      const { repository_sync } = context;
      await this.syncRepository(repository_sync, { updateMetadata: true });
    });

    // Handle repository updates
    this.onSyncEvent('repository.updated', async (payload, context) => {
      const { repository_sync } = context;
      await this.syncRepository(repository_sync, { updateMetadata: true });
    });

    // Handle star changes
    this.onSyncEvent('star.created', async (payload, context) => {
      const { repository_sync } = context;
      await this.syncRepository(repository_sync, { updateMetadata: true });
    });

    this.onSyncEvent('star.deleted', async (payload, context) => {
      const { repository_sync } = context;
      await this.syncRepository(repository_sync, { updateMetadata: true });
    });

    // Handle fork events
    this.onSyncEvent('fork', async (payload, context) => {
      const { repository_sync } = context;
      await this.syncRepository(repository_sync, { updateMetadata: true });
    });
  }
}

// Export default instance
export const githubSyncer = new GitHubSyncService();

// Export authenticated syncer factory
export function createAuthenticatedGitHubSyncer(token: string): GitHubSyncService {
  return new GitHubSyncService(token);
}