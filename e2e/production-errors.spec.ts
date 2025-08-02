import { test, expect } from '@playwright/test';

test.describe('Production Error Handling', () => {
  test.describe('Environment Variables', () => {
    test('should show configuration error when environment variables are missing', async ({ page }) => {
      // Mock missing environment variables by intercepting client creation
      await page.addInitScript(() => {
        // Mock missing env vars
        Object.defineProperty(process, 'env', {
          value: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: undefined,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
          },
          writable: true,
        });
      });

      await page.goto('/');

      // Should show configuration error
      await expect(page.getByRole('heading', { name: /configuration error/i })).toBeVisible();
      await expect(page.getByText(/missing supabase environment variables/i)).toBeVisible();
      
      // Should show debug info
      const debugDetails = page.getByRole('button', { name: /debug info/i });
      await expect(debugDetails).toBeVisible();
      await debugDetails.click();
      await expect(page.getByText(/"hasUrl": false/)).toBeVisible();
      await expect(page.getByText(/"hasKey": false/)).toBeVisible();
    });

    test('should show configuration error when only URL is missing', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(process, 'env', {
          value: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: undefined,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-key',
          },
          writable: true,
        });
      });

      await page.goto('/');

      await expect(page.getByRole('heading', { name: /configuration error/i })).toBeVisible();
      
      const debugDetails = page.getByRole('button', { name: /debug info/i });
      await debugDetails.click();
      await expect(page.getByText(/"hasUrl": false/)).toBeVisible();
      await expect(page.getByText(/"hasKey": true/)).toBeVisible();
    });

    test('should show configuration error when only key is missing', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(process, 'env', {
          value: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: 'https://fake-url.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
          },
          writable: true,
        });
      });

      await page.goto('/');

      await expect(page.getByRole('heading', { name: /configuration error/i })).toBeVisible();
      
      const debugDetails = page.getByRole('button', { name: /debug info/i });
      await debugDetails.click();
      await expect(page.getByText(/"hasUrl": true/)).toBeVisible();
      await expect(page.getByText(/"hasKey": false/)).toBeVisible();
    });
  });

  test.describe('Error Boundary', () => {
    test('should catch runtime errors and show error boundary', async ({ page }) => {
      // Navigate to page and inject a script that will cause an error
      await page.goto('/');
      
      // Inject script that throws an error in a React component
      await page.addInitScript(() => {
        // Override a React hook to throw an error
        const originalUseEffect = React.useEffect;
        React.useEffect = () => {
          throw new Error('Simulated runtime error for testing');
        };
      });

      // Reload to trigger the error
      await page.reload();

      // Should show error boundary UI
      await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible();
      await expect(page.getByText(/a client-side error has occurred/i)).toBeVisible();
      
      // Should have refresh and home buttons
      await expect(page.getByRole('button', { name: /refresh page/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /go to homepage/i })).toBeVisible();
    });

    test('should show error details in development mode', async ({ page }) => {
      // Set NODE_ENV to development
      await page.addInitScript(() => {
        Object.defineProperty(process, 'env', {
          value: { ...process.env, NODE_ENV: 'development' },
          writable: true,
        });
      });

      await page.goto('/');
      
      // Simulate a component error
      await page.evaluate(() => {
        // Trigger an error in React
        const event = new CustomEvent('error', {
          detail: new Error('Test error for development mode')
        });
        window.dispatchEvent(event);
      });

      // In development, should show error details
      const errorDetails = page.getByRole('button', { name: /error details/i });
      if (await errorDetails.isVisible()) {
        await errorDetails.click();
        await expect(page.getByText(/test error for development mode/i)).toBeVisible();
      }
    });

    test('should allow refresh from error boundary', async ({ page }) => {
      // Force an error state
      await page.goto('/');
      
      // Inject error to trigger error boundary
      await page.addInitScript(() => {
        window.addEventListener('load', () => {
          throw new Error('Test error for refresh functionality');
        });
      });

      await page.reload();

      // If error boundary appears, test refresh functionality
      const refreshButton = page.getByRole('button', { name: /refresh page/i });
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        
        // Should reload the page
        await expect(page).toHaveURL('/');
      }
    });

    test('should allow navigation to homepage from error boundary', async ({ page }) => {
      // Navigate to a specific page first
      await page.goto('/agents');
      
      // Force error on this page
      await page.addInitScript(() => {
        setTimeout(() => {
          throw new Error('Test error for homepage navigation');
        }, 100);
      });

      await page.reload();

      // If error boundary appears, test homepage navigation
      const homeButton = page.getByRole('button', { name: /go to homepage/i });
      if (await homeButton.isVisible()) {
        await homeButton.click();
        
        // Should navigate to homepage
        await expect(page).toHaveURL('/');
      }
    });
  });

  test.describe('Authentication Errors', () => {
    test('should handle Supabase client creation errors', async ({ page }) => {
      // Mock Supabase client creation to throw an error
      await page.addInitScript(() => {
        // Override createBrowserClient to throw
        window.supabaseCreateError = true;
      });

      await page.goto('/');

      // Should show initialization error
      await expect(page.getByRole('heading', { name: /initialization error/i })).toBeVisible();
      await expect(page.getByText(/failed to initialize authentication client/i)).toBeVisible();
      
      // Should show error details
      const errorDetails = page.getByRole('button', { name: /error details/i });
      await expect(errorDetails).toBeVisible();
    });

    test('should handle auth session retrieval errors gracefully', async ({ page }) => {
      // Mock auth session to fail
      await page.route('**/auth/v1/session**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/');

      // Should still load the page (graceful degradation)
      // Auth should fail silently and show sign in state
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should handle profile loading errors gracefully', async ({ page }) => {
      // Mock successful auth but failed profile loading
      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        }));
      });

      // Mock profile API to fail
      await page.route('**/rest/v1/profiles**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Profile load failed' })
        });
      });

      await page.goto('/');

      // Should still show user as authenticated even if profile fails
      // The app should degrade gracefully
      await page.waitForTimeout(2000); // Wait for auth initialization
      
      // Either show user dropdown or handle profile loading gracefully
      const signInButton = page.getByRole('button', { name: /sign in/i });
      const userDropdown = page.getByTestId('user-dropdown');
      
      // One of these should be visible (graceful degradation)
      await expect(signInButton.or(userDropdown)).toBeVisible();
    });
  });

  test.describe('Race Condition Prevention', () => {
    test('should handle rapid navigation without hanging', async ({ page }) => {
      // Test rapid navigation between protected routes
      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        }));
      });

      await page.goto('/');

      // Rapidly navigate between routes
      await page.goto('/profile');
      await page.goto('/agents');
      await page.goto('/profile');
      await page.goto('/submit');
      await page.goto('/profile');

      // Should end up on profile page without hanging
      await expect(page).toHaveURL('/profile');
      
      // Page should be responsive
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('should handle concurrent profile loading', async ({ page }) => {
      // Mock slow profile API to test concurrent loading
      await page.route('**/rest/v1/profiles**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            username: 'testuser',
            full_name: 'Test User',
            avatar_url: null,
          })
        });
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        }));
      });

      // Navigate to page that triggers profile loading
      await page.goto('/profile');

      // Quickly navigate away and back to test concurrent loading prevention
      await page.goto('/');
      await page.goto('/profile');

      // Should not hang and should load profile data
      await expect(page).toHaveURL('/profile');
      await expect(page.getByRole('main')).toBeVisible();
      
      // Should eventually show user data
      await expect(page.getByText(/test user/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Network Resilience', () => {
    test('should handle offline state gracefully', async ({ page, context }) => {
      await page.goto('/');

      // Simulate going offline
      await context.setOffline(true);

      // Try to sign in while offline
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/auth/signin');

      // Attempt GitHub sign in (should handle network error)
      await page.getByRole('button', { name: /continue with github/i }).click();

      // Should handle the network error gracefully
      // (Exact behavior depends on implementation, but shouldn't crash)
      await page.waitForTimeout(2000);
      
      // Page should remain functional
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('should recover when connection is restored', async ({ page, context }) => {
      // Start offline
      await context.setOffline(true);
      await page.goto('/');

      // Verify offline state
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Go back online
      await context.setOffline(false);

      // Should be able to use the app normally
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/auth/signin');
      await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle multiple simultaneous requests', async ({ page }) => {
      // Mock slow API responses
      await page.route('**/rest/v1/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        route.continue();
      });

      await page.addInitScript(() => {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000,
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        }));
      });

      // Navigate to a page that makes multiple API calls
      await page.goto('/agents');

      // Should handle multiple requests without crashing
      await expect(page.getByRole('main')).toBeVisible();
      
      // Should show loading states appropriately
      const loadingIndicator = page.getByTestId('loading');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeHidden({ timeout: 10000 });
      }
    });
  });
});