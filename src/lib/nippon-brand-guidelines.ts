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

// 9 mã màu dải gradient cầu vồng Nippon Paint theo chuẩn CMYK
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
  redBackground: "#B30024", // CMYK: 0, 100, 80, 30 (#B30024 hoặc #C8102E)
  blueLogo: "#002E8A",       // CMYK: 100, 80, 0, 15 (#002E8A hoặc #003399)
  whiteText: "#FFFFFF",
  yellowStar: "#FFD100",
  blackSteel: "#1A1A1A",
  shopDrawingGray: "#BDBDBD", // Nền xám bạc kỹ thuật xưởng in (Shop Drawing Blueprint)
  dimRed: "#DC2626",          // Đỏ kỹ thuật đo chiều cao & khoảng cách đứng
  dimBlue: "#1D4ED8",         // Xanh kỹ thuật đo chiều ngang & kích thước tổng
  dimText: "#0F172A",
};

export interface TechnicalDimMatrix {
  layoutType: NipponLayoutType;
  outerWidthCm: number;
  outerHeightCm: number;

  // Cấu trúc phân vùng
  hasSloganUnderLogo: boolean;
  hasVerticalSpectrum: boolean;

  // Các biến số đứng vùng nhận diện thương hiệu (Màu Đỏ)
  topToLogo: number;
  logoH: number;
  bottomToLogo: number;
  topToNipponBottom?: number;
  topToPaintBottom?: number;
  logoToSlogan?: number;
  sloganH?: number;
  sloganToBottom?: number;

  // Các biến số đứng vùng đại lý (Màu Đỏ & Xanh)
  topToDealerRow1: number;
  dealerRow1H: number;
  row1ToDealerName: number;
  dealerNameH: number;
  dealerNameToAddress: number;
  addressH: number;
  addressToBottom: number;
  phoneToBottom?: number;
  rightMargin: number;

  // Các biến số ngang (Màu Xanh Kỹ Thuật)
  leftToLogoCm: number;
  logoWCm: number;
  logoToBrandTextGapCm: number;
  leftToBrandTextCm?: number;
  brandTextWCm?: number;
  leftToSloganCm?: number;
  sloganTotalWCm?: number;
  brandZoneWCm: number;
  spectrumBarWCm: number;
  dealerZoneWCm: number;

  // Chi tiết chiều rộng các cụm chữ đại lý
  dealerRow1W: number;
  dealerWord1W: number;
  dealerWordGap: number;
  dealerWord2W: number;
  dealerNameTotalW: number;
  addressW: number;
  phoneW?: number;

  // Chi tiết chiều rộng Slogan từng chữ
  sloganWord1?: number;
  sloganGap?: number;
  sloganWord2?: number;
  sloganWord3?: number;
  sloganWord4?: number;
}

/**
 * Tính toán ma trận biến số hình học CAD co dãn chuẩn xác 100% theo từng loại bố cục và kích thước
 */
