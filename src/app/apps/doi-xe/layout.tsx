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
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { AccessDenied } from "@/components/auth/AccessDenied";

const FLEET_NAV_ITEMS = [
  {
    name: "Tổng Quan",
    href: "/apps/doi-xe",
    icon: LayoutDashboard,
    exact: true,
    permission: "trip.read",
  },
  {
    name: "Điều Xe & Lịch Tuần",
    href: "/apps/doi-xe/dieu-xe",
    icon: CalendarDays,
    exact: false,
    badge: "Lịch tuần",
    permission: "trip.create",
  },
  {
    name: "Nhật Ký & Đối Soát GPS",
    href: "/apps/doi-xe/nhat-ky",
    icon: Navigation,
    exact: false,
    badge: "Bình Minh",
    permission: "trip.read",
  },
  {
    name: "Duyệt Tăng Ca (OT)",
    href: "/apps/doi-xe/tang-ca",
    icon: Clock,
    exact: false,
    badge: "4 Khung",
    permission: "trip.read",
  },
  {
    name: "Chi Phí & Đổ Dầu",
    href: "/apps/doi-xe/chi-phi",
    icon: Fuel,
    exact: false,
    badge: "Sổ dầu",
    permission: "trip.read",
  },
  {
    name: "Sổ Sự Cố & Vấn Đề",
    href: "/apps/doi-xe/van-de",
    icon: AlertTriangle,
    exact: false,
    badge: "Ngoại lệ",
    permission: "trip.read",
  },
  {
    name: "Hồ Sơ Xe & Bảo Dưỡng",
    href: "/apps/doi-xe/ho-so-lich",
    icon: ShieldCheck,
    exact: false,
    badge: "Lịch hạn",
    permission: "trip.read",
  },
  {
    name: "Báo Cáo & Phân Bổ",
    href: "/apps/doi-xe/bao-cao",
    icon: BarChart3,
    exact: false,
    badge: "Dự án",
    permission: "trip.read",
  },
];

export default function FleetAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, roles, can, hasRole } = useAuthorization();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const normalizedPath = (pathname || "").replace(/\/$/, "") || "/";

  const visibleNavItems = FLEET_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission as any) || hasRole("SUPER_ADMIN");
  });

  const currentSubItem = FLEET_NAV_ITEMS.find((item) => {
    const itemPath = item.href.replace(/\/$/, "");
    if (item.exact) return normalizedPath === itemPath;
    return normalizedPath === itemPath || normalizedPath.startsWith(itemPath + "/");
  });

  const isSubRouteAllowed =
    !currentSubItem?.permission ||
    can(currentSubItem.permission as any) ||
    hasRole("SUPER_ADMIN");

  const isItemActive = (item: (typeof FLEET_NAV_ITEMS)[0]) => {
    const itemPath = item.href.replace(/\/$/, "");
    if (item.exact) return normalizedPath === itemPath;
    return normalizedPath === itemPath || normalizedPath.startsWith(itemPath + "/");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900">
      {/* ======================================================== */}
      {/* 1. SIDEBAR DỌC MÀU XANH LÁ (ENTERPRISE EMERALD SIDEBAR) */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-[#061d12] text-slate-200 flex flex-col border-r border-[#0f3823] transition-transform duration-200 ease-in-out print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header: Brand & App Title */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#0f3823]">
          <Link href="/apps/doi-xe" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0d2e1e] border border-[#185336] flex items-center justify-center text-emerald-300">
              <Truck className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                FLEET SUITE
                <span className="text-[9px] px-1 py-0.2 bg-emerald-800 text-emerald-300 font-bold rounded">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">
                Đội Xe & Vận Chuyển
              </div>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
            Phân Hệ Nghiệp Vụ
          </div>

          {visibleNavItems.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-[#0f3d26] text-white font-semibold border-l-2 border-emerald-400 shadow-xs"
                    : "text-emerald-100/70 hover:bg-[#0a281a] hover:text-white"
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
                        ? "bg-emerald-800 text-emerald-100"
                        : "bg-[#04160d] text-emerald-400/80"
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
        <div className="p-3 border-t border-[#0f3823] space-y-2">
          {/* User info box */}
          <div className="px-3 py-2 rounded-lg bg-[#04160d] border border-[#0b2b1b] flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || "Người dùng"}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium truncate">
                {roles[0]?.name || "Điều hành Đội xe"}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950 shrink-0" />
          </div>

          {/* Nút quay lại ERP Signage */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg bg-[#0d2e1e] hover:bg-[#12422b] text-emerald-100 transition border border-[#164d32]"
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
      {/* 2. MAIN WORKSPACE CONTENT */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-12 bg-[#061d12] text-white px-4 flex items-center justify-between border-b border-[#0f3823] print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-xs uppercase tracking-wide">
              FLEET SUITE
            </span>
          </div>

          <Link
            href="/"
            className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>ERP</span>
          </Link>
        </header>

        {/* Nội dung trang nghiệp vụ */}
        <main className="flex-1 w-full p-3 sm:p-5 print:p-0 print:m-0">
          {!isSubRouteAllowed ? (
            <AccessDenied
              screenName={currentSubItem?.name}
              requiredPermission={currentSubItem?.permission}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
