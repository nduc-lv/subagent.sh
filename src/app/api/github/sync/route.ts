import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedGitHubSyncer } from '@/lib/github/sync';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const syncRepositorySchema = z.object({
  repositorySyncId: z.string().uuid('Invalid repository sync ID'),
  options: z.object({
    force: z.boolean().optional().default(false),
    dryRun: z.boolean().optional().default(false),
    skipWebhooks: z.boolean().optional().default(false),
    branch: z.string().optional(),
    updateMetadata: z.boolean().optional().default(true),
    updateContent: z.boolean().optional().default(true),
  }).optional().default({}),
});

const syncUserSchema = z.object({
  options: z.object({
    force: z.boolean().optional().default(false),
    dryRun: z.boolean().optional().default(false),
    skipWebhooks: z.boolean().optional().default(false),
    updateMetadata: z.boolean().optional().default(true),
    updateContent: z.boolean().optional().default(true),
  }).optional().default({}),
});

async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

async function getUserGitHubToken(userId: string) {
  // This would fetch the user's GitHub token from the database
  return null;
}

async function getRepositorySync(repositorySyncId: string) {
  // This would fetch the repository sync from the database
  // For now, return a mock object
  return {
    id: repositorySyncId,
    agent_id: 'mock-agent-id',
    repository_id: 123,
    repository_full_name: 'owner/repo',
    sync_enabled: true,
    auto_update: true,
    last_sync_at: undefined,
    last_commit_sha: undefined,
    sync_status: 'pending' as const,
    sync_error: undefined,
    config: {
      branch: 'main',
      path: '',
      readme_as_description: true,
      tags_from_topics: true,
      version_from_releases: true,
      auto_publish: false,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function hasRepositorySyncPermission(userId: string, repositorySyncId: string): Promise<boolean> {
  // This would check if the user has permission to sync this repository
  // Check if the user owns the agent associated with the repository sync
  return true; // Placeholder
}

/**
 * POST /api/github/sync - Sync specific repository
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const { repositorySyncId, options } = syncRepositorySchema.parse(body);

    // Check permissions
    const hasPermission = await hasRepositorySyncPermission(user.id, repositorySyncId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get repository sync record
    const repositorySync = await getRepositorySync(repositorySyncId);
    if (!repositorySync) {
      return NextResponse.json(
        { error: 'Repository sync not found' },
        { status: 404 }
      );
    }

    if (!repositorySync.sync_enabled) {
      return NextResponse.json(
        { error: 'Repository sync is disabled' },
        { status: 400 }
      );
    }

    // Get user's GitHub token
    const githubToken = await getUserGitHubToken(user.id);
    const syncer = githubToken 
      ? createAuthenticatedGitHubSyncer(githubToken)
      : createAuthenticatedGitHubSyncer(process.env.GITHUB_TOKEN || '');

    // Perform sync
    const result = await syncer.syncRepository(repositorySync, options);

    return NextResponse.json({
      success: result.success,
      jobId: result.jobId,
      changes: result.changes,
      stats: result.stats,
      errors: result.errors,
      warnings: result.warnings,
    });

  } catch (error) {
    console.error('GitHub sync error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Sync failed', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github/sync?action=status&repositorySyncId=... - Get sync status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      const user = await getAuthenticatedUser(request);
      const repositorySyncId = searchParams.get('repositorySyncId');
      
      if (!repositorySyncId) {
        return NextResponse.json(
          { error: 'repositorySyncId parameter is required' },
          { status: 400 }
        );
      }

      // Check permissions
      const hasPermission = await hasRepositorySyncPermission(user.id, repositorySyncId);
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Get repository sync record
      const repositorySync = await getRepositorySync(repositorySyncId);
      if (!repositorySync) {
        return NextResponse.json(
          { error: 'Repository sync not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        status: {
          sync_enabled: repositorySync.sync_enabled,
          sync_status: repositorySync.sync_status,
          last_sync_at: repositorySync.last_sync_at,
          sync_error: repositorySync.sync_error,
          auto_update: repositorySync.auto_update,
        },
      });

    } else if (action === 'jobs') {
      const user = await getAuthenticatedUser(request);
      
      // Get sync jobs for user
      // This would fetch from database
      const jobs: any[] = []; // Placeholder

      return NextResponse.json({
        success: true,
        jobs,
      });

    } else if (action === 'stale') {
      const user = await getAuthenticatedUser(request);
      const maxAgeHours = parseInt(searchParams.get('maxAgeHours') || '24');
      
      // Get user's GitHub token
      const githubToken = await getUserGitHubToken(user.id);
      const syncer = githubToken 
        ? createAuthenticatedGitHubSyncer(githubToken)
        : createAuthenticatedGitHubSyncer(process.env.GITHUB_TOKEN || '');

      // Sync stale repositories
      const results = await syncer.syncStaleRepositories(maxAgeHours);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return NextResponse.json({
        success: true,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        },
        results: results.map(result => ({
          success: result.success,
          changes: result.changes,
          errors: result.errors,
          warnings: result.warnings,
          stats: result.stats,
        })),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('GitHub sync status error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get sync status', message: String(error) },
      { status: 500 }
    );
  }
}