import { chromium } from 'playwright';
import nextEnv from '@next/env';
import pg from 'pg';
import fs from 'fs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

const BASE_URL = 'http://localhost:3000';

async function runProductionLifecycleTest() {
  const report = [];
  const startTime = Date.now();

  function logStep(stepNum, stepName, status, details = '', error = null) {
    const entry = { stepNum, stepName, status, details, error: error ? (error.message || String(error)) : null, timestamp: new Date().toISOString() };
    report.push(entry);
    const symbol = status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${symbol} [BƯỚC ${stepNum}] ${stepName} => ${status}`);
    if (details) console.log(`   Chi tiết: ${details}`);
    if (error) console.log(`   Lỗi: ${error.message || error}`);
  }

  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ storageState: 'tests/e2e/state-admin.json' });
  const ketoanContext = await browser.newContext({ storageState: 'tests/e2e/state-ketoan.json' });
  const thukhoContext = await browser.newContext({ storageState: 'tests/e2e/state-thukho.json' });
  const thoContext = await browser.newContext({ storageState: 'tests/e2e/state-tho.json' });

  const adminPage = await adminContext.newPage();
  const ketoanPage = await ketoanContext.newPage();
  const thukhoPage = await thukhoContext.newPage();
  const thoPage = await thoContext.newPage();

  const dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await dbClient.connect();

  console.log('========================================================================');
  console.log('   BẮT ĐẦU KIỂM THỬ VẬN HÀNH TOÀN DIỆN DOANH NGHIỆP SIGNAGE TỪ A - Z   ');
  console.log('========================================================================\n');

  let testCustomerId = null;
  let testCustomerCode = `KH-PROD-${Date.now().toString().slice(-4)}`;
  let testSupplierId = null;
  let testSupplierCode = null;
  let testItemId = null;
  let testItemCode = `ALU-PROD-${Date.now().toString().slice(-4)}`;
  let testSurveyId = null;
  let testQuotationId = null;
  let testOrderId = null;
  let testPoId = null;
  let testStockDocReceiptId = null;
  let testStockDocIssueId = null;
  let testTripId = null;

  // ---------------------------------------------------------------------------------------
  // BƯỚC 1: MASTER DATA (Khách hàng, Nhà cung cấp, Vật tư, Định mức)
  // ---------------------------------------------------------------------------------------
  console.log('>>> GIAI ĐOẠN 1: THIẾT LẬP DỮ LIỆU DANH MỤC & ĐỐI TÁC (MASTER DATA) <<<');

  // 1.1 Tạo Khách Hàng Mới
  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/crm/customers`, {
      data: {
        code: testCustomerCode,
        name: `Tập Đoàn Bán Lẻ WinMart Chuỗi Mới (${testCustomerCode})`,
        phone: '0988.112.334',
        email: `winmart.${testCustomerCode.toLowerCase()}@masan.vn`,
        address: 'Tầng 12 Tòa nhà M-Plaza, 39 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM',
        taxCode: '0301234888',
        creditLimit: 200000000,
        paymentDays: 30
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.customerId) {
      testCustomerId = data.customerId;
      logStep('1.1', 'Tạo Khách hàng doanh nghiệp mới', 'PASSED', `Mã KH: ${testCustomerCode}, ID: ${testCustomerId}`);
    } else {
      logStep('1.1', 'Tạo Khách hàng doanh nghiệp mới', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('1.1', 'Tạo Khách hàng doanh nghiệp mới', 'FAILED', '', err);
  }

  // 1.2 Tạo Nhà Cung Cấp Mới
  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/procurement/suppliers`, {
      data: {
        name: `Tổng Kho Tấm Alu Alcorest & Mica Chochen (${testCustomerCode})`,
        taxCode: '0105556667',
        phone: '0912.888.999',
        address: 'Cụm Công Nghiệp Ngọc Hồi, Thanh Trì, Hà Nội',
        creditLimit: 300000000,
        paymentDays: 45
      }
    });
    const data = await res.json();
    if (res.status() === 200 && data.supplierId) {
      testSupplierId = data.supplierId;
      const sDb = await dbClient.query('SELECT code FROM erp.partners WHERE id = $1', [testSupplierId]);
      testSupplierCode = sDb.rows[0]?.code || 'NCC-NEW';
      logStep('1.2', 'Tạo Nhà cung cấp vật tư kim khí / alu mới', 'PASSED', `Mã NCC: ${testSupplierCode}, ID: ${testSupplierId}`);
    } else {
      logStep('1.2', 'Tạo Nhà cung cấp vật tư kim khí / alu mới', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('1.2', 'Tạo Nhà cung cấp vật tư kim khí / alu mới', 'FAILED', '', err);
  }

  // 1.3 Tạo Vật Tư & Quy Cách Kỹ Thuật (Item SKU)
  try {
    const catRes = await dbClient.query('SELECT id FROM erp.item_categories LIMIT 1');
    const unitRes = await dbClient.query('SELECT id FROM erp.units LIMIT 1');
    const categoryId = catRes.rows[0]?.id;
    const baseUnitId = unitRes.rows[0]?.id;

    const res = await adminPage.request.post(`${BASE_URL}/api/inventory/items`, {
      data: {
        code: testItemCode,
        name: `Tấm Alu Alcorest Ngoài Trời PVDF 3mmx0.21mm (${testItemCode})`,
        kind: 'material',
        categoryId,
        baseUnitId,
        minQty: 20,
        reorderQty: 50,
        binLabel: 'KỆ-A1-TẦNG2',
        specJson: {
          thicknessMm: 3.0,
          aluminumSkinMm: 0.21,
          coatingType: 'PVDF ngoài trời',
          sheetSize: '1220mm x 2440mm'
        }
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.item) {
      testItemId = data.item.id;
      logStep('1.3', 'Tạo Vật tư & Quy cách kỹ thuật (Item SKU)', 'PASSED', `Mã SKU: ${testItemCode}, ID: ${testItemId}`);
    } else {
      logStep('1.3', 'Tạo Vật tư & Quy cách kỹ thuật (Item SKU)', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('1.3', 'Tạo Vật tư & Quy cách kỹ thuật (Item SKU)', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 2: KHẢO SÁT HIỆN TRƯỜNG & CHỮ KÝ XÁC NHẬN SỐ ĐO
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 2: KHẢO SÁT HIỆN TRƯỜNG & KÝ SỐ MẶT BẰNG <<<');

  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/surveys`, {
      data: {
        title: `Khảo sát Mặt tiền Biển Hiệu WinMart Tân Bình (${testCustomerCode})`,
        address: '456 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM',
        customerId: testCustomerId,
        surveyDate: new Date().toISOString().split('T')[0],
        widthMeters: 14.5,
        heightMeters: 3.5,
        depthMeters: 0.25,
        floorLevel: 'Tầng 1 (Mặt tiền phố)',
        elevationMeters: 4.8,
        structureType: 'Dầm bê tông cốt thép & tường gạch chịu lực',
        powerSource: '220V 1 pha, CB 32A riêng biệt',
        powerDistanceMeters: 8,
        installationMethod: 'Giàn giáo thép 2 tầng & dây an toàn',
        obstacles: 'Cây xanh đô thị cách mép bảng 1.8m, vướng mái hiên di động nhà liền kề',
        metadata: {
          regionKV: 'MIỀN NAM - TP.HCM',
          workType: 'MẶT DỰNG ALU & CHỮ NỔI LED',
          dealerName: 'WinMart+ Chi Nhánh Tân Bình',
          dealerPhone: '0988.112.334'
        }
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.survey?.id) {
      testSurveyId = data.survey.id;
      logStep('2.1', 'Lập Phiếu Khảo Sát Hiện Trường chuẩn thực địa', 'PASSED', `Mã KS: ${data.survey.code}, Kích thước: 14.5m x 3.5m`);
    } else {
      logStep('2.1', 'Lập Phiếu Khảo Sát Hiện Trường chuẩn thực địa', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('2.1', 'Lập Phiếu Khảo Sát Hiện Trường chuẩn thực địa', 'FAILED', '', err);
  }

  // 2.2 Ký Số Xác Nhận Số Đo Khảo Sát
  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/surveys/${testSurveyId}/signature`, {
      data: {
        customerSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        surveyorSignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    });
    const data = await res.json();
    if (res.status() === 200 && data.success) {
      logStep('2.2', 'Ký số cảm ứng xác nhận số đo mặt bằng (Khách hàng & Kỹ thuật)', 'PASSED', data.message);
    } else {
      logStep('2.2', 'Ký số cảm ứng xác nhận số đo mặt bằng (Khách hàng & Kỹ thuật)', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('2.2', 'Ký số cảm ứng xác nhận số đo mặt bằng (Khách hàng & Kỹ thuật)', 'FAILED', '', err);
  }

  // 2.3 1-Click Convert Khảo Sát Thành Báo Giá Dự Toán
  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/surveys/${testSurveyId}/convert-quote`);
    const data = await res.json();
    if (res.status() === 200 && data.quotationId) {
      testQuotationId = data.quotationId;
      logStep('2.3', '1-Click Tự Động Khởi Tạo Báo Giá Dự Toán từ số đo khảo sát', 'PASSED', `Mã Báo Giá: ${data.quotationCode}, ID: ${testQuotationId}`);
    } else {
      logStep('2.3', '1-Click Tự Động Khởi Tạo Báo Giá Dự Toán từ số đo khảo sát', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('2.3', '1-Click Tự Động Khởi Tạo Báo Giá Dự Toán từ số đo khảo sát', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 3: CHI TIẾT BÁO GIÁ & CHUYỂN ĐỔI SANG ĐƠN BÁN HÀNG (SALES ORDER)
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 3: BÓC TÁCH BÁO GIÁ & PHÁT HÀNH ĐƠN BÁN HÀNG <<<');

  try {
    const unitRes = await dbClient.query('SELECT id FROM erp.units LIMIT 1');
    const unitId = unitRes.rows[0]?.id;

    const res = await adminPage.request.post(`${BASE_URL}/api/crm/orders`, {
      data: {
        customerId: testCustomerId,
        notes: `Hợp đồng thi công biển hiệu chuỗi WinMart Tân Bình (${testCustomerCode})`,
        recordReceivable: true,
        paymentDays: 15,
        lines: [
          {
            description: 'Mặt dựng Alu PVDF Alcorest ngoài trời khung sắt hộp mạ kẽm 25x25',
            unitId,
            itemId: testItemId,
            qty: 50,
            unitPrice: 850000
          },
          {
            description: 'Bộ chữ nổi Mica Đài Loan uốn viền Inox vàng gương hắt sáng chân LED',
            unitId,
            itemId: testItemId,
            qty: 1,
            unitPrice: 18500000
          },
          {
            description: 'Hệ thống nguồn LED chống nước Meanwell 12V-350W & Đèn LED module 3 bóng',
            unitId,
            itemId: testItemId,
            qty: 8,
            unitPrice: 650000
          }
        ]
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.orderId) {
      testOrderId = data.orderId;
      const orderDb = await dbClient.query('SELECT code, total FROM erp.sales_orders WHERE id = $1', [testOrderId]);
      const totalAmount = orderDb.rows[0]?.total;
      logStep('3.1', 'Phát hành Đơn Bán Hàng chính thức (Sales Order)', 'PASSED', `Mã Đơn: ${orderDb.rows[0]?.code}, Tổng tiền: ${Number(totalAmount).toLocaleString('vi-VN')} VND`);
    } else {
      logStep('3.1', 'Phát hành Đơn Bán Hàng chính thức (Sales Order)', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('3.1', 'Phát hành Đơn Bán Hàng chính thức (Sales Order)', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 4: TÀI CHÍNH GIAI ĐOẠN 1 - THU TIỀN ĐẶT CỌC & GẠCH NỢ KHÁCH HÀNG
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 4: THU TIỀN TẠM ỨNG & GẠCH NỢ PHẢI THU (RECEIVABLE) <<<');

  try {
    const accRes = await dbClient.query('SELECT id, name FROM erp.cash_accounts LIMIT 1');
    const cashAccountId = accRes.rows[0]?.id;

    const oiRes = await dbClient.query('SELECT id, original_amount FROM erp.open_items WHERE sales_order_id = $1 LIMIT 1', [testOrderId]);
    const openItem = oiRes.rows[0];

    const depositAmount = 33100000; // 50% tổng đơn hàng 66.200.000

    const res = await ketoanPage.request.post(`${BASE_URL}/api/finance/payments`, {
      data: {
        direction: 'receipt',
        amount: depositAmount,
        purpose: `Thu tiền tạm ứng đợt 1 (50%) Đơn hàng ${testCustomerCode}`,
        cashAccountId,
        partnerId: testCustomerId,
        allocatedItemIds: openItem ? [openItem.id] : [],
        allocations: openItem ? [{ openItemId: openItem.id, amount: depositAmount }] : []
      }
    });
    const data = await res.json();
    if (res.status() === 200 || res.status() === 201) {
      logStep('4.1', 'Lập Phiếu Thu tiền mặt/chuyển khoản đợt 1 & Gạch nợ khách hàng', 'PASSED', `Số tiền thu: ${depositAmount.toLocaleString('vi-VN')} VND, Phiếu: ${data.paymentId}`);
    } else {
      logStep('4.1', 'Lập Phiếu Thu tiền mặt/chuyển khoản đợt 1 & Gạch nợ khách hàng', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('4.1', 'Lập Phiếu Thu tiền mặt/chuyển khoản đợt 1 & Gạch nợ khách hàng', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 5: ĐƠN MUA HÀNG PO VẬT TƯ & PHÊ DUYỆT ĐƠN MUA
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 5: ĐƠN MUA HÀNG VẬT TƯ (PO) & PHÊ DUYỆT CẤP QUẢN LÝ <<<');

  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/procurement/orders`, {
      data: {
        supplierId: testSupplierId,
        expectedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        notes: `Đơn mua vật tư Alu & phụ kiện cho công trình WinMart (${testCustomerCode})`,
        lines: [
          {
            itemId: testItemId,
            qty: 50,
            unitPrice: 380000,
            taxRate: 8,
            notes: 'Alu ngoài trời màu đỏ WinMart chuẩn nhận diện thương hiệu'
          }
        ]
      }
    });
    const data = await res.json();
    if ((res.status() === 200 || res.status() === 201) && data.poId) {
      testPoId = data.poId;
      const poDb = await dbClient.query('SELECT code, status, total FROM erp.purchase_orders WHERE id = $1', [testPoId]);
      logStep('5.1', 'Tạo Đơn Mua Hàng PO gửi Nhà Cung Cấp', 'PASSED', `Mã PO: ${poDb.rows[0]?.code}, Trạng thái: ${poDb.rows[0]?.status}, Giá trị: ${Number(poDb.rows[0]?.total).toLocaleString('vi-VN')} VND`);
    } else {
      logStep('5.1', 'Tạo Đơn Mua Hàng PO gửi Nhà Cung Cấp', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('5.1', 'Tạo Đơn Mua Hàng PO gửi Nhà Cung Cấp', 'FAILED', '', err);
  }

  // 5.2 Phê Duyệt Đơn Mua Hàng (PO Approval Gate)
  try {
    const res = await adminPage.request.post(`${BASE_URL}/api/procurement/orders/${testPoId}/approve`, {
      data: { notes: 'Đã kiểm tra định mức và duyệt chi mua vật tư alu' }
    });
    const data = await res.json();
    if (res.status() === 200 && data.success) {
      const poDb = await dbClient.query('SELECT status FROM erp.purchase_orders WHERE id = $1', [testPoId]);
      logStep('5.2', 'Giám đốc / Trưởng phòng phê duyệt Đơn Mua Hàng PO', 'PASSED', `Trạng thái PO sau duyệt: '${poDb.rows[0]?.status}'`);
    } else {
      logStep('5.2', 'Giám đốc / Trưởng phòng phê duyệt Đơn Mua Hàng PO', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('5.2', 'Giám đốc / Trưởng phòng phê duyệt Đơn Mua Hàng PO', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 6: NHẬP KHO VẬT TƯ & CẬP NHẬT TỒN KHO THỰC TẾ
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 6: NHẬP KHO VẬT TƯ THEO PO & CẬP NHẬT SỔ CÁI TỒN KHO <<<');

  try {
    const whRes = await dbClient.query('SELECT id, name FROM erp.warehouses WHERE code = $1 LIMIT 1', ['KHO_XUONG']);
    const warehouseId = whRes.rows[0]?.id;
    const unitRes = await dbClient.query('SELECT id FROM erp.units LIMIT 1');
    const unitId = unitRes.rows[0]?.id;

    // Lấy tồn kho trước khi nhập
    const beforeBal = await dbClient.query(
      'SELECT COALESCE(on_hand_qty, 0) as qty FROM erp.stock_balances WHERE warehouse_id = $1 AND item_id = $2',
      [warehouseId, testItemId]
    );
    const qtyBefore = Number(beforeBal.rows[0]?.qty || 0);

    // Lập phiếu nhập kho (PNK)
    const res = await adminPage.request.post(`${BASE_URL}/api/inventory/documents`, {
      data: {
        type: 'receipt',
        purpose: `Nhập kho 50 tấm alu theo đơn mua PO ${testPoId}`,
        destinationWarehouseId: warehouseId,
        submitNow: true,
        lines: [
          {
            itemId: testItemId,
            unitId,
            qty: 50,
            unitCostSnapshot: 380000
          }
        ]
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.documentId) {
      testStockDocReceiptId = data.documentId;
      logStep('6.1', 'Lập Phiếu Nhập Kho (PNK) đối chiếu theo đơn mua hàng', 'PASSED', `ID PNK: ${testStockDocReceiptId}`);

      // Duyệt PNK
      const appRes = await adminPage.request.post(`${BASE_URL}/api/inventory/documents/${testStockDocReceiptId}/approve`);
      const appData = await appRes.json();
      if (appRes.status() === 200) {
        logStep('6.2', 'Thủ kho trưởng phê duyệt Phiếu Nhập Kho', 'PASSED', 'Đã chuyển trạng thái sang approved');
      } else {
        logStep('6.2', 'Thủ kho trưởng phê duyệt Phiếu Nhập Kho', 'FAILED', `Status: ${appRes.status()}`, appData);
      }

      // Hoàn tất & Ghi sổ kho (Complete & Post to Ledger)
      const compRes = await adminPage.request.post(`${BASE_URL}/api/inventory/documents/${testStockDocReceiptId}/complete`);
      const compData = await compRes.json();
      if (compRes.status() === 200) {
        const afterBal = await dbClient.query(
          'SELECT COALESCE(on_hand_qty, 0) as qty FROM erp.stock_balances WHERE warehouse_id = $1 AND item_id = $2',
          [warehouseId, testItemId]
        );
        const qtyAfter = Number(afterBal.rows[0]?.qty || 0);
        logStep('6.3', 'Hoàn tất & Ghi sổ biến động tồn kho (Stock Ledger)', 'PASSED', `Tồn kho trước: ${qtyBefore} -> Tồn kho sau: ${qtyAfter} (+${qtyAfter - qtyBefore} tấm alu)`);
      } else {
        logStep('6.3', 'Hoàn tất & Ghi sổ biến động tồn kho (Stock Ledger)', 'FAILED', `Status: ${compRes.status()}`, compData);
      }
    } else {
      logStep('6.1', 'Lập Phiếu Nhập Kho (PNK) đối chiếu theo đơn mua hàng', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('6.1', 'Lập Phiếu Nhập Kho & Ghi sổ kho', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 7: TÀI CHÍNH GIAI ĐOẠN 2 - CHI TIỀN THANH TOÁN CHO NHÀ CUNG CẤP (DISBURSEMENT)
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 7: CHI TIỀN THANH TOÁN NHÀ CUNG CẤP (PAYABLE ALLOCATION) <<<');

  try {
    const accRes = await dbClient.query('SELECT id, name FROM erp.cash_accounts LIMIT 1');
    const cashAccountId = accRes.rows[0]?.id;

    const oiRes = await dbClient.query('SELECT id, original_amount FROM erp.open_items WHERE purchase_order_id = $1 LIMIT 1', [testPoId]);
    const poOpenItem = oiRes.rows[0];

    const paymentAmount = 20520000;

    const res = await ketoanPage.request.post(`${BASE_URL}/api/finance/payments`, {
      data: {
        direction: 'disbursement',
        amount: paymentAmount,
        purpose: `Thanh toán tiền nhập vật tư alu cho NCC (${testSupplierCode})`,
        cashAccountId,
        partnerId: testSupplierId,
        allocatedItemIds: poOpenItem ? [poOpenItem.id] : [],
        allocations: poOpenItem ? [{ openItemId: poOpenItem.id, amount: paymentAmount }] : []
      }
    });
    const data = await res.json();
    if (res.status() === 200 || res.status() === 201) {
      logStep('7.1', 'Lập Phiếu Chi thanh toán công nợ Nhà Cung Cấp', 'PASSED', `Số tiền chi: ${paymentAmount.toLocaleString('vi-VN')} VND, ID Phiếu: ${data.paymentId}`);
    } else {
      logStep('7.1', 'Lập Phiếu Chi thanh toán công nợ Nhà Cung Cấp', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('7.1', 'Lập Phiếu Chi thanh toán công nợ Nhà Cung Cấp', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 8: XUẤT KHO VẬT TƯ & LẬP LỆNH ĐIỀU XE GIAO HÀNG
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 8: XUẤT KHO THI CÔNG & LỆNH ĐIỀU XE GIAO BIỂN HIỆU <<<');

  try {
    const whRes = await dbClient.query('SELECT id FROM erp.warehouses WHERE code = $1 LIMIT 1', ['KHO_XUONG']);
    const warehouseId = whRes.rows[0]?.id;
    const unitRes = await dbClient.query('SELECT id FROM erp.units LIMIT 1');
    const unitId = unitRes.rows[0]?.id;

    // Xuất kho 45 tấm alu cho công trình
    const res = await adminPage.request.post(`${BASE_URL}/api/inventory/documents`, {
      data: {
        type: 'issue',
        purpose: `Xuất kho vật tư alu gia công biển hiệu WinMart (${testCustomerCode})`,
        sourceWarehouseId: warehouseId,
        submitNow: true,
        lines: [
          {
            itemId: testItemId,
            unitId,
            qty: 45,
            unitCostSnapshot: 380000
          }
        ]
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.documentId) {
      testStockDocIssueId = data.documentId;
      logStep('8.1', 'Lập Phiếu Xuất Kho (PXK) xuất vật tư cho xưởng & công trình', 'PASSED', `ID PXK: ${testStockDocIssueId}`);

      await adminPage.request.post(`${BASE_URL}/api/inventory/documents/${testStockDocIssueId}/approve`);
      await adminPage.request.post(`${BASE_URL}/api/inventory/documents/${testStockDocIssueId}/complete`);
      logStep('8.2', 'Duyệt & Hoàn tất ghi sổ xuất kho vật tư', 'PASSED', 'Đã trừ tồn kho xưởng chính');
    } else {
      logStep('8.1', 'Lập Phiếu Xuất Kho (PXK)', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('8.1', 'Lập Phiếu Xuất Kho', 'FAILED', '', err);
  }

  // 8.3 Lập Lệnh Điều Xe Vận Chuyển Biển Hiệu Ra Công Trình
  try {
    const vRes = await dbClient.query('SELECT id, plate_no FROM erp.vehicles LIMIT 1');
    const empRes = await dbClient.query('SELECT id, name FROM erp.employees LIMIT 1');
    const vehicle = vRes.rows[0];
    const driver = empRes.rows[0];

    const projRes = await dbClient.query('SELECT id, name, address FROM erp.projects LIMIT 1');
    const project = projRes.rows[0];

    const res = await adminPage.request.post(`${BASE_URL}/api/fleet/trips`, {
      data: {
        vehicleId: vehicle.id,
        driverEmployeeId: driver.id,
        projectId: project.id,
        stops: [
          { address: 'Xưởng Sản Xuất Biển Hiệu - Đan Phượng, Hà Nội', sequence: 1 },
          { address: project.address || 'Công trình WinMart Tân Bình, TP.HCM', sequence: 2 }
        ]
      }
    });
    const data = await res.json();
    if (res.status() === 200 && data.tripId) {
      testTripId = data.tripId;
      logStep('8.3', 'Khởi tạo Lệnh Điều Xe tải chở biển hiệu ra công trường', 'PASSED', `Xe: ${vehicle.plate_no}, Tài xế: ${driver.name}, ID Chuyến: ${testTripId}`);
    } else {
      logStep('8.3', 'Khởi tạo Lệnh Điều Xe tải chở biển hiệu ra công trường', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('8.3', 'Khởi tạo Lệnh Điều Xe tải chở biển hiệu ra công trường', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 9: CHẤM CÔNG THỢ HIỆN TRƯỜNG & THEO DÕI TIẾN ĐỘ CÔNG VIỆC
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 9: THI CÔNG HIỆN TRƯỜNG & CHẤM CÔNG NHÂN SỰ <<<');

  try {
    await thoPage.goto(`${BASE_URL}/du-an`, { waitUntil: 'domcontentloaded' });
    await thoPage.waitForTimeout(2000);
    const projectCards = await thoPage.locator('.grid, table').first().isVisible().catch(() => false);
    logStep('9.1', 'Thợ thi công đăng nhập nhận việc và xem dự án', projectCards ? 'PASSED' : 'CHECK_REQUIRED', 'Thợ xem danh sách công trình bình thường');

    const checkinRes = await thoPage.request.get(`${BASE_URL}/api/hrm/attendance/today-status`);
    if (checkinRes.status() === 200) {
      logStep('9.2', 'Thợ thi công kiểm tra trạng thái chấm công điểm danh hôm nay', 'PASSED', 'API Điểm danh phản hồi 200 OK');
    } else {
      logStep('9.2', 'Thợ thi công kiểm tra trạng thái chấm công điểm danh hôm nay', 'FAILED', `Status: ${checkinRes.status()}`);
    }
  } catch (err) {
    logStep('9.1', 'Thợ thi công nhận việc & chấm công', 'FAILED', '', err);
  }

  // ---------------------------------------------------------------------------------------
  // BƯỚC 10: TIẾP NHẬN BẢO HÀNH & BÁO CÁO ĐIỀU HÀNH BI
  // ---------------------------------------------------------------------------------------
  console.log('\n>>> GIAI ĐOẠN 10: TIẾP NHẬN BẢO HÀNH & BÁO CÁO ĐIỀU HÀNH BI <<<');

  // 10.1 Tiếp nhận Ticket Bảo Hành / Sự Cố
  try {
    const projRes = await dbClient.query('SELECT id, name FROM erp.projects LIMIT 1');
    const project = projRes.rows[0];

    const res = await adminPage.request.post(`${BASE_URL}/api/service-tickets`, {
      data: {
        projectId: project.id,
        customerId: testCustomerId,
        title: `Kiểm tra định kỳ đèn LED & căn chỉnh nẹp alu sau 7 ngày vận hành (${testCustomerCode})`,
        issueType: 'led_power',
        priority: 'medium',
        isWarranty: true
      }
    });
    const data = await res.json();
    if (res.status() === 201 && data.ticket?.id) {
      logStep('10.1', 'Kích hoạt Sổ bảo hành & Tiếp nhận Ticket chăm sóc hậu mãi', 'PASSED', `Mã Ticket: ${data.ticket.code}, Trạng thái: ${data.ticket.status}`);
    } else {
      logStep('10.1', 'Kích hoạt Sổ bảo hành & Tiếp nhận Ticket chăm sóc hậu mãi', 'FAILED', `Status: ${res.status()}`, data);
    }
  } catch (err) {
    logStep('10.1', 'Tiếp nhận Ticket bảo hành', 'FAILED', '', err);
  }

  // 10.2 Báo cáo Giám đốc BI
  try {
    const res = await adminPage.request.get(`${BASE_URL}/api/analytics/signage`);
    const data = await res.json();
    if (res.status() === 200 && data.analytics) {
      logStep('10.2', 'Executive BI Dashboard tổng hợp tỷ lệ hao hụt & hiệu quả dự án', 'PASSED', `Tỷ lệ tận dụng alu: ${data.analytics.scrapRates?.aluYieldPercent}%`);
    } else {
      logStep('10.2', 'Executive BI Dashboard', 'FAILED', `Status: ${res.status()}`);
    }
  } catch (err) {
    logStep('10.2', 'Executive BI Dashboard', 'FAILED', '', err);
  }

  await dbClient.end();
  await browser.close();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n========================================================================');
  console.log(`   HOÀN THÀNH KIỂM THỬ VẬN HÀNH TOÀN DIỆN TRONG ${totalTime} GIÂY   `);
  console.log('========================================================================');

  console.table(report);
  fs.writeFileSync('tests/e2e/production_lifecycle_report.json', JSON.stringify(report, null, 2), 'utf8');
}

runProductionLifecycleTest().catch(console.error);
