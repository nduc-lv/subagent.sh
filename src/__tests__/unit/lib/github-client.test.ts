import { GitHubClient } from '@/lib/github/client';
import { createMockOctokit, mockGitHubUser, mockGitHubRepository, mockGitHubErrors } from '@/__tests__/mocks/github';

// Mock the Octokit constructor
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

const { Octokit } = require('@octokit/rest');

describe('GitHubClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Octokit.mockImplementation(() => createMockOctokit());
  });

  describe('Constructor', () => {
    it('creates client with default options', () => {
      const client = new GitHubClient();
      
      expect(Octokit).toHaveBeenCalledWith({
        auth: undefined,
        userAgent: 'Subagents.sh/1.0',
        baseUrl: undefined,
        log: undefined,
        request: {
          timeout: 10000,
        },
      });
    });

    it('creates client with custom options', () => {
      const options = {
        auth: 'test-token',
        userAgent: 'Custom/1.0',
        baseUrl: 'https://api.github.com',
        request: {
          timeout: 5000,
        },
      };

      const client = new GitHubClient(options);

      expect(Octokit).toHaveBeenCalledWith({
        auth: 'test-token',
        userAgent: 'Custom/1.0',
        baseUrl: 'https://api.github.com',
        log: undefined,
        request: {
          timeout: 5000,
        },
      });
    });
  });

  describe('Static Factory Methods', () => {
    it('creates client with token using withToken', () => {
      const client = GitHubClient.withToken('test-token');
      
      expect(Octokit).toHaveBeenCalledWith({
        auth: 'test-token',
        userAgent: 'Subagents.sh/1.0',
        baseUrl: undefined,
        log: undefined,
        request: {
          timeout: 10000,
        },
      });
    });

    it('creates client with token and custom options using withToken', () => {
      const client = GitHubClient.withToken('test-token', {
        userAgent: 'Custom/1.0',
        request: { timeout: 15000 },
      });
      
      expect(Octokit).toHaveBeenCalledWith({
        auth: 'test-token',
        userAgent: 'Custom/1.0',
        baseUrl: undefined,
        log: undefined,
        request: {
          timeout: 15000,
        },
      });
    });
  });

  describe('Error Handling', () => {
    let client: GitHubClient;
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = createMockOctokit();
      Octokit.mockImplementation(() => mockOctokit);
      client = new GitHubClient({ auth: 'test-token' });
    });

    it('handles 404 Not Found errors', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(mockGitHubErrors.notFound);

      await expect(client.getRepository('owner', 'repo')).rejects.toMatchObject({
        status: 404,
        message: 'Not Found',
      });
    });

    it('handles 401 Unauthorized errors', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(mockGitHubErrors.unauthorized);

      await expect(client.getAuthenticatedUser()).rejects.toMatchObject({
        status: 401,
        message: 'Bad credentials',
      });
    });

    it('handles 403 Forbidden errors', async () => {
      mockOctokit.rest.repos.listForUser.mockRejectedValue(mockGitHubErrors.forbidden);

      await expect(client.listUserRepositories('username')).rejects.toMatchObject({
        status: 403,
        message: 'Forbidden',
      });
    });

    it('handles rate limit errors', async () => {
      mockOctokit.rest.search.repos.mockRejectedValue(mockGitHubErrors.rateLimited);

      await expect(client.searchRepositories('query')).rejects.toMatchObject({
        status: 403,
        message: 'API rate limit exceeded',
      });
    });
  });

  describe('API Methods', () => {
    let client: GitHubClient;
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = createMockOctokit();
      Octokit.mockImplementation(() => mockOctokit);
      client = new GitHubClient({ auth: 'test-token' });
    });

    it('gets current user successfully', async () => {
      const user = await client.getAuthenticatedUser();
      
      expect(user).toEqual(mockGitHubUser);
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalled();
    });

    it('gets user by username successfully', async () => {
      const user = await client.getUser('testuser');
      
      expect(user).toEqual(mockGitHubUser);
      expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledWith({
        username: 'testuser',
      });
    });

    it('gets repository successfully', async () => {
      const repo = await client.getRepository('owner', 'repo');
      
      expect(repo).toEqual(mockGitHubRepository);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
      });
    });

    it('lists user repositories successfully', async () => {
      const repos = await client.listUserRepositories('testuser');
      
      expect(repos).toEqual([mockGitHubRepository]);
      expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith({
        username: 'testuser',
        type: 'all',
        sort: 'updated',
        per_page: 100,
      });
    });

    it('lists authenticated user repositories successfully', async () => {
      const repos = await client.listAuthenticatedUserRepositories();
      
      expect(repos).toEqual([mockGitHubRepository]);
      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
      });
    });

    it('searches repositories successfully', async () => {
      const results = await client.searchRepositories('claude-agent');
      
      expect(results.total_count).toBe(2);
      expect(results.repositories).toHaveLength(2);
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'claude-agent',
        sort: 'stars',
        order: 'desc',
        per_page: 100,
      });
    });

    it('gets repository content successfully', async () => {
      const content = await client.getRepositoryContent('owner', 'repo', 'claude.md');
      
      expect(content.name).toBe('claude.md');
      expect(content.type).toBe('file');
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'claude.md',
      });
    });

    it('gets repository content with custom ref', async () => {
      await client.getRepositoryContent('owner', 'repo', 'README.md', 'develop');
      
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'README.md',
        ref: 'develop',
      });
    });

    it('lists repository commits successfully', async () => {
      const commits = await client.getRepositoryCommits('owner', 'repo');
      
      expect(commits).toHaveLength(1);
      expect(commits[0].sha).toBe('abc123');
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        per_page: 100,
      });
    });

    it('lists repository releases successfully', async () => {
      const releases = await client.getRepositoryReleases('owner', 'repo');
      
      expect(releases).toHaveLength(1);
      expect(releases[0].tag_name).toBe('v1.0.0');
      expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        per_page: 100,
      });
    });

    it('gets repository tree successfully', async () => {
      const tree = await client.getRepositoryContent('owner', 'repo', 'main');
      
      expect(tree.tree).toHaveLength(4);
      expect(tree.tree[0].path).toBe('claude.md');
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        tree_sha: 'main',
        recursive: 'true',
      });
    });

    it('gets rate limit status successfully', async () => {
      const rateLimit = await client.getRateLimit();
      
      expect(rateLimit.rate.limit).toBe(5000);
      expect(rateLimit.rate.remaining).toBe(4999);
      expect(mockOctokit.rest.rateLimit.get).toHaveBeenCalled();
    });
  });

  describe('Advanced Search Features', () => {
    let client: GitHubClient;
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = createMockOctokit();
      Octokit.mockImplementation(() => mockOctokit);
      client = new GitHubClient({ auth: 'test-token' });
    });

    it('searches repositories with complex query', async () => {
      const searchOptions = {
        language: 'TypeScript',
        stars: '>10',
        topic: 'claude-agent',
        sort: 'updated' as const,
        order: 'desc' as const,
      };

      await client.searchRepositories('claude', searchOptions);
      
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'claude language:TypeScript stars:>10 topic:claude-agent',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
      });
    });

    it('searches repositories with user filter', async () => {
      await client.searchRepositories('agent user:testuser language:Python');
      
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'agent user:testuser language:Python',
        sort: 'stars',
        order: 'desc',
        per_page: 100,
      });
    });

    it('searches repositories with date filters', async () => {
      await client.searchRepositories('claude-agent created:>2024-01-01 pushed:>2024-06-01');
      
      expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'claude-agent created:>2024-01-01 pushed:>2024-06-01',
        sort: 'stars',
        order: 'desc',
        per_page: 100,
      });
    });
  });

  describe('Pagination Support', () => {
    let client: GitHubClient;
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = createMockOctokit();
      Octokit.mockImplementation(() => mockOctokit);
      client = new GitHubClient({ auth: 'test-token' });
    });

    it('handles pagination parameters', async () => {
      await client.listUserRepositories('testuser', { page: 2, per_page: 50 });
      
      expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith({
        username: 'testuser',
        type: 'all',
        sort: 'updated',
        page: 2,
        per_page: 50,
      });
    });

    it('uses default pagination when not specified', async () => {
      await client.listUserRepositories('testuser');
      
      expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith({
        username: 'testuser',
        type: 'all',
        sort: 'updated',
        per_page: 100,
      });
    });
  });

  describe('Content Decoding', () => {
    let client: GitHubClient;
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = createMockOctokit();
      Octokit.mockImplementation(() => mockOctokit);
      client = new GitHubClient({ auth: 'test-token' });
    });

    it('decodes base64 content correctly', async () => {
      const content = await client.getRepositoryContent('owner', 'repo', 'claude.md');
      
      expect(content.content).toBeDefined();
      expect(content.encoding).toBe('base64');
      
      // The mock returns base64 encoded content
      const decodedContent = Buffer.from(content.content, 'base64').toString('utf-8');
      expect(decodedContent).toContain('# Test Claude Agent');
    });

    it('provides raw content access method', async () => {
      const rawContent = await client.getRepositoryContent('owner', 'repo', 'claude.md');
      
      expect(rawContent).toContain('# Test Claude Agent');
      expect(rawContent).toContain('This is a test Claude agent');
    });
  });

  describe('Error Recovery', () => {
    let client: GitHubClient;
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = createMockOctokit();
      Octokit.mockImplementation(() => mockOctokit);
      client = new GitHubClient({ auth: 'test-token' });
    });

    it('retries on temporary failures', async () => {
      // Mock temporary failure followed by success
      mockOctokit.rest.repos.get
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({ data: mockGitHubRepository });

      const repo = await client.getRepository('owner', 'repo');
      
      expect(repo).toEqual(mockGitHubRepository);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(2);
    });

    it('gives up after max retries', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        client.getRepository('owner', 'repo')
      ).rejects.toThrow('ECONNRESET');
      
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('does not retry on 404 errors', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(mockGitHubErrors.notFound);

      await expect(
        client.getRepository('owner', 'repo')
      ).rejects.toMatchObject({
        status: 404,
        message: 'Not Found',
      });
      
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(1); // No retries for 404
    });
  });
});