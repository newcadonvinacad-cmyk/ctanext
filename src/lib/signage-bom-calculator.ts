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
