import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedGitHubSyncer } from '@/lib/github/sync';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

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

/**
 * POST /api/github/sync/user - Sync all repositories for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const { options } = syncUserSchema.parse(body);

    // Get user's GitHub token
    const githubToken = await getUserGitHubToken(user.id);
    const syncer = githubToken 
      ? createAuthenticatedGitHubSyncer(githubToken)
      : createAuthenticatedGitHubSyncer(process.env.GITHUB_TOKEN || '');

    // Sync user's repositories
    const results = await syncer.syncUserRepositories(user.id, options);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Calculate aggregate stats
    const totalStats = results.reduce((acc, result) => ({
      commits_processed: acc.commits_processed + result.stats.commits_processed,
      files_updated: acc.files_updated + result.stats.files_updated,
      processing_time_ms: acc.processing_time_ms + result.stats.processing_time_ms,
    }), { commits_processed: 0, files_updated: 0, processing_time_ms: 0 });

    // Calculate aggregate changes
    const totalChanges = results.reduce((acc, result) => ({
      metadata: acc.metadata || result.changes.metadata,
      content: acc.content || result.changes.content,
      version: acc.version || result.changes.version,
      tags: acc.tags || result.changes.tags,
    }), { metadata: false, content: false, version: false, tags: false });

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        changes: totalChanges,
        stats: totalStats,
      },
      results: results.map(result => ({
        success: result.success,
        jobId: result.jobId,
        changes: result.changes,
        errors: result.errors,
        warnings: result.warnings,
        stats: result.stats,
      })),
    });

  } catch (error) {
    console.error('GitHub user sync error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'User sync failed', message: String(error) },
      { status: 500 }
    );
  }
}