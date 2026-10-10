/**
 * BỘ ĐỌC DỮ LIỆU EXCEL GPS BÌNH MINH (BÌNH MINH GPS PARSER)
 * 
 * Thực hiện hóa 100% Gói A và Gói D theo tài liệu:
 * docs/Phân hệ xe/KE_HOACH_HOAN_THIEN_IMPORT_GPS_BINH_MINH.md
 * 
 * Hỗ trợ nhận diện tự động 2 loại báo cáo:
 * 1. Mẫu 1: Báo cáo tổng hợp (theo ngày lịch)
 * 2. Mẫu 2: Báo cáo hành trình (theo sự kiện, cắt ngày công 04:00 - 04:00)
 */

import * as XLSX from "xlsx";

// =========================================================================
// KIỂU DỮ LIỆU BÁO CÁO TỔNG HỢP
// =========================================================================

export interface SummaryDayRow {
  stt: number;
  plate: string;
  normalizedPlate: string;
  businessType: string;
  vehicleType: string;
  calendarDate: string; // YYYY-MM-DD
  movingTimeStr: string;
  movingSeconds: number;
  kmGps: number;
  kmOdo: number; // Giữ nguyên số nguồn, không ghi đè đồng hồ ERP
  stopsCount: number;
  speedingCount: number;
  doorOpenCount: number;
  acOpenCount: number;
  acOpenTimeStr: string;
  reportedWorkingTimeStr: string;
  reportedWorkingSeconds: number; // Lưu đúng nhãn nguồn "TG làm việc theo GPS"
  continuous4hCount: number;
  fuelLiters: number;
  fuelNormKm: number;
  fuelNormHour: number;
  rawRowIndex: number;
}

export interface SummaryReportData {
  reportType: "summary";
  title: string;
  periodRange: string;
  identifiedVehicle: string;
  normalizedPlate: string;
  days: SummaryDayRow[];
  summaryRow: {
    rawLabel?: string;
    expectedDays?: number;
    totalKm: number;
    totalMovingSeconds: number;
    totalMovingTimeStr: string;
    totalWorkingSeconds: number;
    totalWorkingTimeStr: string;
    totalStops: number;
    totalSpeeding: number;
    totalContinuous4h: number;
    totalFuel: number;
  } | null;
  calculatedTotals: {
    totalDays: number;
    daysWithKm: number;
    totalKm: number;
    totalMovingSeconds: number;
    totalWorkingSeconds: number;
    totalStops: number;
    totalSpeeding: number;
    totalContinuous4h: number;
    totalFuel: number;
  };
  summaryReconciliation: {
    matched: boolean;
    discrepancies: string[];
  };
}

// =========================================================================
// KIỂU DỮ LIỆU BÁO CÁO HÀNH TRÌNH
// =========================================================================

export type JourneyEventType =
  | "xe_chay_binh_thuong"
  | "xe_dung"
  | "xe_chay_lai"
  | "mo_may"
  | "tat_may"
  | "xe_mat_gps"
  | "do_nhien_lieu"
  | "khac";

export interface JourneyEvent {
  stt: number;
  timestamp: number; // Epoch ms
  dateTimeStr: string; // HH:mm:ss DD/MM/YYYY
  dateStr: string; // YYYY-MM-DD (ngày lịch)
  timeStr: string; // HH:mm:ss
  workDate: string; // YYYY-MM-DD (ngày công 04:00 - 04:00)
  coords: { lat: number; lng: number } | null;
  rawCoords: string;
  address: string;
  rawNote: string;
  eventType: JourneyEventType;
  rawRowIndex: number;
}

export interface StopIntervalSegment {
  workDate: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  isBefore04h: boolean;
}

export interface StopInterval {
  id: string;
  originalStopId: string;
  startEvent: JourneyEvent;
  endEvent: JourneyEvent;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  durationMinutes: number;
  address: string;
  coords: { lat: number; lng: number } | null;
  crosses04h: boolean;
  workDate: string;
  segments?: StopIntervalSegment[];
}

