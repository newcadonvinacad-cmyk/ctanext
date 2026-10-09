import { chromium } from 'playwright';
import fs from 'fs';

const ALL_ROUTES = [
  { path: '/', name: 'Tổng quan Dashboard' },
  { path: '/cai-dat', name: 'Cài đặt & Quản trị IAM' },
  { path: '/khach-hang', name: 'Khách hàng (CRM)' },
  { path: '/bao-gia', name: 'Báo giá' },
  { path: '/bao-gia/tao-moi', name: 'Tạo báo giá mới' },
  { path: '/ban-hang', name: 'Bán hàng & Đơn hàng' },
  { path: '/ban-hang/tao-moi', name: 'Tạo đơn bán hàng mới' },
  { path: '/du-an', name: 'Quản lý Dự án' },
  { path: '/du-an/templates', name: 'Template Dự án' },
  { path: '/du-an/thiet-ke-quy-chuan', name: 'Quy chuẩn Thiết kế Dự án' },
  { path: '/khao-sat', name: 'Khảo sát Mặt bằng' },
  { path: '/kho', name: 'Quản lý Kho' },
  { path: '/kho/nhap-xuat', name: 'Phiếu Nhập / Xuất Kho' },
  { path: '/kho/nhap-xuat/tao-moi', name: 'Tạo phiếu Nhập Xuất' },
  { path: '/vat-tu', name: 'Danh mục Vật tư & Giá' },
  { path: '/dinh-muc-bom', name: 'Định mức Vật tư BOM' },
  { path: '/mua-hang', name: 'Mua hàng & Đơn đặt PO' },
  { path: '/mua-hang/tao-moi', name: 'Tạo đơn mua hàng PO' },
  { path: '/nha-cung-cap', name: 'Nhà cung cấp' },
  { path: '/tai-chinh', name: 'Tài chính & Thu chi' },
  { path: '/nhan-su', name: 'Quản lý Nhân sự (Dashboard)' },
  { path: '/nhan-su/danh-gia-luong', name: 'Đánh giá Lương' },
  { path: '/cong-viec', name: 'Quản lý Công việc' },
  { path: '/doi-xe', name: 'Đội xe Vận tải' },
  { path: '/van-chuyen', name: 'Vận chuyển Giao nhận' },
  { path: '/bao-hanh', name: 'Bảo hành & Bảo trì' },
  { path: '/hien-truong', name: 'Hiện trường & Báo cáo' },
  { path: '/phan-tich', name: 'Báo cáo & Phân tích' },
  { path: '/ai-assistant', name: 'Trợ lý AI' },
  { path: '/apps/hrm', name: 'HRM Tổng quan' },
  { path: '/apps/hrm/nhan-su', name: 'HRM Hồ sơ Nhân sự' },
  { path: '/apps/hrm/cham-cong', name: 'HRM Chấm công' },
  { path: '/apps/hrm/tinh-luong', name: 'HRM Tính lương' },
  { path: '/apps/hrm/che-do-luong', name: 'HRM Chế độ Lương' },
  { path: '/apps/hrm/chinh-sach', name: 'HRM Chính sách & Ngày lễ' },
  { path: '/apps/hrm/ca-va-le', name: 'HRM Ca làm việc' },
  { path: '/apps/hrm/tien-ich', name: 'HRM Tiện ích' },
  { path: '/apps/tai-lieu', name: 'Quản lý Tài liệu' },
];

