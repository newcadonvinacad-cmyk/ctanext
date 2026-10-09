/**
 * NIPPON PAINT BRAND GUIDELINES & PARAMETRIC LAYOUT ENGINE
 * Quy chuẩn thiết kế kỹ thuật bảng hiệu hệ thống đại lý Sơn Nippon Paint Việt Nam
 * Dựa trên tài liệu chuẩn kỹ thuật thương hiệu (acc/1.png đến acc/8.png)
 */

export type NipponLayoutType =
  | "LAYOUT_03_STANDARD_HORIZONTAL" // 03: Ngang chuẩn (2/3 Logo - 1/3 Đại lý)
  | "LAYOUT_04_NARROW_HORIZONTAL"   // 04: Ngang hẹp (Slogan ngang hàng Logo)
  | "LAYOUT_05_SPLIT_VERTICAL"      // 05: Chia trên - dưới (3/5 Logo - 2/5 Đại lý)
  | "LAYOUT_06_LOGO_ONLY"           // 06: Chỉ Logo thương hiệu (Không tên đại lý)
  | "LAYOUT_07_CENTERED_BRAND"
  | "LAYOUT_08_NARROW_BRAND"
  | "LAYOUT_09_PILLAR"              // 09: Bảng hiệu dọc / Trụ Pylon
  | "LAYOUT_10_MOBILE";             // 10: Biển hiệu di động chân bánh xe

export interface SurveyInputDimensions {
  widthMeters: number;   // Chiều rộng phủ bì (mét)
  heightMeters: number;  // Chiều cao phủ bì (mét)
  depthMeters?: number;  // Độ dày khung / viền (mét, mặc định 0.15 - 0.2m)
  dealerName: string;    // Tên đại lý (in hoa, ví dụ: NAM LONG PHÁT)
  dealerType?: string;   // "Đại lý" hoặc "Trung tâm pha màu"
  dealerAddress: string; // Địa chỉ đại lý
  dealerPhone: string;   // Số điện thoại / Hotline
  dealerFax?: string;    // Fax nếu có
  materialType?: string; // "Alu + Mica" | "Bạt UV" | "Fomex bồi Decal" | "Hộp đèn"
  structureNote?: string;// Ghi chú kết cấu khung sắt (ví dụ: Sắt hộp mạ kẽm 25x25x1.2mm)
  layoutType?: NipponLayoutType; // Tùy chọn chỉ định hoặc để auto-detect
  sloganText?: string;   // Tùy chọn slogan ("Sơn Đâu Cũng Đẹp" hoặc "Sơn Nippon Sơn Đâu Cũng Đẹp")
  backgroundColor?: string; // Tùy chọn mã màu nền ("#B30024", "#BDBDBD", "#FFFFFF")
  nameFontDataUrl?: string;
  nameFontLabel?: string;
  infoFontDataUrl?: string;
  infoFontLabel?: string;
  nameLayout?: "auto" | "single" | "manual";
  nameLineGap?: number; // khoảng trống giữa hai dòng / chiều cao chữ
  dimensionDetail?: boolean;
  nameHorizontalScale?: 80 | 90 | 100;
  logoVector?: BrandVectorAsset;
  wordmarkVector?: BrandVectorAsset;
  pillarWordmarkVector?: BrandVectorAsset;
}

/** Nội dung SVG đã kiểm tra, viewBox khớp với đường nét thực tế. */
export interface BrandVectorAsset {
  content: string; width: number; height: number; label: string;
  parts?: Array<{ text: string; x: number; y: number; width: number; height: number;
    glyphs: Array<{ char: string; x: number; y: number; width: number; height: number }> }>;
}

export interface CalculatedBrandSpec {
  layoutType: NipponLayoutType;
  layoutName: string;
  totalWidthMm: number;
  totalHeightMm: number;
  totalDepthMm: number;
  areaM2: number;

  // Phân vùng hình học
  logoSection: {
    widthMm: number;
    heightMm: number;
    logoWidthMm: number;
    logoHeightMm: number;
    marginTopMm: number;
    marginLeftMm: number;
    ratioDescription: string;
  };

