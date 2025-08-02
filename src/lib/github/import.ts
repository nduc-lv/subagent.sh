import { GitHubClient, createAuthenticatedGitHubClient } from './client';
import { SubAgentParser, createAuthenticatedSubAgentParser, type SubAgentFile } from './subagent-parser';
import type {
  GitHubRepository,
  GitHubImportResult,
  Agent,
  GitHubUser,
  GitHubRelease,
  GitHubCommit
} from '@/types';

export interface ImportOptions {
  readmeAsDescription?: boolean;
  tagsFromTopics?: boolean;
  versionFromReleases?: boolean;
  autoPublish?: boolean;
  categoryMapping?: Record<string, string>;
  defaultCategory?: string;
  overwriteExisting?: boolean;
  skipIfExists?: boolean;
  selectedAgentPaths?: string[]; // Optional: specific file paths to import
}

export interface ImportContext {
  userId: string;
  userToken?: string;
  options: ImportOptions;
}

export class GitHubImportService {
  private client: GitHubClient;
  private parser: SubAgentParser;

  constructor(token?: string) {
    this.client = token ? createAuthenticatedGitHubClient(token) : new GitHubClient();
    this.parser = token ? createAuthenticatedSubAgentParser(token) : new SubAgentParser();
  }

  /**
   * Import a single repository from GitHub URL
   */
  async importFromUrl(url: string, context: ImportContext): Promise<GitHubImportResult> {
    const startTime = Date.now();
    const result: GitHubImportResult = {
      success: false,
      errors: [],
      warnings: [],
      metadata: {
        processing_time_ms: 0,
        files_processed: 0,
        features_detected: [],
      },
    };

    try {
      // Parse GitHub URL
      const { owner, repo } = this.client.parseGitHubUrl(url);
      
      // Fetch repository data
      const repository = await this.client.getRepository(owner, repo);
      result.repository = repository;

      // Import the repository
      const agents = await this.importRepository(repository, context);
      result.agents = agents;
      result.agent = agents[0]; // For backward compatibility
      result.success = true;
      result.metadata.files_processed = agents.length;
      result.metadata.features_detected = ['subagent-parsing', 'markdown-extraction'];

    } catch (error) {
      result.errors?.push(`Import failed: ${error}`);
    }

    result.metadata.processing_time_ms = Date.now() - startTime;
    return result;
  }

  /**
   * Import a repository object and parse sub-agents
   */
  async importRepository(repository: GitHubRepository, context: ImportContext): Promise<Agent[]> {
    const { owner, name } = repository;
    const { options } = context;

    try {
      // Parse sub-agent markdown files from the repository
      const subAgentFiles = await this.parser.parseRepositorySubAgents(
        owner.login,
        name,
        repository.default_branch
      );

      if (subAgentFiles.length === 0) {
        throw new Error('No valid sub-agent files found in repository. Please ensure your repository contains properly formatted sub-agent markdown files.');
      }

      // Filter agents if specific paths are selected
      let agentsToImport = subAgentFiles;
      if (options.selectedAgentPaths && options.selectedAgentPaths.length > 0) {
        agentsToImport = subAgentFiles.filter(file => 
          options.selectedAgentPaths!.includes(file.path)
        );
        
        if (agentsToImport.length === 0) {
          throw new Error('None of the selected agent files were found in the repository.');
        }
      }

      // Get additional repository data for context
      const [latestCommit] = await Promise.allSettled([
        this.client.getLatestCommit(owner.login, name),
      ]);

      const commit = latestCommit.status === 'fulfilled' ? latestCommit.value : null;

      // Convert each sub-agent file to Agent object
      const agents: Agent[] = [];
      
      for (const subAgentFile of agentsToImport) {
        try {
          const agentData = this.parser.convertToAgent(subAgentFile, repository, {
            userId: context.userId,
            categoryId: this.mapCategory(repository, options),
          });

          // Add import-specific metadata
          const agent: Agent = {
            ...agentData,
            status: options.autoPublish ? 'published' : 'draft',
            github_sha: commit?.sha,
            last_github_sync: new Date().toISOString(),
          } as Agent;

          agents.push(agent);
        } catch (error) {
          console.warn(`Failed to convert sub-agent ${subAgentFile.name}:`, error);
        }
      }

      if (agents.length === 0) {
        throw new Error('Failed to process any sub-agent files from repository');
      }

      return agents;
      
    } catch (error) {
      throw new Error(`Failed to import sub-agents from repository: ${error}`);
    }
  }

  /**
   * Batch import multiple repositories
   */
  async batchImport(
    repositories: GitHubRepository[],
    context: ImportContext
  ): Promise<GitHubImportResult[]> {
    const results: GitHubImportResult[] = [];

    for (const repository of repositories) {
      try {
        const agents = await this.importRepository(repository, context);
        results.push({
          success: true,
          agents,
          agent: agents[0], // For backward compatibility
          repository,
          errors: [],
          warnings: [],
          metadata: {
            processing_time_ms: 0,
            files_processed: agents.length,
            features_detected: ['subagent-parsing', 'markdown-extraction'],
          },
        });
      } catch (error) {
        results.push({
          success: false,
          repository,
          errors: [`Failed to import ${repository.full_name}: ${error}`],
          warnings: [],
          metadata: {
            processing_time_ms: 0,
            files_processed: 0,
            features_detected: [],
          },
        });
      }
    }

    return results;
  }

