import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Launch browser and create a page for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    await page.goto(baseURL!);
    await page.waitForLoadState('networkidle');

    // Set up test data if needed
    console.log('Setting up test environment...');

    // You can add database seeding or other setup tasks here
    // For example:
    // await setupTestDatabase();
    // await seedTestData();

    console.log('Test environment setup complete');
  } catch (error) {
    console.error('Failed to set up test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;