  rainbowBar: {
    widthMm: number;
    heightMm: number;
    positionLeftMm: number;
    positionTopMm: number;
    isVertical: boolean; // Dải màu đứng hay ngang
    ratioDescription: string;
  };

  dealerSection: {
    widthMm: number;
    heightMm: number;
    positionLeftMm: number;
    positionTopMm: number;
    marginRightMm: number;
    fontScalePercent: number; // 80% - 100% horizontally scaled
    ratioDescription: string;
  };

  // Thông số vật tư dự toán ước tính
  materialsEstimate: {
    sheetCount: number; // Số tấm Alu 1.22 x 2.44m hoặc m² bạt UV
    ironBarsCount: number; // Số cây sắt hộp 6m gia cố khung xương
    aluminumTrimMeters: number; // Mét nẹp viền nhôm định hình V20/V30
    ledModulesCount: number; // Module LED nếu là bảng hộp đèn
  };
}

// RGB minh họa theo thứ tự trong tài liệu; tài liệu không cung cấp CMYK của từng stop.
export const NIPPON_RAINBOW_COLORS = [
  "#003399", // 1. Deep Blue (Xanh dương thẫm)
  "#00A0E9", // 2. Cyan Blue (Xanh da trời)
  "#00997E", // 3. Teal Green (Xanh ngọc bích)
  "#68B82E", // 4. Leaf Green (Xanh lá mạ)
  "#E6E500", // 5. Lemon Yellow (Vàng chanh)
  "#FFB600", // 6. Yellow Amber (Vàng hổ phách)
  "#F39800", // 7. Orange (Cam sáng)
  "#E4007F", // 8. Magenta Pink (Hồng cánh sen)
  "#B5121B", // 9. Nippon Crimson Red (Đỏ đậm chuyển tiếp nền)
];

// Mã màu nhận diện thương hiệu
export const NIPPON_BRAND_COLORS = {
  redBackground: "#B30024", // RGB xem trước, không thay thế profile in CMYK.
  blueLogo: "#002E8A",
  redCmyk: "C:0 M:100 Y:80 K:30",
  blueCmyk: "C:100 M:80 Y:0 K:15",
  whiteText: "#FFFFFF",
  yellowStar: "#FFD100",
  blackSteel: "#1A1A1A",
  shopDrawingGray: "#BDBDBD", // Nền xám bạc kỹ thuật xưởng in (Shop Drawing Blueprint)
  dimRed: "#DC2626",          // Đỏ kỹ thuật đo chiều cao & khoảng cách đứng
  dimBlue: "#1D4ED8",         // Xanh kỹ thuật đo chiều ngang & kích thước tổng
  dimText: "#0F172A",
};

/** Chọn bố cục theo tỷ lệ khảo sát; hình học chữ được đo tại nippon-shop-drawing. */
export function detectRecommendedLayout(
  widthMeters: number,
  heightMeters: number,
  hasDealerInfo: boolean = true
): NipponLayoutType {
  const ratio = widthMeters / Math.max(0.1, heightMeters);
  const narrow = ratio >= 5.5 || (ratio >= 4 && heightMeters <= 1.2);
  if (ratio < 0.6) return "LAYOUT_09_PILLAR";
  if (!hasDealerInfo) {
    return narrow ? "LAYOUT_08_NARROW_BRAND" : ratio >= 1.9 ? "LAYOUT_07_CENTERED_BRAND" : "LAYOUT_06_LOGO_ONLY";
  }

  if (narrow) {
    // Biển rất dài và hẹp ngang (ví dụ 0.6m x 4.85m hoặc 0.9m x 5.9m) -> Mẫu 04
    return "LAYOUT_04_NARROW_HORIZONTAL";
  } else if (ratio >= 1.9) {
    // Biển ngang tiêu chuẩn phổ biến (ví dụ 2.4m x 12m hoặc 2.38m x 6m) -> Mẫu 03
    return "LAYOUT_03_STANDARD_HORIZONTAL";
  } else {
    // Biển gần vuông hoặc chiều cao lớn (tỷ lệ 0.6 <= ratio < 1.9, ví dụ 3.7m x 4m, 2m x 2m) -> Mẫu 05 Chia Trên Dưới
    return "LAYOUT_05_SPLIT_VERTICAL";
  }
}