export interface EnginePair {
  id: string;
  startEvent: JourneyEvent;
  endEvent: JourneyEvent;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  durationMinutes: number;
}

export interface WorkDaySummary {
  workDate: string;
  eventsCount: number;
  isPartialCoverage: boolean;
  coverageNote: string;
  candidateOvertime: {
    k1Mins: number; // 04:00 - 08:00
    k2Mins: number; // 17:00 - 22:00
    k3Mins: number; // 22:00 - 24:00
    k4Mins: number; // 00:00 - 04:00 hôm sau
    totalCandidateHours: number;
    status: string;
    warning: string;
  };
}

export interface JourneyReportData {
  reportType: "journey";
  title: string;
  periodRange: string;
  identifiedVehicle: string;
  normalizedPlate: string;
  events: JourneyEvent[];
  eventCounts: Record<string, number>;
  stops: StopInterval[];
  physicalStopsCount: number;
  stopsGe5mCount: number;
  enginePairs: EnginePair[];
  orphanEngineEvents: { row: number; time: string; note: string; reason: string }[];
  workDays: WorkDaySummary[];
}

// =========================================================================
// KẾT QUẢ PARSE TỔNG THỂ
// =========================================================================

export interface BinhMinhParseResult {
  success: boolean;
  sheetName: string;
  reportType: "summary" | "journey" | "unknown";
  summaryReport?: SummaryReportData;
  journeyReport?: JourneyReportData;
  warnings: string[];
  errors: string[];
}

// =========================================================================
// HÀM TIỆN ÍCH CHUẨN HÓA & PHÂN TÍCH
// =========================================================================

/**
 * Chuẩn hóa biển số xe Việt Nam: 51D98246 -> 51D-982.46, 51D69998 -> 51D-699.98
 */
export function normalizeVehiclePlate(plate: string): string {
  if (!plate) return "";
  const cleaned = plate.trim().toUpperCase().replace(/[\s\.\-_]/g, "");
  // Pattern 51D98246 -> 51D-982.46
  const match = cleaned.match(/^(\d{2}[A-Z]{1,2})(\d{3})(\d{2})$/);
  if (match) {
    return `${match[1]}-${match[2]}.${match[3]}`;
  }
  // Pattern 51D9824 -> 51D-9824 (biển 4 số cũ)
  const match4 = cleaned.match(/^(\d{2}[A-Z]{1,2})(\d{4})$/);
  if (match4) {
    return `${match4[1]}-${match4[2]}`;
  }
  return plate.trim();
}

/**
 * Chuyển chuỗi HH:mm:ss thành tổng số giây
 */
export function parseHmsToSeconds(hms: string | number | undefined): number {
  if (!hms) return 0;
  if (typeof hms === "number") {
    // Nếu là fraction of a day từ Excel
    return Math.round(hms * 86400);
  }
  const parts = String(hms).trim().split(":").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && !parts.some(isNaN)) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Định dạng số giây thành chuỗi HH:mm:ss
 */
