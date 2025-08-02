import { test, expect } from '@playwright/test';

test.describe('GitHub Authentication Flow - Production Fixes', () => {
  test.describe('OAuth Callback Redirect', () => {
    test('should redirect to profile page after successful GitHub authentication', async ({ page }) => {
      // Mock the auth callback with success parameters
      await page.goto('/auth/callback?code=mock_auth_code&state=mock_state');

      // Should redirect to profile page (not dashboard)
      await page.waitForURL('/profile', { timeout: 10000 });
      await expect(page).toHaveURL('/profile');
    });

    test('should handle auth callback errors gracefully', async ({ page }) => {
      // Mock auth callback with error
      await page.goto('/auth/callback?error=access_denied&error_description=User%20denied%20access');

      // Should redirect to sign in page with error handling
      await page.waitForURL('/auth/signin', { timeout: 10000 });
      await expect(page).toHaveURL('/auth/signin');
    });

    test('should handle malformed callback parameters', async ({ page }) => {
      // Test with malformed parameters
      await page.goto('/auth/callback?invalid=parameter');

      // Should handle gracefully and redirect appropriately
      await page.waitForTimeout(2000);
      
      // Should either redirect to signin or home
      const currentUrl = page.url();
      expect(currentUrl.endsWith('/auth/signin') || currentUrl.endsWith('/')).toBe(true);
    });
  });

  test.describe('Profile Loading After Auth', () => {
    test('should not hang on profile page after GitHub login', async ({ page }) => {
      // Mock successful authentication state
      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'github@example.com',
            name: 'GitHub User',
            user_metadata: {
              user_name: 'githubuser',
              full_name: 'GitHub User',
              avatar_url: 'https://github.com/avatar.jpg',
              bio: 'Test bio',
              blog: 'https://example.com',
              location: 'San Francisco',
              login: 'githubuser'
            }
          },
        }));
      });

      // Navigate to profile page
      await page.goto('/profile');

      // Should not hang - page should load within reasonable time
      await expect(page.getByRole('main')).toBeVisible({ timeout: 5000 });
      
      // Should show loading state initially, then content
      const loadingState = page.getByTestId('loading');
      if (await loadingState.isVisible()) {
        await expect(loadingState).toBeHidden({ timeout: 10000 });
      }
      
      // Profile page should be interactive
      await expect(page.getByRole('heading')).toBeVisible();
    });

    test('should handle profile creation for new GitHub users', async ({ page }) => {
      // Mock new GitHub user (no existing profile)
      await page.route('**/rest/v1/profiles*', async route => {
        if (route.request().method() === 'GET') {
          // First request - no profile found
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Profile not found' })
          });
        } else if (route.request().method() === 'POST') {
          // Profile creation request
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'github-user-id',
              username: 'newgithubuser',
              full_name: 'New GitHub User',
              avatar_url: 'https://github.com/avatar.jpg',
              github_username: 'newgithubuser',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          });
        } else {
          route.continue();
        }
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'newuser@github.com',
            name: 'New GitHub User',
            user_metadata: {
              user_name: 'newgithubuser',
              full_name: 'New GitHub User',
              avatar_url: 'https://github.com/avatar.jpg',
              login: 'newgithubuser'
            }
          },
        }));
      });

      await page.goto('/profile');

      // Should create profile and not hang
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/new github user/i)).toBeVisible({ timeout: 5000 });
    });

    test('should handle concurrent profile operations without race conditions', async ({ page }) => {
      let profileRequestCount = 0;
      
      // Mock slow profile API to test race conditions
      await page.route('**/rest/v1/profiles*', async route => {
        profileRequestCount++;
        console.log(`Profile request #${profileRequestCount}`);
        
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'github-user-id',
            username: 'racetest',
            full_name: 'Race Test User',
            avatar_url: 'https://github.com/avatar.jpg',
            github_username: 'racetest'
          })
        });
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'racetest@github.com',
            name: 'Race Test User',
            user_metadata: {
              user_name: 'racetest',
              full_name: 'Race Test User',
              avatar_url: 'https://github.com/avatar.jpg',
              login: 'racetest'
            }
          },
        }));
      });

      // Navigate to profile multiple times quickly to test race conditions
      await page.goto('/profile');
      await page.goto('/');
      await page.goto('/profile');
      await page.goto('/agents');
      await page.goto('/profile');

      // Should end up on profile page without hanging
      await expect(page).toHaveURL('/profile');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
      
      // Should have resolved to show profile data
      await expect(page.getByText(/race test user/i)).toBeVisible({ timeout: 5000 });
      
      // Should not have made excessive API calls (race condition prevention)
      expect(profileRequestCount).toBeLessThanOrEqual(3); // Allow some reasonable number
    });
  });

  test.describe('Authentication State Management', () => {
    test('should handle auth state changes without infinite loops', async ({ page }) => {
      let authStateChanges = 0;
      
      // Monitor console logs for auth state changes
      page.on('console', msg => {
        if (msg.text().includes('Auth state change:')) {
          authStateChanges++;
        }
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'stable@github.com',
            name: 'Stable User',
            user_metadata: {
              user_name: 'stableuser',
              full_name: 'Stable User',
              avatar_url: 'https://github.com/avatar.jpg',
              login: 'stableuser'
            }
          },
        }));
      });

      await page.goto('/profile');
      
      // Wait for initial load
      await expect(page.getByRole('main')).toBeVisible();
      
      // Wait a bit more to ensure no infinite loops
      await page.waitForTimeout(3000);
      
      // Should not have excessive auth state changes (indicates infinite loop)
      expect(authStateChanges).toBeLessThan(10);
    });

    test('should handle page refresh without losing auth state', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'persistent@github.com',
            name: 'Persistent User',
            user_metadata: {
              user_name: 'persistentuser',
              full_name: 'Persistent User',
              avatar_url: 'https://github.com/avatar.jpg',
              login: 'persistentuser'
            }
          },
        }));
      });

      await page.goto('/profile');
      await expect(page.getByRole('main')).toBeVisible();

      // Refresh the page
      await page.reload();

      // Should maintain auth state and load profile
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
      
      // Should not redirect to sign in
      await expect(page).toHaveURL('/profile');
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from temporary network failures', async ({ page }) => {
      let requestCount = 0;
      
      // Mock intermittent network failures
      await page.route('**/rest/v1/profiles*', async route => {
        requestCount++;
        
        if (requestCount <= 2) {
          // Fail first 2 requests
          route.abort('failed');
        } else {
          // Succeed on 3rd request
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'github-user-id',
              username: 'recoverytest',
              full_name: 'Recovery Test User',
              avatar_url: 'https://github.com/avatar.jpg',
              github_username: 'recoverytest'
            })
          });
        }
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'recovery@github.com',
            name: 'Recovery Test User',
            user_metadata: {
              user_name: 'recoverytest',
              full_name: 'Recovery Test User',
              avatar_url: 'https://github.com/avatar.jpg',
              login: 'recoverytest'
            }
          },
        }));
      });

      await page.goto('/profile');

      // Should eventually load despite initial failures
      await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
      
      // Should show user data once network recovers
      await expect(page.getByText(/recovery test user/i)).toBeVisible({ timeout: 10000 });
    });

    test('should gracefully degrade when profile operations fail permanently', async ({ page }) => {
      // Mock permanent profile API failure
      await page.route('**/rest/v1/profiles*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Permanent server error' })
        });
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-github-access-token',
          refresh_token: 'mock-github-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'github-user-id',
            email: 'degraded@github.com',
            name: 'Degraded User',
            user_metadata: {
              user_name: 'degradeduser',
              full_name: 'Degraded User',
              avatar_url: 'https://github.com/avatar.jpg',
              login: 'degradeduser'
            }
          },
        }));
      });

      await page.goto('/profile');

      // Should still load the page (graceful degradation)
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
      
      // Should remain on profile page and not crash
      await expect(page).toHaveURL('/profile');
      
      // Should show some user information even without profile
      await expect(page.getByText(/degraded@github.com/i)).toBeVisible();
    });
  });
});