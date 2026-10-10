/**
 * DỊCH VỤ PHÂN HỆ ĐỘI XE & VẬN CHUYỂN (SIGNAGE FLEET SERVICE)
 * Thực hiện hóa 100% bản thiết kế THIET_KE_PHAN_HE_DOI_XE_VA_VAN_CHUYEN.md
 * Bao gồm đầy đủ 7 phân hệ nghiệp vụ, các công thức tăng ca 4 khung giờ,
 * đối soát GPS Bình Minh, 3 khái niệm nhiên liệu, quy trình vấn đề 5 bước,
 * lịch hạn xe & tài xế, và động cơ phân bổ chi phí dự án chuẩn xác.
 */

export interface Vehicle {
  id: string;
  code: string;
  plateNo: string;
  name: string;
  model: string;
  voltageSystem: "12V" | "24V";
  voltageThreshold: number; // 26V cho Hino 24V, 12.6V cho Isuzu 12V
  maxPayloadKg: number;
  payloadVerified: boolean;
  fuelRateMoving: number; // L/100km (10L cho Hino, 9L cho Isuzu)
  fuelRateIdle: number; // L/h (2L/h)
  stdSpeedKmh: number; // 55 km/h cho Hino, 47 km/h cho Isuzu
  currentOdoKm: number;
  lastOdoUpdate: string;
  managingWorkshop: string;
  defaultDriverId: string;
  defaultDriverName: string;
  status: "available" | "in_maintenance" | "suspended" | "inactive";
  suspendReason?: string;
  yearManufactured: number;
}

export interface DriverProfile {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  licenseClass: string;
  licenseNumber: string;
  licenseExpiry: string;
  healthCertExpiry: string;
  defaultVehicleId: string;
  status: "active" | "on_leave" | "suspended";
}

export interface DispatchJob {
  id: string;
  sequence: number;
  jobType: "workshop_transfer" | "site_materials" | "project_delivery" | "survey" | "maintenance" | "other";
  title: string;
  fromLocation: string;
  toLocation: string;
  projectId?: string;
  projectName?: string;
  plannedStartTime: string;
  plannedEndTime: string;
  plannedKm: number;
  payloadKg: number;
  allowOtMorning: boolean; // 04:00 - 08:00
  allowOtEveningNight: boolean; // 17:00 - 04:00
  notes?: string;
}

export interface DispatchOrder {
  id: string;
  orderCode: string;
  workDate: string; // YYYY-MM-DD (Ngày công 04:00 - 04:00)
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  status: "draft" | "issued" | "in_progress" | "completed" | "cancelled";
  version: number;
  journeyGroupCode?: string; // Nhóm hành trình đi tỉnh nhiều ngày
  isProvincialMultiDay?: boolean;
  creationTiming: "before_trip" | "supplemented_same_day" | "backfilled";
  jobs: DispatchJob[];
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
}

export interface StopPoint {
  id: string;
  stopNo: number;
  address: string;
  coords?: { lat: number; lng: number };
  startTime: string;
  endTime: string;
  durationMinutes: number;
  idleEngineMinutes: number;
  engineStatusEvaluation: "short_stop" | "engine_off" | "engine_not_off" | "partial_off" | "unverified";
  category: "matched_order_job" | "workshop_load_unload" | "fuel_refill" | "meal_rest" | "maintenance" | "overnight_parking" | "out_of_order" | "unclear";
  matchedJobId?: string;
  notes?: string;
}

export interface EngineCycle {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceKm: number;
  otMorningMins: number; // 04-08h
  otEveningMins: number; // 17-22h
  otLateNightMins: number; // 22-24h
  otMidnightMins: number; // 00-04h D+1
}

export interface DailyLog {
  id: string;
  workDate: string; // Ngày công 04:00 D -> 04:00 D+1
  vehicleId: string;
  vehiclePlate: string;
  actualDriverId: string;
  actualDriverName: string;
  dispatchOrderId?: string;
  dispatchOrderCode?: string;
  plannedKm: number;
  actualKm: number;
  kmVariancePercent: number;
  actualMovingHours: number;
  activityWindowHours: number; // Mốc mở đầu - mốc tắt cuối
  idleEngineHours: number; // Nổ máy đứng yên
  movingRatioPercent: number; // Giờ lăn bánh / Khoảng hoạt động
  avgMovingSpeedKmh: number;
  dataSource: "gps_binh_minh" | "manual_entry";
  dataCompleteness: "complete" | "missing_engine_cycles" | "missing_gps" | "unreconciled_conflict";
  stopsCount: number;
  stops: StopPoint[];
  engineCycles: EngineCycle[];
  // Ảnh Zalo & kiểm lốp
  photosStatus: {
    departureVerified: boolean;
    deliveryStopsVerified: boolean;
    returnWorkshopVerified: boolean; // Với chuyến nhiều ngày giữa kỳ thì không áp dụng
    isReturnNotApplicable?: boolean;
    tyreCondition: "pass" | "issue" | "uninspected";
    tyreNote?: string;
  };
  reconciliationStatus: "unreconciled" | "pending_review" | "reconciled" | "flagged_issue";
}

export interface OvertimeApprovalRecord {
  id: string;
  workDate: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  dailyLogId: string;
  dispatchOrderId?: string;
  hasOrder: boolean;
  orderAllowsMorningOt: boolean;
  orderAllowsEveningOt: boolean;
  // 4 Khung đề xuất từ GPS
  minsK1_Morning: number; // 04-08h (75k)
  minsK2_Evening: number; // 17-22h (50k)
  minsK3_LateNight: number; // 22-24h (75k)
  minsK4_Midnight: number; // 00-04h (100k)
  proposedTotalHours: number;
  proposedTotalAmount: number;
  // Các chỉ báo kiểm tra định mức
  kmVariancePercent: number; // >15% cần giải trình
  speedRatioPercent: number; // <70% chuẩn cần giải trình
  lateReturnMinutes: number; // >30p cần giải trình
  requiresExplanation: boolean;
  explanationNote?: string;
  // Quyết định phê duyệt
  approvalStatus: "pending" | "approved_full" | "approved_partial" | "rejected";
  approvedMinsK1: number;
  approvedMinsK2: number;
  approvedMinsK3: number;
  approvedMinsK4: number;
  approvedTotalAmount: number;
  approvalMode?: "by_windows" | "proportional";
  approvedBy?: string;
  approvedAt?: string;
  decisionReason?: string;
  hrmSynced: boolean;
  hrmPeriod?: string;
}

