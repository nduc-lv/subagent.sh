import { Octokit } from '@octokit/rest';
import type {
  GitHubRepository,
  GitHubUser,
  GitHubCommit,
  GitHubRelease,
  GitHubBranch,
  GitHubIssue,
  GitHubPullRequest,
  GitHubIntegrationConfig,
  GitHubApiQuota
} from '@/types';

export interface GitHubClientOptions {
  auth?: string;
  userAgent?: string;
  baseUrl?: string;
  log?: typeof console;
  request?: {
    fetch?: typeof fetch;
    timeout?: number;
  };
}

export class GitHubClient {
  private octokit: Octokit;
  private rateLimitHandler?: (quota: GitHubApiQuota) => void;

  constructor(options: GitHubClientOptions = {}) {
    this.octokit = new Octokit({
      auth: options.auth,
      userAgent: options.userAgent || 'Subagents.sh/1.0',
      baseUrl: options.baseUrl,
      log: options.log,
      request: {
        ...options.request,
        timeout: options.request?.timeout || 10000,
      },
    });
  }

  // Static factory method for creating authenticated client
  static withToken(token: string, options: Omit<GitHubClientOptions, 'auth'> = {}): GitHubClient {
    return new GitHubClient({ ...options, auth: token });
  }

  // Static factory method for creating app installation client
  static withApp(appId: string, privateKey: string, installationId: number): GitHubClient {
    // App auth temporarily disabled for simplicity
    const octokit = new Octokit();
    const client = new GitHubClient();
    client.octokit = octokit;
    return client;
  }

  // Rate limit handling
  setRateLimitHandler(handler: (quota: GitHubApiQuota) => void) {
    this.rateLimitHandler = handler;
  }

  private async handleRateLimit(response: any) {
    if (this.rateLimitHandler && response.headers) {
      const quota: Partial<GitHubApiQuota> = {
        rate_limit_remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        rate_limit_reset: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000).toISOString(),
        core_remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        core_reset: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000).toISOString(),
        search_remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
        search_reset: new Date(parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      this.rateLimitHandler(quota as GitHubApiQuota);
    }
  }

