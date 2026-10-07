"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Kích thước preset. Dùng `className` w-/h- để custom thêm nếu cần. */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Thời gian quay một vòng (ms). Mặc định 900ms cho cảm giác nhẹ. */
  duration?: number;
  /** Nhãn cho screen reader. */
  label?: string;
  /** Class riêng cho cung arc (mặc định ăn theo `text-*` của parent). */
  arcClassName?: string;
}

const SIZE_MAP = {
  xs: { box: "size-3.5", ring: "border-2" },
  sm: { box: "size-4", ring: "border-2" },
  md: { box: "size-6", ring: "border-2" },
  lg: { box: "size-10", ring: "border-[3px]" },
  xl: { box: "size-16", ring: "border-4" },
} as const;

/**
 * Spinner 2 vòng đồng tâm, tối giản.
 * Cải tiến từ ConcentricRing gốc:
 * - Không inject `<style>` mỗi lần render (dùng `animate-spin` của Tailwind).
 * - 2 lớp đều `absolute inset-0 ... m-auto` thay vì `top-1/2 + translate`
 *   nên không bị lệch 1px khi parent xoay.
 * - Border dày scale theo size, track mờ + arc đặc.
 */
function Spinner({
  size = "md",
  duration = 900,
  label = "Loading",
  arcClassName,
  className,
  style,
  ...props
}: SpinnerProps) {
  const current = SIZE_MAP[size];

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 animate-spin motion-reduce:animate-none",
        current.box,
        className
      )}
      style={{ animationDuration: `${duration}ms`, ...style }}
      {...props}
    >
      {/* Vòng track mờ */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-full border-solid border-current opacity-15",
          current.ring
        )}
      />
      {/* Vòng arc đặc — chỉ hiện 1 cung để tạo chuyển động mượt.
          Màu lấy từ `color` của chính span này nên có thể đổi
          riêng via `arcClassName="text-red-600"`. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 m-auto h-[72%] w-[72%] rounded-full border-solid border-transparent border-t-current",
          current.ring,
          arcClassName
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export { Spinner };