export interface FuelRefillRecord {
  id: string;
  refillTime: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  gasStation: string;
  invoiceNumber?: string;
  invoiceLiters: number;
  unitPriceVnd: number;
  totalAmountVnd: number;
  currentOdoKm: number;
  isFullTank: boolean;
  gpsReportedLiters?: number;
  fuelVariancePercent?: number; // |Hóa đơn - GPS| / Hóa đơn
  isVarianceAlert: boolean; // >10%
  photoReceiptAttached: boolean;
  photoPumpAttached: boolean;
  payerType: "company" | "driver" | "allocated_project";
  relatedProjectId?: string;
  notes?: string;
}

export interface FleetExpenseRecord {
  id: string;
  expenseDate: string;
  vehicleId: string;
  vehiclePlate: string;
  expenseType: "fuel" | "overtime" | "toll_epass" | "parking" | "maintenance" | "repair_parts" | "tyres" | "inspection_insurance" | "incident_penalty" | "other";
  amountVnd: number;
  payer: "company" | "driver" | "supplier_offset";
  allocationTarget: "direct_project" | "general_fleet_pool" | "internal_operations";
  targetProjectId?: string;
  targetProjectName?: string;
  invoiceDocNo?: string;
  isConfirmed: boolean;
  sourceReferenceId?: string; // Id đổ dầu, ID OT, ID sự cố
  paymentStatus: "paid" | "pending_payment" | "salary_deduction";
  description: string;
}

export interface VehicleIncidentIssue {
  id: string;
  issueCode: string;
  occurredDate: string;
  detectedDate: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId?: string;
  driverName?: string;
  issueType: "unauthorized_trip" | "overload" | "long_idle_engine" | "overspeed" | "continuous_drive_over_4h" | "over_internal_drive_hours" | "missing_photo_tyre" | "fuel_refill_anomaly" | "fuel_over_standard" | "document_maintenance_expired" | "tyre_puncture" | "traffic_penalty" | "accident_damage";
  severity: "low" | "medium" | "high";
  source: "auto_detected_gps" | "auto_detected_log" | "auto_detected_schedule" | "manual_reported";
  description: string;
  status: "new" | "pending_explanation" | "pending_decision" | "in_progress" | "closed";
  assignedTo: string;
  dueDate: string;
  explanation?: string;
  managerDecision?: "accepted_explanation" | "written_warning" | "vehicle_repair_required" | "adjust_dispatch" | "penalty_driver_responsible";
  rootCause?: string;
  actionTaken?: string;
  relatedExpenseAmountVnd?: number;
  isRecurring: boolean; // >=3 vụ trong 90 ngày
  recurringCount?: number;
  createdAt: string;
  closedAt?: string;
}

export interface MaintenanceScheduleItem {
  id: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  targetType: "vehicle" | "driver";
  itemType: "registry_inspection" | "insurance_civil" | "insurance_body" | "road_toll_fee" | "gps_service" | "epass_balance" | "periodic_maintenance" | "tyre_rotation" | "driver_license" | "driver_health";
  title: string;
  cycleMonths?: number;
  cycleKm?: number;
  lastPerformedDate: string;
  lastPerformedOdoKm?: number;
  expiryDate?: string;
  expiryOdoKm?: number;
  status: "valid" | "warning_due_soon" | "overdue" | "not_applicable" | "unverified";
  daysRemaining?: number;
  kmRemaining?: number;
  notes?: string;
}

export interface ProjectCostAllocationSummary {
  periodMonth: string; // YYYY-MM
  vehicleId: string;
  vehiclePlate: string;
  totalDirectCosts: number;
  totalGeneralPoolCosts: number;
  totalKmRun: number;
  costPerKm: number;
  allocations: {
    targetId: string;
    targetName: string;
    targetKind: "project" | "internal_operations" | "unallocated";
    actualKmServed: number;
    daysServed: number;
    weightPercent: number;
    directExpenseAmount: number;
    allocatedGeneralAmount: number;
    totalAmount: number;
  }[];
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}

// =========================================================================
// MẪU DỮ LIỆU BAN ĐẦU THEO ĐÚNG BỐI CẢNH AN AN & ĐẶC TẢ KHÁCH HÀNG
// =========================================================================

export const SEED_VEHICLES: Vehicle[] = [
  {
    id: "veh-01",
    code: "XE-HINO-01",
    plateNo: "51D-982.46",
    name: "Xe tải HINO 1.75T",
    model: "HINO XZU650L",
    voltageSystem: "24V",
    voltageThreshold: 26.0,
    maxPayloadKg: 1750,
    payloadVerified: true,
    fuelRateMoving: 10.0,
    fuelRateIdle: 2.0,
    stdSpeedKmh: 55,
    currentOdoKm: 142580,
    lastOdoUpdate: "2026-10-10",
    managingWorkshop: "Xưởng TP.HCM (Tổng kho Miền Nam)",
    defaultDriverId: "drv-01",
    defaultDriverName: "Nguyễn Văn A",
    status: "available",
    yearManufactured: 2022,
  },
  {
    id: "veh-02",
    code: "XE-ISUZU-02",
    plateNo: "51D-699.98",
    name: "Xe tải ISUZU 1.9T",
    model: "ISUZU QKR77",
    voltageSystem: "12V",
    voltageThreshold: 12.6,
    maxPayloadKg: 1900,
    payloadVerified: false, // Tạm ghi theo mẫu, cần đối chiếu đăng kiểm
    fuelRateMoving: 9.0,
    fuelRateIdle: 2.0,
    stdSpeedKmh: 47,
    currentOdoKm: 98420,
    lastOdoUpdate: "2026-10-09",
    managingWorkshop: "Xưởng Cần Thơ (Chi nhánh Tây Nam Bộ)",
    defaultDriverId: "drv-02",
    defaultDriverName: "Trần Văn B",
    status: "available",
    yearManufactured: 2023,
  },
];

