import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedGitHubImporter } from '@/lib/github/import';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const importUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  options: z.object({
    readmeAsDescription: z.boolean().optional().default(true),
    tagsFromTopics: z.boolean().optional().default(true),
    versionFromReleases: z.boolean().optional().default(true),
    autoPublish: z.boolean().optional().default(true),
    categoryMapping: z.record(z.string()).optional(),
    defaultCategory: z.string().optional(),
    overwriteExisting: z.boolean().optional().default(false),
    skipIfExists: z.boolean().optional().default(true),
  }).optional().default({}),
  selectedAgents: z.array(z.string()).optional(), // Array of file paths to import
});

const importUserReposSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  options: z.object({
    readmeAsDescription: z.boolean().optional().default(true),
    tagsFromTopics: z.boolean().optional().default(true),
    versionFromReleases: z.boolean().optional().default(true),
    autoPublish: z.boolean().optional().default(true),
    categoryMapping: z.record(z.string()).optional(),
    defaultCategory: z.string().optional(),
  }).optional().default({}),
  filters: z.object({
    includePrivate: z.boolean().optional().default(false),
    includeForks: z.boolean().optional().default(false),
    minStars: z.number().optional().default(0),
    language: z.string().optional(),
    topics: z.array(z.string()).optional(),
  }).optional().default({}),
});

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

const previewSchema = z.object({
  url: z.string().url('Invalid URL format'),
  options: z.object({
    readmeAsDescription: z.boolean().optional().default(true),
    tagsFromTopics: z.boolean().optional().default(true),
    versionFromReleases: z.boolean().optional().default(true),
    autoPublish: z.boolean().optional().default(true),
    categoryMapping: z.record(z.string()).optional(),
    defaultCategory: z.string().optional(),
  }).optional().default({}),
});

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

// Helper function to get user's GitHub token
async function getUserGitHubToken(userId: string) {
  // This would fetch the user's GitHub token from the database
  // For now, return null to indicate no token available
  return null;
}

/**
 * POST /api/github/import - Import repository from URL
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    console.log('POST: User authenticated:', user?.id);
    
    const body = await request.json();
    const { url, options, selectedAgents } = importUrlSchema.parse(body);

    // Get user's GitHub token for authenticated requests
    const githubToken = await getUserGitHubToken(user.id);
    const importer = githubToken 
      ? createAuthenticatedGitHubImporter(githubToken)
      : createAuthenticatedGitHubImporter(process.env.GITHUB_TOKEN || '');

    // Add selected agents to options if provided
    const importOptions = {
      ...options,
      selectedAgentPaths: selectedAgents
    };

    // Import the repository
    const result = await importer.importFromUrl(url, {
      userId: user.id,
      userToken: githubToken || undefined,
      options: importOptions,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Import failed', details: result.errors },
        { status: 400 }
      );
    }

    // Create agents in database
    if (result.agents && result.agents.length > 0) {
      try {
        console.log('About to create agents in database:', result.agents.length);
        console.log('User ID:', user.id);
        console.log('Sample agent data:', JSON.stringify(result.agents[0], null, 2));
        
        const { SupabaseDatabase } = await import('@/lib/supabase/database');
        const db = new SupabaseDatabase();
        
        // Ensure the user profile exists first
        await db.ensureUserProfile(user.id, user);
        
        // Use attribution-aware batch create for better duplicate handling
        const importResult = await db.createAgentsWithAttribution(result.agents, {
          importerId: user.id,
          originalAuthor: result.repository ? {
            username: result.repository.owner.login,
            url: result.repository.owner.html_url,
            avatarUrl: result.repository.owner.avatar_url,
          } : undefined,
          importSource: 'github_import',
          skipIfExists: options.skipIfExists,
          overwriteExisting: options.overwriteExisting,
        });
        
        // Prepare warnings for skipped and failed agents
        const warnings = [...(result.warnings || [])];
        if (importResult.skipped.length > 0) {
          warnings.push(`Skipped ${importResult.skipped.length} agents: ${importResult.skipped.map(s => `${s.name} (${s.reason})`).join(', ')}`);
        }
        if (importResult.failed.length > 0) {
          warnings.push(`Failed ${importResult.failed.length} agents: ${importResult.failed.map(f => `${f.name} - ${f.error}`).join(', ')}`);
        }
        
        return NextResponse.json({
          success: true,
          agents: importResult.created,
          agent: importResult.created[0], // For backward compatibility
          repository: result.repository,
          metadata: {
            ...result.metadata,
            agents_created: importResult.created.length,
            agents_skipped: importResult.skipped.length,
            agents_failed: importResult.failed.length,
            agents_processed: result.agents?.length || 0,
          },
          warnings,
          import_details: {
            created: importResult.created.length,
            skipped: importResult.skipped,
            failed: importResult.failed,
          },
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Don't expose internal error details in production
        const isProduction = process.env.NODE_ENV === 'production';
        return NextResponse.json(
          { 
            error: 'Database error', 
            details: isProduction ? ['An internal error occurred'] : [dbError instanceof Error ? dbError.message : String(dbError)]
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      agents: result.agents || [],
      agent: result.agent,
      repository: result.repository,
      metadata: result.metadata,
      warnings: result.warnings,
    });

  } catch (error) {
    console.error('GitHub import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      { 
        error: 'Import failed', 
        message: isProduction ? 'An internal error occurred' : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github/import?action=preview&url=... - Preview import
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'preview') {
      console.log('Preview request received for URL:', searchParams.get('url'));
      
      let user;
      try {
        user = await getAuthenticatedUser(request);
        console.log('User authenticated:', user?.id);
      } catch (authError) {
        console.log('Authentication failed for preview');
        // Disable unauthenticated preview mode for security
        return NextResponse.json(
          { error: 'Authentication required for preview' },
          { status: 401 }
        );
      }
      
      const url = searchParams.get('url');
      
      if (!url) {
        return NextResponse.json(
          { error: 'URL parameter is required' },
          { status: 400 }
        );
      }

      const options = {
        readmeAsDescription: searchParams.get('readmeAsDescription') === 'true',
        tagsFromTopics: searchParams.get('tagsFromTopics') === 'true',
        versionFromReleases: searchParams.get('versionFromReleases') === 'true',
        autoPublish: searchParams.get('autoPublish') !== 'false', // Default to true unless explicitly false
      };

      const { url: validatedUrl, options: validatedOptions } = previewSchema.parse({ 
        url, 
        options 
      });

      // Get user's GitHub token
      const githubToken = await getUserGitHubToken(user.id);
      console.log('GitHub token available:', !!githubToken, 'Env token available:', !!process.env.GITHUB_TOKEN);
      
      const importer = githubToken 
        ? createAuthenticatedGitHubImporter(githubToken)
        : createAuthenticatedGitHubImporter(process.env.GITHUB_TOKEN || '');

      console.log('Starting preview import for:', validatedUrl);

      // Preview the import
      const previews = await importer.previewImport(validatedUrl, {
        userId: user.id,
        userToken: githubToken || undefined,
        options: validatedOptions,
      });

      console.log('Preview import completed, found agents:', previews.length);

      return NextResponse.json({
        success: true,
        previews,
        preview: previews[0], // For backward compatibility
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('GitHub import preview error:', error);
    // Don't log stack traces in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      { 
        error: 'Preview failed', 
        message: isProduction ? 'An internal error occurred' : String(error)
      },
      { status: 500 }
    );
  }
}