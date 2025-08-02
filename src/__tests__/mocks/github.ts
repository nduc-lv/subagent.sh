import { Octokit } from '@octokit/rest';

// Mock GitHub API responses
export const mockGitHubUser = {
  login: 'testuser',
  id: 123456,
  node_id: 'MDQ6VXNlcjEyMzQ1Ng==',
  avatar_url: 'https://github.com/images/error/testuser_happy.gif',
  gravatar_id: '',
  url: 'https://api.github.com/users/testuser',
  html_url: 'https://github.com/testuser',
  name: 'Test User',
  company: 'Test Company',
  blog: 'https://testuser.dev',
  location: 'Test City',
  email: 'test@example.com',
  hireable: null,
  bio: 'Test user bio',
  twitter_username: 'testuser',
  public_repos: 25,
  public_gists: 5,
  followers: 100,
  following: 50,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockGitHubRepository = {
  id: 1,
  node_id: 'MDEwOlJlcG9zaXRvcnkx',
  name: 'test-agent',
  full_name: 'testuser/test-agent',
  private: false,
  owner: mockGitHubUser,
  html_url: 'https://github.com/testuser/test-agent',
  description: 'A test agent repository',
  fork: false,
  url: 'https://api.github.com/repos/testuser/test-agent',
  clone_url: 'https://github.com/testuser/test-agent.git',
  git_url: 'git://github.com/testuser/test-agent.git',
  ssh_url: 'git@github.com:testuser/test-agent.git',
  homepage: 'https://testuser.dev',
  size: 108,
  stargazers_count: 80,
  watchers_count: 80,
  language: 'TypeScript',
  has_issues: true,
  has_projects: true,
  has_wiki: true,
  has_pages: false,
  forks_count: 9,
  archived: false,
  disabled: false,
  open_issues_count: 0,
  license: {
    key: 'mit',
    name: 'MIT License',
    spdx_id: 'MIT',
    url: 'https://api.github.com/licenses/mit',
    node_id: 'MDc6TGljZW5zZW1pdA==',
  },
  allow_forking: true,
  is_template: false,
  topics: ['claude-agent', 'ai', 'productivity'],
  visibility: 'public',
  forks: 9,
  open_issues: 0,
  watchers: 80,
  default_branch: 'main',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  pushed_at: '2024-01-01T00:00:00Z',
};

export const mockGitHubRepositories = [
  mockGitHubRepository,
  {
    ...mockGitHubRepository,
    id: 2,
    name: 'another-agent',
    full_name: 'testuser/another-agent',
    description: 'Another test agent',
    html_url: 'https://github.com/testuser/another-agent',
    clone_url: 'https://github.com/testuser/another-agent.git',
    stargazers_count: 45,
    forks_count: 5,
    language: 'Python',
    topics: ['claude-agent', 'development', 'automation'],
  },
];

export const mockGitHubContent = {
  name: 'claude.md',
  path: 'claude.md',
  sha: 'a5f2a0d2c8',
  size: 1024,
  url: 'https://api.github.com/repos/testuser/test-agent/contents/claude.md',
  html_url: 'https://github.com/testuser/test-agent/blob/main/claude.md',
  git_url: 'https://api.github.com/repos/testuser/test-agent/git/blobs/a5f2a0d2c8',
  download_url: 'https://raw.githubusercontent.com/testuser/test-agent/main/claude.md',
  type: 'file',
  content: Buffer.from(`# Test Claude Agent

This is a test Claude agent for productivity tasks.

## Description
A comprehensive agent that helps with various productivity tasks including:
- Task management
- Note taking
- Calendar scheduling
- Email drafting

## Usage
1. Import the agent
2. Configure your preferences
3. Start using the commands

## Commands
- \`/task\` - Create a new task
- \`/note\` - Take a quick note
- \`/schedule\` - Schedule an event
- \`/email\` - Draft an email

## Configuration
Configure the agent by setting your preferences in the settings panel.
`).toString('base64'),
  encoding: 'base64',
};

export const mockGitHubReadme = {
  ...mockGitHubContent,
  name: 'README.md',
  path: 'README.md',
  content: Buffer.from(`# Test Agent Repository

A test repository for Claude agents.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
See the claude.md file for agent-specific instructions.
`).toString('base64'),
};

export const mockGitHubSearchResults = {
  total_count: 2,
  incomplete_results: false,
  items: mockGitHubRepositories,
};

// Mock Octokit class
export const createMockOctokit = (overrides = {}) => {
  const mockOctokit = {
    rest: {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({ data: mockGitHubUser }),
        getByUsername: jest.fn().mockResolvedValue({ data: mockGitHubUser }),
      },
      repos: {
        listForAuthenticatedUser: jest.fn().mockResolvedValue({
          data: mockGitHubRepositories,
        }),
        listForUser: jest.fn().mockResolvedValue({
          data: mockGitHubRepositories,
        }),
        get: jest.fn().mockResolvedValue({ data: mockGitHubRepository }),
        getContent: jest.fn().mockImplementation(({ path }) => {
          if (path === 'claude.md') {
            return Promise.resolve({ data: mockGitHubContent });
          } else if (path === 'README.md') {
            return Promise.resolve({ data: mockGitHubReadme });
          } else {
            return Promise.reject({ status: 404, message: 'Not Found' });
          }
        }),
        listCommits: jest.fn().mockResolvedValue({
          data: [
            {
              sha: 'abc123',
              commit: {
                message: 'Initial commit',
                author: {
                  name: 'Test User',
                  email: 'test@example.com',
                  date: '2024-01-01T00:00:00Z',
                },
              },
              author: mockGitHubUser,
            },
          ],
        }),
        listReleases: jest.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              tag_name: 'v1.0.0',
              name: 'v1.0.0',
              body: 'Initial release',
              draft: false,
              prerelease: false,
              created_at: '2024-01-01T00:00:00Z',
              published_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      },
      search: {
        repos: jest.fn().mockResolvedValue({ data: mockGitHubSearchResults }),
      },
      git: {
        getTree: jest.fn().mockResolvedValue({
          data: {
            tree: [
              { path: 'claude.md', type: 'blob' },
              { path: 'README.md', type: 'blob' },
              { path: 'package.json', type: 'blob' },
              { path: 'src', type: 'tree' },
            ],
          },
        }),
      },
      rateLimit: {
        get: jest.fn().mockResolvedValue({
          data: {
            rate: {
              limit: 5000,
              remaining: 4999,
              reset: Math.floor(Date.now() / 1000) + 3600,
              used: 1,
            },
          },
        }),
      },
    },
    ...overrides,
  };

  return mockOctokit as unknown as Octokit;
};

