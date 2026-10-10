"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/contexts/page-header-context";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Menu } from "lucide-react";

export interface TopBarProps {
  onOpenMobileMenu?: () => void;
  className?: string;
}

interface RouteFallback {
  title: string;
  subtitle: string;
}

function resolveDefaultRoute(pathname: string): RouteFallback {
  if (pathname === "/") {
    return { title: "Điều hành", subtitle: "Bàn làm việc & KPI" };
  }

  if (pathname.startsWith("/khach-hang")) {
    return { title: "Khách hàng", subtitle: "Danh sách" };
  }

  if (pathname.startsWith("/bao-gia")) {
    return {
      title: "Báo giá",
      subtitle: pathname.includes("/tao-moi") ? "Lập dự toán mới" : "Danh sách",
    };
  }

  if (pathname.startsWith("/ban-hang")) {
    return {
      title: "Bán hàng",
      subtitle: pathname.includes("/tao-moi") ? "Lập đơn bán mới" : "Danh sách",
    };
  }

  if (pathname.startsWith("/nha-cung-cap")) {
    return { title: "Nhà cung cấp", subtitle: "Danh sách" };
  }

  if (pathname.startsWith("/mua-hang")) {
    return {
      title: "Mua hàng (PO)",
      subtitle: pathname.includes("/tao-moi") ? "Tạo đơn mới" : "Danh sách",
    };
  }

  if (pathname.startsWith("/vat-tu")) {
    return { title: "Vật tư & Định mức", subtitle: "Danh mục & BOM" };
  }

  if (pathname.startsWith("/kho/nhap-xuat")) {
    return { title: "Phiếu Kho", subtitle: "Nhập - Xuất - Chuyển" };
  }

  if (pathname.startsWith("/kho")) {
    return { title: "Kho", subtitle: "Tồn kho" };
  }

  if (pathname.startsWith("/cong-viec")) {
    return { title: "Công việc", subtitle: "Điều phối & Tiến độ" };
  }

  if (pathname.startsWith("/du-an")) {
    return { title: "Dự án", subtitle: "Công trình thi công" };
  }

  if (pathname.startsWith("/hien-truong")) {
    return { title: "Hiện trường", subtitle: "Tác nghiệp GPS" };
  }

  if (pathname.startsWith("/apps/doi-xe") || pathname.startsWith("/doi-xe") || pathname.startsWith("/van-chuyen")) {
    return { title: "Đội xe & Vận chuyển", subtitle: "Fleet Pro" };
  }

  if (pathname.startsWith("/apps/hrm")) {
    return { title: "HRM Suite", subtitle: "Nhân sự & Lương" };
  }

  if (pathname.startsWith("/apps/tai-lieu")) {
    return { title: "Tài liệu nội bộ", subtitle: "Kho hồ sơ & Drive" };
  }

  if (pathname.startsWith("/tai-chinh")) {
    return { title: "Tài chính", subtitle: "Sổ quỹ & Thu chi" };
  }

  if (pathname.startsWith("/nhan-su/danh-gia-luong")) {
    return { title: "Tiền lương", subtitle: "KPI & Duyệt lương" };
  }

  if (pathname.startsWith("/nhan-su")) {
    return { title: "Nhân sự", subtitle: "Chấm công & Hồ sơ" };
  }

  if (pathname.startsWith("/ai-assistant")) {
    return { title: "Trợ lý AI", subtitle: "Hỏi đáp định mức" };
  }

  if (pathname.startsWith("/cai-dat")) {
    return { title: "Hệ thống", subtitle: "Cài đặt & Phân quyền" };
  }

  // Route lạ / trang [id]: chỉ hiện nhóm cha, không phô full path + id
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return {
    title: "Chi tiết",
    subtitle: firstSegment ? firstSegment.replace(/-/g, " ") : "Hệ thống",
  };
}

export function TopBar({
  onOpenMobileMenu,
  className,
}: TopBarProps) {
  const pathname = usePathname();
  const { state } = usePageHeader();

  const fallback = resolveDefaultRoute(pathname);
  const title = state.title || fallback.title;
  const subtitle = state.subtitle !== undefined ? state.subtitle : fallback.subtitle;

  return (
    <header
      className={cn(
        "h-14 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-slate-200 select-none shadow-2xs gap-3",
        className
      )}
    >
      {/* Cụm trái: breadcrumb gọn (Tên trang / Mô tả ngắn) */}
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition shrink-0"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs min-w-0 flex-1 overflow-hidden"
        >
          {(state.screenCode || state.badge) && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 whitespace-nowrap">
              {state.screenCode || state.badge}
            </span>
          )}
          <span
            className="text-slate-800 font-semibold text-sm truncate whitespace-nowrap max-w-[140px] sm:max-w-[220px]"
            title={title}
          >
            {title}
          </span>

          {subtitle && (
            <>
              <span className="text-slate-300 font-normal shrink-0 select-none">/</span>
              <span
                className="text-slate-500 text-xs font-normal truncate whitespace-nowrap max-w-[100px] sm:max-w-[200px]"
                title={subtitle}
              >
                {subtitle}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Cụm phải: [Tác vụ trang] -> [Chuông thông báo] */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {state.secondaryAction}

        {state.primaryAction && (
          <div className="shrink-0">
            {state.primaryAction}
          </div>
        )}

        <NotificationBell />
      </div>
    </header>
  );
}
