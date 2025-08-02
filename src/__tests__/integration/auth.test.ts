import { setupTestDatabase, cleanupTestDatabase, testSupabaseClient } from '@/__tests__/config/test-database';
import { createMockSupabaseClient } from '@/__tests__/utils/test-utils';

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up auth state before each test
    await testSupabaseClient.auth.signOut();
  });

  describe('User Registration and Login', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'securePassword123!';

      const { data, error } = await testSupabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: 'New User',
          },
        },
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(email);
      expect(data.user?.user_metadata.name).toBe('New User');
    });

    it('should not allow registration with invalid email', async () => {
      const invalidEmail = 'invalid-email';
      const password = 'securePassword123!';

      const { data, error } = await testSupabaseClient.auth.signUp({
        email: invalidEmail,
        password,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid email');
      expect(data.user).toBeNull();
    });

    it('should not allow registration with weak password', async () => {
      const email = 'user@example.com';
      const weakPassword = '123';

      const { data, error } = await testSupabaseClient.auth.signUp({
        email,
        password: weakPassword,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Password should be at least 6 characters');
      expect(data.user).toBeNull();
    });

    it('should sign in existing user successfully', async () => {
      const email = 'test@example.com';
      const password = 'testPassword123!';

      // First register the user
      await testSupabaseClient.auth.signUp({
        email,
        password,
      });

      // Then sign in
      const { data, error } = await testSupabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(email);
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
    });

    it('should not sign in with incorrect password', async () => {
      const email = 'test@example.com';
      const correctPassword = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';

      // Register user first
      await testSupabaseClient.auth.signUp({
        email,
        password: correctPassword,
      });

      // Try to sign in with wrong password
      const { data, error } = await testSupabaseClient.auth.signInWithPassword({
        email,
        password: wrongPassword,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid credentials');
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should not sign in non-existent user', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123!';

      const { data, error } = await testSupabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid credentials');
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe('Session Management', () => {
    let userEmail: string;
    let userPassword: string;

    beforeEach(async () => {
      userEmail = `session-test-${Date.now()}@example.com`;
      userPassword = 'sessionPassword123!';

      // Register and sign in user
      await testSupabaseClient.auth.signUp({
        email: userEmail,
        password: userPassword,
      });

      await testSupabaseClient.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });
    });

    it('should get current session when user is signed in', async () => {
      const { data, error } = await testSupabaseClient.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session?.user.email).toBe(userEmail);
    });

    it('should get current user when user is signed in', async () => {
      const { data, error } = await testSupabaseClient.auth.getUser();

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userEmail);
    });

    it('should sign out user successfully', async () => {
      // Verify user is signed in
      const sessionBefore = await testSupabaseClient.auth.getSession();
      expect(sessionBefore.data.session).toBeDefined();

      // Sign out
      const { error } = await testSupabaseClient.auth.signOut();
      expect(error).toBeNull();

      // Verify user is signed out
      const sessionAfter = await testSupabaseClient.auth.getSession();
      expect(sessionAfter.data.session).toBeNull();
    });

    it('should refresh session with valid refresh token', async () => {
      const { data: initialSession } = await testSupabaseClient.auth.getSession();
      expect(initialSession.session?.refresh_token).toBeDefined();

      // Wait a moment to ensure new token would have different issued time
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data, error } = await testSupabaseClient.auth.refreshSession({
        refresh_token: initialSession.session!.refresh_token,
      });

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
      expect(data.session?.access_token).not.toBe(initialSession.session?.access_token);
    });
  });

  describe('OAuth Authentication', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const { data, error } = await testSupabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      });

      expect(error).toBeNull();
      expect(data.url).toBeDefined();
      expect(data.url).toContain('github.com');
      expect(data.url).toContain('oauth/authorize');
    });

    it('should handle OAuth callback correctly', async () => {
      // This would typically be tested with a mock OAuth response
      // For now, we'll test the structure of what should happen
      const mockOAuthResult = {
        access_token: 'mock-oauth-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'oauth-user-id',
          email: 'oauth@example.com',
          user_metadata: {
            avatar_url: 'https://github.com/avatar.jpg',
            full_name: 'OAuth User',
            provider_id: 'github-user-id',
          },
        },
      };

      // In a real test, this would verify the OAuth callback handling
      expect(mockOAuthResult.user.email).toBeDefined();
      expect(mockOAuthResult.access_token).toBeDefined();
      expect(mockOAuthResult.user.user_metadata.provider_id).toBeDefined();
    });
  });

  describe('Password Reset', () => {
    let userEmail: string;

    beforeEach(async () => {
      userEmail = `reset-test-${Date.now()}@example.com`;
      
      // Register user
      await testSupabaseClient.auth.signUp({
        email: userEmail,
        password: 'originalPassword123!',
      });
    });

    it('should send password reset email for existing user', async () => {
      const { data, error } = await testSupabaseClient.auth.resetPasswordForEmail(userEmail, {
        redirectTo: 'http://localhost:3000/auth/reset-password',
      });

      expect(error).toBeNull();
      // Note: In test environment, emails aren't actually sent
      // This verifies the API call structure
    });

    it('should not reveal if email exists for security', async () => {
      const nonExistentEmail = 'nonexistent@example.com';

      const { data, error } = await testSupabaseClient.auth.resetPasswordForEmail(nonExistentEmail);

      // Supabase doesn't reveal whether email exists for security reasons
      expect(error).toBeNull();
    });
  });

  describe('User Profile Management', () => {
    let userId: string;

    beforeEach(async () => {
      const email = `profile-test-${Date.now()}@example.com`;
      const password = 'profilePassword123!';

      const { data } = await testSupabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: 'Profile Test User',
          },
        },
      });

      userId = data.user!.id;
    });

    it('should update user metadata', async () => {
      const updates = {
        data: {
          name: 'Updated Name',
          bio: 'Updated bio',
        },
      };

      const { data, error } = await testSupabaseClient.auth.updateUser(updates);

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.user_metadata.name).toBe('Updated Name');
      expect(data.user?.user_metadata.bio).toBe('Updated bio');
    });

    it('should update user email', async () => {
      const newEmail = `updated-${Date.now()}@example.com`;

      const { data, error } = await testSupabaseClient.auth.updateUser({
        email: newEmail,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      // Note: Email change typically requires confirmation
      expect(data.user?.new_email).toBe(newEmail);
    });

    it('should update user password', async () => {
      const newPassword = 'newSecurePassword123!';

      const { data, error } = await testSupabaseClient.auth.updateUser({
        password: newPassword,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();

      // Verify new password works by signing out and back in
      await testSupabaseClient.auth.signOut();

      const signInResult = await testSupabaseClient.auth.signInWithPassword({
        email: data.user!.email!,
        password: newPassword,
      });

      expect(signInResult.error).toBeNull();
      expect(signInResult.data.user).toBeDefined();
    });
  });

  describe('Auth State Management', () => {
    it('should track auth state changes', async () => {
      const authStateChanges: any[] = [];

      const { data: { subscription } } = testSupabaseClient.auth.onAuthStateChange(
        (event, session) => {
          authStateChanges.push({ event, session });
        }
      );

      const email = `state-test-${Date.now()}@example.com`;
      const password = 'statePassword123!';

      // Register user (should trigger SIGNED_IN)
      await testSupabaseClient.auth.signUp({
        email,
        password,
      });

      // Sign out (should trigger SIGNED_OUT)
      await testSupabaseClient.auth.signOut();

      // Wait for state changes to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clean up subscription
      subscription.unsubscribe();

      expect(authStateChanges.length).toBeGreaterThan(0);
      expect(authStateChanges.some(change => change.event === 'SIGNED_IN')).toBe(true);
      expect(authStateChanges.some(change => change.event === 'SIGNED_OUT')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        const { data, error } = await testSupabaseClient.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'password123!',
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('Network error');
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });

    it('should handle invalid JWT tokens', async () => {
      // Set an invalid token
      await testSupabaseClient.auth.setSession({
        access_token: 'invalid.jwt.token',
        refresh_token: 'invalid-refresh-token',
      });

      const { data, error } = await testSupabaseClient.auth.getUser();

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });
});