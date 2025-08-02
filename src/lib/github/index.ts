// GitHub Integration Library
// This module provides comprehensive GitHub integration for the Subagents platform

// Core GitHub API client
export { GitHubClient, createAuthenticatedGitHubClient, githubClient } from './client';

// Repository import functionality
export { 
  GitHubImportService, 
  githubImporter, 
  createAuthenticatedGitHubImporter 
} from './import';

// Repository synchronization
export { 
  GitHubSyncService, 
  githubSyncer, 
  createAuthenticatedGitHubSyncer 
} from './sync';

// Webhook handling
export { 
  GitHubWebhookHandler, 
  WebhookProcessor, 
  WebhookSecurity,
  webhookHandler,
  createWebhookHandler 
} from './webhooks';

// Rate limiting and quota management
export { 
  GitHubQuotaManager, 
  GitHubRequestThrottler, 
  GitHubQuotaMonitor,
  quotaManager,
  requestThrottler,
  quotaMonitor,
  createQuotaManager,
  createRequestThrottler 
} from './quota';

// Scheduled jobs and automation
export { 
  GitHubScheduler, 
  GitHubJobManager, 
  GitHubSyncOptimizer,
  githubScheduler,
  createGitHubScheduler 
} from './scheduler';

// Database operations
export { GitHubDatabase, githubDb } from './database';

// Types
export type {
  // Core GitHub types
  GitHubRepository,
  GitHubUser,
  GitHubCommit,
  GitHubRelease,
  GitHubBranch,
  GitHubIssue,
  GitHubPullRequest,
  GitHubLicense,
  GitHubWebhookEvent,
  
  // Platform integration types
  GitHubIntegrationConfig,
  GitHubRepositorySync,
  GitHubSyncJob,
  GitHubSyncJobLog,
  GitHubWebhookPayload,
  GitHubApiQuota,
  GitHubRepositoryAnalysis,
  GitHubUserProfile,
  GitHubRepositoryMetrics,
  GitHubImportResult,
  GitHubSyncEvent,
  GitHubSyncEventHandler,
  
  // Configuration types
  ImportOptions,
  ImportContext,
  SyncOptions,
  SyncResult,
  QuotaLimits,
  QuotaAlert,
  SchedulerConfig,
  SchedulerStats,
} from '@/types';

// Import options interface
export interface ImportOptions {
  readmeAsDescription?: boolean;
  tagsFromTopics?: boolean;
  versionFromReleases?: boolean;
  autoPublish?: boolean;
  categoryMapping?: Record<string, string>;
  defaultCategory?: string;
  overwriteExisting?: boolean;
  skipIfExists?: boolean;
}

// Import context interface
export interface ImportContext {
  userId: string;
  userToken?: string;
  options: ImportOptions;
}

// Sync options interface
export interface SyncOptions {
  force?: boolean;
  dryRun?: boolean;
  skipWebhooks?: boolean;
  branch?: string;
  updateMetadata?: boolean;
  updateContent?: boolean;
}

// Sync result interface
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

