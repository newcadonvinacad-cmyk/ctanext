const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const opentype = require('opentype.js');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { calculateNipponBrandSpec, detectRecommendedLayout, NIPPON_REAL_SURVEY_PRESETS } = require('../src/lib/nippon-brand-guidelines.ts');
const { createShopDrawing, drawingCsv } = require('../src/lib/nippon-shop-drawing.ts');
const { planNipponDimensions } = require('../src/lib/nippon-dimensions.ts');
const { dimensionPathCutsBoxes } = require('../src/lib/nippon-dimension-router.ts');
const load = file => { const b = fs.readFileSync(file); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const fonts = { name: load('public/fonts/nippon-preview/NotoSans-BlackItalic.ttf'), info: load('public/fonts/nippon-preview/NotoSans-Bold.ttf') };
const base = { widthMeters: 12, heightMeters: 2.4, dealerName: 'THÀNH PHÁT', dealerType: 'CÔNG TY TNHH TRANG TRÍ NỘI THẤT',
  dealerAddress: 'Số 503, Tỉnh lộ 887, Ấp Long Điền, Xã Phước Long, Tỉnh Vĩnh Long', dealerPhone: '091 799 0037 - 0952 114455' };
let checked = 0;
function validate(input) {
  const spec = calculateNipponBrandSpec(input);
  const drawing = createShopDrawing(input, spec, fonts);
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.1, `${a} != ${b}`);
  for (const line of drawing.lines) {
    assert.ok([line.x, line.y, line.width, line.height, line.fontSize].every(Number.isFinite));
    assert.ok(line.x >= -0.1 && line.y >= -0.1 && line.x + line.width <= drawing.width + 0.1 && line.y + line.height <= drawing.height + 0.1, `Outside board: ${line.id}`);
    assert.ok(line.scaleX >= 0.8 && line.scaleX <= 1);
    near(Math.min(...line.glyphs.map(g => g.x)), line.x);
    near(Math.max(...line.glyphs.map(g => g.x + g.width)), line.x + line.width);
    near(Math.min(...line.glyphs.map(g => g.y)), line.y);
    near(Math.max(...line.glyphs.map(g => g.y + g.height)), line.y + line.height);
    for (const g of line.glyphs) assert.ok(g.path.startsWith('M') && g.width > 0 && g.height > 0);
    if (['name', 'type', 'address', 'phone'].includes(line.role)) {
      assert.ok(line.y >= spec.dealerSection.positionTopMm - 0.1);
      if (spec.rainbowBar.isVertical) assert.ok(line.x >= spec.rainbowBar.positionLeftMm + spec.rainbowBar.widthMm - 0.1);
    }
  }
  const dealerLines = drawing.lines.filter(l => ['name', 'type', 'address', 'phone'].includes(l.role));
  for (const line of drawing.lines.filter(l => l.role === 'pillar-brand')) {
    assert.ok(line.y >= drawing.logo.y + drawing.logo.height, 'Pillar wordmark overlaps logo');
    assert.ok(line.y + line.height <= spec.rainbowBar.positionTopMm, 'Pillar wordmark overlaps spectrum');
  }
  for (let i = 1; i < dealerLines.length; i++) assert.ok(dealerLines[i].y >= dealerLines[i - 1].y + dealerLines[i - 1].height - 0.1, 'Dealer rows overlap');
  const names=dealerLines.filter(l=>l.role==='name'), types=dealerLines.filter(l=>l.role==='type');
  if(names.length && types.length) assert.ok(Math.min(...names.map(l=>l.height)) > Math.max(...types.map(l=>l.height)), 'Dealer name must remain larger than the type, including unaccented wrapped lines');
  const contacts=dealerLines.filter(l=>['address','phone'].includes(l.role));
  if(contacts.length) for(const l of contacts) near(l.fontSize,contacts[0].fontSize);
  for(const l of dealerLines.filter(l=>l.role!=='name')) assert.equal(l.scaleX,1,'Information text must not be horizontally compressed');
  const text = drawing.lines.filter(l => l.role === 'name').map(l => l.text).join(' ').replace(/\s+/g, ' ');
  if (spec.dealerSection.widthMm) assert.equal(text, input.dealerName.normalize('NFC').toUpperCase().trim().replace(/\s+/g, ' '));
  if (spec.rainbowBar.isVertical) near(spec.dealerSection.positionLeftMm, spec.logoSection.widthMm);
  const csv = drawingCsv(drawing);
  assert.equal(csv.split('\r\n').length - 1, drawing.lines.reduce((sum, l) => sum + l.glyphs.length, 0));
  const dims = planNipponDimensions(drawing, spec, Math.max(Math.max(drawing.width, Math.min(drawing.height, 3200)) / 130, 16));
  assert.equal(new Set(dims.map(d => d.id)).size, dims.length);
  const overlaps = (a,b) => a.x < b.x+b.width-0.01 && a.x+a.width > b.x+0.01 && a.y < b.y+b.height-0.01 && a.y+a.height > b.y+0.01;
  const ink = [drawing.logo, ...(spec.rainbowBar.widthMm ? [{x:spec.rainbowBar.positionLeftMm,y:spec.rainbowBar.positionTopMm,width:spec.rainbowBar.widthMm,height:spec.rainbowBar.heightMm}] : []), ...(drawing.wordmark && !drawing.brandDetails.length ? [drawing.wordmark] : []),
    ...[...drawing.lines,...drawing.brandDetails].flatMap(l => l.glyphs)];
  for (const [i, dim] of dims.entries()) {
    assert.ok([dim.a, dim.b, dim.at, dim.sourceA, dim.sourceB].every(Number.isFinite));
    assert.ok(dim.b > dim.a);
    assert.ok(!ink.some(b => overlaps(dim.labelBox,b)), `Dim label overlaps ink: ${spec.layoutType}/${dim.id}`);
    assert.ok(!dims.slice(0,i).some(d => overlaps(dim.labelBox,d.labelBox)), `Dim labels overlap: ${spec.layoutType}/${dim.id}`);
    for (const [key, coordinate] of [['extensionA',dim.a],['extensionB',dim.b]]) {
      const route=dim[key], source=key==='extensionA'?dim.sourceA:dim.sourceB;
      assert.deepEqual(route[0],dim.vertical?[source,coordinate]:[coordinate,source], `Wrong source edge: ${dim.id}`);
      assert.deepEqual(route.at(-1),dim.vertical?[dim.at,coordinate]:[coordinate,dim.at], `Wrong extension end: ${dim.id}`);
      assert.ok(!dimensionPathCutsBoxes(route,ink), `Extension crosses artwork: ${spec.layoutType}/${dim.id}`);
    }
    const track=dim.vertical?[[dim.at,dim.a],[dim.at,dim.b]]:[[dim.a,dim.at],[dim.b,dim.at]];
    assert.ok(!dimensionPathCutsBoxes(track,ink), `Track crosses artwork: ${dim.id}`);
  }
  near(dims.find(d => d.id === 'overall-width').b, spec.totalWidthMm);
  near(dims.find(d => d.id === 'overall-height').b, spec.totalHeightMm);
  for (const id of ['logo-width','logo-height']) assert.ok(dims.some(d=>d.id===id),`Missing ${id}`);
  for (const line of [...drawing.lines,...drawing.brandDetails]) assert.ok(dims.some(d=>d.id===`${line.id}-height`),`Missing height: ${line.id}`);
  if(spec.rainbowBar.widthMm) for(const id of ['brand-region','dealer-region']) assert.ok(dims.some(d=>d.id===id),`Missing ${id}`);
  for(const line of drawing.lines.filter(l=>['name','type','address','phone'].includes(l.role))) {
    const ratio=line.role==='name'?drawing.typography.nameRatio:line.role==='type'?drawing.typography.typeRatio:drawing.typography.infoRatio;
    assert.ok(line.height<=drawing.typography.referenceF*ratio+.1,`Wrong height ratio: ${line.id}`);
  }
  // Catch the former waterfall of detail tracks extending far below the sign.
  assert.ok(Math.max(...dims.map(d=>d.labelBox.y+d.labelBox.height))<drawing.height+Math.max(drawing.width,drawing.height)*.5,'Dimension sheet exploded vertically');
  checked++;
  return drawing;
}
for (const preset of NIPPON_REAL_SURVEY_PRESETS) for (const name of ['SƠN', 'ĐỨC VƯỢNG', 'TÂN TÀI PHÁT', 'CÔNG TY TNHH SƠN VÀ TRANG TRÍ NỘI THẤT THÀNH PHÁT', 'ĐỨC\nVƯỢNG', 'ĐỨC VƯỢNG'.normalize('NFD')]) validate({ ...base, ...preset, dealerName: name });
for (const mode of ['auto','single','manual']) validate({ ...base, dealerName: 'TÂN TÀI PHÁT\nĐỒNG NAI', nameLayout: mode, dealerFax: '028 555 9999' });
const blank = validate({ ...base, dealerAddress: '', dealerPhone: '', dealerType: '' });
assert.ok(!blank.lines.some(l => ['address', 'phone', 'type'].includes(l.role)), 'Empty fields must stay empty');
const standard=validate(base);
assert.equal(standard.lines.filter(l=>l.role==='name').length,1,'Keep a name on one line when it fits the specified size');
assert.ok(Math.abs(standard.lines.find(l=>l.role==='name').height-standard.typography.referenceF*2/3)<.1,'Do not reduce standard name size while space is available');
assert.equal(standard.lines.filter(l=>l.role==='type').length,2,'Wrap a long type before shrinking below its specified size');
assert.ok(Math.abs(Math.max(...standard.lines.filter(l=>l.role==='type').map(l=>l.height))-standard.typography.referenceF/2)<.1);
const longName=validate({...base,widthMeters:6,heightMeters:2.38,dealerName:'CÔNG TY TNHH SƠN VÀ TRANG TRÍ NỘI THẤT THÀNH PHÁT'});
assert.ok(longName.lines.filter(l=>l.role==='name').length>1);
const manual=validate({...base,dealerName:'THÀNH\nPHÁT\nĐỒNG\nNAI\nVIỆT NAM'});
assert.deepEqual(manual.lines.filter(l=>l.role==='name').map(l=>l.text),['THÀNH','PHÁT','ĐỒNG','NAI','VIỆT NAM']);
const phones=validate({...base,widthMeters:3,heightMeters:1.2,dealerPhone:'091 799 0037 - 0952 114455',dealerFax:'028 555 9999'});
const phoneRows=phones.lines.filter(l=>l.role==='phone').map(l=>l.text);
for(const number of ['091 799 0037','0952 114455','028 555 9999']) assert.ok(phoneRows.some(text=>text.includes(number)),`Do not split a phone number across lines: ${number}`);
const thin = validate({ ...base, dealerName: 'IIII' }).lines.find(l => l.role === 'name');
const wide = validate({ ...base, dealerName: 'WWWW' }).lines.find(l => l.role === 'name');
assert.ok(wide.width > thin.width * 1.5, 'Ink width must depend on font shapes, not character count');
validate({ ...base, layoutType: 'LAYOUT_06_LOGO_ONLY' });
validate({ ...base, layoutType: 'LAYOUT_07_CENTERED_BRAND' });
validate({ ...base, layoutType: 'LAYOUT_08_NARROW_BRAND' });
validate({ ...base, widthMeters: 1.2, heightMeters: 2.5, layoutType: 'LAYOUT_10_MOBILE' });
const asset = { width: 100, height: 100, content: '<path d="M0 0H100V100H0Z"/>', label: 'test vector' };
assert.equal(createShopDrawing({ ...base, nameFontDataUrl: 'provided', infoFontDataUrl: 'provided' }, calculateNipponBrandSpec(base), fonts).provisional, false);
assert.equal(createShopDrawing({ ...base, nameFontDataUrl: 'provided', infoFontDataUrl: 'provided', logoVector: asset, wordmarkVector: asset }, calculateNipponBrandSpec(base), fonts).provisional, false);
for (const [layout, ratio] of [['LAYOUT_06_LOGO_ONLY', .6], ['LAYOUT_07_CENTERED_BRAND', .8], ['LAYOUT_08_NARROW_BRAND', .8*2/3]]) {
  const spec = calculateNipponBrandSpec({ ...base, layoutType: layout });
  assert.ok(Math.abs(spec.logoSection.logoWidthMm - spec.totalWidthMm*ratio) <= 1);
  assert.equal(spec.rainbowBar.widthMm, 0); assert.equal(spec.dealerSection.widthMm, 0);
}
const pillarSpec = calculateNipponBrandSpec({ ...base, widthMeters: 1, heightMeters: 4, layoutType:'LAYOUT_09_PILLAR' });
assert.equal(pillarSpec.logoSection.heightMm,3000); assert.equal(pillarSpec.dealerSection.heightMm,1000);
assert.equal(pillarSpec.rainbowBar.positionTopMm,3000); assert.equal(pillarSpec.logoSection.logoWidthMm,900);
const measuredPillar=createShopDrawing({...base,widthMeters:1,heightMeters:4,layoutType:'LAYOUT_09_PILLAR'},pillarSpec,fonts);
assert.ok(Math.abs(measuredPillar.logo.width-900)<1,'Pillar badge must use 90% X without the former arbitrary height cap');
const emptyPillar = calculateNipponBrandSpec({ ...base, widthMeters:1,heightMeters:4,layoutType:'LAYOUT_09_PILLAR',dealerName:'',dealerType:'',dealerAddress:'',dealerPhone:'' });
assert.equal(emptyPillar.dealerSection.widthMm,0); assert.equal(emptyPillar.rainbowBar.widthMm,0);
for (const [name,scale,ratio] of [['SƠN',1,1],['ĐỨC VƯỢNG',.9,2/3],['TÂN TÀI PHÁT',.8,2/3]]) {
  const drawing = validate({ ...base, dealerName:name });
  assert.equal(drawing.typography.nameScale,scale); assert.equal(drawing.typography.nameRatio,ratio);
  for (const line of drawing.lines.filter(l=>l.role==='name')) assert.equal(line.scaleX,scale);
}
console.log(`PASS: ${checked} layouts; Vietnamese outlines, bounds, row separation, text preservation, CSV coordinates and font state`);
for(const [w,h,hasDealer,expected] of [[12,2.4,true,'03'],[5.9,.9,true,'04'],[2,2,true,'05'],[1,3,true,'09'],[12,2.4,false,'07'],[5.9,.9,false,'08'],[2,2,false,'06'],[1,3,false,'09']]) {
  assert.ok(detectRecommendedLayout(w,h,hasDealer).startsWith(`LAYOUT_${expected}_`));
}
console.log('PASS: auto layout selection, complete dimensions, measured source edges, compact sheets, clear artwork and actual height ratios');
