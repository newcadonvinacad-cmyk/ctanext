"use client";

import React, { forwardRef } from "react";
import {
  SurveyInputDimensions,
  CalculatedBrandSpec,
  NIPPON_RAINBOW_COLORS,
  NIPPON_BRAND_COLORS,
  calculateTechnicalDimMatrix,
  TechnicalDimMatrix,
} from "@/lib/nippon-brand-guidelines";

interface NipponSignCanvasProps {
  input: SurveyInputDimensions;
  spec: CalculatedBrandSpec;
  showDimensions?: boolean;
  showTitleBlock?: boolean;
  viewMode?: "blueprint" | "realistic" | "clean";
  renderMode?: "shop_drawing" | "realistic";
  className?: string;
}

// =============================================================================
// REUSABLE CAD DIMENSION COMPONENTS (CRYSTAL CLEAR, COMPACT BADGES)
// =============================================================================

interface CadHorizontalDimProps {
  x1: number;
  x2: number;
  y: number;
  extY1?: number;
  extY2?: number;
  valueText: string | number;
  color?: string;
  strokeWidth?: number;
  fontSize?: number;
  arrowStart?: string;
  arrowEnd?: string;
  badgeBorder?: string;
}

const CadHorizontalDim: React.FC<CadHorizontalDimProps> = ({
  x1,
  x2,
  y,
  extY1,
  extY2,
  valueText,
  color = "#1D4ED8",
  strokeWidth = 3,
  fontSize = 28,
  arrowStart = "url(#arrow-blue-start)",
  arrowEnd = "url(#arrow-blue-end)",
  badgeBorder = "#93C5FD",
}) => {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const width = maxX - minX;
  if (width <= 0) return null;

  const midX = (minX + maxX) / 2;
  const strVal = String(valueText);
  const badgeW = Math.max(fontSize * 1.5, strVal.length * (fontSize * 0.65) + fontSize * 0.45);
  const badgeH = Math.max(fontSize * 1.3, fontSize + 8);

  return (
    <g className="cad-dim-h">
      {/* Đường gióng phụ (Extension lines) */}
      {extY1 !== undefined && (
        <line
          x1={minX}
          y1={extY1}
          x2={minX}
          y2={y > extY1 ? y + Math.round(fontSize * 0.25) : y - Math.round(fontSize * 0.25)}
          stroke={color}
          strokeWidth={Math.max(1.5, strokeWidth * 0.75)}
          opacity={0.85}
        />
      )}
      {extY2 !== undefined && (
        <line
          x1={maxX}
          y1={extY2}
          x2={maxX}
          y2={y > extY2 ? y + Math.round(fontSize * 0.25) : y - Math.round(fontSize * 0.25)}
          stroke={color}
          strokeWidth={Math.max(1.5, strokeWidth * 0.75)}
          opacity={0.85}
        />
      )}

      {/* Đường kích thước chính (Dimension line) */}
      <line
        x1={minX}
        y1={y}
        x2={maxX}
        y2={y}
        stroke={color}
        strokeWidth={strokeWidth}
        markerStart={arrowStart}
        markerEnd={arrowEnd}
      />

      {/* Hộp nền trắng tương phản cao để số kích thước không bao giờ bị mờ */}
      <rect
        x={midX - badgeW / 2}
        y={y - badgeH / 2}
        width={badgeW}
        height={badgeH}
        fill="#FFFFFF"
        rx={Math.max(3, Math.round(fontSize * 0.1))}
        stroke={badgeBorder}
        strokeWidth={Math.max(1.5, strokeWidth * 0.4)}
      />

      {/* Số kích thước rõ nét, đậm nét CAD */}
      <text
        x={midX}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="Consolas, 'Roboto Mono', 'SF Mono', monospace"
      >
        {strVal}
      </text>
    </g>
  );
};

interface CadVerticalDimProps {
  y1: number;
  y2: number;
  x: number;
  extX1?: number;
  extX2?: number;
  valueText: string | number;
  color?: string;
  strokeWidth?: number;
  fontSize?: number;
  arrowStart?: string;
  arrowEnd?: string;
  badgeBorder?: string;
  isRotated?: boolean;
}