// Utility functions
export const GitHubUtils = {
  /**
   * Parse GitHub URL to extract owner and repository name
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    }

    throw new Error(`Invalid GitHub URL: ${url}`);
  },

  /**
   * Validate GitHub URL format
   */
  isValidGitHubUrl(url: string): boolean {
    try {
      GitHubUtils.parseGitHubUrl(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Generate agent name from repository name
   */
  generateAgentName(repoName: string): string {
    return repoName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  },

  /**
   * Extract short description from README content
   */
  extractShortDescription(readme: string, maxLength: number = 500): string {
    const lines = readme.split('\n');
    
    // Skip title and find first substantial paragraph
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#') && !line.startsWith('!') && line.length > 20) {
        const description = line.replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '').trim();
        return description.slice(0, maxLength);
      }
    }

    return '';
  },

  /**
   * Detect technology stack from package.json dependencies
   */
  detectTechStack(packageData: any): string[] {
    const technologies: string[] = [];

    if (packageData?.dependencies || packageData?.devDependencies) {
      const deps = { ...packageData.dependencies, ...packageData.devDependencies };
      
      // Frontend frameworks
      if (deps.react) technologies.push('React');
      if (deps['next'] || deps['next.js']) technologies.push('Next.js');
      if (deps.vue) technologies.push('Vue.js');
      if (deps.angular) technologies.push('Angular');
      if (deps.svelte) technologies.push('Svelte');
      
      // Backend frameworks
      if (deps.express) technologies.push('Express.js');
      if (deps.fastify) technologies.push('Fastify');
      if (deps.koa) technologies.push('Koa');
      if (deps.nest || deps['@nestjs/core']) technologies.push('NestJS');
      
      // Databases
      if (deps.mongoose || deps.mongodb) technologies.push('MongoDB');
      if (deps.pg || deps.postgresql) technologies.push('PostgreSQL');
      if (deps.mysql || deps.mysql2) technologies.push('MySQL');
      if (deps.redis) technologies.push('Redis');
      
      // Tools
      if (deps.typescript) technologies.push('TypeScript');
      if (deps.webpack) technologies.push('Webpack');
      if (deps.vite) technologies.push('Vite');
    }

    return technologies;
  },

  /**
   * Calculate repository activity score
   */
  calculateActivityScore(repository: any): number {
    const now = Date.now();
    const lastPush = new Date(repository.pushed_at).getTime();
    const daysSinceLastPush = (now - lastPush) / (1000 * 60 * 60 * 24);
    
    // Base score from stars and forks
    let score = Math.log10(repository.stargazers_count + 1) * 10 + 
                Math.log10(repository.forks_count + 1) * 5;
    
    // Recency bonus
    if (daysSinceLastPush < 7) score *= 1.5;
    else if (daysSinceLastPush < 30) score *= 1.2;
    else if (daysSinceLastPush < 90) score *= 1.0;
    else score *= 0.8;
    
    // Language bonus
    if (repository.language) score += 2;
    
    // Topic bonus
    if (repository.topics && repository.topics.length > 0) score += repository.topics.length;
    
    return Math.round(score * 100) / 100;
  },

  /**
   * Determine sync frequency based on repository activity
   */
  getOptimalSyncFrequency(repository: any): 'high' | 'medium' | 'low' {
    const activityScore = GitHubUtils.calculateActivityScore(repository);
    
    if (activityScore > 50) return 'high';
    if (activityScore > 20) return 'medium';
    return 'low';
  },

  /**
   * Format GitHub stats for display
   */
  formatGitHubStats(stats: { stars: number; forks: number; watchers?: number }) {
    const formatNumber = (num: number): string => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return num.toString();
    };

    return {
      stars: formatNumber(stats.stars),
      forks: formatNumber(stats.forks),
      watchers: stats.watchers ? formatNumber(stats.watchers) : undefined,
    };
  }
};

// Configuration constants
export const GitHubConfig = {
  // Rate limits for different GitHub API endpoints
  RATE_LIMITS: {
    CORE: 5000,
    SEARCH: 30,
    GRAPHQL: 5000,
  },

  // Supported webhook events
  WEBHOOK_EVENTS: [
    'push',
    'release',
    'repository',
    'star',
    'fork',
    'issues',
    'pull_request',
    'watch',
  ] as const,

  // Default sync intervals
  SYNC_INTERVALS: {
    HIGH_ACTIVITY: '0 */2 * * *',    // Every 2 hours
    MEDIUM_ACTIVITY: '0 */6 * * *',  // Every 6 hours
    LOW_ACTIVITY: '0 0 */3 * *',     // Every 3 days
  },

  // File patterns for dependency detection
  DEPENDENCY_FILES: {
    NODE_JS: ['package.json', 'yarn.lock', 'package-lock.json'],
    PYTHON: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    PHP: ['composer.json', 'composer.lock'],
    RUBY: ['Gemfile', 'Gemfile.lock'],
    JAVA: ['pom.xml', 'build.gradle', 'gradle.properties'],
    DOTNET: ['*.csproj', '*.sln', 'packages.config'],
  },

  // Common README file patterns
  README_PATTERNS: ['README.md', 'README.rst', 'README.txt', 'README'],

  // License file patterns
  LICENSE_PATTERNS: ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'],
} as const;