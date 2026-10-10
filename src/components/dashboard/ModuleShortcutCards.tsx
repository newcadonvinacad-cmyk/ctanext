"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  FileSpreadsheet,
  ShoppingCart,
  Building2,
  ClipboardCheck,
  Boxes,
  Package,
  ArrowLeftRight,
  CheckSquare,
  HardHat,
  MapPin,
  Truck,
  CircleDollarSign,
  BarChart3,
  Settings,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";

interface ExecutiveKpi {
  totalRevenue: number;
  totalExpense: number;
  grossProfit: number;
  cashBalance: number;
  bankBalance: number;
  receivablesTotal: number;
  payablesTotal: number;
  activeProjectsCount: number;
  inProgressTasksCount: number;
  inventoryAlertsCount: number;
}

export function ModuleShortcutCards({
  kpi,
  canViewFinance,
}: {
  kpi: ExecutiveKpi | null;
  canViewFinance?: boolean;
}) {
  const { canAccessScreen } = useAuthorization();

  const formatVnd = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Định nghĩa toàn bộ danh mục phân hệ chuẩn hệ thống
  const allModules = [
    {
      screenCode: "M11",
      title: "Dự Án & Tiến Độ WBS",
      href: "/du-an",
      desc: "Quản lý tiến độ thi công, phân rã WBS & nghiệm thu công trình",
      icon: HardHat,
      stat: kpi?.activeProjectsCount ? `${kpi.activeProjectsCount} dự án đang chạy` : undefined,
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M10",
      title: "Điều Phối Công Việc",
      href: "/cong-viec",
      desc: "Phân công nhiệm vụ, cập nhật % tiến độ & báo cáo thi công",
      icon: CheckSquare,
      stat: kpi?.inProgressTasksCount ? `${kpi.inProgressTasksCount} việc đang làm` : undefined,
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M14",
      title: "Hiện Trường 1 Chạm (GPS)",
      href: "/hien-truong",
      desc: "Chấm công GPS, chụp ảnh watermark & nhật ký giọng nói AI",
      icon: MapPin,
      badge: "GPS",
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "APP_HRM",
      title: "HRM - Nhân Sự & Lương",
      href: "/apps/hrm",
      desc: "Hồ sơ nhân viên, bảng công 1..31 ngày & tính lương tự động",
      icon: Users,
      badge: "App Mới",
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M08",
      title: "Quản Trị Tồn Kho",
      href: "/kho",
      desc: "Kiểm soát tồn kho đa kho, xuất nhập vật tư & cảnh báo an toàn",
      icon: Package,
      stat: kpi?.inventoryAlertsCount ? `${kpi.inventoryAlertsCount} cảnh báo tồn` : undefined,
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M07",
      title: "Danh Mục Vật Tư & Định Mức",
      href: "/vat-tu",
      desc: "Quy cách vật tư quảng cáo, định mức BOM & bóc tách kỹ thuật",
      icon: Boxes,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      screenCode: "M09",
      title: "Phiếu Nhập - Xuất Kho",
      href: "/kho/nhap-xuat",
      desc: "Trung tâm lập & phê duyệt phiếu nhập, xuất, chuyển kho",
      icon: ArrowLeftRight,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      screenCode: "M06",
      title: "Đơn Mua Hàng (PO)",
      href: "/mua-hang",
      desc: "Lập đơn mua vật tư, đối soát nhà cung cấp & nhập hóa đơn",
      icon: ClipboardCheck,
      stat: canViewFinance && kpi?.payablesTotal ? `Phải trả: ${formatVnd(kpi.payablesTotal)}` : undefined,
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M02",
      title: "Khách Hàng & Công Nợ",
      href: "/khach-hang",
      desc: "Hồ sơ đối tác, lịch sử hợp đồng & theo dõi thu hồi công nợ",
      icon: Building2,
      stat: canViewFinance && kpi?.receivablesTotal ? `Phải thu: ${formatVnd(kpi.receivablesTotal)}` : undefined,
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M03",
      title: "Báo Giá & Dự Toán",
      href: "/bao-gia",
      desc: "Lập bảng chào giá bóc tách theo quy cách vật tư & nhân công",
      icon: FileSpreadsheet,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      screenCode: "M04",
      title: "Bán Hàng Thương Mại",
      href: "/ban-hang",
      desc: "Quản lý đơn đặt hàng biển bảng, sản phẩm thương mại",
      icon: ShoppingCart,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      screenCode: "APP_FLEET",
      title: "Đội Xe & Vận Chuyển (Fleet Pro)",
      href: "/apps/doi-xe",
      desc: "Ứng dụng độc lập: Đối soát GPS Bình Minh, duyệt OT 4 khung, 3 khái niệm nhiên liệu và phân bổ chi phí",
      icon: Truck,
      badge: "Fleet Pro",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      screenCode: "M16",
      title: "Tài Chính & Sổ Quỹ",
      href: "/tai-chinh",
      desc: "Sổ quỹ tiền mặt, tài khoản ngân hàng & quản trị dòng tiền",
      icon: CircleDollarSign,
      stat: canViewFinance && kpi ? `Quỹ: ${formatVnd((kpi.cashBalance || 0) + (kpi.bankBalance || 0))}` : undefined,
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M16.1",
      title: "Phân Tích & Báo Cáo BI",
      href: "/phan-tich",
      desc: "Chỉ số kinh doanh, biên lợi nhuận & thống kê điều hành tổng thể",
      icon: BarChart3,
      badge: "BI",
      badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
    {
      screenCode: "M20",
      title: "Cài Đặt & Phân Quyền",
      href: "/cai-dat",
      desc: "Quản trị người dùng, vai trò động RBAC & tham số hệ thống",
      icon: Settings,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
  ];

  // Lọc chỉ hiển thị các phân hệ mà tài khoản hiện tại có quyền truy cập
  const accessibleModules = allModules.filter((m) => canAccessScreen(m.screenCode));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm">
          Phím Tắt Chức Năng Hệ Thống ({accessibleModules.length} phân hệ)
        </h3>
        <span className="text-xs text-slate-400">
          Hiển thị theo phân quyền tài khoản của bạn
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {accessibleModules.map((item) => {
          const Icon = item.icon;
          const isAlert = item.screenCode === "M08" && (kpi?.inventoryAlertsCount || 0) > 0;
          const chipClass = isAlert
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : item.badgeColor;
          return (
            <Link
              key={item.screenCode}
              href={item.href}
              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:border-slate-400 hover:shadow-sm transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition">
                    <Icon className="w-4 h-4" />
                  </div>
                  {item.badge ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  ) : item.stat ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${chipClass}`}>
                      {item.stat}
                    </span>
                  ) : null}
                </div>

                <h4 className="font-bold text-slate-900 text-xs mt-2.5 truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-slate-700 font-medium">
                <span>Vào phân hệ</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