export const SEED_DRIVERS: DriverProfile[] = [
  {
    id: "drv-01",
    employeeCode: "NV-TX01",
    name: "Nguyễn Văn A",
    phone: "0912.345.678",
    licenseClass: "Hạng C",
    licenseNumber: "790123456789",
    licenseExpiry: "2027-12-15",
    healthCertExpiry: "2026-11-20",
    defaultVehicleId: "veh-01",
    status: "active",
  },
  {
    id: "drv-02",
    employeeCode: "NV-TX02",
    name: "Trần Văn B",
    phone: "0938.889.991",
    licenseClass: "Hạng C",
    licenseNumber: "790987654321",
    licenseExpiry: "2028-06-08",
    healthCertExpiry: "2026-10-15", // Sắp đến hạn khám sk
    defaultVehicleId: "veh-02",
    status: "active",
  },
  {
    id: "drv-03",
    employeeCode: "NV-TX03",
    name: "Lê Hoàng C",
    phone: "0903.112.233",
    licenseClass: "Hạng C",
    licenseNumber: "790555666777",
    licenseExpiry: "2029-01-10",
    healthCertExpiry: "2027-04-20",
    defaultVehicleId: "",
    status: "active",
  },
];

export const SEED_DISPATCH_ORDERS: DispatchOrder[] = [
  {
    id: "disp-01",
    orderCode: "LDX-20261010-01",
    workDate: "2026-10-10",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    status: "in_progress",
    version: 1,
    creationTiming: "before_trip",
    jobs: [
      {
        id: "job-01",
        sequence: 1,
        jobType: "workshop_transfer",
        title: "Trung chuyển khung alu xưởng TP.HCM sang Xưởng Cần Thơ",
        fromLocation: "Xưởng TP.HCM - Cụm CN Tân Bình, TP.HCM",
        toLocation: "Xưởng Cần Thơ - KCN Trà Nóc, Cần Thơ",
        plannedStartTime: "05:00",
        plannedEndTime: "09:30",
        plannedKm: 170,
        payloadKg: 1200,
        allowOtMorning: true,
        allowOtEveningNight: false,
        notes: "Giao gấp trước 10h sáng để kịp sơn tĩnh điện",
      },
      {
        id: "job-02",
        sequence: 2,
        jobType: "project_delivery",
        title: "Giao biển hiệu & hộp đèn Dự án Nippon Paint Cần Thơ",
        fromLocation: "Xưởng Cần Thơ",
        toLocation: "Đại lý Nippon Paint - 45 Đường 30/4, Ninh Kiều, Cần Thơ",
        projectId: "proj-nippon-ct",
        projectName: "Dự án Showroom Nippon Paint Cần Thơ",
        plannedStartTime: "14:00",
        plannedEndTime: "18:30",
        plannedKm: 25,
        payloadKg: 450,
        allowOtMorning: false,
        allowOtEveningNight: true,
        notes: "Hỗ trợ đội thợ lắp đặt hạ hàng an toàn",
      },
    ],
    createdAt: "2026-10-09T16:00:00Z",
    updatedAt: "2026-10-09T17:00:00Z",
    issuedAt: "2026-10-09T17:00:00Z",
  },
  {
    id: "disp-02",
    orderCode: "LDX-20261010-02",
    workDate: "2026-10-10",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    driverId: "drv-02",
    driverName: "Trần Văn B",
    status: "issued",
    version: 1,
    creationTiming: "before_trip",
    jobs: [
      {
        id: "job-03",
        sequence: 1,
        jobType: "site_materials",
        title: "Rải vật tư led và bạt hiflex các chi nhánh ngân hàng",
        fromLocation: "Xưởng Cần Thơ",
        toLocation: "Tuyến các điểm PGD Cần Thơ - Hậu Giang",
        projectId: "proj-bank-sw",
        projectName: "Gói Biển Hiệu Ngân Hàng ACB Tây Nam Bộ",
        plannedStartTime: "07:30",
        plannedEndTime: "16:30",
        plannedKm: 110,
        payloadKg: 850,
        allowOtMorning: false,
        allowOtEveningNight: false,
        notes: "Kiểm tra ký biên bản giao nhận với từng trưởng phòng giao dịch",
      },
    ],
    createdAt: "2026-10-09T18:00:00Z",
    updatedAt: "2026-10-09T18:00:00Z",
    issuedAt: "2026-10-09T18:00:00Z",
  },
  {
    id: "disp-03",
    orderCode: "LDX-20261005-01",
    workDate: "2026-10-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    status: "completed",
    version: 1,
    creationTiming: "before_trip",
    jobs: [
      {
        id: "job-04",
        sequence: 1,
        jobType: "workshop_transfer",
        title: "Chuyến mẫu 05/10/2026 - Hino chở hàng liên xưởng",
        fromLocation: "Xưởng TP.HCM",
        toLocation: "Kho trung chuyển Nha Trang",
        plannedStartTime: "04:30",
        plannedEndTime: "19:00",
        plannedKm: 420,
        payloadKg: 1550,
        allowOtMorning: true,
        allowOtEveningNight: true,
      },
    ],
    createdAt: "2026-10-04T15:00:00Z",
    updatedAt: "2026-10-05T20:00:00Z",
    issuedAt: "2026-10-04T17:00:00Z",
  },
];