export function calculateTechnicalDimMatrix(
  X_mm: number,
  Y_mm: number,
  layoutTypeParam?: NipponLayoutType
): TechnicalDimMatrix {
  const X_cm = Math.round(X_mm / 10);
  const Y_cm = Math.round(Y_mm / 10);
  const ratio = X_mm / Math.max(1, Y_mm);

  // Tự động nhận diện layout type nếu chưa truyền
  const layoutType =
    layoutTypeParam ||
    (ratio >= 5.5 || (ratio >= 4.0 && Y_mm <= 1200)
      ? "LAYOUT_04_NARROW_HORIZONTAL"
      : ratio >= 1.9
      ? "LAYOUT_03_STANDARD_HORIZONTAL"
      : ratio < 0.6
      ? "LAYOUT_09_PILLAR"
      : "LAYOUT_05_SPLIT_VERTICAL");

  // ========================================================
  // TRƯỜNG HỢP 3: MẪU 05 - BẢNG GẦN VUÔNG / DẠNG ĐỨNG (Tỷ lệ X/Y < 1.9)
  // Quy chuẩn Trang 05 (acc/3.png): Chia TRÊN (3/5 Y) - DƯỚI (2/5 Y), Dải màu quang phổ NẰM NGANG ở giữa!
  // ========================================================
  if (layoutType === "LAYOUT_05_SPLIT_VERTICAL") {
    const topZoneHCm = Math.round(Y_cm * 0.60); // 3/5 Y phía trên cho Logo
    const bottomZoneHCm = Y_cm - topZoneHCm;    // 2/5 Y phía dưới cho Đại lý
    const spectrumBarHCm = Math.max(8, Math.round(bottomZoneHCm / 9)); // Dải màu ngang = 1/9 của 2/5 Y

    // Vùng an toàn tầng trên
    const availTopWCm = Math.round(X_cm * 0.90);
    const availTopHCm = topZoneHCm - spectrumBarHCm - 6;

    // Logo L x L + Text 1.95 L = 3.17 L ngang; Logo L + Slogan 0.3 L + gaps = 1.52 L dọc
    const maxLByWCm = Math.floor((availTopWCm * 0.92) / 3.17);
    const maxLByHCm = Math.floor((availTopHCm * 0.88) / 1.52);
    const logoIconH = Math.max(18, Math.min(maxLByWCm, maxLByHCm));

    const brandTotalWCm = Math.round(logoIconH * 3.17);
    const leftMarginCm = Math.max(6, Math.round((X_cm - brandTotalWCm) / 2));
    const topToLogo = Math.max(4, Math.round((topZoneHCm - spectrumBarHCm - logoIconH * 1.52) / 2));
    const logoToSlogan = Math.round(logoIconH * 0.22);
    const sloganH = Math.max(6, Math.round(logoIconH * 0.26));
    const sloganToBottom = Math.max(4, topZoneHCm - (topToLogo + logoIconH + logoToSlogan + sloganH));

    // Phần Đại lý tầng dưới
    const availBottomHCm = bottomZoneHCm - Math.round(spectrumBarHCm / 2) - 6;
    const dealerRow1H = Math.max(6, Math.round(logoIconH * 0.22));
    const dealerNameH = Math.max(10, Math.round(logoIconH * 0.44));
    const addressH = Math.max(5, Math.round(logoIconH * 0.18));
    const topToDealerRow1 = Math.max(4, Math.round(availBottomHCm * 0.10));
    const row1ToDealerName = Math.max(3, Math.round(availBottomHCm * 0.08));
    const dealerNameToAddress = Math.max(3, Math.round(availBottomHCm * 0.08));
    const addressToBottom = Math.max(4, bottomZoneHCm - (topToDealerRow1 + dealerRow1H + row1ToDealerName + dealerNameH + dealerNameToAddress + addressH * 2));

    return {
      layoutType,
      outerWidthCm: X_cm,
      outerHeightCm: Y_cm,
      hasSloganUnderLogo: true,
      hasVerticalSpectrum: false, // Dải màu NẰM NGANG

      // Tọa độ đứng tầng trên (Logo)
      topToLogo,
      logoH: logoIconH,
      bottomToLogo: Math.max(4, topZoneHCm - topToLogo - logoIconH),
      logoToSlogan,
      sloganH,
      sloganToBottom,

      // Tọa độ đứng tầng dưới (Đại lý)
      topToDealerRow1,
      dealerRow1H,
      row1ToDealerName,
      dealerNameH,
      dealerNameToAddress,
      addressH,
      addressToBottom,
      rightMargin: Math.max(8, Math.round(X_cm * 0.05)),

      // Tọa độ ngang
      leftToLogoCm: leftMarginCm,
      logoWCm: logoIconH,
      logoToBrandTextGapCm: Math.round(logoIconH * 0.22),
      leftToBrandTextCm: leftMarginCm + logoIconH + Math.round(logoIconH * 0.22),
      brandTextWCm: Math.round(logoIconH * 1.95),
      leftToSloganCm: leftMarginCm,
      sloganTotalWCm: Math.min(availTopWCm, Math.round(brandTotalWCm * 0.95)),
      brandZoneWCm: X_cm,
      spectrumBarWCm: spectrumBarHCm,
      dealerZoneWCm: X_cm,

      // Kích thước ngang chữ đại lý
      dealerRow1W: Math.round(X_cm * 0.70),
      dealerWord1W: Math.round(X_cm * 0.35),
      dealerWordGap: Math.max(4, Math.round(X_cm * 0.04)),
      dealerWord2W: Math.round(X_cm * 0.30),
      dealerNameTotalW: Math.round(X_cm * 0.75),
      addressW: Math.round(X_cm * 0.85),
      phoneW: Math.round(X_cm * 0.50),

      // Chi tiết slogan
      sloganWord1: Math.round(brandTotalWCm * 0.18),
      sloganGap: Math.round(brandTotalWCm * 0.03),
      sloganWord2: Math.round(brandTotalWCm * 0.18),
      sloganWord3: Math.round(brandTotalWCm * 0.22),
      sloganWord4: Math.round(brandTotalWCm * 0.18),
    };
  }

  // ========================================================
  // TRƯỜNG HỢP 1: MẪU 04 - BẢNG NGANG HẸP (Tỷ lệ X/Y >= 4.0, ví dụ 590cm x 90cm)
  // Trong acc/2.png: Slogan nằm ngang hàng sau NIPPON PAINT
  // ========================================================
  if (layoutType === "LAYOUT_04_NARROW_HORIZONTAL") {
    const brandZoneWCm = Math.round((2 / 3) * X_cm);
    const spectrumBarWCm = Math.max(10, Math.round((1 / 10) * (X_cm / 3)));
    const dealerZoneWCm = X_cm - brandZoneWCm - spectrumBarWCm;

    const leftMarginCm = Math.max(6, Math.round(X_cm * 0.03));
    const availBrandWCm = brandZoneWCm - 2 * leftMarginCm;
    const availBrandHCm = Math.max(20, Y_cm - 12);

    // Row 1 chứa Logo + Text + Slogan ngang: ~6.20 L
    const maxLByWCm = Math.floor((availBrandWCm * 0.90) / 6.20);
    const maxLByHCm = Math.floor(availBrandHCm * 0.72);
    const logoIconH = Math.max(16, Math.min(maxLByWCm, maxLByHCm));

    const topMargin = Math.max(4, Math.round((Y_cm - logoIconH) / 2));
    const bottomMargin = Math.max(4, Y_cm - topMargin - logoIconH);

    const dealerMarginRight = Math.max(6, Math.round(dealerZoneWCm * 0.05));
    const dealerAvailWCm = dealerZoneWCm - 2 * dealerMarginRight;
    const dealerAvailHCm = Math.max(20, Y_cm - 12);

    const dealerRow1H = Math.max(5, Math.round(logoIconH * 0.20));
    const dealerNameH = Math.max(10, Math.min(Math.round(logoIconH * 0.50), Math.floor((dealerAvailWCm * 0.90) / 7.5)));
    const addressH = Math.max(4, Math.round(logoIconH * 0.18));

    const topToDealerRow1 = Math.max(3, Math.round(dealerAvailHCm * 0.08));
    const row1ToDealerName = Math.max(2, Math.round(dealerAvailHCm * 0.08));
    const dealerNameToAddress = Math.max(2, Math.round(dealerAvailHCm * 0.08));
    const addressToBottom = Math.max(3, Y_cm - (topToDealerRow1 + dealerRow1H + row1ToDealerName + dealerNameH + dealerNameToAddress + addressH * 2));

    return {
      layoutType,
      outerWidthCm: X_cm,
      outerHeightCm: Y_cm,
      hasSloganUnderLogo: false,
      hasVerticalSpectrum: true,

      // Vùng Logo bên trái
      topToLogo: topMargin,
      logoH: logoIconH,
      bottomToLogo: bottomMargin,
      leftToLogoCm: leftMarginCm,
      logoWCm: logoIconH,
      logoToBrandTextGapCm: Math.round(logoIconH * 0.22),
      leftToBrandTextCm: leftMarginCm + logoIconH + Math.round(logoIconH * 0.22),
      brandTextWCm: Math.round(logoIconH * 1.95),

      // Phân vùng tổng
      brandZoneWCm,
      spectrumBarWCm,
      dealerZoneWCm,

      // Vùng Đại lý bên phải
      topToDealerRow1,
      dealerRow1H,
      row1ToDealerName,
      dealerNameH,
      dealerNameToAddress,
      addressH,
      addressToBottom,
      rightMargin: dealerMarginRight,

      // Kích thước ngang chữ đại lý
      dealerRow1W: Math.round(dealerZoneWCm * 0.85),
      dealerWord1W: Math.round(dealerZoneWCm * 0.38),
      dealerWordGap: Math.max(4, Math.round(dealerZoneWCm * 0.04)),
      dealerWord2W: Math.round(dealerZoneWCm * 0.30),
      dealerNameTotalW: Math.round(dealerZoneWCm * 0.88),
      addressW: Math.round(dealerZoneWCm * 0.92),
    };
  }

  // ========================================================
  // TRƯỜNG HỢP 2: MẪU 03 - BẢNG NGANG CHUẨN (1.9 <= X/Y < 4.0, ví dụ 1200cm x 240cm, 600cm x 238cm)
  // Quy chuẩn acc/1.png & Bản vẽ thực tế xưởng in media_1791420960629_689fe91e.png
  // Vùng Đại lý chiếm ~42% X để chứa trọn vẹn Tên đơn vị (450cm), Tên đại lý (371cm), Địa chỉ (455cm) không tràn viền
  // ========================================================
  const scaleX = X_cm / 1200;
  const scaleY = Y_cm / 240;

  const brandZoneWCm = Math.round(640 * scaleX);
  const spectrumBarWCm = Math.max(12, Math.round(56 * scaleX));
  const dealerZoneWCm = X_cm - brandZoneWCm - spectrumBarWCm;

  const leftMarginCm = Math.round(96 * scaleX);
  const topMarginCm = Math.round(48 * scaleY);
  const safeLogoH03 = Math.round(120 * Math.min(scaleX, scaleY));

  const topToLogo = topMarginCm;
  const bottomMargin03 = Math.max(10, Y_cm - topToLogo - safeLogoH03);

  const logoToBrandTextGapCm = Math.round(24 * scaleX);
  const brandTextWCm = Math.round(230 * scaleX);
  const leftToLogoCm = leftMarginCm;
  const leftToBrandTextCm = leftToLogoCm + safeLogoH03 + logoToBrandTextGapCm;

  const topToNipponBottom = Math.round(90 * scaleY);
  const topToPaintBottom = Math.round(152 * scaleY);

  const leftToSloganCm = Math.round(114 * scaleX);
  const sloganWord1 = Math.round(81 * scaleX);
  const sloganGap = Math.round(18 * scaleX);
  const sloganWord2 = Math.round(83 * scaleX);
  const sloganWord3 = Math.round(101 * scaleX);
  const sloganWord4 = Math.round(84 * scaleX);
  const sloganTotalWCm = sloganWord1 + sloganGap + sloganWord2 + sloganGap + sloganWord3 + sloganGap + sloganWord4;
  const sloganToBottom = Math.round(33 * scaleY);
  const logoToSlogan = Math.max(10, Y_cm - topToLogo - safeLogoH03 - sloganToBottom - Math.round(34 * scaleY));
  const sloganH = Math.round(34 * scaleY);

  // Vùng Đại lý (Phải)
  const topToDealerRow1 = Math.round(52 * scaleY);
  const dealerRow1H = Math.round(16 * scaleY);
  const dealerRow1W = Math.round(450 * scaleX);

  const dealerWord1W = Math.round(201 * scaleX);
  const dealerWordGap = Math.round(22 * scaleX);
  const dealerWord2W = Math.round(148 * scaleX);
  const dealerNameTotalW = dealerWord1W + dealerWordGap + dealerWord2W; // 371cm tại 1200cm
  const dealerNameH = Math.round(42 * scaleY);
  const row1ToDealerName = Math.round(14 * scaleY);

  const dealerNameToAddress = Math.round(89 * scaleY);
  const addressW = Math.round(455 * scaleX);
  const addressH = Math.round(12 * scaleY);
  const addressToBottom = Math.round(39 * scaleY);

  const phoneW = Math.round(237 * scaleX);
  const phoneToBottom = Math.round(21 * scaleY);
  const rightMarginCm = Math.round(52 * scaleX);

  return {
    layoutType: "LAYOUT_03_STANDARD_HORIZONTAL",
    outerWidthCm: X_cm,
    outerHeightCm: Y_cm,
    hasSloganUnderLogo: true,
    hasVerticalSpectrum: true,

    // Kích thước đứng Logo & Slogan (Màu Đỏ)
    topToLogo,
    logoH: safeLogoH03,
    bottomToLogo: Math.round(77 * scaleY),
    topToNipponBottom,
    topToPaintBottom,
    logoToSlogan,
    sloganH,
    sloganToBottom,

    // Kích thước ngang Logo & Slogan (Màu Xanh)
    leftToLogoCm,
    logoWCm: safeLogoH03,
    logoToBrandTextGapCm,
    leftToBrandTextCm,
    brandTextWCm,
    leftToSloganCm,
    sloganTotalWCm,

    brandZoneWCm,
    spectrumBarWCm,
    dealerZoneWCm,

    // Kích thước đứng Đại lý (Màu Đỏ)
    topToDealerRow1,
    dealerRow1H,
    row1ToDealerName,
    dealerNameH,
    dealerNameToAddress,
    addressH,
    addressToBottom,
    phoneToBottom,
    rightMargin: rightMarginCm,

    // Kích thước ngang Đại lý (Màu Xanh)
    dealerRow1W,
    dealerWord1W,
    dealerWordGap,
    dealerWord2W,
    dealerNameTotalW,
    addressW,
    phoneW,

    // Chi tiết từng chữ trong Slogan
    sloganWord1,
    sloganGap,
    sloganWord2,
    sloganWord3,
    sloganWord4,
  };
}