  /**
   * Import user's repositories
   */
  async importUserRepositories(
    username: string,
    context: ImportContext,
    filters: {
      includePrivate?: boolean;
      includeForks?: boolean;
      minStars?: number;
      language?: string;
      topics?: string[];
    } = {}
  ): Promise<GitHubImportResult[]> {
    try {
      // Get user's repositories
      const repositories = await this.client.listUserRepositories(username, {
        type: filters.includePrivate ? 'all' : 'owner',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      // Apply filters
      const filteredRepos = repositories.filter(repo => {
        if (!filters.includeForks && repo.fork) return false;
        if (filters.minStars && repo.stargazers_count < filters.minStars) return false;
        if (filters.language && repo.language !== filters.language) return false;
        if (filters.topics && !filters.topics.some(topic => repo.topics.includes(topic))) return false;
        return true;
      });

      return this.batchImport(filteredRepos, context);
    } catch (error) {
      return [{
        success: false,
        errors: [`Failed to fetch repositories for user ${username}: ${error}`],
        warnings: [],
        metadata: {
          processing_time_ms: 0,
          files_processed: 0,
          features_detected: [],
        },
      }];
    }
  }

  /**
   * Search and import repositories
   */
  async searchAndImport(
    query: string,
    context: ImportContext,
    options: {
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
      order?: 'desc' | 'asc';
      limit?: number;
    } = {}
  ): Promise<GitHubImportResult[]> {
    try {
      const { repositories } = await this.client.searchRepositories(query, {
        sort: options.sort || 'stars',
        order: options.order || 'desc',
        per_page: Math.min(options.limit || 10, 100),
      });

      return this.batchImport(repositories, context);
    } catch (error) {
      return [{
        success: false,
        errors: [`Search failed: ${error}`],
        warnings: [],
        metadata: {
          processing_time_ms: 0,
          files_processed: 0,
          features_detected: [],
        },
      }];
    }
  }

  // Private helper methods

  private sanitizeName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  private getPrimaryLanguage(languages: Record<string, number>): string | undefined {
    const entries = Object.entries(languages);
    if (entries.length === 0) return undefined;
    
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private generateDescription(
    repository: GitHubRepository,
    readme: string | null,
    packageData: any,
    options: ImportOptions
  ): { short: string; detailed?: string } {
    // Use repository description as primary
    let shortDescription = repository.description || '';

    // Fallback to package.json description
    if (!shortDescription && packageData?.description) {
      shortDescription = packageData.description;
    }

    // Extract from README if enabled and no description found
    if (!shortDescription && options.readmeAsDescription && readme) {
      shortDescription = this.extractShortDescriptionFromReadme(readme);
    }

    // Fallback
    if (!shortDescription) {
      shortDescription = `A ${repository.language || 'software'} project`;
    }

    // Generate detailed description from README
    let detailedDescription: string | undefined;
    if (readme && options.readmeAsDescription) {
      detailedDescription = this.extractDetailedDescriptionFromReadme(readme);
    }

    return {
      short: shortDescription.slice(0, 500),
      detailed: detailedDescription?.slice(0, 5000),
    };
  }

  private extractShortDescriptionFromReadme(readme: string): string {
    const lines = readme.split('\n');
    
    // Skip title and find first substantial paragraph
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#') && !line.startsWith('!') && line.length > 20) {
        return line.replace(/^\*\*|\*\*$/g, '').replace(/^\*|\*$/g, '').trim();
      }
    }

    return '';
  }

  private extractDetailedDescriptionFromReadme(readme: string): string {
    // Remove excessive headers and format for display
    return readme
      .replace(/^#{4,}.*$/gm, '') // Remove h4+ headers
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .trim();
  }

  private generateTags(
    repository: GitHubRepository,
    packageData: any,
    primaryLanguage: string | undefined,
    options: ImportOptions
  ): string[] {
    const tags: Set<string> = new Set();

    // Add language tag
    if (primaryLanguage) {
      tags.add(primaryLanguage.toLowerCase());
    }

    // Add topics from repository if enabled
    if (options.tagsFromTopics && repository.topics) {
      repository.topics.forEach(topic => tags.add(topic));
    }

    // Add keywords from package.json
    if (packageData?.keywords) {
      packageData.keywords.forEach((keyword: string) => tags.add(keyword));
    }

    // Add framework/technology tags
    const detectedTech = this.detectTechnologies(packageData, repository);
    detectedTech.forEach(tech => tags.add(tech));

    // Limit tags and clean them
    return Array.from(tags)
      .slice(0, 10)
      .map(tag => tag.toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(tag => tag.length > 1);
  }

  private detectTechnologies(packageData: any, repository: GitHubRepository): string[] {
    const technologies: string[] = [];

    if (packageData?.dependencies || packageData?.devDependencies) {
      const deps = { ...packageData.dependencies, ...packageData.devDependencies };
      
      // React
      if (deps.react) technologies.push('react');
      if (deps['next'] || deps['next.js']) technologies.push('nextjs');
      if (deps.vue) technologies.push('vue');
      if (deps.angular) technologies.push('angular');
      if (deps.svelte) technologies.push('svelte');
      
      // Backend
      if (deps.express) technologies.push('express');
      if (deps.fastify) technologies.push('fastify');
      if (deps.koa) technologies.push('koa');
      if (deps.nest || deps['@nestjs/core']) technologies.push('nestjs');
      
      // Databases
      if (deps.mongoose || deps.mongodb) technologies.push('mongodb');
      if (deps.pg || deps.postgresql) technologies.push('postgresql');
      if (deps.mysql || deps.mysql2) technologies.push('mysql');
      if (deps.redis) technologies.push('redis');
      
      // Tools
      if (deps.typescript) technologies.push('typescript');
      if (deps.webpack) technologies.push('webpack');
      if (deps.vite) technologies.push('vite');
      if (deps.eslint) technologies.push('eslint');
      if (deps.prettier) technologies.push('prettier');
    }

    return technologies;
  }

  private determineVersion(
    release: GitHubRelease | null,
    packageData: any,
    repository: GitHubRepository,
    options: ImportOptions
  ): string {
    // Use latest release if enabled and available
    if (options.versionFromReleases && release) {
      return release.tag_name.replace(/^v/, '');
    }

    // Use package.json version
    if (packageData?.version) {
      return packageData.version;
    }

    // Default version
    return '1.0.0';
  }

  private detectFramework(
    packageData: any,
    languages: Record<string, number>,
    repository: GitHubRepository
  ): string | undefined {
    if (packageData?.dependencies || packageData?.devDependencies) {
      const deps = { ...packageData.dependencies, ...packageData.devDependencies };
      
      if (deps.react && deps.next) return 'Next.js';
      if (deps.react) return 'React';
      if (deps.vue) return 'Vue.js';
      if (deps.angular) return 'Angular';
      if (deps.svelte) return 'Svelte';
      if (deps.express) return 'Express.js';
      if (deps['@nestjs/core']) return 'NestJS';
      if (deps.fastify) return 'Fastify';
    }

    // Language-based framework detection
    const primaryLanguage = this.getPrimaryLanguage(languages);
    if (primaryLanguage === 'Python') {
      // Could check for requirements.txt or pyproject.toml here
      return 'Python';
    }
    if (primaryLanguage === 'Java') {
      return 'Java';
    }

    return undefined;
  }

  private findDocumentationUrl(repository: GitHubRepository, packageData: any): string | undefined {
    // Check common documentation patterns
    const possibleUrls = [
      repository.homepage,
      packageData?.homepage,
      `${repository.html_url}/wiki`,
      `${repository.html_url}/blob/${repository.default_branch}/docs/README.md`,
    ];

    return possibleUrls.find(url => url && url.includes('doc')) || possibleUrls[0];
  }

  private findDemoUrl(repository: GitHubRepository, packageData: any): string | undefined {
    const homepage = repository.homepage || packageData?.homepage;
    
    // Skip if homepage is just the GitHub repo
    if (homepage && !homepage.includes('github.com')) {
      return homepage;
    }

    // Check for GitHub Pages
    if (repository.has_pages) {
      return `https://${repository.owner.login}.github.io/${repository.name}`;
    }

    return undefined;
  }

  private mapCategory(repository: GitHubRepository, options: ImportOptions): string | undefined {
    const { categoryMapping, defaultCategory } = options;

    if (categoryMapping) {
      // Check topics first
      for (const topic of repository.topics) {
        if (categoryMapping[topic]) {
          return categoryMapping[topic];
        }
      }

      // Check language
      if (repository.language && categoryMapping[repository.language.toLowerCase()]) {
        return categoryMapping[repository.language.toLowerCase()];
      }
    }

    return defaultCategory;
  }

  /**
   * Validate import data before processing
   */
  validateImportData(repository: GitHubRepository): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!repository.name) {
      errors.push('Repository name is required');
    }

    if (!repository.owner) {
      errors.push('Repository owner is required');
    }

    if (repository.private) {
      errors.push('Private repositories cannot be imported');
    }

    if (repository.archived) {
      errors.push('Archived repositories should not be imported');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Preview import without creating agent
   */
  async previewImport(url: string, context: ImportContext): Promise<Partial<Agent>[]> {
    const { owner, repo } = this.client.parseGitHubUrl(url);
    const repository = await this.client.getRepository(owner, repo);
    return this.importRepository(repository, context);
  }
}

// Export default instance
export const githubImporter = new GitHubImportService();

// Export authenticated importer factory
export function createAuthenticatedGitHubImporter(token: string): GitHubImportService {
  return new GitHubImportService(token);
}