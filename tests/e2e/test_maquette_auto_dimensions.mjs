import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectId,installSurveyFixtures} from './fixtures/maquette-surveys.mjs';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:2000,height:1200},storageState:'tests/e2e/state-admin.json'});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await installSurveyFixtures(page);
  await page.goto(`http://localhost:3000/du-an/${projectId}/thiet-ke-quy-chuan?surveyId=survey-horizontal`,{waitUntil:'domcontentloaded'});
  const svg=page.locator('svg[data-ready=true]'), numbers=page.locator('input[type=number]');
  await svg.waitFor();
  for(const [w,h,code] of [[12,2.4,'03'],[5.9,.9,'04'],[2,2,'05'],[1,3,'09'],[12,2.4,'03']]) {
    await numbers.nth(0).fill(String(w)); await numbers.nth(1).fill(String(h));
    await page.waitForFunction(code=>document.querySelector('[data-auto-layout]')?.dataset.autoLayout.startsWith(`LAYOUT_${code}_`),code);
    assert.ok((await page.locator('[data-auto-layout]').getAttribute('data-auto-layout')).startsWith(`LAYOUT_${code}_`));
    const issues=await svg.evaluate(svg=>{
      const issues=[],box=svg.viewBox.baseVal;
      const root=svg.getScreenCTM().inverse();
      for(const el of svg.querySelectorAll('#technical-dimensions > g')) {
        const b=el.getBBox(),m=root.multiply(el.getScreenCTM());
        const corners=[[b.x,b.y],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
        if(corners.some(p=>p.x<box.x-.5||p.y<box.y-.5||p.x>box.x+box.width+.5||p.y>box.y+box.height+.5)) issues.push(`Clipped dim ${el.dataset.dimensionId}`);
        if(Math.abs(Number(el.dataset.b)-Number(el.dataset.a)-Number(el.dataset.mm))>.1) issues.push('Wrong dimension value');
        if(!el.querySelector('[data-extension=a]')||!el.querySelector('[data-extension=b]')) issues.push('Missing measured extension');
      }
      return issues;
    });
    assert.deepEqual(issues,[]);
    const source=await svg.evaluate(svg=>new XMLSerializer().serializeToString(svg));
    await fs.writeFile(`scratch/verified-maket-${code}.svg`,source);
    const preview=await browser.newPage({viewport:{width:2000,height:2000}});
    await preview.setContent('<style>body{margin:0}body>svg{display:block;width:2000px;height:auto}</style>'+source);
    await preview.locator('svg[data-ready=true]').screenshot({path:`scratch/verified-maket-${code}.png`});
    await preview.close();
  }
  // A restored proof may contain an obsolete manual layout; dimensions still select the layout.
  await page.route('**/api/design-proofs/auto-layout-test',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({proof:{id:'auto-layout-test',title:'Test',clientFeedback:JSON.stringify({_parametricSpec:{input:{widthMeters:1,heightMeters:3,dealerName:'ĐỨC VƯỢNG',dealerType:'Đại lý',dealerAddress:'',dealerPhone:'',layoutType:'LAYOUT_03_STANDARD_HORIZONTAL'}}})}})}));
  await page.goto('http://localhost:3000/du-an/thiet-ke-quy-chuan?proofId=auto-layout-test',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-auto-layout]')?.dataset.autoLayout==='LAYOUT_09_PILLAR');
  assert.deepEqual(errors,[]);
  console.log('PASS: layout changes with dimensions, old saved selection corrected, dimension endpoints and unclipped SVG in 03/04/05/09');
} finally {await browser.close();}
