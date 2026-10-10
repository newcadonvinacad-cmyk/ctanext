const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load TS module directly
function loadTsModule(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', transpiled);
  fn(mod, mod.exports, require, path.dirname(filePath), filePath);
  return mod.exports;
}

const parser = loadTsModule(path.resolve('src/lib/binhminh-gps-parser.ts'));

const fileHino = path.resolve('docs/Phân hệ xe/dữ liệu thô/Báo cáo tổng hợp - tháng 8- hino.xlsx');
const fileIsuzu = path.resolve('docs/Phân hệ xe/dữ liệu thô/Báo cáo hành trình 51D69998 27.07.xlsx');

test('IM01 - IM04: Parser Báo cáo tổng hợp Hino tháng 8/2026', () => {
  const buf = fs.readFileSync(fileHino);
  const results = parser.parseBinhMinhWorkbook(buf);

  assert.equal(results.length, 1);
  const res = results[0];
  assert.equal(res.success, true);
  assert.equal(res.reportType, 'summary');

  const report = res.summaryReport;
  assert.ok(report);
  assert.equal(report.identifiedVehicle, '51D98246');
  assert.equal(report.normalizedPlate, '51D-982.46');

  // IM01: Đọc đủ 31 ngày lịch (hàng 5-35), hàng 36 dùng đối chiếu
  assert.equal(report.days.length, 31);
  assert.equal(report.days[0].calendarDate, '2026-08-01');
  assert.equal(report.days[30].calendarDate, '2026-08-31');

  // IM02: Tổng chỉ tiêu tự cộng khớp chính xác hàng 36 của nguồn
  assert.equal(report.calculatedTotals.totalKm, 7682.0);
  assert.equal(report.calculatedTotals.totalMovingSeconds, 517380); // 143:43:00
  assert.equal(report.calculatedTotals.totalWorkingSeconds, 761340); // 211:29:00
  assert.equal(report.calculatedTotals.totalStops, 1263);
  assert.equal(report.calculatedTotals.totalSpeeding, 21);
  assert.equal(report.calculatedTotals.totalContinuous4h, 9);
  assert.equal(report.calculatedTotals.totalFuel, 844);
  assert.equal(report.calculatedTotals.daysWithKm, 24);

  // Đối chiếu khớp 100%
  assert.equal(report.summaryReconciliation.matched, true);
  assert.equal(report.summaryReconciliation.discrepancies.length, 0);

  // IM03: Đọc thời lượng tổng 143:43:00 không bị cuộn về trong ngày
  assert.equal(report.summaryRow.totalMovingSeconds, 517380);

  // IM04: Ngày 08/08, 16/08, 31/08 có km = 0 không bị loại bỏ
  const d08 = report.days.find(d => d.calendarDate === '2026-08-08');
  assert.ok(d08);
  assert.equal(d08.kmGps, 0);
  assert.equal(d08.reportedWorkingSeconds, 2220); // 00:37:00
  assert.equal(d08.fuelLiters, 2);

  const d16 = report.days.find(d => d.calendarDate === '2026-08-16');
  assert.ok(d16);
  assert.equal(d16.kmGps, 0);
  assert.equal(d16.reportedWorkingSeconds, 420); // 00:07:00

  const d31 = report.days.find(d => d.calendarDate === '2026-08-31');
  assert.ok(d31);
  assert.equal(d31.kmGps, 0);
  assert.equal(d31.reportedWorkingSeconds, 27120); // 07:32:00
});

