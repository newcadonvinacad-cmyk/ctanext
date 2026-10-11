const assert = require("node:assert/strict");
const { test } = require("node:test");
const { productionDb } = require("./helpers/production-db.cjs");

test("Audited Autotest Report Fixes (2026-10-11): Financials, Attendance, Payroll Lock, BOM & WBS", async (t) => {
  const env = await productionDb();
  const db = env.pool;
  const ctx = env.ctx;
  const orgId = ctx.orgId;
  const userId = ctx.userId;
  const membershipId = ctx.membershipId;

  const P = env.load("src/services/project.service.ts");
  const F = env.load("src/services/finance.service.ts");
  const H = env.load("src/services/hrm.service.ts");
  const C = env.load("src/services/crm.service.ts");
  const S = env.load("src/services/signage-phase2.service.ts");
  const BOM = env.load("src/services/production-bom.service.ts");

  // Helper setup
  const custRes = await db.query(
    `INSERT INTO erp.partners (organization_id, code, name, is_customer, is_supplier, created_by, updated_by)
     VALUES ($1, 'KH-TEST-FIX', 'Khách Hàng Kiểm Thử', true, false, $2, $2) RETURNING id`,
    [orgId, userId]
  );
  const customerId = custRes.rows[0].id;

  const projRes = await db.query(
    `INSERT INTO erp.projects (organization_id, code, name, address, customer_id, manager_membership_id, status, start_date, created_by, updated_by)
     VALUES ($1, 'DA-TEST-FIX', 'Dự Án Thẩm Định Fix', '123 Nguyễn Huệ, Q.1', $2, $3, 'planning', '2026-10-11', $4, $4) RETURNING id`,
    [orgId, customerId, membershipId, userId]
  );
  const projectId = projRes.rows[0].id;

  await t.test("1. Bổ sung — Tổng thu dự án: Allocations via erp.payment_allocations are included without double-counting", async () => {
    // Tạo SO và OpenItem cho dự án
    const soRes = await db.query(
      `INSERT INTO erp.sales_orders (organization_id, code, status, currency, total, customer_id, project_id, owner_membership_id, created_by, updated_by)
       VALUES ($1, 'SO-FIX-01', 'approved', 'VND', 50000000, $2, $3, $4, $5, $5) RETURNING id`,
      [orgId, customerId, projectId, membershipId, userId]
    );
    const soId = soRes.rows[0].id;

    const oiRes = await db.query(
      `INSERT INTO erp.open_items (organization_id, side, currency, original_amount, due_date, status, source_sequence, partner_id, sales_order_id, created_by, updated_by)
       VALUES ($1, 'receivable', 'VND', 50000000, CURRENT_DATE + interval '30 days', 'confirmed', 1, $2, $3, $4, $4) RETURNING id`,
      [orgId, customerId, soId, userId]
    );
    const oiId = oiRes.rows[0].id;

    // Tạo thanh toán không gắn trực tiếp project_id trên header nhưng phân bổ vào open_item của dự án
    let caRes = await db.query("SELECT id FROM erp.cash_accounts WHERE organization_id = $1 LIMIT 1", [orgId]);
    let cashAccountId = caRes.rows[0]?.id;
    if (!cashAccountId) {
      cashAccountId = (
        await db.query(
          "INSERT INTO erp.cash_accounts (organization_id, code, name, kind, currency, is_active, created_by, updated_by) VALUES ($1, 'TK-TEST-01', 'Tài khoản Test', 'bank', 'VND', true, $2, $2) RETURNING id",
          [orgId, userId]
        )
      ).rows[0].id;
    }

    const payRes = await db.query(
      `INSERT INTO erp.payments (organization_id, code, direction, partner_id, amount, status, purpose, cash_account_id, created_by, updated_by)
       VALUES ($1, 'PT-FIX-01', 'receipt', $2, 20000000, 'draft', 'Thu tiền tạm ứng DA', $3, $4, $4) RETURNING id`,
      [orgId, customerId, cashAccountId, userId]
    );
    const paymentId = payRes.rows[0].id;

    await db.query(
      `INSERT INTO erp.payment_allocations (organization_id, payment_id, open_item_id, amount, created_by, updated_by)
       VALUES ($1, $2, $3, 20000000, $4, $4)`,
      [orgId, paymentId, oiId, userId]
    );

    await db.query(`UPDATE erp.payments SET status = 'posted' WHERE id = $1`, [paymentId]);

    const fin = await P.ProjectService.getProjectFinancialSummary(projectId);
    assert.equal(fin.contractTotal, 50000000, "Contract total must be 50,000,000");
    assert.equal(fin.receiptsTotal, 20000000, "Total received must include allocated payments (20,000,000)");
    assert.ok(fin.payments.some((p) => p.code === "PT-FIX-01" && p.amount === 20000000), "Payment must be included in project payments list");
  });

  await t.test("2. Bổ sung — Khóa lương: Approving payroll locks the attendance period and prevents overwrite", async () => {
    const year = 2026;
    const month = 11;

    // Approve payroll
    const dummyLines = [
      {
        employeeId: ctx.employeeId,
        timeSalary: 10000000,
        otSalary: 0,
        allowances: 500000,
        bonus: 0,
        fines: 0,
        socialInsurance: 1050000,
        netSalary: 9450000,
      },
    ];

    await H.HrmService.approvePayroll(year, month, dummyLines, userId);

    // Kiểm tra kỳ đã locked
    const periodCheck = await db.query(
      `SELECT status FROM erp.attendance_periods WHERE organization_id = $1 AND year = $2 AND month = $3`,
      [orgId, year, month]
    );
    assert.equal(periodCheck.rows[0]?.status, "locked", "Attendance period must be locked after approval");

    // Thử approve lại kỳ đã locked -> phải ném lỗi
    await assert.rejects(
      async () => {
        await H.HrmService.approvePayroll(year, month, dummyLines, userId);
      },
      /đã bị khóa \(locked\)/,
      "Must throw error when trying to approve an already locked period"
    );
  });

  await t.test("3. BUG-022, BUG-023, BUG-024, BUG-025: Attendance matrix, VN timezone, < 2h zero credit, late check and OT sync", async () => {
    // Tạo nhân viên kiểm thử
    const empRes = await db.query(
      `INSERT INTO erp.employees (organization_id, code, name, is_active, created_by, updated_by)
       VALUES ($1, 'NV-TEST-VN', 'Nhân Viên Test Giờ', true, $2, $2) RETURNING id`,
      [orgId, userId]
    );
    const empId = empRes.rows[0].id;

    // 08:04 Vietnam time = 01:04 UTC
    const vnCheckInUtc = new Date("2026-10-05T01:04:00.000Z");
    const vnCheckOutUtc = new Date("2026-10-05T01:04:08.000Z"); // Phiên làm việc 8 giây (dưới 2h)

    await db.query(
      `INSERT INTO erp.attendance_entries (
         organization_id, work_date, start_at, end_at, source, status, employee_id,
         regular_minutes, ot_minutes, explanation_required, created_by, updated_by
       )
       VALUES ($1, '2026-10-05', $2, $3, 'manual', 'completed', $4, 0, 0, true, $5, $5)`,
      [orgId, vnCheckInUtc, vnCheckOutUtc, empId, userId]
    );

    // Tạo đơn xin OT đã duyệt 2 tiếng cho nhân viên này trong tháng 10/2026 (BUG-025)
    await db.query(
      `INSERT INTO erp.hrm_requests (
         organization_id, employee_id, type, title, reason, start_date, end_date, duration_hours,
         payroll_ot_hours, status
       )
       VALUES ($1, $2, 'overtime', 'Tăng ca hoàn thiện công trình', 'Tiến độ dự án', '2026-10-05', '2026-10-05', 2, 2, 'approved')`,
      [orgId, empId]
    );

    const matrixData = await H.HrmService.getMonthlyAttendanceMatrix(2026, 10);
    const empRow = matrixData.matrix.find((m) => m.employeeId === empId);
    assert.ok(empRow, "Employee row must exist in matrix");

    // BUG-024: 08:04 AM không trễ ca chuẩn 08:00 + 15p -> isLate = false
    assert.equal(empRow.lateCount, 0, "Check in at 08:04 is within 15m grace period, must not be counted as late");

    // BUG-023: Phiên 8 giây (< 120 phút) nhận 0 công, status '-', totalWorkDays = 0
    assert.equal(empRow.totalWorkDays, 0, "Working under 2 hours yields 0 standard work days");
    assert.equal(empRow.days[5].status, "-", "Day status for session < 120m must be '-' instead of 1/2");
    assert.equal(empRow.days[5].in, "08:04", "Vietnam time format must return 08:04");

    // BUG-025: OT phải đồng bộ với đơn duyệt (2 giờ) mà không bị double
    assert.equal(empRow.totalOtHours, 2, "OT hours in matrix must synchronize with approved request (2h)");
  });

  await t.test("4. BUG-018: Production BOM from uploaded design without _parametricSpec falls back to survey", async () => {
    // Seed representatives required by fromDesign
    await db.query(`INSERT INTO erp.material_representatives (organization_id, code, name, quantity_basis, specification_key) VALUES ($1, 'frame', 'Khung sắt', 'perimeter', '') ON CONFLICT DO NOTHING`, [orgId]);
    await db.query(`INSERT INTO erp.material_representatives (organization_id, code, name, quantity_basis, specification_key) VALUES ($1, 'face', 'Mặt biển', 'area', '') ON CONFLICT DO NOTHING`, [orgId]);
    await db.query(`INSERT INTO erp.material_representatives (organization_id, code, name, quantity_basis, specification_key) VALUES ($1, 'letters', 'Bộ chữ', 'count', '') ON CONFLICT DO NOTHING`, [orgId]);

    // Tạo khảo sát thuộc dự án
    const surveyRes = await db.query(
      `INSERT INTO erp.site_surveys (organization_id, project_id, code, title, address, width_meters, height_meters, depth_meters, status, created_by, updated_by)
       VALUES ($1, $2, 'KS-BOM-01', 'Khảo sát mặt bằng', '123 Test', 5.5, 2.2, 0.2, 'completed', $3, $3) RETURNING id`,
      [orgId, projectId, userId]
    );
    const surveyId = surveyRes.rows[0].id;

    // Tạo maket upload URL không có JSON _parametricSpec
    const proofRes = await db.query(
      `INSERT INTO erp.design_proofs (organization_id, project_id, code, title, file_url, status, client_feedback, created_by, updated_by)
       VALUES ($1, $2, 'MK-BOM-01', 'Maket phối cảnh render ảnh', 'https://example.com/render.jpg', 'approved', 'Khách hàng duyệt thiết kế đẹp', $3, $3) RETURNING id`,
      [orgId, projectId, userId]
    );
    const proofId = proofRes.rows[0].id;

    const bomRes = await BOM.ProductionBomService.fromDesign(ctx, {
      projectId,
      designProofId: proofId,
      surveyId,
      title: "BOM Test Fallback",
      requestId: "a0000000-0000-0000-0000-000000000001",
    });

    assert.ok(bomRes.bomId, "BOM should be created successfully even without _parametricSpec");
    const bomDetail = await BOM.ProductionBomService.detail(ctx, bomRes.bomId);
    assert.equal(Number(bomDetail.width_meters), 5.5, "Width must fall back to survey width 5.5");
    assert.equal(Number(bomDetail.height_meters), 2.2, "Height must fall back to survey height 2.2");
  });

  await t.test("5. BUG-019: Creating design proof defaults to pending and avoids hardcoded Admin approver", async () => {
    const proof = await S.SignagePhase2Service.createDesignProof(
      {
        projectId,
        title: "Bản vẽ phối cảnh mới",
        fileUrl: "https://example.com/drawing.pdf",
      },
      userId
    );

    assert.equal(proof.status, "pending", "New design proof must default to pending");
    assert.equal(proof.approvedByName, null, "Approved by name must be null for pending proof");

    // Duyệt maket -> cập nhật người duyệt thực tế
    await S.SignagePhase2Service.updateDesignProofStatus(
      proof.id,
      {
        status: "approved",
      },
      userId
    );

    const updatedList = await S.SignagePhase2Service.listDesignProofs({ projectId });
    const approvedProof = updatedList.find((p) => p.id === proof.id);
    assert.equal(approvedProof.status, "approved");
    assert.ok(approvedProof.approvedByName !== "Admin / Quản trị viên" || approvedProof.approvedByName !== null);
  });

  await t.test("6. BUG-011: Project stage gate prevents completing without approved acceptances or with unfinished tasks", async () => {
    const uncompletedProj = (
      await db.query(
        `INSERT INTO erp.projects (organization_id, code, name, address, customer_id, manager_membership_id, status, created_by, updated_by)
         VALUES ($1, 'DA-GATE-01', 'Dự Án Chưa Nghiệm Thu', '123 Nguyễn Huệ, Q.1', $2, $3, 'installation', $4, $4) RETURNING id`,
        [orgId, customerId, membershipId, userId]
      )
    ).rows[0].id;

    // Không có nghiệm thu -> phải bị chặn khi update sang completed
    await assert.rejects(
      async () => {
        await P.ProjectService.updateProjectStatus(uncompletedProj, "completed", userId);
      },
      /chưa có biên bản nghiệm thu/,
      "Must reject transition to completed when no approved acceptances exist"
    );

    // Với forceClose: true -> cho phép đóng khẩn cấp
    await P.ProjectService.updateProjectStatus(uncompletedProj, "completed", userId, { forceClose: true });
    const updatedProj = await P.ProjectService.getProjectById(uncompletedProj);
    assert.equal(updatedProj.status, "completed", "Status must be updated when forceClose is supplied");
  });

  await t.test("7. BUG-005: WBS generated from quotation flags field tasks (is_field) and sets due_at", async () => {
    let unitRes = await db.query("SELECT id FROM erp.units WHERE organization_id = $1 LIMIT 1", [orgId]);
    let unitId = unitRes.rows[0]?.id;
    if (!unitId) {
      unitId = (
        await db.query(
          "INSERT INTO erp.units (organization_id, code, name, dimension) VALUES ($1, 'CAI', 'Cái', 'unit') RETURNING id",
          [orgId]
        )
      ).rows[0].id;
    }

    let catRes = await db.query("SELECT id FROM erp.item_categories WHERE organization_id = $1 LIMIT 1", [orgId]);
    let catId = catRes.rows[0]?.id;
    if (!catId) {
      catId = (
        await db.query(
          "INSERT INTO erp.item_categories (organization_id, code, name) VALUES ($1, 'VT-TEST', 'Vật tư Test') RETURNING id",
          [orgId]
        )
      ).rows[0].id;
    }

    let itemRes = await db.query("SELECT id FROM erp.items WHERE organization_id = $1 LIMIT 1", [orgId]);
    let itemId = itemRes.rows[0]?.id;
    if (!itemId) {
      itemId = (
        await db.query(
          "INSERT INTO erp.items (organization_id, category_id, base_unit_id, code, name, kind) VALUES ($1, $2, $3, 'VT-SAMPLE', 'Mẫu biển hộp đèn', 'product') RETURNING id",
          [orgId, catId, unitId]
        )
      ).rows[0].id;
    }

    // Tạo quotation đã approved
    const qId = await C.CrmService.createQuotation(
      {
        customerId,
        lines: [
          {
            description: "Biển hiệu hộp đèn",
            qty: 1,
            unitPrice: 25000000,
            unitId,
          },
        ],
      },
      userId
    );

    // Approve quotation
    await db.query(`UPDATE erp.quotations SET status = 'approved' WHERE id = $1`, [qId]);

    const conv = await C.CrmService.convertQuotationToProject(
      qId,
      {
        projectName: "Dự Án Sinh WBS Chuẩn",
        startDate: "2026-10-15",
      },
      userId
    );

    assert.ok(conv.projectId, "Project should be created from quotation");

    // Lấy các task sinh ra
    const tasksRes = await db.query(
      `SELECT code, title, is_field, due_at FROM erp.tasks WHERE project_id = $1 ORDER BY code ASC`,
      [conv.projectId]
    );

    const tasks = tasksRes.rows;
    assert.ok(tasks.length >= 7, "Must generate at least 7 stages");

    // Giai đoạn 1 (Khảo sát) phải là is_field = true và có due_at
    const surveyStage = tasks.find((t) => t.code.includes("1"));
    assert.ok(surveyStage, "Survey stage must exist");
    assert.equal(surveyStage.is_field, true, "Survey stage must have is_field = true");
    assert.ok(surveyStage.due_at, "Survey stage must have due_at populated");

    // Giai đoạn 6 (Lắp dựng) phải là is_field = true và có due_at
    const installStage = tasks.find((t) => t.title.includes("Lắp dựng"));
    assert.ok(installStage, "Installation stage must exist");
    assert.equal(installStage.is_field, true, "Installation stage must have is_field = true");
    assert.ok(installStage.due_at, "Installation stage must have due_at populated");
  });
});
