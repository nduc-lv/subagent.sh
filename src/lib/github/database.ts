import { supabase } from '@/lib/supabase/client';
import type {
  GitHubIntegrationConfig,
  GitHubRepositorySync,
  GitHubSyncJob,
  GitHubSyncJobLog,
  GitHubWebhookPayload,
  GitHubApiQuota,
  GitHubRepositoryAnalysis,
  GitHubUserProfile,
  GitHubRepositoryMetrics
} from '@/types';

export class GitHubDatabase {
  private client = supabase;

  // GitHub Integration Config operations
  async createGitHubIntegration(integration: Omit<GitHubIntegrationConfig, 'id' | 'created_at' | 'updated_at'>): Promise<GitHubIntegrationConfig> {
    const { data, error } = await this.client
      .from('github_integrations')
      .insert(integration)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getGitHubIntegration(userId: string): Promise<GitHubIntegrationConfig | null> {
    const { data, error } = await this.client
      .from('github_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateGitHubIntegration(id: string, updates: Partial<GitHubIntegrationConfig>): Promise<GitHubIntegrationConfig> {
    const { data, error } = await this.client
      .from('github_integrations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteGitHubIntegration(id: string): Promise<void> {
    const { error } = await this.client
      .from('github_integrations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // Repository Sync operations
  async createRepositorySync(repoSync: Omit<GitHubRepositorySync, 'id' | 'created_at' | 'updated_at'>): Promise<GitHubRepositorySync> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .insert(repoSync)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRepositorySync(id: string): Promise<GitHubRepositorySync | null> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRepositorySyncByAgentId(agentId: string): Promise<GitHubRepositorySync | null> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRepositorySyncByFullName(fullName: string): Promise<GitHubRepositorySync | null> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select('*')
      .eq('repository_full_name', fullName)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUserRepositorySyncs(userId: string): Promise<GitHubRepositorySync[]> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select(`
        *,
        agents:agent_id(id, name, author_id)
      `)
      .eq('agents.author_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getEnabledRepositorySyncs(): Promise<GitHubRepositorySync[]> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select('*')
      .eq('sync_enabled', true)
      .order('last_sync_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data || [];
  }

  async getStaleRepositorySyncs(cutoffTime: string): Promise<GitHubRepositorySync[]> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select('*')
      .eq('sync_enabled', true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${cutoffTime}`)
      .order('last_sync_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data || [];
  }

  async updateRepositorySync(id: string, updates: Partial<GitHubRepositorySync>): Promise<GitHubRepositorySync> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRepositorySync(id: string): Promise<void> {
    const { error } = await this.client
      .from('github_repository_syncs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Sync Job operations
  async createSyncJob(syncJob: Omit<GitHubSyncJob, 'id' | 'created_at'>): Promise<GitHubSyncJob> {
    const { data, error } = await this.client
      .from('github_sync_jobs')
      .insert(syncJob)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSyncJob(id: string): Promise<GitHubSyncJob | null> {
    const { data, error } = await this.client
      .from('github_sync_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRepositorySyncJobs(repositorySyncId: string, limit: number = 20): Promise<GitHubSyncJob[]> {
    const { data, error } = await this.client
      .from('github_sync_jobs')
      .select('*')
      .eq('repository_sync_id', repositorySyncId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getActiveSyncJobs(): Promise<GitHubSyncJob[]> {
    const { data, error } = await this.client
      .from('github_sync_jobs')
      .select('*')
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateSyncJob(id: string, updates: Partial<GitHubSyncJob>): Promise<GitHubSyncJob> {
    const { data, error } = await this.client
      .from('github_sync_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async completeSyncJob(id: string, status: 'completed' | 'failed', metadata?: any): Promise<GitHubSyncJob> {
    const updates: Partial<GitHubSyncJob> = {
      status,
      completed_at: new Date().toISOString(),
      progress: 100,
    };

    if (metadata) {
      updates.metadata = metadata;
    }

    return this.updateSyncJob(id, updates);
  }

  // Sync Job Log operations
  async createSyncJobLog(log: Omit<GitHubSyncJobLog, 'id' | 'created_at'>): Promise<GitHubSyncJobLog> {
    const { data, error } = await this.client
      .from('github_sync_job_logs')
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSyncJobLogs(syncJobId: string): Promise<GitHubSyncJobLog[]> {
    const { data, error } = await this.client
      .from('github_sync_job_logs')
      .select('*')
      .eq('sync_job_id', syncJobId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Webhook Payload operations
  async createWebhookPayload(payload: Omit<GitHubWebhookPayload, 'id' | 'created_at'>): Promise<GitHubWebhookPayload> {
    const { data, error } = await this.client
      .from('github_webhook_payloads')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWebhookPayload(id: string): Promise<GitHubWebhookPayload | null> {
    const { data, error } = await this.client
      .from('github_webhook_payloads')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUnprocessedWebhookPayloads(limit: number = 50): Promise<GitHubWebhookPayload[]> {
    const { data, error } = await this.client
      .from('github_webhook_payloads')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async markWebhookPayloadProcessed(id: string, error?: string): Promise<void> {
    const updates: Partial<GitHubWebhookPayload> = {
      processed: true,
      processed_at: new Date().toISOString(),
    };

    if (error) {
      updates.error = error;
    }

    const { error: updateError } = await this.client
      .from('github_webhook_payloads')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;
  }

  // API Quota operations
  async upsertApiQuota(quota: Omit<GitHubApiQuota, 'id'>): Promise<GitHubApiQuota> {
    const { data, error } = await this.client
      .from('github_api_quotas')
      .upsert(quota, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getApiQuota(userId: string): Promise<GitHubApiQuota | null> {
    const { data, error } = await this.client
      .from('github_api_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getAllApiQuotas(): Promise<GitHubApiQuota[]> {
    const { data, error } = await this.client
      .from('github_api_quotas')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Repository Analysis operations
  async createRepositoryAnalysis(analysis: Omit<GitHubRepositoryAnalysis, 'id' | 'created_at'>): Promise<GitHubRepositoryAnalysis> {
    const { data, error } = await this.client
      .from('github_repository_analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRepositoryAnalysis(repositorySyncId: string, analysisType: GitHubRepositoryAnalysis['analysis_type']): Promise<GitHubRepositoryAnalysis | null> {
    const { data, error } = await this.client
      .from('github_repository_analyses')
      .select('*')
      .eq('repository_sync_id', repositorySyncId)
      .eq('analysis_type', analysisType)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRepositoryAnalyses(repositorySyncId: string): Promise<GitHubRepositoryAnalysis[]> {
    const { data, error } = await this.client
      .from('github_repository_analyses')
      .select('*')
      .eq('repository_sync_id', repositorySyncId)
      .order('analyzed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateRepositoryAnalysis(id: string, updates: Partial<GitHubRepositoryAnalysis>): Promise<GitHubRepositoryAnalysis> {
    const { data, error } = await this.client
      .from('github_repository_analyses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // User Profile operations
  async upsertGitHubUserProfile(profile: Omit<GitHubUserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<GitHubUserProfile> {
    const { data, error } = await this.client
      .from('github_user_profiles')
      .upsert(profile, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getGitHubUserProfile(userId: string): Promise<GitHubUserProfile | null> {
    const { data, error } = await this.client
      .from('github_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getGitHubUserProfiles(): Promise<GitHubUserProfile[]> {
    const { data, error } = await this.client
      .from('github_user_profiles')
      .select('*')
      .eq('sync_enabled', true)
      .order('last_sync_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data || [];
  }

  // Repository Metrics operations
  async createRepositoryMetrics(metrics: Omit<GitHubRepositoryMetrics, 'id' | 'created_at'>): Promise<GitHubRepositoryMetrics> {
    const { data, error } = await this.client
      .from('github_repository_metrics')
      .insert(metrics)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRepositoryMetrics(repositorySyncId: string, periodStart: string, periodEnd: string): Promise<GitHubRepositoryMetrics | null> {
    const { data, error } = await this.client
      .from('github_repository_metrics')
      .select('*')
      .eq('repository_sync_id', repositorySyncId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRepositoryMetricsHistory(repositorySyncId: string, limit: number = 12): Promise<GitHubRepositoryMetrics[]> {
    const { data, error } = await this.client
      .from('github_repository_metrics')
      .select('*')
      .eq('repository_sync_id', repositorySyncId)
      .order('period_start', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Cleanup operations
  async cleanupOldSyncJobs(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await this.client
      .from('github_sync_jobs')
      .delete()
      .lt('created_at', cutoffDate)
      .in('status', ['completed', 'failed']);

    if (error) throw error;
    return count || 0;
  }

  async cleanupOldWebhookPayloads(retentionDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await this.client
      .from('github_webhook_payloads')
      .delete()
      .lt('created_at', cutoffDate)
      .eq('processed', true);

    if (error) throw error;
    return count || 0;
  }

  async cleanupOldSyncJobLogs(retentionDays: number = 14): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await this.client
      .from('github_sync_job_logs')
      .delete()
      .lt('created_at', cutoffDate);

    if (error) throw error;
    return count || 0;
  }

  // Analytics and reporting
  async getSyncJobStats(repositorySyncId?: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    pending: number;
    running: number;
    avgDuration: number;
  }> {
    let query = this.client
      .from('github_sync_jobs')
      .select('status, started_at, completed_at');

    if (repositorySyncId) {
      query = query.eq('repository_sync_id', repositorySyncId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      successful: 0,
      failed: 0,
      pending: 0,
      running: 0,
      avgDuration: 0,
    };

    const durations: number[] = [];

    data?.forEach(job => {
      switch (job.status) {
        case 'completed':
          stats.successful++;
          if (job.started_at && job.completed_at) {
            durations.push(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime());
          }
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'running':
          stats.running++;
          break;
      }
    });

    if (durations.length > 0) {
      stats.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    return stats;
  }

  async getRepositorySyncStats(): Promise<{
    total: number;
    enabled: number;
    withWebhooks: number;
    autoUpdate: number;
    lastSyncDistribution: Record<string, number>;
  }> {
    const { data, error } = await this.client
      .from('github_repository_syncs')
      .select('sync_enabled, webhook_id, auto_update, last_sync_at');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      enabled: 0,
      withWebhooks: 0,
      autoUpdate: 0,
      lastSyncDistribution: {
        'never': 0,
        '< 1 hour': 0,
        '< 1 day': 0,
        '< 1 week': 0,
        '> 1 week': 0,
      },
    };

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    data?.forEach(repo => {
      if (repo.sync_enabled) stats.enabled++;
      if (repo.webhook_id) stats.withWebhooks++;
      if (repo.auto_update) stats.autoUpdate++;

      if (!repo.last_sync_at) {
        stats.lastSyncDistribution['never']++;
      } else {
        const timeSince = now - new Date(repo.last_sync_at).getTime();
        if (timeSince < oneHour) {
          stats.lastSyncDistribution['< 1 hour']++;
        } else if (timeSince < oneDay) {
          stats.lastSyncDistribution['< 1 day']++;
        } else if (timeSince < oneWeek) {
          stats.lastSyncDistribution['< 1 week']++;
        } else {
          stats.lastSyncDistribution['> 1 week']++;
        }
      }
    });

    return stats;
  }
}

// Export singleton instance
export const githubDb = new GitHubDatabase();