"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from "@/components/ui";
import { usePageHeader } from "@/contexts/page-header-context";
import {
  Menu,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";

export interface TopBarProps {
  onOpenMobileMenu?: () => void;
  className?: string;
}

interface QuickViewItem {
  label: string;
  href: string;
}

interface RouteFallback {
  title: string;
  subtitle: string;
  quickViews?: QuickViewItem[];
}

function resolveDefaultRoute(pathname: string): RouteFallback {
  if (pathname === "/") {
    return {
      title: "Điều hành",
      subtitle: "Bàn làm việc & KPI",
      quickViews: [
        { label: "Tổng quan điều hành", href: "/" },
        { label: "Công việc khẩn cấp", href: "/cong-viec?filter=overdue" },
        { label: "Cảnh báo tồn kho", href: "/kho?tab=canh-bao" },
      ],
    };
  }

  if (pathname.startsWith("/khach-hang")) {
    return {
      title: "Khách hàng",
      subtitle: "Danh sách",
      quickViews: [
        { label: "Tất cả khách hàng", href: "/khach-hang" },
        { label: "Khách hàng có công nợ", href: "/khach-hang?tab=cong-no" },
        { label: "Khách hàng tiềm năng", href: "/khach-hang?status=tiem-nang" },
        { label: "Đại lý đối tác", href: "/khach-hang?type=dai-ly" },
      ],
    };
  }

  if (pathname.startsWith("/bao-gia")) {
    return {
      title: "Báo giá",
      subtitle: pathname.includes("/tao-moi") ? "Lập dự toán mới" : "Danh sách",
      quickViews: [
        { label: "Tất cả báo giá", href: "/bao-gia" },
        { label: "Chờ duyệt", href: "/bao-gia?status=cho-duyet" },
        { label: "Đã chốt hợp đồng", href: "/bao-gia?status=da-chot" },
      ],
    };
  }

  if (pathname.startsWith("/ban-hang")) {
    return {
      title: "Bán hàng",
      subtitle: pathname.includes("/tao-moi") ? "Lập đơn bán mới" : "Danh sách",
      quickViews: [
        { label: "Tất cả đơn bán", href: "/ban-hang" },
        { label: "Chưa thanh toán", href: "/ban-hang?status=chua-thu" },
      ],
    };
  }

  if (pathname.startsWith("/nha-cung-cap")) {
    return {
      title: "Nhà cung cấp",
      subtitle: "Danh sách",
      quickViews: [
        { label: "Tất cả nhà cung cấp", href: "/nha-cung-cap" },
        { label: "Có công nợ phải trả", href: "/nha-cung-cap?tab=cong-no" },
        { label: "Bảng giá vật tư thỏa thuận", href: "/nha-cung-cap?tab=bang-gia" },
      ],
    };
  }

  if (pathname.startsWith("/mua-hang")) {
    return {
      title: "Mua hàng (PO)",
      subtitle: pathname.includes("/tao-moi") ? "AI OCR & Tạo đơn mới" : "Danh sách",
      quickViews: [
        { label: "Tất cả đơn mua", href: "/mua-hang" },
        { label: "Chờ duyệt", href: "/mua-hang?status=cho-duyet" },
      ],
    };
  }

  if (pathname.startsWith("/vat-tu")) {
    return {
      title: "Vật tư",
      subtitle: "Danh mục và quy cách",
      quickViews: [
        { label: "Danh mục vật tư", href: "/vat-tu?tab=items" },
        { label: "Loại vật tư", href: "/vat-tu?tab=categories" },
        { label: "Đơn vị tính", href: "/vat-tu?tab=units" },
      ],
    };
  }

  if (pathname.startsWith("/kho/nhap-xuat")) {
    return {
      title: "Phiếu Kho",
      subtitle: "Nhập - Xuất - Chuyển",
      quickViews: [
        { label: "Phiếu nhập kho", href: "/kho/nhap-xuat?tab=nhap" },
        { label: "Phiếu xuất kho", href: "/kho/nhap-xuat?tab=xuat" },
        { label: "Phiếu điều chuyển", href: "/kho/nhap-xuat?tab=chuyen" },
      ],
    };
  }

  if (pathname.startsWith("/kho")) {
    return {
      title: "Kho",
      subtitle: "Danh sách kho và tồn kho",
      quickViews: [
        { label: "Danh sách kho", href: "/kho?tab=warehouses" },
        { label: "Tất cả tồn kho", href: "/kho?tab=stocks" },
      ],
    };
  }

  if (pathname.startsWith("/cong-viec")) {
    return {
      title: "Việc làm",
      subtitle: "Trung tâm phân công",
      quickViews: [
        { label: "Việc hôm nay", href: "/cong-viec?filter=today" },
        { label: "Việc đang làm", href: "/cong-viec?filter=in-progress" },
        { label: "Việc quá hạn", href: "/cong-viec?filter=overdue" },
      ],
    };
  }

  if (pathname.startsWith("/du-an")) {
    return {
      title: "Dự án",
      subtitle: "Công trình thi công",
      quickViews: [
        { label: "Dạng bảng", href: "/du-an?view=table" },
        { label: "Dạng Kanban", href: "/du-an?view=kanban" },
      ],
    };
  }

  if (pathname.startsWith("/hien-truong")) {
    return {
      title: "Hiện trường",
      subtitle: "Tác nghiệp 1 chạm GPS",
      quickViews: [
        { label: "Điểm danh GPS", href: "/hien-truong?tab=gps" },
        { label: "Ảnh Watermark", href: "/hien-truong?tab=camera" },
      ],
    };
  }

  if (pathname.startsWith("/van-chuyen")) {
    return {
      title: "Vận chuyển",
      subtitle: "Lệnh điều xe & Đội xe",
    };
  }

  if (pathname.startsWith("/tai-chinh")) {
    return {
      title: "Tài chính",
      subtitle: "Sổ quỹ & Thu chi",
      quickViews: [
        { label: "Sổ quỹ Thu - Chi", href: "/tai-chinh?tab=so-quy" },
        { label: "Công nợ phải thu", href: "/tai-chinh?tab=phai-thu" },
        { label: "Công nợ phải trả", href: "/tai-chinh?tab=phai-tra" },
      ],
    };
  }

  if (pathname.startsWith("/nhan-su/danh-gia-luong")) {
    return {
      title: "Tiền lương",
      subtitle: "Đánh giá KPI & Duyệt lương AI",
    };
  }

  if (pathname.startsWith("/nhan-su")) {
    return {
      title: "Nhân sự",
      subtitle: "Chấm công & Hồ sơ",
    };
  }

  if (pathname.startsWith("/ai-assistant")) {
    return {
      title: "Trợ lý AI",
      subtitle: "Hỏi đáp định mức",
    };
  }

  if (pathname.startsWith("/cai-dat")) {
    return {
      title: "Hệ thống",
      subtitle: "Cài đặt & Phân quyền",
    };
  }

  return {
    title: "Signage ERP",
    subtitle: pathname.replace("/", "").toUpperCase() || "Hệ thống",
  };
}

export function TopBar({
  onOpenMobileMenu,
  className,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = usePageHeader();

  const fallback = resolveDefaultRoute(pathname);
  const title = state.title || fallback.title;
  const subtitle = state.subtitle !== undefined ? state.subtitle : fallback.subtitle;
  const quickViews = state.quickViews || fallback.quickViews;

  return (
    <header
      className={cn(
        "h-14 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-slate-200 select-none shadow-2xs gap-3 overflow-hidden",
        className
      )}
    >
      {/* 1. Cụm bên trái: Breadcrumb chuẩn Benchmark UI (Khách hàng / Danh sách ⌄) */}
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

        <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1 overflow-hidden">
          {(state.screenCode || state.badge) && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 whitespace-nowrap">
              {state.screenCode || state.badge}
            </span>
          )}
          <span
            className={cn(
              "text-slate-800 font-semibold text-sm truncate shrink whitespace-nowrap",
              subtitle
                ? "max-w-[160px] sm:max-w-[240px] md:max-w-[340px] lg:max-w-[460px] xl:max-w-[580px]"
                : "max-w-full"
            )}
            title={title}
          >
            {title}
          </span>

          {subtitle && (
            <>
              <span className="text-slate-300 font-normal shrink-0 select-none">/</span>

              {quickViews && quickViews.length > 0 ? (
                <Dropdown className="min-w-0 shrink">
                  <DropdownTrigger className="min-w-0 max-w-full">
                    <div
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer transition py-1 px-1.5 rounded-md hover:bg-slate-100 text-xs font-normal min-w-0 max-w-[140px] sm:max-w-[220px] md:max-w-[320px] lg:max-w-[440px] xl:max-w-[560px]"
                      title={subtitle}
                    >
                      <span className="truncate whitespace-nowrap">{subtitle}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  </DropdownTrigger>
                  <DropdownContent align="left" width="md">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Chế độ xem / Lọc nhanh
                    </div>
                    {quickViews.map((qv, idx) => (
                      <DropdownItem
                        key={idx}
                        onClick={() => router.push(qv.href)}
                      >
                        {qv.label}
                      </DropdownItem>
                    ))}
                  </DropdownContent>
                </Dropdown>
              ) : (
                <span
                  className="text-slate-500 text-xs font-normal truncate shrink min-w-0 max-w-[140px] sm:max-w-[220px] md:max-w-[320px] lg:max-w-[440px] xl:max-w-[560px] whitespace-nowrap"
                  title={subtitle}
                >
                  {subtitle}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Cụm bên phải chuẩn Benchmark UI: [Đồng bộ / Trợ lý AI] và nút đen [+ Tạo / + Thêm mới] */}
      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {/* Secondary Action hoặc Trợ lý AI */}
        {state.secondaryAction ? (
          state.secondaryAction
        ) : (
          <Link
            href="/ai-assistant"
            title="Mở Trợ lý AI Signage"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-medium transition shadow-2xs shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </Link>
        )}

        {/* Primary Action Button chuẩn Benchmark UI (Nền đen, chữ trắng, font đậm [+ Tạo]) */}
        {state.primaryAction && (
          <div className="shrink-0">
            {state.primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}
