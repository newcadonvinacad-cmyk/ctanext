// ==========================================
// SIGNAGE BOM CALCULATOR & DATA TRANSFER OBJECTS
// Pure calculation functions & types safe for client and server components
// ==========================================

export type SignageType =
  | "alu_letters"
  | "lightbox_3m"
  | "led_matrix"
  | "pylon_sign"
  | "neon_sign"
  | "canvas_hiflex"
  | "letters_logo"
  | "posm_stand"
  | "awning_canopy"
  | "lightbox_blade"
  | "other";

export interface SignageMaterialOption {
  code: string;
  name: string;
  unit: string;
  category: "Khung sắt" | "Mặt dựng" | "Logo & Nhận diện" | "Hệ thống LED" | "Nguồn điện" | "Nội thất & POSM" | "Vật tư phụ & Keo";
  defaultPrice: number;
  specs?: Record<string, any>;
}

export const STANDARD_IRON_OPTIONS: SignageMaterialOption[] = [
  { code: "SAT-HOP-20", name: "Sắt hộp mạ kẽm 20x20x1.2mm (Cây 6.0m)", unit: "Cây 6m", category: "Khung sắt", defaultPrice: 115000 },
  { code: "SAT-HOP-25", name: "Sắt hộp mạ kẽm 25x25x1.4mm (Cây 6.0m)", unit: "Cây 6m", category: "Khung sắt", defaultPrice: 145000 },
  { code: "SAT-HOP-30", name: "Sắt hộp mạ kẽm 30x30x1.4mm (Cây 6.0m)", unit: "Cây 6m", category: "Khung sắt", defaultPrice: 175000 },
  { code: "SAT-HOP-40", name: "Sắt hộp mạ kẽm 40x40x1.4mm (Cây 6.0m)", unit: "Cây 6m", category: "Khung sắt", defaultPrice: 235000 },
  { code: "SAT-HOP-50", name: "Sắt hộp mạ kẽm 50x50x1.4mm (Cây 6.0m)", unit: "Cây 6m", category: "Khung sắt", defaultPrice: 295000 },
  { code: "THEP-V-40", name: "Thép hình V mạ kẽm V40x40x3mm (Cây 6.0m)", unit: "Cây 6m", category: "Khung sắt", defaultPrice: 130000 },
  { code: "NHOM-DINH-HINH", name: "Khung nhôm định hình nhét bạt hộp đèn", unit: "Mét", category: "Khung sắt", defaultPrice: 165000 },
  { code: "KHUNG-TRUSS", name: "Khung giàn Truss không gian mạ kẽm chịu lực", unit: "Mét", category: "Khung sắt", defaultPrice: 450000 },
  { code: "KHONG-KHUNG", name: "Không khung sắt (Bắt trực tiếp / Tận dụng khung cũ)", unit: "Bộ", category: "Khung sắt", defaultPrice: 0 },
];

