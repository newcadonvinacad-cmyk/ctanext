import { chromium } from 'playwright';

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  console.log('Navigating to http://localhost:3000/login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
  await page.screenshot({ path: 'tests/e2e/screenshots/login-page.png' });
  console.log('Login page loaded.');

  console.log('Filling credentials...');
  await page.fill('input[type="email"], input[name="email"]', 'admin@signage-erp.vn');
  if (!process.env.E2E_ADMIN_PASSWORD) throw new Error('Missing E2E_ADMIN_PASSWORD');
  await page.fill('input[type="password"], input[name="password"]', process.env.E2E_ADMIN_PASSWORD);

  console.log('Submitting login form...');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or URL change
  console.log('Waiting for URL to change from /login...');
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log('Redirected to:', page.url());
  } catch (err) {
    console.log('Did not redirect immediately, current url:', page.url());
  }

  await page.waitForTimeout(4000);
  console.log('Current URL after login attempt:', page.url());
  await page.screenshot({ path: 'tests/e2e/screenshots/after-login.png' });

  await context.storageState({ path: 'tests/e2e/admin-storage-state.json' });
  console.log('Storage state saved to tests/e2e/admin-storage-state.json');

  await browser.close();
}

testLogin().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
