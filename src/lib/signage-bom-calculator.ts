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
  | "other";

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
}

export interface BomItemLine {
  category: "Khung sắt" | "Mặt dựng" | "Hệ thống LED" | "Nguồn điện" | "Vật tư phụ & Keo";
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note?: string;
}

export interface BomCalculationResult {
  areaSqm: number;
  flatAreaSqm: number;
  // Khung sắt
  steelMeters: number;
  steelBars6m: number;
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

  // 3. Tính toán Module LED & Bộ nguồn 12V
  let defaultDensity = 80;
  let defaultWatts = 1.2;
  if (input.signageType === "lightbox_3m") {
    defaultDensity = 45; // Hộp đèn bạt dùng LED thanh / module hắt viền
    defaultWatts = 1.5;
  } else if (input.signageType === "led_matrix") {
    defaultDensity = 120;
    defaultWatts = 2.0;
  } else if (input.signageType === "neon_sign") {
    defaultDensity = 25; // mét led dây
    defaultWatts = 8.0;
  } else if (input.signageType === "canvas_hiflex") {
    defaultDensity = 0; // Biển bạt không gắn LED mặt, dùng đèn pha rọi
    defaultWatts = 0;
  }

  const ledDensity = input.ledDensityPerM2 ?? defaultDensity;
  const ledWatts = input.ledWattsPerUnit ?? defaultWatts;
  const totalLeds = Math.ceil(areaSqm * ledDensity);
  const totalWatts = Math.round(totalLeds * ledWatts * 10) / 10;

  const powerWattsPerUnit = input.powerUnitWatts || 400;
  const safetyLoad = input.powerSafetyLoad || 0.8; // Ngưỡng an toàn 80% tải
  const safeWattsPerUnit = powerWattsPerUnit * safetyLoad; // 320W an toàn
  const powerUnitsNeeded =
    totalWatts > 0 ? Math.ceil(totalWatts / safeWattsPerUnit) : 0;
  const powerLoadPercent =
    powerUnitsNeeded > 0
      ? Math.round((totalWatts / (powerUnitsNeeded * powerWattsPerUnit)) * 100)
      : 0;

  // 4. Vật tư phụ & Tiêu hao
  const titebondTubes = Math.max(1, Math.ceil(flatAreaSqm / 3.2)); // 1 chai dán ~ 3.2 m²
  const siliconeTubes = Math.max(1, Math.ceil((2 * (width + height)) / 7.5)); // 1 chai bắn ~ 7.5m
  const rivetsCount = Math.ceil(flatAreaSqm * 40); // 40 con đinh rút / m²
  const screwsCount = Math.ceil(steelMeters * 3.5); // 3.5 con vít tự khoan / mét sắt

  // 5. Bảng chi tiết vật tư & Giá thị trường dự toán
  const ironPrice = 145000; // 145k/cây 6m
  const aluPrice = 380000; // 380k/tấm Alcorest 3mm EV2002
  const ledPrice = 7500; // 7,500đ/bóng LED NC Hàn Quốc
  const powerPrice = 450000; // 450k/bộ nguồn Meanwell 400W ngoài trời
  const titebondPrice = 75000;
  const siliconePrice = 55000;
  const rivetPrice = 250;
  const screwPrice = 350;

  const items: BomItemLine[] = [
    {
      category: "Khung sắt",
      itemCode: "SAT-HOP-25",
      itemName: `${input.ironBoxType || "Sắt hộp mạ kẽm 25x25x1.4mm"} (Cây 6.0m)`,
      unit: "Cây 6m",
      quantity: steelBars6m,
      unitPrice: ironPrice,
      amount: steelBars6m * ironPrice,
      note: `Tổng ${steelMeters}m sắt (Đan nan lưới ô ${gridSpacingCm}cm)`,
    },
    {
      category: "Mặt dựng",
      itemCode: "ALU-ALCO-3MM",
      itemName: `Tấm Alu Alcorest 3mm ngoài trời (Khổ 1.22m × 2.44m)`,
      unit: "Tấm",
      quantity: aluSheetsCount,
      unitPrice: aluPrice,
      amount: aluSheetsCount * aluPrice,
      note: `Trải phẳng ${flatAreaSqm} m² (Hao hụt cắt góc ${input.aluScrapRate || 10}%)`,
    },
  ];

  if (totalLeds > 0) {
    items.push({
      category: "Hệ thống LED",
      itemCode: "LED-MOD-3M",
      itemName: input.ledType || "Module LED 3 mắt Hàn Quốc 12V 1.2W IP68",
      unit: "Bóng",
      quantity: totalLeds,
      unitPrice: ledPrice,
      amount: totalLeds * ledPrice,
      note: `Mật độ ${ledDensity} bóng/m² (Tổng tiêu thụ ${totalWatts}W)`,
    });
  }

  if (powerUnitsNeeded > 0) {
    items.push({
      category: "Nguồn điện",
      itemCode: "NGUON-MEANWELL-400W",
      itemName: input.powerUnitType || "Nguồn Meanwell ngoài trời 12V 400W IP67",
      unit: "Bộ",
      quantity: powerUnitsNeeded,
      unitPrice: powerPrice,
      amount: powerUnitsNeeded * powerPrice,
      note: `Chạy tải an toàn ${powerLoadPercent}% công suất định mức`,
    });
  }

  items.push(
    {
      category: "Vật tư phụ & Keo",
      itemCode: "KEO-TITEBOND",
      itemName: "Keo dán chuyên dụng Alu Titebond Heavy Duty",
      unit: "Chai",
      quantity: titebondTubes,
      unitPrice: titebondPrice,
      amount: titebondTubes * titebondPrice,
    },
    {
      category: "Vật tư phụ & Keo",
      itemCode: "KEO-SILICONE-A500",
      itemName: "Keo Silicone chống nước ngoài trời Apollo A500",
      unit: "Chai",
      quantity: siliconeTubes,
      unitPrice: siliconePrice,
      amount: siliconeTubes * siliconePrice,
    },
    {
      category: "Vật tư phụ & Keo",
      itemCode: "DINH-RUT-NHOM",
      itemName: "Đinh rút nhôm (Rive) 4x12mm liên kết mặt Alu",
      unit: "Con",
      quantity: rivetsCount,
      unitPrice: rivetPrice,
      amount: rivetsCount * rivetPrice,
    },
    {
      category: "Vật tư phụ & Keo",
      itemCode: "VIT-TU-KHOAN",
      itemName: "Vít tự khoan đuôi cá mạ kẽm",
      unit: "Con",
      quantity: screwsCount,
      unitPrice: screwPrice,
      amount: screwsCount * screwPrice,
    }
  );

  const totalEstimatedMaterialCost = items.reduce(
    (sum, it) => sum + it.amount,
    0
  );

  return {
    areaSqm,
    flatAreaSqm,
    steelMeters,
    steelBars6m,
    steelGridDetails: {
      horizontalBars,
      verticalBars,
      perimeterMeters,
    },
    aluSheetsCount,
    aluPurchasedSqm,
    aluScrapSqm,
    aluEfficiencyPercent,
    totalLeds,
    totalWatts,
    powerUnitsNeeded,
    powerLoadPercent,
    titebondTubes,
    siliconeTubes,
    rivetsCount,
    screwsCount,
    items,
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
