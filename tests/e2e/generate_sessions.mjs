import { chromium } from 'playwright';

const USERS = [
  { role: 'admin', email: 'admin@signage-erp.vn', pass: process.env.E2E_ADMIN_PASSWORD },
  { role: 'ketoan', email: 'ketoan@signage-erp.vn', pass: process.env.E2E_KETOAN_PASSWORD },
  { role: 'thukho', email: 'thukho@signage-erp.vn', pass: process.env.E2E_THUKHO_PASSWORD },
  { role: 'duan', email: 'duan@signage-erp.vn', pass: process.env.E2E_DUAN_PASSWORD },
  { role: 'tho', email: 'tho@signage-erp.vn', pass: process.env.E2E_THO_PASSWORD },
];

async function generateAllSessions() {
  const browser = await chromium.launch({ headless: true });
  for (const u of USERS) {
    if (!u.pass) throw new Error(`Missing E2E_${u.role.toUpperCase()}_PASSWORD`);
    console.log(`Logging in as ${u.role} (${u.email})...`);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
    await page.fill('input[type="email"], input[name="email"]', u.email);
    await page.fill('input[type="password"], input[name="password"]', u.pass);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
      await page.waitForTimeout(2000);
      const statePath = `tests/e2e/state-${u.role}.json`;
      await context.storageState({ path: statePath });
      console.log(`Saved session for ${u.role} at ${statePath}`);
    } catch (err) {
      console.error(`Failed to login for ${u.role}:`, err.message);
    }
    await context.close();
  }
  await browser.close();
}

generateAllSessions().catch(console.error);