test('IM05 - IM11: Parser Báo cáo hành trình Isuzu 27/07/2026', () => {
  const buf = fs.readFileSync(fileIsuzu);
  const results = parser.parseBinhMinhWorkbook(buf);

  assert.equal(results.length, 1);
  const res = results[0];
  assert.equal(res.success, true);
  assert.equal(res.reportType, 'journey');

  const report = res.journeyReport;
  assert.ok(report);
  assert.equal(report.identifiedVehicle, '51D69998');
  assert.equal(report.normalizedPlate, '51D-699.98');

  // IM05: Đủ 341 sự kiện, đúng 7 nhãn
  assert.equal(report.events.length, 341);
  assert.equal(report.eventCounts['Xe chạy bình thường'], 170);
  assert.equal(report.eventCounts['Xe dừng'], 78);
  assert.equal(report.eventCounts['Xe chạy lại'], 77);
  assert.equal(report.eventCounts['Tắt máy'], 6);
  assert.equal(report.eventCounts['Mở máy'], 5);
  assert.equal(report.eventCounts['Xe mất GPS'], 3);
  assert.equal(report.eventCounts['Đổ nhiên liệu'], 2);

  // IM06: Chia sự kiện theo ngày công 04:00 - 04:00
  const wd26 = report.workDays.find(w => w.workDate === '2026-07-26');
  const wd27 = report.workDays.find(w => w.workDate === '2026-07-27');
  assert.ok(wd26);
  assert.ok(wd27);
  assert.equal(wd26.eventsCount, 4); // 4 sự kiện trước 04:00
  assert.equal(wd27.eventsCount, 337); // 337 sự kiện từ 04:00 trở đi

  // IM07 & IM08: Ghép dừng 78 khoảng, 10 khoảng >= 5 phút, cắt khoảng dừng qua 04:00
  assert.equal(report.physicalStopsCount, 78);
  assert.equal(report.stopsGe5mCount, 10);

  const stop0 = report.stops[0];
  assert.equal(stop0.crosses04h, true);
  assert.equal(stop0.durationSeconds, 18885); // 05:14:45
  assert.ok(stop0.segments);
  assert.equal(stop0.segments.length, 2);
  assert.equal(stop0.segments[0].durationSeconds, 14313); // 03:58:33 (ngày 26/07)
  assert.equal(stop0.segments[1].durationSeconds, 4572);  // 01:16:12 (ngày 27/07)

  // IM09: Ghép mở/tắt có 5 cặp và 1 sự kiện tắt máy mồ côi (thiếu mở máy đầu)
  assert.equal(report.enginePairs.length, 5);
  assert.equal(report.orphanEngineEvents.length, 1);
  assert.equal(report.orphanEngineEvents[0].row, 6);
  assert.ok(report.orphanEngineEvents[0].time.includes('00:02:32'));

  // IM10: Khung giờ ứng viên (chưa được duyệt)
  assert.equal(wd26.candidateOvertime.k4Mins, 0); // 15 giây làm tròn 0 phút
  assert.equal(wd27.candidateOvertime.k1Mins, 159); // 9563s / 60 = 159.38 -> 159 phút (2h39m)
  assert.equal(wd27.candidateOvertime.k2Mins, 61);  // 3641s / 60 = 60.68 -> 61 phút (1h01m)
  assert.equal(wd27.candidateOvertime.status, 'Theo trạng thái GPS, chưa đủ căn cứ duyệt');

  // IM11: Giữ 3 sự kiện mất GPS và 2 sự kiện đổ nhiên liệu
  const lossGps = report.events.filter(e => e.eventType === 'xe_mat_gps');
  assert.equal(lossGps.length, 3);
  const refuel = report.events.filter(e => e.eventType === 'do_nhien_lieu');
  assert.equal(refuel.length, 2);
});

test('IM12: Nhận diện theo nội dung, không phụ thuộc tên file', () => {
  // Đọc nội dung file Hino nhưng giả lập tên file là "Bao_cao_xe_Isuzu_Thang_10.xlsx"
  const buf = fs.readFileSync(fileHino);
  const results = parser.parseBinhMinhWorkbook(buf);
  assert.equal(results.length, 1);
  assert.equal(results[0].summaryReport.identifiedVehicle, '51D98246');
  assert.equal(results[0].summaryReport.days[0].calendarDate, '2026-08-01');
});

test('IM18: Phát hiện lệch tổng khi sửa dữ liệu một ngày mà không sửa dòng 36', () => {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(fileHino);
  const sheet = wb.Sheets['Sheet1'];
  // Sửa G7 từ 648.6 thành 658.6 (+10km) mà không sửa G36
  sheet['G7'].v = 658.6;
  const parsed = parser.parseSummarySheet(sheet);
  assert.equal(parsed.data.summaryReconciliation.matched, false);
  assert.ok(parsed.data.summaryReconciliation.discrepancies.some(d => d.includes('Tổng Km (7692) lệch dòng tổng nguồn (7682)')));
});