export const SEED_DAILY_LOGS: DailyLog[] = [
  {
    id: "log-20261005-hino",
    workDate: "2026-10-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    actualDriverId: "drv-01",
    actualDriverName: "Nguyễn Văn A",
    dispatchOrderId: "disp-03",
    dispatchOrderCode: "LDX-20261005-01",
    plannedKm: 420,
    actualKm: 435,
    kmVariancePercent: 3.57,
    actualMovingHours: 7.8,
    activityWindowHours: 14.5,
    idleEngineHours: 0.9,
    movingRatioPercent: 53.79,
    avgMovingSpeedKmh: 55.7,
    dataSource: "gps_binh_minh",
    dataCompleteness: "complete",
    stopsCount: 4,
    stops: [
      {
        id: "stp-01",
        stopNo: 1,
        address: "Cây xăng Petrolimex QL1A, Xuân Lộc, Đồng Nai",
        startTime: "06:15",
        endTime: "06:30",
        durationMinutes: 15,
        idleEngineMinutes: 2,
        engineStatusEvaluation: "engine_off",
        category: "fuel_refill",
        notes: "Đổ dầu theo hóa đơn",
      },
      {
        id: "stp-02",
        stopNo: 2,
        address: "Trạm dừng chân Thắng Lợi, Phan Thiết",
        startTime: "08:45",
        endTime: "09:20",
        durationMinutes: 35,
        idleEngineMinutes: 0,
        engineStatusEvaluation: "engine_off",
        category: "meal_rest",
        notes: "Ăn sáng và nghỉ sau chặng lái",
      },
      {
        id: "stp-03",
        stopNo: 3,
        address: "Ngã 3 Cà Ná, Thuận Nam, Ninh Thuận",
        startTime: "13:00",
        endTime: "13:25",
        durationMinutes: 25,
        idleEngineMinutes: 22,
        engineStatusEvaluation: "engine_not_off", // Nổ máy >80%
        category: "meal_rest",
        notes: "Dừng trưa bật điều hòa không tắt máy (Cần giải trình)",
      },
      {
        id: "stp-04",
        stopNo: 4,
        address: "Xưởng Nha Trang - CCN Diên Phú, Khánh Hòa",
        startTime: "18:40",
        endTime: "19:30",
        durationMinutes: 50,
        idleEngineMinutes: 10,
        engineStatusEvaluation: "engine_off",
        category: "workshop_load_unload",
        notes: "Hạ hàng tại xưởng chi nhánh",
      },
    ],
    engineCycles: [
      {
        id: "eng-01",
        startTime: "2026-10-05T04:22:00Z",
        endTime: "2026-10-05T06:00:00Z",
        durationMinutes: 98,
        distanceKm: 85,
        otMorningMins: 98,
        otEveningMins: 0,
        otLateNightMins: 0,
        otMidnightMins: 0,
      },
      {
        id: "eng-02",
        startTime: "2026-10-05T17:20:00Z",
        endTime: "2026-10-05T19:00:00Z",
        durationMinutes: 100,
        distanceKm: 88,
        otMorningMins: 0,
        otEveningMins: 100,
        otLateNightMins: 0,
        otMidnightMins: 0,
      },
    ],
    photosStatus: {
      departureVerified: true,
      deliveryStopsVerified: true,
      returnWorkshopVerified: true,
      tyreCondition: "pass",
      tyreNote: "Lốp đủ áp suất, không dính đinh",
    },
    reconciliationStatus: "reconciled",
  },
  {
    id: "log-20261010-hino",
    workDate: "2026-10-10",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    actualDriverId: "drv-01",
    actualDriverName: "Nguyễn Văn A",
    dispatchOrderId: "disp-01",
    dispatchOrderCode: "LDX-20261010-01",
    plannedKm: 195,
    actualKm: 202,
    kmVariancePercent: 3.59,
    actualMovingHours: 4.5,
    activityWindowHours: 12.2,
    idleEngineHours: 0.6,
    movingRatioPercent: 36.89,
    avgMovingSpeedKmh: 44.8,
    dataSource: "gps_binh_minh",
    dataCompleteness: "complete",
    stopsCount: 3,
    stops: [
      {
        id: "stp-11",
        stopNo: 1,
        address: "Trạm thu phí Cao tốc Trung Lương - Mỹ Thuận",
        startTime: "06:10",
        endTime: "06:18",
        durationMinutes: 8,
        idleEngineMinutes: 6,
        engineStatusEvaluation: "short_stop",
        category: "matched_order_job",
        notes: "Dừng mua vé quá cảnh",
      },
      {
        id: "stp-12",
        stopNo: 2,
        address: "KCN Trà Nóc, Bình Thủy, Cần Thơ",
        startTime: "09:15",
        endTime: "10:45",
        durationMinutes: 90,
        idleEngineMinutes: 5,
        engineStatusEvaluation: "engine_off",
        category: "workshop_load_unload",
        notes: "Hạ hàng tại xưởng Cần Thơ",
      },
      {
        id: "stp-13",
        stopNo: 3,
        address: "Showroom Nippon Paint - 45 Đường 30/4, Cần Thơ",
        startTime: "15:20",
        endTime: "18:00",
        durationMinutes: 160,
        idleEngineMinutes: 8,
        engineStatusEvaluation: "engine_off",
        category: "matched_order_job",
        notes: "Giao biển quảng cáo công trình",
      },
    ],
    engineCycles: [
      {
        id: "eng-11",
        startTime: "2026-10-10T05:05:00Z",
        endTime: "2026-10-10T07:30:00Z",
        durationMinutes: 145,
        distanceKm: 125,
        otMorningMins: 145,
        otEveningMins: 0,
        otLateNightMins: 0,
        otMidnightMins: 0,
      },
      {
        id: "eng-12",
        startTime: "2026-10-10T17:00:00Z",
        endTime: "2026-10-10T18:40:00Z",
        durationMinutes: 100,
        distanceKm: 32,
        otMorningMins: 0,
        otEveningMins: 100,
        otLateNightMins: 0,
        otMidnightMins: 0,
      },
    ],
    photosStatus: {
      departureVerified: true,
      deliveryStopsVerified: true,
      returnWorkshopVerified: false,
      tyreCondition: "pass",
    },
    reconciliationStatus: "pending_review",
  },
];