export const STANDARD_SURFACE_OPTIONS: SignageMaterialOption[] = [
  { code: "ALU-ALCO-3MM", name: "Tấm Alu Alcorest 3mm nhôm 0.10 ngoài trời (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 380000 },
  { code: "ALU-ALCO-006", name: "Tấm Alu Alcorest 3mm nhôm 0.06 trong nhà (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 320000 },
  { code: "ALU-ALCO-015", name: "Tấm Alu Alcorest 3mm nhôm 0.15 cao cấp (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 460000 },
  { code: "ALU-ALCO-021", name: "Tấm Alu Alcorest 3mm nhôm 0.21 ngoài trời PVDF (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 580000 },
  { code: "ALU-TRIEU-CHEN", name: "Tấm Alu Triều Chen 3mm ngoài trời PVDF (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 620000 },
  { code: "HOP-DEN-3M", name: "Hộp đèn bạt 3M in UV nắp bật định hình nhôm", unit: "m²", category: "Mặt dựng", defaultPrice: 850000 },
  { code: "BAT-3M-UV", name: "Bạt 3M Panagraphics II in UV 2 mặt xuyên sáng chuẩn màu", unit: "m²", category: "Mặt dựng", defaultPrice: 280000 },
  { code: "BAT-HIFLEX-UV", name: "Bạt Hiflex xuyên sáng in UV 2 mặt chống tia cực tím", unit: "m²", category: "Mặt dựng", defaultPrice: 160000 },
  { code: "BAT-KHONG-GAN-UV", name: "Bạt không gân cao cấp in UV 2 lớp sắc nét", unit: "m²", category: "Mặt dựng", defaultPrice: 190000 },
  { code: "FOMEX-5MM-DECAL", name: "Tấm Fomex 5li bồi dán Decal ngoài trời (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 210000 },
  { code: "FOMEX-10MM-DECAL", name: "Tấm Fomex 10li bồi dán Decal ngoài trời (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 280000 },
  { code: "MICA-DAILOAN-2MM", name: "Tấm Mica Đài Loan 2mm trong suốt/sữa (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 420000 },
  { code: "MICA-DAILOAN-3MM", name: "Tấm Mica Đài Loan 3mm trong suốt/sữa (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 650000 },
  { code: "MICA-DAILOAN-5MM", name: "Tấm Mica Đài Loan 5mm (1.22m x 2.44m)", unit: "Tấm", category: "Mặt dựng", defaultPrice: 1050000 },
  { code: "LAM-SONG-COMPOSITE", name: "Thanh lam sóng composite ngoài trời giả gỗ cao cấp", unit: "Mét", category: "Mặt dựng", defaultPrice: 95000 },
  { code: "TON-SONG-TINH-DIEN", name: "Tôn sóng vuông sơn tĩnh điện chống rỉ", unit: "m²", category: "Mặt dựng", defaultPrice: 145000 },
];

export const STANDARD_LED_OPTIONS: SignageMaterialOption[] = [
  { code: "LED-NC-12W", name: "Module LED 3 mắt Hàn Quốc NC 12V 1.2W IP68", unit: "Bóng", category: "Hệ thống LED", defaultPrice: 7500, specs: { watts: 1.2 } },
  { code: "LED-GOQ-072W", name: "Module LED 3 mắt GOQ 12V 0.72W", unit: "Bóng", category: "Hệ thống LED", defaultPrice: 5500, specs: { watts: 0.72 } },
  { code: "LED-DAY-SILICON", name: "LED dây Silicon định hình 12V 8W/m chống nước", unit: "Mét", category: "Hệ thống LED", defaultPrice: 45000, specs: { watts: 8.0 } },
  { code: "LED-MATRIX-P10", name: "Tấm LED Ma trận ngoài trời P10 full color", unit: "Tấm", category: "Hệ thống LED", defaultPrice: 180000, specs: { watts: 25.0 } },
  { code: "DEN-PHA-LED-50W", name: "Đèn pha LED rọi biển ngoài trời 50W IP66", unit: "Bộ", category: "Hệ thống LED", defaultPrice: 220000, specs: { watts: 50.0 } },
  { code: "NONE", name: "Không dùng đèn LED (Biển không đèn)", unit: "Con", category: "Hệ thống LED", defaultPrice: 0, specs: { watts: 0 } },
];

export const STANDARD_POWER_OPTIONS: SignageMaterialOption[] = [
  { code: "NGUON-MEANWELL-400W", name: "Bộ nguồn Meanwell ngoài trời 12V 400W IP67", unit: "Bộ", category: "Nguồn điện", defaultPrice: 480000, specs: { watts: 400 } },
  { code: "NGUON-MEANWELL-350W", name: "Bộ nguồn Meanwell ngoài trời 12V 350W IP67", unit: "Bộ", category: "Nguồn điện", defaultPrice: 420000, specs: { watts: 350 } },
  { code: "NGUON-TO-ONG-33A", name: "Bộ nguồn tổ ong 12V 33A 400W có quạt tản nhiệt", unit: "Bộ", category: "Nguồn điện", defaultPrice: 220000, specs: { watts: 400 } },
  { code: "NGUON-JINBO-300W", name: "Bộ nguồn Jinbo chống nước 12V 300W ngoài trời", unit: "Bộ", category: "Nguồn điện", defaultPrice: 350000, specs: { watts: 300 } },
  { code: "NONE", name: "Không dùng bộ nguồn", unit: "Bộ", category: "Nguồn điện", defaultPrice: 0, specs: { watts: 0 } },
];

export const STANDARD_LETTER_OPTIONS: SignageMaterialOption[] = [
  { code: "MICA-TEXT", name: "Bộ chữ Mica nội dung đại lý", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 650000 },
  { code: "MICA-UON-CHAN", name: "Chữ Mica Đài Loan uốn chân Fomex/Alu hắt sáng", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 1200000 },
  { code: "INOX-VANG-GUONG", name: "Chữ Inox vàng gương 304 lồng mặt Mica hút nổi", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 2200000 },
  { code: "INOX-TRANG-XUOC", name: "Chữ Inox trắng xước 304 đèn LED hắt chân", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 1900000 },
  { code: "MICA-HUT-NOI", name: "Logo / Chữ Mica Đài Loan hút nổi 3D", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 950000 },
  { code: "DECAL-DAN-MAT", name: "Decal in UV / Decal 3M bồi dán mặt phẳng", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 350000 },
  { code: "NONE", name: "Không chữ nổi (Mặt biển phẳng / In trực tiếp)", unit: "Bộ", category: "Logo & Nhận diện", defaultPrice: 0 },
];

export const STANDARD_SURVEY_ITEM_PRESETS = [
  "Biển hiệu chính mặt tiền (Alu chữ nổi)",
  "Biển bạt Hiflex khung sắt căng bạt",
  "Biển hộp đèn bạt 3M / Không gân in UV",
  "Biển hộp đèn vẫy 2 mặt (Tròn/Vuông)",
  "Bộ chữ nổi Mica / Inox thương hiệu",
  "Dải 3 màu nhận diện thương hiệu",
  "Logo Mica hút nổi 65x65",
  "Kệ trưng bày POSM / Kệ sản phẩm",
  "Bàn lễ tân / Quầy thu ngân",
  "Vách ốp trang trí / Lam sóng composite",
  "Sửa chữa / Cải tạo mặt biển cũ",
];

export interface BomCalculationInput {
  widthMeters: number;
  heightMeters: number;
  depthMeters?: number;
  signageType: SignageType;
  ironBoxType?: string;
  gridSpacingCm?: number;
  aluMarginCm?: number;
  aluScrapRate?: number;
  ledType?: string;
  ledDensityPerM2?: number;
  ledWattsPerUnit?: number;
  powerUnitType?: string;
  powerUnitWatts?: number;
  powerSafetyLoad?: number;

  // BOM Cấp 2: Thanh sắt chống / giằng gia cố không cố định theo địa hình (cây 6m)
  level2BraceBars?: number;
  level2IronType?: string;

  // Số lượng sản phẩm / biển (Mặc định: 1)
  quantity?: number;
  productQuantity?: number;

  // Thuộc tính khảo sát thực tế (Nippon Paint & POSM & Gia công)
  signMaterial?: string; // Bảng alu, Bảng bạt UV, Bảng fomex 10li + decal...
  letterMaterial?: string; // Chữ Inox vàng gương, Chữ inox trắng, Chữ mica hút nổi...
  hasMicaLogo65?: boolean; // Mica logo 65x65
  hasSideTrim?: boolean; // Lườn
  hasColorStrip?: boolean; // Thay dải màu
  subAccessories?: string;
  displayShelves?: string; // Kệ màu, kệ thông tin SP, kệ hình ảnh, kệ sắt...
  furniture?: string; // Bàn lễ tân, hộp bàn lễ tân, ghế làm việc...
  otherPosm?: string; // HĐ ngôi nhà, dán decal kệ sắt cũ...
  repairScope?: string; // Sửa địa chỉ, sửa bảng, sửa tay nắm kệ gỗ, bắn lại trần alu cũ bị bung...
  customItems?: BomItemLine[]; // Danh sách dòng vật tư tùy chỉnh người dùng thêm vào
}

export interface BomItemLine {
  category: "Khung sắt" | "Mặt dựng" | "Logo & Nhận diện" | "Hệ thống LED" | "Nguồn điện" | "Nội thất & POSM" | "Vật tư phụ & Keo";
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
  bomLevel?: "level_1" | "level_2";
}

export interface BomCalculationResult {
  areaSqm: number;
  flatAreaSqm: number;
  // Khung sắt
  steelMeters: number;
  steelBars6m: number; // BOM Cấp 1 (Sắt cố định)
  level2BraceBars: number; // BOM Cấp 2 (Sắt chống không cố định)
  totalSteelBars: number; // Tổng số cây sắt (Cấp 1 + Cấp 2)
  steelGridDetails: {
    horizontalBars: number;
    verticalBars: number;
    perimeterMeters: number;
  };
  // Mặt alu
  aluSheetsCount: number;
  aluPurchasedSqm: number;
  aluScrapSqm: number;
  aluEfficiencyPercent: number;
  // LED & Nguồn
  totalLeds: number;
  totalWatts: number;
  powerUnitsNeeded: number;
  powerLoadPercent: number;
  // Phụ kiện & Tiêu hao
  titebondTubes: number;
  siliconeTubes: number;
  rivetsCount: number;
  screwsCount: number;
  // Bảng chi tiết vật tư & Giá
  items: BomItemLine[];
  totalEstimatedMaterialCost: number;
}

export interface ProjectBomDto {
  productionBom?: boolean;
  revisionNo?: number;
  id: string;
  code: string;
  title: string;
  projectId: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  quotationId: string | null;
  signageType: SignageType;
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  areaSqm: number;
  ironBoxType: string;
  gridSpacingCm: number;
  calculatedSteelMeters: number;
  calculatedSteelBars: number;
  aluSheetSize: string;
  aluMarginCm: number;
  aluScrapRate: number;
  calculatedAluSheets: number;
  ledType: string;
  ledDensityPerM2: number;
  ledWattsPerUnit: number;
  powerUnitType: string;
  powerUnitWatts: number;
  calculatedLedCount: number;
  calculatedTotalWatts: number;
  calculatedPowerUnits: number;
  calculatedTitebondTubes: number;
  calculatedSiliconeTubes: number;
  calculatedRivetsCount: number;
  calculatedScrewsCount: number;
  estimatedMaterialCost: number;
  itemsJson: BomItemLine[];
  status: "draft" | "approved" | "applied" | "stock_issued";
  notes: string;
  surveyId?: string | null;
  designProofId?: string | null;
  sourceSnapshot?: any;
  mapped?: boolean;
  createdAt: string;
}

export interface SignageExecutiveAnalyticsDto {
  scrapRates: {
    aluYieldPercent: number;
    steelYieldPercent: number;
    ledPassRatePercent: number;
    totalScrapLossEstimate: number;
  };
  warrantyRootCauses: Array<{
    cause: string;
    label: string;
    percentage: number;
    ticketsCount: number;
    avgCost: number;
  }>;
  vendorReliabilities: Array<{
    vendorName: string;
    productType: string;
    installedCount: number;
    failedCount: number;
    defectRatePercent: number;
    grade: "A+" | "A" | "B" | "C";
    notes: string;
  }>;
  teamProductivity: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    completedProjects: number;
    firstTimeRightPercent: number;
    warrantyTicketsIncurred: number;
    rank: number;
  }>;
  profitabilityByCategory: Array<{
    category: string;
    label: string;
    projectsCount: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPercent: number;
  }>;
}

// ==========================================
// CÔNG THỨC BÓC TÁCH ĐỊNH MỨC KỸ THUẬT QUẢNG CÁO
// ==========================================
export function calculateSignageBom(input: BomCalculationInput): BomCalculationResult {
  const width = Math.max(0.1, Number(input.widthMeters) || 1.0);
  const height = Math.max(0.1, Number(input.heightMeters) || 1.0);
  const depth = Math.max(0.05, Number(input.depthMeters) || 0.1);
  const areaSqm = Math.round(width * height * 100) / 100;

  // 1. Tính toán Khung sắt mạ kẽm (Nan đan xương lưới)
  const gridSpacingCm = input.gridSpacingCm || 40;
  const gridSpacingM = gridSpacingCm / 100;

  const horizontalBars = Math.max(2, Math.floor(height / gridSpacingM) + 1);
  const verticalBars = Math.max(2, Math.floor(width / gridSpacingM) + 1);
  const perimeterMeters = 2 * (width + height) + depth * 4 * 2; // Khung viền 3D & chân giằng

  const rawSteelMeters =
    horizontalBars * width + verticalBars * height + perimeterMeters;
  // Cộng 5% hao hụt cắt mòi góc 45 độ & xỉ hàn
  const steelMeters = Math.round(rawSteelMeters * 1.05 * 10) / 10;
  const steelBars6m = Math.ceil(steelMeters / 6.0);
  // BOM Cấp 2: Thanh sắt chống / giằng gia cố không cố định theo địa hình (cây 6m, mặc định 0 nếu không chỉ định)
  const level2BraceBars = Math.max(0, Number(input.level2BraceBars ?? 0));
  const totalSteelBars = steelBars6m + level2BraceBars;

  // 2. Tính toán Mặt dựng Alu
  const aluMarginM = (input.aluMarginCm || 8) / 100; // Gấp mép viền 8cm
  const flatWidth = width + 2 * aluMarginM;
  const flatHeight = height + 2 * aluMarginM;
  const flatAreaSqm = Math.round(flatWidth * flatHeight * 100) / 100;

  const aluStandardSheetSqm = 1.22 * 2.44; // 2.9768 m²
  const aluScrapRate = (input.aluScrapRate || 10.0) / 100; // 10% hao hụt góc
  const theoreticalAluSheets = flatAreaSqm / aluStandardSheetSqm;
  const aluSheetsCount = Math.max(1, Math.ceil(theoreticalAluSheets * (1 + aluScrapRate)));
  const aluPurchasedSqm = Math.round(aluSheetsCount * aluStandardSheetSqm * 100) / 100;
  const aluScrapSqm = Math.round((aluPurchasedSqm - flatAreaSqm) * 100) / 100;
  const aluEfficiencyPercent = Math.min(
    98,
    Math.max(60, Math.round((flatAreaSqm / aluPurchasedSqm) * 100))
  );

  // 3. Tra cứu tùy chọn vật tư chính xác theo mã hoặc tên
  const ironOption =
    STANDARD_IRON_OPTIONS.find((o) => o.code === input.ironBoxType) ||
    STANDARD_IRON_OPTIONS.find((o) => o.name === input.ironBoxType) ||
    STANDARD_IRON_OPTIONS.find((o) => input.ironBoxType && o.name.toLowerCase().includes(input.ironBoxType.toLowerCase())) ||
    STANDARD_IRON_OPTIONS[1];

  let surfaceOption =
    STANDARD_SURFACE_OPTIONS.find((o) => o.code === input.signMaterial) ||
    STANDARD_SURFACE_OPTIONS.find((o) => o.name === input.signMaterial);

  if (!surfaceOption && input.signMaterial) {
    const sm = input.signMaterial.toLowerCase();
    const is3mBrand = /(?:\b3m\b(?!m)|bạt\s*3m|hộp\s*đèn\s*3m|decal\s*3m)/i.test(sm);
    if (!sm.includes("alu") && (is3mBrand || sm.includes("hộp đèn") || sm.includes("hop den"))) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "HOP-DEN-3M") || STANDARD_SURFACE_OPTIONS.find((o) => o.code === "BAT-3M-UV");
    } else if (sm.includes("lam sóng") || sm.includes("lam song")) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "LAM-SONG-COMPOSITE");
    } else if (sm.includes("triều chen") || sm.includes("trieu chen")) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "ALU-TRIEU-CHEN");
    } else if (sm.includes("fomex") || sm.includes("10li") || sm.includes("5li")) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "FOMEX-10MM-DECAL");
    } else if (sm.includes("mica")) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "MICA-DAILOAN-3MM");
    } else if (sm.includes("tôn") || sm.includes("ton")) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "TON-SONG-TINH-DIEN");
    } else if (sm.includes("bạt") || sm.includes("bat") || sm.includes("hiflex")) {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.code === "BAT-HIFLEX-UV");
    } else {
      surfaceOption = STANDARD_SURFACE_OPTIONS.find((o) => o.name.toLowerCase().includes(sm));
    }
  }
  if (!surfaceOption) surfaceOption = STANDARD_SURFACE_OPTIONS[0];

  const ledOption =
    STANDARD_LED_OPTIONS.find((o) => o.code === input.ledType) ||
    STANDARD_LED_OPTIONS.find((o) => o.name === input.ledType) ||
    STANDARD_LED_OPTIONS.find((o) => input.ledType && o.name.toLowerCase().includes(input.ledType.toLowerCase())) ||
    STANDARD_LED_OPTIONS[0];

  const powerOption =
    STANDARD_POWER_OPTIONS.find((o) => o.code === input.powerUnitType) ||
    STANDARD_POWER_OPTIONS.find((o) => o.name === input.powerUnitType) ||
    STANDARD_POWER_OPTIONS.find((o) => input.powerUnitType && o.name.toLowerCase().includes(input.powerUnitType.toLowerCase())) ||
    STANDARD_POWER_OPTIONS[0];

  // 3b. Phân loại cấu hình biển quảng cáo theo nghiệp vụ nhà máy & bảng tính
  const smLower = (input.signMaterial || "").toLowerCase();
  const is3mBrand = /(?:\b3m\b(?!m)|bạt\s*3m|hộp\s*đèn\s*3m|decal\s*3m)/i.test(smLower);

  const isBat =
    input.signageType === "canvas_hiflex" ||
    smLower.includes("bạt") ||
    smLower.includes("bat") ||
    smLower.includes("hiflex");

  const isKe =
    input.signageType === "posm_stand" ||
    smLower.includes("kệ sắt") ||
    smLower.includes("kệ trưng bày") ||
    smLower.includes("ke trung bay") ||
    smLower.includes("kệ sản phẩm");

  const isMaiChe =
    input.signageType === "awning_canopy" ||
    smLower.includes("mái che") ||
    smLower.includes("mai che");

  const isHopDen =
    input.signageType === "lightbox_3m" ||
    input.signageType === "led_matrix" ||
    input.signageType === "neon_sign" ||
    input.signageType === "lightbox_blade" ||
    surfaceOption.code === "HOP-DEN-3M" ||
    (surfaceOption.code === "BAT-3M-UV" && (input.signageType as string) !== "canvas_hiflex") ||
    ((smLower.includes("hộp đèn") || smLower.includes("hop den") || is3mBrand) && !smLower.includes("alu"));

  const isAlu = !isBat && !isKe && !isMaiChe && !isHopDen;

  // 3c. Tính toán Module LED & Bộ nguồn 12V (Chỉ tạo khi là biển hộp đèn hoặc có yêu cầu chiếu sáng)
  let defaultDensity = 0;
  let defaultWatts = (ledOption.specs?.watts as number) || 1.2;
  if (isHopDen) {
    if (input.signageType === "led_matrix") {
      defaultDensity = 120;
      defaultWatts = 2.0;
    } else if (input.signageType === "neon_sign") {
      defaultDensity = 25;
      defaultWatts = 8.0;
    } else {
      defaultDensity = 45; // Hộp đèn bạt dùng LED thanh / module hắt viền
      defaultWatts = (ledOption.specs?.watts as number) || 1.5;
    }
  } else if (input.ledType && input.ledType !== "NONE") {
    // Có chỉ định mã LED cụ thể từ khảo sát / cấu hình sản phẩm
    defaultDensity = input.ledDensityPerM2 || 80;
    defaultWatts = (ledOption.specs?.watts as number) || 1.2;
  }

  const ledDensity = input.ledDensityPerM2 !== undefined ? input.ledDensityPerM2 : defaultDensity;
  const ledWatts = input.ledWattsPerUnit !== undefined ? input.ledWattsPerUnit : defaultWatts;
  const totalLeds = Math.ceil(areaSqm * ledDensity);
  const totalWatts = Math.round(totalLeds * ledWatts * 10) / 10;

  const powerWattsPerUnit = input.powerUnitWatts || (powerOption.specs?.watts as number) || 400;
  const safetyLoad = input.powerSafetyLoad || 0.8;
  const safeWattsPerUnit = powerWattsPerUnit * safetyLoad;
  const powerUnitsNeeded =
    totalWatts > 0 ? Math.ceil(totalWatts / safeWattsPerUnit) : 0;
  const powerLoadPercent =
    powerUnitsNeeded > 0
      ? Math.round((totalWatts / (powerUnitsNeeded * powerWattsPerUnit)) * 100)
      : 0;

  // 4. Vật tư phụ & Tiêu hao
  const titebondTubes = Math.max(2, Math.ceil(flatAreaSqm / 5)); // Chuẩn xưởng: 1 chai dán ~ 5 m²
  const siliconeTubes = Math.max(1, Math.ceil(perimeterMeters / 12)); // Chuẩn xưởng: 1 chai bắn ~ 12m
  const rivetsCount = 0; // Đã loại bỏ số lượng đinh rút cứng
  const screwsCount = 0; // Đã loại bỏ số lượng vít tự khoan cứng

  // Tính số lượng mặt dựng theo đơn vị tính thực tế (Tấm vs m² vs Mét)
  let surfaceQty = aluSheetsCount;
  let surfaceNote = `Trải phẳng ${flatAreaSqm} m² (Hao hụt cắt góc ${input.aluScrapRate || 10}%)`;
  if (surfaceOption.unit === "m²") {
    surfaceQty = Math.round(flatAreaSqm * 1.1 * 10) / 10;
    surfaceNote = `Trải phẳng ${flatAreaSqm} m² (Cộng mép gấp viền 10%)`;
  } else if (surfaceOption.unit === "Mét") {
    surfaceQty = Math.max(1, Math.round((flatAreaSqm / 0.15) * 1.05 * 10) / 10);
    surfaceNote = `Diện tích ${flatAreaSqm} m² (~${surfaceQty} mét thanh lam sóng bản 15cm)`;
  }

  const items: BomItemLine[] = [];

  // 5. Khởi tạo danh mục vật tư định mức kỹ thuật chuẩn xuất xưởng (Khớp bảng Excel thực tế)
  if (isKe) {
    // === HẠNG MỤC: KỆ SẮT 1.2M (THEO BẢNG EXCEL) ===
    items.push(
      {
        category: "Khung sắt",
        itemCode: "SAT-HOP-20",
        itemName: "Sắt hộp mạ kẽm 20x20x1.2mm (Cây 6.0m)",
        unit: "Cây 6m",
        quantity: 2,
        unitPrice: 115000,
        amount: 2 * 115000,
        note: "Khung kệ sắt 1.2m (1 cây nguyên + 1 cây rèo)",
      },
      {
        category: "Nội thất & POSM",
        itemCode: "CHAN-KE-SAT",
        itemName: "Chân kệ sắt sơn tĩnh điện",
        unit: "Cái",
        quantity: 2,
        unitPrice: 85000,
        amount: 2 * 85000,
        note: "Chân đỡ kệ",
      },
      {
        category: "Nội thất & POSM",
        itemCode: "MAM-KE-SAT",
        itemName: "Mâm kệ sắt sơn tĩnh điện",
        unit: "Cái",
        quantity: 10,
        unitPrice: 120000,
        amount: 10 * 120000,
        note: "Mâm đỡ sơn trưng bày",
      },
      {
        category: "Nội thất & POSM",
        itemCode: "PHU-KIEN-KE",
        itemName: "Phụ kiện kệ sắt (ốc, pát, đệm cao su)",
        unit: "Bộ",
        quantity: 2,
        unitPrice: 45000,
        amount: 2 * 45000,
        note: "Bộ phụ kiện lắp ráp kệ",
      },
      {
        category: "Mặt dựng",
        itemCode: "FOMEX-DECAL",
        itemName: "Tấm Fomex bồi dán Decal nhận diện thương hiệu",
        unit: "Tấm",
        quantity: 2,
        unitPrice: 210000,
        amount: 2 * 210000,
        note: "Ốp nhận diện hai bên kệ",
      }
    );
  } else if (isMaiChe) {
    // === HẠNG MỤC: MÁI CHE (THEO BẢNG EXCEL) ===
    items.push(
      {
        category: "Mặt dựng",
        itemCode: "BAT-MAI-CHE",
        itemName: "Bạt mái che ngoài trời chống thấm",
        unit: "Bộ",
        quantity: 1,
        unitPrice: Math.max(1, Math.round(areaSqm)) * 180000,
        amount: Math.max(1, Math.round(areaSqm)) * 180000,
        note: `Bạt mái che ${areaSqm} m²`,
      },
      {
        category: "Khung sắt",
        itemCode: "PHU-KIEN-MAI-CHE",
        itemName: "Phụ kiện mái che (tay nhôm, ống cuốn, pát đỡ)",
        unit: "Bộ",
        quantity: 1,
        unitPrice: 350000,
        amount: 350000,
        note: "Bộ cơ cấu mái che",
      },
      {
        category: "Logo & Nhận diện",
        itemCode: "DECAL-MAI-CHE",
        itemName: "Decal in thương hiệu mái che",
        unit: "Bộ",
        quantity: 1,
        unitPrice: 120000,
        amount: 120000,
        note: "Nhận diện logo mái che",
      }
    );
  } else if (isBat) {
    // === HẠNG MỤC: BẢNG BẠT (THEO BẢNG EXCEL) ===
    items.push({
      category: "Khung sắt",
      itemCode: ironOption.code,
      itemName: ironOption.name.replace(/\s*\(Cây 6\.0m\)/i, "").trim(),
      unit: ironOption.unit,
      quantity: ironOption.unit === "Mét" ? steelMeters : steelBars6m,
      unitPrice: ironOption.defaultPrice,
      amount: (ironOption.unit === "Mét" ? steelMeters : steelBars6m) * ironOption.defaultPrice,
      note: `${steelMeters}m sắt đan nan ô ${gridSpacingCm}cm & khung viền`,
      bomLevel: "level_1",
    });

    if (ironOption.code !== "KHONG-KHUNG" && level2BraceBars > 0) {
      const level2UnitPrice = 145000; // Đơn giá chuẩn của sắt hộp 25x25 (SAT-HOP-25)
      items.push({
        category: "Khung sắt",
        itemCode: "SAT-CHONG-25",
        itemName: "Sắt chống vuông 25x25 (BOM Cấp 2 - Không cố định)",
        unit: "Cây 6m",
        quantity: level2BraceBars,
        unitPrice: level2UnitPrice,
        amount: level2BraceBars * level2UnitPrice,
        note: "BOM Cấp 2: Thanh sắt chống tăng cứng & giằng bão không cố định theo địa hình",
        bomLevel: "level_2",
      });
    }

    const realPerimeterM = Math.round(2 * (width + height) * 10) / 10;
    items.push(
      {
        category: "Mặt dựng",
        itemCode: "BAT-HIFLEX-UV",
        itemName: "Bạt UV xuyên sáng ngoài trời chuẩn màu",
        unit: "m²",
        quantity: areaSqm,
        unitPrice: 160000,
        amount: Math.round(areaSqm * 160000),
        note: `Bạt in UV khổ ${width}m x ${height}m (${areaSqm} m²)`,
        bomLevel: "level_1",
      },
      {
        category: "Vật tư phụ & Keo",
        itemCode: "TOLE-VIEN-1M",
        itemName: "Tole viền bo mép bảng bạt (khổ 1m)",
        unit: "Mét",
        quantity: Math.max(1, Math.round(realPerimeterM)),
        unitPrice: 35000,
        amount: Math.max(1, Math.round(realPerimeterM)) * 35000,
        note: `Tole bảo vệ & căng mép bạt xung quanh chu vi (${realPerimeterM}m)`,
        bomLevel: "level_1",
      },
      {
        category: "Vật tư phụ & Keo",
        itemCode: "NEP-VINOX",
        itemName: "Vinox nẹp viền chống rỉ",
        unit: "Mét",
        quantity: Math.max(1, Math.round(width)),
        unitPrice: 45000,
        amount: Math.max(1, Math.round(width)) * 45000,
        note: "Nẹp chỉ Vinox trang trí viền bảng",
        bomLevel: "level_1",
      }
    );
  } else {
    // === HẠNG MỤC: BẢNG ALU / HỘP ĐÈN (THEO BẢNG EXCEL) ===
    items.push({
      category: "Khung sắt",
      itemCode: ironOption.code,
      itemName: ironOption.name.replace(/\s*\(Cây 6\.0m\)/i, "").trim(),
      unit: ironOption.unit,
      quantity: ironOption.unit === "Mét" ? steelMeters : steelBars6m,
      unitPrice: ironOption.defaultPrice,
      amount: (ironOption.unit === "Mét" ? steelMeters : steelBars6m) * ironOption.defaultPrice,
      note: `${steelMeters}m sắt đan nan ô ${gridSpacingCm}cm & khung viền`,
      bomLevel: "level_1",
    });

    if (ironOption.code !== "KHONG-KHUNG" && level2BraceBars > 0) {
      const level2UnitPrice = 145000; // Đơn giá chuẩn của sắt hộp 25x25 (SAT-HOP-25)
      items.push({
        category: "Khung sắt",
        itemCode: "SAT-CHONG-25",
        itemName: "Sắt chống vuông 25x25 (BOM Cấp 2 - Không cố định)",
        unit: "Cây 6m",
        quantity: level2BraceBars,
        unitPrice: level2UnitPrice,
        amount: level2BraceBars * level2UnitPrice,
        note: "BOM Cấp 2: Thanh sắt chống tăng cứng & giằng bão không cố định theo địa hình",
        bomLevel: "level_2",
      });
    }

    items.push({
      category: "Mặt dựng",
      itemCode: surfaceOption.code,
      itemName: surfaceOption.name,
      unit: surfaceOption.unit,
      quantity: surfaceQty,
      unitPrice: surfaceOption.defaultPrice,
      amount: surfaceQty * surfaceOption.defaultPrice,
      note: surfaceNote,
      bomLevel: "level_1",
    });

    // Chỉ thêm Dải màu khi có tùy chọn hasColorStrip
    if (input.hasColorStrip) {
      items.push({
        category: "Logo & Nhận diện",
        itemCode: "DAI-MAU-THUONG-HIEU",
        itemName: "Dải màu nhận diện thương hiệu",
        unit: "Bộ",
        quantity: 1,
        unitPrice: 150000,
        amount: 150000,
        note: "Dải màu nhận diện đáy/đỉnh biển theo yêu cầu",
        bomLevel: "level_1",
      });
    }

    // Chỉ thêm chữ nổi khi letterMaterial != NONE hoặc có yêu cầu chữ
    const hasExplicitNoLetters =
      input.letterMaterial === "NONE" ||
      Boolean(input.letterMaterial && input.letterMaterial.toLowerCase().includes("không chữ"));
    const shouldAddLetters =
      !hasExplicitNoLetters &&
      (Boolean(input.letterMaterial) || input.signageType === "alu_letters" || input.signageType === "letters_logo");

    if (shouldAddLetters) {
      const letCode = input.letterMaterial && input.letterMaterial !== "NONE" ? input.letterMaterial : "MICA-UON-CHAN";
      const letOpt =
        STANDARD_LETTER_OPTIONS.find((l) => l.code === letCode) ||
        STANDARD_LETTER_OPTIONS.find((l) => l.name.toLowerCase().includes(letCode.toLowerCase())) ||
        STANDARD_LETTER_OPTIONS[1];
      items.push({
        category: "Logo & Nhận diện",
        itemCode: letOpt.code || "MICA-UON-CHAN",
        itemName: letOpt.name || "Bộ chữ Mica nội dung đại lý",
        unit: letOpt.unit || "Bộ",
        quantity: 1,
        unitPrice: letOpt.defaultPrice || 1200000,
        amount: letOpt.defaultPrice || 1200000,
        note: `Chữ nổi thương hiệu / nội dung đại lý: ${letOpt.name}`,
        bomLevel: "level_1",
      });
    }

    // Vật tư phụ keo chuẩn theo xưởng (Excel: Keo alu, Keo silicone, Keo 502 nhỏ, Keo định vị)
    items.push(
      {
        category: "Vật tư phụ & Keo",
        itemCode: "KEO-ALU-TITEBOND",
        itemName: "Keo dán chuyên dụng Alu Titebond Heavy Duty",
        unit: "Chai",
        quantity: titebondTubes,
        unitPrice: 75000,
        amount: titebondTubes * 75000,
        note: "Keo liên kết tấm alu vào khung sắt",
        bomLevel: "level_1",
      },
      {
        category: "Vật tư phụ & Keo",
        itemCode: "KEO-SILICONE-APOLLO",
        itemName: "Keo Silicone chống nước ngoài trời Apollo A500",
        unit: "Chai",
        quantity: siliconeTubes,
        unitPrice: 55000,
        amount: siliconeTubes * 55000,
        note: "Bắn ron chỉ & chống dột",
        bomLevel: "level_1",
      },
      {
        category: "Vật tư phụ & Keo",
        itemCode: "KEO-502-NHO",
        itemName: "Keo 502 nhỏ định vị chữ nhanh",
        unit: "Chai",
        quantity: 2,
        unitPrice: 10000,
        amount: 20000,
        note: "Dán cố định chân chữ Mica",
        bomLevel: "level_1",
      },
      {
        category: "Vật tư phụ & Keo",
        itemCode: "KEO-DINH-VI",
        itemName: "Keo định vị / Băng keo dán 2 mặt",
        unit: "Cuộn",
        quantity: 1,
        unitPrice: 35000,
        amount: 35000,
        note: "Định vị vị trí logo & nội dung",
        bomLevel: "level_1",
      }
    );

    // Module LED & Nguồn (Chỉ tạo khi hộp đèn hoặc có yêu cầu đèn)
    if (totalLeds > 0 && ledOption.code !== "NONE") {
      items.push({
        category: "Hệ thống LED",
        itemCode: ledOption.code,
        itemName: ledOption.name,
        unit: ledOption.unit,
        quantity: totalLeds,
        unitPrice: ledOption.defaultPrice,
        amount: totalLeds * ledOption.defaultPrice,
        note: `Mật độ ${ledDensity} bóng/m² (Tổng tiêu thụ ${totalWatts}W)`,
        bomLevel: "level_1",
      });
    }

    if (powerUnitsNeeded > 0 && powerOption.code !== "NONE") {
      items.push({
        category: "Nguồn điện",
        itemCode: powerOption.code,
        itemName: powerOption.name,
        unit: powerOption.unit,
        quantity: powerUnitsNeeded,
        unitPrice: powerOption.defaultPrice,
        amount: powerUnitsNeeded * powerOption.defaultPrice,
        note: `Chạy tải an toàn ${powerLoadPercent}% công suất định mức`,
        bomLevel: "level_1",
      });
    }
  }

  // 2b. Phụ kiện Logo & Nhận diện thương hiệu tùy chọn từ khảo sát
  const hasLogo65 = Boolean(input.hasMicaLogo65);
  const hasSideTrim = Boolean(input.hasSideTrim);
  const hasColorStrip = Boolean(input.hasColorStrip);

  if (hasLogo65) {
    items.push({
      category: "Logo & Nhận diện",
      itemCode: "MICA-LOGO-65",
      itemName: "Hộp đèn Mica hút nổi Logo Nippon Paint 65x65cm (kèm LED âm)",
      unit: "Bộ",
      quantity: 1,
      unitPrice: 650000,
      amount: 650000,
      note: "Chuẩn nhận diện thương hiệu đại lý Nippon Paint",
    });
  }

  if (hasSideTrim) {
    items.push({
      category: "Logo & Nhận diện",
      itemCode: "NEP-LUON-NHOM",
      itemName: "Nẹp nhôm viền lườn hộp biển",
      unit: "Mét",
      quantity: Math.max(1, Math.round(perimeterMeters)),
      unitPrice: 85000,
      amount: Math.max(1, Math.round(perimeterMeters)) * 85000,
      note: "Lườn viền ốp bảo vệ mép biển",
    });
  }

  if (hasColorStrip) {
    items.push({
      category: "Logo & Nhận diện",
      itemCode: "DECAL-DAI-MAU",
      itemName: "Decal 3M dải 3 màu nhận diện thương hiệu Nippon",
      unit: "Mét",
      quantity: Math.max(1, Math.round(width)),
      unitPrice: 120000,
      amount: Math.max(1, Math.round(width)) * 120000,
      note: "Dán dọc dải màu nhận diện đáy/đỉnh biển",
    });
  }

  // 2c. Hạng mục Nội thất & POSM bổ sung
  if (!isKe && input.displayShelves && input.displayShelves.trim()) {
    items.push({
      category: "Nội thất & POSM",
      itemCode: "KE-TRUNG-BAY-POSM",
      itemName: `Kệ trưng bày sơn Nippon Paint (${input.displayShelves.trim()})`,
      unit: "Bộ",
      quantity: 1,
      unitPrice: 2800000,
      amount: 2800000,
      note: "Kệ màu, kệ thông tin sản phẩm, kệ sắt sơn tĩnh điện",
    });
  }

  if (input.furniture && input.furniture.trim()) {
    items.push({
      category: "Nội thất & POSM",
      itemCode: "BAN-LE-TAN-POSM",
      itemName: `Bàn ghế đại lý (${input.furniture.trim()})`,
      unit: "Bộ",
      quantity: 1,
      unitPrice: 3200000,
      amount: 3200000,
      note: "Bàn lễ tân, hộp bàn lễ tân, ghế làm việc",
    });
  }

  if (input.otherPosm && input.otherPosm.trim()) {
    items.push({
      category: "Nội thất & POSM",
      itemCode: "POSM-NHAN-DIEN",
      itemName: `Vật phẩm nhận diện khác (${input.otherPosm.trim()})`,
      unit: "Bộ",
      quantity: 1,
      unitPrice: 450000,
      amount: 450000,
      note: "HĐ ngôi nhà, dán decal kệ sắt cũ...",
    });
  }

  if (input.repairScope && input.repairScope.trim()) {
    items.push({
      category: "Vật tư phụ & Keo",
      itemCode: "VAT-TU-SUA-CHUA",
      itemName: `Vật tư & Chi phí bảo trì sửa chữa (${input.repairScope.trim()})`,
      unit: "Gói",
      quantity: 1,
      unitPrice: 500000,
      amount: 500000,
      note: "Sửa địa chỉ, sửa bảng, sửa tay nắm kệ gỗ, bắn trần alu...",
    });
  }

  let finalItems = items;
  if (Array.isArray(input.customItems) && input.customItems.length > 0) {
    finalItems = input.customItems;
  }

  const productQty = Math.max(1, Number(input.productQuantity || input.quantity) || 1);
  if (productQty > 1 && (!input.customItems || input.customItems.length === 0)) {
    finalItems = finalItems.map((it) => ({
      ...it,
      quantity: Math.round(it.quantity * productQty * 100) / 100,
      amount: Math.round(Math.round(it.quantity * productQty * 100) / 100 * (it.unitPrice || 0)),
    }));
  }

  const totalEstimatedMaterialCost = finalItems.reduce(
    (sum, it) => sum + Math.max(0, Number(it.amount) || (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) || 0),
    0
  );

  return {
    areaSqm: Math.round(areaSqm * productQty * 100) / 100,
    flatAreaSqm: Math.round(flatAreaSqm * productQty * 100) / 100,
    steelMeters: Math.round(steelMeters * productQty * 10) / 10,
    steelBars6m: steelBars6m * productQty,
    level2BraceBars: level2BraceBars * productQty,
    totalSteelBars: totalSteelBars * productQty,
    steelGridDetails: {
      horizontalBars: horizontalBars * productQty,
      verticalBars: verticalBars * productQty,
      perimeterMeters: perimeterMeters * productQty,
    },
    aluSheetsCount: aluSheetsCount * productQty,
    aluPurchasedSqm: Math.round(aluPurchasedSqm * productQty * 100) / 100,
    aluScrapSqm: Math.round(aluScrapSqm * productQty * 100) / 100,
    aluEfficiencyPercent,
    totalLeds: totalLeds * productQty,
    totalWatts: Math.round(totalWatts * productQty * 10) / 10,
    powerUnitsNeeded: powerUnitsNeeded * productQty,
    powerLoadPercent,
    titebondTubes: titebondTubes * productQty,
    siliconeTubes: siliconeTubes * productQty,
    rivetsCount: rivetsCount * productQty,
    screwsCount: screwsCount * productQty,
    items: finalItems,
    totalEstimatedMaterialCost,
  };
}

