import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedGitHubImporter } from '@/lib/github/import';
import { createServerClient } from '@/lib/supabase/server';
import { githubApp } from '@/lib/github/app';
import { z } from 'zod';

const searchImportSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  options: z.object({
    readmeAsDescription: z.boolean().optional().default(true),
    tagsFromTopics: z.boolean().optional().default(true),
    versionFromReleases: z.boolean().optional().default(true),
    autoPublish: z.boolean().optional().default(true),
    categoryMapping: z.record(z.string()).optional(),
    defaultCategory: z.string().optional(),
  }).optional().default({}),
  searchOptions: z.object({
    sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional().default('stars'),
    order: z.enum(['desc', 'asc']).optional().default('desc'),
    limit: z.number().min(1).max(100).optional().default(10),
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

async function getUserGitHubSession(userId: string) {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * POST /api/github/import/search - Search and import repositories
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const { query, options, searchOptions } = searchImportSchema.parse(body);

    // Get user's GitHub session for enhanced API access
    const session = await getUserGitHubSession(user.id);
    const githubToken = githubApp.getGitHubTokenFromSession(session);
    
    // Use GitHub App for better rate limiting or fallback to env token
    const importer = githubToken 
      ? createAuthenticatedGitHubImporter(githubToken)
      : createAuthenticatedGitHubImporter(process.env.GITHUB_TOKEN || '');

    // Search and import repositories
    const results = await importer.searchAndImport(query, {
      userId: user.id,
      userToken: githubToken || undefined,
      options,
    }, searchOptions);

    // Log rate limit usage for monitoring
    if (githubToken) {
      console.log(`GitHub API request completed using ${session ? 'user session token' : 'fallback token'}`);
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Create agents in database for successful imports
    let createdAgents: any[] = [];
    if (successful.length > 0) {
      try {
        const { SupabaseDatabase } = await import('@/lib/supabase/database');
        const db = new SupabaseDatabase();
        
        // Ensure the user profile exists first
        await db.ensureUserProfile(user.id, user);
        
        // Extract agents from successful results
        const agentsToCreate = successful
          .map(result => result.agents || [])
          .flat()
          .filter(Boolean);
        
        if (agentsToCreate.length > 0) {
          // Use new attribution system with deduplication
          const importContext = {
            importerId: user.id,
            importSource: 'github_import' as const,
            skipIfExists: options.skipIfExists || false,
            overwriteExisting: options.overwriteExisting || false,
          };

          // Create agents with attribution and deduplication
          const importResult = await db.createAgentsWithAttribution(agentsToCreate, importContext);
          createdAgents = importResult.created;
          console.log('Import results:', {
            created: importResult.created.length,
            skipped: importResult.skipped.length,
            failed: importResult.failed.length
          });
        }
      } catch (dbError) {
        console.error('Database error during search import:', dbError);
        // Don't fail the entire request, but add warnings
        results.forEach(result => {
          if (result.success) {
            result.warnings = result.warnings || [];
            result.warnings.push('Agent data processed but database save failed');
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      query,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        agents_created: createdAgents.length,
      },
      results: results.map(result => ({
        success: result.success,
        repository: result.repository?.full_name,
        agent: result.agent?.id,
        errors: result.errors,
        warnings: result.warnings,
        metadata: result.metadata,
      })),
      agents: createdAgents.length > 0 ? createdAgents : successful.map(r => r.agent).filter(Boolean),
    });

  } catch (error) {
    console.error('GitHub search import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Search import failed', message: String(error) },
      { status: 500 }
    );
  }
}