export const SEED_OVERTIME_RECORDS: OvertimeApprovalRecord[] = [
  {
    id: "ot-20261005-01",
    workDate: "2026-10-05",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    dailyLogId: "log-20261005-hino",
    dispatchOrderId: "disp-03",
    hasOrder: true,
    orderAllowsMorningOt: true,
    orderAllowsEveningOt: true,
    minsK1_Morning: 98,
    minsK2_Evening: 100,
    minsK3_LateNight: 0,
    minsK4_Midnight: 0,
    proposedTotalHours: 3.3,
    // (98/60)*75000 + (100/60)*50000 = 122500 + 83333.3 = 205833
    proposedTotalAmount: 205833,
    kmVariancePercent: 3.57,
    speedRatioPercent: 101.2,
    lateReturnMinutes: 30,
    requiresExplanation: false,
    approvalStatus: "approved_full",
    approvedMinsK1: 98,
    approvedMinsK2: 100,
    approvedMinsK3: 0,
    approvedMinsK4: 0,
    approvedTotalAmount: 205833,
    approvalMode: "by_windows",
    approvedBy: "Quản lý Đội xe (Manager)",
    approvedAt: "2026-10-06T09:00:00Z",
    decisionReason: "Khớp lệnh điều xe và dữ liệu chặng máy GPS chính xác",
    hrmSynced: true,
    hrmPeriod: "2026-10",
  },
  {
    id: "ot-20261010-01",
    workDate: "2026-10-10",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    dailyLogId: "log-20261010-hino",
    dispatchOrderId: "disp-01",
    hasOrder: true,
    orderAllowsMorningOt: true,
    orderAllowsEveningOt: true,
    minsK1_Morning: 145,
    minsK2_Evening: 100,
    minsK3_LateNight: 0,
    minsK4_Midnight: 0,
    proposedTotalHours: 4.08,
    // (145/60)*75000 + (100/60)*50000 = 181250 + 83333 = 264583
    proposedTotalAmount: 264583,
    kmVariancePercent: 3.59,
    speedRatioPercent: 81.5,
    lateReturnMinutes: 10,
    requiresExplanation: false,
    approvalStatus: "pending",
    approvedMinsK1: 0,
    approvedMinsK2: 0,
    approvedMinsK3: 0,
    approvedMinsK4: 0,
    approvedTotalAmount: 0,
    hrmSynced: false,
  },
  {
    id: "ot-20261009-sample-night",
    workDate: "2026-10-09",
    driverId: "drv-02",
    driverName: "Trần Văn B",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    dailyLogId: "log-20261009-isuzu",
    hasOrder: true,
    orderAllowsMorningOt: false,
    orderAllowsEveningOt: true,
    minsK1_Morning: 0,
    minsK2_Evening: 30, // 0.5h * 50k = 25k
    minsK3_LateNight: 120, // 2h * 75k = 150k
    minsK4_Midnight: 90, // 1.5h * 100k = 150k
    // Tổng 4h chặng đêm 21:30 - 01:30: 25k + 150k + 150k = 325.000 đ
    proposedTotalHours: 4.0,
    proposedTotalAmount: 325000,
    kmVariancePercent: 4.2,
    speedRatioPercent: 89.0,
    lateReturnMinutes: 0,
    requiresExplanation: false,
    approvalStatus: "pending",
    approvedMinsK1: 0,
    approvedMinsK2: 0,
    approvedMinsK3: 0,
    approvedMinsK4: 0,
    approvedTotalAmount: 0,
    hrmSynced: false,
  },
];

export const SEED_FUEL_RECORDS: FuelRefillRecord[] = [
  {
    id: "fuel-01",
    refillTime: "2026-10-05T06:20:00Z",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    gasStation: "Cây xăng Petrolimex 18, Đồng Nai",
    invoiceNumber: "HD-0091823",
    invoiceLiters: 45.0,
    unitPriceVnd: 21500,
    totalAmountVnd: 967500,
    currentOdoKm: 142160,
    isFullTank: true, // Mốc đầy bình số 1
    gpsReportedLiters: 44.2,
    fuelVariancePercent: 1.78,
    isVarianceAlert: false,
    photoReceiptAttached: true,
    photoPumpAttached: true,
    payerType: "company",
    notes: "Nạp đầy bình trước khi khởi hành đi Nha Trang",
  },
  {
    id: "fuel-02",
    refillTime: "2026-10-08T17:15:00Z",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    gasStation: "Cây xăng Comeco Hàng Xanh, TP.HCM",
    invoiceNumber: "HD-0092144",
    invoiceLiters: 42.0,
    unitPriceVnd: 21500,
    totalAmountVnd: 903000,
    currentOdoKm: 142580,
    isFullTank: true, // Mốc đầy bình số 2 -> Đoạn 142.160 -> 142.580 (420 km), nạp 42L -> 10.0 L/100km
    gpsReportedLiters: 41.5,
    fuelVariancePercent: 1.19,
    isVarianceAlert: false,
    photoReceiptAttached: true,
    photoPumpAttached: true,
    payerType: "company",
    notes: "Đầy bình lần 2 khép chu kỳ thực nghiệm (420 km / 42 L = 10 L/100km)",
  },
  {
    id: "fuel-03",
    refillTime: "2026-10-09T10:00:00Z",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    driverId: "drv-02",
    driverName: "Trần Văn B",
    gasStation: "Cây xăng Petrolimex Trà Nóc, Cần Thơ",
    invoiceNumber: "HD-0092289",
    invoiceLiters: 35.0,
    unitPriceVnd: 21500,
    totalAmountVnd: 752500,
    currentOdoKm: 98420,
    isFullTank: false,
    gpsReportedLiters: 29.8,
    fuelVariancePercent: 14.86, // >10% Cảnh báo chênh nạp!
    isVarianceAlert: true,
    photoReceiptAttached: true,
    photoPumpAttached: false, // Thiếu ảnh cột bơm
    payerType: "company",
    notes: "Lệch nạp 14.86% giữa hóa đơn và cảm biến GPS + thiếu ảnh cột bơm",
  },
];