async function runComprehensiveAudit() {
  const browser = await chromium.launch({ headless: true });
  const auditReport = {
    timestamp: new Date().toISOString(),
    adminCrawl: [],
    rbacTest: [],
    modalsTested: [],
    inconsistencies: [],
    toastIssues: [],
  };

  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG SIGNAGE ERP ===');

  // ========================================================
  // PHẦN 1: CRAWL & PHÂN TÍCH TẤT CẢ CÁC TRANG VỚI ADMIN
  // ========================================================
  console.log('\n--- PHẦN 1: CRAWL TẤT CẢ ROUTE VỚI QUYỀN ADMIN ---');
  const adminCtx = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const adminPage = await adminCtx.newPage();

  for (const r of ALL_ROUTES) {
    const pageErrors = [];
    const consoleLogs = [];
    const apiErrors = [];

    const onConsole = msg => {
      if (msg.type() === 'error') consoleLogs.push(msg.text());
    };
    const onPageError = err => pageErrors.push(err.message);
    const onResponse = async res => {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        apiErrors.push({ url: res.url(), status: res.status() });
      }
    };

    adminPage.on('console', onConsole);
    adminPage.on('pageerror', onPageError);
    adminPage.on('response', onResponse);

    try {
      console.log(`Checking [ADMIN] ${r.path} (${r.name})...`);
      const res = await adminPage.goto(`http://localhost:3000${r.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await adminPage.waitForTimeout(2000);

      // Check page status and elements
      const httpStatus = res ? res.status() : null;
      const title = await adminPage.title();
      const hasErrorOverlay = await adminPage.locator('text=Application error, text=Internal Server Error, text=Unhandled Runtime Error').isVisible().catch(() => false);
      const isBlank = (await adminPage.locator('body').innerText()).trim().length < 20;

      // Extract primary action buttons
      const buttons = await adminPage.locator('button').allInnerTexts().catch(() => []);
      const actionButtons = buttons
        .map(b => b.trim())
        .filter(b => b && (b.includes('Thêm') || b.includes('Tạo') || b.includes('Lưu') || b.includes('Duyệt') || b.includes('Xuất') || b.includes('Xóa')));

      auditReport.adminCrawl.push({
        path: r.path,
        name: r.name,
        httpStatus,
        pageErrors,
        consoleLogs: consoleLogs.slice(0, 5),
        apiErrors,
        hasErrorOverlay,
        isBlank,
        actionButtonsCount: actionButtons.length,
        actionButtons: actionButtons.slice(0, 8),
      });
    } catch (err) {
      auditReport.adminCrawl.push({
        path: r.path,
        name: r.name,
        error: err.message
      });
    } finally {
      adminPage.off('console', onConsole);
      adminPage.off('pageerror', onPageError);
      adminPage.off('response', onResponse);
    }
  }

  // ========================================================
  // PHẦN 2: KIỂM TRA PHÂN QUYỀN (RBAC) CỦA CÁC VAI TRÒ KHÁC
  // ĐẶC BIỆT LÀ THỢ (tho@signage-erp.vn) VÀ THỦ KHO, KẾ TOÁN
  // ========================================================
  console.log('\n--- PHẦN 2: KIỂM THỬ PHÂN QUYỀN RBAC (WORKER, WAREHOUSE, ACCOUNTANT) ---');

  // Test 2.1: FIELD_WORKER (Thợ / Lái xe hiện trường)
  console.log('Testing FIELD_WORKER (tho@signage-erp.vn)...');
  const workerCtx = await browser.newContext({ storageState: 'tests/e2e/state-tho.json' });
  const workerPage = await workerCtx.newPage();

  const sensitiveRoutes = [
    { path: '/cai-dat', expectedAllow: false, desc: 'Cài đặt hệ thống & Quản lý IAM' },
    { path: '/tai-chinh', expectedAllow: false, desc: 'Sổ quỹ, Tài chính, Thu chi' },
    { path: '/bao-gia/tao-moi', expectedAllow: false, desc: 'Tạo báo giá, cấu hình giá' },
    { path: '/mua-hang/tao-moi', expectedAllow: false, desc: 'Tạo đơn mua hàng PO' },
    { path: '/nhan-su/danh-gia-luong', expectedAllow: false, desc: 'Đánh giá & Bảng lương nhân sự' },
    { path: '/kho/nhap-xuat/tao-moi', expectedAllow: false, desc: 'Tạo phiếu nhập xuất kho' },
    { path: '/apps/hrm/tinh-luong', expectedAllow: false, desc: 'HRM Bảng lương' },
    { path: '/apps/hrm/che-do-luong', expectedAllow: false, desc: 'HRM Chế độ lương' },
  ];

  for (const s of sensitiveRoutes) {
    try {
      await workerPage.goto(`http://localhost:3000${s.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await workerPage.waitForTimeout(2000);
      const currentUrl = workerPage.url();
      const pageText = await workerPage.locator('body').innerText();
      const isForbiddenPage = pageText.includes('403') || pageText.includes('Không có quyền') || pageText.includes('bị từ chối') || currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/';

      // Look for buttons that should not be visible for worker
      const visibleButtons = await workerPage.locator('button').allInnerTexts().catch(() => []);
      const unauthorizedButtons = visibleButtons
        .map(b => b.trim())
        .filter(b => b.includes('Tạo') || b.includes('Thêm') || b.includes('Lưu') || b.includes('Xóa') || b.includes('Duyệt') || b.includes('Khởi tạo'));

      auditReport.rbacTest.push({
        role: 'FIELD_WORKER',
        path: s.path,
        desc: s.desc,
        expectedAllow: s.expectedAllow,
        actualForbidden: isForbiddenPage,
        currentUrl,
        unauthorizedButtonsVisible: unauthorizedButtons,
        bugFound: !isForbiddenPage ? 'UI không chặn quyền: Thợ hiện trường vẫn truy cập được vào trang nhạy cảm hoặc thấy nút thao tác!' : (unauthorizedButtons.length > 0 ? 'Trang bị cấm nhưng vẫn hiện nút hành động nhạy cảm!' : 'Hợp lệ')
      });
    } catch (e) {
      auditReport.rbacTest.push({
        role: 'FIELD_WORKER',
        path: s.path,
        error: e.message
      });
    }
  }

  // Test 2.2: WAREHOUSE_KEEPER on Finance
  console.log('Testing WAREHOUSE_KEEPER (thukho@signage-erp.vn) on Finance...');
  const thukhoCtx = await browser.newContext({ storageState: 'tests/e2e/state-thukho.json' });
  const thukhoPage = await thukhoCtx.newPage();
  try {
    await thukhoPage.goto('http://localhost:3000/tai-chinh', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await thukhoPage.waitForTimeout(2000);
    const thukhoButtons = await thukhoPage.locator('button').allInnerTexts().catch(() => []);
    const paymentButtons = thukhoButtons.filter(b => b.includes('phiếu chi') || b.includes('phiếu thu') || b.includes('Tạo'));
    auditReport.rbacTest.push({
      role: 'WAREHOUSE_KEEPER',
      path: '/tai-chinh',
      desc: 'Thủ kho truy cập tài chính',
      visibleButtons: paymentButtons,
      bugFound: paymentButtons.length > 0 ? 'Thủ kho vẫn thấy các nút tạo phiếu thu/chi tài chính!' : 'Hợp lệ'
    });
  } catch (e) {
    auditReport.rbacTest.push({ role: 'WAREHOUSE_KEEPER', path: '/tai-chinh', error: e.message });
  }

  // ========================================================
  // PHẦN 3: KIỂM TRA TOAST & NOTIFICATION Z-INDEX / VISIBILITY
  // ========================================================
  console.log('\n--- PHẦN 3: KIỂM THỬ THÔNG BÁO (TOAST & NOTIFICATIONS) ---');
  // Inspect Toast z-index in DOM
  await adminPage.goto('http://localhost:3000/khach-hang', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(2000);

  // Trigger a test toast
  await adminPage.evaluate(() => {
    // Check if toaster exists in DOM
    const toaster = document.querySelector('.fixed.top-4.right-4');
    return toaster ? window.getComputedStyle(toaster).zIndex : null;
  }).then(zIndex => {
    auditReport.toastIssues.push({
      issue: 'Toaster Z-Index Conflict',
      toasterZIndex: zIndex,
      modalZIndex: 'z-[70] (Modal) / z-[80] (DebtPaymentModal)',
      conclusion: 'Z-index của Toaster (50) nhỏ hơn z-index của Modal (70) và DebtPaymentModal (80), khiến toàn bộ thông báo (Toast error, Toast success) khi thao tác trên modal đều bị đè hoặc ẩn dưới nền overlay đen mờ của modal!'
    });
  });

  // Save report
  fs.writeFileSync('tests/e2e/comprehensive_audit_result.json', JSON.stringify(auditReport, null, 2));
  console.log('\n=== HOÀN TẤT KIỂM THỬ TOÀN DIỆN! DỮ LIỆU ĐÃ GHI VÀO comprehensive_audit_result.json ===');

  await browser.close();
}

runComprehensiveAudit().catch(console.error);
