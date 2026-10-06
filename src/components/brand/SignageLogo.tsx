import * as React from "react";
import { cn } from "@/lib/utils";

export interface SignageLogoProps {
  /**
   * Kích thước biểu tượng logo
   */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /**
   * Tùy chọn hiển thị tên thương hiệu bằng chữ
   */
  showText?: boolean;
  /**
   * Phụ đề bên dưới tên thương hiệu
   */
  subtitle?: string;
  /**
   * Hiệu ứng neon phát sáng chuyển động
   */
  animated?: boolean;
  /**
   * Biến thể phối màu
   */
  variant?: "brand" | "blue" | "glow" | "dark";
  className?: string;
}

const SIZE_MAP = {
  sm: { box: "w-7 h-7", icon: 28, text: "text-sm", sub: "text-[9px]" },
  md: { box: "w-9 h-9", icon: 36, text: "text-base", sub: "text-[10px]" },
  lg: { box: "w-14 h-14", icon: 56, text: "text-xl", sub: "text-xs" },
  xl: { box: "w-20 h-20", icon: 80, text: "text-2xl", sub: "text-sm" },
  "2xl": { box: "w-28 h-28", icon: 112, text: "text-3xl", sub: "text-base" },
};

/**
 * Biểu tượng Logo vector chuẩn công nghiệp cho SIGNAGE ERP
 * Thiết kế lấy cảm hứng từ hộp đèn mica hút nổi, chữ nổi uốn chân viền nhôm định hình và ánh sáng LED/Neon
 */
export function SignageLogo({
  size = "md",
  showText = false,
  subtitle = "Hệ Thống Quản Trị Xưởng Biển Bảng",
  animated = false,
  variant = "brand",
  className,
}: SignageLogoProps) {
  const currentSize = SIZE_MAP[size];

  // Màu sắc theo biến thể
  const isBlue = variant === "blue";

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      {/* Khung Biểu Tượng LED Hộp Đèn Acrylic */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-300",
          currentSize.box,
          animated && "group hover:scale-105"
        )}
      >
        {/* Lớp nền phát sáng (Aura Glow) */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-90 blur-xs transition-opacity",
            isBlue
              ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/30"
              : "bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 shadow-lg shadow-red-500/30",
            animated && "animate-pulse"
          )}
        />

        {/* Khung viền kim loại / nhôm định hình của biển bảng */}
        <div className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/30 to-black/30 pointer-events-none" />

        {/* Bề mặt Mica / Mặt biển quảng cáo bóng cao cấp */}
        <div
          className={cn(
            "absolute inset-[2px] rounded-[14px] flex items-center justify-center overflow-hidden",
            isBlue
              ? "bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900"
              : "bg-gradient-to-br from-red-600 via-rose-700 to-amber-700"
          )}
        >
          {/* Họa tiết lưới kỹ thuật bóc tách bản vẽ quảng cáo */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "6px 6px",
            }}
          />

          {/* Biểu tượng Vector "SE" cách điệu Neon Signage */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full p-2 relative z-10 drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Gradient ánh sáng Neon */}
              <linearGradient id="neonGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#fed7aa" />
                <stop offset="70%" stopColor="#fecdd3" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              <linearGradient id="neonGradientBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#e0e7ff" />
              </linearGradient>

              {/* Bộ lọc phát sáng LED Glow Filter */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Ký tự cách điệu S (Đại diện cho SIGNAGE - Uốn lượn như ống LED Neon Flex) */}
            <path
              d="M 68 28 C 68 22, 58 18, 48 18 C 36 18, 28 24, 28 34 C 28 44, 38 48, 52 52 C 68 56, 74 62, 74 72 C 74 84, 62 88, 48 88 C 34 88, 26 82, 24 76"
              stroke={isBlue ? "url(#neonGradientBlue)" : "url(#neonGradientRed)"}
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />

            {/* Lớp lõi ánh sáng trắng trung tâm (Tạo hiệu ứng neon thật rực rỡ) */}
            <path
              d="M 68 28 C 68 22, 58 18, 48 18 C 36 18, 28 24, 28 34 C 28 44, 38 48, 52 52 C 68 56, 74 62, 74 72 C 74 84, 62 88, 48 88 C 34 88, 26 82, 24 76"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 2. Điểm định vị kỹ thuật & Tia laser ngành quảng cáo (Laser Point) */}
            <circle cx="78" cy="24" r="3.5" fill="#ffffff" filter="url(#neonGlow)" />
            <circle cx="20" cy="80" r="3" fill="#ffffff" opacity="0.8" />

            {/* 3. Chữ E nhỏ góc phải cách điệu (ERP) */}
            <path
              d="M 72 48 L 84 48 M 72 42 L 85 42 M 72 54 L 85 54 M 72 42 L 72 54"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>

          {/* Vệt ánh sáng quét phản chiếu bề mặt Mica (Glass Shimmer) */}
          <div className="absolute -inset-full top-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 pointer-events-none transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>

      {/* Tên Thương Hiệu Bằng Chữ (Optional) */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-black tracking-tight text-slate-900 uppercase font-sans",
                currentSize.text
              )}
            >
              Signage <span className={isBlue ? "text-blue-600" : "text-red-600"}>ERP</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-slate-900 text-white shadow-2xs">
              PRO
            </span>
          </div>
          {subtitle && (
            <span className={cn("text-slate-500 font-medium tracking-normal", currentSize.sub)}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