export const SEED_EXPENSES: FleetExpenseRecord[] = [
  {
    id: "exp-01",
    expenseDate: "2026-10-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    expenseType: "fuel",
    amountVnd: 967500,
    payer: "company",
    allocationTarget: "general_fleet_pool",
    invoiceDocNo: "HD-0091823",
    isConfirmed: true,
    sourceReferenceId: "fuel-01",
    paymentStatus: "paid",
    description: "Đổ dầu Petrolimex 45 lít",
  },
  {
    id: "exp-02",
    expenseDate: "2026-10-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    expenseType: "overtime",
    amountVnd: 205833,
    payer: "company",
    allocationTarget: "general_fleet_pool",
    isConfirmed: true,
    sourceReferenceId: "ot-20261005-01",
    paymentStatus: "pending_payment",
    description: "Tăng ca tài xế Nguyễn Văn A ngày 05/10 (3.3h - 2 khung)",
  },
  {
    id: "exp-03",
    expenseDate: "2026-10-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    expenseType: "toll_epass",
    amountVnd: 185000,
    payer: "company",
    allocationTarget: "direct_project",
    targetProjectId: "proj-nippon-ct",
    targetProjectName: "Dự án Showroom Nippon Paint Cần Thơ",
    invoiceDocNo: "VETC-20261005-01",
    isConfirmed: true,
    paymentStatus: "paid",
    description: "Phí cầu đường trạm Cao tốc Mỹ Thuận phục vụ chở vật tư dự án",
  },
  {
    id: "exp-04",
    expenseDate: "2026-10-08",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    expenseType: "fuel",
    amountVnd: 903000,
    payer: "company",
    allocationTarget: "general_fleet_pool",
    invoiceDocNo: "HD-0092144",
    isConfirmed: true,
    sourceReferenceId: "fuel-02",
    paymentStatus: "paid",
    description: "Đổ dầu Comeco 42 lít đầy bình",
  },
  {
    id: "exp-05",
    expenseDate: "2026-10-09",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    expenseType: "fuel",
    amountVnd: 752500,
    payer: "company",
    allocationTarget: "general_fleet_pool",
    invoiceDocNo: "HD-0092289",
    isConfirmed: true,
    sourceReferenceId: "fuel-03",
    paymentStatus: "paid",
    description: "Đổ dầu Petrolimex Cần Thơ 35 lít",
  },
  {
    id: "exp-06",
    expenseDate: "2026-10-01",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    expenseType: "maintenance",
    amountVnd: 1450000,
    payer: "company",
    allocationTarget: "general_fleet_pool",
    invoiceDocNo: "HD-DV-GARAGE-98",
    isConfirmed: true,
    paymentStatus: "paid",
    description: "Bảo dưỡng định kỳ mốc 140.000 km (thay nhớt máy, lọc dầu Hino)",
  },
];

export const SEED_ISSUES: VehicleIncidentIssue[] = [
  {
    id: "iss-01",
    issueCode: "VD-202610-01",
    occurredDate: "2026-10-05",
    detectedDate: "2026-10-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    issueType: "long_idle_engine",
    severity: "medium",
    source: "auto_detected_gps",
    description: "Dừng 25 phút tại Ngã 3 Cà Ná nhưng tỷ lệ máy nổ 88% (22 phút nổ máy đứng yên)",
    status: "pending_decision",
    assignedTo: "Admin Đội xe",
    dueDate: "2026-10-08",
    explanation: "Tài xế dừng trưa ăn cơm thời tiết nắng gắt 38 độ C nên mở điều hòa làm mát buồng lái.",
    managerDecision: "written_warning",
    rootCause: "Thói quen bật máy lạnh xe khi nghỉ ăn trưa",
    actionTaken: "Nhắc nhở tài xế tắt máy và vào quán ăn có máy lạnh nghỉ ngơi để tiết kiệm nhiên liệu.",
    isRecurring: false,
    createdAt: "2026-10-05T14:00:00Z",
  },
  {
    id: "iss-02",
    issueCode: "VD-202610-02",
    occurredDate: "2026-10-09",
    detectedDate: "2026-10-09",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    driverId: "drv-02",
    driverName: "Trần Văn B",
    issueType: "fuel_refill_anomaly",
    severity: "medium",
    source: "auto_detected_log",
    description: "Lệch nạp dầu 14.86% (Hóa đơn: 35L, Cảm biến GPS: 29.8L) + Thiếu ảnh cột bơm",
    status: "pending_explanation",
    assignedTo: "Admin Đội xe",
    dueDate: "2026-10-12",
    isRecurring: false,
    createdAt: "2026-10-09T11:00:00Z",
  },
  {
    id: "iss-03",
    issueCode: "VD-202610-03",
    occurredDate: "2026-10-10",
    detectedDate: "2026-10-10",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    driverId: "drv-02",
    driverName: "Trần Văn B",
    issueType: "document_maintenance_expired",
    severity: "high",
    source: "auto_detected_schedule",
    description: "Giấy khám sức khỏe định kỳ của tài xế Trần Văn B hết hạn vào ngày 15/10/2026 (còn 5 ngày)",
    status: "new",
    assignedTo: "Phòng Nhân sự & Đội xe",
    dueDate: "2026-10-11",
    isRecurring: false,
    createdAt: "2026-10-10T08:00:00Z",
  },
];

