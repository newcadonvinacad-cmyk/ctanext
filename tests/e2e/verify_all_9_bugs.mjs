import { chromium } from 'playwright';
import fs from 'fs';

async function runVerification() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ XÁC NHẬN TOÀN DIỆN 9 BUGS (E2E PLAYWRIGHT)');
  console.log('===============================================================\n');

  const results = {};
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // BUG-01: IAM vs HRM Data Split
    // -------------------------------------------------------------
    console.log('▶ [1/9] Kiểm tra BUG-01: IAM User tạo mới tự động tạo erp.employees...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/cai-dat', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const addBtn = page.locator('button:has-text("Thêm Thành Viên")').first();
      await addBtn.click();
      await page.waitForTimeout(500);

      const testEmail = `auto_emp_${Date.now()}@signage-erp.vn`;
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[placeholder*="Nguyễn Văn A"]').fill('Kỹ Thuật Viên Auto Sync');
      await page.waitForTimeout(500);

      const resPromise = page.waitForResponse(
        r => r.url().includes('/api/iam/users') && r.request().method() === 'POST',
        { timeout: 15000 }
      );
      await page.locator('form button[type="submit"]').click();
      const res = await resPromise;
      const body = await res.json();
      const status = res.status();

      const pass = status === 200 && !!body.employeeId;
      results['BUG-01'] = {
        pass,
        details: `Status ${status}, employeeId: ${body.employeeId}`
      };
      console.log(`  => BUG-01: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-02: HRM Dead Button & Missing API
    // -------------------------------------------------------------
    console.log('\n▶ [2/9] Kiểm tra BUG-02: Nút Thêm Nhân Viên Mới & POST /api/hrm/employees...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/nhan-su', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const tab3 = page.locator('button:has-text("3. Hồ Sơ Nhân Sự")');
      await tab3.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('button:has-text("Thêm Nhân Viên Mới")').first();
      const isAddBtnVisible = await addBtn.isVisible();
      await addBtn.click();
      await page.waitForTimeout(500);

      const nameInput = page.locator('input[placeholder*="Nguyễn Văn Bình"]').first();
      await nameInput.fill('Nhân Sự Test BUG02');
      const phoneInput = page.locator('input[placeholder*="0988.111.222"]').first();
      await phoneInput.fill('0912345678');

      const submitBtn = page.locator('button:has-text("Lưu Nhân Viên")').first();
      const resPromise = page.waitForResponse(
        r => r.url().includes('/api/hrm/employees') && r.request().method() === 'POST',
        { timeout: 15000 }
      );
      await submitBtn.click();
      const res = await resPromise;
      const body = await res.json();

      const pass = isAddBtnVisible && res.status() === 201 && body.success === true;
      results['BUG-02'] = {
        pass,
        details: `AddBtn: ${isAddBtnVisible}, API Status: ${res.status()}, Employee: ${body.employee?.name}`
      };
      console.log(`  => BUG-02: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-03: Quotation Form 400 Payload Mismatch
    // -------------------------------------------------------------
    console.log('\n▶ [3/9] Kiểm tra BUG-03: Form Tạo Báo Giá /bao-gia/tao-moi...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/bao-gia/tao-moi', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const sel = document.querySelector('select');
        return sel && sel.value !== '';
      }, { timeout: 15000 });

      const saveBtn = page.locator('button:has-text("Lưu Báo Giá & Tính Lãi Gộp")').first();
      const qPromise = page.waitForResponse(
        r => r.url().includes('/api/crm/quotations') && r.request().method() === 'POST',
        { timeout: 15000 }
      );

      await saveBtn.click();
      const resp = await qPromise;
      const qStatus = resp.status();
      const qJson = await resp.json().catch(() => ({}));

      const pass = qStatus === 201 && !!qJson.quotationId;
      results['BUG-03'] = {
        pass,
        details: `Status ${qStatus}, quotationId: ${qJson.quotationId}`
      };
      console.log(`  => BUG-03: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-04: Sales Order 500 missing unitId/itemId
    // -------------------------------------------------------------
    console.log('\n▶ [4/9] Kiểm tra BUG-04: Form Tạo Đơn Bán Hàng /ban-hang/tao-moi...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/ban-hang/tao-moi', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const sel = document.querySelector('select');
        return sel && sel.value !== '';
      }, { timeout: 15000 });

      const saveBtn = page.locator('button:has-text("Lưu Đơn Bán Hàng")').first();
      const soPromise = page.waitForResponse(
        r => r.url().includes('/api/crm/orders') && r.request().method() === 'POST',
        { timeout: 15000 }
      );

      await saveBtn.click();
      const resp = await soPromise;
      const soStatus = resp.status();
      const soJson = await resp.json().catch(() => ({}));

      const pass = soStatus === 201 && !!soJson.orderId;
      results['BUG-04'] = {
        pass,
        details: `Status ${soStatus}, orderId: ${soJson.orderId}`
      };
      console.log(`  => BUG-04: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-05: Approval Lifecycles
    // -------------------------------------------------------------
    console.log('\n▶ [5/9] Kiểm tra BUG-05: Chu kỳ Phê duyệt PO (Tạo submitted -> Duyệt approved)...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/mua-hang/tao-moi', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => {
        const sel = document.querySelector('select');
        return sel && sel.options.length > 1;
      }, { timeout: 15000 });

      const supplierSelect = page.locator('select').first();
      await supplierSelect.selectOption({ index: 1 });

      const addLineBtn = page.locator('button:has-text("Thêm dòng vật tư"), button:has-text("Thêm dòng")').first();
      await addLineBtn.click();
      await page.waitForTimeout(500);

      const itemSelect = page.locator('table select').first();
      await page.waitForFunction(() => {
        const tableSel = document.querySelector('table select');
        return tableSel && tableSel.options.length > 1;
      }, { timeout: 10000 });
      await itemSelect.selectOption({ index: 1 });

      const qtyInput = page.locator('table input[type="number"]').first();
      await qtyInput.fill('10');

      const saveBtn = page.locator('button:has-text("Lưu Đơn Mua Hàng")').first();
      const poPromise = page.waitForResponse(
        r => r.url().includes('/api/procurement/orders') && r.request().method() === 'POST',
        { timeout: 15000 }
      );

      await saveBtn.click();
      const poRes = await poPromise;
      const poJson = await poRes.json().catch(() => ({}));
      const poId = poJson.poId;

      let poApproveStatus = null;
      if (poId) {
        const approveRes = await page.request.post(`http://localhost:3000/api/procurement/orders/${poId}/approve`, {
          data: { notes: 'Phê duyệt E2E test' }
        });
        poApproveStatus = approveRes.status();
      }

      const pass = poRes.status() === 200 && !!poId && poApproveStatus === 200;
      results['BUG-05'] = {
        pass,
        details: `PO Created: ${poId}, Approval status: ${poApproveStatus}`
      };
      console.log(`  => BUG-05: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-06: RBAC UI Leaks Blocked for Worker
    // -------------------------------------------------------------
    console.log('\n▶ [6/9] Kiểm tra BUG-06: Thợ thi công bị ẩn các nút tài chính/mua hàng/duyệt lương...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-tho.json' });
      const page = await context.newPage();

      // Check /tai-chinh
      await page.goto('http://localhost:3000/tai-chinh', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const hasSoQuy = await page.locator('button:has-text("Thêm sổ quỹ mới")').isVisible().catch(() => false);

      // Check /mua-hang/tao-moi
      await page.goto('http://localhost:3000/mua-hang/tao-moi', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const hasSavePo = await page.locator('button:has-text("Lưu Đơn Mua Hàng")').isVisible().catch(() => false);

      // Check /apps/hrm/tinh-luong
      await page.goto('http://localhost:3000/apps/hrm/tinh-luong', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const hasLockPayroll = await page.locator('button:has-text("Phê Duyệt & Khóa Sổ")').isVisible().catch(() => false);

      // Check /apps/hrm/che-do-luong
      await page.goto('http://localhost:3000/apps/hrm/che-do-luong', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const isSalaryBlocked = await page.locator(':text("403 - KHÔNG CÓ QUYỀN TRUY CẬP")').isVisible().catch(() => false);

      // Check /vat-tu
      await page.goto('http://localhost:3000/vat-tu', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const hasAddVatTu = await page.locator('button:has-text("Thêm vật tư")').isVisible().catch(() => false);

      const pass = !hasSoQuy && !hasSavePo && !hasLockPayroll && isSalaryBlocked && !hasAddVatTu;
      results['BUG-06'] = {
        pass,
        details: `Leaks: soQuy=${hasSoQuy}, savePo=${hasSavePo}, lockPayroll=${hasLockPayroll}, addVatTu=${hasAddVatTu}, salaryBlocked=${isSalaryBlocked}`
      };
      console.log(`  => BUG-06: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-07: Over-blocking Worker on Project Detail Resolved
    // -------------------------------------------------------------
    console.log('\n▶ [7/9] Kiểm tra BUG-07: Thợ thi công vào được chi tiết dự án (/du-an/[id])...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-tho.json' });
      const page = await context.newPage();
      const projectId = '36d52f9d-0bfe-4ab7-9190-b532155e60ae';

      await page.goto(`http://localhost:3000/du-an/${projectId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const isAccessDenied = await page.locator(':text("403 - KHÔNG CÓ QUYỀN TRUY CẬP")').isVisible().catch(() => false);
      const projectTitle = await page.locator('h1, h2, span:has-text("DA-"), span:has-text("Chi tiết")').first().innerText().catch(() => '');

      const pass = !isAccessDenied && projectTitle.length > 0;
      results['BUG-07'] = {
        pass,
        details: `isBlocked: ${isAccessDenied}, projectTitle: "${projectTitle}"`
      };
      console.log(`  => BUG-07: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-08: Toast z-index
    // -------------------------------------------------------------
    console.log('\n▶ [8/9] Kiểm tra BUG-08: Toast container z-index z-[9999]...');
    {
      const toastSource = fs.readFileSync('src/components/ui/Toast.tsx', 'utf8');
      const hasZ9999InSource = toastSource.includes('z-[9999]');

      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/bao-gia/tao-moi', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const saveBtn = page.locator('button:has-text("Lưu Báo Giá & Tính Lãi Gộp")').first();
      await saveBtn.click();
      await page.waitForTimeout(1000);

      const toastContainer = page.locator('.fixed.top-4.right-4').first();
      const classNames = await toastContainer.getAttribute('class').catch(() => '');
      const hasZ9999InDOM = classNames.includes('z-[9999]');

      const pass = hasZ9999InSource && hasZ9999InDOM;
      results['BUG-08'] = {
        pass,
        details: `hasZ9999InSource: ${hasZ9999InSource}, hasZ9999InDOM: ${hasZ9999InDOM}`
      };
      console.log(`  => BUG-08: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

    // -------------------------------------------------------------
    // BUG-09: React Hydration Mismatch
    // -------------------------------------------------------------
    console.log('\n▶ [9/9] Kiểm tra BUG-09: Kiểm tra Hydration Mismatch trên 7 trang chính...');
    {
      const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
      const page = await context.newPage();

      const hydrationErrors = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('did not match') || text.toLowerCase().includes('server-rendered')) {
          hydrationErrors.push(text);
        }
      });

      const routes = ['/', '/cai-dat', '/nhan-su', '/du-an', '/tai-chinh', '/kho', '/mua-hang'];
      for (const route of routes) {
        await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
      }

      const pass = hydrationErrors.length === 0;
      results['BUG-09'] = {
        pass,
        details: `Hydration errors detected: ${hydrationErrors.length}`
      };
      console.log(`  => BUG-09: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
      await context.close();
    }

  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ 9 BUGS:');
  console.log('===============================================================');
  let allPassed = true;
  for (const [bugId, data] of Object.entries(results)) {
    const symbol = data.pass ? 'PASS ✅' : 'FAIL ❌';
    console.log(`- ${bugId}: ${symbol} -> ${data.details}`);
    if (!data.pass) allPassed = false;
  }
  console.log('===============================================================');
  console.log(`KẾT LUẬN CHUNG: ${allPassed ? 'TẤT CẢ 9/9 BUGS ĐÃ ĐƯỢC KHẮC PHỤC HOÀN TOÀN! 💯🎉' : 'CÒN BUG CHƯA ĐẠT!'}`);
  console.log('===============================================================');

  if (allPassed) {
    console.log('\n<!-- GOAL_COMPLETE -->');
  }
}

runVerification().catch(err => {
  console.error('Lỗi kiểm thử xác nhận:', err);
  process.exit(1);
});