/**
 * Tính toán hình học chi tiết toàn bộ các thành phần của bảng hiệu theo mm
 */
export function calculateNipponBrandSpec(input: SurveyInputDimensions): CalculatedBrandSpec {
  const X = Math.round(Math.max(0.3, Number.isFinite(input.widthMeters) ? input.widthMeters : 0.3) * 1000);
  const Y = Math.round(Math.max(0.3, Number.isFinite(input.heightMeters) ? input.heightMeters : 0.3) * 1000);
  const Z = Math.round((input.depthMeters || 0.15) * 1000);
  const areaM2 = Number(((X * Y) / 1_000_000).toFixed(2));

  const layoutType =
    input.layoutType ||
    detectRecommendedLayout(input.widthMeters, input.heightMeters,
      [input.dealerName, input.dealerType, input.dealerAddress, input.dealerPhone, input.dealerFax].some(v => Boolean(v?.trim())));

  let layoutName = "03___ Quy Cách Bảng Hiệu Ngang Chuẩn (2/3 - 1/3)";
  let logoSec = {
    widthMm: Math.round((2 / 3) * X),
    heightMm: Y,
    logoWidthMm: Math.round(0.9 * (2 / 3) * X),
    logoHeightMm: Math.round(0.7 * Y),
    marginTopMm: Math.round(0.15 * Y),
    marginLeftMm: Math.round((((2 / 3) * X) - (0.9 * (2 / 3) * X)) / 2),
    ratioDescription: "Chiếm 2/3 X chiều rộng bảng (Logo W = 90% của 2/3 X)",
  };

  let rainbow = {
    widthMm: Math.round((1 / 9) * ((1 / 3) * X)),
    heightMm: Y,
    positionLeftMm: Math.round((2 / 3) * X),
    positionTopMm: 0,
    isVertical: true,
    ratioDescription: "Dải 9 màu đứng: Bề rộng = 1/9 của (1/3 X)",
  };

  let dealerSec = {
    widthMm: Math.round((1 / 3) * X),
    heightMm: Y,
    positionLeftMm: Math.round((2 / 3) * X),
    positionTopMm: 0,
    marginRightMm: Math.round(0.05 * (1 / 3) * X),
    fontScalePercent: 100,
    ratioDescription: "Chiếm 1/3 X chiều rộng bảng (Bao gồm dải màu chuyển tiếp)",
  };

  // Co chữ được quyết định bằng đường nét font trong bộ dựng hình, không theo số ký tự.

  // Xử lý các loại Layout khác nhau
  if (layoutType === "LAYOUT_04_NARROW_HORIZONTAL") {
    layoutName = "04___ Quy Cách Bảng Hiệu Ngang Hẹp (Slogan Ngang Hàng)";
    logoSec.logoWidthMm = Math.round(0.8 * (2 / 3) * X);
    logoSec.logoHeightMm = Math.round(0.6 * Y);
    logoSec.marginTopMm = Math.round(0.2 * Y);
    logoSec.ratioDescription = "Chiếm 2/3 X chiều rộng (Logo W = 80% của 2/3 X, Slogan ngang hàng)";

    rainbow.widthMm = Math.round((1 / 10) * ((1 / 3) * X));
    rainbow.ratioDescription = "Dải 9 màu đứng: Bề rộng = 1/10 của (1/3 X)";
  } else if (layoutType === "LAYOUT_05_SPLIT_VERTICAL") {
    layoutName = "05___ Quy Cách Bảng Hiệu Chia Trên - Dưới (3/5 - 2/5)";
    const topY = Math.round((3 / 5) * Y);
    const bottomY = Y - topY;

    logoSec = {
      widthMm: X,
      heightMm: topY,
      logoWidthMm: Math.round(0.9 * X),
      logoHeightMm: Math.round(0.7 * topY),
      marginTopMm: Math.round(0.15 * topY),
      marginLeftMm: Math.round(0.05 * X),
      ratioDescription: "Phần trên chiếm 3/5 Y chiều cao bảng (Logo W = 90% X)",
    };

    const rainbowHeight = Math.round((1 / 9) * bottomY);
    rainbow = {
      widthMm: X,
      heightMm: rainbowHeight,
      positionLeftMm: 0,
      positionTopMm: topY,
      isVertical: false,
      ratioDescription: "Dải 9 màu ngang: Chiều cao = 1/9 của (2/5 Y)",
    };

    dealerSec = {
      widthMm: X,
      heightMm: bottomY,
      positionLeftMm: 0,
      positionTopMm: topY,
      marginRightMm: Math.round(0.05 * X),
      fontScalePercent: 100,
      ratioDescription: "Phần dưới chiếm 2/5 Y chiều cao bảng",
    };
  } else if (["LAYOUT_06_LOGO_ONLY", "LAYOUT_07_CENTERED_BRAND", "LAYOUT_08_NARROW_BRAND"].includes(layoutType)) {
    const fraction = layoutType === "LAYOUT_06_LOGO_ONLY" ? 0.9 * 2 / 3
      : layoutType === "LAYOUT_07_CENTERED_BRAND" ? 0.8 : 0.8 * 2 / 3;
    layoutName = layoutType === "LAYOUT_06_LOGO_ONLY" ? "06 · Chỉ thương hiệu (1/5 Y – 3/5 Y – 1/5 Y)"
      : layoutType === "LAYOUT_07_CENTERED_BRAND" ? "07 · Thương hiệu căn giữa (W = 80% X)"
        : "08 · Thương hiệu ngang dài, khẩu hiệu sau PAINT";
    logoSec = {
      widthMm: X,
      heightMm: Y,
      logoWidthMm: Math.round(fraction * X),
      logoHeightMm: Math.round(0.6 * Y),
      marginTopMm: Math.round(0.2 * Y),
      marginLeftMm: Math.round((1 - fraction) * X / 2),
      ratioDescription: layoutType === "LAYOUT_06_LOGO_ONLY" ? "W = 90% × (2/3 X); trục dọc 1/5 – 3/5 – 1/5 Y"
        : layoutType === "LAYOUT_07_CENTERED_BRAND" ? "W = 80% X; trục ngang 1/5 – 3/5 – 1/5 X"
          : "W = 80% × (2/3 X); trục ngang 1/5 – 3/5 – 1/5 X",
    };
    rainbow.widthMm = 0;
    rainbow.heightMm = 0;
    rainbow.positionLeftMm = 0;
    rainbow.positionTopMm = 0;
    rainbow.isVertical = false;
    dealerSec.widthMm = 0;
    dealerSec.heightMm = 0;
    dealerSec.positionLeftMm = 0;
    dealerSec.positionTopMm = 0;
  } else if (layoutType === "LAYOUT_09_PILLAR") {
    layoutName = "09___ Quy Cách Bảng Hiệu Trụ Dọc (Vertical Pillar)";
    const hasDealer = Boolean([input.dealerName, input.dealerType, input.dealerAddress, input.dealerPhone, input.dealerFax].some(v => v?.trim()));
    const brandY = hasDealer ? Math.round(3 / 4 * Y) : Y;
    logoSec = {
      widthMm: X,
      heightMm: brandY,
      logoWidthMm: Math.round(0.9 * X),
      logoHeightMm: Math.min(Math.round(0.9 * X), Math.round(brandY * 0.95)),
      marginTopMm: Math.round(0.025 * brandY),
      marginLeftMm: Math.round(0.05 * X),
      ratioDescription: "W = 90% X; vùng thương hiệu 3/4 Y khi có đại lý",
    };
    rainbow = {
      widthMm: hasDealer ? X : 0,
      heightMm: hasDealer ? Math.round((Y - brandY) / 15) : 0,
      positionLeftMm: 0,
      positionTopMm: brandY,
      isVertical: false,
      ratioDescription: "Dải màu ở đầu vùng đại lý; dày 1/15 × (1/4 Y) theo mẫu 09",
    };
    dealerSec = {
      widthMm: hasDealer ? X : 0,
      heightMm: hasDealer ? Y - brandY : 0,
      positionLeftMm: 0,
      positionTopMm: brandY,
      marginRightMm: 0,
      fontScalePercent: 90,
      ratioDescription: "Vùng đại lý 1/4 Y, bao gồm dải màu",
    };
  } else if (layoutType === "LAYOUT_10_MOBILE") {
    layoutName = "10___ Quy Cách Biển Hiệu Di Động Khung Sắt Bánh Xe";
    const topY = Math.round((3 / 5) * Y);
    const bottomY = Y - topY;
    logoSec = {
      widthMm: X,
      heightMm: topY,
      logoWidthMm: Math.round(0.85 * X),
      logoHeightMm: Math.round(0.65 * topY),
      marginTopMm: Math.round(0.15 * topY),
      marginLeftMm: Math.round(0.075 * X),
      ratioDescription: "Khung di động 2 mặt, phần trên Logo chiếm 3/5 Y",
    };
    rainbow = {
      widthMm: X,
      heightMm: Math.round((1 / 9) * bottomY),
      positionLeftMm: 0,
      positionTopMm: topY,
      isVertical: false,
      ratioDescription: "Dải màu ngang chia cắt 2 phần",
    };
    dealerSec = {
      widthMm: X,
      heightMm: bottomY,
      positionLeftMm: 0,
      positionTopMm: topY,
      marginRightMm: 0,
      fontScalePercent: 100,
      ratioDescription: "Phần dưới chứa thông tin đại lý, chân gắn 4 bánh xe khóa chốt",
    };
  }

  // Tính dự toán vật tư thô
  const aluSheetArea = 1.22 * 2.44; // ~2.97 m²
  const sheetCount = Math.ceil(areaM2 / aluSheetArea);
  const perimeterM = 2 * (input.widthMeters + input.heightMeters);
  const internalBracingM = (input.widthMeters / 0.6) * input.heightMeters; // nan xương sắt đan 60x60cm
  const ironBarsCount = Math.ceil((perimeterM + internalBracingM) / 6.0); // Cây sắt 6m
  const aluminumTrimMeters = Number(perimeterM.toFixed(1));
  const ledModulesCount = Math.ceil(areaM2 * 45); // 40-50 module LED / m²

  return {
    layoutType,
    layoutName,
    totalWidthMm: X,
    totalHeightMm: Y,
    totalDepthMm: Z,
    areaM2,
    logoSection: logoSec,
    rainbowBar: rainbow,
    dealerSection: dealerSec,
    materialsEstimate: {
      sheetCount,
      ironBarsCount,
      aluminumTrimMeters,
      ledModulesCount,
    },
  };
}