// ==========================================
// ĐỊNH NGHĨA MANUFACTURING BOM (BOM SẢN XUẤT THÀNH PHẨM)
// ==========================================

export interface ManufacturingBomItem {
  id: string;
  category:
    | "Khung sắt & Cơ khí"
    | "Mặt dựng & Tấm nền"
    | "Hệ thống LED & Chiếu sáng"
    | "Nguồn & Điện tử"
    | "Keo & Phụ kiện liên kết"
    | "Bạt in & Mica"
    | "Vật tư phụ khác";
  itemCode?: string;
  itemName: string;
  unit: string;
  normQty: number; // Định mức tiêu chuẩn cho 1 ĐVT thành phẩm
  scrapRate: number; // % Hao hụt cho phép (VD: 5, 10)
  suggestedQty: number; // normQty * (1 + scrapRate / 100)
  unitPrice: number;
  amount: number; // suggestedQty * unitPrice
  note?: string;
}

export interface ManufacturingBomProduct {
  id: string;
  code: string;
  name: string;
  category:
    | "Biển hộp đèn"
    | "Mặt dựng Alu"
    | "Chữ nổi mỹ thuật"
    | "Biển vẫy & Pylon"
    | "Màn hình LED"
    | "Bảng bạt Hiflex"
    | "Khác";
  baseUnit: "m²" | "bộ" | "cái" | "mét";
  signageType: SignageType;
  description: string;
  items: ManufacturingBomItem[];
  totalCostPerUnit: number;
  isStandardPreset?: boolean;
}

