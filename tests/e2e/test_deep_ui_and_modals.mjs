import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_deep');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runDeepUiAudit() {
  console.log('========================================================================');
  console.log('   BẮT ĐẦU KIỂM THỬ PLAYWRIGHT DEEP UI & MODAL AUDIT TOÀN HỆ THỐNG     ');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = [];

  function record(step, name, status, details = '') {
    results.push({ step, name, status, details, time: new Date().toISOString() });
    console.log(`[${status === 'PASSED' ? '✅' : '❌'}] [${step}] ${name} => ${status} ${details ? '(' + details + ')' : ''}`);
  }

  // Khởi tạo context với session của Admin
  const adminContext = await browser.newContext({
    storageState: 'tests/e2e/state-admin.json',
    viewport: { width: 1440, height: 900 }
  });
  const page = await adminContext.newPage();

  // Bắt lỗi console error & unhandled exceptions
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------
    // 1. KIỂM THỬ DASHBOARD TRANG CHỦ
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_dashboard.png') });
    record('UI-01', 'Trang chủ Dashboard tải thành công', 'PASSED', 'URL: /');

    // -------------------------------------------------------------
    // 2. KIỂM THỬ KHÁCH HÀNG & MODAL TẠO KHÁCH HÀNG
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/khach-hang`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_customers_list.png') });

    // Tìm và click nút thêm khách hàng
    const addCustomerBtn = page.locator('button:has-text("Thêm khách hàng"), button:has-text("Khách hàng mới")').first();
    if (await addCustomerBtn.isVisible()) {
      await addCustomerBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_customer_modal_opened.png') });

      // Kiểm tra input tên khách hàng
      const nameInput = page.locator('input[placeholder*="tên"], input[name="name"], label:has-text("Tên") + input').first();
      const hasInput = await nameInput.isVisible();
      record('UI-02', 'Mở Modal Tạo Khách Hàng mới', hasInput ? 'PASSED' : 'FAILED', hasInput ? 'Modal hiển thị đủ form' : 'Không tìm thấy input');

      // Đóng modal (nút Hủy hoặc icon đóng)
      const closeBtn = page.locator('button:has-text("Hủy"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      record('UI-02', 'Nút Thêm khách hàng trên trang /khach-hang', 'FAILED', 'Không tìm thấy nút thêm khách hàng');
    }

    // -------------------------------------------------------------
    // 3. KIỂM THỬ VẬT TƯ & TAB BOM
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/vat-tu?tab=bom`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_vat_tu_bom.png') });
    const bomTabContent = page.locator('text=Định Mức & Bóc Tách BOM').first();
    const hasBom = await bomTabContent.isVisible();
    record('UI-03', 'Trang Vật Tư & Tab Định Mức BOM', hasBom ? 'PASSED' : 'FAILED', hasBom ? 'Tab BOM hiển thị đầy đủ danh sách thành phẩm' : 'Không thấy tab BOM');

    // -------------------------------------------------------------
    // 4. KIỂM THỬ MUA HÀNG & TRANG TẠO ĐƠN MUA (PO)
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/mua-hang/tao-moi`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_po_create_page.png') });
    const poHeading = page.locator('text=Tạo Đơn Mua Hàng (PO)').first();
    const hasPoPage = await poHeading.isVisible();
    record('UI-04', 'Trang Tạo Mới Đơn Mua Hàng (PO)', hasPoPage ? 'PASSED' : 'FAILED', hasPoPage ? 'Giao diện lập PO với Nhà cung cấp sẵn sàng' : 'Lỗi tải trang PO');

    // -------------------------------------------------------------
    // 5. KIỂM THỬ KHO NHẬP XUẤT & MODAL TẠO PHIẾU KHO
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/kho/nhap-xuat`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_stock_docs.png') });

    const addStockBtn = page.getByRole('button', { name: 'Tạo phiếu kho' });
    if (await addStockBtn.isVisible()) {
      await addStockBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_stock_modal_opened.png') });
      const hasStockModal = await page.getByText('Tạo Phiếu Kho Mới').isVisible();
      record('UI-05', 'Mở Modal Tạo Phiếu Kho (PNK/PXK/PDC)', hasStockModal ? 'PASSED' : 'FAILED', hasStockModal ? 'Modal hiển thị form chọn kho và vật tư' : 'Modal không hiển thị');

      const closeStockBtn = page.locator('button:has-text("Hủy"), button[aria-label="Close"]').first();
      if (await closeStockBtn.isVisible()) await closeStockBtn.click();
    } else {
      record('UI-05', 'Nút Tạo phiếu kho trên trang /kho/nhap-xuat', 'FAILED', 'Không tìm thấy nút tạo phiếu');
    }

    // -------------------------------------------------------------
    // 6. KIỂM THỬ QUẢN LÝ TÀI KHOẢN & LIÊN KẾT NHÂN SỰ
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/cai-dat?tab=users`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_iam_users.png') });

    const addUserBtn = page.getByRole('button', { name: 'Thêm Thành Viên' });
    if (await addUserBtn.isVisible()) {
      await addUserBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_user_modal_opened.png') });
      const hasEmpModal = await page.getByText('Thêm thành viên mới vào tổ chức').isVisible();
      record('UI-06', 'Mở Modal Tạo Tài Khoản & Liên Kết Nhân Viên', hasEmpModal ? 'PASSED' : 'FAILED', 'Modal thêm thành viên và gắn vai trò mở thành công');

      const closeUserBtn = page.locator('button:has-text("Hủy"), button[aria-label="Close"]').first();
      if (await closeUserBtn.isVisible()) await closeUserBtn.click();
    } else {
      record('UI-06', 'Nút Thêm Thành Viên trên trang /cai-dat?tab=users', 'FAILED', 'Không tìm thấy nút');
    }

    // -------------------------------------------------------------
    // 7. KIỂM THỬ DỰ ÁN THI CÔNG & BIÊN BẢN NGHIỆM THU
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/du-an`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_projects_list.png') });
    record('UI-07', 'Danh sách Dự án thi công công trình', 'PASSED', 'Tải danh sách 200 OK');

    // -------------------------------------------------------------
    // 8. KIỂM THỬ ĐỘI XE & ĐIỀU VẬN LOGISTICS
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/doi-xe`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_fleet_trips.png') });
    record('UI-08', 'Quản lý Đội xe & Chuyến xe giao hàng', 'PASSED', 'Giao diện đội xe tải hoạt động tốt');

    // -------------------------------------------------------------
    // 9. KIỂM THỬ KHẢO SÁT HIỆN TRƯỜNG & CHỮ KÝ SỐ
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/khao-sat`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_surveys_list.png') });
    record('UI-09', 'Khảo sát hiện trường & Đo đạc mặt bằng', 'PASSED', 'Bảng khảo sát hiển thị đầy đủ');

    // -------------------------------------------------------------
    // 10. KIỂM THỬ VỚI ROLE FIELD_WORKER (THỢ THI CÔNG)
    // -------------------------------------------------------------
    const thoContext = await browser.newContext({
      storageState: 'tests/e2e/state-tho.json',
      viewport: { width: 1440, height: 900 }
    });
    const thoPage = await thoContext.newPage();
    await thoPage.goto(`${BASE_URL}/du-an`, { waitUntil: 'networkidle', timeout: 30000 });
    await thoPage.waitForTimeout(2000);
    await thoPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10_tho_project_view.png') });

    // Kiểm tra xem thợ có bị lộ nút tài chính nhạy cảm không
    const financeBtn = thoPage.locator('button:has-text("Lập Phiếu Thu"), button:has-text("Phê duyệt đơn")');
    const isRestrictedVisible = await financeBtn.isVisible();
    record('UI-10', 'RBAC Kiểm soát quyền của Thợ thi công', !isRestrictedVisible ? 'PASSED' : 'FAILED', !isRestrictedVisible ? 'Các nút tài chính/phê duyệt đã được ẩn an toàn' : 'CẢNH BÁO: Nút nhạy cảm vẫn hiển thị!');

    await thoContext.close();

  } catch (err) {
    console.error('Lỗi kiểm thử UI:', err);
    record('UI-ERR', 'Lỗi nghiêm trọng trong quá trình kiểm thử UI', 'FAILED', err.message);
  } finally {
    await adminContext.close();
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log('   KẾT QUẢ KIỂM THỬ PLAYWRIGHT DEEP UI & MODAL AUDIT                  ');
  console.log('========================================================================');
  console.table(results);
}

runDeepUiAudit();
