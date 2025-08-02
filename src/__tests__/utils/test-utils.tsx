import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { mockAuthenticatedUser } from '../config/test-database';

// Mock user context value
const mockUserContext = {
  user: mockAuthenticatedUser(),
  session: {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
  },
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  supabase: {} as any, // Mock Supabase client
};

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authenticated?: boolean;
  user?: any;
  theme?: 'light' | 'dark' | 'system';
}

const AllTheProviders: React.FC<{
  children: React.ReactNode;
  authenticated?: boolean;
  user?: any;
  theme?: string;
}> = ({ children, authenticated = true, user, theme = 'light' }) => {
  // Mock auth context based on authentication state
  const authContextValue = authenticated
    ? { ...mockUserContext, user: user || mockUserContext.user }
    : { ...mockUserContext, user: null, session: null };

  return (
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { authenticated = true, user, theme, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        authenticated={authenticated} 
        user={user} 
        theme={theme}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Custom render for unauthenticated state
export const renderUnauthenticated = (
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'authenticated'> = {}
) => {
  return customRender(ui, { ...options, authenticated: false });
};

// Custom render with specific user
export const renderWithUser = (
  ui: ReactElement,
  user: any,
  options: Omit<CustomRenderOptions, 'user'> = {}
) => {
  return customRender(ui, { ...options, user });
};

// Custom render with dark theme
export const renderWithDarkTheme = (
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'theme'> = {}
) => {
  return customRender(ui, { ...options, theme: 'dark' });
};

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Test helpers
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const mockConsoleError = () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });
};

export const mockConsoleWarn = () => {
  const originalWarn = console.warn;
  beforeEach(() => {
    console.warn = jest.fn();
  });
  afterEach(() => {
    console.warn = originalWarn;
  });
};

// Form testing helpers
export const fillForm = async (
  form: HTMLFormElement,
  data: Record<string, string>
) => {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();

  for (const [name, value] of Object.entries(data)) {
    const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
};

// Navigation helpers
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

export const mockSearchParams = {
  get: jest.fn(),
  has: jest.fn(),
  getAll: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
};

// API response helpers
export const createMockResponse = <T,>(data: T, error?: any) => ({
  data: error ? null : data,
  error: error || null,
  count: Array.isArray(data) ? data.length : undefined,
});

export const createMockSupabaseClient = (overrides: any = {}) => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: {} } }),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: 'test-url' }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    ...(overrides.auth || {}),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...(overrides.from || {}),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'test-url' } }),
      ...(overrides.storage || {}),
    })),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  ...overrides,
});

// Date/time helpers for consistent testing
export const mockDate = (dateString: string) => {
  const mockDate = new Date(dateString);
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });
  afterEach(() => {
    jest.useRealTimers();
  });
};

// Async testing helpers
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Component testing utilities
export const getByTextContent = (text: string) => (content: any, element: any) => {
  const hasText = (element: any) => element.textContent === text;
  const elementHasText = hasText(element);
  const childrenDontHaveText = Array.from(element?.children || []).every(
    child => !hasText(child)
  );
  return elementHasText && childrenDontHaveText;
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe');
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Mock data generators
export const generateMockAgent = (overrides = {}) => ({
  id: `agent-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Agent',
  description: 'A test agent for testing purposes',
  category: 'productivity',
  github_url: 'https://github.com/testuser/agent',
  documentation_url: 'https://example.com/docs',
  tags: ['test', 'productivity'],
  author_id: 'test-user-1',
  rating: 4.5,
  download_count: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockUser = (overrides = {}) => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  github_username: 'testuser',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockReview = (overrides = {}) => ({
  id: `review-${Math.random().toString(36).substr(2, 9)}`,
  agent_id: 'agent-1',
  user_id: 'user-1',
  rating: 5,
  title: 'Great agent!',
  content: 'This agent works perfectly.',
  helpful_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});