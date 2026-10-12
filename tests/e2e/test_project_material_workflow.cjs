// Run against the local dev server with an existing, ignored admin storage state.
// All writes are mocked; no survey, proposal, order or stock data is changed.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('scratch/bom-audit', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: 'tests/e2e/state-admin.json', viewport: { width: 1440, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.goto('http://localhost:3000/san-xuat');
    await page.getByRole('button', { name: 'Lập lệnh sản xuất', exact: true }).waitFor({ timeout: 120000 });
    const { catalog, meta } = await page.evaluate(async () => ({
      catalog: await (await fetch('/api/product-boms')).json(),
      meta: await (await fetch('/api/production-orders/metadata')).json(),
    }));
    const project = meta.projects[0];
    const product = catalog.catalog.find(i => i.kind === 'product');
    const raw = catalog.catalog.find(i => i.kind === 'material');
    assert.ok(project && product && raw, 'Read-only fixtures need a project, product and material');
    const schemaId = '40000000-0000-4000-8000-000000000001';
    const definitions = [
      { key: 'a', label: 'Chiều dài', unit: 'mm', type: 'number', required: true },
      { key: 'b', label: 'Chiều rộng', unit: 'mm', type: 'number', required: true },
      { key: 'c', label: 'Có đèn', type: 'boolean', required: true },
    ];
    const products = catalog.catalog.map(p => p.id === product.id ? { ...p, schemaId, schemaVersion: 1, definitions } : p);
    const item = (n, title) => ({ id: `40000000-0000-4000-8000-00000000001${n}`, itemTitle: title, quantity: 3, productItemId: product.id, parameterSchemaId: schemaId, parameterValues: { a: 1200, b: 600, c: false }, notes: '', designatedItemText: '', widthMeters: 0, heightMeters: 0, depthMeters: 0, parameters: {}, selectedSpecs: {}, sortOrder: n });
    const items = [item(1, 'Hạng mục chưa có đề xuất'), item(2, 'Hạng mục chờ rà soát'), item(3, 'Hạng mục đã xác nhận'), item(4, 'Hạng mục đã có lệnh'), item(5, 'Hạng mục đã đổi số đo')];
    let survey = { id: '40000000-0000-4000-8000-000000000020', code: 'KS-UI', title: 'Khảo sát UI dự án', address: 'Địa chỉ kiểm tra', projectId: project.id, surveyDate: '2026-10-12', status: 'draft', items, metadata: {}, photos: [], widthMeters: 0, heightMeters: 0, depthMeters: 0 };
    const proposal = (n, surveyItem, status = 'draft') => ({
      id: `40000000-0000-4000-8000-00000000003${n}`, survey_item_id: surveyItem.id, status, version: 1, method: 'ai', created_at: `2026-10-12T04:00:0${n}Z`,
      bom_id: status === 'confirmed' ? `40000000-0000-4000-8000-00000000004${n}` : null,
      source_snapshot: { projectId: project.id, surveyId: survey.id, surveyItemId: surveyItem.id, title: surveyItem.itemTitle, productItemId: product.id, productCode: product.code, productName: product.name, outputUnitId: product.baseUnitId, schemaId, schemaVersion: 1, definitions, parameterValues: { ...surveyItem.parameterValues }, quantity: surveyItem.quantity, notes: '', designatedItemText: '', references: [{ id: 'reference', name: 'Khung mẫu nhỏ', version: 1, parameterValues: { a: 800, b: 600, c: false }, lines: [{ itemId: raw.id, unitId: raw.baseUnitId, quantity: 6, wasteRate: 10, notes: '' }] }] },
      lines: [{ itemId: raw.id, unitId: raw.baseUnitId, quantity: 7, wasteRate: 10, notes: '' }], explanation: 'Định mức dự thảo dựa trên BOM mẫu.', warnings: ['Kiểm tra cấu tạo khung trước khi xác nhận.'],
    });
    let proposals = [proposal(2, items[1]), proposal(3, items[2], 'confirmed'), { ...proposal(4, items[3], 'confirmed'), production_order_id: '40000000-0000-4000-8000-000000000050' }, proposal(5, { ...items[4], parameterValues: { a: 1000, b: 600, c: false } }, 'confirmed')];
    let generationCount = 0, savedCount = 0, editedCount = 0;
    let rejectNextSave = false;
    let refreshGate = null;
    await page.route(`**/api/projects/${project.id}/design-proofs`, async r => {
      if (refreshGate) await refreshGate;
      return r.continue();
    });
    const endpoint = `**/api/projects/${project.id}/material-proposals`;
    await page.route('**/api/product-boms/catalog', r => r.fulfill({ json: { catalog: products.filter(p => p.kind === 'product'), schemas: [{ id: schemaId, productItemId: product.id, version: 1, definitions }] } }));
    await page.route(`**/api/surveys?projectId=${project.id}`, r => r.fulfill({ json: { surveys: [survey] } }));
    await page.route('**/api/surveys', async r => {
      assert.equal(r.request().method(), 'POST');
      if (rejectNextSave) {
        rejectNextSave = false;
        return r.fulfill({ status: 503, json: { error: 'Không lưu được khảo sát thử nghiệm' } });
      }
      const body = r.request().postDataJSON();
      assert.equal(body.projectId, project.id);
      assert.equal(body.widthMeters, 0);
      assert.equal(body.heightMeters, 0);
      assert.equal(body.depthMeters, 0);
      assert.equal(body.items[0].itemTitle, 'Hạng mục 1');
      assert.deepEqual(body.items[0].parameters, {});
      assert.deepEqual(body.items[0].selectedSpecs, {});
      savedCount++;
      survey = { ...survey, ...body, items: body.items.map((i, n) => ({ ...i, id: `40000000-0000-4000-8000-00000000006${n}` })) };
      return r.fulfill({ json: { survey } });
    });
    await page.route('**/api/surveys/*', async r => {
      if (r.request().method() === 'GET') return r.continue();
      assert.equal(r.request().method(), 'PUT');
      const body = r.request().postDataJSON();
      assert.equal(body.items[0].id, survey.items[0].id, 'Editing retains the surveyed item identity');
      assert.equal(body.widthMeters, 0);
      assert.equal(body.heightMeters, 0);
      assert.equal(body.depthMeters, 0);
      assert.equal(body.metadata.signMaterial, '');
      assert.equal(body.items[0].widthMeters, 0);
      assert.equal(body.items[0].heightMeters, 0);
      assert.equal(body.items[0].depthMeters, 0);
      editedCount++;
      survey = { ...survey, ...body };
      return r.fulfill({ json: { survey } });
    });
    await page.route(endpoint, async r => {
      if (r.request().method() === 'GET') return r.fulfill({ json: { catalog: products, proposals } });
      assert.equal(r.request().method(), 'POST');
      const body = r.request().postDataJSON();
      const target = survey.items.find(i => i.id === body.surveyItemId);
      assert.ok(target, 'Generation must use the preselected survey item');
      generationCount++;
      const generated = proposal(6 + generationCount, target);
      proposals = [generated, ...proposals];
      return r.fulfill({ json: { proposal: generated } });
    });
    await page.route(endpoint + '/*', async r => {
      const id = r.request().url().split('/').pop();
      const old = proposals.find(p => p.id === id);
      const body = r.request().postDataJSON();
      assert.equal(body.version, old.version);
      const updated = { ...old, lines: body.lines, review_notes: body.reviewNotes, version: old.version + 1, status: body.confirm ? 'confirmed' : 'draft', bom_id: body.confirm ? '40000000-0000-4000-8000-000000000070' : null };
      proposals = proposals.map(p => p.id === id ? updated : p);
      return r.fulfill({ json: { proposal: updated } });
    });

    await page.goto(`http://localhost:3000/du-an/${project.id}?tab=design`);
    const first = page.getByTestId(`survey-product-${items[0].id}`);
    await first.getByText('Chưa có đề xuất', { exact: true }).waitFor({ timeout: 120000 });
    assert.equal(await first.getByText('Có đèn', { exact: true }).count(), 1);
    assert.equal(await first.getByText('Không', { exact: true }).count(), 1);
    await page.getByTestId(`survey-product-${items[1].id}`).getByText('Chờ rà soát', { exact: true }).waitFor();
    await page.getByTestId(`survey-product-${items[2].id}`).getByText('Đã xác nhận', { exact: true }).waitFor();
    await page.getByTestId(`survey-product-${items[3].id}`).getByRole('link', { name: /Mở lệnh sản xuất/ }).waitFor();
    const changed = page.getByTestId(`survey-product-${items[4].id}`);
    await changed.getByText('Khảo sát đã thay đổi', { exact: true }).waitFor();
    assert.equal(await changed.getByRole('link', { name: /Lập lệnh/ }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'BOM cũ', exact: true }).count(), 0);
    await page.screenshot({ path: 'scratch/bom-audit/project-ux-surveys.png', fullPage: true });
    await first.getByRole('button', { name: 'Lập đề xuất NVL', exact: true }).click();
    await page.waitForURL('**tab=production');
    await page.getByLabel('Hạng mục cần xử lý', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Hạng mục cần xử lý', { exact: true }).inputValue(), items[0].id);
    assert.equal(await page.getByRole('dialog').count(), 0, 'Product action must not open the legacy calculator');
    const legacy = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Dữ liệu cũ: BOM & Maket' }) }).first();
    assert.equal(await legacy.getAttribute('open'), null);
    await page.getByRole('button', { name: 'Lập đề xuất NVL', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('heading', { name: 'Rà soát đề xuất nguyên vật liệu', exact: true }).waitFor();
    await dialog.getByText(/So sánh với BOM mẫu tham chiếu/).click();
    await dialog.getByText('Khung mẫu nhỏ', { exact: false }).waitFor();
    await dialog.getByLabel('Định mức dòng 1', { exact: true }).fill('8');
    await dialog.getByRole('button', { name: 'Lưu chỉnh sửa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xác nhận đề xuất', exact: true }).click();
    await dialog.getByRole('link', { name: /Lập lệnh sản xuất/ }).waitFor();
    assert.equal(proposals[0].lines[0].quantity, 8);
    assert.equal(generationCount, 1);
    await page.screenshot({ path: 'scratch/bom-audit/project-ux-review.png', fullPage: true });
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByTestId(`material-item-${items[4].id}`).getByRole('button', { name: 'Xem đề xuất', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Xác nhận đề xuất', exact: true }).count(), 0);
    assert.equal(await dialog.getByRole('link', { name: /Lập lệnh/ }).count(), 0);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'scratch/bom-audit/project-ux-mobile.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile page must not overflow horizontally');
    await page.getByTestId(`material-item-${items[1].id}`).getByRole('button', { name: 'Rà soát đề xuất', exact: true }).click();
    await dialog.getByText(/So sánh với BOM mẫu tham chiếu/).click();
    await page.screenshot({ path: 'scratch/bom-audit/project-ux-mobile-review.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile review must keep wide tables inside their own scroll area');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByRole('button', { name: 'Về khảo sát', exact: true }).click();
    await page.getByTestId(`survey-product-${items[1].id}`).getByRole('button', { name: 'Rà soát đề xuất', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xác nhận đề xuất', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Hạng mục cần xử lý', { exact: true }).inputValue(), items[1].id);
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByRole('button', { name: 'Về khảo sát', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo khảo sát', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Tạo khảo sát dự án', exact: true }).waitFor();
    const textInputs = dialog.locator('input');
    await textInputs.nth(0).fill('Khảo sát mới UI');
    await textInputs.nth(2).fill('Địa chỉ khảo sát UI');
    await dialog.getByLabel('Thành phẩm khảo sát 1', { exact: true }).selectOption(`product:${product.id}`);
    await dialog.getByLabel('Chiều dài (mm) *', { exact: true }).fill('1500');
    await dialog.getByLabel('Chiều rộng (mm) *', { exact: true }).fill('700');
    await dialog.getByLabel('Có đèn *', { exact: true }).selectOption('false');
    assert.equal(await dialog.getByText(/Phụ kiện nhận diện Nippon/).count(), 0);
    await dialog.getByLabel('Số lượng thành phẩm', { exact: true }).fill('0');
    await dialog.getByRole('button', { name: /Lưu & Lập đề xuất NVL/ }).click();
    assert.equal(savedCount, 0, 'A zero quantity must not silently become one');
    await dialog.getByLabel('Số lượng thành phẩm', { exact: true }).fill('3');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'scratch/bom-audit/project-ux-mobile-survey-form.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile survey footer must wrap');
    rejectNextSave = true;
    await dialog.getByRole('button', { name: /Lưu & Lập đề xuất NVL/ }).click();
    await page.getByText('Không lưu được khảo sát thử nghiệm', { exact: true }).waitFor();
    assert.equal(savedCount, 0, 'A failed save must not close the survey or continue to material proposals');
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'design');
    assert.equal(await dialog.isVisible(), true);
    let releaseRefresh;
    refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
    try {
      const savedResponse = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/surveys');
      await dialog.getByRole('button', { name: /Lưu & Lập đề xuất NVL/ }).click();
      await savedResponse;
      await page.waitForURL('**tab=production', { timeout: 5000 });
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('heading', { name: 'Đề xuất NVL theo khảo sát', exact: true }).waitFor();
      assert.equal(generationCount, 1, 'Navigation must not invoke AI while the background refresh is pending');
    } finally {
      refreshGate = null;
      releaseRefresh();
    }
    await page.getByLabel('Hạng mục cần xử lý', { exact: true }).waitFor();
    assert.equal(savedCount, 1);
    assert.equal(await page.getByLabel('Hạng mục cần xử lý', { exact: true }).inputValue(), survey.items[0].id);
    assert.equal(generationCount, 1, 'Save and continue selects the item without automatically invoking AI');
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByRole('button', { name: 'Về khảo sát', exact: true }).click();
    await page.getByTitle('Sửa phiếu khảo sát', { exact: true }).click();
    await dialog.getByRole('heading', { name: 'Cập nhật khảo sát', exact: true }).waitFor();
    await dialog.getByRole('button', { name: /Cập nhật khảo sát/i }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(editedCount, 1);
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'design', 'Plain save stays on the survey tab');
    await page.getByTitle('Sửa phiếu khảo sát', { exact: true }).click();
    await dialog.getByRole('heading', { name: 'Cập nhật khảo sát', exact: true }).waitFor();
    refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
    try {
      const updatedResponse = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === `/api/surveys/${survey.id}`);
      await dialog.getByRole('button', { name: /Lưu & Lập đề xuất NVL/ }).click();
      await updatedResponse;
      await page.waitForURL('**tab=production', { timeout: 5000 });
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('heading', { name: 'Đề xuất NVL theo khảo sát', exact: true }).waitFor();
    } finally {
      refreshGate = null;
      releaseRefresh();
    }
    await page.getByLabel('Hạng mục cần xử lý', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Hạng mục cần xử lý', { exact: true }).inputValue(), survey.items[0].id);
    assert.equal(editedCount, 2);
    assert.equal(generationCount, 1, 'Editing and continuing must not invoke AI either');
    survey = { ...survey, title: 'Khảo sát theo mẫu cũ', items: [{ ...items[0], productItemId: null, parameterSchemaId: null, parameterValues: {}, widthMeters: 2, heightMeters: 1 }], widthMeters: 2, heightMeters: 1 };
    await page.goto(`http://localhost:3000/du-an/${project.id}?tab=design`);
    await page.getByRole('button', { name: 'BOM cũ', exact: true }).waitFor();
    await page.getByRole('button', { name: 'BOM cũ', exact: true }).click();
    await dialog.waitFor();
    assert.equal(await page.getByRole('heading', { name: /Bóc tách|BOM/ }).count() > 0, true, 'Historical surveys retain their calculator');
    assert.deepEqual(errors, []);
    console.log('PASS: item stages, survey navigation and preselection, review/edit/confirm, stale history, create/edit and continue with slow refresh, save failure, plain save, mobile layout; all writes mocked');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
