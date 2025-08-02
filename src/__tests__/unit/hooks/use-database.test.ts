import { renderHook, waitFor } from '@/__tests__/utils/test-utils';
import { act } from '@testing-library/react';
import { 
  useAgents, 
  useAgent, 
  useAgentSearch, 
  useCategories,
  useBookmarks,
  useVoting,
  useAgentMutations,
  useUserAgents,
  useAnalytics
} from '@/hooks/use-database';
import { AgentFactory, UserFactory } from '@/__tests__/factories';
import { createMockSupabaseClient } from '@/__tests__/utils/test-utils';

// Mock the database module
jest.mock('@/lib/supabase/database', () => ({
  db: {
    getAgents: jest.fn(),
    getAgentById: jest.fn(),
    searchAgents: jest.fn(),
    getCategories: jest.fn(),
    getUserBookmarks: jest.fn(),
    toggleBookmark: jest.fn(),
    toggleVote: jest.fn(),
    getUserVote: jest.fn(),
    createAgent: jest.fn(),
    updateAgent: jest.fn(),
    deleteAgent: jest.fn(),
    checkAgentOwnership: jest.fn(),
    saveDraft: jest.fn(),
    publishAgent: jest.fn(),
    duplicateAgent: jest.fn(),
    getUserAgents: jest.fn(),
    trackAgentView: jest.fn(),
    trackAgentDownload: jest.fn(),
  },
}));

// Mock the useSupabase hook
jest.mock('@/hooks/use-supabase', () => ({
  useSupabase: jest.fn(() => ({
    user: { id: 'test-user-1', email: 'test@example.com' },
    session: { access_token: 'test-token' },
  })),
}));

const { db } = require('@/lib/supabase/database');

