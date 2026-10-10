const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const moduleCache = new Map();

function loadTsModule(filePath) {
  let resolvedPath = filePath;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.resolve(resolvedPath);
  }
  if (!fs.existsSync(resolvedPath)) {
    if (fs.existsSync(resolvedPath + '.ts')) resolvedPath += '.ts';
    else if (fs.existsSync(resolvedPath + '.tsx')) resolvedPath += '.tsx';
  }

  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath);
  }

  const code = fs.readFileSync(resolvedPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(resolvedPath, mod.exports);

  const customRequire = (id) => {
    if (id === '@/lib/db') {
      return {
        getDbPool: () => null,
        getCachedOrgId: async () => 'test-org-id',
      };
    }
    if (id.startsWith('@/')) {
      const subPath = path.resolve('src', id.slice(2));
      return loadTsModule(subPath);
    }
    if (id.startsWith('.')) {
      const subPath = path.resolve(path.dirname(resolvedPath), id);
      return loadTsModule(subPath);
    }
    return require(id);
  };

  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', transpiled);
  fn(mod, mod.exports, customRequire, path.dirname(resolvedPath), resolvedPath);
  return mod.exports;
}

const { GpsImportService } = loadTsModule(path.resolve('src/services/gps-import.service.ts'));

const fileHino = path.resolve('docs/Phân hệ xe/dữ liệu thô/Báo cáo tổng hợp - tháng 8- hino.xlsx');
const fileIsuzu = path.resolve('docs/Phân hệ xe/dữ liệu thô/Báo cáo hành trình 51D69998 27.07.xlsx');

test('IM15 & IM26: Nhập lần đầu và Nhập lại không nhân đôi số liệu (Deduplication)', async () => {
  GpsImportService.clearStore();

  const buf = fs.readFileSync(fileHino);

  // 1. Preview lần 1
  const prev1 = await GpsImportService.previewFile(buf, 'Bao_cao_tong_hop_thang_8.xlsx');
  assert.equal(prev1.totalRows, 31);
  assert.equal(prev1.newRows, 31);
  assert.equal(prev1.duplicateRows, 0);

  // 2. Commit lần 1
  const batch1 = await GpsImportService.commitImport(prev1, 'user-01');
  assert.equal(batch1.stats.newRows, 31);

  // Kiểm tra nhật ký sau commit 1: Đúng 31 ngày tháng 8 từ GPS
  const logs1 = await GpsImportService.getDailyLogs({ vehiclePlate: '51D-982.46' });
  const augLogs1 = logs1.filter(l => l.vehiclePlate === '51D-982.46' && l.workDate.startsWith('2026-08'));
  assert.equal(augLogs1.length, 31);

  // 3. Preview lần 2 với cùng file
  const prev2 = await GpsImportService.previewFile(buf, 'Bao_cao_tong_hop_thang_8.xlsx');
  assert.equal(prev2.totalRows, 31);
  assert.equal(prev2.newRows, 0);
  assert.equal(prev2.duplicateRows, 31); // 100% dòng trùng khớp

  // 4. Commit lần 2: Idempotent - không tăng bản ghi
  const batch2 = await GpsImportService.commitImport(prev2, 'user-01');
  const logs2 = await GpsImportService.getDailyLogs({ vehiclePlate: '51D-982.46' });
  const augLogs2 = logs2.filter(l => l.vehiclePlate === '51D-982.46' && l.workDate.startsWith('2026-08'));
  assert.equal(augLogs2.length, 31); // Vẫn chính xác 31 ngày, không bị 62 ngày!
  assert.equal(logs1.length, logs2.length); // Tổng số bản ghi hoàn toàn không tăng!

  // 5. Kiểm tra thống kê tháng 8 Hino
  const stats = GpsImportService.getVehicleMonthStats('51D-982.46', '2026-08');
  assert.equal(stats.totalKm, 7682.0);
  assert.equal(stats.totalFuelLiters, 844);
  assert.equal(stats.totalStops, 1263);
  assert.equal(stats.totalSpeeding, 21);
  assert.equal(stats.totalContinuous4h, 9);
  assert.equal(stats.activeDays, 24);
  assert.equal(stats.totalDays, 31);
});

test('IM17: Cập nhật dữ liệu một ngày có lưu phiên bản và vết kiểm toán', async () => {
  GpsImportService.clearStore();
  const buf = fs.readFileSync(fileHino);

  // Nhập lần 1
  const prev1 = await GpsImportService.previewFile(buf, 'file1.xlsx');
  await GpsImportService.commitImport(prev1, 'user-01');

  // Tạo một bản sửa: ngày 2026-08-01 km từ 0 thành 50km
  const modifiedReport = JSON.parse(JSON.stringify(prev1.summaryReport));
  modifiedReport.days[0].kmGps = 50.0;

  const prevModified = {
    batchId: 'batch-mod-01',
    fileName: 'file1_mod.xlsx',
    fileHash: 'hash-mod-01',
    fileSize: 1000,
    reportType: 'summary',
    identifiedVehicles: ['51D-982.46'],
    periodRange: prev1.periodRange,
    totalRows: 31,
    newRows: 0,
    duplicateRows: 30,
    updatedRows: 1,
    errorRows: 0,
    summaryReport: modifiedReport,
  };

  await GpsImportService.commitImport(prevModified, 'user-01');

  // Kiểm tra nhật ký sau cập nhật
  const logs = await GpsImportService.getDailyLogs({ searchDate: '2026-08-01' });
  const d01 = logs.find(l => l.workDate === '2026-08-01');
  assert.ok(d01);
  assert.equal(d01.actualKm, 50.0);

  // Kiểm tra vết kiểm toán (Audit Logs)
  const audits = GpsImportService.getAuditLogs();
  assert.equal(audits.length, 1);
  assert.equal(audits[0].summaryKey, '51D-982.46_2026-08-01');
  assert.equal(audits[0].previousValues.kmGps, 0);
  assert.equal(audits[0].newValues.kmGps, 50.0);
});

test('IM05 & IM15: Nhập file hành trình Isuzu 27/07 và deduplication', async () => {
  GpsImportService.clearStore();
  const buf = fs.readFileSync(fileIsuzu);

  const prev = await GpsImportService.previewFile(buf, 'Bao_cao_hanh_trinh_51D69998.xlsx');
  assert.equal(prev.reportType, 'journey');
  assert.equal(prev.totalRows, 341);
  assert.equal(prev.newRows, 341);

  const batch = await GpsImportService.commitImport(prev, 'user-02');
  assert.equal(batch.stats.totalRows, 341);

  // Nhập lại cùng file hành trình
  const prevDup = await GpsImportService.previewFile(buf, 'Bao_cao_hanh_trinh_51D69998.xlsx');
  assert.equal(prevDup.newRows, 0);
  assert.equal(prevDup.duplicateRows, 341);
});
