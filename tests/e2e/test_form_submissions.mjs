import { chromium } from 'playwright';
import fs from 'fs';

async function testForms() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const page = await context.newPage();

  const results = [];

  // ==========================================
  // FORM 1: MUA HÀNG TẠO MỚI (/mua-hang/tao-moi)
  // ==========================================
  console.log('\n--- 1. Testing /mua-hang/tao-moi ---');
  await page.goto('http://localhost:3000/mua-hang/tao-moi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/form-mua-hang-loaded.png' });

  // Select supplier
  const supplierSelect = page.locator('select').first();
  if (await supplierSelect.isVisible()) {
    const opts = await supplierSelect.locator('option').all();
    console.log(`Found ${opts.length} supplier options.`);
    if (opts.length > 1) {
      await supplierSelect.selectOption({ index: 1 });
    }
  }

  // Add line item
  const addLineBtn = page.locator('button:has-text("Thêm dòng vật tư"), button:has-text("Thêm dòng")').first();
  if (await addLineBtn.isVisible()) {
    await addLineBtn.click();
    await page.waitForTimeout(500);
  }

  // Select item in table
  const itemSelect = page.locator('table select, div select').nth(1);
  if (await itemSelect.isVisible()) {
    const itemOpts = await itemSelect.locator('option').all();
    if (itemOpts.length > 1) {
      await itemSelect.selectOption({ index: 1 });
    }
  }

  // Fill quantity and price
  const qtyInput = page.locator('input[type="number"]').first();
  if (await qtyInput.isVisible()) await qtyInput.fill('10');

  const priceInput = page.locator('input[type="number"]').nth(1);
  if (await priceInput.isVisible()) await priceInput.fill('150000');

  await page.screenshot({ path: 'tests/e2e/screenshots/form-mua-hang-filled.png' });

  // Submit
  const savePoBtn = page.locator('button:has-text("Lưu Đơn Mua Hàng"), button:has-text("Lưu PO")').first();
  let poApiStatus = null;
  let poApiBody = null;
  const poPromise = page.waitForResponse(
    r => r.url().includes('/api/procurement/orders') && r.request().method() === 'POST',
    { timeout: 8000 }
  ).catch(() => null);

  if (await savePoBtn.isVisible()) {
    await savePoBtn.click();
    const poRes = await poPromise;
    if (poRes) {
      poApiStatus = poRes.status();
      try { poApiBody = await poRes.json(); } catch {}
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/form-mua-hang-submitted.png' });
  const poToast = await page.locator('.fixed.top-4.right-4').allInnerTexts().catch(() => []);

  results.push({
    form: '/mua-hang/tao-moi',
    action: 'Lưu đơn mua hàng',
    apiStatus: poApiStatus,
    apiBody: poApiBody,
    toast: poToast,
    hasError: poApiStatus >= 400 || (poToast.length > 0 && poToast.some(t => t.toLowerCase().includes('lỗi'))),
  });

  // ==========================================
  // FORM 2: BÁO GIÁ TẠO MỚI (/bao-gia/tao-moi)
  // ==========================================
  console.log('\n--- 2. Testing /bao-gia/tao-moi ---');
  await page.goto('http://localhost:3000/bao-gia/tao-moi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/form-bao-gia-loaded.png' });

  // Select customer
  const custSelect = page.locator('select').first();
  if (await custSelect.isVisible()) {
    const cOpts = await custSelect.locator('option').all();
    if (cOpts.length > 1) await custSelect.selectOption({ index: 1 });
  }

  // Fill Quote Title
  const titleInput = page.locator('input[placeholder*="tên"], input[placeholder*="Báo giá"], input[name="title"]').first();
  if (await titleInput.isVisible()) await titleInput.fill('Báo giá Thi công Biển Hiệu Test E2E');

  // Submit quote
  const saveQuoteBtn = page.locator('button:has-text("Lưu Báo Giá"), button:has-text("Lưu")').first();
  let quoteStatus = null;
  let quoteBody = null;
  const quotePromise = page.waitForResponse(
    r => r.url().includes('/api/crm/quotations') && r.request().method() === 'POST',
    { timeout: 8000 }
  ).catch(() => null);

  if (await saveQuoteBtn.isVisible()) {
    await saveQuoteBtn.click();
    const qRes = await quotePromise;
    if (qRes) {
      quoteStatus = qRes.status();
      try { quoteBody = await qRes.json(); } catch {}
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/form-bao-gia-submitted.png' });
  const quoteToast = await page.locator('.fixed.top-4.right-4').allInnerTexts().catch(() => []);

  results.push({
    form: '/bao-gia/tao-moi',
    action: 'Lưu Báo Giá',
    apiStatus: quoteStatus,
    apiBody: quoteBody,
    toast: quoteToast,
    hasError: quoteStatus >= 400 || (quoteToast.length > 0 && quoteToast.some(t => t.toLowerCase().includes('lỗi'))),
  });

  // ==========================================
  // FORM 3: TẠO DỰ ÁN MỚI (/du-an modal)
  // ==========================================
  console.log('\n--- 3. Testing /du-an modal tạo mới ---');
  await page.goto('http://localhost:3000/du-an', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const createProjectBtn = page.locator('button:has-text("Tạo dự án mới")').first();
  if (await createProjectBtn.isVisible()) {
    await createProjectBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/modal-du-an.png' });

    // Inspect fields
    const nameInp = page.locator('input[placeholder*="tên dự án"], input[placeholder*="Biển hiệu"]').first();
    if (await nameInp.isVisible()) await nameInp.fill('Thi công Mặt dựng Alu Test 2026');

    // Customer
    const projCustSelect = page.locator('.fixed.inset-0 select').first();
    if (await projCustSelect.isVisible()) {
      const opts = await projCustSelect.locator('option').all();
      if (opts.length > 1) await projCustSelect.selectOption({ index: 1 });
    }

    // Submit modal
    const saveProjBtn = page.locator('.fixed.inset-0 button:has-text("Tạo dự án"), .fixed.inset-0 button[type="submit"]').first();
    let projStatus = null;
    let projBody = null;
    const projPromise = page.waitForResponse(
      r => r.url().includes('/api/projects') && r.request().method() === 'POST',
      { timeout: 8000 }
    ).catch(() => null);

    if (await saveProjBtn.isVisible()) {
      await saveProjBtn.click();
      const pRes = await projPromise;
      if (pRes) {
        projStatus = pRes.status();
        try { projBody = await pRes.json(); } catch {}
      }
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/modal-du-an-submitted.png' });
    const projToast = await page.locator('.fixed.top-4.right-4').allInnerTexts().catch(() => []);

    results.push({
      form: '/du-an',
      action: 'Tạo dự án mới (Modal)',
      apiStatus: projStatus,
      apiBody: projBody,
      toast: projToast,
      hasError: projStatus >= 400 || (projToast.length > 0 && projToast.some(t => t.toLowerCase().includes('lỗi'))),
    });
  }

  // ==========================================
  // FORM 4: TẠO PHIẾU NHẬP XUẤT KHO (/kho/nhap-xuat/tao-moi)
  // ==========================================
  console.log('\n--- 4. Testing /kho/nhap-xuat/tao-moi ---');
  await page.goto('http://localhost:3000/kho/nhap-xuat/tao-moi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/form-kho-loaded.png' });

  // Warehouse selects
  const whSelects = await page.locator('select').all();
  for (const s of whSelects) {
    const opts = await s.locator('option').all();
    if (opts.length > 1) await s.selectOption({ index: 1 });
  }

  // Purpose / reason
  const purposeInp = page.locator('input[placeholder*="lý do"], input[placeholder*="mục đích"]').first();
  if (await purposeInp.isVisible()) await purposeInp.fill('Xuất kho phục vụ công trình kiểm thử');

  // Add line item
  const addWhLineBtn = page.locator('button:has-text("Thêm vật tư"), button:has-text("Thêm dòng")').first();
  if (await addWhLineBtn.isVisible()) {
    await addWhLineBtn.click();
    await page.waitForTimeout(500);
    const lineItemSelect = page.locator('table select').first();
    if (await lineItemSelect.isVisible()) {
      const opts = await lineItemSelect.locator('option').all();
      if (opts.length > 1) await lineItemSelect.selectOption({ index: 1 });
    }
    const lineQty = page.locator('table input[type="number"]').first();
    if (await lineQty.isVisible()) await lineQty.fill('5');
  }

  const saveWhBtn = page.locator('button:has-text("Lưu phiếu"), button:has-text("Tạo phiếu")').first();
  let whStatus = null;
  let whBody = null;
  const whPromise = page.waitForResponse(
    r => r.url().includes('/api/inventory/documents') && r.request().method() === 'POST',
    { timeout: 8000 }
  ).catch(() => null);

  if (await saveWhBtn.isVisible()) {
    await saveWhBtn.click();
    const whRes = await whPromise;
    if (whRes) {
      whStatus = whRes.status();
      try { whBody = await whRes.json(); } catch {}
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/e2e/screenshots/form-kho-submitted.png' });
  const whToast = await page.locator('.fixed.top-4.right-4').allInnerTexts().catch(() => []);

  results.push({
    form: '/kho/nhap-xuat/tao-moi',
    action: 'Lưu phiếu nhập xuất kho',
    apiStatus: whStatus,
    apiBody: whBody,
    toast: whToast,
    hasError: whStatus >= 400 || (whToast.length > 0 && whToast.some(t => t.toLowerCase().includes('lỗi'))),
  });

  // Save report
  fs.writeFileSync('tests/e2e/results-form-submissions.json', JSON.stringify(results, null, 2));
  console.log('Results of Form Submissions:', JSON.stringify(results, null, 2));

  await browser.close();
}

testForms().catch(console.error);
