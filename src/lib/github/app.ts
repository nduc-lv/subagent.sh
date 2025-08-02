import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import type { Session } from '@supabase/supabase-js';

/**
 * GitHub App instance for enhanced API access and rate limiting
 * Works alongside Supabase GitHub OAuth
 */
export class GitHubApp {
  private app: App;
  private appId: string;
  private privateKey: string;

  constructor() {
    this.appId = process.env.GITHUB_APP_ID!;
    this.privateKey = process.env.GITHUB_APP_PRIVATE_KEY!;

    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App credentials are not properly configured');
    }

    this.app = new App({
      appId: this.appId,
      privateKey: this.privateKey,
    });
  }

  /**
   * Get an authenticated Octokit instance for the app
   */
  async getAppOctokit(): Promise<Octokit> {
    return this.app.octokit;
  }

  /**
   * Get an authenticated Octokit instance for a specific installation
   */
  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    return this.app.getInstallationOctokit(installationId);
  }

  /**
   * Get an authenticated Octokit instance using a user's access token
   */
  async getUserOctokit(accessToken: string): Promise<Octokit> {
    return new Octokit({
      auth: accessToken,
    });
  }

  /**
   * Extract GitHub access token from Supabase session
   */
  getGitHubTokenFromSession(session: Session | null): string | null {
    if (!session?.provider_token) {
      return null;
    }
    
    // Supabase stores the GitHub access token in provider_token
    return session.provider_token;
  }

  /**
   * Get user's installations (apps they've authorized)
   */
  async getUserInstallations(accessToken: string): Promise<Array<{
    id: number;
    account: {
      login: string;
      type: string;
    };
    permissions: Record<string, string>;
  }>> {
    const octokit = await this.getUserOctokit(accessToken);
    const { data } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
    
    return data.installations.map(installation => ({
      id: installation.id,
      account: {
        login: installation.account?.login || '',
        type: installation.account?.type || '',
      },
      permissions: installation.permissions || {},
    }));
  }

  /**
   * Check if a repository is accessible through a user's installation
   */
  async canAccessRepository(
    accessToken: string, 
    owner: string, 
    repo: string
  ): Promise<{
    canAccess: boolean;
    installationId?: number;
    isPublic?: boolean;
  }> {
    try {
      // First, try to access with user token
      const userOctokit = await this.getUserOctokit(accessToken);
      const { data: repository } = await userOctokit.rest.repos.get({
        owner,
        repo,
      });

      // Check if user has installations that can access this repo
      const installations = await this.getUserInstallations(accessToken);
      
      for (const installation of installations) {
        if (installation.account.login === owner) {
          return {
            canAccess: true,
            installationId: installation.id,
            isPublic: !repository.private,
          };
        }
      }

      // If no installation found but repo is public, we can still access it
      return {
        canAccess: !repository.private,
        isPublic: !repository.private,
      };
    } catch (error: any) {
      // If we can't access the repo, check if it's public via app
      try {
        const appOctokit = await this.getAppOctokit();
        const { data: repository } = await appOctokit.rest.repos.get({
          owner,
          repo,
        });

        return {
          canAccess: !repository.private,
          isPublic: !repository.private,
        };
      } catch {
        return {
          canAccess: false,
          isPublic: false,
        };
      }
    }
  }

  /**
   * Get the best Octokit instance for accessing a repository
   * Prefers user installation > user token > app token
   * Integrates with Supabase session tokens
   */
  async getBestOctokitForRepo(
    owner: string,
    repo: string,
    session?: Session | null
  ): Promise<{
    octokit: Octokit;
    rateLimitRemaining: number;
    source: 'installation' | 'user' | 'app';
  }> {
    // Extract GitHub token from Supabase session
    const userAccessToken = this.getGitHubTokenFromSession(session);
    
    if (userAccessToken) {
      const access = await this.canAccessRepository(userAccessToken, owner, repo);
      
      if (access.canAccess && access.installationId) {
        // Use installation token for best rate limits
        const octokit = await this.getInstallationOctokit(access.installationId);
        const { data: rateLimit } = await octokit.rest.rateLimit.get();
        
        return {
          octokit,
          rateLimitRemaining: rateLimit.rate.remaining,
          source: 'installation',
        };
      } else if (access.canAccess) {
        // Use user token from Supabase session
        const octokit = await this.getUserOctokit(userAccessToken);
        const { data: rateLimit } = await octokit.rest.rateLimit.get();
        
        return {
          octokit,
          rateLimitRemaining: rateLimit.rate.remaining,
          source: 'user',
        };
      }
    }

    // Fall back to app token for public repos
    const appOctokit = await this.getAppOctokit();
    const { data: rateLimit } = await appOctokit.rest.rateLimit.get();
    
    return {
      octokit: appOctokit,
      rateLimitRemaining: rateLimit.rate.remaining,
      source: 'app',
    };
  }
}

// Singleton instance
export const githubApp = new GitHubApp();