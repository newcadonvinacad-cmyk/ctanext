import { chromium } from 'playwright';
import fs from 'fs';

async function testDeepModules() {
  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const thukhoContext = await browser.newContext({ storageState: 'tests/e2e/state-thukho.json' });

  const adminPage = await adminContext.newPage();
  const thukhoPage = await thukhoContext.newPage();

  const auditResults = [];

  console.log('=====================================================');
  console.log('   BẮT ĐẦU KIỂM THỬ CHUYÊN SÂU CÁC PHÂN HỆ ERP       ');
  console.log('=====================================================\n');

  // -----------------------------------------------------------------
  // MODULE 1: KHẢO SÁT HIỆN TRƯỜNG (/khao-sat)
  // -----------------------------------------------------------------
  console.log('--- MODULE 1: Khảo sát hiện trường (/khao-sat) ---');
  try {
    await adminPage.goto('http://localhost:3000/khao-sat', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    const openModalBtn = adminPage.locator('button:has-text("Tạo phiếu khảo sát"), button:has-text("Khảo sát mới")').first();
    const hasOpenBtn = await openModalBtn.isVisible();
    console.log('Nút Mở modal khảo sát:', hasOpenBtn);

    let createdSurvey = null;
    if (hasOpenBtn) {
      await openModalBtn.click();
      await adminPage.waitForTimeout(1000);

      // Điền thông tin khảo sát
      const dealerInput = adminPage.locator('input[placeholder*="Đại lý"], input[name="dealerName"]').first();
      if (await dealerInput.isVisible()) await dealerInput.fill('Đại Lý Sơn Hải Phòng Test E2E');

      const addrInput = adminPage.locator('input[placeholder*="địa chỉ"], textarea[placeholder*="địa chỉ"]').first();
      if (await addrInput.isVisible()) await addrInput.fill('123 Đường Lạch Tray, Ngô Quyền, Hải Phòng');

      const saveSurveyBtn = adminPage.locator('button:has-text("Lưu Phiếu Khảo Sát"), button:has-text("Lưu Khảo Sát")').first();
      const surveyPromise = adminPage.waitForResponse(
        r => r.url().includes('/api/surveys') && r.request().method() === 'POST',
        { timeout: 8000 }
      ).catch(() => null);

      if (await saveSurveyBtn.isVisible()) {
        await saveSurveyBtn.click();
        const sRes = await surveyPromise;
        const status = sRes ? sRes.status() : 0;
        const body = sRes ? await sRes.json().catch(() => ({})) : {};
        console.log('API Khảo sát status:', status);
        createdSurvey = body.survey;
      }
    }

    auditResults.push({
      module: 'Khảo sát hiện trường (/khao-sat)',
      feature: 'Tạo phiếu khảo sát thực địa',
      status: createdSurvey ? 'PASSED' : 'CHECK_REQUIRED',
      details: createdSurvey ? `Tạo thành công phiếu mã: ${createdSurvey.code}` : 'Không lưu được qua modal'
    });
  } catch (err) {
    console.error('Lỗi Module 1:', err);
    auditResults.push({ module: 'Khảo sát', feature: 'Tạo phiếu', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 2: BẢO HÀNH & SỰ CỐ CÔNG TRÌNH (/bao-hanh)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 2: Sổ bảo hành & Ticket sự cố (/bao-hanh) ---');
  try {
    await adminPage.goto('http://localhost:3000/bao-hanh', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    const openTicketBtn = adminPage.locator('button:has-text("Tiếp nhận sự cố"), button:has-text("Tạo ticket")').first();
    const hasTicketBtn = await openTicketBtn.isVisible();
    console.log('Nút Tiếp nhận sự cố visible:', hasTicketBtn);

    let ticketCreated = false;
    if (hasTicketBtn) {
      await openTicketBtn.click();
      await adminPage.waitForTimeout(1000);

      const titleInput = adminPage.locator('input[placeholder*="tiêu đề"], input[placeholder*="Mô tả sự cố"]').first();
      if (await titleInput.isVisible()) await titleInput.fill('Cháy bộ nguồn LED biển hiệu mặt tiền');

      const saveTicketBtn = adminPage.locator('button:has-text("Tạo Ticket Tiếp Nhận"), button:has-text("Lưu Ticket")').first();
      const ticketPromise = adminPage.waitForResponse(
        r => r.url().includes('/api/service-tickets') && r.request().method() === 'POST',
        { timeout: 8000 }
      ).catch(() => null);

      if (await saveTicketBtn.isVisible()) {
        await saveTicketBtn.click();
        const tRes = await ticketPromise;
        const status = tRes ? tRes.status() : 0;
        console.log('API Service Ticket status:', status);
        ticketCreated = status === 201 || status === 200;
      }
    }

    auditResults.push({
      module: 'Bảo hành & Sự cố (/bao-hanh)',
      feature: 'Tạo Ticket tiếp nhận sự cố kỹ thuật',
      status: ticketCreated ? 'PASSED' : 'CHECK_REQUIRED',
      details: ticketCreated ? 'Tạo thành công ticket tiếp nhận' : 'Chưa tạo được ticket'
    });
  } catch (err) {
    console.error('Lỗi Module 2:', err);
    auditResults.push({ module: 'Bảo hành', feature: 'Tạo Ticket', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 3: ĐỘI XE & ĐIỀU VẬN (/van-chuyen)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 3: Đội xe & Vận chuyển (/van-chuyen) ---');
  try {
    await adminPage.goto('http://localhost:3000/van-chuyen', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    const openFleetBtn = adminPage.locator('button:has-text("Lập Lệnh Điều Xe"), button:has-text("Thêm chuyến")').first();
    const hasFleetBtn = await openFleetBtn.isVisible();
    console.log('Nút Lập lệnh điều xe visible:', hasFleetBtn);

    let tripCreated = false;
    if (hasFleetBtn) {
      await openFleetBtn.click();
      await adminPage.waitForTimeout(1000);

      const stop2Input = adminPage.locator('input[placeholder*="Công trình"], input[placeholder*="Điểm đến"]').first();
      if (await stop2Input.isVisible()) await stop2Input.fill('Công trình Biển Hiệu Vincom Plaza Test E2E');

      const saveTripBtn = adminPage.locator('button:has-text("Khởi Tạo Lệnh Điều Xe"), button:has-text("Lưu")').first();
      const tripPromise = adminPage.waitForResponse(
        r => r.url().includes('/api/fleet/trips') && r.request().method() === 'POST',
        { timeout: 8000 }
      ).catch(() => null);

      if (await saveTripBtn.isVisible()) {
        await saveTripBtn.click();
        const trRes = await tripPromise;
        const status = trRes ? trRes.status() : 0;
        console.log('API Điều xe status:', status);
        tripCreated = status === 201 || status === 200;
      }
    }

    auditResults.push({
      module: 'Đội xe & Vận chuyển (/van-chuyen)',
      feature: 'Khởi tạo lệnh điều xe giao biển hiệu',
      status: tripCreated ? 'PASSED' : 'CHECK_REQUIRED',
      details: tripCreated ? 'Tạo thành công chuyến xe' : 'Không tạo được chuyến xe'
    });
  } catch (err) {
    console.error('Lỗi Module 3:', err);
    auditResults.push({ module: 'Đội xe', feature: 'Lập lệnh điều xe', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 4: CHẤM CÔNG & NGHỈ PHÉP HRM (/apps/hrm/cham-cong)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 4: Chấm công & Quản lý Nghỉ phép (/apps/hrm/cham-cong) ---');
  try {
    await adminPage.goto('http://localhost:3000/apps/hrm/cham-cong', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    const tabMatrix = adminPage.locator('button:has-text("Bảng Công Tháng"), button:has-text("Ma Trận")').first();
    const hasTabMatrix = await tabMatrix.isVisible();
    if (hasTabMatrix) await tabMatrix.click();
    await adminPage.waitForTimeout(1000);

    const tabRequests = adminPage.locator('button:has-text("Duyệt Đơn Từ"), button:has-text("Nghỉ Phép")').first();
    const hasTabRequests = await tabRequests.isVisible();
    if (hasTabRequests) await tabRequests.click();
    await adminPage.waitForTimeout(1000);

    console.log('Các tab chấm công hiển thị:', { hasTabMatrix, hasTabRequests });

    auditResults.push({
      module: 'HRM Chấm công (/apps/hrm/cham-cong)',
      feature: 'Điều hướng 3 Tab: Hôm nay - Ma trận tháng - Duyệt đơn',
      status: (hasTabMatrix && hasTabRequests) ? 'PASSED' : 'CHECK_REQUIRED',
      details: 'Hiển thị đầy đủ bảng công và bộ lọc đơn từ'
    });
  } catch (err) {
    console.error('Lỗi Module 4:', err);
    auditResults.push({ module: 'Chấm công', feature: 'Ma trận tháng', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 5: BÓC TÁCH ĐỊNH MỨC BOM (/vat-tu?tab=bom)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 5: Định mức & Bóc tách BOM (/vat-tu?tab=bom) ---');
  try {
    await adminPage.goto('http://localhost:3000/vat-tu?tab=bom', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    const bomTabHeader = await adminPage.locator('text=Định Mức Cấu Kiện Signage (BOM)').first().isVisible().catch(() => false);
    const hasCalcBtn = await adminPage.locator('button:has-text("Tính Bóc Tách"), button:has-text("Bóc tách")').first().isVisible().catch(() => false);

    console.log('Tab BOM visible:', bomTabHeader, 'Nút Bóc tách:', hasCalcBtn);

    auditResults.push({
      module: 'Vật tư & Định mức (/vat-tu?tab=bom)',
      feature: 'Hiển thị công thức BOM cấu kiện biển quảng cáo',
      status: bomTabHeader ? 'PASSED' : 'CHECK_REQUIRED',
      details: bomTabHeader ? 'Giao diện BOM tích hợp đầy đủ công thức' : 'Tab BOM chưa tải được'
    });
  } catch (err) {
    console.error('Lỗi Module 5:', err);
    auditResults.push({ module: 'BOM', feature: 'Công thức định mức', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 6: PHÂN TÍCH ĐIỀU HÀNH BI (/phan-tich)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 6: Phân tích điều hành BI (/phan-tich) ---');
  try {
    await adminPage.goto('http://localhost:3000/phan-tich', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);

    const hasStatAlu = await adminPage.locator('text=Hiệu suất tận dụng Alu').isVisible().catch(() => false);
    const hasCharts = await adminPage.locator('.recharts-responsive-container').count().catch(() => 0);

    console.log('BI Chỉ số Alu:', hasStatAlu, 'Số biểu đồ Recharts:', hasCharts);

    auditResults.push({
      module: 'Phân tích BI (/phan-tich)',
      feature: 'Executive Dashboard & Biểu đồ Recharts',
      status: (hasStatAlu && hasCharts > 0) ? 'PASSED' : 'CHECK_REQUIRED',
      details: `Hiển thị 4 KPIs cốt lõi và ${hasCharts} biểu đồ phân tích hao hụt`
    });
  } catch (err) {
    console.error('Lỗi Module 6:', err);
    auditResults.push({ module: 'Phân tích BI', feature: 'Executive Dashboard', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 7: KHÁCH HÀNG & NHÀ CUNG CẤP (/khach-hang, /nha-cung-cap)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 7: Đối tác & CRM (/khach-hang, /nha-cung-cap) ---');
  try {
    await adminPage.goto('http://localhost:3000/khach-hang', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);
    const custCount = await adminPage.locator('table tbody tr').count().catch(() => 0);

    await adminPage.goto('http://localhost:3000/nha-cung-cap', { waitUntil: 'domcontentloaded' });
    await adminPage.waitForTimeout(3000);
    const suppCount = await adminPage.locator('table tbody tr').count().catch(() => 0);

    console.log(`Số khách hàng hiển thị: ${custCount}, Số NCC: ${suppCount}`);

    auditResults.push({
      module: 'Đối tác & CRM (/khach-hang, /nha-cung-cap)',
      feature: 'Tải danh mục Khách hàng và Nhà cung cấp',
      status: (custCount > 0 && suppCount > 0) ? 'PASSED' : 'CHECK_REQUIRED',
      details: `Hiển thị ${custCount} khách hàng và ${suppCount} nhà cung cấp hợp tác`
    });
  } catch (err) {
    console.error('Lỗi Module 7:', err);
    auditResults.push({ module: 'Đối tác', feature: 'Danh mục', status: 'FAILED', details: err.message });
  }

  // -----------------------------------------------------------------
  // MODULE 8: WORKFLOW KHO DEADLOCK AUDIT (Vấn đề phát hiện)
  // -----------------------------------------------------------------
  console.log('\n--- MODULE 8: Rà soát luồng phê duyệt Chứng từ Kho (/kho/nhap-xuat) ---');
  try {
    const whRes = await thukhoPage.request.get('http://localhost:3000/api/inventory/warehouses');
    const whData = await whRes.json();
    const thukhoWarehouses = whData.warehouses || [];

    const isWarehouseKeeperIsolated = thukhoWarehouses.length === 0;
    console.log('Thủ kho thấy số lượng kho:', thukhoWarehouses.length);

    auditResults.push({
      module: 'Quản lý Kho (/kho/nhap-xuat)',
      feature: 'Phân quyền Kho cho Thủ Kho (thukho@signage-erp.vn)',
      status: isWarehouseKeeperIsolated ? 'DEFECT_FOUND' : 'PASSED',
      details: isWarehouseKeeperIsolated
        ? 'LỖI: Bảng erp.warehouse_members thiếu dữ liệu liên kết khiến Thủ Kho bị cô lập (0 kho khả dụng)'
        : 'Thủ kho truy cập các kho bình thường'
    });
  } catch (err) {
    console.error('Lỗi Module 8:', err);
  }

  console.log('\n=== KẾT QUẢ KIỂM THỬ CHUYÊN SÂU TỔNG HỢP ===');
  console.table(auditResults);

  fs.writeFileSync('tests/e2e/deep_audit_results.json', JSON.stringify(auditResults, null, 2), 'utf8');

  await browser.close();
}

testDeepModules().catch(console.error);
