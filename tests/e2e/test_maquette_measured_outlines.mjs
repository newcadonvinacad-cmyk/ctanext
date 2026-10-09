import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectId,installSurveyFixtures} from './fixtures/maquette-surveys.mjs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, storageState: 'tests/e2e/state-admin.json' });
  const errors = [];
  await page.addInitScript(() => { window.print = () => {}; });
  page.on('pageerror', error => errors.push(error.message));
  await installSurveyFixtures(page);
  await page.goto(`http://localhost:3000/du-an/${projectId}/thiet-ke-quy-chuan?surveyId=survey-horizontal`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const svg = page.locator('svg[data-ready=true]');
  await svg.waitFor({ timeout: 90000 });
  const name = page.getByRole('textbox', { name: 'Tên đại lý', exact: true });
  const type = page.getByPlaceholder('VD: CÔNG TY TNHH TRANG TRÍ NỘI THẤT');
  await type.fill('CÔNG TY TNHH TRANG TRÍ NỘI THẤT');
  async function check() {
    await svg.waitFor();
    const result = await page.locator('#sign-body').evaluate(body => {
      const issues = [];
      const board = body.querySelector('rect');
      const W = Number(board.getAttribute('width')), H = Number(board.getAttribute('height'));
      for (const p of body.querySelectorAll('path[data-char]')) {
        const b = p.getBBox(), m = p.transform.baseVal.consolidate().matrix;
        const corners = [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(m));
        const x = Math.min(...corners.map(c=>c.x)), y = Math.min(...corners.map(c=>c.y));
        const w = Math.max(...corners.map(c=>c.x))-x, h = Math.max(...corners.map(c=>c.y))-y;
        if ([['x',x],['y',y],['width',w],['height',h]].some(([key,value]) => Math.abs(Number(p.dataset[key])-value)>0.15)) issues.push(`Dim mismatch: ${p.dataset.char}`);
        if (x < -0.15 || y < -0.15 || x+w > W+0.15 || y+h > H+0.15) issues.push(`Outside: ${p.dataset.char}`);
      }
      const groupHeight=role=>Array.from(body.querySelectorAll(`[data-role="${role}"]`)).map(g=>g.getBBox().height);
      const names=groupHeight('name'),types=groupHeight('type');
      if(names.length&&types.length&&Math.min(...names)<=Math.max(...types))issues.push('Name hierarchy inverted');
      const contactScales=Array.from(body.querySelectorAll('[data-role="address"] path,[data-role="phone"] path')).map(p=>p.transform.baseVal.consolidate().matrix.d);
      if(contactScales.some(s=>Math.abs(s-contactScales[0])>.0001))issues.push('Address and phone use different font sizes');
      return issues;
    });
    assert.deepEqual(result, []);
    assert.equal(await page.locator('#sign-body image').count(),0);
    assert.equal(await page.locator('#sign-body [data-role^="brand-"]').count(),0,'Brand name must come from supplied artwork, not font text');
  }
  for (const text of ['THÀNH PHÁT', 'TÂN TÀI PHÁT', 'CÔNG TY TNHH SƠN VÀ TRANG TRÍ NỘI THẤT THÀNH PHÁT', 'ĐỨC\nVƯỢNG']) {
    await name.fill(text);
    await check();
  }
  await page.getByRole('combobox',{name:'Phiếu khảo sát của dự án'}).selectOption('survey-pillar');
  await check();
  await svg.screenshot({ path: 'scratch/shop-drawing-pillar.png' });
  await page.getByRole('combobox',{name:'Phiếu khảo sát của dự án'}).selectOption('survey-narrow');
  await check();
  await page.getByRole('combobox',{name:'Phiếu khảo sát của dự án'}).selectOption('survey-horizontal');
  await type.fill('CÔNG TY TNHH TRANG TRÍ NỘI THẤT');
  await name.fill('TÂN TÀI PHÁT');
  await check();
  assert.equal(await page.locator('[data-detail-line]').count(),0);
  assert.equal(await page.locator('input[type=file]').count(),0);
  assert.equal(await page.getByText('Chế độ hiển thị:',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Tọa độ dán chữ CSV'}).count(),0);
  await svg.screenshot({ path: 'scratch/shop-drawing-simple.png' });
  const svgDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Vector SVG' }).click();
  const vector = await fs.readFile(await (await svgDownload).path(), 'utf8');
  assert.ok(vector.includes('data-char="Â"') && !vector.includes('data-detail-line='));
  assert.ok(!vector.includes('<image'), 'Logo and brand name must be native vector paths');
  assert.ok(vector.includes('logo-badge-vector') && vector.includes('brand-wordmark-vector'));
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Ảnh PNG' }).click();
  const png = await fs.readFile(await (await pngDownload).path());
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) <= 8192 && png.readUInt32BE(20) <= 8192);
  assert.ok(png.readUInt32BE(16) * png.readUInt32BE(20) <= 24000000);
  await page.getByRole('button', { name: 'In / PDF A4' }).click();
  const printPageCount = await page.locator('#maquette-print-frame').evaluate(frame => frame.contentDocument.querySelectorAll('.sheet').length);
  assert.equal(printPageCount,1);
  // Intercept save: verify persistence without writing test data into the user's database.
  let payload;
  await page.route('**/api/design-proofs', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ proof: { id: 'test', title: payload.title, code: 'TEST', status: payload.status } }) });
  });
  await page.getByRole('button', { name: '1-Click Lưu Dự Án 360' }).click();
  await page.getByRole('button', { name: 'Cập Nhật Bản Vẽ Này' }).waitFor();
  assert.equal(payload.status, 'pending');
  const persisted = JSON.parse(payload.clientFeedback)._parametricSpec;
  assert.equal(persisted.engineVersion, 3);
  assert.ok(persisted.drawing.lines.some(l=>l.role==='name' && l.glyphs.length>0));
  const renderedBrand = await page.locator('#brand-wordmark-vector').evaluate(svg => {
    const boardMatrix = document.querySelector('#sign-body').getScreenCTM().inverse();
    return Array.from(svg.querySelectorAll('path')).map(p=>{
      const b=p.getBBox(),m=boardMatrix.multiply(p.getScreenCTM());
      const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
      const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
      return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
    });
  });
  const brandDims = persisted.drawing.brandDetails.flatMap(l=>l.glyphs);
  assert.equal(brandDims.length,renderedBrand.length);
  for(const b of renderedBrand) assert.ok(brandDims.some(g=>['x','y','width','height'].every(k=>Math.abs(g[k]-b[k])<.15)), 'Brand dim must match supplied vector path');
  assert.deepEqual(errors, []);
  console.log('PASS: simplified interface, measured dims, narrow/pillar layouts, SVG/PNG export, one print sheet and saved geometry');
} finally { await browser.close(); }
