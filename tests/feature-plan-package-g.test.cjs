const test = require("node:test");
const assert = require("node:assert/strict");
const { productionDb } = require("./helpers/production-db.cjs");
const XLSX = require("xlsx");

test("Package G: BOM Print / Export (Workshop vs Internal) and Project Schedule Excel (CEN / QCNT)", async (t) => {
  const db = await productionDb();

  try {
    const { ProductionBomService } = db.load("./src/services/production-bom.service.ts");
    const { ProjectService } = db.load("./src/services/project.service.ts");
    const pool = db.pool;
    const orgId = db.ctx.orgId;
    const userId = db.ctx.userId;
    const membershipId = db.ctx.membershipId;
    const employeeId = db.ctx.employeeId;

    // Create a customer partner
    const partnerRes = await pool.query(
      `INSERT INTO erp.partners (organization_id, code, name, phone, address, is_customer, created_by, updated_by)
       VALUES ($1, 'KH-G01', 'Tập đoàn CEN & QCNT', '0912345678', 'Tòa nhà CEN, Q.3, TP.HCM', true, $2, $2)
       RETURNING id`,
      [orgId, userId]
    );
    const customerId = partnerRes.rows[0].id;

    // Create units
    const uM2 = (await pool.query(
      `INSERT INTO erp.units (organization_id, code, name, dimension) VALUES ($1, 'M2', 'm²', 'area') RETURNING id`,
      [orgId]
    )).rows[0].id;
    const uBo = (await pool.query(
      `INSERT INTO erp.units (organization_id, code, name, dimension) VALUES ($1, 'BO', 'Bộ', 'unit') RETURNING id`,
      [orgId]
    )).rows[0].id;
    const uGoi = (await pool.query(
      `INSERT INTO erp.units (organization_id, code, name, dimension) VALUES ($1, 'GOI', 'Gói', 'unit') RETURNING id`,
      [orgId]
    )).rows[0].id;

    // Create item category and items
    const catId = (await pool.query(
      `INSERT INTO erp.item_categories (organization_id, code, name) VALUES ($1, 'VT-QUANGCAO', 'Vật tư quảng cáo') RETURNING id`,
      [orgId]
    )).rows[0].id;

    const itemAlu = (await pool.query(
      `INSERT INTO erp.items (organization_id, category_id, base_unit_id, code, name, kind)
       VALUES ($1, $2, $3, 'VT-ALU-01', 'Tấm Alu Alcorest EV2002', 'material') RETURNING id`,
      [orgId, catId, uM2]
    )).rows[0].id;

    const itemLed = (await pool.query(
      `INSERT INTO erp.items (organization_id, category_id, base_unit_id, code, name, kind)
       VALUES ($1, $2, $3, 'VT-LED-03', 'LED Module 3 mắt Hàn Quốc', 'material') RETURNING id`,
      [orgId, catId, uBo]
    )).rows[0].id;

    // Seed quotation lines to supply item costs
    const qSeed = (await pool.query(
      `INSERT INTO erp.quotations (organization_id, code, status, customer_id, owner_membership_id, created_by, updated_by)
       VALUES ($1, 'BG-SEED-01', 'approved', $2, $3, $4, $4) RETURNING id`,
      [orgId, customerId, membershipId, userId]
    )).rows[0].id;
    const revSeed = (await pool.query(
      `INSERT INTO erp.quotation_revisions (organization_id, quotation_id, revision_no, valid_until, currency, subtotal, discount_amount, tax_amount, total, created_by, updated_by)
       VALUES ($1, $2, 1, '2026-12-31', 'VND', 470000, 0, 47000, 517000, $3, $3) RETURNING id`,
      [orgId, qSeed, userId]
    )).rows[0].id;
    await pool.query(
      `INSERT INTO erp.quotation_lines (organization_id, revision_id, line_no, description, qty, unit_price, line_total, item_id, unit_id, created_by, updated_by)
       VALUES 
       ($1, $2, 1, 'Tấm Alu Alcorest EV2002', 1, 350000, 350000, $3, $4, $5, $5),
       ($1, $2, 2, 'LED Module 3 mắt', 1, 120000, 120000, $6, $7, $5, $5)`,
      [orgId, revSeed, itemAlu, uM2, userId, itemLed, uBo]
    );

    // Create material representatives
    const repFrame = (await pool.query(
      `INSERT INTO erp.material_representatives (organization_id, code, name, quantity_basis, specification_key)
       VALUES ($1, 'frame', 'Khung sắt mạ kẽm', 'perimeter', '') RETURNING id`,
      [orgId]
    )).rows[0].id;

    const repFace = (await pool.query(
      `INSERT INTO erp.material_representatives (organization_id, code, name, quantity_basis, specification_key, default_item_id, default_unit_id)
       VALUES ($1, 'face', 'Mặt biển Alu', 'area', '', $2, $3) RETURNING id`,
      [orgId, itemAlu, uM2]
    )).rows[0].id;

    const repLed = (await pool.query(
      `INSERT INTO erp.material_representatives (organization_id, code, name, quantity_basis, specification_key, default_item_id, default_unit_id)
       VALUES ($1, 'lighting', 'Hệ thống LED chiếu sáng', 'manual', '', $2, $3) RETURNING id`,
      [orgId, itemLed, uBo]
    )).rows[0].id;

    // Create a base project for BOM
    const projBom = (await pool.query(
      `INSERT INTO erp.projects (organization_id, code, name, address, province, project_group, customer_id, manager_membership_id, status, created_by, updated_by)
       VALUES ($1, 'PRJ-BOM-01', 'Dự Án Sản Xuất Biển CEN Mẫu', '100 Nguyễn Văn Trỗi, TP.HCM', 'TP.HCM', 'CEN', $2, $3, 'production', $4, $4)
       RETURNING id, code, name`,
      [orgId, customerId, membershipId, userId]
    )).rows[0];

    // Create a BOM directly
    const bomRes = await pool.query(
      `INSERT INTO erp.project_boms (
         organization_id, code, title, project_id, signage_type, width_meters, height_meters, depth_meters, status, revision_no, created_by, updated_by
       )
       VALUES ($1, 'BOM-202610-0001', 'BOM Biển Hiệu Mặt Tiền CEN 6x2m', $2, 'alu_letters', 6.0, 2.0, 0.2, 'draft', 1, $3, $3)
       RETURNING id, code`,
      [orgId, projBom.id, userId]
    );
    const bomId = bomRes.rows[0].id;

    // Add BOM lines
    await pool.query(
      `INSERT INTO erp.project_bom_lines (
         organization_id, bom_id, line_no, representative_id, description, quantity, item_id, unit_id, waste_rate, notes
       )
       VALUES 
       ($1, $2, 1, $3, 'Khung sắt hộp mạ kẽm 25x25', 16.0, null, null, 5.0, 'Khung chính và giằng xương'),
       ($1, $2, 2, $4, 'Mặt biển Alu ngoài trời 3mm', 12.0, $5, $6, 10.0, 'Alu Alcorest EV2002 ghi bạc'),
       ($1, $2, 3, $7, 'Hệ thống LED hắt sáng chữ', 1.0, $8, $9, 0.0, 'Module 3 mắt ánh sáng trắng 6500K')`,
      [orgId, bomId, repFrame, repFace, itemAlu, uM2, repLed, itemLed, uBo]
    );

    // ==========================================
    // TEST 1: BOM REPORT & PRINTING
    // ==========================================
    await t.test("G01: BOM Workshop Report hides costs, Internal Report includes costs", async () => {
      // 1. Workshop target (Bản cấp xưởng / kho) -> MUST NOT expose unitCost, totalCost, totalEstimatedCost
      const workshopReport = await ProductionBomService.getBomReport(db.ctx, bomId, { target: "workshop" });
      assert.equal(workshopReport.target, "workshop");
      assert.equal(workshopReport.showCost, false, "Cost must be hidden for workshop target");
      assert.equal(workshopReport.summary.totalEstimatedCost, undefined, "totalEstimatedCost must be undefined in workshop report");

      for (const line of workshopReport.lines) {
        assert.equal(line.unitCost, undefined, "unitCost must not be exposed in workshop report");
        assert.equal(line.totalCost, undefined, "totalCost must not be exposed in workshop report");
        assert.ok(line.netQuantity > 0, "netQuantity must be calculated");
      }

      // Check waste calculation on Alu line: 12m2 with 10% waste = 13.2m2
      const aluLine = workshopReport.lines.find(l => l.lineNo === 2);
      assert.equal(aluLine.quantity, 12);
      assert.equal(aluLine.wasteRate, 10);
      assert.equal(aluLine.netQuantity, 13.2, "12m2 * 1.10 = 13.2m2");

      // Generate HTML for workshop print
      const workshopHtml = ProductionBomService.generateBomPrintHtml(workshopReport);
      assert.ok(workshopHtml.includes("BẢNG BÓC TÁCH VẬT TƯ SẢN XUẤT (CẤP XƯỞNG / KHO)"), "Must have workshop title");
      assert.ok(workshopHtml.includes("Cấp xưởng (Ẩn giá vốn)"), "Must have workshop badge");
      assert.ok(!workshopHtml.includes("Đơn giá vốn"), "Workshop print must NOT contain cost column header");
      assert.ok(!workshopHtml.includes("TỔNG GIÁ VỐN DỰ TOÁN"), "Workshop print must NOT contain total cost summary");

      // 2. Internal target (Bản dự toán nội bộ) -> MUST include costs when authorized
      await assert.rejects(
        ProductionBomService.getBomReport(db.ctx, bomId, { target: "internal" }),
        error => error.status === 403,
        "Internal costs must be denied without cost permission"
      );
      db.ctx.capabilities["item.cost_read"] = { permission: "item.cost_read", scope: "ORG", isEnabled: true, amountLimit: null };
      const internalReport = await ProductionBomService.getBomReport(db.ctx, bomId, { target: "internal" });
      assert.equal(internalReport.target, "internal");
      assert.equal(internalReport.showCost, true, "Cost must be shown for internal report with permissions");
      assert.ok(internalReport.summary.totalEstimatedCost > 0, "Total estimated cost must be calculated");

      // Verify Alu cost: 13.2 m2 * 350,000 = 4,620,000 đ
      const internalAlu = internalReport.lines.find(l => l.lineNo === 2);
      assert.equal(internalAlu.unitCost, 350000);
      assert.equal(internalAlu.totalCost, 4620000);

      // Generate HTML for internal print
      const internalHtml = ProductionBomService.generateBomPrintHtml(internalReport);
      assert.ok(internalHtml.includes("BẢNG DỰ TOÁN BÓC TÁCH KỸ THUẬT NỘI BỘ"), "Must have internal title");
      assert.ok(internalHtml.includes("Đơn giá vốn"), "Internal print must contain cost column header");
      assert.ok(internalHtml.includes("TỔNG GIÁ VỐN DỰ TOÁN"), "Internal print must contain total cost summary");
    });

    // ==========================================
    // TEST 2: PROJECT SCHEDULE EXCEL EXPORT (CEN / QCNT)
    // ==========================================
    await t.test("G02: Project Schedule Excel export complies with CEN/QCNT format and deduplication rules", async () => {
      // Create 3 projects:
      // Site 1 has both CEN and QCNT in the period (should be merged into 1 row on DS TỔNG HỢP)
      const p1 = (await pool.query(
        `INSERT INTO erp.projects (
           organization_id, code, name, address, province, project_group, customer_id, manager_membership_id, status, actual_completion_date, created_by, updated_by
         )
         VALUES ($1, 'PRJ-CEN-AG-01', 'Đại lý CEN An Giang', '123 Đường Trần Hưng Đạo, TP. Long Xuyên, Tỉnh An Giang', 'An Giang', 'CEN', $2, $3, 'completed', '2026-09-29', $4, $4)
         RETURNING id`,
        [orgId, customerId, membershipId, userId]
      )).rows[0].id;

      const p2 = (await pool.query(
        `INSERT INTO erp.projects (
           organization_id, code, name, address, province, project_group, customer_id, manager_membership_id, status, actual_completion_date, created_by, updated_by
         )
         VALUES ($1, 'PRJ-QCNT-AG-02', 'Đại lý QCNT An Giang', '123 Đường Trần Hưng Đạo, TP. Long Xuyên, Tỉnh An Giang', 'An Giang', 'QCNT', $2, $3, 'completed', '2026-09-30', $4, $4)
         RETURNING id`,
        [orgId, customerId, membershipId, userId]
      )).rows[0].id;

      // Site 2: Independent CEN store in Cần Thơ
      const p3 = (await pool.query(
        `INSERT INTO erp.projects (
           organization_id, code, name, address, province, project_group, customer_id, manager_membership_id, status, actual_completion_date, created_by, updated_by
         )
         VALUES ($1, 'PRJ-CEN-CT-03', 'Cửa hàng CEN Cần Thơ', '456 Đường 30 Tháng 4, Q. Ninh Kiều, TP. Cần Thơ', 'Cần Thơ', 'CEN', $2, $3, 'completed', '2026-09-28', $4, $4)
         RETURNING id`,
        [orgId, customerId, membershipId, userId]
      )).rows[0].id;

      // Create sales orders / items for p1 (CEN An Giang):
      // Line 1: Area signboard 6.5m x 1.8m
      const so1 = (await pool.query(
        `INSERT INTO erp.sales_orders (organization_id, project_id, code, customer_id, owner_membership_id, total, created_by, updated_by)
         VALUES ($1, $2, 'SO-AG-01', $3, $4, 25000000, $5, $5) RETURNING id`,
        [orgId, p1, customerId, membershipId, userId]
      )).rows[0].id;

      await pool.query(
        `INSERT INTO erp.sales_order_lines (organization_id, sales_order_id, line_no, item_id, unit_id, description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by)
         VALUES 
         ($1, $2, 1, $3, $4, 'Biển mặt tiền Alu chữ nổi 6.5x1.8m', 1, 18000000, 18000000, 1.0, $5, $5),
         ($1, $2, 2, $6, $7, 'Biển vẫy hộp đèn mica hút nổi 2 mặt 0.6x0.6m', 2, 2500000, 5000000, 1.0, $5, $5),
         ($1, $2, 3, $6, $8, 'Thi công lắp đặt và căn chỉnh tại điểm', 1, 2000000, 2000000, 1.0, $5, $5)`,
        [orgId, so1, itemAlu, uM2, userId, itemLed, uBo, uGoi]
      );

      // Create sales orders / items for p2 (QCNT An Giang):
      const so2 = (await pool.query(
        `INSERT INTO erp.sales_orders (organization_id, project_id, code, customer_id, owner_membership_id, total, created_by, updated_by)
         VALUES ($1, $2, 'SO-AG-02', $3, $4, 15000000, $5, $5) RETURNING id`,
        [orgId, p2, customerId, membershipId, userId]
      )).rows[0].id;

      await pool.query(
        `INSERT INTO erp.sales_order_lines (organization_id, sales_order_id, line_no, item_id, unit_id, description, qty, unit_price, line_total, factor_snapshot, created_by, updated_by)
         VALUES ($1, $2, 1, $3, $4, 'Bộ vách logo quảng cáo quầy lễ tân QCNT 3x1.5m', 1, 15000000, 15000000, 1.0, $5, $5)`,
        [orgId, so2, itemAlu, uM2, userId]
      );

      // Create site survey record for An Giang site
      await pool.query(
        `INSERT INTO erp.site_surveys (
           organization_id, code, project_id, customer_id, title, address, survey_date, surveyor_employee_id, status, width_meters, height_meters, depth_meters, notes, created_by, updated_by
         )
         VALUES ($1, 'KS-AG-01', $2, $3, 'Khảo sát hiện trạng mặt tiền An Giang', '123 Đường Trần Hưng Đạo, TP. Long Xuyên, Tỉnh An Giang', '2026-09-20', $4, 'completed', 6.5, 1.8, 0.25, 'Vỉa hè rộng 4m, dây nguồn kéo sẵn góc trên bên trái', $5, $5)`,
        [orgId, p1, customerId, employeeId, userId]
      );

      // 3. Export Schedule to Excel
      const excelBuffer = await ProjectService.exportProjectScheduleExcel({
        periodKey: "Tuần 4.9 (28-30.T9.2026)",
        projectIds: [p1, p2, p3],
        group: "ALL",
        includeSummary: true,
        includeDetail: true,
        includeSurvey: true,
      });

      assert.ok(excelBuffer && excelBuffer.length > 0, "Excel buffer must be generated");

      // 4. Parse Workbook and verify sheets and structure
      const wb = XLSX.read(excelBuffer, { type: "buffer" });
      assert.deepEqual(wb.SheetNames, ["DS TỔNG HỢP", "DS CHI TIẾT", "DS KHẢO SÁT"]);

      // Verify Sheet 1: DS TỔNG HỢP
      const wsSummary = wb.Sheets["DS TỔNG HỢP"];
      const summaryData = XLSX.utils.sheet_to_json(wsSummary, { header: 1 });
      
      // Title row
      assert.ok(summaryData[0][0].includes("BẢNG TỔNG HỢP TIẾN ĐỘ THI CÔNG CÔNG TRÌNH"));
      
      // Column headers at row index 3
      const headers = summaryData[3];
      assert.equal(headers[0], "STT");
      assert.equal(headers[1], "Tên đại lý / Cửa hàng / Công trình");
      assert.equal(headers[2], "Tỉnh / Khu vực");
      assert.equal(headers[3], "Ngày hoàn thành");
      assert.equal(headers[4], "Nhân sự / Đội thi công");
      assert.equal(headers[5], "Tuần / Kỳ");
      assert.equal(headers[6], "Nhóm");

      // Rows data starts at row index 4
      const siteRows = summaryData.slice(4);
      // Because p1 (CEN) and p2 (QCNT) share the same normalized site "Đại lý An Giang", they MUST be merged into 1 row!
      // Total site rows on DS TỔNG HỢP must be 2: An Giang and Cần Thơ!
      assert.equal(siteRows.length, 2, "An Giang CEN & QCNT must be merged into 1 row, plus Cần Thơ = 2 site rows");

      const agRow = siteRows.find(r => String(r[1]).includes("An Giang"));
      assert.ok(agRow, "An Giang site must exist in summary");
      assert.equal(agRow[6], "CEN & QCNT", "Merged site group must be 'CEN & QCNT'");
      assert.equal(agRow[2], "An Giang", "Province must be An Giang");

      const ctRow = siteRows.find(r => String(r[1]).includes("Cần Thơ"));
      assert.ok(ctRow, "Cần Thơ site must exist in summary");
      assert.equal(ctRow[6], "CEN", "Cần Thơ site group must be 'CEN'");

      // Verify Sheet 2: DS CHI TIẾT
      const wsDetail = wb.Sheets["DS CHI TIẾT"];
      const detailData = XLSX.utils.sheet_to_json(wsDetail, { header: 1 });
      const detailRows = detailData.slice(4);

      // Verify area calculation for "Biển mặt tiền Alu chữ nổi 6.5x1.8m":
      // width = 6.5, height = 1.8, qty = 1 -> volume = 6.5 * 1.8 = 11.7
      const aluDetailRow = detailRows.find(r => String(r[5]).includes("Biển mặt tiền Alu"));
      assert.ok(aluDetailRow, "Alu signboard must exist in detail");
      assert.equal(aluDetailRow[6], 6.5, "Width must be 6.5");
      assert.equal(aluDetailRow[7], 1.8, "Height must be 1.8");
      assert.equal(aluDetailRow[8], 1, "Quantity must be 1");
      assert.equal(aluDetailRow[10], 11.7, "Volume must be 6.5 * 1.8 * 1 = 11.7 m²");

      // Verify piece item "Biển vẫy hộp đèn mica hút nổi 2 mặt": qty = 2, unit = 'Bộ' -> volume = 2
      const pieceDetailRow = detailRows.find(r => String(r[5]).includes("Biển vẫy"));
      assert.ok(pieceDetailRow, "Piece signboard must exist in detail");
      assert.equal(pieceDetailRow[8], 2, "Quantity must be 2");
      assert.equal(pieceDetailRow[10], 2, "Volume must equal quantity for unit 'Bộ'");

      // Verify service item "Thi công lắp đặt": qty = 1, unit = 'Gói' -> volume = 1
      const serviceDetailRow = detailRows.find(r => String(r[5]).includes("Thi công lắp đặt"));
      assert.ok(serviceDetailRow, "Service line must exist in detail");
      assert.equal(serviceDetailRow[10], 1, "Service line volume must equal quantity 1");

      // Verify Sheet 3: DS KHẢO SÁT
      const wsSurvey = wb.Sheets["DS KHẢO SÁT"];
      const surveyData = XLSX.utils.sheet_to_json(wsSurvey, { header: 1 });
      const surveyRows = surveyData.slice(4);
      assert.ok(surveyRows.length >= 1, "Must contain survey row");

      const agSurvey = surveyRows.find(r => String(r[2]).includes("An Giang"));
      assert.ok(agSurvey, "An Giang survey must exist");
      assert.ok(String(agSurvey[6]).includes("6.5m x 1.8m x 0.25m"), "Survey dimensions must be 6.5m x 1.8m x 0.25m");
      assert.ok(String(agSurvey[8]).includes("Vỉa hè rộng 4m"), "Survey notes must be preserved");
    });

  } finally {
    await db.close();
  }
});
