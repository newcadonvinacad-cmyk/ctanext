const test = require("node:test");
const assert = require("node:assert/strict");
const { productionDb } = require("./helpers/production-db.cjs");

test("Package F: Quotation revisions, persistent contracts, project documents, and sales order finance separation", async (t) => {
  const db = await productionDb();

  try {
    const { CrmService } = db.load("./src/services/crm.service.ts");
    const { ProjectService } = db.load("./src/services/project.service.ts");
    const pool = db.pool;
    const orgId = db.ctx.orgId;
    const userId = db.ctx.userId;

    // Create a customer partner
    const partnerRes = await pool.query(
      `INSERT INTO erp.partners (organization_id, code, name, phone, address, is_customer, created_by, updated_by)
       VALUES ($1, 'KH-F01', 'Công ty CEN Group', '0909123456', '123 Đường F, Q.1', true, $2, $2)
       RETURNING id`,
      [orgId, userId]
    );
    const customerId = partnerRes.rows[0].id;

    // Create a project
    const projectRes = await pool.query(
      `INSERT INTO erp.projects (organization_id, code, name, address, customer_id, manager_membership_id, status, created_by, updated_by)
       VALUES ($1, 'PRJ-CEN-01', 'Dự Án Chuỗi Biển Hiệu CEN', '123 Nguyễn Huệ, Q.1', $2, $3, 'production', $4, $4)
       RETURNING id, code, name`,
      [orgId, customerId, db.ctx.membershipId, userId]
    );
    const project = projectRes.rows[0];

    // Ensure a unit exists
    const unitRes = await pool.query(`SELECT id FROM erp.units LIMIT 1`);
    let unitId;
    if (unitRes.rows.length > 0) {
      unitId = unitRes.rows[0].id;
    } else {
      const uIns = await pool.query(
        `INSERT INTO erp.units (organization_id, code, name, dimension) VALUES ($1, 'CAI', 'Cái', 'unit') RETURNING id`,
        [orgId]
      );
      unitId = uIns.rows[0].id;
    }

    // Ensure an item exists
    const itemRes = await pool.query(`SELECT id FROM erp.items LIMIT 1`);
    let itemId;
    if (itemRes.rows.length > 0) {
      itemId = itemRes.rows[0].id;
    } else {
      const catRes = await pool.query(
        `INSERT INTO erp.item_categories (organization_id, code, name) VALUES ($1, 'SP', 'Sản phẩm') RETURNING id`,
        [orgId]
      );
      const catId = catRes.rows[0].id;
      const iIns = await pool.query(
        `INSERT INTO erp.items (organization_id, category_id, base_unit_id, code, name, kind) 
         VALUES ($1, $2, $3, 'SP-CEN-01', 'Biển quảng cáo CEN', 'product') RETURNING id`,
        [orgId, catId, unitId]
      );
      itemId = iIns.rows[0].id;
    }

    await t.test("F01: Quotation revisioning on update", async () => {
      // 1. Create a draft quotation
      const quotationId = await CrmService.createQuotation({
        customerId: customerId,
        lines: [
          {
            description: "Biển Alu Chữ Nổi CEN",
            qty: 10,
            unitPrice: 1500000,
            discountAmount: 0,
            taxRate: 0.1,
            unitId: unitId
          }
        ]
      }, userId);

      const qDetail1 = await CrmService.getQuotationDetail(quotationId);
      assert.equal(qDetail1.quotation.status, "draft");
      assert.equal(qDetail1.quotation.revisionNo, 1);
      assert.equal(Number(qDetail1.quotation.total), 16500000); // 15M + 10% tax = 16.5M

      // 2. Update while draft -> updates in place, revision stays 1
      await CrmService.updateQuotation(quotationId, {
        lines: [
          {
            description: "Biển Alu Chữ Nổi CEN v1.1",
            qty: 12,
            unitPrice: 1500000,
            taxRate: 0.1,
            unitId: unitId
          }
        ]
      }, userId);

      const qDetail2 = await CrmService.getQuotationDetail(quotationId);
      assert.equal(qDetail2.quotation.revisionNo, 1, "Draft update must maintain revision 1");
      assert.equal(Number(qDetail2.quotation.total), 19800000, "Total should reflect updated quantity 12*1.5M * 1.1 = 19.8M");

      // 3. Submit the quotation (transition to submitted)
      await pool.query(
        `UPDATE erp.quotations SET status = 'submitted' WHERE id = $1`,
        [quotationId]
      );

      // 4. Update while submitted -> MUST create new revision (revision 2) and leave revision 1 intact
      await CrmService.updateQuotation(quotationId, {
        lines: [
          {
            description: "Biển Alu Chữ Nổi CEN v2",
            qty: 15,
            unitPrice: 1400000,
            taxRate: 0.1,
            unitId: unitId
          }
        ]
      }, userId);

      const qDetail3 = await CrmService.getQuotationDetail(quotationId);
      assert.equal(qDetail3.quotation.revisionNo, 2, "Sent quotation update must create revision 2");
      assert.equal(Number(qDetail3.quotation.total), 23100000, "15 * 1.4M * 1.1 = 23.1M");

      // Verify revision 1 still exists in erp.quotation_revisions
      const rev1Check = await pool.query(
        `SELECT revision_no, total FROM erp.quotation_revisions 
         WHERE quotation_id = $1 AND revision_no = 1`,
        [quotationId]
      );
      assert.equal(rev1Check.rows.length, 1, "Revision 1 must be preserved");
      assert.equal(Number(rev1Check.rows[0].total), 19800000, "Revision 1 total must remain intact");
    });

    await t.test("F02: Project persistent custom documents", async () => {
      // 1. Save document
      const docData = {
        name: "Hồ Sơ Bản Vẽ Khảo Sát Hiện Trạng.pdf",
        type: "survey_drawing",
        fileUrl: "https://storage.example.com/files/survey-123.pdf",
        fileSize: 2048576,
        mimeType: "application/pdf",
        notes: "Bản vẽ đo đạc cửa hàng CEN số 28"
      };

      const savedDocId = await ProjectService.saveProjectDocument(project.id, docData, userId, "Test User");
      assert.ok(savedDocId, "Document must be persisted with an ID");

      // 2. List documents
      const docList = await ProjectService.listProjectDocuments(project.id);
      const found = docList.find(d => d.id === savedDocId);
      assert.ok(found, "Document must be retrievable from persistent storage");
      assert.equal(found.fileUrl, docData.fileUrl);
      assert.equal(found.name, docData.name);

      // 3. Delete document
      await ProjectService.deleteProjectDocument(project.id, savedDocId);

      const docListAfter = await ProjectService.listProjectDocuments(project.id);
      assert.ok(!docListAfter.find(d => d.id === savedDocId), "Document must be deleted");
    });

    await t.test("F03: Project persistent contract and milestones", async () => {
      const contractId = await CrmService.createProjectContract(project.id, {
        customerId: customerId,
        code: `HĐ-CEN-${Date.now()}`,
        contractValue: 150000000,
        signedOn: "2026-10-10",
        documentFileUrl: "https://storage.example.com/contracts/hd-cen.pdf",
        terms: { warranty: "24 tháng" },
        notes: "Hợp đồng dự án thi công CEN",
        status: "approved",
        milestones: [
          {
            name: "Đợt 1: Tạm ứng 30% khi ký hợp đồng",
            amount: 45000000,
            dueDate: "2026-10-15"
          },
          {
            name: "Đợt 2: Thanh toán 50% khi hoàn thành lắp đặt",
            amount: 75000000,
            dueDate: "2026-11-20"
          },
          {
            name: "Đợt 3: Thanh toán 20% quyết toán",
            amount: 30000000,
            dueDate: "2026-12-10"
          }
        ]
      }, userId);

      assert.ok(contractId, "Contract must be created");

      // List project contracts
      const contracts = await CrmService.listProjectContracts(project.id);
      const contract = contracts.find(c => c.id === contractId);
      assert.ok(contract, "Contract must be listed in project");
      assert.equal(Number(contract.contractValue), 150000000);
      assert.equal(contract.milestones.length, 3, "Must have 3 milestones");
    });

    await t.test("F04: Project sales order creation and finance separation", async () => {
      // 1. Create a sales order linked to this project
      const soId = await CrmService.createSalesOrder({
        customerId: customerId,
        projectId: project.id,
        lines: [
          {
            itemId: itemId,
            unitId: unitId,
            description: "Biển mặt tiền CEN 10x2m",
            qty: 2,
            unitPrice: 20000000,
            discountAmount: 0
          }
        ]
      }, userId);

      assert.ok(soId, "Sales order must be created");

      // Check sales order directly
      const soRes = await pool.query(
        `SELECT id, project_id, total FROM erp.sales_orders WHERE id = $1`,
        [soId]
      );
      assert.equal(soRes.rows[0].project_id, project.id, "Sales order must be linked to project");
      assert.equal(Number(soRes.rows[0].total), 40000000);

      // 2. Query project finance to verify contractsTotal and ordersTotal separation
      const finance = await ProjectService.getProjectFinancialSummary(project.id);

      assert.equal(Number(finance.contractsTotal), 150000000, "Contracts total must be 150M");
      assert.equal(Number(finance.ordersTotal), 40000000, "Orders total must be 40M");
      assert.equal(Number(finance.contractTotal), 150000000, "Primary contract total resolves to contractsTotal");
      assert.ok(finance.contracts && finance.contracts.length > 0, "Contracts array must be returned");
      assert.ok(finance.orders && finance.orders.length > 0, "Orders array must be returned");
    });

  } finally {
    await db.close();
  }
});