export interface ProductionBatchLine {
  item: ManufacturingBomItem;
  totalNormQty: number;
  totalSuggestedQty: number;
  unitPrice: number;
  totalAmount: number;
  selected: boolean;
}

export interface ProductionBatchResult {
  product: ManufacturingBomProduct;
  batchQty: number;
  lines: ProductionBatchLine[];
  totalEstimatedCost: number;
}

// BỘ CÔNG THỨC ĐỊNH MỨC SẢN XUẤT TIÊU CHUẨN NGÀNH BIỂN HIỆU QUẢNG CÁO
export const STANDARD_MANUFACTURING_BOMS: ManufacturingBomProduct[] = [
  {
    id: "bom-preset-lightbox-3m",
    code: "BOM-TP-01",
    name: "Biển hộp đèn bạt không gân 3M in UV nắp bật",
    category: "Biển hộp đèn",
    baseUnit: "m²",
    signageType: "lightbox_3m",
    description: "Hộp đèn bạt 3M không gân in UV phẳng, khung nhôm định hình nhôm định hình bật nắp, module LED Hàn Quốc hắt đều",
    totalCostPerUnit: 896250,
    isStandardPreset: true,
    items: [
      {
        id: "item-3m-1",
        category: "Bạt in & Mica",
        itemCode: "BAT-3M-UV",
        itemName: "Bạt 3M không gân in mực UV 8 pass cao cấp",
        unit: "m²",
        normQty: 1.05,
        scrapRate: 5,
        suggestedQty: 1.1,
        unitPrice: 220000,
        amount: 242000,
        note: "Tính thêm mép gấp viền nhôm 5cm mỗi cạnh",
      },
      {
        id: "item-3m-2",
        category: "Khung sắt & Cơ khí",
        itemCode: "NHOM-HOP-DEN-BAT-NAP",
        itemName: "Khung nhôm định hình hộp đèn bật nắp bản 8cm",
        unit: "mét",
        normQty: 2.2,
        scrapRate: 5,
        suggestedQty: 2.31,
        unitPrice: 85000,
        amount: 196350,
        note: "Hao hụt cắt mòi góc 45 độ",
      },
      {
        id: "item-3m-3",
        category: "Khung sắt & Cơ khí",
        itemCode: "SAT-HOP-20",
        itemName: "Sắt hộp mạ kẽm 20x20x1.2mm làm xương đáy",
        unit: "Cây 6m",
        normQty: 0.35,
        scrapRate: 5,
        suggestedQty: 0.37,
        unitPrice: 125000,
        amount: 46250,
        note: "Nan xương đan đáy đỡ đèn",
      },
      {
        id: "item-3m-4",
        category: "Hệ thống LED & Chiếu sáng",
        itemCode: "LED-HQ-12V",
        itemName: "Module LED 3 mắt Hàn Quốc 12V 1.2W lens rộng 160°",
        unit: "Bóng",
        normQty: 36,
        scrapRate: 2,
        suggestedQty: 36.7,
        unitPrice: 8500,
        amount: 311950,
        note: "Mật độ 36 bóng/m² chống sọc sáng",
      },
      {
        id: "item-3m-5",
        category: "Nguồn & Điện tử",
        itemCode: "NGUON-12V-400W",
        itemName: "Nguồn chống nước Meanwell 12V 400W ngoài trời IP67",
        unit: "Cái",
        normQty: 0.15,
        scrapRate: 0,
        suggestedQty: 0.15,
        unitPrice: 480000,
        amount: 72000,
        note: "1 nguồn tải trung bình 6-7 m²",
      },
      {
        id: "item-3m-6",
        category: "Keo & Phụ kiện liên kết",
        itemCode: "PHU-KIEN-HOP-DEN",
        itemName: "Bộ ke góc, lò xo căng bạt & ốc vít lắp đặt",
        unit: "Bộ",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 27700,
        amount: 27700,
        note: "Phụ kiện trọn bộ cho 1 m²",
      },
    ],
  },
  {
    id: "bom-preset-alu-facade",
    code: "BOM-TP-02",
    name: "Mặt dựng Alu Alcorest 3mm ngoài trời khung sắt",
    category: "Mặt dựng Alu",
    baseUnit: "m²",
    signageType: "alu_letters",
    description: "Mặt dựng tấm Alu Alcorest ngoài trời nhôm 0.21mm, xương sắt hộp 25x25 đan nan 40x40cm, ron silicon âm",
    totalCostPerUnit: 345000,
    isStandardPreset: true,
    items: [
      {
        id: "item-alu-1",
        category: "Mặt dựng & Tấm nền",
        itemCode: "ALU-ALCOREST-EV2002",
        itemName: "Tấm Alu Alcorest EV2002 3mm x 0.21mm ngoài trời",
        unit: "Tấm 1.22x2.44",
        normQty: 0.36,
        scrapRate: 10,
        suggestedQty: 0.4,
        unitPrice: 380000,
        amount: 152000,
        note: "Tấm chuẩn 2.977 m², phay gập mép viền",
      },
      {
        id: "item-alu-2",
        category: "Khung sắt & Cơ khí",
        itemCode: "SAT-HOP-25",
        itemName: "Sắt hộp mạ kẽm 25x25x1.4mm (Cây 6.0m)",
        unit: "Cây 6m",
        normQty: 0.82,
        scrapRate: 5,
        suggestedQty: 0.86,
        unitPrice: 145000,
        amount: 124700,
        note: "Đan xương nan ô chuẩn 40cm x 40cm",
      },
      {
        id: "item-alu-3",
        category: "Keo & Phụ kiện liên kết",
        itemCode: "KEO-TITEBOND",
        itemName: "Keo xây dựng dán đa năng Titebond Heavy Duty",
        unit: "Chai",
        normQty: 0.28,
        scrapRate: 0,
        suggestedQty: 0.28,
        unitPrice: 75000,
        amount: 21000,
        note: "1 chai dán chắc chắn khoảng 3.5 m² alu",
      },
      {
        id: "item-alu-4",
        category: "Keo & Phụ kiện liên kết",
        itemCode: "KEO-SILICONE-A500",
        itemName: "Keo Silicone Apollo A500 chống thời tiết bắn ron",
        unit: "Chai",
        normQty: 0.25,
        scrapRate: 0,
        suggestedQty: 0.25,
        unitPrice: 55000,
        amount: 13750,
        note: "Bắn ron chỉ âm chống thấm và co giãn",
      },
      {
        id: "item-alu-5",
        category: "Keo & Phụ kiện liên kết",
        itemCode: "DINH-RUT-VIT",
        itemName: "Đinh rút rive 4x12mm, vít tự khoan & băng dính xốp 2 mặt",
        unit: "Gói",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 33550,
        amount: 33550,
        note: "Phụ kiện bắn gá định vị mặt dựng",
      },
    ],
  },
  {
    id: "bom-preset-inox-letters",
    code: "BOM-TP-03",
    name: "Bộ chữ Inox vàng gương lọng viền Mica sáng chân",
    category: "Chữ nổi mỹ thuật",
    baseUnit: "bộ",
    signageType: "alu_letters",
    description: "Bộ chữ thương hiệu Inox 304 vàng gương cắt lọng laser, mặt mica FS Đài Loan 3mm xuyên sáng, uốn gáy cao 6cm",
    totalCostPerUnit: 2280000,
    isStandardPreset: true,
    items: [
      {
        id: "item-inox-1",
        category: "Mặt dựng & Tấm nền",
        itemCode: "INOX-304-GOLD",
        itemName: "Tấm Inox 304 vàng gương 1.0mm chuẩn bóng gương",
        unit: "Tấm 1.22x2.44",
        normQty: 0.45,
        scrapRate: 12,
        suggestedQty: 0.5,
        unitPrice: 950000,
        amount: 475000,
        note: "Hao hụt cắt lọng viền chữ laser fiber",
      },
      {
        id: "item-inox-2",
        category: "Bạt in & Mica",
        itemCode: "MICA-FS-3MM",
        itemName: "Tấm Mica Đài Loan Fusheng 3mm màu sữa tán sáng",
        unit: "Tấm 1.22x2.44",
        normQty: 0.35,
        scrapRate: 10,
        suggestedQty: 0.38,
        unitPrice: 650000,
        amount: 247000,
        note: "Mặt mica ép âm viền inox",
      },
      {
        id: "item-inox-3",
        category: "Khung sắt & Cơ khí",
        itemCode: "GAY-UON-INOX",
        itemName: "Chân gáy uốn Inox 304 vàng gương cao 6cm có gờ",
        unit: "mét",
        normQty: 14.0,
        scrapRate: 8,
        suggestedQty: 15.1,
        unitPrice: 48000,
        amount: 724800,
        note: "Hàn tig chân chữ thẩm mỹ cao",
      },
      {
        id: "item-inox-4",
        category: "Hệ thống LED & Chiếu sáng",
        itemCode: "LED-MINI-12V",
        itemName: "Module LED Mini 12V góc chiếu rộng hắt chân sáng ấm",
        unit: "Bóng",
        normQty: 85,
        scrapRate: 5,
        suggestedQty: 89.2,
        unitPrice: 6500,
        amount: 579800,
        note: "Đi dây giấu trong chân chữ",
      },
      {
        id: "item-inox-5",
        category: "Nguồn & Điện tử",
        itemCode: "NGUON-DUA-12V-100W",
        itemName: "Nguồn đũa 12V 100W siêu mỏng chuyên giấu biển",
        unit: "Cái",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 155000,
        amount: 155000,
        note: "Nguồn kích thước nhỏ gọn giấu trong khe",
      },
      {
        id: "item-inox-6",
        category: "Keo & Phụ kiện liên kết",
        itemCode: "KEO-AB-INOX",
        itemName: "Keo dán kim loại AB hai thành phần & chân ốc ti ren",
        unit: "Bộ",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 98400,
        amount: 98400,
        note: "Ti ren inox bắt cách tường 2-3cm hắt sáng",
      },
    ],
  },
  {
    id: "bom-preset-pylon-sign",
    code: "BOM-TP-04",
    name: "Biển vẫy Mica hút nổi LED tròn D60cm hai mặt",
    category: "Biển vẫy & Pylon",
    baseUnit: "cái",
    signageType: "neon_sign",
    description: "Biển vẫy quảng cáo mặt mica hút nổi đường kính 60cm dày 2.5mm, khung nhôm đúc định hình uốn cong bản 8cm",
    totalCostPerUnit: 980000,
    isStandardPreset: true,
    items: [
      {
        id: "item-vay-1",
        category: "Bạt in & Mica",
        itemCode: "MAT-MICA-HUT-NOI-D60",
        itemName: "Mặt Mica Đài Loan hút nổi tròn đường kính 60cm",
        unit: "Mặt",
        normQty: 2.0,
        scrapRate: 0,
        suggestedQty: 2.0,
        unitPrice: 180000,
        amount: 360000,
        note: "2 mặt mica hút nổi trước - sau",
      },
      {
        id: "item-vay-2",
        category: "Khung sắt & Cơ khí",
        itemCode: "KHUNG-NHOM-BIEN-VAY-D60",
        itemName: "Khung nhôm định hình tròn D60cm bản dày 8cm sơn tĩnh điện",
        unit: "Khung",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 220000,
        amount: 220000,
        note: "Khung nhôm đúc tròn khép kín",
      },
      {
        id: "item-vay-3",
        category: "Khung sắt & Cơ khí",
        itemCode: "CHAN-SAT-TREO-VAY",
        itemName: "Chân sắt mỹ thuật gắn tường dày 3mm sơn tĩnh điện đen",
        unit: "Bộ",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 120000,
        amount: 120000,
        note: "Chân tay giằng bắt 4 tắc kê sắt",
      },
      {
        id: "item-vay-4",
        category: "Hệ thống LED & Chiếu sáng",
        itemCode: "LED-MAT-CUA-12V",
        itemName: "Module LED mắt cua rọi cạnh 12V 1.5W siêu sáng",
        unit: "Bóng",
        normQty: 10,
        scrapRate: 0,
        suggestedQty: 10,
        unitPrice: 9000,
        amount: 90000,
        note: "Bố trí rọi đều vào tâm tròn",
      },
      {
        id: "item-vay-5",
        category: "Nguồn & Điện tử",
        itemCode: "NGUON-12V-60W",
        itemName: "Nguồn chống nước ngoài trời 12V 60W IP67",
        unit: "Cái",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 105000,
        amount: 105000,
        note: "Nguồn đặt giấu phía sau chân đế",
      },
      {
        id: "item-vay-6",
        category: "Bạt in & Mica",
        itemCode: "DECAL-IN-UV-D60",
        itemName: "Decal xuyên đèn in UV ngoài trời dán định hình 2 mặt",
        unit: "Bộ",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 85000,
        amount: 85000,
        note: "In UV cán màng bóng bảo vệ",
      },
    ],
  },
  {
    id: "bom-preset-hiflex-banner",
    code: "BOM-TP-05",
    name: "Bảng hiệu bạt Hiflex căng khung sắt mạ kẽm",
    category: "Bảng bạt Hiflex",
    baseUnit: "m²",
    signageType: "canvas_hiflex",
    description: "Bảng bạt Hiflex dày 0.36mm in KTS độ phân giải cao, khung sắt mạ kẽm 20x20x1.2mm, nẹp V nhôm viền",
    totalCostPerUnit: 148000,
    isStandardPreset: true,
    items: [
      {
        id: "item-hf-1",
        category: "Bạt in & Mica",
        itemCode: "BAT-HIFLEX-036",
        itemName: "Bạt Hiflex 0.36mm đế xám chống xuyên sáng",
        unit: "m²",
        normQty: 1.08,
        scrapRate: 8,
        suggestedQty: 1.16,
        unitPrice: 42000,
        amount: 48720,
        note: "Gấp mép viền bắn vít căng phẳng",
      },
      {
        id: "item-hf-2",
        category: "Khung sắt & Cơ khí",
        itemCode: "SAT-HOP-20-KEM",
        itemName: "Sắt hộp mạ kẽm 20x20x1.2mm (Cây 6.0m)",
        unit: "Cây 6m",
        normQty: 0.55,
        scrapRate: 5,
        suggestedQty: 0.58,
        unitPrice: 115000,
        amount: 66700,
        note: "Đan nan xương bước nan 50cm",
      },
      {
        id: "item-hf-3",
        category: "Khung sắt & Cơ khí",
        itemCode: "NEP-NHOM-V20",
        itemName: "Nẹp nhôm V20x20 viền 4 cạnh mép bạt",
        unit: "mét",
        normQty: 1.4,
        scrapRate: 5,
        suggestedQty: 1.47,
        unitPrice: 16000,
        amount: 23520,
        note: "Che mép bạt tạo độ thẩm mỹ",
      },
      {
        id: "item-hf-4",
        category: "Keo & Phụ kiện liên kết",
        itemCode: "VIT-DU-BAN-BAT",
        itemName: "Vít đuôi cá đầu dù mạ kẽm & keo dán mép bạt",
        unit: "Gói",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 9060,
        amount: 9060,
        note: "Vật tư phụ hoàn thiện",
      },
    ],
  },
  {
    id: "bom-preset-led-matrix-p3",
    code: "BOM-TP-06",
    name: "Màn hình LED P3 Full Color ngoài trời chống nước",
    category: "Màn hình LED",
    baseUnit: "m²",
    signageType: "led_matrix",
    description: "Màn hình LED Outdoor P3 SMD1921 độ sáng 5000nits, cabinet nhôm đúc 960x960mm IP65, nguồn 5V 60A",
    totalCostPerUnit: 9680000,
    isStandardPreset: true,
    items: [
      {
        id: "item-p3-1",
        category: "Hệ thống LED & Chiếu sáng",
        itemCode: "MODULE-LED-P3-OUT",
        itemName: "Module LED Outdoor P3 (192x192mm) chống nước IP65",
        unit: "Tấm",
        normQty: 27.0,
        scrapRate: 2,
        suggestedQty: 27.5,
        unitPrice: 280000,
        amount: 7700000,
        note: "27 tấm module ghép vừa 1 m²",
      },
      {
        id: "item-p3-2",
        category: "Nguồn & Điện tử",
        itemCode: "NGUON-5V-60A-LED",
        itemName: "Bộ nguồn chuyên dụng màn LED mỏng 5V 60A (300W)",
        unit: "Cái",
        normQty: 3.0,
        scrapRate: 0,
        suggestedQty: 3.0,
        unitPrice: 210000,
        amount: 630000,
        note: "Mỗi nguồn cấp tải cho 9 tấm P3",
      },
      {
        id: "item-p3-3",
        category: "Nguồn & Điện tử",
        itemCode: "CARD-NOVA-MRV336",
        itemName: "Card thu tín hiệu màn hình LED NovaStar MRV336",
        unit: "Cái",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 380000,
        amount: 380000,
        note: "1 card quản lý 1 cabinet",
      },
      {
        id: "item-p3-4",
        category: "Khung sắt & Cơ khí",
        itemCode: "CABINET-NHOM-DUC",
        itemName: "Cabinet nhôm đúc định hình chống nước ngoài trời",
        unit: "m²",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 780000,
        amount: 780000,
        note: "Vỏ cabinet có quạt tản nhiệt",
      },
      {
        id: "item-p3-5",
        category: "Nguồn & Điện tử",
        itemCode: "DAY-NGUON-CAP-TIN-HIEU",
        itemName: "Dây cáp nguồn 5V chịu tải, cáp bẹ tín hiệu & ron cao su",
        unit: "Bộ",
        normQty: 1.0,
        scrapRate: 0,
        suggestedQty: 1.0,
        unitPrice: 190000,
        amount: 190000,
        note: "Phụ kiện đấu nối trọn gói",
      },
    ],
  },
];

// Hàm nhân ma trận định mức ra sản lượng mẻ xuất kho
export function calculateBatchProductionBom(
  product: ManufacturingBomProduct,
  batchQty: number
): ProductionBatchResult {
  const qty = Math.max(0.1, Number(batchQty) || 1.0);

  const lines: ProductionBatchLine[] = product.items.map((it) => {
    const totalNormQty = Math.round(it.normQty * qty * 100) / 100;
    const totalSuggestedQty = Math.round(it.suggestedQty * qty * 100) / 100;
    const totalAmount = Math.round(totalSuggestedQty * it.unitPrice);

    return {
      item: it,
      totalNormQty,
      totalSuggestedQty,
      unitPrice: it.unitPrice,
      totalAmount,
      selected: true,
    };
  });

  const totalEstimatedCost = lines.reduce((sum, l) => sum + l.totalAmount, 0);

  return {
    product,
    batchQty: qty,
    lines,
    totalEstimatedCost,
  };
}
