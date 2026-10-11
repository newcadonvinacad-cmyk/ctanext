const assert = require('node:assert/strict');
const { productionDb } = require('./helpers/production-db.cjs');
const { fixture } = require('./helpers/production-fixture.cjs');

async function testSurveyCascadeDelete() {
  const db = await productionDb();
  const f = await fixture(db);
  const { pool, ctx, load } = db;
  const { orgId, userId } = ctx;

  const SignagePhase2Service = load('src/services/signage-phase2.service.ts').SignagePhase2Service;

  // 1. Dùng f.survey và f.project đã có từ fixture
  const surveyId = f.survey;
  const projectId = f.project;

  // 2. Thêm các hạng mục con vào site_survey_items
  const itemRes = await pool.query(
    `INSERT INTO erp.site_survey_items (organization_id, survey_id, item_title, quantity, width_meters, height_meters, created_at, updated_at)
     VALUES ($1, $2, 'Biển hiệu mặt tiền test', 1, 6.0, 2.38, now(), now())
     RETURNING id`,
    [orgId, surveyId]
  );
  const surveyItemId = itemRes.rows[0].id;

  // 3. Liên kết survey_item_id vào f.bom
  await pool.query(
    `UPDATE erp.project_boms SET survey_id = $1, survey_item_id = $2 WHERE id = $3`,
    [surveyId, surveyItemId, f.bom]
  );

  // 4. Thực hiện xóa phiếu khảo sát thông qua SignagePhase2Service.deleteSiteSurvey
  const deleteResult = await SignagePhase2Service.deleteSiteSurvey(surveyId, userId);
  assert.equal(deleteResult, true, 'deleteSiteSurvey phải trả về true');

  // 5. Kiểm tra phiếu khảo sát đã bị xóa khỏi CSDL
  const checkSurvey = await pool.query('SELECT * FROM erp.site_surveys WHERE id = $1', [surveyId]);
  assert.equal(checkSurvey.rows.length, 0, 'Phiếu khảo sát phải không còn trong CSDL');

  // 6. Kiểm tra các hạng mục con trong site_survey_items đã bị xóa (CASCADE)
  const checkItems = await pool.query('SELECT * FROM erp.site_survey_items WHERE survey_id = $1', [surveyId]);
  assert.equal(checkItems.rows.length, 0, 'Các hạng mục khảo sát con phải bị xóa cascade');

  // 7. Kiểm tra BOM vẫn còn và survey_id, survey_item_id đã được gỡ liên kết an toàn (SET NULL)
  const checkBom = await pool.query('SELECT * FROM erp.project_boms WHERE id = $1', [f.bom]);
  assert.equal(checkBom.rows.length, 1, 'BOM của dự án vẫn phải tồn tại');
  assert.equal(checkBom.rows[0].survey_id, null, 'survey_id trên BOM phải được SET NULL');
  assert.equal(checkBom.rows[0].survey_item_id, null, 'survey_item_id trên BOM phải được SET NULL');

  console.log('PASS: Survey cascade delete with child items and BOM unlinking passed completely!');
  await db.close();
}

testSurveyCascadeDelete().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