const CadVerticalDim: React.FC<CadVerticalDimProps> = ({
  y1,
  y2,
  x,
  extX1,
  extX2,
  valueText,
  color = "#DC2626",
  strokeWidth = 3,
  fontSize = 28,
  arrowStart = "url(#arrow-red-start)",
  arrowEnd = "url(#arrow-red-end)",
  badgeBorder = "#FCA5A5",
  isRotated = false,
}) => {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const height = maxY - minY;
  if (height <= 0) return null;

  const midY = (minY + maxY) / 2;
  const strVal = String(valueText);
  const badgeW = Math.max(fontSize * 1.5, strVal.length * (fontSize * 0.65) + fontSize * 0.45);
  const badgeH = Math.max(fontSize * 1.3, fontSize + 8);

  return (
    <g className="cad-dim-v">
      {/* Đường gióng phụ (Extension lines) */}
      {extX1 !== undefined && (
        <line
          x1={extX1}
          y1={minY}
          x2={x > extX1 ? x + Math.round(fontSize * 0.25) : x - Math.round(fontSize * 0.25)}
          y2={minY}
          stroke={color}
          strokeWidth={Math.max(1.5, strokeWidth * 0.75)}
          opacity={0.85}
        />
      )}
      {extX2 !== undefined && (
        <line
          x1={extX2}
          y1={maxY}
          x2={x > extX2 ? x + Math.round(fontSize * 0.25) : x - Math.round(fontSize * 0.25)}
          y2={maxY}
          stroke={color}
          strokeWidth={Math.max(1.5, strokeWidth * 0.75)}
          opacity={0.85}
        />
      )}

      {/* Đường kích thước chính (Dimension line) */}
      <line
        x1={x}
        y1={minY}
        x2={x}
        y2={maxY}
        stroke={color}
        strokeWidth={strokeWidth}
        markerStart={arrowStart}
        markerEnd={arrowEnd}
      />

      {/* Hộp nền trắng tương phản cao */}
      {isRotated ? (
        <g transform={`rotate(-90, ${x}, ${midY})`}>
          <rect
            x={x - badgeW / 2}
            y={midY - badgeH / 2}
            width={badgeW}
            height={badgeH}
            fill="#FFFFFF"
            rx={Math.max(3, Math.round(fontSize * 0.1))}
            stroke={badgeBorder}
            strokeWidth={Math.max(1.5, strokeWidth * 0.4)}
          />
          <text
            x={x}
            y={midY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={fontSize}
            fontWeight="900"
            fontFamily="Consolas, 'Roboto Mono', 'SF Mono', monospace"
          >
            {strVal}
          </text>
        </g>
      ) : (
        <g>
          <rect
            x={x - badgeW / 2}
            y={midY - badgeH / 2}
            width={badgeW}
            height={badgeH}
            fill="#FFFFFF"
            rx={Math.max(3, Math.round(fontSize * 0.1))}
            stroke={badgeBorder}
            strokeWidth={Math.max(1.5, strokeWidth * 0.4)}
          />
          <text
            x={x}
            y={midY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize={fontSize}
            fontWeight="900"
            fontFamily="Consolas, 'Roboto Mono', 'SF Mono', monospace"
          >
            {strVal}
          </text>
        </g>
      )}
    </g>
  );
};

// =============================================================================
// MAIN COMPONENT: NIPPON SIGN CANVAS
// =============================================================================

export const NipponSignCanvas = forwardRef<SVGSVGElement, NipponSignCanvasProps>(
  (
    {
      input,
      spec,
      showDimensions = true,
      showTitleBlock = true,
      viewMode = "blueprint",
      renderMode = "shop_drawing",
      className = "",
    },
    ref
  ) => {
    const X = spec.totalWidthMm;
    const Y = spec.totalHeightMm;
    const ratio = X / Math.max(1, Y);

    // Tính toán ma trận biến số hình học CAD co dãn chuẩn xác
    const dim: TechnicalDimMatrix = calculateTechnicalDimMatrix(X, Y, spec.layoutType);
    const isNarrow = dim.layoutType === "LAYOUT_04_NARROW_HORIZONTAL";
    // Mẫu 05: Chia Trên - Dưới khi gần vuông (ratio < 2.2) hoặc khi layoutType chỉ định
    const isSplitVertical = !dim.hasVerticalSpectrum || dim.layoutType === "LAYOUT_05_SPLIT_VERTICAL" || ratio < 2.2;

    // Chiều cao khung tên Title Block cân đối theo khổ bản vẽ
    const titleBlockH = showTitleBlock ? Math.max(220, Math.round(Y * 0.16)) : 0;

    // Lề bao ngoài SVG cho đường gióng kích thước và khung tên kỹ thuật
    const padTop = showDimensions ? Math.max(220, Math.round(Y * 0.18)) : 50;
    const padBottom = (showDimensions ? Math.max(200, Math.round(Y * 0.16)) : 50) + titleBlockH + (showTitleBlock ? 50 : 0);
    const padLeft = showDimensions ? Math.max(240, Math.round(X * 0.07)) : 50;
    const padRight = showDimensions ? Math.max(200, Math.round(X * 0.06)) : 50;

    const viewBoxX = -padLeft;
    const viewBoxY = -padTop;
    const viewBoxW = X + padLeft + padRight;
    const viewBoxH = Y + padTop + padBottom + 40;

    // Màu nền biển hiệu
    const isRealistic = viewMode === "realistic" || renderMode === "realistic";
    const signBgColor = viewMode === "blueprint"
      ? NIPPON_BRAND_COLORS.shopDrawingGray
      : viewMode === "clean"
      ? "#FFFFFF"
      : (input.backgroundColor && input.backgroundColor !== NIPPON_BRAND_COLORS.shopDrawingGray
          ? input.backgroundColor
          : NIPPON_BRAND_COLORS.redBackground);

    // Màu thước đo CAD:
    // Nền đỏ Nippon: Cyan (#38BDF8) và Vàng (#FACC15)
    // Nền xám Shop drawing: Xanh dương (#1D4ED8) và Đỏ kỹ thuật (#DC2626) như hình tham chiếu media_1791420960629_689fe91e.png
    const dimHColor = isRealistic ? "#38BDF8" : "#1D4ED8";
    const dimVColor = isRealistic ? "#FACC15" : "#DC2626";
    const badgeBorderH = isRealistic ? "#38BDF8" : "#93C5FD";
    const badgeBorderV = isRealistic ? "#FACC15" : "#FCA5A5";

    // Phông chữ con số dim kỹ thuật: Kích thước lớn, đậm nét CAD, hiển thị rõ ràng trên mọi màn hình
    const outerDimTextSize = Math.max(75, Math.round(Y * 0.055));
    const dimTextSize = Math.max(52, Math.round(Y * 0.042));
    const smallDimTextSize = Math.max(40, Math.round(Y * 0.032));
    const cadStroke = Math.max(3.8, Math.round(Y * 0.0032));

    // Dữ liệu văn bản đại lý
    const dealerNameRaw = (input.dealerName || "THÀNH PHÁT").trim().toUpperCase();
    const dealerTypeRaw = (input.dealerType || (isNarrow ? "Đại lý" : "CÔNG TY TNHH TRANG TRÍ NỘI THẤT")).trim();
    const dealerAddressRaw = (input.dealerAddress || "Số 503, Tỉnh lộ 887, Ấp Long Điền, Xã Phước Long, Tỉnh Vĩnh Long").trim();
    const dealerPhoneRaw = (input.dealerPhone || "091 799 0037 - 0952 114455").trim();

    // Slogan Text: Mặc định ngắn "Sơn Đâu Cũng Đẹp" như hình xưởng in user gửi hoặc đầy đủ nếu chọn
    const sloganRaw = (input.sloganText || (isNarrow ? "Sơn Nippon Sơn Đâu Cũng Đẹp" : "Sơn Đâu Cũng Đẹp")).trim();

    // =========================================================================
    // 1. THUẬT TOÁN CO DÃN BỐ CỤC CHUẨN QUY CHUẨN THƯƠNG HIỆU (acc/1.png -> acc/8.png)
    // =========================================================================
    const brandZoneW = dim.brandZoneWCm * 10;
    const spectrumBarW = dim.spectrumBarWCm * 10;
    const spectrumBarX = brandZoneW;
    const dealerZoneX = spectrumBarX + spectrumBarW;
    const dealerZoneW = dim.dealerZoneWCm * 10;

    let logoBadgeSize: number;
    let logoBadgeX: number;
    let logoBadgeY: number;
    let brandTextX: number;
    let brandTextFontSize: number;
    let brandTextLineSpacing: number;
    let sloganX: number;
    let sloganY: number;
    let sloganFontSize: number;
    let actualSloganW: number;

    if (isNarrow) {
      // MẪU 04 (NGANG HẸP - acc/2.png): Slogan nằm NGANG HÀNG sau NIPPON PAINT
      logoBadgeSize = dim.logoWCm * 10;
      logoBadgeX = dim.leftToLogoCm * 10;
      logoBadgeY = dim.topToLogo * 10;

      const brandTextGap = dim.logoToBrandTextGapCm * 10;
      brandTextX = logoBadgeX + logoBadgeSize + brandTextGap;
      brandTextFontSize = Math.round(logoBadgeSize * 0.42);
      brandTextLineSpacing = Math.round(logoBadgeSize * 0.48);

      const sloganGap = Math.round(logoBadgeSize * 0.30);
      sloganX = brandTextX + Math.round(brandTextFontSize * 4.6) + sloganGap;
      sloganFontSize = Math.round(logoBadgeSize * 0.30);
      sloganY = logoBadgeY + Math.round(logoBadgeSize * 0.75);
      actualSloganW = Math.round(sloganFontSize * 9.5);
    } else {
      // MẪU 03 (NGANG CHUẨN - acc/1.png & media_1791420960629_689fe91e.png)
      logoBadgeSize = dim.logoWCm * 10;
      logoBadgeX = dim.leftToLogoCm * 10;
      logoBadgeY = dim.topToLogo * 10;

      brandTextX = (dim.leftToBrandTextCm || 240) * 10;
      brandTextFontSize = Math.round(logoBadgeSize * 0.38);
      brandTextLineSpacing = Math.round(logoBadgeSize * 0.48);

      sloganX = (dim.leftToSloganCm || 114) * 10;
      sloganFontSize = Math.max(16, Math.round(logoBadgeSize * 0.28));
      sloganY = Y - (dim.sloganToBottom || 33) * 10;
      actualSloganW = (dim.sloganTotalWCm || 367) * 10;
    }

    // Tọa độ từng từ Slogan để đo kích thước CAD chi tiết
    const sloganWordPositions = !isNarrow && dim.sloganWord1
      ? [
          { word: "Sơn", x: sloganX, width: dim.sloganWord1 * 10 },
          { word: "Đâu", x: sloganX + (dim.sloganWord1 + (dim.sloganGap || 18)) * 10, width: (dim.sloganWord2 || 83) * 10 },
          { word: "Cũng", x: sloganX + (dim.sloganWord1 + (dim.sloganGap || 18) + (dim.sloganWord2 || 83) + (dim.sloganGap || 18)) * 10, width: (dim.sloganWord3 || 101) * 10 },
          { word: "Đẹp", x: sloganX + (dim.sloganWord1 + (dim.sloganGap || 18) + (dim.sloganWord2 || 83) + (dim.sloganGap || 18) + (dim.sloganWord3 || 101) + (dim.sloganGap || 18)) * 10, width: (dim.sloganWord4 || 84) * 10 },
        ]
      : [];

    // -------------------------------------------------------------------------
    // VÙNG ĐẠI LÝ (BÊN PHẢI): CĂN CHUẨN XƯỞNG IN, KHÔNG BAO GIỜ TRÀN LỀ HOẶC ĐÁY
    // -------------------------------------------------------------------------
    const dealerMarginLeft = Math.round(24 * (X / 1200)); // 240mm tại 12m
    const dealerMarginRight = Math.round(dim.rightMargin * 10); // 520mm tại 12m
    const dealerContentX = dealerZoneX + dealerMarginLeft;
    const dealerAvailW = X - dealerContentX - dealerMarginRight;

    // 1. Dòng 1: Tiền tố / Loại hình đại lý ("CÔNG TY TNHH TRANG TRÍ NỘI THẤT")
    const actualRow1W = dim.dealerRow1W * 10;
    const dealerTitleFontSize = Math.min(180, Math.floor(dealerAvailW / (Math.max(1, dealerTypeRaw.length) * 0.65)));
    const dealerRow1Y = dim.topToDealerRow1 * 10 + Math.round(dealerTitleFontSize * 0.85);

    // 2. Dòng 2: Tên đại lý chính ("THÀNH PHÁT") - Thụt lề 58cm so với dải màu
    const dealerWords = dealerNameRaw.split(/\s+/).filter(Boolean);
    const nameIndent = Math.round(55 * (X / 1200)); // 550mm tại 12m
    const dealerNameX = dealerZoneX + nameIndent;
    const maxDealerNameAvailW = X - dealerNameX - dealerMarginRight;

    let dealerWord1W = (dim.dealerWord1W || 201) * 10;
    let dealerWordGap = (dim.dealerWordGap || 22) * 10;
    let dealerWord2W = (dim.dealerWord2W || 148) * 10;
    let actualDealerNameW = (dim.dealerNameTotalW || 371) * 10;

    let dealerNameFontSize = Math.min(
      420,
      Math.floor((maxDealerNameAvailW * 0.92) / (Math.max(1, dealerNameRaw.length) * 0.72))
    );

    // Bounding box clamping: Tuyệt đối không bao giờ cho chữ vượt qua X - dealerMarginRight
    if (dealerNameX + actualDealerNameW > X - dealerMarginRight) {
      const clampRatio = (X - dealerMarginRight - dealerNameX) / Math.max(1, actualDealerNameW);
      dealerWord1W = Math.round(dealerWord1W * clampRatio);
      dealerWordGap = Math.round(dealerWordGap * clampRatio);
      dealerWord2W = Math.round(dealerWord2W * clampRatio);
      actualDealerNameW = dealerWord1W + dealerWordGap + dealerWord2W;
      dealerNameFontSize = Math.round(dealerNameFontSize * clampRatio);
    }

    const dealerNameY = dealerRow1Y + Math.round(140 * (Y / 2400)) + dealerNameFontSize;

    const wordPositions = dealerWords.length === 2 && dealerWords[0] === "THÀNH" && dealerWords[1] === "PHÁT"
      ? [
          { word: "THÀNH", x: dealerNameX, width: dealerWord1W },
          { word: "PHÁT", x: dealerNameX + dealerWord1W + dealerWordGap, width: dealerWord2W },
        ]
      : (() => {
          let curX = dealerNameX;
          const charFactor = Math.floor(actualDealerNameW / (dealerNameRaw.length || 1));
          return dealerWords.map((w, idx) => {
            const posX = curX;
            const wWidth = Math.round(w.length * charFactor);
            curX += wWidth + dealerWordGap;
            return { word: w, x: posX, width: wWidth };
          });
        })();

    // 3. Dòng 3: Địa chỉ hiện trường
    const actualAddrLine1W = dim.addressW * 10;
    const dealerAddrFontSize = Math.min(115, Math.floor(dealerAvailW / (Math.max(1, dealerAddressRaw.length) * 0.58)));
    const dealerAddrY1 = Y - dim.addressToBottom * 10 - Math.round(140 * (Y / 2400));

    // 4. Dòng 4: Điện thoại
    const fullPhoneText = dealerPhoneRaw
      ? dealerPhoneRaw.startsWith("ĐT")
        ? dealerPhoneRaw
        : "ĐT: " + dealerPhoneRaw
      : "";
    const actualPhoneW = (dim.phoneW || 237) * 10;
    const dealerPhoneFontSize = Math.min(95, Math.floor(dealerAvailW / (Math.max(1, fullPhoneText.length) * 0.60)));
    const dealerPhoneY = Y - (dim.phoneToBottom || 21) * 10;

    // -------------------------------------------------------------------------
    // 2. PHÂN VÙNG DẠNG GẦN VUÔNG / CHIA TRÊN - DƯỚI (MẪU 05 / acc/3.png)
    // -------------------------------------------------------------------------
    const splitTopH = Math.round(Y * 0.60); // 3/5 Y
    const splitBottomH = Y - splitTopH;    // 2/5 Y
    const splitSpectrumH = Math.max(50, Math.round(splitBottomH / 9)); // 1/9 của 2/5 Y
    const splitSpectrumY = splitTopH - Math.round(splitSpectrumH / 2);

    const sqAvailW = Math.round(X * 0.88);
    const sqAvailH = splitTopH - splitSpectrumH - 30;
    const sqLogoSize = Math.max(70, Math.min(Math.floor((sqAvailW * 0.88) / 3.17), Math.floor((sqAvailH * 0.85) / 1.52)));
    const sqBrandTotalW = Math.round(sqLogoSize * 3.17);
    const sqBrandStartX = Math.round((X - sqBrandTotalW) / 2);
    const sqBrandStartY = Math.max(20, Math.round((splitTopH - splitSpectrumH - sqLogoSize * 1.52) / 2));

    const sqTextGap = Math.round(sqLogoSize * 0.24);
    const sqTextX = sqBrandStartX + sqLogoSize + sqTextGap;
    const sqTextFontSize = Math.round(sqLogoSize * 0.42);

    const sqSloganFontSize = Math.max(14, Math.round(sqLogoSize * 0.28));
    const sqSloganY = sqBrandStartY + sqLogoSize + Math.round(sqLogoSize * 0.42);

    // Tầng dưới (2/5 Y): Thông tin đại lý căn giữa hoàn hảo
    const sqDealerAvailH = splitBottomH - Math.round(splitSpectrumH / 2) - 30;
    const sqDealerTitleFontSize = Math.max(11, Math.min(Math.round(sqDealerAvailH * 0.12), Math.round((X * 0.80) / (Math.max(1, dealerTypeRaw.length) * 0.62))));
    const sqDealerNameFontSize = Math.max(16, Math.min(Math.round(sqDealerAvailH * 0.26), Math.round((X * 0.82) / (Math.max(1, dealerNameRaw.length) * 0.70))));
    const sqDealerAddrFontSize = Math.max(10, Math.min(Math.round(sqDealerAvailH * 0.12), Math.round((X * 0.85) / (Math.max(1, dealerAddressRaw.length) * 0.58))));
    const sqDealerPhoneFontSize = Math.max(10, Math.min(sqDealerAddrFontSize, Math.round((X * 0.85) / (Math.max(1, fullPhoneText.length) * 0.60))));

    const sqTotalDealerH = sqDealerTitleFontSize + 10 + sqDealerNameFontSize + 12 + sqDealerAddrFontSize + (dealerPhoneRaw ? 10 + sqDealerPhoneFontSize : 0);
    const sqScaleK = sqTotalDealerH > sqDealerAvailH ? Math.max(0.65, sqDealerAvailH / sqTotalDealerH) : 1.0;

    const finalSqDealerTitleFontSize = Math.round(sqDealerTitleFontSize * sqScaleK);
    const finalSqDealerNameFontSize = Math.round(sqDealerNameFontSize * sqScaleK);
    const finalSqDealerAddrFontSize = Math.round(sqDealerAddrFontSize * sqScaleK);
    const finalSqDealerPhoneFontSize = Math.round(sqDealerPhoneFontSize * sqScaleK);

    const sqDealerStartY = splitTopH + Math.round(splitSpectrumH / 2) + Math.max(15, Math.round((sqDealerAvailH - sqTotalDealerH * sqScaleK) / 2));
    const sqRow1Y = sqDealerStartY + finalSqDealerTitleFontSize;
    const sqNameY = sqRow1Y + Math.round(10 * sqScaleK) + finalSqDealerNameFontSize;
    const sqAddrY = sqNameY + Math.round(12 * sqScaleK) + finalSqDealerAddrFontSize;
    const sqPhoneY = sqAddrY + Math.round(10 * sqScaleK) + finalSqDealerPhoneFontSize;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
        className={`w-full h-auto select-none ${className}`}
        style={{
          fontFamily: "'Montserrat', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <defs>
          {/* Gradient quang phổ 9 màu đứng (Mẫu 03 & 04) */}
          <linearGradient id="nippon-spectrum-vert" x1="0%" y1="0%" x2="0%" y2="100%">
            {NIPPON_RAINBOW_COLORS.map((col, idx) => (
              <stop
                key={idx}
                offset={`${(idx / (NIPPON_RAINBOW_COLORS.length - 1)) * 100}%`}
                stopColor={col}
              />
            ))}
          </linearGradient>

          {/* Gradient quang phổ 9 màu ngang (Mẫu 05 Chia Trên Dưới) */}
          <linearGradient id="nippon-spectrum-horiz" x1="0%" y1="0%" x2="100%" y2="0%">
            {NIPPON_RAINBOW_COLORS.map((col, idx) => (
              <stop
                key={idx}
                offset={`${(idx / (NIPPON_RAINBOW_COLORS.length - 1)) * 100}%`}
                stopColor={col}
              />
            ))}
          </linearGradient>

          {/* Mũi tên xanh kỹ thuật CAD (Cho nền xám) */}
          <marker id="arrow-blue-start" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#1D4ED8" />
          </marker>
          <marker id="arrow-blue-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#1D4ED8" />
          </marker>

          {/* Mũi tên đỏ kỹ thuật CAD (Cho nền xám) */}
          <marker id="arrow-red-start" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#DC2626" />
          </marker>
          <marker id="arrow-red-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#DC2626" />
          </marker>

          {/* Mũi tên Cyan kỹ thuật CAD (Cho nền đỏ Nippon) */}
          <marker id="arrow-cyan-start" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#38BDF8" />
          </marker>
          <marker id="arrow-cyan-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38BDF8" />
          </marker>

          {/* Mũi tên Vàng kỹ thuật CAD (Cho nền đỏ Nippon) */}
          <marker id="arrow-yellow-start" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#FACC15" />
          </marker>
          <marker id="arrow-yellow-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#FACC15" />
          </marker>

          {/* Bóng đổ 3D thực tế */}
          {isRealistic && (
            <filter id="box-shadow-3d" x="-2%" y="-2%" width="104%" height="104%">
              <feDropShadow dx="6" dy="12" stdDeviation="10" floodOpacity="0.30" />
            </filter>
          )}
        </defs>

        {/* ======================================================== */}
        {/* 1. THÂN BIỂN HIỆU (SIGNBOARD BODY) */}
        {/* ======================================================== */}
        <g id="sign-body" filter={isRealistic ? "url(#box-shadow-3d)" : undefined}>
          {/* Nền biển hiệu chính */}
          <rect
            x={0}
            y={0}
            width={X}
            height={Y}
            fill={signBgColor}
            stroke={isRealistic ? "#CBD5E1" : "#475569"}
            strokeWidth={Math.max(3, Math.round(Y * 0.005))}
            rx={Math.max(2, Math.round(Y * 0.003))}
          />

          {/* -------------------------------------------------------- */}
          {/* TRƯỜNG HỢP A: BỐ CỤC CHIA TRÊN - DƯỚI (MẪU 05 GẦN VUÔNG / acc/3.png) */}
          {/* -------------------------------------------------------- */}
          {isSplitVertical ? (
            <g id="layout-05-split-vertical">
              {/* TẦNG TRÊN (3/5 Y): LOGO + SLOGAN */}
              <g id="sq-top-brand-zone">
                {/* Huy hiệu Logo chữ 'n' */}
                <g transform={`translate(${sqBrandStartX}, ${sqBrandStartY})`}>
                  <rect x={0} y={0} width={sqLogoSize} height={sqLogoSize} rx={Math.round(sqLogoSize * 0.18)} fill={NIPPON_BRAND_COLORS.blueLogo} />
                  <rect x={Math.round(sqLogoSize * 0.03)} y={Math.round(sqLogoSize * 0.03)} width={Math.round(sqLogoSize * 0.94)} height={Math.round(sqLogoSize * 0.94)} rx={Math.round(sqLogoSize * 0.16)} fill="none" stroke="#FFFFFF" strokeWidth={Math.max(3, Math.round(sqLogoSize * 0.04))} />
                  {/* Viền trắng chữ n */}
                  <path
                    d={`
                      M ${sqLogoSize * 0.22} ${sqLogoSize * 0.82}
                      L ${sqLogoSize * 0.22} ${sqLogoSize * 0.24}
                      C ${sqLogoSize * 0.22} ${sqLogoSize * 0.16}, ${sqLogoSize * 0.32} ${sqLogoSize * 0.14}, ${sqLogoSize * 0.48} ${sqLogoSize * 0.14}
                      C ${sqLogoSize * 0.72} ${sqLogoSize * 0.14}, ${sqLogoSize * 0.84} ${sqLogoSize * 0.26}, ${sqLogoSize * 0.84} ${sqLogoSize * 0.50}
                      L ${sqLogoSize * 0.84} ${sqLogoSize * 0.82}
                      C ${sqLogoSize * 0.84} ${sqLogoSize * 0.86}, ${sqLogoSize * 0.76} ${sqLogoSize * 0.88}, ${sqLogoSize * 0.68} ${sqLogoSize * 0.88}
                      C ${sqLogoSize * 0.62} ${sqLogoSize * 0.88}, ${sqLogoSize * 0.58} ${sqLogoSize * 0.84}, ${sqLogoSize * 0.58} ${sqLogoSize * 0.78}
                      L ${sqLogoSize * 0.58} ${sqLogoSize * 0.52}
                      C ${sqLogoSize * 0.58} ${sqLogoSize * 0.38}, ${sqLogoSize * 0.52} ${sqLogoSize * 0.34}, ${sqLogoSize * 0.44} ${sqLogoSize * 0.34}
                      C ${sqLogoSize * 0.36} ${sqLogoSize * 0.34}, ${sqLogoSize * 0.32} ${sqLogoSize * 0.38}, ${sqLogoSize * 0.32} ${sqLogoSize * 0.52}
                      L ${sqLogoSize * 0.32} ${sqLogoSize * 0.82}
                      Z
                    `}
                    fill="#FFFFFF"
                  />
                  {/* Lòng đỏ chữ n */}
                  <path
                    d={`
                      M ${sqLogoSize * 0.25} ${sqLogoSize * 0.80}
                      L ${sqLogoSize * 0.25} ${sqLogoSize * 0.28}
                      C ${sqLogoSize * 0.25} ${sqLogoSize * 0.20}, ${sqLogoSize * 0.34} ${sqLogoSize * 0.18}, ${sqLogoSize * 0.48} ${sqLogoSize * 0.18}
                      C ${sqLogoSize * 0.68} ${sqLogoSize * 0.18}, ${sqLogoSize * 0.80} ${sqLogoSize * 0.28}, ${sqLogoSize * 0.80} ${sqLogoSize * 0.50}
                      L ${sqLogoSize * 0.80} ${sqLogoSize * 0.80}
                      C ${sqLogoSize * 0.80} ${sqLogoSize * 0.83}, ${sqLogoSize * 0.74} ${sqLogoSize * 0.85}, ${sqLogoSize * 0.68} ${sqLogoSize * 0.85}
                      C ${sqLogoSize * 0.64} ${sqLogoSize * 0.85}, ${sqLogoSize * 0.61} ${sqLogoSize * 0.82}, ${sqLogoSize * 0.61} ${sqLogoSize * 0.78}
                      L ${sqLogoSize * 0.61} ${sqLogoSize * 0.52}
                      C ${sqLogoSize * 0.61} ${sqLogoSize * 0.36}, ${sqLogoSize * 0.54} ${sqLogoSize * 0.32}, ${sqLogoSize * 0.45} ${sqLogoSize * 0.32}
                      C ${sqLogoSize * 0.37} ${sqLogoSize * 0.32}, ${sqLogoSize * 0.34} ${sqLogoSize * 0.36}, ${sqLogoSize * 0.34} ${sqLogoSize * 0.52}
                      L ${sqLogoSize * 0.34} ${sqLogoSize * 0.80}
                      Z
                    `}
                    fill="#D51A21"
                  />
                </g>

                {/* Chữ NIPPON PAINT */}
                <g
                  transform={`translate(${sqTextX}, 0)`}
                  style={{
                    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
                    fontStyle: "italic",
                    fontWeight: 900,
                    fill: "#FFFFFF",
                  }}
                >
                  <text x={0} y={sqBrandStartY + Math.round(sqLogoSize * 0.44)} fontSize={sqTextFontSize} letterSpacing="1.2">
                    NIPPON
                  </text>
                  <text x={0} y={sqBrandStartY + Math.round(sqLogoSize * 0.44) + Math.round(sqLogoSize * 0.48)} fontSize={sqTextFontSize} letterSpacing="1.2">
                    PAINT
                  </text>
                </g>

                {/* Slogan căn giữa bên dưới Logo */}
                <text
                  x={X / 2}
                  y={sqSloganY}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={sqSloganFontSize}
                  fontWeight="bold"
                  fontStyle="italic"
                  style={{
                    fontFamily: "'Segoe Script', 'Brush Script MT', 'Montserrat', cursive, sans-serif",
                    textShadow: "0 1px 3px rgba(0,0,0,0.30)",
                  }}
                >
                  {sloganRaw}
                </text>
              </g>

              {/* DẢI MÀU QUANG PHỔ NẰM NGANG CHẠY SUỐT CHIỀU RỘNG X */}
              <rect x={0} y={splitSpectrumY} width={X} height={splitSpectrumH} fill="url(#nippon-spectrum-horiz)" />

              {/* TẦNG DƯỚI (2/5 Y): THÔNG TIN ĐẠI LÝ CĂN GIỮA HOÀN HẢO */}
              <g id="sq-bottom-dealer-zone">
                <text x={X / 2} y={sqRow1Y} textAnchor="middle" fill="#FFFFFF" fontSize={finalSqDealerTitleFontSize} fontWeight="800" letterSpacing="1.2">
                  {dealerTypeRaw}
                </text>
                <text
                  x={X / 2}
                  y={sqNameY}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={finalSqDealerNameFontSize}
                  fontWeight="900"
                  fontStyle="italic"
                  letterSpacing="2.0"
                  style={{
                    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
                  }}
                >
                  {dealerNameRaw}
                </text>
                <text x={X / 2} y={sqAddrY} textAnchor="middle" fill="#FFFFFF" fontSize={finalSqDealerAddrFontSize} fontWeight="700">
                  {dealerAddressRaw}
                </text>
                {dealerPhoneRaw && (
                  <text x={X / 2} y={sqPhoneY} textAnchor="middle" fill="#FFFFFF" fontSize={finalSqDealerPhoneFontSize} fontWeight="800" fontFamily="monospace">
                    {fullPhoneText}
                  </text>
                )}
              </g>
            </g>
          ) : (
            /* -------------------------------------------------------- */
            /* TRƯỜNG HỢP B: BỐ CỤC CHIA NGANG (MẪU 03 CHUẨN & MẪU 04 HẸP) */
            /* -------------------------------------------------------- */
            <g id="layout-horizontal-clean">
              {/* 1.1 VÙNG THƯƠNG HIỆU NIPPON PAINT (2/3 X) */}
              <g id="brand-identity-zone">
                {/* Huy hiệu Logo 'n' */}
                <g id="logo-badge-official" transform={`translate(${logoBadgeX}, ${logoBadgeY})`}>
                  <rect x={0} y={0} width={logoBadgeSize} height={logoBadgeSize} rx={Math.round(logoBadgeSize * 0.18)} fill={NIPPON_BRAND_COLORS.blueLogo} />
                  <rect x={Math.round(logoBadgeSize * 0.03)} y={Math.round(logoBadgeSize * 0.03)} width={Math.round(logoBadgeSize * 0.94)} height={Math.round(logoBadgeSize * 0.94)} rx={Math.round(logoBadgeSize * 0.16)} fill="none" stroke="#FFFFFF" strokeWidth={Math.max(3, Math.round(logoBadgeSize * 0.04))} />
                  <path
                    d={`
                      M ${logoBadgeSize * 0.22} ${logoBadgeSize * 0.82}
                      L ${logoBadgeSize * 0.22} ${logoBadgeSize * 0.24}
                      C ${logoBadgeSize * 0.22} ${logoBadgeSize * 0.16}, ${logoBadgeSize * 0.32} ${logoBadgeSize * 0.14}, ${logoBadgeSize * 0.48} ${logoBadgeSize * 0.14}
                      C ${logoBadgeSize * 0.72} ${logoBadgeSize * 0.14}, ${logoBadgeSize * 0.84} ${logoBadgeSize * 0.26}, ${logoBadgeSize * 0.84} ${logoBadgeSize * 0.50}
                      L ${logoBadgeSize * 0.84} ${logoBadgeSize * 0.82}
                      C ${logoBadgeSize * 0.84} ${logoBadgeSize * 0.86}, ${logoBadgeSize * 0.76} ${logoBadgeSize * 0.88}, ${logoBadgeSize * 0.68} ${logoBadgeSize * 0.88}
                      C ${logoBadgeSize * 0.62} ${logoBadgeSize * 0.88}, ${logoBadgeSize * 0.58} ${logoBadgeSize * 0.84}, ${logoBadgeSize * 0.58} ${logoBadgeSize * 0.78}
                      L ${logoBadgeSize * 0.58} ${logoBadgeSize * 0.52}
                      C ${logoBadgeSize * 0.58} ${logoBadgeSize * 0.38}, ${logoBadgeSize * 0.52} ${logoBadgeSize * 0.34}, ${logoBadgeSize * 0.44} ${logoBadgeSize * 0.34}
                      C ${logoBadgeSize * 0.36} ${logoBadgeSize * 0.34}, ${logoBadgeSize * 0.32} ${logoBadgeSize * 0.38}, ${logoBadgeSize * 0.32} ${logoBadgeSize * 0.52}
                      L ${logoBadgeSize * 0.32} ${logoBadgeSize * 0.82}
                      Z
                    `}
                    fill="#FFFFFF"
                  />
                  <path
                    d={`
                      M ${logoBadgeSize * 0.25} ${logoBadgeSize * 0.80}
                      L ${logoBadgeSize * 0.25} ${logoBadgeSize * 0.28}
                      C ${logoBadgeSize * 0.25} ${logoBadgeSize * 0.20}, ${logoBadgeSize * 0.34} ${logoBadgeSize * 0.18}, ${logoBadgeSize * 0.48} ${logoBadgeSize * 0.18}
                      C ${logoBadgeSize * 0.68} ${logoBadgeSize * 0.18}, ${logoBadgeSize * 0.80} ${logoBadgeSize * 0.28}, ${logoBadgeSize * 0.80} ${logoBadgeSize * 0.50}
                      L ${logoBadgeSize * 0.80} ${logoBadgeSize * 0.80}
                      C ${logoBadgeSize * 0.80} ${logoBadgeSize * 0.83}, ${logoBadgeSize * 0.74} ${logoBadgeSize * 0.85}, ${logoBadgeSize * 0.68} ${logoBadgeSize * 0.85}
                      C ${logoBadgeSize * 0.64} ${logoBadgeSize * 0.85}, ${logoBadgeSize * 0.61} ${logoBadgeSize * 0.82}, ${logoBadgeSize * 0.61} ${logoBadgeSize * 0.78}
                      L ${logoBadgeSize * 0.61} ${logoBadgeSize * 0.52}
                      C ${logoBadgeSize * 0.61} ${logoBadgeSize * 0.36}, ${logoBadgeSize * 0.54} ${logoBadgeSize * 0.32}, ${logoBadgeSize * 0.45} ${logoBadgeSize * 0.32}
                      C ${logoBadgeSize * 0.37} ${logoBadgeSize * 0.32}, ${logoBadgeSize * 0.34} ${logoBadgeSize * 0.36}, ${logoBadgeSize * 0.34} ${logoBadgeSize * 0.52}
                      L ${logoBadgeSize * 0.34} ${logoBadgeSize * 0.80}
                      Z
                    `}
                    fill="#D51A21"
                  />
                </g>

                {/* Cụm chữ NIPPON PAINT */}
                <g
                  id="brand-text-nippon-paint"
                  transform={`translate(${brandTextX}, 0)`}
                  style={{
                    fontFamily: "'Montserrat', 'Arial Black', sans-serif",
                    fontStyle: "italic",
                    fontWeight: 900,
                    fill: "#FFFFFF",
                  }}
                >
                  <text x={0} y={logoBadgeY + Math.round(logoBadgeSize * 0.44)} fontSize={brandTextFontSize} letterSpacing="1.2">
                    NIPPON
                  </text>
                  <text x={0} y={logoBadgeY + Math.round(logoBadgeSize * 0.44) + brandTextLineSpacing} fontSize={brandTextFontSize} letterSpacing="1.2">
                    PAINT
                  </text>
                </g>

                {/* Slogan thương hiệu "Sơn Đâu Cũng Đẹp" */}
                <g id="brand-slogan" transform={`translate(${sloganX}, ${sloganY})`}>
                  <text
                    x={0}
                    y={0}
                    fill="#FFFFFF"
                    fontSize={sloganFontSize}
                    fontWeight="bold"
                    fontStyle="italic"
                    style={{
                      fontFamily: "'Segoe Script', 'Brush Script MT', 'Montserrat', cursive, sans-serif",
                      textShadow: "0 1px 3px rgba(0,0,0,0.30)",
                    }}
                  >
                    {sloganRaw}
                  </text>
                </g>
              </g>

              {/* 1.2 DẢI MÀU QUANG PHỔ ĐỨNG (1/9 CỦA 1/3 X) */}
              <g id="spectrum-bar" transform={`translate(${spectrumBarX}, 0)`}>
                <rect x={0} y={0} width={spectrumBarW} height={Y} fill="url(#nippon-spectrum-vert)" />
              </g>

              {/* 1.3 VÙNG THÔNG TIN ĐẠI LÝ (1/3 X - TUYỆT ĐỐI KHÔNG TRÀN LỀ) */}
              <g id="dealer-info-zone">
                {/* Dòng 1: Tiền tố / Loại hình */}
                <text
                  x={dealerContentX}
                  y={dealerRow1Y}
                  fill="#FFFFFF"
                  fontSize={dealerTitleFontSize}
                  fontWeight="800"
                  letterSpacing="0.8"
                  textLength={actualRow1W}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {dealerTypeRaw}
                </text>

                {/* Dòng 2: Tên đại lý chính - Căn chuẩn từng từ, tuyệt đối không tràn viền */}
                <g id="dealer-name-words">
                  {wordPositions.map((wp, idx) => (
                    <text
                      key={idx}
                      x={wp.x}
                      y={dealerNameY}
                      fill="#FFFFFF"
                      fontSize={dealerNameFontSize}
                      letterSpacing="2.0"
                      textLength={wp.width}
                      lengthAdjust="spacingAndGlyphs"
                      style={{
                        fontFamily: "'Montserrat', 'Arial Black', sans-serif",
                        fontStyle: "italic",
                        fontWeight: 900,
                      }}
                    >
                      {wp.word}
                    </text>
                  ))}
                </g>

                {/* Dòng 3: Địa chỉ hiện trường - 1 dòng chuẩn theo golden reference */}
                <text
                  x={dealerContentX}
                  y={dealerAddrY1}
                  fill="#FFFFFF"
                  fontSize={dealerAddrFontSize}
                  fontWeight="700"
                  textLength={actualAddrLine1W}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {dealerAddressRaw}
                </text>

                {/* Dòng 4: Điện thoại */}
                {dealerPhoneRaw && (
                  <text
                    x={dealerContentX}
                    y={dealerPhoneY}
                    fill="#FFFFFF"
                    fontSize={dealerPhoneFontSize}
                    fontWeight="800"
                    fontFamily="monospace"
                    textLength={actualPhoneW}
                    lengthAdjust="spacingAndGlyphs"
                  >
                    {fullPhoneText}
                  </text>
                )}
              </g>
            </g>
          )}
        </g>

        {/* ======================================================== */}
        {/* 2. HỆ THỐNG DIMENSIONS CAD XƯỞNG IN (ĐẦY ĐỦ, RÕ NÉT, TƯƠNG PHẢN CAO) */}
        {/* ======================================================== */}
        {showDimensions && (
          <g id="technical-cad-dimensions">
            {/* THƯỚC GIÓNG TỔNG CHIỀU RỘNG X TRÊN ĐỈNH */}
            <CadHorizontalDim
              x1={0}
              x2={X}
              y={-95}
              extY1={-5}
              extY2={-5}
              valueText={`${Math.round(X / 10)} cm`}
              fontSize={outerDimTextSize}
              strokeWidth={cadStroke * 1.2}
              color={dimHColor}
              arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
              arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
              badgeBorder={badgeBorderH}
            />

            {/* THƯỚC GIÓNG TỔNG CHIỀU CAO Y BÊN TRÁI */}
            <CadVerticalDim
              y1={0}
              y2={Y}
              x={-100}
              extX1={-5}
              extX2={-5}
              valueText={`${Math.round(Y / 10)} cm`}
              fontSize={outerDimTextSize}
              strokeWidth={cadStroke * 1.2}
              color={dimHColor}
              arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
              arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
              badgeBorder={badgeBorderH}
              isRotated={true}
            />

            {/* TRƯỜNG HỢP A: BẢNG GẦN VUÔNG / CHIA TRÊN DƯỚI (MẪU 05) */}
            {isSplitVertical ? (
              <g id="inner-dims-split">
                {/* Đo Tầng trên (3/5 Y) */}
                <CadVerticalDim
                  y1={0}
                  y2={splitTopH}
                  x={X + 35}
                  extX1={X + 5}
                  extX2={X + 5}
                  valueText={`${Math.round(splitTopH / 10)} cm (3/5 Y)`}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Đo Tầng dưới (2/5 Y) */}
                <CadVerticalDim
                  y1={splitTopH}
                  y2={Y}
                  x={X + 35}
                  extX1={X + 5}
                  extX2={X + 5}
                  valueText={`${Math.round((Y - splitTopH) / 10)} cm (2/5 Y)`}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Đo dải màu quang phổ ngang */}
                <CadVerticalDim
                  y1={splitSpectrumY}
                  y2={splitSpectrumY + splitSpectrumH}
                  x={X + 90}
                  extX1={X + 5}
                  extX2={X + 5}
                  valueText={`${Math.round(splitSpectrumH / 10)} cm`}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* Đo bề rộng cụm Brand tầng trên */}
                <CadHorizontalDim
                  x1={sqBrandStartX}
                  x2={sqBrandStartX + sqBrandTotalW}
                  y={splitTopH - 16}
                  valueText={`${Math.round(sqBrandTotalW / 10)} cm`}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* Đo Logo tầng trên */}
                <CadVerticalDim
                  y1={sqBrandStartY}
                  y2={sqBrandStartY + sqLogoSize}
                  x={sqBrandStartX - 25}
                  valueText={Math.round(sqLogoSize / 10)}
                  fontSize={dimTextSize * 0.9}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />
              </g>
            ) : (
              /* TRƯỜNG HỢP B: BẢNG NGANG CHUẨN (MẪU 03) & NGANG HẸP (MẪU 04) */
              <g id="inner-dims-horizontal">
                {/* ---------------------------------------------------- */}
                {/* CÁC KÍCH THƯỚC VÙNG THƯƠNG HIỆU (BRAND ZONE - 2/3 X) */}
                {/* ---------------------------------------------------- */}

                {/* Lề trái đến Logo badge (Xanh) */}
                <CadHorizontalDim
                  x1={0}
                  x2={logoBadgeX}
                  y={logoBadgeY + Math.round(logoBadgeSize * 0.5)}
                  valueText={`${Math.round(logoBadgeX / 10)} cm`}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* Lề trên đến Logo badge (Đỏ) */}
                <CadVerticalDim
                  y1={0}
                  y2={logoBadgeY}
                  x={logoBadgeX + Math.round(logoBadgeSize * 0.4)}
                  valueText={Math.round(logoBadgeY / 10)}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Chiều cao Logo badge (Đỏ) */}
                <CadVerticalDim
                  y1={logoBadgeY}
                  y2={logoBadgeY + logoBadgeSize}
                  x={logoBadgeX + logoBadgeSize + 22}
                  extX1={logoBadgeX + logoBadgeSize}
                  extX2={logoBadgeX + logoBadgeSize}
                  valueText={Math.round(logoBadgeSize / 10)}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Khoảng cách Logo sang NIPPON (Xanh) */}
                <CadHorizontalDim
                  x1={logoBadgeX + logoBadgeSize}
                  x2={brandTextX}
                  y={logoBadgeY + Math.round(logoBadgeSize * 0.35)}
                  valueText={Math.round((brandTextX - (logoBadgeX + logoBadgeSize)) / 10)}
                  fontSize={dimTextSize * 0.9}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* Đỉnh sign đến chân chữ NIPPON (Đỏ) */}
                <CadVerticalDim
                  y1={0}
                  y2={logoBadgeY + Math.round(logoBadgeSize * 0.44)}
                  x={brandZoneW - 40}
                  valueText={Math.round((logoBadgeY + Math.round(logoBadgeSize * 0.44)) / 10)}
                  fontSize={dimTextSize * 0.9}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Đỉnh sign đến chân chữ PAINT (Đỏ) */}
                <CadVerticalDim
                  y1={0}
                  y2={logoBadgeY + logoBadgeSize}
                  x={brandZoneW - 15}
                  valueText={Math.round((logoBadgeY + logoBadgeSize) / 10)}
                  fontSize={dimTextSize * 0.9}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Slogan & Chi tiết (Mẫu 03) */}
                {!isNarrow && (
                  <g id="slogan-chain-dims">
                    {/* Khoảng cách từ Logo xuống Slogan (Đỏ) */}
                    <CadVerticalDim
                      y1={logoBadgeY + logoBadgeSize}
                      y2={sloganY}
                      x={logoBadgeX + Math.round(logoBadgeSize * 0.2)}
                      valueText={Math.round((sloganY - (logoBadgeY + logoBadgeSize)) / 10)}
                      fontSize={dimTextSize * 0.9}
                      strokeWidth={cadStroke}
                      color={dimVColor}
                      arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                      arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                      badgeBorder={badgeBorderV}
                    />

                    {/* Slogan cách mép đáy (Đỏ) */}
                    <CadVerticalDim
                      y1={sloganY}
                      y2={Y}
                      x={sloganX + actualSloganW + 20}
                      valueText={Math.round((Y - sloganY) / 10)}
                      fontSize={dimTextSize * 0.9}
                      strokeWidth={cadStroke}
                      color={dimVColor}
                      arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                      arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                      badgeBorder={badgeBorderV}
                    />

                    {/* Lề trái đến Slogan (Xanh) */}
                    <CadHorizontalDim
                      x1={0}
                      x2={sloganX}
                      y={sloganY + 28}
                      valueText={`${Math.round(sloganX / 10)} cm`}
                      fontSize={dimTextSize * 0.9}
                      strokeWidth={cadStroke}
                      color={dimHColor}
                      arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                      arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                      badgeBorder={badgeBorderH}
                    />

                    {/* Bề rộng từng từ Slogan (Xanh) */}
                    {sloganWordPositions.map((sp: { word: string; x: number; width: number }, idx: number) => (
                      <React.Fragment key={idx}>
                        <CadHorizontalDim
                          x1={sp.x}
                          x2={sp.x + sp.width}
                          y={sloganY + 28}
                          valueText={`${Math.round(sp.width / 10)} cm`}
                          fontSize={dimTextSize * 0.82}
                          strokeWidth={cadStroke}
                          color={dimHColor}
                          arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                          arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                          badgeBorder={badgeBorderH}
                        />
                        {idx < sloganWordPositions.length - 1 && (
                          <CadHorizontalDim
                            x1={sp.x + sp.width}
                            x2={sloganWordPositions[idx + 1].x}
                            y={sloganY + 28}
                            valueText={Math.round(dim.sloganGap || 18)}
                            fontSize={dimTextSize * 0.75}
                            strokeWidth={cadStroke * 0.85}
                            color={dimHColor}
                            arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                            arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                            badgeBorder={badgeBorderH}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </g>
                )}

                {/* ---------------------------------------------------- */}
                {/* DẢI MÀU QUANG PHỔ (SPECTRUM BAR DIM) */}
                {/* ---------------------------------------------------- */}
                <CadHorizontalDim
                  x1={spectrumBarX}
                  x2={spectrumBarX + spectrumBarW}
                  y={Math.round(Y * 0.5)}
                  valueText={`${Math.round(spectrumBarW / 10)} cm`}
                  fontSize={dimTextSize * 0.85}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* ---------------------------------------------------- */}
                {/* CÁC KÍCH THƯỚC VÙNG ĐẠI LÝ (DEALER ZONE - 1/3 X) */}
                {/* ---------------------------------------------------- */}

                {/* Dòng 1 (Loại hình): Bề rộng & Chiều cao */}
                <CadHorizontalDim
                  x1={dealerContentX}
                  x2={dealerContentX + actualRow1W}
                  y={dealerRow1Y - 20}
                  extY1={dealerRow1Y}
                  extY2={dealerRow1Y}
                  valueText={Math.round(actualRow1W / 10)}
                  fontSize={dimTextSize * 0.85}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />
                <CadVerticalDim
                  y1={dealerRow1Y - dealerTitleFontSize}
                  y2={dealerRow1Y}
                  x={dealerContentX - 25}
                  valueText={Math.round(dealerTitleFontSize / 10)}
                  fontSize={dimTextSize * 0.85}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Lề trên đến Dòng 1 (Đỏ) */}
                <CadVerticalDim
                  y1={0}
                  y2={dealerRow1Y - dealerTitleFontSize}
                  x={X - dealerMarginRight + 15}
                  valueText={Math.round((dealerRow1Y - dealerTitleFontSize) / 10)}
                  fontSize={dimTextSize * 0.9}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Khoảng cách Dòng 1 xuống Dòng 2 (Đỏ) */}
                <CadVerticalDim
                  y1={dealerRow1Y}
                  y2={dealerNameY - dealerNameFontSize}
                  x={dealerContentX - 25}
                  valueText={Math.round((dealerNameY - dealerNameFontSize - dealerRow1Y) / 10)}
                  fontSize={dimTextSize * 0.85}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Dòng 2: Chiều cao Tên Đại lý (Đỏ) */}
                <CadVerticalDim
                  y1={dealerNameY - dealerNameFontSize}
                  y2={dealerNameY}
                  x={dealerContentX - 25}
                  valueText={Math.round(dealerNameFontSize / 10)}
                  fontSize={dimTextSize * 0.9}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Dòng 2: Chuỗi kích thước từng từ Tên Đại lý (Xanh) */}
                {wordPositions.map((wp, i) => (
                  <React.Fragment key={i}>
                    <CadHorizontalDim
                      x1={wp.x}
                      x2={wp.x + wp.width}
                      y={dealerNameY - dealerNameFontSize - 16}
                      valueText={Math.round(wp.width / 10)}
                      fontSize={dimTextSize * 0.85}
                      strokeWidth={cadStroke}
                      color={dimHColor}
                      arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                      arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                      badgeBorder={badgeBorderH}
                    />
                    {i < wordPositions.length - 1 && (
                      <CadHorizontalDim
                        x1={wp.x + wp.width}
                        x2={wordPositions[i + 1].x}
                        y={dealerNameY - dealerNameFontSize - 16}
                        valueText={Math.round(dealerWordGap / 10)}
                        fontSize={dimTextSize * 0.75}
                        strokeWidth={cadStroke * 0.85}
                        color={dimHColor}
                        arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                        arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                        badgeBorder={badgeBorderH}
                      />
                    )}
                  </React.Fragment>
                ))}

                {/* Dòng 2: Tổng chiều rộng Tên Đại lý (Xanh) */}
                <CadHorizontalDim
                  x1={dealerContentX}
                  x2={dealerContentX + actualDealerNameW}
                  y={dealerNameY + 22}
                  extY1={dealerNameY}
                  extY2={dealerNameY}
                  valueText={Math.round(actualDealerNameW / 10)}
                  fontSize={dimTextSize}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* Dòng 3: Bề rộng Địa chỉ (Xanh) */}
                <CadHorizontalDim
                  x1={dealerContentX}
                  x2={dealerContentX + actualAddrLine1W}
                  y={dealerAddrY1 - dealerAddrFontSize - 12}
                  valueText={Math.round(actualAddrLine1W / 10)}
                  fontSize={dimTextSize * 0.85}
                  strokeWidth={cadStroke}
                  color={dimHColor}
                  arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                  badgeBorder={badgeBorderH}
                />

                {/* Dòng 3: Chiều cao chữ Địa chỉ (Đỏ) */}
                <CadVerticalDim
                  y1={dealerAddrY1 - dealerAddrFontSize}
                  y2={dealerAddrY1}
                  x={dealerContentX - 25}
                  valueText={Math.round(dealerAddrFontSize / 10)}
                  fontSize={dimTextSize * 0.8}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />

                {/* Dòng 4: Bề rộng & lề đáy Điện thoại */}
                {dealerPhoneRaw && (
                  <>
                    <CadHorizontalDim
                      x1={dealerContentX}
                      x2={dealerContentX + actualPhoneW}
                      y={dealerPhoneY + 20}
                      valueText={Math.round(actualPhoneW / 10)}
                      fontSize={dimTextSize * 0.8}
                      strokeWidth={cadStroke}
                      color={dimHColor}
                      arrowStart={isRealistic ? "url(#arrow-cyan-start)" : "url(#arrow-blue-start)"}
                      arrowEnd={isRealistic ? "url(#arrow-cyan-end)" : "url(#arrow-blue-end)"}
                      badgeBorder={badgeBorderH}
                    />
                    <CadVerticalDim
                      y1={dealerPhoneY}
                      y2={Y}
                      x={dealerContentX + Math.round(actualPhoneW * 0.5)}
                      valueText={Math.round((Y - dealerPhoneY) / 10)}
                      fontSize={dimTextSize * 0.85}
                      strokeWidth={cadStroke}
                      color={dimVColor}
                      arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                      arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                      badgeBorder={badgeBorderV}
                    />
                  </>
                )}

                {/* Lề phải (Right margin dim) */}
                <CadHorizontalDim
                  x1={X - dealerMarginRight}
                  x2={X}
                  y={20}
                  valueText={Math.round(dealerMarginRight / 10)}
                  fontSize={dimTextSize * 0.85}
                  strokeWidth={cadStroke}
                  color={dimVColor}
                  arrowStart={isRealistic ? "url(#arrow-yellow-start)" : "url(#arrow-red-start)"}
                  arrowEnd={isRealistic ? "url(#arrow-yellow-end)" : "url(#arrow-red-end)"}
                  badgeBorder={badgeBorderV}
                />
              </g>
            )}
          </g>
        )}

        {/* ======================================================== */}
        {/* 3. KHUNG TÊN KỸ THUẬT TIÊU CHUẨN XƯỞNG IN (TITLE BLOCK) */}
        {/* ======================================================== */}
        {showTitleBlock && (
          <g id="technical-title-block" transform={`translate(0, ${Y + (showDimensions ? 130 : 35)})`}>
            <rect x={0} y={0} width={X} height={titleBlockH} fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />

            {/* Cột 1: Nhận diện thương hiệu Nippon Paint */}
            <g transform={`translate(${Math.round(X * 0.02)}, ${Math.round(titleBlockH * 0.16)})`}>
              <text x={0} y={Math.round(titleBlockH * 0.18)} fill="#B30024" fontSize={Math.max(16, Math.round(titleBlockH * 0.14))} fontWeight="900">
                NIPPON PAINT VIETNAM
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.36)} fill="#334155" fontSize={Math.max(11, Math.round(titleBlockH * 0.08))} fontWeight="bold">
                BẢN VẼ GIA CÔNG KỸ THUẬT XƯỞNG IN (PARAMETRIC SHOP DRAWING)
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.52)} fill="#64748B" fontSize={Math.max(10, Math.round(titleBlockH * 0.07))}>
                Màu chuẩn: Đỏ C:0 M:100 Y:80 K:30 | Xanh C:100 M:80 Y:0 K:15 | Dải quang phổ 9 màu
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.68)} fill="#64748B" fontSize={Math.max(10, Math.round(titleBlockH * 0.07))}>
                Font quy chuẩn: Nippon Paint Vietnam / Bold Italic
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.84)} fill="#0284C7" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))} fontWeight="bold">
                Quy cách: {spec.layoutName}
              </text>
            </g>

            <line x1={Math.round(X * 0.38)} y1={0} x2={Math.round(X * 0.38)} y2={titleBlockH} stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Cột 2: Thông tin công trình & Đại lý */}
            <g transform={`translate(${Math.round(X * 0.40)}, ${Math.round(titleBlockH * 0.16)})`}>
              <text x={0} y={Math.round(titleBlockH * 0.18)} fill="#0F172A" fontSize={Math.max(15, Math.round(titleBlockH * 0.12))} fontWeight="bold">
                ĐẠI LÝ: {dealerNameRaw}
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.36)} fill="#334155" fontSize={Math.max(11, Math.round(titleBlockH * 0.08))}>
                Loại hình: {dealerTypeRaw}
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.52)} fill="#334155" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))}>
                Địa chỉ: {dealerAddressRaw}
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.68)} fill="#334155" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))}>
                Hotline: {dealerPhoneRaw}
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.84)} fill="#1D4ED8" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))} fontWeight="bold">
                Kích thước phủ bì: {Math.round(X / 10)} × {Math.round(Y / 10)} cm ({input.widthMeters}m × {input.heightMeters}m × {input.depthMeters || 0.2}m)
              </text>
            </g>

            <line x1={Math.round(X * 0.76)} y1={0} x2={Math.round(X * 0.76)} y2={titleBlockH} stroke="#CBD5E1" strokeWidth="1.5" />

            {/* Cột 3: Bóc tách vật tư cơ bản */}
            <g transform={`translate(${Math.round(X * 0.78)}, ${Math.round(titleBlockH * 0.16)})`}>
              <text x={0} y={Math.round(titleBlockH * 0.18)} fill="#0F172A" fontSize={Math.max(14, Math.round(titleBlockH * 0.11))} fontWeight="bold">
                DỰ TOÁN VẬT TƯ THI CÔNG
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.38)} fill="#334155" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))}>
                • Diện tích mặt: {spec.areaM2} m² (~{spec.materialsEstimate.sheetCount} tấm Alu 1.22x2.44m)
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.54)} fill="#334155" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))}>
                • Khung sắt hộp: ~{spec.materialsEstimate.ironBarsCount} cây sắt mạ kẽm 6m
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.70)} fill="#334155" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))}>
                • Nẹp nhôm V viền: {spec.materialsEstimate.aluminumTrimMeters} m
              </text>
              <text x={0} y={Math.round(titleBlockH * 0.86)} fill="#059669" fontSize={Math.max(10, Math.round(titleBlockH * 0.075))} fontWeight="bold">
                ✓ Co dãn hình học Parametric Auto-Fit
              </text>
            </g>
          </g>
        )}
      </svg>
    );
  }
);

NipponSignCanvas.displayName = "NipponSignCanvas";
