const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Load calculateSignageBom
const exportsObject = {};
const code = fs.readFileSync('src/lib/signage-bom-calculator.ts', 'utf8');
const transpiled = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(transpiled, { exports: exportsObject });
const { calculateSignageBom } = exportsObject;

// 1. Test Bảng Alu 2.38m x 6m (Non-illuminated with Brand Color Strip & Lettering)
const aluBom = calculateSignageBom({
  widthMeters: 6.0,
  heightMeters: 2.38,
  signageType: 'alu_letters',
  signMaterial: 'Bảng alu ngoài trời',
  level2BraceBars: 4,
  hasColorStrip: true,
  letterMaterial: 'MICA-TEXT',
});

assert.equal(aluBom.areaSqm, 14.28, 'Area must be 14.28 m²');
assert.equal(aluBom.totalLeds, 0, 'Standard Bảng alu must have 0 LEDs');
assert.equal(aluBom.powerUnitsNeeded, 0, 'Standard Bảng alu must have 0 power supplies');

// Check materials match Excel specifications
const aluCodes = aluBom.items.map((it) => it.itemCode);
assert.ok(aluCodes.includes('SAT-HOP-25'), 'Phải có Sắt vuông 25 Cấp 1');
assert.ok(aluCodes.includes('SAT-CHONG-25'), 'Phải có Sắt chống vuông 25 Cấp 2');
assert.ok(aluCodes.includes('ALU-ALCO-3MM'), 'Phải có Alu ngoài trời');
assert.ok(aluCodes.includes('DAI-MAU-THUONG-HIEU'), 'Phải có Dải màu nhận diện');
assert.ok(aluCodes.includes('MICA-TEXT'), 'Phải có Mica Text');
assert.ok(aluCodes.includes('KEO-ALU-TITEBOND'), 'Phải có Keo alu');
assert.ok(aluCodes.includes('KEO-SILICONE-APOLLO'), 'Phải có Keo silicone');
assert.ok(aluCodes.includes('KEO-502-NHO'), 'Phải có Keo 502 nhỏ');
assert.ok(aluCodes.includes('KEO-DINH-VI'), 'Phải có Keo định vị');

// Must NOT contain arbitrary hardcoded items
assert.ok(!aluCodes.includes('DINH-RUT-NHOM'), 'Không được có 533 đinh rút cứng');
assert.ok(!aluCodes.includes('VIT-TU-KHOAN'), 'Không được có 315 vít tự khoan cứng');
assert.ok(!aluCodes.includes('LED-NC-12W'), 'Không được có LED mặc định');
assert.ok(!aluCodes.includes('NGUON-MEANWELL-400W'), 'Không được có Nguồn mặc định');

// 2. Test Bảng Bạt UV 0.9m x 5.9m
const batBom = calculateSignageBom({
  widthMeters: 5.9,
  heightMeters: 0.9,
  signageType: 'canvas_hiflex',
  signMaterial: 'Bảng bạt UV',
  level2BraceBars: 2,
});

assert.equal(batBom.areaSqm, 5.31, 'Area must be 5.31 m²');
assert.equal(batBom.totalLeds, 0, 'Bảng bạt must have 0 LEDs');
assert.equal(batBom.powerUnitsNeeded, 0, 'Bảng bạt must have 0 power supplies');

const batCodes = batBom.items.map((it) => it.itemCode);
assert.ok(batCodes.includes('SAT-HOP-25'), 'Phải có Sắt vuông 25 Cấp 1');
assert.ok(batCodes.includes('SAT-CHONG-25'), 'Phải có Sắt chống vuông 25 Cấp 2');
assert.ok(batCodes.includes('BAT-HIFLEX-UV'), 'Phải có Bạt UV');
assert.ok(batCodes.includes('TOLE-VIEN-1M'), 'Phải có Tole viền');
assert.ok(batCodes.includes('NEP-VINOX'), 'Phải có Nẹp Vinox');
assert.ok(!batCodes.includes('KEO-ALU-TITEBOND'), 'Bảng bạt không được có Keo Alu');

// 3. Test Kệ Sắt 1.2m
const keBom = calculateSignageBom({
  widthMeters: 1.2,
  heightMeters: 1.8,
  signageType: 'other',
  signMaterial: 'Kệ sắt 1.2m',
});
const keCodes = keBom.items.map((it) => it.itemCode);
assert.ok(keCodes.includes('SAT-HOP-20'), 'Kệ sắt phải có Sắt vuông 20');
assert.ok(keCodes.includes('CHAN-KE-SAT'), 'Kệ sắt phải có Chân kệ');
assert.ok(keCodes.includes('MAM-KE-SAT'), 'Kệ sắt phải có Mâm kệ');
assert.ok(keCodes.includes('PHU-KIEN-KE'), 'Kệ sắt phải có Phụ kiện kệ');
assert.ok(keCodes.includes('FOMEX-DECAL'), 'Kệ sắt phải có Fomex + decal');

// 4. Test Hộp Đèn 3M (Illuminated)
const hopDenBom = calculateSignageBom({
  widthMeters: 3.0,
  heightMeters: 1.0,
  signageType: 'lightbox_3m',
  signMaterial: 'HOP-DEN-3M',
});
assert.ok(hopDenBom.totalLeds > 0, 'Hộp đèn 3M phải có LED');
assert.ok(hopDenBom.powerUnitsNeeded > 0, 'Hộp đèn 3M phải có Bộ nguồn');

console.log('PASS: Signage BOM factory takeoff aligned strictly with Excel specification!');
