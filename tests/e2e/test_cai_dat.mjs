import { chromium } from 'playwright';
import fs from 'fs';

async function testCaiDat() {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message }));

  const failedRequests = [];
  page.on('response', res => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
      failedRequests.push({ url: res.url(), status: res.status(), statusText: res.statusText() });
    }
  });

  console.log('1. Navigating to /cai-dat...');
  await page.goto('http://localhost:3000/cai-dat', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/e2e/screenshots/cai-dat-main.png' });

  // Check user creation modal
  console.log('2. Testing "Thêm Thành Viên" button...');
  const addMemberBtn = page.locator('button:has-text("Thêm Thành Viên")').first();
  if (await addMemberBtn.isVisible()) {
    await addMemberBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/screenshots/cai-dat-modal-add-user.png' });

    // Inspect fields in modal
    const emailInput = page.locator('input[type="email"]');
    const nameInput = page.locator('input[placeholder*="Nguyễn Văn A"]');
    const roleSelect = page.locator('form select').first();
    const saveBtn = page.locator('form button[type="submit"]').first();

    console.log('Is modal open:', await emailInput.isVisible());

    // Check if there is any field to link to an employee
    const employeeLinkField = await page.locator(':text("nhân sự"), :text("Nhân viên"), :text("Mã nhân viên")').count();
    console.log('Count of Employee linking fields in User creation modal:', employeeLinkField);

    // Try creating a test user without an employee link
    const testEmail = `test_account_${Date.now()}@test.vn`;
    await emailInput.fill(testEmail);
    await nameInput.fill('Người Không Có Trong Nhân Sự');
    await page.waitForTimeout(500);

    // Submit form
    console.log('Submitting user form...');
    let apiStatus = null;
    let apiBody = null;
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/iam/users') && resp.request().method() === 'POST',
      { timeout: 10000 }
    ).catch(() => null);

    await saveBtn.click();
    const resp = await responsePromise;
    if (resp) {
      apiStatus = resp.status();
      try { apiBody = await resp.json(); } catch {}
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/cai-dat-after-create-user.png' });

    const toastText = await page.locator('.fixed.top-4.right-4').allInnerTexts().catch(() => []);

    results.push({
      feature: 'Cài đặt > Tạo tài khoản người dùng (IAM)',
      testCase: 'Tạo tài khoản và đồng bộ hồ sơ nhân sự (IAM & HRM)',
      hasEmployeeField: employeeLinkField > 0,
      hasEmployeeId: !!apiBody?.employeeId,
      apiStatus,
      apiBody,
      toastText,
      notes: (employeeLinkField > 0 || apiBody?.employeeId)
        ? 'OK: Đã có liên kết và tự động đồng bộ hồ sơ nhân sự erp.employees (employeeId: ' + apiBody?.employeeId + ')'
        : 'Bug: Thiếu liên kết hồ sơ nhân sự'
    });
  } else {
    results.push({
      feature: 'Tạo tài khoản người dùng (IAM)',
      error: 'Không tìm thấy nút Thêm Thành Viên'
    });
  }

  // Test Roles tab
  console.log('3. Testing Vai trò & Phân quyền tab...');
  const rolesTab = page.locator('button:has-text("Vai trò & Quyền"), button:has-text("Vai trò")').first();
  if (await rolesTab.isVisible()) {
    await rolesTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/cai-dat-roles-tab.png' });

    // Check "Lưu ma trận quyền"
    const saveMatrixBtn = page.locator('button:has-text("Lưu ma trận"), button:has-text("Lưu phân quyền")').first();
    const canSaveMatrix = await saveMatrixBtn.isVisible();
    if (canSaveMatrix) {
      console.log('Clicking Save matrix button...');
      let matrixStatus = null;
      const matrixRespPromise = page.waitForResponse(
        resp => resp.url().includes('/api/iam/roles') && (resp.request().method() === 'POST' || resp.request().method() === 'PUT'),
        { timeout: 8000 }
      ).catch(() => null);
      await saveMatrixBtn.click();
      const mResp = await matrixRespPromise;
      if (mResp) matrixStatus = mResp.status();
      results.push({
        feature: 'Cài đặt > Phân quyền & Vai trò',
        testCase: 'Lưu ma trận quyền',
        canSaveMatrix,
        matrixStatus
      });
    }
  }

  // Test Organization / Company tab
  console.log('4. Testing Thông tin Công ty tab...');
  const companyTab = page.locator('button:has-text("Cấu hình công ty"), button:has-text("Công ty")').first();
  if (await companyTab.isVisible()) {
    await companyTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/cai-dat-company-tab.png' });

    // Check if form fields are editable and save button exists
    const saveCompanyBtn = page.locator('button:has-text("Lưu cấu hình"), button:has-text("Lưu thông tin")').first();
    results.push({
      feature: 'Cài đặt > Cấu hình Công ty',
      canSaveCompany: await saveCompanyBtn.isVisible()
    });
  }

  console.log('Results cai-dat:', JSON.stringify(results, null, 2));
  fs.writeFileSync('tests/e2e/results-cai-dat.json', JSON.stringify({ results, failedRequests, consoleLogs }, null, 2));

  await browser.close();
}

testCaiDat().catch(console.error);