/**
 * Tự động xác định kiểu bố cục chuẩn dựa trên tỷ lệ kích thước khảo sát (X / Y)
 */
export function detectRecommendedLayout(
  widthMeters: number,
  heightMeters: number,
  hasDealerInfo: boolean = true
): NipponLayoutType {
  if (!hasDealerInfo) {
    return "LAYOUT_06_LOGO_ONLY";
  }

  const ratio = widthMeters / Math.max(0.1, heightMeters);

  if (ratio >= 5.5 || (ratio >= 4.0 && heightMeters <= 1.2)) {
    // Biển rất dài và hẹp ngang (ví dụ 0.6m x 4.85m hoặc 0.9m x 5.9m) -> Mẫu 04
    return "LAYOUT_04_NARROW_HORIZONTAL";
  } else if (ratio >= 1.9) {
    // Biển ngang tiêu chuẩn phổ biến (ví dụ 2.4m x 12m hoặc 2.38m x 6m) -> Mẫu 03
    return "LAYOUT_03_STANDARD_HORIZONTAL";
  } else if (ratio < 0.6) {
    // Biển trụ dọc pylon (ví dụ 1m x 3m hoặc 0.8m x 2.5m) -> Mẫu 09
    return "LAYOUT_09_PILLAR";
  } else {
    // Biển gần vuông hoặc chiều cao lớn (tỷ lệ 0.6 <= ratio < 1.9, ví dụ 3.7m x 4m, 2m x 2m) -> Mẫu 05 Chia Trên Dưới
    return "LAYOUT_05_SPLIT_VERTICAL";
  }
}