describe('useAgents Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches agents successfully', async () => {
    const mockAgents = AgentFactory.buildList(5);
    db.getAgents.mockResolvedValue({ data: mockAgents, error: null });

    const { result } = renderHook(() => useAgents());

    expect(result.current.loading).toBe(true);
    expect(result.current.agents).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toEqual(mockAgents);
    expect(result.current.error).toBe(null);
    expect(db.getAgents).toHaveBeenCalledWith({});
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Failed to fetch agents';
    db.getAgents.mockResolvedValue({ data: null, error: new Error(errorMessage) });

    const { result } = renderHook(() => useAgents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('refetches agents when filters change', async () => {
    const mockAgents = AgentFactory.buildList(3);
    db.getAgents.mockResolvedValue({ data: mockAgents, error: null });

    const filters = { category: 'productivity' };
    const { result, rerender } = renderHook(
      ({ filters }) => useAgents(filters),
      { initialProps: { filters: {} } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(db.getAgents).toHaveBeenCalledWith({});

    rerender({ filters });

    await waitFor(() => {
      expect(db.getAgents).toHaveBeenCalledWith(filters);
    });
  });

  it('provides refetch function', async () => {
    const mockAgents = AgentFactory.buildList(2);
    db.getAgents.mockResolvedValue({ data: mockAgents, error: null });

    const { result } = renderHook(() => useAgents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(db.getAgents).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(db.getAgents).toHaveBeenCalledTimes(2);
  });
});

describe('useAgent Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches single agent successfully', async () => {
    const mockAgent = AgentFactory.build();
    db.getAgentById.mockResolvedValue(mockAgent);

    const { result } = renderHook(() => useAgent(mockAgent.id));

    expect(result.current.loading).toBe(true);
    expect(result.current.agent).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agent).toEqual(mockAgent);
    expect(result.current.error).toBe(null);
    expect(db.getAgentById).toHaveBeenCalledWith(mockAgent.id);
  });

  it('handles missing agent id', async () => {
    const { result } = renderHook(() => useAgent(''));

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    expect(db.getAgentById).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Agent not found';
    db.getAgentById.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAgent('invalid-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agent).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useAgentSearch Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs search successfully', async () => {
    const mockResults = [
      { id: '1', title: 'Test Agent 1', score: 0.95 },
      { id: '2', title: 'Test Agent 2', score: 0.87 },
    ];
    db.searchAgents.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useAgentSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(db.searchAgents).toHaveBeenCalledWith({ query: 'test' });
  });

  it('handles search error', async () => {
    const errorMessage = 'Search failed';
    db.searchAgents.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useAgentSearch());

    await act(async () => {
      await result.current.search({ query: 'test' });
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('sets loading state during search', async () => {
    db.searchAgents.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(() => useAgentSearch());

    act(() => {
      result.current.search({ query: 'test' });
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('useCategories Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches categories successfully', async () => {
    const mockCategories = [
      { id: '1', name: 'Productivity', count: 25 },
      { id: '2', name: 'Development', count: 18 },
    ];
    db.getCategories.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBe(null);
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Failed to fetch categories';
    db.getCategories.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useBookmarks Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches bookmarks successfully', async () => {
    const mockBookmarks = [
      { id: '1', agent_id: 'agent-1', user_id: 'test-user-1' },
      { id: '2', agent_id: 'agent-2', user_id: 'test-user-1' },
    ];
    db.getUserBookmarks.mockResolvedValue(mockBookmarks);

    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookmarks).toEqual(mockBookmarks);
    expect(db.getUserBookmarks).toHaveBeenCalledWith('test-user-1');
  });

  it('toggles bookmark successfully', async () => {
    const mockBookmarks = [{ id: '1', agent_id: 'agent-1', user_id: 'test-user-1' }];
    db.getUserBookmarks.mockResolvedValue(mockBookmarks);
    db.toggleBookmark.mockResolvedValue({ added: true });

    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleBookmark('agent-1');
    });

    expect(db.toggleBookmark).toHaveBeenCalledWith('test-user-1', 'agent-1');
    expect(db.getUserBookmarks).toHaveBeenCalledTimes(2); // Initial fetch + refetch after toggle
  });

  it('handles toggle bookmark error', async () => {
    const errorMessage = 'Failed to toggle bookmark';
    db.getUserBookmarks.mockResolvedValue([]);
    db.toggleBookmark.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useBookmarks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.toggleBookmark('agent-1');
      });
    }).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useVoting Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('votes successfully', async () => {
    db.toggleVote.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useVoting());

    await act(async () => {
      const result_vote = await result.current.vote('upvote', 'agent-1');
      expect(result_vote).toEqual({ success: true });
    });

    expect(db.toggleVote).toHaveBeenCalledWith('test-user-1', 'upvote', 'agent-1', undefined);
    expect(result.current.error).toBe(null);
  });

  it('handles vote error', async () => {
    const errorMessage = 'Failed to vote';
    db.toggleVote.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVoting());

    await expect(async () => {
      await act(async () => {
        await result.current.vote('upvote', 'agent-1');
      });
    }).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
  });

  it('gets user vote successfully', async () => {
    const mockVote = { type: 'upvote', agent_id: 'agent-1' };
    db.getUserVote.mockResolvedValue(mockVote);

    const { result } = renderHook(() => useVoting());

    await act(async () => {
      const vote = await result.current.getUserVote('agent-1');
      expect(vote).toEqual(mockVote);
    });

    expect(db.getUserVote).toHaveBeenCalledWith('test-user-1', 'agent-1', undefined);
  });
});

describe('useAgentMutations Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates agent successfully', async () => {
    const agentData = { name: 'New Agent', description: 'Test agent' };
    const createdAgent = { ...agentData, id: 'new-agent-1', author_id: 'test-user-1' };
    db.createAgent.mockResolvedValue(createdAgent);

    const { result } = renderHook(() => useAgentMutations());

    await act(async () => {
      const agent = await result.current.createAgent(agentData);
      expect(agent).toEqual(createdAgent);
    });

    expect(db.createAgent).toHaveBeenCalledWith({ ...agentData, author_id: 'test-user-1' });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('updates agent successfully', async () => {
    const agentId = 'agent-1';
    const updates = { description: 'Updated description' };
    const updatedAgent = { id: agentId, ...updates };
    
    db.checkAgentOwnership.mockResolvedValue(true);
    db.updateAgent.mockResolvedValue(updatedAgent);

    const { result } = renderHook(() => useAgentMutations());

    await act(async () => {
      const agent = await result.current.updateAgent(agentId, updates);
      expect(agent).toEqual(updatedAgent);
    });

    expect(db.checkAgentOwnership).toHaveBeenCalledWith(agentId, 'test-user-1');
    expect(db.updateAgent).toHaveBeenCalledWith(agentId, updates);
  });

  it('prevents updating non-owned agent', async () => {
    const agentId = 'agent-1';
    const updates = { description: 'Updated description' };
    
    db.checkAgentOwnership.mockResolvedValue(false);

    const { result } = renderHook(() => useAgentMutations());

    await expect(async () => {
      await act(async () => {
        await result.current.updateAgent(agentId, updates);
      });
    }).rejects.toThrow('You can only edit your own agents');

    expect(db.updateAgent).not.toHaveBeenCalled();
  });

  it('deletes agent successfully', async () => {
    const agentId = 'agent-1';
    
    db.checkAgentOwnership.mockResolvedValue(true);
    db.deleteAgent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAgentMutations());

    await act(async () => {
      const success = await result.current.deleteAgent(agentId);
      expect(success).toBe(true);
    });

    expect(db.checkAgentOwnership).toHaveBeenCalledWith(agentId, 'test-user-1');
    expect(db.deleteAgent).toHaveBeenCalledWith(agentId);
  });

  it('publishes agent successfully', async () => {
    const agentId = 'agent-1';
    const publishedAgent = { id: agentId, status: 'published' };
    
    db.checkAgentOwnership.mockResolvedValue(true);
    db.publishAgent.mockResolvedValue(publishedAgent);

    const { result } = renderHook(() => useAgentMutations());

    await act(async () => {
      const agent = await result.current.publishAgent(agentId);
      expect(agent).toEqual(publishedAgent);
    });

    expect(db.publishAgent).toHaveBeenCalledWith(agentId);
  });

  it('duplicates agent successfully', async () => {
    const agentId = 'agent-1';
    const duplicatedAgent = { id: 'agent-1-copy', name: 'Copy of Agent' };
    
    db.duplicateAgent.mockResolvedValue(duplicatedAgent);

    const { result } = renderHook(() => useAgentMutations());

    await act(async () => {
      const agent = await result.current.duplicateAgent(agentId);
      expect(agent).toEqual(duplicatedAgent);
    });

    expect(db.duplicateAgent).toHaveBeenCalledWith(agentId, 'test-user-1');
  });
});

describe('useUserAgents Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches user agents successfully', async () => {
    const mockAgents = AgentFactory.buildList(3, { author_id: 'test-user-1' });
    db.getUserAgents.mockResolvedValue(mockAgents);

    const { result } = renderHook(() => useUserAgents('test-user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toEqual(mockAgents);
    expect(db.getUserAgents).toHaveBeenCalledWith('test-user-1', true);
  });

  it('handles missing user id', async () => {
    const { result } = renderHook(() => useUserAgents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.agents).toEqual([]);
    expect(db.getUserAgents).not.toHaveBeenCalled();
  });
});

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock navigator and document
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'test-user-agent' },
      writable: true,
    });
    Object.defineProperty(global, 'document', {
      value: { referrer: 'https://test-referrer.com' },
      writable: true,
    });
  });

  it('tracks view successfully', async () => {
    db.trackAgentView.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.trackView('agent-1', 'session-1');
    });

    expect(db.trackAgentView).toHaveBeenCalledWith(
      'agent-1',
      undefined,
      'session-1',
      {
        userAgent: 'test-user-agent',
        referrer: 'https://test-referrer.com',
      }
    );
  });

  it('tracks download successfully', async () => {
    db.trackAgentDownload.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.trackDownload('agent-1', 'github');
    });

    expect(db.trackAgentDownload).toHaveBeenCalledWith(
      'agent-1',
      undefined,
      'github',
      {
        userAgent: 'test-user-agent',
        referrer: 'https://test-referrer.com',
      }
    );
  });

  it('handles tracking errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    db.trackAgentView.mockRejectedValue(new Error('Tracking failed'));

    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await result.current.trackView('agent-1');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to track view:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});