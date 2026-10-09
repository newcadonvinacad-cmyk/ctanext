import { chromium } from 'playwright';
import fs from 'fs';

async function testModals() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const page = await context.newPage();

  const report = [];

  const setupPageListeners = () => {
    const logs = [];
    const errors = [];
    const apiCalls = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => errors.push(err.message));
    page.on('response', async res => {
      if (res.url().includes('/api/')) {
        let body = null;
        try {
          body = await res.json();
        } catch {
          try { body = await res.text(); } catch {}
        }
        apiCalls.push({
          method: res.request().method(),
          url: res.url(),
          status: res.status(),
          body
        });
      }
    });
    return { logs, errors, apiCalls };
  };

  // ==========================================
  // TEST 1: KHÁCH HÀNG (/khach-hang)
  // ==========================================
  console.log('--- TEST 1: /khach-hang ---');
  let trackers = setupPageListeners();
  await page.goto('http://localhost:3000/khach-hang', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/khach-hang-page.png' });

  const addCustomerBtn = page.locator('button:has-text("Thêm khách hàng"), button:has-text("Tạo khách hàng")').first();
  if (await addCustomerBtn.isVisible()) {
    await addCustomerBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/khach-hang-modal.png' });

    // Fill form
    const codeInput = page.locator('input[name="code"], input[placeholder*="Mã"], input[placeholder*="KH-"]').first();
    const nameInput = page.locator('input[name="name"], input[placeholder*="Tên khách hàng"]').first();
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="điện thoại"], input[type="tel"]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const addressInput = page.locator('input[name="address"], textarea[name="address"], input[placeholder*="Địa chỉ"]').first();

    if (await codeInput.isVisible()) await codeInput.fill(`KH-TEST-${Date.now().toString().slice(-4)}`);
    if (await nameInput.isVisible()) await nameInput.fill('Công ty TNHH Thử Nghiệm Biển Hiệu');
    if (await phoneInput.isVisible()) await phoneInput.fill('0987654321');
    if (await emailInput.isVisible()) await emailInput.fill('contact@thunghiem.vn');
    if (await addressInput.isVisible()) await addressInput.fill('123 Đường Thử Nghiệm, Quận 1, TP.HCM');

    await page.screenshot({ path: 'tests/e2e/screenshots/khach-hang-filled.png' });

    // Click submit
    const submitBtn = page.locator('form button[type="submit"], button:has-text("Lưu khách hàng"), button:has-text("Lưu")').first();
    const beforeCount = trackers.apiCalls.length;
    await submitBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/khach-hang-after-submit.png' });

    const newApiCalls = trackers.apiCalls.slice(beforeCount);
    report.push({
      page: '/khach-hang',
      modal: 'Thêm khách hàng',
      apiCalls: newApiCalls,
      errors: trackers.errors,
      notes: newApiCalls.some(c => c.status >= 400) ? 'Lỗi API khi lưu modal' : 'Thành công hoặc không gửi API'
    });
  } else {
    report.push({ page: '/khach-hang', error: 'Không tìm thấy nút Thêm khách hàng' });
  }

  // ==========================================
  // TEST 2: NHÀ CUNG CẤP (/nha-cung-cap)
  // ==========================================
  console.log('--- TEST 2: /nha-cung-cap ---');
  trackers = setupPageListeners();
  await page.goto('http://localhost:3000/nha-cung-cap', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/nha-cung-cap-page.png' });

  const addSupplierBtn = page.locator('button:has-text("Thêm nhà cung cấp"), button:has-text("Thêm mới")').first();
  if (await addSupplierBtn.isVisible()) {
    await addSupplierBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/nha-cung-cap-modal.png' });

    // Fill form
    const sCode = page.locator('input[placeholder*="NCC-"], input[name="code"]').first();
    const sName = page.locator('input[placeholder*="Tên"], input[name="name"]').first();
    const sPhone = page.locator('input[placeholder*="thoại"], input[type="tel"]').first();
    const sTax = page.locator('input[placeholder*="thuế"], input[name="tax_code"]').first();

    if (await sCode.isVisible()) await sCode.fill(`NCC-TEST-${Date.now().toString().slice(-4)}`);
    if (await sName.isVisible()) await sName.fill('Đại Lý Nhôm Alu Thử Nghiệm');
    if (await sPhone.isVisible()) await sPhone.fill('0912345678');
    if (await sTax.isVisible()) await sTax.fill('0101234567');

    const sSubmit = page.locator('form button[type="submit"], button:has-text("Lưu"), button:has-text("Thêm")').first();
    const beforeCount = trackers.apiCalls.length;
    await sSubmit.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/nha-cung-cap-after-submit.png' });

    const newApiCalls = trackers.apiCalls.slice(beforeCount);
    report.push({
      page: '/nha-cung-cap',
      modal: 'Thêm nhà cung cấp',
      apiCalls: newApiCalls,
      errors: trackers.errors,
      notes: newApiCalls.some(c => c.status >= 400) ? 'Lỗi API khi lưu modal' : 'Thành công'
    });
  }

  // ==========================================
  // TEST 3: VẬT TƯ (/vat-tu)
  // ==========================================
  console.log('--- TEST 3: /vat-tu ---');
  trackers = setupPageListeners();
  await page.goto('http://localhost:3000/vat-tu', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/vat-tu-page.png' });

  const addItemBtn = page.locator('button:has-text("Thêm vật tư"), button:has-text("Thêm mới")').first();
  if (await addItemBtn.isVisible()) {
    await addItemBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/vat-tu-modal.png' });

    // Inspect inputs
    const inputs = await page.locator('form input, form select, form textarea').all();
    console.log(`Found ${inputs.length} inputs in vat-tu modal.`);
    for (const inp of inputs) {
      const type = await inp.getAttribute('type');
      const tagName = await inp.evaluate(el => el.tagName.toLowerCase());
      const placeholder = await inp.getAttribute('placeholder') || '';
      const name = await inp.getAttribute('name') || '';

      if (tagName === 'select') {
        const firstOpt = await inp.locator('option').nth(1).getAttribute('value').catch(() => null);
        if (firstOpt) await inp.selectOption(firstOpt);
      } else if (type === 'number') {
        await inp.fill('100000');
      } else if (type === 'text' || tagName === 'textarea' || !type) {
        await inp.fill(`VT-TEST-${placeholder.slice(0, 10)}`);
      }
    }

    const itemSubmit = page.locator('form button[type="submit"], button:has-text("Lưu")').first();
    const beforeCount = trackers.apiCalls.length;
    await itemSubmit.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/vat-tu-after-submit.png' });

    const newApiCalls = trackers.apiCalls.slice(beforeCount);
    report.push({
      page: '/vat-tu',
      modal: 'Thêm vật tư',
      apiCalls: newApiCalls,
      errors: trackers.errors,
      notes: newApiCalls.some(c => c.status >= 400) ? 'Lỗi API khi lưu modal' : 'Thành công'
    });
  }

  // ==========================================
  // TEST 4: DỰ ÁN (/du-an)
  // ==========================================
  console.log('--- TEST 4: /du-an ---');
  trackers = setupPageListeners();
  await page.goto('http://localhost:3000/du-an', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/du-an-page.png' });

  const addProjectBtn = page.locator('button:has-text("Tạo dự án"), button:has-text("Dự án mới")').first();
  if (await addProjectBtn.isVisible()) {
    await addProjectBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/du-an-modal.png' });

    const pInputs = await page.locator('form input, form select, form textarea').all();
    console.log(`Found ${pInputs.length} inputs in du-an modal.`);
    for (const inp of pInputs) {
      const type = await inp.getAttribute('type');
      const tagName = await inp.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        const val = await inp.locator('option').nth(1).getAttribute('value').catch(() => null);
        if (val) await inp.selectOption(val);
      } else if (type === 'date') {
        await inp.fill('2026-10-15');
      } else if (type === 'number') {
        await inp.fill('50000000');
      } else {
        await inp.fill('Dự Án Biển Hiệu Đại Lý Thử Nghiệm');
      }
    }

    const pSubmit = page.locator('form button[type="submit"], button:has-text("Tạo"), button:has-text("Lưu")').first();
    const beforeCount = trackers.apiCalls.length;
    await pSubmit.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/du-an-after-submit.png' });

    const newApiCalls = trackers.apiCalls.slice(beforeCount);
    report.push({
      page: '/du-an',
      modal: 'Tạo dự án mới',
      apiCalls: newApiCalls,
      errors: trackers.errors,
      notes: newApiCalls.some(c => c.status >= 400) ? 'Lỗi API khi lưu modal' : 'Thành công'
    });
  }

  fs.writeFileSync('tests/e2e/results-modals-batch1.json', JSON.stringify(report, null, 2));
  console.log('Finished Batch 1 Modal tests. Report saved.');
  await browser.close();
}

testModals().catch(console.error);