// GitHub API error responses
export const mockGitHubErrors = {
  notFound: {
    status: 404,
    message: 'Not Found',
    documentation_url: 'https://docs.github.com/rest',
  },
  unauthorized: {
    status: 401,
    message: 'Bad credentials',
    documentation_url: 'https://docs.github.com/rest',
  },
  forbidden: {
    status: 403,
    message: 'Forbidden',
    documentation_url: 'https://docs.github.com/rest',
  },
  rateLimited: {
    status: 403,
    message: 'API rate limit exceeded',
    documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
  },
};

// Helper to create mock GitHub webhooks payload
export const createMockWebhookPayload = (event: string, overrides = {}) => {
  const basePayload = {
    action: 'created',
    repository: mockGitHubRepository,
    sender: mockGitHubUser,
  };

  switch (event) {
    case 'push':
      return {
        ref: 'refs/heads/main',
        before: 'abc123',
        after: 'def456',
        commits: [
          {
            id: 'def456',
            message: 'Update agent',
            author: {
              name: 'Test User',
              email: 'test@example.com',
            },
            timestamp: '2024-01-01T00:00:00Z',
            added: ['new-file.md'],
            removed: [],
            modified: ['claude.md'],
          },
        ],
        ...basePayload,
        ...overrides,
      };

    case 'release':
      return {
        action: 'published',
        release: {
          id: 1,
          tag_name: 'v1.0.0',
          name: 'v1.0.0',
          body: 'Initial release',
          draft: false,
          prerelease: false,
          created_at: '2024-01-01T00:00:00Z',
          published_at: '2024-01-01T00:00:00Z',
        },
        ...basePayload,
        ...overrides,
      };

    case 'star':
      return {
        action: 'created',
        starred_at: '2024-01-01T00:00:00Z',
        ...basePayload,
        ...overrides,
      };

    default:
      return {
        ...basePayload,
        ...overrides,
      };
  }
};

// Mock GitHub webhook signature verification
export const createMockWebhookSignature = (payload: string, secret: string) => {
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${signature}`;
};

// Helper to create realistic GitHub API delay
export const mockGitHubApiDelay = (ms = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};