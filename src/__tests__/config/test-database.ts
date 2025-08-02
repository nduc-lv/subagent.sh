import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Test database configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Create Supabase clients for testing
export const testSupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const testSupabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Test data cleanup utilities
export class TestDatabaseManager {
  private client = testSupabaseAdmin;

  async cleanup() {
    try {
      // Clean up in reverse order of dependencies
      await this.cleanupReviews();
      await this.cleanupBookmarks();
      await this.cleanupCollections();
      await this.cleanupAgents();
      await this.cleanupUsers();
      await this.cleanupSearchAnalytics();
      await this.cleanupGitHubData();
    } catch (error) {
      console.error('Error during test database cleanup:', error);
      throw error;
    }
  }

  async setupTestData() {
    try {
      await this.cleanup(); // Clean first
      await this.createTestUsers();
      await this.createTestAgents();
      await this.createTestCollections();
      await this.createTestReviews();
      await this.createTestBookmarks();
    } catch (error) {
      console.error('Error during test data setup:', error);
      throw error;
    }
  }

  private async cleanupReviews() {
    await this.client.from('reviews').delete().neq('id', '');
    await this.client.from('review_votes').delete().neq('id', '');
  }

  private async cleanupBookmarks() {
    await this.client.from('bookmarks').delete().neq('id', '');
  }

  private async cleanupCollections() {
    await this.client.from('collection_agents').delete().neq('collection_id', '');
    await this.client.from('collections').delete().neq('id', '');
  }

  private async cleanupAgents() {
    await this.client.from('agents').delete().neq('id', '');
  }

  private async cleanupUsers() {
    // Note: In tests, we might not want to delete auth.users
    // as this is managed by Supabase Auth
    await this.client.from('profiles').delete().neq('id', '');
  }

  private async cleanupSearchAnalytics() {
    // Search analytics would be tracked separately if needed
    console.log('Search analytics cleanup - not implemented');
  }

  private async cleanupGitHubData() {
    await this.client.from('github_sync_log').delete().neq('id', '');
  }

  private async createTestUsers() {
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'test1@example.com',
        name: 'Test User 1',
        avatar_url: 'https://example.com/avatar1.jpg',
        github_username: 'testuser1',
      },
      {
        id: 'test-user-2',
        email: 'test2@example.com',
        name: 'Test User 2',
        avatar_url: 'https://example.com/avatar2.jpg',
        github_username: 'testuser2',
      },
    ];

    for (const user of testUsers) {
      await this.client.from('profiles').insert(user);
    }
  }

  private async createTestAgents() {
    const testAgents = [
      {
        id: 'test-agent-1',
        name: 'Test Agent 1',
        description: 'A comprehensive test agent for productivity tasks',
        github_repo_url: 'https://github.com/testuser1/agent1',
        documentation_url: 'https://example.com/docs/agent1',
        author_id: 'test-user-1',
        featured: true,
        status: 'published' as const,
        tags: ['productivity', 'automation', 'testing'],
      },
      {
        id: 'test-agent-2',
        name: 'Test Agent 2',
        description: 'A development-focused test agent',
        github_repo_url: 'https://github.com/testuser2/agent2',
        documentation_url: 'https://example.com/docs/agent2',
        author_id: 'test-user-2',
        featured: false,
        status: 'published' as const,
        tags: ['development', 'coding', 'testing'],
      },
      {
        id: 'test-agent-3',
        name: 'Test Agent 3',
        description: 'A draft agent for testing',
        github_repo_url: 'https://github.com/testuser1/agent3',
        author_id: 'test-user-1',
        featured: false,
        status: 'draft' as const,
        tags: ['productivity', 'draft'],
      },
    ];

    for (const agent of testAgents) {
      await this.client.from('agents').insert(agent);
    }
  }

  private async createTestCollections() {
    const testCollections = [
      {
        id: 'test-collection-1',
        name: 'My Favorites',
        description: 'My favorite productivity agents',
        user_id: 'test-user-1',
        is_public: true,
      },
      {
        id: 'test-collection-2',
        name: 'Development Tools',
        description: 'Useful development agents',
        user_id: 'test-user-2',
        is_public: false,
      },
    ];

    for (const collection of testCollections) {
      await this.client.from('collections').insert(collection);
    }

    // Add agents to collections
    const collectionAgents = [
      { collection_id: 'test-collection-1', agent_id: 'test-agent-1' },
      { collection_id: 'test-collection-2', agent_id: 'test-agent-2' },
    ];

    for (const relation of collectionAgents) {
      await this.client.from('collection_agents').insert(relation);
    }
  }

  private async createTestReviews() {
    const testReviews = [
      {
        id: 'test-review-1',
        agent_id: 'test-agent-1',
        user_id: 'test-user-2',
        overall_rating: 5,
        title: 'Excellent agent!',
        content: 'This agent has significantly improved my productivity workflow.',
        status: 'active' as const,
      },
      {
        id: 'test-review-2',
        agent_id: 'test-agent-1',
        user_id: 'test-user-1',
        overall_rating: 4,
        title: 'Good but room for improvement',
        content: 'Works well but could use better documentation.',
        status: 'active' as const,
      },
      {
        id: 'test-review-3',
        agent_id: 'test-agent-2',
        user_id: 'test-user-1',
        overall_rating: 3,
        title: 'Moderate review',
        content: 'Decent agent but has some bugs.',
        status: 'active' as const,
      },
    ];

    for (const review of testReviews) {
      await this.client.from('reviews').insert(review);
    }
  }

  private async createTestBookmarks() {
    const testBookmarks = [
      {
        id: 'test-bookmark-1',
        user_id: 'test-user-1',
        agent_id: 'test-agent-2',
      },
      {
        id: 'test-bookmark-2',
        user_id: 'test-user-2',
        agent_id: 'test-agent-1',
      },
    ];

    for (const bookmark of testBookmarks) {
      await this.client.from('bookmarks').insert(bookmark);
    }
  }

  async createTestSession(userId: string) {
    // Mock a user session for testing
    return {
      access_token: `test-token-${userId}`,
      refresh_token: `test-refresh-${userId}`,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        email: `${userId}@example.com`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  async getTestAgent(id: string) {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getTestUser(id: string) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}

// Global test database manager instance
export const testDbManager = new TestDatabaseManager();

// Helper functions for tests
export const setupTestDatabase = async () => {
  await testDbManager.setupTestData();
};

export const cleanupTestDatabase = async () => {
  await testDbManager.cleanup();
};

// Mock authenticated user for tests
export const mockAuthenticatedUser = (userId: string = 'test-user-1') => {
  return {
    id: userId,
    email: `${userId}@example.com`,
    name: `Test User ${userId.split('-').pop()}`,
    avatar_url: `https://example.com/avatar${userId.split('-').pop()}.jpg`,
    github_username: `testuser${userId.split('-').pop()}`,
  };
};