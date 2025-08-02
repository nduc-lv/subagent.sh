import { GitHubClient } from './client';
import type { Agent } from '@/types';

interface SubAgentMetadata {
  name?: string;
  description?: string;
  tools?: string[];
  category?: string;
  version?: string;
  author?: string;
  [key: string]: any;
}

export interface SubAgentFile {
  path: string;
  name: string;
  content: string;
  metadata: SubAgentMetadata;
  parsedContent: string;
}

export class SubAgentParser {
  private client: GitHubClient;

  constructor(token?: string) {
    this.client = new GitHubClient({ auth: token });
  }

  /**
   * Parse sub-agent markdown files from a GitHub repository
   */
  async parseRepositorySubAgents(
    owner: string,
    repo: string,
    branch = 'main'
  ): Promise<SubAgentFile[]> {
    try {
      // Use the more efficient Tree API to get all files at once
      const tree = await this.client.getRepositoryTree(owner, repo, branch, true);
      
      if (!tree || !tree.tree) {
        throw new Error('Repository tree not accessible');
      }

      // Find all markdown files in the repository (with deep subfolder support)
      const markdownFiles = tree.tree.filter((item: any) => {
        if (item.type !== 'blob' || !item.path.endsWith('.md')) {
          return false;
        }
        
        // Get filename from path
        const fileName = item.path.split('/').pop() || '';
        
        // Skip common documentation files and CLAUDE.md
        const excludedFiles = [
          'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 
          'SECURITY.md', 'CODE_OF_CONDUCT.md', 'SUPPORT.md', 'AUTHORS.md',
          'NOTICE.md', 'CREDITS.md', 'ACKNOWLEDGMENTS.md', 'CLAUDE.md'
        ];
        
        // Check if the filename (not full path) is in excluded list
        if (excludedFiles.includes(fileName)) {
          return false;
        }
        
        // Allow all other markdown files from any directory depth
        return true;
      });

      console.log(`Found ${markdownFiles.length} markdown files to process:`);
      markdownFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.path}`);
      });

      const subAgents: SubAgentFile[] = [];

      // Parse each markdown file using blob API (more efficient)
      for (let i = 0; i < markdownFiles.length; i++) {
        const file = markdownFiles[i];
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
          try {
            console.log(`Processing file ${i + 1}/${markdownFiles.length}: ${file.path} (attempt ${retryCount + 1})`);
            
            // Add progressive delay to avoid rate limiting
            if (i > 0 || retryCount > 0) {
              const delay = Math.min(100 + (retryCount * 200), 1000); // Start at 100ms, increase with retries, max 1s
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Get file content using blob API
            const content = await this.client.getBlobContent(owner, repo, file.sha);
            
            const parsedAgent = this.parseMarkdownFile(file.path, file.path, content);
            
            if (parsedAgent) {
              subAgents.push(parsedAgent);
              console.log(`Successfully parsed: ${file.path} (${subAgents.length} total)`);
            } else {
              console.log(`Skipped (not a valid sub-agent): ${file.path}`);
            }
            
            // Success, break out of retry loop
            break;
            
          } catch (error) {
            retryCount++;
            const isRateLimit = error instanceof Error && (
              error.message.includes('rate limit') || 
              error.message.includes('403') ||
              error.message.includes('API rate limit exceeded')
            );
            
            if (retryCount > maxRetries) {
              console.warn(`Failed to parse ${file.path} after ${maxRetries} attempts:`, error);
              break; // Move to next file
            } else if (isRateLimit) {
              console.warn(`Rate limit hit for ${file.path}, retrying in ${2000 * retryCount}ms...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff for rate limits
            } else {
              console.warn(`Error parsing ${file.path} (attempt ${retryCount}):`, error);
              await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Brief retry delay for other errors
            }
          }
        }
      }

      console.log(`Successfully parsed ${subAgents.length} sub-agents`);
      return subAgents;
    } catch (error) {
      throw new Error(`Failed to parse repository sub-agents: ${error}`);
    }
  }

  /**
   * Parse a single markdown file for sub-agent metadata
   */
  parseMarkdownFile(path: string, fileName: string, content: string): SubAgentFile | null {
    try {
      const { metadata, content: parsedContent } = this.extractFrontmatter(content);
      
      // Extract name from filename if not in metadata or invalid
      let agentName = metadata.name;
      if (!agentName || !/^[a-z][a-z0-9-]*$/.test(agentName)) {
        const fileBaseName = fileName.replace(/\.md$/, '').split('/').pop() || 'unnamed-agent';
        agentName = fileBaseName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        // Ensure it starts with a letter
        if (!/^[a-z]/.test(agentName)) {
          agentName = 'agent-' + agentName;
        }
      }
      
      // Update metadata with corrected name
      const correctedMetadata = {
        ...metadata,
        name: agentName,
      };
      
      // Validate this looks like a sub-agent file
      if (!this.isValidSubAgent(correctedMetadata, content)) {
        return null;
      }
      
      return {
        path,
        name: agentName,
        content,
        metadata: correctedMetadata,
        parsedContent,
      };
    } catch (error) {
      console.warn(`Failed to parse markdown file ${path}:`, error);
      return null;
    }
  }

  /**
   * Convert sub-agent file to Agent object
   */
  convertToAgent(
    subAgent: SubAgentFile,
    repository: any,
    context: { userId: string; categoryId?: string }
  ): Partial<Agent> {
    const { metadata, parsedContent } = subAgent;
    
    // Ensure we have a valid name
    const agentName = metadata.name || subAgent.name || 'Unnamed Agent';
    
    // Generate slug from name and repository info to ensure uniqueness
    const slug = this.generateSlug(agentName, repository.owner.login, repository.name);
    
    // Extract tools from metadata or content
    const tools = this.extractTools(metadata, parsedContent);
    
    // Extract description
    const description = this.extractDescription(metadata, parsedContent);
    
    // Ensure we have required fields
    const content = parsedContent || metadata.description || 'No content available';
    const shortDescription = description.short || 'A Claude Code sub-agent';
    
    return {
      name: agentName,
      slug,
      description: shortDescription,
      content: content,
      short_description: description.excerpt,
      author_id: context.userId,
      category_id: context.categoryId,
      status: 'draft',
      version: metadata.version || '1.0.0',
      tags: this.extractTags(metadata, parsedContent),
      
      // Sub-agent specific fields
      agent_type: 'subagent',
      tools,
      file_path: subAgent.path,
      raw_markdown: subAgent.content,
      parsed_metadata: metadata,
      
      // GitHub integration
      github_url: repository.html_url,
      github_repo_name: repository.full_name,
      github_owner: repository.owner.login,
      github_stars: repository.stargazers_count,
      github_forks: repository.forks_count,
      github_issues: repository.open_issues_count,
      github_last_updated: repository.updated_at,
      github_language: repository.language,
      github_topics: repository.topics || [],
      github_license: repository.license?.name,
      sync_enabled: true,
      
      // Original Author Attribution
      original_author_github_username: repository.owner.login,
      original_author_github_url: repository.owner.html_url,
      original_author_avatar_url: repository.owner.avatar_url,
      import_source: 'github_import' as const,
      
      // Metadata
      requirements: this.extractRequirements(metadata, parsedContent),
      installation_instructions: this.extractInstallationInstructions(parsedContent),
      usage_examples: this.extractUsageExamples(parsedContent),
      compatibility_notes: metadata.compatibility_notes,
      
      // Stats (defaults)
      download_count: 0,
      view_count: 0,
      bookmark_count: 0,
      rating_average: 0,
      rating_count: 0,
      
      // Settings
      is_featured: false,
      is_verified: false,
    };
  }

  /**
   * Extract frontmatter and content from markdown
   */
  private extractFrontmatter(markdown: string): { metadata: SubAgentMetadata; content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontmatterRegex);
    
    if (!match) {
      // No frontmatter, try to extract metadata from content
      const extractedMetadata = this.extractMetadataFromContent(markdown);
      return {
        metadata: extractedMetadata,
        content: markdown,
      };
    }
    
    const [, frontmatter, content] = match;
    
    try {
      // Parse YAML-like frontmatter
      const metadata = this.parseSimpleYaml(frontmatter);
      return { metadata, content: content.trim() };
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error);
      // Fallback to content extraction
      const extractedMetadata = this.extractMetadataFromContent(markdown);
      return { metadata: extractedMetadata, content: markdown };
    }
  }

  /**
   * Simple YAML parser for frontmatter
   */
  private parseSimpleYaml(yaml: string): SubAgentMetadata {
    const metadata: SubAgentMetadata = {};
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();
      
      // Remove quotes if present
      value = value.replace(/^['"]|['"]$/g, '');
      
      if (key === 'tools' && value) {
        // Tools can be comma-separated string
        metadata[key] = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Parse array
        metadata[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      } else {
        // Parse string/value
        metadata[key] = value;
      }
    }
    
    return metadata;
  }

  /**
   * Extract metadata from content if no frontmatter
   */
  private extractMetadataFromContent(content: string): SubAgentMetadata {
    const metadata: SubAgentMetadata = {};
    const lines = content.split('\n');
    
    // Look for common patterns
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      const line = lines[i].trim();
      
      // Tools: pattern
      if (line.toLowerCase().includes('tools:')) {
        const toolsMatch = line.match(/tools?:\s*(.+)/i);
        if (toolsMatch) {
          metadata.tools = toolsMatch[1].split(',').map(t => t.trim());
        }
      }
      
      // Name from first heading or extract from filename pattern
      if (line.startsWith('# ') && !metadata.name) {
        const titleName = line.slice(2).trim();
        // Convert title to slug format
        metadata.name = titleName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      
      // Description from various patterns
      if (!metadata.description) {
        // Role: pattern
        if (line.toLowerCase().startsWith('**role**:')) {
          metadata.description = line.replace(/^\*\*role\*\*:\s*/i, '').trim();
        }
        // Description: pattern
        else if (line.toLowerCase().startsWith('**description**:')) {
          metadata.description = line.replace(/^\*\*description\*\*:\s*/i, '').trim();
        }
        // First substantial paragraph
        else if (line && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('**') 
                 && line.length > 30 && !line.includes('tools:')) {
          metadata.description = line;
        }
      }
    }
    
    // If no name found, provide a placeholder
    if (!metadata.name) {
      metadata.name = 'unnamed-agent';
    }
    
    // If no description found, provide a basic one
    if (!metadata.description) {
      metadata.description = 'A Claude Code sub-agent';
    }
    
    return metadata;
  }

  /**
   * Validate if this looks like a sub-agent file
   */
  private isValidSubAgent(metadata: SubAgentMetadata, content: string): boolean {
    // Check for required frontmatter fields according to the subagent format
    // Required fields: name and description
    if (!metadata.name || !metadata.description) {
      return false;
    }
    
    // Validate name format (lowercase letters, numbers, and hyphens)
    if (!/^[a-z][a-z0-9-]*$/.test(metadata.name)) {
      return false;
    }
    
    // Check if there's actual content after frontmatter (system prompt)
    // Look for the frontmatter pattern and extract content properly
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      // No proper frontmatter structure, but allow it if we have basic metadata
      const hasBasicContent = content.trim().length > 100;
      return hasBasicContent;
    }
    
    const systemPrompt = match[2].trim();
    if (!systemPrompt || systemPrompt.length < 50) {
      // System prompt should have meaningful content
      return false;
    }
    
    // Optional: validate tools field if present
    if (metadata.tools !== undefined) {
      // Tools should be either a string or array
      const toolsList = Array.isArray(metadata.tools) 
        ? metadata.tools 
        : (typeof metadata.tools === 'string' ? metadata.tools.split(',').map(t => t.trim()) : []);
      
      // Basic validation that tools are non-empty strings
      if (!toolsList.every(tool => typeof tool === 'string' && tool.length > 0)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract name from filename
   */
  private extractNameFromFilename(fileName: string): string {
    return fileName
      .replace(/\.md$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Generate URL-safe slug with repository context for uniqueness
   */
  private generateSlug(name: string, owner?: string, repo?: string): string {
    if (!name) {
      return 'unnamed-agent';
    }
    
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .trim();
    
    // Ensure slug is not empty and matches the required pattern
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      slug = 'unnamed-agent';
    }
    
    // Add repository context for uniqueness when available
    if (owner && repo) {
      const repoSlug = `${owner}-${repo}`
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Combine with a separator to ensure uniqueness
      slug = `${slug}-${repoSlug}`;
    }
    
    return slug;
  }

  /**
   * Extract tools from metadata or content
   */
  private extractTools(metadata: SubAgentMetadata, content: string): string[] {
    // For subagents, tools are primarily defined in frontmatter
    if (metadata.tools) {
      return Array.isArray(metadata.tools) ? metadata.tools : [metadata.tools];
    }
    
    // If no tools specified in frontmatter, subagent inherits all tools (empty array means inherit all)
    return [];
  }

  /**
   * Extract description
   */
  private extractDescription(metadata: SubAgentMetadata, content: string): { short: string; excerpt?: string } {
    // For subagents, the description from frontmatter is the primary description
    if (metadata.description) {
      return {
        short: metadata.description,
        excerpt: this.extractFirstParagraph(content),
      };
    }
    
    // If no description in frontmatter, this is not a valid subagent
    return {
      short: 'Invalid subagent - missing description',
      excerpt: undefined,
    };
  }

  /**
   * Extract first substantial paragraph
   */
  private extractFirstParagraph(content: string): string {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && 
          !trimmed.startsWith('#') && 
          !trimmed.startsWith('-') && 
          !trimmed.startsWith('*') &&
          !trimmed.includes('tools:') &&
          trimmed.length > 20) {
        return trimmed.slice(0, 500);
      }
    }
    
    return '';
  }

  /**
   * Extract tags from metadata and content
   */
  private extractTags(metadata: SubAgentMetadata, content: string): string[] {
    const tags = new Set<string>();
    
    // Always add core subagent tags
    tags.add('subagent');
    tags.add('claude-code');
    
    // From metadata
    if (metadata.tags) {
      const metaTags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags];
      metaTags.forEach(tag => tags.add(tag.toLowerCase()));
    }
    
    if (metadata.category) {
      tags.add(metadata.category.toLowerCase());
    }
    
    // Extract domain from subagent name
    const name = metadata.name || '';
    if (name.includes('test') || name.includes('qa')) {
      tags.add('testing');
    }
    if (name.includes('review') || name.includes('code')) {
      tags.add('code-review');
    }
    if (name.includes('debug')) {
      tags.add('debugging');
    }
    if (name.includes('security') || name.includes('audit')) {
      tags.add('security');
    }
    if (name.includes('data') || name.includes('sql')) {
      tags.add('data');
    }
    if (name.includes('deploy') || name.includes('devops')) {
      tags.add('devops');
    }
    
    // Extract domain from description
    const description = (metadata.description || '').toLowerCase();
    if (description.includes('test')) tags.add('testing');
    if (description.includes('review')) tags.add('code-review');
    if (description.includes('security')) tags.add('security');
    if (description.includes('debug')) tags.add('debugging');
    if (description.includes('data')) tags.add('data');
    if (description.includes('frontend')) tags.add('frontend');
    if (description.includes('backend')) tags.add('backend');
    
    return Array.from(tags).slice(0, 10);
  }

  /**
   * Extract requirements
   */
  private extractRequirements(metadata: SubAgentMetadata, content: string): string[] {
    if (metadata.requirements) {
      return Array.isArray(metadata.requirements) ? metadata.requirements : [metadata.requirements];
    }
    
    // Look for requirements section
    const reqMatch = content.match(/(?:requirements?|dependencies|prerequisites):\s*\n((?:\s*[-*]\s*.+\n?)+)/i);
    if (reqMatch) {
      return reqMatch[1]
        .split('\n')
        .map(line => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter(line => line.length > 0);
    }
    
    return ['Claude Code CLI'];
  }

  /**
   * Extract installation instructions
   */
  private extractInstallationInstructions(content: string): string | undefined {
    const installMatch = content.match(/(?:## Installation|# Installation|## Setup|# Setup)\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);
    return installMatch ? installMatch[1].trim() : undefined;
  }

  /**
   * Extract usage examples
   */
  private extractUsageExamples(content: string): string | undefined {
    const usageMatch = content.match(/(?:## Usage|# Usage|## Examples|# Examples)\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);
    return usageMatch ? usageMatch[1].trim() : undefined;
  }
}

export const subAgentParser = new SubAgentParser();
export function createAuthenticatedSubAgentParser(token: string): SubAgentParser {
  return new SubAgentParser(token);
}