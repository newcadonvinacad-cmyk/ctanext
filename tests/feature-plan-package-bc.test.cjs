const assert = require("node:assert/strict");
const { test } = require("node:test");
const { productionDb } = require("./helpers/production-db.cjs");

test("Package B & C: Stock Document Approval Workflow, Locations, Quick-Create & Receivers", async (t) => {
  const env = await productionDb();
  const db = env.pool;
  const ctx = env.ctx;
  const I = env.load("src/services/inventory.service.ts");
  const Auth = env.load("src/services/authorization.service.ts");

  await t.test("1. Location Management: create and list warehouse locations with uniqueness", async () => {
    // Create warehouse
    const whRes = await db.query(
      `INSERT INTO erp.warehouses(organization_id, code, name, kind, is_active, created_by, updated_by)
       VALUES($1, 'WH-MAIN', 'Kho Vật Tư Chính', 'workshop', true, $2, $2)
       RETURNING id`,
      [ctx.orgId, ctx.userId]
    );
    const whId = whRes.rows[0].id;

    // Create location
    const loc1 = await I.InventoryService.createWarehouseLocation(
      whId,
      {
        code: "KHE-A-01",
        name: "Kệ A - Tầng 1 - Hộc 1",
        zone: "Khu A",
        aisle: "Lối 1",
        rack: "Kệ A",
        shelf: "Tầng 1",
        bin: "Hộc 1",
        description: "Chuyên để nhôm định hình",
      },
      ctx.userId
    );
    assert.equal(loc1.code, "KHE-A-01");
    assert.equal(loc1.zone, "Khu A");

    // List locations
    const list = await I.InventoryService.listWarehouseLocations(whId);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, loc1.id);

    // Uniqueness constraint per warehouse
    await assert.rejects(
      I.InventoryService.createWarehouseLocation(
        whId,
        { code: "KHE-A-01", name: "Trùng mã kệ" },
        ctx.userId
      ),
      /uq_warehouse_location_code|duplicate key/i
    );
  });

  await t.test("2. Fast Material Item Creation: quickCreateMaterialItem without premature balance", async () => {
    const item = await I.InventoryService.quickCreateMaterialItem(
      {
        name: "Đèn LED module 3 bóng 1.2W phát sinh",
        specification: { voltage: "12V", color: "Warm White" },
      },
      ctx.userId
    );
    assert.ok(item.id);
    assert.ok(item.code.startsWith("VTPS-"));
    assert.equal(item.name, "Đèn LED module 3 bóng 1.2W phát sinh");

    // Verify item in DB
    const dbItem = (await db.query("SELECT * FROM erp.items WHERE id = $1", [item.id])).rows[0];
    assert.ok(dbItem);

    // Verify NO balance created
    const balCount = (await db.query("SELECT COUNT(*) as count FROM erp.stock_balances WHERE item_id = $1", [item.id])).rows[0].count;
    assert.equal(parseInt(balCount, 10), 0, "Quick create must not create fake inventory balance");

    // Verify standard lot created
    const lotRes = (await db.query("SELECT * FROM erp.stock_lots WHERE item_id = $1 AND kind = 'standard'", [item.id])).rows[0];
    assert.ok(lotRes, "Standard lot should be created");
  });

  await t.test("3. Approval Workflow: draft -> submit -> approve -> complete with self-approval check", async () => {
    // Create warehouse and item
    const whRes = await db.query(
      `INSERT INTO erp.warehouses(organization_id, code, name, kind, is_active, created_by, updated_by)
       VALUES($1, 'WH-TEST-2', 'Kho Thử Nghiệm 2', 'workshop', true, $2, $2)
       RETURNING id`,
      [ctx.orgId, ctx.userId]
    );
    const whId = whRes.rows[0].id;

    const locRes = await I.InventoryService.createWarehouseLocation(
      whId,
      { code: "LOC-B-01", name: "Vị trí B1" },
      ctx.userId
    );

    const item = await I.InventoryService.quickCreateMaterialItem(
      { name: "Vật tư thử nghiệm quy trình duyệt" },
      ctx.userId
    );

    // Create regular user (staff) who is NOT super admin
    const staffUser = "staff-user-" + Date.now();
    await db.query(
      `INSERT INTO public."user"(id, name, email, "createdAt", "updatedAt")
       VALUES($1, 'Staff User', 'staff@example.invalid', now(), now())`,
      [staffUser]
    );
    const staffMembership = (
      await db.query(
        "INSERT INTO erp.memberships(organization_id, user_id) VALUES($1, $2) RETURNING id",
        [ctx.orgId, staffUser]
      )
    ).rows[0].id;
    await db.query(
      "INSERT INTO erp.employees(organization_id, code, name, membership_id) VALUES($1, 'STAFF-1', 'Staff User', $2)",
      [ctx.orgId, staffMembership]
    );

    // Staff creates a draft document
    const docId = await I.InventoryService.createDocument(
      {
        type: "receipt",
        purpose: "Nhập kho thử nghiệm",
        destinationWarehouseId: whId,
        receiverName: "Nguyễn Văn Thợ",
        receiverType: "internal",
        receiverPhone: "0901234567",
        receivedAt: new Date().toISOString(),
        submitNow: false, // DRAFT
        lines: [
          {
            itemId: item.id,
            qty: 50,
            unitCostSnapshot: 15000,
            locationId: locRes.id,
            locationName: locRes.name,
          },
        ],
      },
      staffUser
    );

    // Check detail
    const detail = await I.InventoryService.getDocumentDetail(docId);
    assert.equal(detail.document.status, "draft");
    assert.equal(detail.document.receiverName, "Nguyễn Văn Thợ");
    assert.equal(detail.document.receiverType, "internal");
    assert.equal(detail.document.receiverPhone, "0901234567");
    assert.equal(detail.lines[0].locationId, locRes.id);
    assert.equal(detail.lines[0].locationName, "Vị trí B1");

    // Cannot approve draft directly
    await assert.rejects(
      I.InventoryService.approveDocument(docId, ctx.userId),
      /Chỉ có thể duyệt phiếu ở trạng thái 'Chờ duyệt'/i
    );

    // Staff submits document
    await I.InventoryService.submitDocument(docId, staffUser);
    const submittedDetail = await I.InventoryService.getDocumentDetail(docId);
    assert.equal(submittedDetail.document.status, "submitted");

    // Self-approval prevention: Staff user attempts to approve their own document
    await assert.rejects(
      I.InventoryService.approveDocument(docId, staffUser),
      /Người tạo phiếu không được tự duyệt/i
    );

    // Reject flow test: Manager rejects document
    await I.InventoryService.rejectDocument(docId, ctx.userId, "Sai quy cách đóng gói");
    const rejectedDetail = await I.InventoryService.getDocumentDetail(docId);
    assert.equal(rejectedDetail.document.status, "rejected");
    assert.match(rejectedDetail.document.reason, /Sai quy cách đóng gói/);

    // Test Return flow on a new document
    const doc2Id = await I.InventoryService.createDocument(
      {
        type: "receipt",
        purpose: "Nhập kho đợt 2",
        destinationWarehouseId: whId,
        submitNow: true,
        lines: [{ itemId: item.id, qty: 10, unitCostSnapshot: 15000 }],
      },
      staffUser
    );
    assert.equal((await I.InventoryService.getDocumentDetail(doc2Id)).document.status, "submitted");

    await I.InventoryService.returnDocument(doc2Id, ctx.userId, "Cần bổ sung chứng chỉ xuất xưởng");
    const returnedDetail = await I.InventoryService.getDocumentDetail(doc2Id);
    assert.equal(returnedDetail.document.status, "draft");
    assert.match(returnedDetail.document.reason, /Cần bổ sung chứng chỉ xuất xưởng/);

    // Re-submit and approve by manager
    await I.InventoryService.submitDocument(doc2Id, staffUser);
    await I.InventoryService.approveDocument(doc2Id, ctx.userId);
    const approvedDetail = await I.InventoryService.getDocumentDetail(doc2Id);
    assert.equal(approvedDetail.document.status, "approved");

    // Complete document
    await I.InventoryService.completeDocument(doc2Id, ctx.userId);
    const completedDetail = await I.InventoryService.getDocumentDetail(doc2Id);
    assert.equal(completedDetail.document.status, "completed");

    // Verify stock balance updated
    const bal = (
      await db.query(
        "SELECT on_hand_qty FROM erp.stock_balances WHERE warehouse_id = $1 AND item_id = $2",
        [whId, item.id]
      )
    ).rows[0];
    assert.equal(Number(bal.on_hand_qty), 10);
  });

  await env.close();
});
