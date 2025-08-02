import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedGitHubClient } from '@/lib/github/client';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const searchReposSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional(),
  order: z.enum(['desc', 'asc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

const userReposSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  type: z.enum(['all', 'owner', 'member']).optional(),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
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
 * GET /api/github/repositories - Get repositories
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'search') {
      // Search public repositories
      const query = searchParams.get('query');
      const sort = searchParams.get('sort') as any;
      const order = searchParams.get('order') as any;
      const per_page = parseInt(searchParams.get('per_page') || '30');
      const page = parseInt(searchParams.get('page') || '1');

      const { query: validatedQuery, ...options } = searchReposSchema.parse({
        query,
        sort,
        order,
        per_page,
        page,
      });

      // Use public GitHub client for search
      const client = createAuthenticatedGitHubClient(process.env.GITHUB_TOKEN || '');
      const result = await client.searchRepositories(validatedQuery, options);

      return NextResponse.json({
        success: true,
        repositories: result.repositories,
        total_count: result.total_count,
        query: validatedQuery,
        pagination: {
          page,
          per_page,
          total_pages: Math.ceil(result.total_count / per_page),
        },
      });

    } else if (action === 'user') {
      // Get user repositories
      const username = searchParams.get('username');
      const type = searchParams.get('type') as any;
      const sort = searchParams.get('sort') as any;
      const direction = searchParams.get('direction') as any;
      const per_page = parseInt(searchParams.get('per_page') || '30');
      const page = parseInt(searchParams.get('page') || '1');

      const { username: validatedUsername, ...options } = userReposSchema.parse({
        username,
        type,
        sort,
        direction,
        per_page,
        page,
      });

      // Use public GitHub client
      const client = createAuthenticatedGitHubClient(process.env.GITHUB_TOKEN || '');
      const repositories = await client.listUserRepositories(validatedUsername, options);

      return NextResponse.json({
        success: true,
        repositories,
        username: validatedUsername,
        pagination: {
          page,
          per_page,
          has_more: repositories.length === per_page,
        },
      });

    } else if (action === 'authenticated') {
      // Get authenticated user's repositories
      const user = await getAuthenticatedUser(request);
      
      const visibility = searchParams.get('visibility') as any;
      const affiliation = searchParams.get('affiliation') as any;
      const type = searchParams.get('type') as any;
      const sort = searchParams.get('sort') as any;
      const direction = searchParams.get('direction') as any;
      const per_page = parseInt(searchParams.get('per_page') || '30');
      const page = parseInt(searchParams.get('page') || '1');

      // Get user's GitHub token
      const githubToken = await getUserGitHubToken(user.id);
      if (!githubToken) {
        return NextResponse.json(
          { error: 'GitHub integration not configured' },
          { status: 400 }
        );
      }

      const client = createAuthenticatedGitHubClient(githubToken);
      const repositories = await client.listAuthenticatedUserRepositories({
        visibility,
        affiliation,
        type,
        sort,
        direction,
        per_page,
        page,
      });

      return NextResponse.json({
        success: true,
        repositories,
        pagination: {
          page,
          per_page,
          has_more: repositories.length === per_page,
        },
      });

    } else if (action === 'info') {
      // Get specific repository information
      const owner = searchParams.get('owner');
      const repo = searchParams.get('repo');

      if (!owner || !repo) {
        return NextResponse.json(
          { error: 'Both owner and repo parameters are required' },
          { status: 400 }
        );
      }

      // Use public GitHub client
      const client = createAuthenticatedGitHubClient(process.env.GITHUB_TOKEN || '');
      
      try {
        const [repository, readme, releases, branches, languages, contributors] = await Promise.allSettled([
          client.getRepository(owner, repo),
          client.getRepositoryReadme(owner, repo),
          client.getRepositoryReleases(owner, repo, { per_page: 5 }),
          client.getRepositoryBranches(owner, repo, { per_page: 10 }),
          client.getRepositoryLanguages(owner, repo),
          client.getRepositoryContributors(owner, repo, { per_page: 10 }),
        ]);

        const repositoryData = repository.status === 'fulfilled' ? repository.value : null;
        if (!repositoryData) {
          return NextResponse.json(
            { error: 'Repository not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          repository: repositoryData,
          readme: readme.status === 'fulfilled' ? readme.value : null,
          releases: releases.status === 'fulfilled' ? releases.value : [],
          branches: branches.status === 'fulfilled' ? branches.value : [],
          languages: languages.status === 'fulfilled' ? languages.value : {},
          contributors: contributors.status === 'fulfilled' ? contributors.value : [],
        });

      } catch (error) {
        return NextResponse.json(
          { error: 'Repository not found or inaccessible' },
          { status: 404 }
        );
      }

    } else if (action === 'validate') {
      // Validate repository URL or path
      const url = searchParams.get('url');
      const owner = searchParams.get('owner');
      const repo = searchParams.get('repo');

      if (url) {
        // Validate URL format
        const client = createAuthenticatedGitHubClient(process.env.GITHUB_TOKEN || '');
        
        try {
          const isValid = client.isValidGitHubUrl(url);
          if (!isValid) {
            return NextResponse.json({
              success: true,
              valid: false,
              error: 'Invalid GitHub URL format',
            });
          }

          const { owner: urlOwner, repo: urlRepo } = client.parseGitHubUrl(url);
          const isAccessible = await client.validateRepository(urlOwner, urlRepo);

          return NextResponse.json({
            success: true,
            valid: isAccessible,
            owner: urlOwner,
            repo: urlRepo,
            error: isAccessible ? null : 'Repository not found or not accessible',
          });

        } catch (error) {
          return NextResponse.json({
            success: true,
            valid: false,
            error: String(error),
          });
        }

      } else if (owner && repo) {
        // Validate owner/repo directly
        const client = createAuthenticatedGitHubClient(process.env.GITHUB_TOKEN || '');
        const isAccessible = await client.validateRepository(owner, repo);

        return NextResponse.json({
          success: true,
          valid: isAccessible,
          owner,
          repo,
          error: isAccessible ? null : 'Repository not found or not accessible',
        });

      } else {
        return NextResponse.json(
          { error: 'Either url or both owner and repo parameters are required' },
          { status: 400 }
        );
      }

    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('GitHub repositories error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get repositories', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/repositories - Batch operations on repositories
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const { action, repositories } = body;

    if (!action || !Array.isArray(repositories)) {
      return NextResponse.json(
        { error: 'Action and repositories array are required' },
        { status: 400 }
      );
    }

    // Get user's GitHub token
    const githubToken = await getUserGitHubToken(user.id);
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 400 }
      );
    }

    const client = createAuthenticatedGitHubClient(githubToken);

    switch (action) {
      case 'batch_info': {
        // Get information for multiple repositories
        const repoSpecs = repositories.map(repo => ({
          owner: repo.owner,
          repo: repo.repo,
        }));

        const results = await client.batchGetRepositories(repoSpecs);
        
        return NextResponse.json({
          success: true,
          repositories: results.map((repo, index) => ({
            ...repoSpecs[index],
            data: repo,
            found: !!repo,
          })),
        });
      }

      case 'validate_batch': {
        // Validate multiple repositories
        const validationPromises = repositories.map(async (repo) => {
          try {
            const isValid = await client.validateRepository(repo.owner, repo.repo);
            return {
              owner: repo.owner,
              repo: repo.repo,
              valid: isValid,
              error: isValid ? null : 'Repository not found or not accessible',
            };
          } catch (error) {
            return {
              owner: repo.owner,
              repo: repo.repo,
              valid: false,
              error: String(error),
            };
          }
        });

        const results = await Promise.all(validationPromises);
        
        return NextResponse.json({
          success: true,
          results,
          summary: {
            total: results.length,
            valid: results.filter(r => r.valid).length,
            invalid: results.filter(r => !r.valid).length,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('GitHub repositories batch error:', error);
    
    return NextResponse.json(
      { error: 'Batch operation failed', message: String(error) },
      { status: 500 }
    );
  }
}