export const SEED_SCHEDULE_ITEMS: MaintenanceScheduleItem[] = [
  // Xe Hino 51D-982.46
  {
    id: "sch-01",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    targetType: "vehicle",
    itemType: "registry_inspection",
    title: "Đăng kiểm định kỳ",
    cycleMonths: 6,
    lastPerformedDate: "2026-05-12",
    expiryDate: "2026-11-12",
    status: "warning_due_soon", // Còn ~32 ngày
    daysRemaining: 33,
    notes: "Trung tâm Đăng kiểm 50-05V Tân Bình",
  },
  {
    id: "sch-02",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    targetType: "vehicle",
    itemType: "insurance_civil",
    title: "Bảo hiểm TNDS bắt buộc",
    cycleMonths: 12,
    lastPerformedDate: "2026-02-15",
    expiryDate: "2027-02-15",
    status: "valid",
    daysRemaining: 128,
  },
  {
    id: "sch-03",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    targetType: "vehicle",
    itemType: "insurance_body",
    title: "Bảo hiểm vật chất thân vỏ",
    cycleMonths: 12,
    lastPerformedDate: "2026-02-15",
    expiryDate: "2027-02-15",
    status: "valid",
    daysRemaining: 128,
  },
  {
    id: "sch-04",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    targetType: "vehicle",
    itemType: "periodic_maintenance",
    title: "Bảo dưỡng định kỳ 5.000 km",
    cycleKm: 5000,
    lastPerformedDate: "2026-10-01",
    lastPerformedOdoKm: 140000,
    expiryOdoKm: 145000,
    status: "valid",
    kmRemaining: 2420, // 145.000 - 142.580
    notes: "Thay nhớt động cơ và lọc gió",
  },
  {
    id: "sch-05",
    vehicleId: "veh-01",
    vehiclePlate: "51D-982.46",
    targetType: "vehicle",
    itemType: "tyre_rotation",
    title: "Đảo lốp & Cân mâm định kỳ 10.000 km",
    cycleKm: 10000,
    lastPerformedDate: "2026-07-10",
    lastPerformedOdoKm: 135000,
    expiryOdoKm: 145000,
    status: "valid",
    kmRemaining: 2420,
  },

  // Xe Isuzu 51D-699.98
  {
    id: "sch-06",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    targetType: "vehicle",
    itemType: "registry_inspection",
    title: "Đăng kiểm định kỳ",
    cycleMonths: 6,
    lastPerformedDate: "2026-06-20",
    expiryDate: "2026-12-20",
    status: "valid",
    daysRemaining: 71,
  },
  {
    id: "sch-07",
    vehicleId: "veh-02",
    vehiclePlate: "51D-699.98",
    targetType: "vehicle",
    itemType: "periodic_maintenance",
    title: "Bảo dưỡng định kỳ 5.000 km",
    cycleKm: 5000,
    lastPerformedDate: "2026-08-15",
    lastPerformedOdoKm: 95000,
    expiryOdoKm: 100000,
    status: "warning_due_soon", // 100.000 - 98.420 = 1.580 km
    kmRemaining: 1580,
    notes: "Mốc đại tu cấp trung 100.000 km",
  },

  // Tài xế
  {
    id: "sch-08",
    driverId: "drv-01",
    driverName: "Nguyễn Văn A",
    targetType: "driver",
    itemType: "driver_license",
    title: "GPLX Hạng C",
    lastPerformedDate: "2022-12-15",
    expiryDate: "2027-12-15",
    status: "valid",
    daysRemaining: 431,
  },
  {
    id: "sch-09",
    driverId: "drv-02",
    driverName: "Trần Văn B",
    targetType: "driver",
    itemType: "driver_health",
    title: "Khám sức khỏe định kỳ lái xe",
    cycleMonths: 6,
    lastPerformedDate: "2026-04-15",
    expiryDate: "2026-10-15",
    status: "overdue", // Còn 5 ngày là sát nút -> Cảnh báo đỏ
    daysRemaining: 5,
    notes: "Cần sắp xếp khám trước 15/10/2026",
  },
];

// =========================================================================
// HELPER FUNCTIONS & BUSINESS CALCULATION ALGORITHMS
// =========================================================================

/**
 * Tính toán số tiền Tăng ca theo 4 khung giờ chuẩn xác từ số phút gốc
 * K1 (04-08h): 75.000 đ/h
 * K2 (17-22h): 50.000 đ/h
 * K3 (22-24h): 75.000 đ/h
 * K4 (00-04h): 100.000 đ/h
 */
export function calculateOtAmount(k1Mins: number, k2Mins: number, k3Mins: number, k4Mins: number): {
  amountK1: number;
  amountK2: number;
  amountK3: number;
  amountK4: number;
  totalAmount: number;
  totalHours: number;
} {
  const amountK1 = Math.round((k1Mins / 60) * 75000);
  const amountK2 = Math.round((k2Mins / 60) * 50000);
  const amountK3 = Math.round((k3Mins / 60) * 75000);
  const amountK4 = Math.round((k4Mins / 60) * 100000);
  const totalAmount = amountK1 + amountK2 + amountK3 + amountK4;
  const totalHours = Math.round(((k1Mins + k2Mins + k3Mins + k4Mins) / 60) * 100) / 100;

  return { amountK1, amountK2, amountK3, amountK4, totalAmount, totalHours };
}

/**
 * Phân bổ tổng số phút duyệt vào 4 khung theo tỷ lệ gốc (Proportional Split)
 */
export function splitOtProportionally(
  targetTotalMinutes: number,
  origK1: number,
  origK2: number,
  origK3: number,
  origK4: number
): { k1: number; k2: number; k3: number; k4: number } {
  const origSum = origK1 + origK2 + origK3 + origK4;
  if (origSum <= 0 || targetTotalMinutes <= 0) {
    return { k1: 0, k2: 0, k3: 0, k4: 0 };
  }
  const ratio = Math.min(1, targetTotalMinutes / origSum);
  const k1 = Math.round(origK1 * ratio);
  const k2 = Math.round(origK2 * ratio);
  const k3 = Math.round(origK3 * ratio);
  const k4 = targetTotalMinutes - (k1 + k2 + k3); // bù phần dư
  return { k1, k2, k3, k4: Math.max(0, k4) };
}

/**
 * Sinh chuỗi tin nhắn Zalo chuẩn chỉnh cho Lệnh điều xe
 */