/**
 * Tính toán hình học chi tiết toàn bộ các thành phần của bảng hiệu theo mm
 */
export function calculateNipponBrandSpec(input: SurveyInputDimensions): CalculatedBrandSpec {
  const X = Math.round(Math.max(0.3, input.widthMeters) * 1000);
  const Y = Math.round(Math.max(0.3, input.heightMeters) * 1000);
  const Z = Math.round((input.depthMeters || 0.15) * 1000);
  const areaM2 = Number(((X * Y) / 1_000_000).toFixed(2));

  const layoutType =
    input.layoutType ||
    detectRecommendedLayout(input.widthMeters, input.heightMeters, Boolean(input.dealerName));

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

  // Tính tỷ lệ co chữ đại lý nếu tên dài
  const dealerNameLen = (input.dealerName || "").trim().length;
  if (dealerNameLen > 15) {
    dealerSec.fontScalePercent = 80; // 80% horizontally scaled theo chuẩn trang 03
  } else if (dealerNameLen > 10) {
    dealerSec.fontScalePercent = 90; // 90% horizontally scaled
  }

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
      positionTopMm: topY - Math.round(rainbowHeight / 2),
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
  } else if (layoutType === "LAYOUT_06_LOGO_ONLY") {
    layoutName = "06/07/08___ Quy Cách Bảng Hiệu Chỉ Logo Thương Hiệu";
    logoSec = {
      widthMm: X,
      heightMm: Y,
      logoWidthMm: Math.round(0.8 * X),
      logoHeightMm: Math.round(0.7 * Y),
      marginTopMm: Math.round(0.15 * Y),
      marginLeftMm: Math.round(0.1 * X),
      ratioDescription: "Logo Nippon Paint căn giữa, chiếm 80% chiều rộng X",
    };
    rainbow.widthMm = 0;
    dealerSec.widthMm = 0;
  } else if (layoutType === "LAYOUT_09_PILLAR") {
    layoutName = "09___ Quy Cách Bảng Hiệu Trụ Dọc (Vertical Pillar)";
    const topBadgeHeight = Math.round((3 / 7) * Y * 0.75);
    logoSec = {
      widthMm: X,
      heightMm: topBadgeHeight,
      logoWidthMm: Math.round(0.85 * X),
      logoHeightMm: Math.round(0.8 * topBadgeHeight),
      marginTopMm: Math.round(0.1 * topBadgeHeight),
      marginLeftMm: Math.round(0.075 * X),
      ratioDescription: "Badge Logo vuông góc trên đỉnh, chữ NIPPON PAINT in dọc thân",
    };
    rainbow = {
      widthMm: X,
      heightMm: Math.round(0.05 * Y),
      positionLeftMm: 0,
      positionTopMm: Math.round(0.75 * Y),
      isVertical: false,
      ratioDescription: "Dải 9 màu ngang ngăn cách giữa thân và chân bảng",
    };
    dealerSec = {
      widthMm: X,
      heightMm: Math.round(0.2 * Y),
      positionLeftMm: 0,
      positionTopMm: Math.round(0.8 * Y),
      marginRightMm: 0,
      fontScalePercent: 90,
      ratioDescription: "Chân trụ pylon chứa thông tin đại lý",
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
      positionTopMm: topY + Math.round((1 / 9) * bottomY),
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
