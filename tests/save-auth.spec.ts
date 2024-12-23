import { test, chromium } from '@playwright/test';
import path from 'path';

test('save amazon auth state', async () => {
  // Launch browser
  const browser = await chromium.launch({ headless: false }); // Launch in headed mode
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to Amazon
  await page.goto('https://www.amazon.com');
  
  console.log('Please log in to Amazon manually. You have 2 minutes...');
  
  // Wait for a sign that user has successfully logged in
  // We can look for an element that only appears when logged in
  await page.waitForSelector('[data-nav-ref="nav_youraccount_btn"]', { timeout: 60000 });
  
  // Save authentication state
  const authFile = path.join(__dirname, 'amazonAuth.json');
  await context.storageState({ path: authFile });
  
  console.log(`Authentication state saved to ${authFile}`);
  await browser.close();
});