export function formatSecondsToHms(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Phân tích ngày giờ an toàn từ ô Excel (tránh timezone lệch)
 */
export function parseExcelDateTime(cell: any): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm:ss
  formatted: string; // HH:mm:ss DD/MM/YYYY
  timestamp: number; // Epoch ms UTC
} {
  let y = 1970, m = 1, d = 1, H = 0, M = 0, S = 0;

  if (typeof cell?.v === "number") {
    const dc = XLSX.SSF.parse_date_code(cell.v);
    if (dc) {
      y = dc.y;
      m = dc.m;
      d = dc.d;
      H = dc.H;
      M = dc.M;
      S = dc.S;
    }
  } else if (cell?.w || typeof cell?.v === "string") {
    const str = (cell.w || cell.v || "").trim();
    // Regex dạng: HH:mm:ss DD/MM/YYYY
    const mTimeDate = str.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mTimeDate) {
      H = parseInt(mTimeDate[1], 10);
      M = parseInt(mTimeDate[2], 10);
      S = parseInt(mTimeDate[3], 10);
      d = parseInt(mTimeDate[4], 10);
      m = parseInt(mTimeDate[5], 10);
      y = parseInt(mTimeDate[6], 10);
    } else {
      // Regex dạng: DD/MM/YYYY
      const mDate = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mDate) {
        d = parseInt(mDate[1], 10);
        m = parseInt(mDate[2], 10);
        y = parseInt(mDate[3], 10);
      }
    }
  }

  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const timeStr = `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}:${String(S).padStart(2, "0")}`;
  const formatted = `${timeStr} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  const timestamp = Date.UTC(y, m - 1, d, H, M, S);

  return { year: y, month: m, day: d, hours: H, minutes: M, seconds: S, dateStr, timeStr, formatted, timestamp };
}

/**
 * Tính ngày công (Work Date 04:00 - 04:00 hôm sau):
 * - Nếu giờ < 4: thuộc ngày công hôm trước (calendarDate - 1 ngày)
 * - Nếu giờ >= 4: thuộc ngày công hôm nay (calendarDate)
 */
export function calculateWorkDate(year: number, month: number, day: number, hours: number): string {
  if (hours < 4) {
    // Trừ 1 ngày
    const prevDate = new Date(Date.UTC(year, month - 1, day - 1));
    const py = prevDate.getUTCFullYear();
    const pm = prevDate.getUTCMonth() + 1;
    const pd = prevDate.getUTCDate();
    return `${py}-${String(pm).padStart(2, "0")}-${String(pd).padStart(2, "0")}`;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Chuẩn hóa ghi chú nguồn sang loại sự kiện
 */
export function classifyJourneyNote(note: string): JourneyEventType {
  const n = (note || "").trim().toLowerCase();
  if (n.includes("chạy bình thường")) return "xe_chay_binh_thuong";
  if (n.includes("dừng")) return "xe_dung";
  if (n.includes("chạy lại")) return "xe_chay_lai";
  if (n.includes("mở máy")) return "mo_may";
  if (n.includes("tắt máy")) return "tat_may";
  if (n.includes("mất gps")) return "xe_mat_gps";
  if (n.includes("đổ nhiên liệu") || n.includes("nạp nhiên liệu")) return "do_nhien_lieu";
  return "khac";
}

// =========================================================================
// BỘ ĐỌC MẪU 1: BÁO CÁO TỔNG HỢP
// =========================================================================

export function parseSummarySheet(sheet: XLSX.WorkSheet): {
  data: SummaryReportData;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:S36");

  // Tìm tiêu đề và khoảng xuất
  let title = "";
  let periodRange = "";
  for (let r = 0; r <= 3; r++) {
    const valA = sheet[XLSX.utils.encode_cell({ r, c: 0 })]?.v;
    if (typeof valA === "string") {
      if (valA.includes("Báo cáo tổng hợp")) title = valA.trim();
      if (valA.includes("đến ngày") || valA.includes("Từ ngày")) periodRange = valA.trim();
    }
  }

  const days: SummaryDayRow[] = [];
  let summaryRow: SummaryReportData["summaryRow"] = null;
  let identifiedVehicle = "";

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const cellB = sheet[XLSX.utils.encode_cell({ r, c: 1 })];

    const valA = cellA?.v;
    const valB = cellB?.v;

    // Kiểm tra dòng tổng (thường B có nhãn 'Tổng' hoặc 'Tổng 31', hoặc A có nhãn 'Tổng')
    const strA = String(valA || "").trim();
    const strB = String(valB || "").trim();
    if (strA.toLowerCase().startsWith("tổng") || strB.toLowerCase().startsWith("tổng")) {
      const movingTimeStr = String(sheet[XLSX.utils.encode_cell({ r, c: 5 })]?.v || "00:00:00");
      const workTimeStr = String(sheet[XLSX.utils.encode_cell({ r, c: 13 })]?.v || "00:00:00");

      summaryRow = {
        rawLabel: strB || strA,
        expectedDays: parseInt((strB || strA).replace(/\D/g, ""), 10) || undefined,
        totalKm: Number(sheet[XLSX.utils.encode_cell({ r, c: 6 })]?.v || 0),
        totalMovingSeconds: parseHmsToSeconds(movingTimeStr),
        totalMovingTimeStr: movingTimeStr,
        totalWorkingSeconds: parseHmsToSeconds(workTimeStr),
        totalWorkingTimeStr: workTimeStr,
        totalStops: Number(sheet[XLSX.utils.encode_cell({ r, c: 8 })]?.v || 0),
        totalSpeeding: Number(sheet[XLSX.utils.encode_cell({ r, c: 9 })]?.v || 0),
        totalContinuous4h: Number(sheet[XLSX.utils.encode_cell({ r, c: 14 })]?.v || 0),
        totalFuel: Number(sheet[XLSX.utils.encode_cell({ r, c: 15 })]?.v || 0),
      };
      continue;
    }

    // Nếu STT là số hợp lệ (1, 2, ... 31)
    const stt = typeof valA === "number" ? valA : parseInt(String(valA), 10);
    if (!isNaN(stt) && stt > 0 && valB) {
      const plate = String(valB).trim();
      if (!identifiedVehicle) identifiedVehicle = plate;

      const dateCell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
      const parsedDate = parseExcelDateTime(dateCell);

      const movingTimeVal = sheet[XLSX.utils.encode_cell({ r, c: 5 })]?.v;
      const movingTimeStr = String(movingTimeVal || "00:00:00");
      const movingSec = parseHmsToSeconds(movingTimeVal);

      const workTimeVal = sheet[XLSX.utils.encode_cell({ r, c: 13 })]?.v;
      const workTimeStr = String(workTimeVal || "00:00:00");
      const workSec = parseHmsToSeconds(workTimeVal);

      const kmGps = Number(sheet[XLSX.utils.encode_cell({ r, c: 6 })]?.v || 0);
      const kmOdo = Number(sheet[XLSX.utils.encode_cell({ r, c: 7 })]?.v || 0);
      const stops = Number(sheet[XLSX.utils.encode_cell({ r, c: 8 })]?.v || 0);
      const speeding = Number(sheet[XLSX.utils.encode_cell({ r, c: 9 })]?.v || 0);
      const continuous4h = Number(sheet[XLSX.utils.encode_cell({ r, c: 14 })]?.v || 0);
      const fuel = Number(sheet[XLSX.utils.encode_cell({ r, c: 15 })]?.v || 0);

      days.push({
        stt,
        plate,
        normalizedPlate: normalizeVehiclePlate(plate),
        businessType: String(sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v || "").trim(),
        vehicleType: String(sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v || "").trim(),
        calendarDate: parsedDate.dateStr,
        movingTimeStr,
        movingSeconds: movingSec,
        kmGps,
        kmOdo,
        stopsCount: stops,
        speedingCount: speeding,
        doorOpenCount: Number(sheet[XLSX.utils.encode_cell({ r, c: 10 })]?.v || 0),
        acOpenCount: Number(sheet[XLSX.utils.encode_cell({ r, c: 11 })]?.v || 0),
        acOpenTimeStr: String(sheet[XLSX.utils.encode_cell({ r, c: 12 })]?.v || "00:00:00"),
        reportedWorkingTimeStr: workTimeStr,
        reportedWorkingSeconds: workSec,
        continuous4hCount: continuous4h,
        fuelLiters: fuel,
        fuelNormKm: Number(sheet[XLSX.utils.encode_cell({ r, c: 16 })]?.v || 0),
        fuelNormHour: Number(sheet[XLSX.utils.encode_cell({ r, c: 17 })]?.v || 0),
        rawRowIndex: r + 1,
      });
    }
  }

  // Tính tổng thực tế từ 31 ngày
  let totalKm = 0;
  let totalMovingSeconds = 0;
  let totalWorkingSeconds = 0;
  let totalStops = 0;
  let totalSpeeding = 0;
  let totalContinuous4h = 0;
  let totalFuel = 0;
  let daysWithKm = 0;

  days.forEach((d) => {
    totalKm += d.kmGps;
    totalMovingSeconds += d.movingSeconds;
    totalWorkingSeconds += d.reportedWorkingSeconds;
    totalStops += d.stopsCount;
    totalSpeeding += d.speedingCount;
    totalContinuous4h += d.continuous4hCount;
    totalFuel += d.fuelLiters;
    if (d.kmGps > 0) daysWithKm++;
  });

  totalKm = Math.round(totalKm * 10) / 10;

  const calculatedTotals = {
    totalDays: days.length,
    daysWithKm,
    totalKm,
    totalMovingSeconds,
    totalWorkingSeconds,
    totalStops,
    totalSpeeding,
    totalContinuous4h,
    totalFuel,
  };

  // Đối chiếu với dòng tổng nguồn
  const discrepancies: string[] = [];
  if (summaryRow) {
    if (summaryRow.expectedDays && summaryRow.expectedDays !== days.length) {
      discrepancies.push(`Số ngày dòng tổng (${summaryRow.expectedDays}) khác số ngày chi tiết (${days.length})`);
    }
    if (Math.abs(summaryRow.totalKm - totalKm) > 0.1) {
      discrepancies.push(`Tổng Km (${totalKm}) lệch dòng tổng nguồn (${summaryRow.totalKm})`);
    }
    if (summaryRow.totalMovingSeconds !== totalMovingSeconds) {
      discrepancies.push(`Thời gian lăn bánh (${formatSecondsToHms(totalMovingSeconds)}) lệch nguồn (${summaryRow.totalMovingTimeStr})`);
    }
    if (summaryRow.totalWorkingSeconds !== totalWorkingSeconds) {
      discrepancies.push(`TG làm việc theo GPS (${formatSecondsToHms(totalWorkingSeconds)}) lệch nguồn (${summaryRow.totalWorkingTimeStr})`);
    }
    if (summaryRow.totalStops !== totalStops) {
      discrepancies.push(`Số lần dừng (${totalStops}) lệch dòng tổng nguồn (${summaryRow.totalStops})`);
    }
    if (summaryRow.totalFuel !== totalFuel) {
      discrepancies.push(`Nhiên liệu tiêu thụ (${totalFuel}L) lệch dòng tổng nguồn (${summaryRow.totalFuel}L)`);
    }
  } else {
    warnings.push("Không tìm thấy dòng tổng hợp 'Tổng' trong sheet để đối soát.");
  }

  return {
    data: {
      reportType: "summary",
      title: title || "Báo cáo tổng hợp",
      periodRange,
      identifiedVehicle,
      normalizedPlate: normalizeVehiclePlate(identifiedVehicle),
      days,
      summaryRow,
      calculatedTotals,
      summaryReconciliation: {
        matched: discrepancies.length === 0,
        discrepancies,
      },
    },
    warnings,
    errors,
  };
}

// =========================================================================
// BỘ ĐỌC MẪU 2: BÁO CÁO HÀNH TRÌNH
// =========================================================================

export function parseJourneySheet(sheet: XLSX.WorkSheet): {
  data: JourneyReportData;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:E345");

  // Tìm tiêu đề và biển số trong các hàng 1..4
  let title = "";
  let periodRange = "";
  let rawPlate = "";

  for (let r = 0; r <= 3; r++) {
    const valA = sheet[XLSX.utils.encode_cell({ r, c: 0 })]?.v;
    if (typeof valA === "string") {
      if (valA.includes("Báo cáo hành trình") || valA.includes("Báo cáo QCVN 06")) {
        title = valA.trim();
        // Trích xuất biển số từ tiêu đề (ví dụ 51D69998 hoặc 51D-699.98)
        const matchPlate = title.match(/(\d{2}[A-Z]{1,2}[-_]?\d{3,5}(?:\.\d{2})?)/i);
        if (matchPlate) {
          rawPlate = matchPlate[1];
        }
      }
      if (valA.includes("đến ngày") || valA.includes("Từ ngày")) {
        periodRange = valA.trim();
      }
    }
  }

  const events: JourneyEvent[] = [];
  const eventCounts: Record<string, number> = {};

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const cellB = sheet[XLSX.utils.encode_cell({ r, c: 1 })];

    const valA = cellA?.v;
    const stt = typeof valA === "number" ? valA : parseInt(String(valA), 10);

    if (!isNaN(stt) && stt > 0 && cellB) {
      const dt = parseExcelDateTime(cellB);
      const rawCoords = String(sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v || "").trim();
      const address = String(sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v || "").trim();
      const rawNote = String(sheet[XLSX.utils.encode_cell({ r, c: 4 })]?.v || "").trim();

      // Phân tích tọa độ lat, lng
      let coords: { lat: number; lng: number } | null = null;
      if (rawCoords) {
        const parts = rawCoords.split(",").map((s) => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          coords = { lat: parts[0], lng: parts[1] };
        }
      }

      const eventType = classifyJourneyNote(rawNote);
      eventCounts[rawNote] = (eventCounts[rawNote] || 0) + 1;

      // Tính ngày công 04:00 - 04:00
      const workDate = calculateWorkDate(dt.year, dt.month, dt.day, dt.hours);

      events.push({
        stt,
        timestamp: dt.timestamp,
        dateTimeStr: dt.formatted,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        workDate,
        coords,
        rawCoords,
        address,
        rawNote,
        eventType,
        rawRowIndex: r + 1,
      });
    }
  }

  // Sắp xếp sự kiện tăng dần theo thời gian
  events.sort((a, b) => a.timestamp - b.timestamp);

  // 1. GHÉP KHOẢNG DỪNG (Xe dừng -> Xe chạy lại hoặc Xe chạy bình thường)
  const stops: StopInterval[] = [];
  let currentStopStart: JourneyEvent | null = null;
  let stopCounter = 0;

  for (const ev of events) {
    if (ev.eventType === "xe_dung") {
      if (!currentStopStart) {
        currentStopStart = ev;
      }
    } else if (ev.eventType === "xe_chay_lai" || ev.eventType === "xe_chay_binh_thuong") {
      if (currentStopStart) {
        stopCounter++;
        const durationSec = Math.round((ev.timestamp - currentStopStart.timestamp) / 1000);
        const originalId = `stop-${stopCounter}`;

        // Kiểm tra xem khoảng dừng có cắt qua mốc 04:00:00 không
        const startDate = new Date(currentStopStart.timestamp);
        const endDate = new Date(ev.timestamp);

        // Mốc 04:00 của ngày kết thúc
        const fourAmTimestamp = Date.UTC(
          endDate.getUTCFullYear(),
          endDate.getUTCMonth(),
          endDate.getUTCDate(),
          4,
          0,
          0
        );

        const crosses04h = currentStopStart.timestamp < fourAmTimestamp && ev.timestamp > fourAmTimestamp;

        let segments: StopIntervalSegment[] | undefined;
        if (crosses04h) {
          const p1Sec = Math.round((fourAmTimestamp - currentStopStart.timestamp) / 1000);
          const p2Sec = Math.round((ev.timestamp - fourAmTimestamp) / 1000);
          segments = [
            {
              workDate: currentStopStart.workDate,
              startTime: currentStopStart.timeStr,
              endTime: "04:00:00",
              durationSeconds: p1Sec,
              isBefore04h: true,
            },
            {
              workDate: ev.workDate,
              startTime: "04:00:00",
              endTime: ev.timeStr,
              durationSeconds: p2Sec,
              isBefore04h: false,
            },
          ];
        }

        stops.push({
          id: originalId,
          originalStopId: originalId,
          startEvent: currentStopStart,
          endEvent: ev,
          startTime: currentStopStart.timeStr,
          endTime: ev.timeStr,
          durationSeconds: durationSec,
          durationMinutes: Math.round(durationSec / 60),
          address: currentStopStart.address || ev.address,
          coords: currentStopStart.coords || ev.coords,
          crosses04h,
          workDate: currentStopStart.workDate,
          segments,
        });

        currentStopStart = null;
      }
    }
  }

  const physicalStopsCount = stops.length;
  const stopsGe5mCount = stops.filter((s) => s.durationSeconds >= 300).length;

  // 2. GHÉP CẶP MỞ MÁY / TẮT MÁY
  const enginePairs: EnginePair[] = [];
  const orphanEngineEvents: { row: number; time: string; note: string; reason: string }[] = [];
  let curEngineStart: JourneyEvent | null = null;
  let engineCounter = 0;

  for (const ev of events) {
    if (ev.eventType === "mo_may") {
      if (curEngineStart) {
        orphanEngineEvents.push({
          row: curEngineStart.rawRowIndex,
          time: curEngineStart.dateTimeStr,
          note: curEngineStart.rawNote,
          reason: "Mở máy liên tiếp mà không có tắt máy ở giữa",
        });
      }
      curEngineStart = ev;
    } else if (ev.eventType === "tat_may") {
      if (curEngineStart) {
        engineCounter++;
        const durationSec = Math.round((ev.timestamp - curEngineStart.timestamp) / 1000);
        enginePairs.push({
          id: `eng-${engineCounter}`,
          startEvent: curEngineStart,
          endEvent: ev,
          startTime: curEngineStart.timeStr,
          endTime: ev.timeStr,
          durationSeconds: durationSec,
          durationMinutes: Math.round(durationSec / 60),
        });
        curEngineStart = null;
      } else {
        orphanEngineEvents.push({
          row: ev.rawRowIndex,
          time: ev.dateTimeStr,
          note: ev.rawNote,
          reason: "Tắt máy không có sự kiện mở máy trước đó trong file",
        });
      }
    }
  }

  // 3. TÍNH TOÁN NGÀY CÔNG & 4 KHUNG GIỜ ỨNG VIÊN
  const workDayMap = new Map<string, JourneyEvent[]>();
  for (const ev of events) {
    if (!workDayMap.has(ev.workDate)) {
      workDayMap.set(ev.workDate, []);
    }
    workDayMap.get(ev.workDate)!.push(ev);
  }

  const workDays: WorkDaySummary[] = [];

  for (const [wDate, wEvents] of workDayMap.entries()) {
    // Tính khung giờ ứng viên từ các cặp máy nổ
    // Căn cứ ngày công wDate:
    // K1: 04:00 - 08:00 (cùng ngày wDate)
    // K2: 17:00 - 22:00 (cùng ngày wDate)
    // K3: 22:00 - 24:00 (cùng ngày wDate)
    // K4: 00:00 - 04:00 (ngày wDate + 1)
    const [y, m, d] = wDate.split("-").map(Number);
    const t04_00 = Date.UTC(y, m - 1, d, 4, 0, 0);
    const t08_00 = Date.UTC(y, m - 1, d, 8, 0, 0);
    const t17_00 = Date.UTC(y, m - 1, d, 17, 0, 0);
    const t22_00 = Date.UTC(y, m - 1, d, 22, 0, 0);
    const t24_00 = Date.UTC(y, m - 1, d, 24, 0, 0);
    const t04_next = Date.UTC(y, m - 1, d + 1, 4, 0, 0);

    let secK1 = 0;
    let secK2 = 0;
    let secK3 = 0;
    let secK4 = 0;

    for (const pair of enginePairs) {
      const s = pair.startEvent.timestamp;
      const e = pair.endEvent.timestamp;

      // Tính overlap
      const overlap = (wStart: number, wEnd: number) => {
        const start = Math.max(s, wStart);
        const end = Math.min(e, wEnd);
        return Math.max(0, Math.round((end - start) / 1000));
      };

      secK1 += overlap(t04_00, t08_00);
      secK2 += overlap(t17_00, t22_00);
      secK3 += overlap(t22_00, t24_00);
      secK4 += overlap(t24_00, t04_next);
    }

    const k1Mins = Math.round(secK1 / 60);
    const k2Mins = Math.round(secK2 / 60);
    const k3Mins = Math.round(secK3 / 60);
    const k4Mins = Math.round(secK4 / 60);
    const totalCandidateHours = Math.round(((secK1 + secK2 + secK3 + secK4) / 3600) * 100) / 100;

    // Cờ thiếu phủ (file chỉ có ngày lịch nên 26/07 thiếu đầu 04h-24h, 27/07 thiếu đuôi 18h-04h hôm sau)
    const minEventTime = wEvents[0].timeStr;
    const maxEventTime = wEvents[wEvents.length - 1].timeStr;
    const isPartial = wEvents.length < 50 || maxEventTime < "20:00:00";
    const coverageNote = isPartial
      ? `Quan sát từ ${minEventTime} đến ${maxEventTime}. File lịch thiếu phủ đầu/đuôi cho trọn vẹn ngày công 04h-04h.`
      : "Đầy đủ mốc quan sát.";

    workDays.push({
      workDate: wDate,
      eventsCount: wEvents.length,
      isPartialCoverage: isPartial,
      coverageNote,
      candidateOvertime: {
        k1Mins,
        k2Mins,
        k3Mins,
        k4Mins,
        totalCandidateHours,
        status: "Theo trạng thái GPS, chưa đủ căn cứ duyệt",
        warning: "Chưa xác minh máy nổ thực và chưa gắn lệnh điều xe. Không tự sinh tiền lương.",
      },
    });
  }

  // Sắp xếp ngày công
  workDays.sort((a, b) => a.workDate.localeCompare(b.workDate));

  return {
    data: {
      reportType: "journey",
      title: title || "Báo cáo hành trình",
      periodRange,
      identifiedVehicle: rawPlate,
      normalizedPlate: normalizeVehiclePlate(rawPlate),
      events,
      eventCounts,
      stops,
      physicalStopsCount,
      stopsGe5mCount,
      enginePairs,
      orphanEngineEvents,
      workDays,
    },
    warnings,
    errors,
  };
}

// =========================================================================
// HÀM CHÍNH: TỰ ĐỘNG NHẬN DIỆN VÀ ĐỌC WORKBOOK
// =========================================================================

export function parseBinhMinhWorkbook(buffer: ArrayBuffer | Buffer | Uint8Array): BinhMinhParseResult[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const results: BinhMinhParseResult[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) continue;

    // Quét ô A2, A3, A4 để nhận dạng loại báo cáo
    const a2 = String(sheet["A2"]?.v || "");
    const a3 = String(sheet["A3"]?.v || "");
    const a4 = String(sheet["A4"]?.v || "");
    const headerCombined = `${a2} ${a3} ${a4}`.toLowerCase();

    if (headerCombined.includes("hành trình") || headerCombined.includes("qcvn 06")) {
      const parsed = parseJourneySheet(sheet);
      results.push({
        success: true,
        sheetName,
        reportType: "journey",
        journeyReport: parsed.data,
        warnings: parsed.warnings,
        errors: parsed.errors,
      });
    } else if (headerCombined.includes("tổng hợp")) {
      const parsed = parseSummarySheet(sheet);
      results.push({
        success: true,
        sheetName,
        reportType: "summary",
        summaryReport: parsed.data,
        warnings: parsed.warnings,
        errors: parsed.errors,
      });
    } else {
      results.push({
        success: false,
        sheetName,
        reportType: "unknown",
        warnings: [`Sheet '${sheetName}' không khớp định dạng Báo cáo tổng hợp hoặc Báo cáo hành trình Bình Minh.`],
        errors: [],
      });
    }
  }

  return results;
}
