import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up test environment...');

  try {
    // Clean up test data, databases, etc.
    // For example:
    // await cleanupTestDatabase();
    // await removeTestFiles();

    console.log('Test environment cleanup complete');
  } catch (error) {
    console.error('Failed to clean up test environment:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;