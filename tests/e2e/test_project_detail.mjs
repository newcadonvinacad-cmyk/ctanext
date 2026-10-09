import { chromium } from 'playwright';
import fs from 'fs';

async function testProjectDetail() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const page = await context.newPage();

  const projectId = '36d52f9d-0bfe-4ab7-9190-b532155e60ae';
  const url = `http://localhost:3000/du-an/${projectId}`;
  const report = [];

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleLogs.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/project-detail-main.png' });

  // Get all tab buttons
  const tabs = await page.locator('button[role="tab"], .flex.border-b button, nav button').allInnerTexts();
  console.log('Available project tabs:', tabs);

  // Test each tab
  for (const tabText of ['Giai đoạn', 'Công việc', 'Vật tư', 'Nghiệm thu', 'Tài chính', 'Bảo hành', 'Bản vẽ']) {
    const tabLocator = page.locator(`button:has-text("${tabText}")`).first();
    if (await tabLocator.isVisible()) {
      console.log(`Clicking tab "${tabText}"...`);
      await tabLocator.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `tests/e2e/screenshots/project-tab-${tabText}.png` });

      // Check action buttons on this tab
      const tabBtns = await page.locator('button').allInnerTexts();
      const actions = tabBtns.map(b => b.trim()).filter(b => b && (b.includes('Thêm') || b.includes('Tạo') || b.includes('Ký') || b.includes('Duyệt') || b.includes('Xuất')));

      report.push({
        tab: tabText,
        actions,
        status: 'OK'
      });
    }
  }

  // Check acceptance creation modal / button
  const acceptBtn = page.locator('button:has-text("Nghiệm thu"), button:has-text("Biên bản")').first();
  if (await acceptBtn.isVisible()) {
    // Check if clicking opens modal
    console.log('Testing Acceptance button...');
  }

  // Check tech spec page: /du-an/[id]/thiet-ke-quy-chuan
  console.log('Navigating to thiet-ke-quy-chuan...');
  await page.goto(`http://localhost:3000/du-an/${projectId}/thiet-ke-quy-chuan`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/project-tech-spec.png' });

  fs.writeFileSync('tests/e2e/results-project-detail.json', JSON.stringify({ report, pageErrors, consoleLogs }, null, 2));
  console.log('Project detail test completed.');
  await browser.close();
}

testProjectDetail().catch(console.error);
