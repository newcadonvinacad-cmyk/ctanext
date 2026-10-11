const assert = require('node:assert');
const { productionDb } = require('./helpers/production-db.cjs');
const { fixture } = require('./helpers/production-fixture.cjs');

async function testProjectStockIssueFlow() {
  const db = await productionDb();
  const f = await fixture(db);
  const { pool, ctx, load } = db;
  const { orgId, userId } = ctx;

  const InventoryService = load('src/services/inventory.service.ts').InventoryService;
  const ProjectService = load('src/services/project.service.ts').ProjectService;

  // 1. Tạo phiếu xuất kho NVL gắn với project
  const docId = await InventoryService.createDocument(
    {
      type: 'issue',
      purpose: 'Xuất NVL sản xuất biển hiệu TEST (Bóc tách KS-001)',
      sourceWarehouseId: f.warehouse,
      projectId: f.project,
      submitNow: true,
      lines: [
        {
          itemId: f.raw,
          qty: 15,
          unitId: f.rawUnit,
          unitCostSnapshot: 145000,
        },
      ],
    },
    userId
  );

  assert.ok(docId, 'Phải tạo thành công documentId');

  // 2. Kiểm tra stock_documents
  const docRow = (await pool.query('SELECT * FROM erp.stock_documents WHERE id = $1', [docId])).rows[0];
  assert.strictEqual(docRow.type, 'issue');
  assert.strictEqual(docRow.status, 'submitted');
  assert.strictEqual(docRow.project_id, f.project);
  assert.strictEqual(docRow.source_warehouse_id, f.warehouse);

  // 3. Kiểm tra stock_document_lines
  const lineRows = (await pool.query('SELECT * FROM erp.stock_document_lines WHERE document_id = $1', [docId])).rows;
  assert.strictEqual(lineRows.length, 1);
  assert.strictEqual(lineRows[0].item_id, f.raw);
  assert.strictEqual(Number(lineRows[0].qty), 15);
  assert.strictEqual(Number(lineRows[0].unit_cost_snapshot), 145000);

  // 4. Kiểm tra ProjectService.getProjectMaterials lấy được phiếu kho vừa tạo
  const materialsData = await ProjectService.getProjectMaterials(f.project);

  assert.ok(Array.isArray(materialsData.documents));
  const createdInProject = materialsData.documents.find((d) => d.id === docId);
  assert.ok(createdInProject, 'Phiếu kho phải xuất hiện trong ProjectService.getProjectMaterials');
  assert.strictEqual(createdInProject.type, 'issue');
  assert.strictEqual(createdInProject.status, 'submitted');

  console.log('PASS: project stock issues 1-click takeoff and material issue note');
  await db.close();
}

testProjectStockIssueFlow()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