/**
 * Danh sách Khảo Sát Mẫu Thực Tế trích xuất từ bảng khối lượng hiện trường
 * (Dữ liệu từ ảnh thực tế của người dùng)
 */
export const NIPPON_REAL_SURVEY_PRESETS: Array<{
  id: string;
  code: string;
  dealerName: string;
  dealerType?: string;
  dealerAddress: string;
  dealerPhone: string;
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  materialType: string;
  structureNote: string;
  region: string;
  layoutType: NipponLayoutType;
}> = [
  {
    id: "preset-duc-vuong-pylon-doc",
    code: "MAU-09-DUCVUONG",
    dealerName: "ĐỨC\nVƯỢNG",
    dealerType: "Đại lý",
    dealerAddress: "",
    dealerPhone: "",
    widthMeters: 1,
    heightMeters: 3,
    depthMeters: 0.15,
    materialType: "Bảng mặt tiền Alu Alcorest 3mm + chữ Mica hút nổi",
    structureNote: "Mẫu bố cục 09; bổ sung thông tin khảo sát trước khi thi công",
    region: "Mẫu quy chuẩn",
    layoutType: "LAYOUT_09_PILLAR",
  },
  {
    id: "preset-thanh-phat-vinh-long-12m",
    code: "KV-MT-THANHPHAT-01",
    dealerName: "THÀNH PHÁT",
    dealerType: "CÔNG TY TNHH TRANG TRÍ NỘI THẤT",
    dealerAddress: "Số 503, Tỉnh lộ 887, Ấp Long Điền, Xã Phước Long, Tỉnh Vĩnh Long",
    dealerPhone: "091 799 0037 - 0952 114455",
    widthMeters: 12.0,
    heightMeters: 2.4,
    depthMeters: 0.2,
    materialType: "Bảng mặt tiền Alu Alcorest + chữ Mica hút nổi xưởng in",
    structureNote: "Khung sắt hộp mạ kẽm đan nan xương 60x60cm, nẹp viền nhôm V bo góc",
    region: "Miền Tây (Vĩnh Long)",
    layoutType: "LAYOUT_03_STANDARD_HORIZONTAL",
  },
  {
    id: "preset-nam-long-phat-alu",
    code: "KV-HCM-NLP-01",
    dealerName: "NAM LONG PHÁT",
    dealerType: "Đại lý",
    dealerAddress: "16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM",
    dealerPhone: "0962 464 230 - 0379 417 968",
    widthMeters: 6.0,
    heightMeters: 2.38,
    depthMeters: 0.15,
    materialType: "Bảng mặt tiền Alu Alcorest 3mm + chữ Mica hút nổi",
    structureNote: "Khung sắt hộp mạ kẽm 25x25x1.2mm hàn đan xương 60x60cm",
    region: "Hồ Chí Minh",
    layoutType: "LAYOUT_03_STANDARD_HORIZONTAL",
  },
  {
    id: "preset-nam-long-phat-uv",
    code: "KV-HCM-NLP-02",
    dealerName: "NAM LONG PHÁT",
    dealerAddress: "16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM",
    dealerPhone: "0962 464 230",
    widthMeters: 5.9,
    heightMeters: 0.9,
    depthMeters: 0.12,
    materialType: "Bảng bạt Hiflex không gân in UV cao cấp chống phai",
    structureNote: "Khung sắt hộp mạ kẽm viền nhôm định hình V25",
    region: "Hồ Chí Minh",
    layoutType: "LAYOUT_04_NARROW_HORIZONTAL",
  },
  {
    id: "preset-dai-dung-alu",
    code: "KV-DONGNAI-DD-01",
    dealerName: "ĐẠI DŨNG",
    dealerAddress: "Số 51/2, Quốc lộ 1A, Khu Phố 6, Phường Hố Nai, TP. Biên Hòa, Đồng Nai",
    dealerPhone: "0971 750 975",
    widthMeters: 4.85,
    heightMeters: 1.5,
    depthMeters: 0.15,
    materialType: "Bảng mặt tiền Alu + chữ Mica Đài Loan xuyên đèn LED",
    structureNote: "Gia cố dầm bê tông mặt tiền, giàn giáo thi công 2 tầng",
    region: "Miền Đông (Đồng Nai)",
    layoutType: "LAYOUT_03_STANDARD_HORIZONTAL",
  },
  {
    id: "preset-dai-dung-uv",
    code: "KV-DONGNAI-DD-02",
    dealerName: "ĐẠI DŨNG",
    dealerAddress: "Số 51/2, Quốc lộ 1A, Khu Phố 6, Phường Hố Nai, TP. Biên Hòa, Đồng Nai",
    dealerPhone: "0971 750 975",
    widthMeters: 4.85,
    heightMeters: 0.6,
    depthMeters: 0.1,
    materialType: "Bảng bạt UV hẹp ngang",
    structureNote: "Bắn trực tiếp đà sắt mái hiên",
    region: "Miền Đông (Đồng Nai)",
    layoutType: "LAYOUT_04_NARROW_HORIZONTAL",
  },
  {
    id: "preset-chao-visal-uv",
    code: "KV-MIENTAY-CV-01",
    dealerName: "CHAO VISAL",
    dealerAddress: "Ấp Nôpôk, Xã Nhị Trường, Tỉnh Vĩnh Long",
    dealerPhone: "0974 901 674 - 0943 122 731",
    widthMeters: 5.0,
    heightMeters: 1.98,
    depthMeters: 0.15,
    materialType: "Bảng bạt UV Hiflex 3.2m căng khung sắt",
    structureNote: "Khung hộp 30x30x1.4mm mạ kẽm",
    region: "Miền Tây (Vĩnh Long)",
    layoutType: "LAYOUT_03_STANDARD_HORIZONTAL",
  },
  {
    id: "preset-dai-hong-an-fomex",
    code: "KV-HCM-DHA-01",
    dealerName: "ĐẠI HỒNG ÂN",
    dealerAddress: "125-127 Gò Dầu, Phường Tân Quý, Quận Tân Phú, TP.HCM",
    dealerPhone: "0285 4449 491",
    widthMeters: 2.9,
    heightMeters: 0.62,
    depthMeters: 0.05,
    materialType: "Bảng Fomex 10li cán Decal ngoài trời bọc viền nhôm",
    structureNote: "Lắp đặt ốp vách kính showroom",
    region: "Hồ Chí Minh",
    layoutType: "LAYOUT_04_NARROW_HORIZONTAL",
  },
  {
    id: "preset-dat-tien-uv",
    code: "KV-HCM-DT-01",
    dealerName: "ĐẠT TIẾN",
    dealerAddress: "44 Cao Lỗ, Phường 4, Quận 8, TP.HCM",
    dealerPhone: "0912 154 377 - 0989 722 734",
    widthMeters: 3.7,
    heightMeters: 4.0,
    depthMeters: 0.2,
    materialType: "Bảng bạt UV tấm lớn hông nhà",
    structureNote: "Khung giàn giáo chịu gió bão, tăng đơ cáp giằng",
    region: "Hồ Chí Minh",
    layoutType: "LAYOUT_05_SPLIT_VERTICAL",
  },
  {
    id: "preset-nha-may-nippon",
    code: "KV-DONGNAI-NM-01",
    dealerName: "NHÀ MÁY SƠN NIPPON BIÊN HÒA",
    dealerAddress: "Số 14, Đường 3A, KCN Biên Hòa II, TP. Biên Hòa, Đồng Nai",
    dealerPhone: "1800 6111",
    widthMeters: 15.6,
    heightMeters: 2.4,
    depthMeters: 0.25,
    materialType: "Bảng bạt UV siêu dài vách nhà xưởng công nghiệp",
    structureNote: "Khung dầm I và sắt hộp 40x40x1.8mm chịu lực",
    region: "Miền Đông (Đồng Nai)",
    layoutType: "LAYOUT_04_NARROW_HORIZONTAL",
  },
  {
    id: "preset-the-vinh",
    code: "KV-MIENTAY-TV-01",
    dealerName: "THẾ VINH",
    dealerAddress: "Số F1-63, Đường số 6, KDC 586, P. Phú Thứ, Q. Cái Răng, TP. Cần Thơ",
    dealerPhone: "0947 777 746",
    widthMeters: 4.7,
    heightMeters: 1.0,
    depthMeters: 0.15,
    materialType: "Bảng hiệu mái che cửa hàng sơn kết hợp kệ màu showroom",
    structureNote: "Gia cố mái che vươn ra 1.2m",
    region: "Miền Tây (Cần Thơ)",
    layoutType: "LAYOUT_04_NARROW_HORIZONTAL",
  },
];