export function generateZaloDispatchMessage(order: DispatchOrder): string {
  const dateFormatted = order.workDate.split("-").reverse().join("/");
  const lines: string[] = [
    `📋 LỆNH ĐIỀU XE: ${order.orderCode} (${dateFormatted})`,
    `🚛 Xe: ${order.vehiclePlate} | 👤 Tài xế: ${order.driverName}`,
    `----------------------------------------`,
  ];

  order.jobs.forEach((job, idx) => {
    const otLabel = [];
    if (job.allowOtMorning) otLabel.push("OT Sáng (04:00 - 08:00)");
    if (job.allowOtEveningNight) otLabel.push("OT Tối/Đêm (17:00 - 04:00)");
    const otText = otLabel.length > 0 ? ` [${otLabel.join(", ")}]` : " [Không OT]";

    lines.push(
      `📍 Chuyến ${idx + 1}: ${job.title}`,
      `   • Tuyến: ${job.fromLocation} ➔ ${job.toLocation}`,
      `   • Giờ dự kiến: ${job.plannedStartTime} - ${job.plannedEndTime} (${job.plannedKm} km)`,
      `   • Tải hàng: ${job.payloadKg.toLocaleString("vi-VN")} kg${otText}`,
      job.notes ? `   • Ghi chú: ${job.notes}` : ""
    );
  });

  lines.push(
    `----------------------------------------`,
    `⚠️ QUY ĐỊNH AN TOÀN & BẰNG CHỨNG:`,
    `- Chụp ảnh xuất phát xưởng và gửi ảnh từng điểm giao hàng lên Zalo.`,
    `- Kiểm tra áp suất lốp trước khi xuất phát.`,
    `- Tắt máy khi dừng đỗ trên 10 phút. Chúc chuyến đi an toàn!`
  );

  return lines.filter(Boolean).join("\n");
}

/**
 * Động cơ Phân bổ Chi phí Dự án chuẩn xác theo mục 15.3 của tài liệu thiết kế
 */
export function calculateProjectCostAllocation(
  vehicle: Vehicle,
  expenses: FleetExpenseRecord[],
  dailyLogs: DailyLog[],
  periodMonth: string
): ProjectCostAllocationSummary {
  // 1. Tách khoản trực tiếp và chi phí chung
  let totalDirectCosts = 0;
  let totalGeneralPoolCosts = 0;

  const directExpensesByProject: Record<string, { name: string; amount: number }> = {};

  expenses.forEach((exp) => {
    if (exp.vehicleId !== vehicle.id) return;
    if (exp.payer !== "company" || !exp.isConfirmed) return;

    if (exp.allocationTarget === "direct_project" && exp.targetProjectId) {
      totalDirectCosts += exp.amountVnd;
      if (!directExpensesByProject[exp.targetProjectId]) {
        directExpensesByProject[exp.targetProjectId] = {
          name: exp.targetProjectName || "Dự án liên kết",
          amount: 0,
        };
      }
      directExpensesByProject[exp.targetProjectId].amount += exp.amountVnd;
    } else {
      totalGeneralPoolCosts += exp.amountVnd;
    }
  });

  // 2. Thống kê km phục vụ theo đối tượng từ nhật ký
  let totalKmRun = 0;
  const projectKmMap: Record<string, { name: string; km: number; days: number }> = {
    "internal_ops": { name: "Nội bộ công ty (Trung chuyển xưởng, Khảo sát, Bảo dưỡng)", km: 0, days: 0 },
  };

  dailyLogs.forEach((log) => {
    if (log.vehicleId !== vehicle.id) return;
    totalKmRun += log.actualKm;

    // Phân bổ km theo công việc (nếu có lệnh)
    // Giả lập phân chia km thực tế: 60% cho dự án, 40% cho trung chuyển xưởng
    const internalKm = Math.round(log.actualKm * 0.4);
    const projKm = log.actualKm - internalKm;

    projectKmMap["internal_ops"].km += internalKm;
    projectKmMap["internal_ops"].days += 1;

    const dummyProjId = "proj-nippon-ct";
    if (!projectKmMap[dummyProjId]) {
      projectKmMap[dummyProjId] = {
        name: "Dự án Showroom Nippon Paint Cần Thơ",
        km: 0,
        days: 0,
      };
    }
    projectKmMap[dummyProjId].km += projKm;
    projectKmMap[dummyProjId].days += 1;
  });

  if (totalKmRun === 0) totalKmRun = 1; // tránh chia 0

  const costPerKm = Math.round((totalDirectCosts + totalGeneralPoolCosts) / totalKmRun);

  // 3. Phân bổ chi phí chung theo tỷ trọng km
  const allocations: ProjectCostAllocationSummary["allocations"] = [];
  let allocatedSum = 0;

  const targets = Object.keys(projectKmMap);
  targets.forEach((tgtId, idx) => {
    const item = projectKmMap[tgtId];
    const weight = item.km / totalKmRun;
    const directAmt = directExpensesByProject[tgtId]?.amount || 0;

    let allocatedGeneral = 0;
    if (idx === targets.length - 1) {
      // Dồn phần dư VND vào dòng cuối cùng để tổng khớp 100%
      allocatedGeneral = totalGeneralPoolCosts - allocatedSum;
    } else {
      allocatedGeneral = Math.round(totalGeneralPoolCosts * weight);
      allocatedSum += allocatedGeneral;
    }

    allocations.push({
      targetId: tgtId,
      targetName: item.name,
      targetKind: tgtId === "internal_ops" ? "internal_operations" : "project",
      actualKmServed: item.km,
      daysServed: item.days,
      weightPercent: Math.round(weight * 1000) / 10,
      directExpenseAmount: directAmt,
      allocatedGeneralAmount: allocatedGeneral,
      totalAmount: directAmt + allocatedGeneral,
    });
  });

  return {
    periodMonth,
    vehicleId: vehicle.id,
    vehiclePlate: vehicle.plateNo,
    totalDirectCosts,
    totalGeneralPoolCosts,
    totalKmRun,
    costPerKm,
    allocations,
    isLocked: false,
  };
}
