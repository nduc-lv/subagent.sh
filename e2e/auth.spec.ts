import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
  });

  test('should display sign in button when not authenticated', async ({ page }) => {
    // Check that sign in button is visible
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();

    // Check that user dropdown is not visible
    const userDropdown = page.getByTestId('user-dropdown');
    await expect(userDropdown).not.toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    // Click sign in button
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should navigate to sign in page
    await expect(page).toHaveURL('/auth/signin');

    // Should show sign in form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
  });

  test('should show GitHub OAuth sign in flow', async ({ page }) => {
    // Navigate to sign in page
    await page.goto('/auth/signin');

    // Click GitHub sign in button
    const githubButton = page.getByRole('button', { name: /continue with github/i });
    await expect(githubButton).toBeVisible();

    // In a real test, this would redirect to GitHub
    // For now, we just verify the button is clickable
    await expect(githubButton).toBeEnabled();
  });

  test('should handle authentication callback', async ({ page }) => {
    // Navigate to callback page with mock success parameters
    await page.goto('/auth/callback?code=mock_auth_code&state=mock_state');

    // Should handle the callback and redirect
    // In a real test environment, this would complete the OAuth flow
    await page.waitForURL('/', { timeout: 10000 });

    // Should be back at home page
    await expect(page).toHaveURL('/');
  });

  test('should show user menu when authenticated', async ({ page, context }) => {
    // Mock being authenticated by setting session storage
    await context.addCookies([
      {
        name: 'supabase-auth-token',
        value: 'mock-jwt-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Set session in localStorage
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

    // Should show user dropdown instead of sign in button
    const userDropdown = page.getByTestId('user-dropdown');
    await expect(userDropdown).toBeVisible();

    // Should not show sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).not.toBeVisible();
  });

  test('should allow user to sign out', async ({ page, context }) => {
    // Mock being authenticated
    await context.addCookies([
      {
        name: 'supabase-auth-token',
        value: 'mock-jwt-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

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

    // Click user dropdown
    const userDropdown = page.getByTestId('user-dropdown');
    await userDropdown.click();

    // Click sign out
    const signOutButton = page.getByRole('menuitem', { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    // Should redirect to sign in page or show sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to sign in when accessing protected routes', async ({ page }) => {
    // Try to access profile without authentication
    await page.goto('/profile');

    // Should redirect to sign in
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should redirect to sign in when accessing submit page', async ({ page }) => {
    // Try to access submit page without authentication
    await page.goto('/submit');

    // Should redirect to sign in
    await expect(page).toHaveURL('/auth/signin');
  });

  test('should allow access to protected routes when authenticated', async ({ page, context }) => {
    // Mock authentication
    await context.addCookies([
      {
        name: 'supabase-auth-token',
        value: 'mock-jwt-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

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

    // Should be able to access profile
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });
});

test.describe('Session Persistence', () => {
  test('should persist authentication across page reloads', async ({ page, context }) => {
    // Mock authentication
    await context.addCookies([
      {
        name: 'supabase-auth-token',
        value: 'mock-jwt-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

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

    // Verify authenticated state
    await expect(page.getByTestId('user-dropdown')).toBeVisible();

    // Reload the page
    await page.reload();

    // Should still be authenticated
    await expect(page.getByTestId('user-dropdown')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).not.toBeVisible();
  });

  test('should handle expired sessions gracefully', async ({ page, context }) => {
    // Mock expired authentication
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'expired-access-token',
        refresh_token: 'expired-refresh-token',
        expires_at: Date.now() - 3600000, // Expired 1 hour ago
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      }));
    });

    await page.goto('/');

    // Should show sign in button (not authenticated due to expired session)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByTestId('user-dropdown')).not.toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle authentication errors gracefully', async ({ page }) => {
    // Navigate to callback with error parameters
    await page.goto('/auth/callback?error=access_denied&error_description=User%20denied%20access');

    // Should redirect to sign in with error message
    await expect(page).toHaveURL('/auth/signin');
    
    // Should show error message
    await expect(page.getByText(/authentication failed/i)).toBeVisible();
  });

  test('should handle network errors during authentication', async ({ page }) => {
    // Mock network failures
    await page.route('**/auth/v1/**', route => {
      route.abort('failed');
    });

    await page.goto('/auth/signin');

    // Click GitHub sign in button
    await page.getByRole('button', { name: /continue with github/i }).click();

    // Should show error message for network failure
    await expect(page.getByText(/unable to connect/i)).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('authentication pages should be accessible @accessibility', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check basic accessibility requirements
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check form accessibility
    const githubButton = page.getByRole('button', { name: /continue with github/i });
    await expect(githubButton).toBeVisible();
    await expect(githubButton).toBeEnabled();

    // Check focus management
    await page.keyboard.press('Tab');
    await expect(githubButton).toBeFocused();
  });
});