  // Repository operations
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubRepository;
    } catch (error) {
      throw new Error(`Failed to fetch repository ${owner}/${repo}: ${error}`);
    }
  }

  async getRepositoryFromUrl(url: string): Promise<GitHubRepository> {
    const { owner, repo } = this.parseGitHubUrl(url);
    return this.getRepository(owner, repo);
  }

  async listUserRepositories(
    username: string,
    options: {
      type?: 'all' | 'owner' | 'member';
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubRepository[]> {
    try {
      const response = await this.octokit.rest.repos.listForUser({
        username,
        type: options.type || 'owner',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubRepository[];
    } catch (error) {
      throw new Error(`Failed to fetch repositories for user ${username}: ${error}`);
    }
  }

  async listAuthenticatedUserRepositories(
    options: {
      visibility?: 'all' | 'public' | 'private';
      affiliation?: 'owner' | 'collaborator' | 'organization_member';
      type?: 'all' | 'owner' | 'public' | 'private' | 'member';
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubRepository[]> {
    try {
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        visibility: options.visibility || 'all',
        affiliation: options.affiliation || 'owner',
        type: options.type || 'owner',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubRepository[];
    } catch (error) {
      throw new Error(`Failed to fetch authenticated user repositories: ${error}`);
    }
  }

  async searchRepositories(
    query: string,
    options: {
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
      order?: 'desc' | 'asc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<{ repositories: GitHubRepository[]; total_count: number }> {
    try {
      const response = await this.octokit.rest.search.repos({
        q: query,
        sort: options.sort,
        order: options.order || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return {
        repositories: response.data.items as GitHubRepository[],
        total_count: response.data.total_count,
      };
    } catch (error) {
      throw new Error(`Failed to search repositories: ${error}`);
    }
  }

  // Repository content operations
  async getRepositoryContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      await this.handleRateLimit(response);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch content for ${owner}/${repo}/${path}: ${error}`);
    }
  }

  // Get repository tree (more efficient for getting multiple files)
  async getRepositoryTree(
    owner: string,
    repo: string,
    tree_sha: string = 'HEAD',
    recursive: boolean = true
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha,
        recursive: recursive ? 'true' : undefined,
      });

      await this.handleRateLimit(response);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch tree for ${owner}/${repo}: ${error}`);
    }
  }

  // Get blob content (for individual files from tree)
  async getBlobContent(
    owner: string,
    repo: string,
    file_sha: string
  ): Promise<string> {
    try {
      const response = await this.octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha,
      });

      await this.handleRateLimit(response);
      
      if (response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      
      return response.data.content;
    } catch (error) {
      throw new Error(`Failed to fetch blob ${file_sha} for ${owner}/${repo}: ${error}`);
    }
  }

  async getRepositoryReadme(owner: string, repo: string, ref?: string): Promise<string | null> {
    try {
      const readmeFiles = ['README.md', 'README.rst', 'README.txt', 'README'];
      
      for (const filename of readmeFiles) {
        try {
          const content = await this.getRepositoryContent(owner, repo, filename, ref);
          if (content && content.content) {
            return Buffer.from(content.content, 'base64').toString('utf-8');
          }
        } catch {
          // Continue to next file
        }
      }
      
      return null;
    } catch (error) {
      throw new Error(`Failed to fetch README for ${owner}/${repo}: ${error}`);
    }
  }

  async getPackageJson(owner: string, repo: string, ref?: string): Promise<any | null> {
    try {
      const content = await this.getRepositoryContent(owner, repo, 'package.json', ref);
      if (content && content.content) {
        return JSON.parse(Buffer.from(content.content, 'base64').toString('utf-8'));
      }
      return null;
    } catch {
      return null;
    }
  }

  async getComposerJson(owner: string, repo: string, ref?: string): Promise<any | null> {
    try {
      const content = await this.getRepositoryContent(owner, repo, 'composer.json', ref);
      if (content && content.content) {
        return JSON.parse(Buffer.from(content.content, 'base64').toString('utf-8'));
      }
      return null;
    } catch {
      return null;
    }
  }

  async getPyprojectToml(owner: string, repo: string, ref?: string): Promise<string | null> {
    try {
      const content = await this.getRepositoryContent(owner, repo, 'pyproject.toml', ref);
      if (content && content.content) {
        return Buffer.from(content.content, 'base64').toString('utf-8');
      }
      return null;
    } catch {
      return null;
    }
  }

  async getRequirementsTxt(owner: string, repo: string, ref?: string): Promise<string | null> {
    try {
      const content = await this.getRepositoryContent(owner, repo, 'requirements.txt', ref);
      if (content && content.content) {
        return Buffer.from(content.content, 'base64').toString('utf-8');
      }
      return null;
    } catch {
      return null;
    }
  }

  // Commit operations
  async getRepositoryCommits(
    owner: string,
    repo: string,
    options: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubCommit[]> {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: options.sha,
        path: options.path,
        author: options.author,
        since: options.since,
        until: options.until,
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubCommit[];
    } catch (error) {
      throw new Error(`Failed to fetch commits for ${owner}/${repo}: ${error}`);
    }
  }

  async getLatestCommit(owner: string, repo: string, ref?: string): Promise<GitHubCommit | null> {
    try {
      const commits = await this.getRepositoryCommits(owner, repo, {
        sha: ref,
        per_page: 1,
      });
      return commits[0] || null;
    } catch {
      return null;
    }
  }

  // Release operations
  async getRepositoryReleases(
    owner: string,
    repo: string,
    options: {
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubRelease[]> {
    try {
      const response = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubRelease[];
    } catch (error) {
      throw new Error(`Failed to fetch releases for ${owner}/${repo}: ${error}`);
    }
  }

  async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease | null> {
    try {
      const response = await this.octokit.rest.repos.getLatestRelease({
        owner,
        repo,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubRelease;
    } catch {
      return null;
    }
  }

  // Branch operations
  async getRepositoryBranches(
    owner: string,
    repo: string,
    options: {
      protected?: boolean;
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubBranch[]> {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        protected: options.protected,
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubBranch[];
    } catch (error) {
      throw new Error(`Failed to fetch branches for ${owner}/${repo}: ${error}`);
    }
  }

  async getDefaultBranch(owner: string, repo: string): Promise<GitHubBranch | null> {
    try {
      const repository = await this.getRepository(owner, repo);
      const branches = await this.getRepositoryBranches(owner, repo);
      return branches.find(branch => branch.name === repository.default_branch) || null;
    } catch {
      return null;
    }
  }

  // User operations
  async getUser(username: string): Promise<GitHubUser> {
    try {
      const response = await this.octokit.rest.users.getByUsername({
        username,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubUser;
    } catch (error) {
      throw new Error(`Failed to fetch user ${username}: ${error}`);
    }
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();

      await this.handleRateLimit(response);
      return response.data as GitHubUser;
    } catch (error) {
      throw new Error(`Failed to fetch authenticated user: ${error}`);
    }
  }

  // Issue operations
  async getRepositoryIssues(
    owner: string,
    repo: string,
    options: {
      milestone?: string | number;
      state?: 'open' | 'closed' | 'all';
      assignee?: string;
      creator?: string;
      mentioned?: string;
      labels?: string;
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      since?: string;
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubIssue[]> {
    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        milestone: options.milestone,
        state: options.state || 'open',
        assignee: options.assignee,
        creator: options.creator,
        mentioned: options.mentioned,
        labels: options.labels,
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        since: options.since,
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubIssue[];
    } catch (error) {
      throw new Error(`Failed to fetch issues for ${owner}/${repo}: ${error}`);
    }
  }

  // Pull request operations
  async getRepositoryPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity';
      direction?: 'asc' | 'desc';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<GitHubPullRequest[]> {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state: options.state || 'open',
        head: options.head,
        base: options.base,
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as GitHubPullRequest[];
    } catch (error) {
      throw new Error(`Failed to fetch pull requests for ${owner}/${repo}: ${error}`);
    }
  }

  // Language and statistics
  async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      await this.handleRateLimit(response);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch languages for ${owner}/${repo}: ${error}`);
    }
  }

  async getRepositoryContributors(
    owner: string,
    repo: string,
    options: {
      anon?: boolean;
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<Array<GitHubUser & { contributions: number }>> {
    try {
      const response = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        anon: options.anon || false,
        per_page: options.per_page || 30,
        page: options.page || 1,
      });

      await this.handleRateLimit(response);
      return response.data as Array<GitHubUser & { contributions: number }>;
    } catch (error) {
      throw new Error(`Failed to fetch contributors for ${owner}/${repo}: ${error}`);
    }
  }

  // Webhook operations
  async createWebhook(
    owner: string,
    repo: string,
    config: {
      url: string;
      content_type?: 'json' | 'form';
      secret?: string;
      insecure_ssl?: boolean;
    },
    events: string[] = ['push', 'pull_request']
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: config.url,
          content_type: config.content_type || 'json',
          secret: config.secret,
          insecure_ssl: config.insecure_ssl ? '1' : '0',
        },
        events,
        active: true,
      });

      await this.handleRateLimit(response);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create webhook for ${owner}/${repo}: ${error}`);
    }
  }

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    try {
      await this.octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookId,
      });
    } catch (error) {
      throw new Error(`Failed to delete webhook ${hookId} for ${owner}/${repo}: ${error}`);
    }
  }

  async listWebhooks(owner: string, repo: string): Promise<any[]> {
    try {
      const response = await this.octokit.rest.repos.listWebhooks({
        owner,
        repo,
      });

      await this.handleRateLimit(response);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list webhooks for ${owner}/${repo}: ${error}`);
    }
  }

  // Rate limit information
  async getRateLimit(): Promise<any> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch rate limit: ${error}`);
    }
  }

  // Utility methods
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
  }

  isValidGitHubUrl(url: string): boolean {
    try {
      this.parseGitHubUrl(url);
      return true;
    } catch {
      return false;
    }
  }

  // Batch operations
  async batchGetRepositories(repos: Array<{ owner: string; repo: string }>): Promise<Array<GitHubRepository | null>> {
    const results = await Promise.allSettled(
      repos.map(({ owner, repo }) => this.getRepository(owner, repo))
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  }

  // Validation
  async validateRepository(owner: string, repo: string): Promise<boolean> {
    try {
      await this.getRepository(owner, repo);
      return true;
    } catch {
      return false;
    }
  }

  async validateRepositoryAccess(owner: string, repo: string): Promise<boolean> {
    try {
      const repository = await this.getRepository(owner, repo);
      return !repository.private;
    } catch {
      return false;
    }
  }
}

// Export singleton with no authentication for public operations
export const githubClient = new GitHubClient();

// Export authenticated client factory
export function createAuthenticatedGitHubClient(token: string): GitHubClient {
  return GitHubClient.withToken(token);
}