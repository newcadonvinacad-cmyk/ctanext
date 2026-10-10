"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Truck,
  LayoutDashboard,
  CalendarDays,
  Navigation,
  Clock,
  Fuel,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";

const FLEET_NAV_ITEMS = [
  {
    name: "Tổng Quan",
    href: "/apps/doi-xe",
    icon: LayoutDashboard,
    exact: true,
    badge: "Dashboard",
  },
  {
    name: "Điều Xe & Lịch Tuần",
    href: "/apps/doi-xe/dieu-xe",
    icon: CalendarDays,
    exact: false,
    badge: "Lịch tuần",
  },
  {
    name: "Nhật Ký & Đối Soát GPS",
    href: "/apps/doi-xe/nhat-ky",
    icon: Navigation,
    exact: false,
    badge: "Bình Minh",
  },
  {
    name: "Duyệt Tăng Ca (OT)",
    href: "/apps/doi-xe/tang-ca",
    icon: Clock,
    exact: false,
    badge: "4 Khung",
  },
  {
    name: "Chi Phí & Đổ Dầu",
    href: "/apps/doi-xe/chi-phi",
    icon: Fuel,
    exact: false,
    badge: "Sổ dầu",
  },
  {
    name: "Sổ Sự Cố & Vấn Đề",
    href: "/apps/doi-xe/van-de",
    icon: AlertTriangle,
    exact: false,
    badge: "Ngoại lệ",
  },
  {
    name: "Hồ Sơ Xe & Bảo Dưỡng",
    href: "/apps/doi-xe/ho-so-lich",
    icon: ShieldCheck,
    exact: false,
    badge: "Lịch hạn",
  },
  {
    name: "Báo Cáo & Phân Bổ",
    href: "/apps/doi-xe/bao-cao",
    icon: BarChart3,
    exact: false,
    badge: "Dự án",
  },
];

export default function FleetAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, roles } = useAuthorization();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isItemActive = (item: (typeof FLEET_NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const currentItem = FLEET_NAV_ITEMS.find(isItemActive) || FLEET_NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900">
      {/* ======================================================== */}
      {/* SIDEBAR DỌC MÀU XANH LÁ (DEEP EMERALD / FOREST ENTERPRISE) */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-[#072418] text-slate-200 flex flex-col border-r border-[#113a27] transition-transform duration-200 ease-in-out print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header: Brand & App Title */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#113a27] bg-[#051c13]">
          <Link href="/apps/doi-xe" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0f422b] border border-[#1b6140] flex items-center justify-center text-emerald-300 shadow-sm shadow-emerald-950/40">
              <Truck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase text-white">
                  SIGNAGE FLEET
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700/60">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-emerald-400/90 font-medium">
                Đội Xe & Vận Chuyển
              </div>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-emerald-300/80 hover:text-white rounded-lg hover:bg-[#0c3321]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator Bar */}
        <div className="px-4 py-2 bg-[#061f15] border-b border-[#0f3423] flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-300/90 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Đội xe hoạt động: 2 xe
          </span>
          <span className="text-[10px] text-emerald-400/70">GPS Online</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">
            Nghiệp Vụ Vận Hành
          </div>

          {FLEET_NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-all ${
                  active
                    ? "bg-[#134931] text-white font-semibold border-l-4 border-emerald-400 shadow-sm shadow-emerald-950/50"
                    : "text-emerald-100/80 hover:bg-[#0c3321] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? "text-emerald-300" : "text-emerald-400/70"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      active
                        ? "bg-emerald-800 text-emerald-200"
                        : "bg-[#092b1d] text-emerald-400/70"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: User Info & Back to ERP */}
        <div className="p-3 border-t border-[#113a27] bg-[#051c13] space-y-2">
          {/* User info box */}
          <div className="px-3 py-2 rounded-lg bg-[#041910] border border-[#0e3020] flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || "Admin Điều Phối Xe"}
              </div>
              <div className="text-[10px] text-emerald-400/80 font-medium truncate">
                {roles[0]?.name || "Quản trị Đội xe"}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950 shrink-0" />
          </div>

          {/* Nút quay lại ERP Signage */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg bg-[#0d3623] hover:bg-[#134931] text-emerald-100 transition border border-[#175237]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-300" />
            <span>Quay Lại ERP</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden print:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* MAIN WORKSPACE CONTENT */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 bg-[#072418] text-white px-4 flex items-center justify-between border-b border-[#113a27] print:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-[#0c3321]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0f422b] flex items-center justify-center text-emerald-300">
                <Truck className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs uppercase tracking-wide">
                ĐỘI XE & VẬN CHUYỂN
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-1 font-semibold bg-[#0d3623] px-2.5 py-1 rounded-md border border-[#175237]"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>ERP</span>
          </Link>
        </header>

        {/* Breadcrumb Bar */}
        <div className="hidden md:flex h-11 bg-white border-b border-slate-200 px-6 items-center justify-between text-xs text-slate-600 print:hidden">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-emerald-700 transition">
              Trang chủ ERP
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/apps/doi-xe" className="hover:text-emerald-700 font-medium">
              Đội xe & Vận chuyển
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-emerald-800">{currentItem.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Thiết kế chuẩn SIGNAGE ERP 2026
            </span>
          </div>
        </div>

        {/* Nội dung trang nghiệp vụ */}
        <main className="flex-1 w-full p-4 sm:p-6 print:p-0 print:m-0 bg-slate-50/70">
          {children}
        </main>
      </div>
    </div>
  );
}
