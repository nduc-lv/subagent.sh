import { http, HttpResponse } from 'msw';

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  github_username: 'testuser',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAgents = [
  {
    id: 'agent-1',
    name: 'Test Agent 1',
    description: 'A test agent for testing purposes',
    category: 'productivity',
    github_url: 'https://github.com/testuser/agent1',
    documentation_url: 'https://example.com/docs',
    tags: ['test', 'productivity'],
    author_id: 'user-123',
    rating: 4.5,
    download_count: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'agent-2',
    name: 'Test Agent 2',
    description: 'Another test agent',
    category: 'development',
    github_url: 'https://github.com/testuser/agent2',
    documentation_url: 'https://example.com/docs2',
    tags: ['test', 'development'],
    author_id: 'user-123',
    rating: 4.2,
    download_count: 75,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockReviews = [
  {
    id: 'review-1',
    agent_id: 'agent-1',
    user_id: 'user-123',
    rating: 5,
    title: 'Excellent agent!',
    content: 'This agent works perfectly for my needs.',
    helpful_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'review-2',
    agent_id: 'agent-1',
    user_id: 'user-456',
    rating: 4,
    title: 'Good but could be better',
    content: 'Works well but has some minor issues.',
    helpful_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const handlers = [
  // Auth endpoints
  http.get('*/auth/user', () => {
    return HttpResponse.json({ user: mockUser });
  }),

  http.post('*/auth/sign-in', () => {
    return HttpResponse.json({ user: mockUser, session: { access_token: 'mock-token' } });
  }),

  http.post('*/auth/sign-out', () => {
    return HttpResponse.json({ message: 'Signed out successfully' });
  }),

  // Agents endpoints
  http.get('*/agents', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let filteredAgents = [...mockAgents];

    if (search) {
      filteredAgents = filteredAgents.filter(agent =>
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      filteredAgents = filteredAgents.filter(agent => agent.category === category);
    }

    const paginatedAgents = filteredAgents.slice(offset, offset + limit);

    return HttpResponse.json({
      data: paginatedAgents,
      count: filteredAgents.length,
      total: mockAgents.length,
    });
  }),

  http.get('*/agents/:id', ({ params }) => {
    const { id } = params;
    const agent = mockAgents.find(a => a.id === id);
    
    if (!agent) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: agent });
  }),

  http.post('*/agents', async ({ request }) => {
    const body = await request.json();
    const newAgent = {
      id: `agent-${Date.now()}`,
      ...body,
      author_id: 'user-123',
      rating: 0,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockAgents.push(newAgent);
    return HttpResponse.json({ data: newAgent }, { status: 201 });
  }),

  http.put('*/agents/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const agentIndex = mockAgents.findIndex(a => a.id === id);

    if (agentIndex === -1) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    mockAgents[agentIndex] = {
      ...mockAgents[agentIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ data: mockAgents[agentIndex] });
  }),

  http.delete('*/agents/:id', ({ params }) => {
    const { id } = params;
    const agentIndex = mockAgents.findIndex(a => a.id === id);

    if (agentIndex === -1) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    mockAgents.splice(agentIndex, 1);
    return HttpResponse.json({ message: 'Agent deleted successfully' });
  }),

  // Reviews endpoints
  http.get('*/reviews', ({ request }) => {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent_id');
    
    let filteredReviews = [...mockReviews];
    
    if (agentId) {
      filteredReviews = filteredReviews.filter(review => review.agent_id === agentId);
    }

    return HttpResponse.json({
      data: filteredReviews,
      count: filteredReviews.length,
    });
  }),

  http.post('*/reviews', async ({ request }) => {
    const body = await request.json();
    const newReview = {
      id: `review-${Date.now()}`,
      ...body,
      user_id: 'user-123',
      helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockReviews.push(newReview);
    return HttpResponse.json({ data: newReview }, { status: 201 });
  }),

  // GitHub API endpoints
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json({
      login: 'testuser',
      id: 123456,
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://example.com/avatar.jpg',
    });
  }),

  http.get('https://api.github.com/user/repos', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        description: 'A test repository',
        html_url: 'https://github.com/testuser/test-repo',
        clone_url: 'https://github.com/testuser/test-repo.git',
        stargazers_count: 10,
        forks_count: 2,
        language: 'TypeScript',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get('https://api.github.com/repos/:owner/:repo', ({ params }) => {
    const { owner, repo } = params;
    return HttpResponse.json({
      id: 1,
      name: repo,
      full_name: `${owner}/${repo}`,
      description: 'A test repository',
      html_url: `https://github.com/${owner}/${repo}`,
      clone_url: `https://github.com/${owner}/${repo}.git`,
      stargazers_count: 10,
      forks_count: 2,
      language: 'TypeScript',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
  }),

  http.get('https://api.github.com/repos/:owner/:repo/contents/:path', ({ params }) => {
    const { path } = params;
    
    if (path === 'README.md') {
      return HttpResponse.json({
        name: 'README.md',
        path: 'README.md',
        type: 'file',
        content: Buffer.from('# Test Repository\n\nThis is a test repository.').toString('base64'),
        encoding: 'base64',
      });
    }

    if (path === 'claude.md') {
      return HttpResponse.json({
        name: 'claude.md',
        path: 'claude.md',
        type: 'file',
        content: Buffer.from('# Claude Agent\n\nThis is a Claude agent.').toString('base64'),
        encoding: 'base64',
      });
    }

    return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
  }),

  // Search endpoints
  http.get('*/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const filteredAgents = mockAgents.filter(agent =>
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.description.toLowerCase().includes(query.toLowerCase()) ||
      agent.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return HttpResponse.json({
      data: filteredAgents,
      count: filteredAgents.length,
      query,
    });
  }),

  // Collections endpoints
  http.get('*/collections', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'collection-1',
          name: 'My Favorites',
          description: 'My favorite agents',
          user_id: 'user-123',
          agent_ids: ['agent-1'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      count: 1,
    });
  }),

  // Bookmarks endpoints
  http.get('*/bookmarks', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'bookmark-1',
          user_id: 'user-123',
          agent_id: 'agent-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      count: 1,
    });
  }),

  // Analytics endpoints
  http.get('*/analytics/agents/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      data: {
        agent_id: id,
        views: 150,
        downloads: 100,
        ratings_count: 25,
        average_rating: 4.5,
        bookmarks: 30,
        reviews_count: 15,
      },
    });
  }),
];