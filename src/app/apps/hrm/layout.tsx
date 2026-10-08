"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  LayoutDashboard,
  CalendarCheck,
  CircleDollarSign,
  CalendarDays,
  FileSpreadsheet,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";

const HRM_NAV_ITEMS = [
  {
    name: "Tổng Quan",
    href: "/apps/hrm",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Hồ Sơ Nhân Sự",
    href: "/apps/hrm/nhan-su",
    icon: Users,
    exact: false,
    permission: "employee.read",
  },
  {
    name: "Chấm Công & Phân Ca",
    href: "/apps/hrm/cham-cong",
    icon: CalendarCheck,
    exact: false,
    permission: "attendance.read",
  },
  {
    name: "Bảng Tính Lương",
    href: "/apps/hrm/tinh-luong",
    icon: CircleDollarSign,
    exact: false,
    permission: "payroll.read",
  },
  {
    name: "Cấu Hình Ca & Lễ",
    href: "/apps/hrm/ca-va-le",
    icon: CalendarDays,
    exact: false,
    permission: "company_setting.read",
  },
  {
    name: "Chế Độ Lương & Quỹ Phép",
    href: "/apps/hrm/che-do-luong",
    icon: FileSpreadsheet,
    exact: false,
    permission: "salary.read",
  },
];

export default function HrmAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, roles, can, hasRole } = useAuthorization();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const visibleNavItems = HRM_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission as any) || hasRole("SUPER_ADMIN") || hasRole("ACCOUNTANT");
  });

  const isItemActive = (item: (typeof HRM_NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900">
      {/* ======================================================== */}
      {/* 1. SIDEBAR DỌC NỀN XANH ĐẬM (DEEP NAVY ENTERPRISE SIDEBAR) */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0c1a30] text-slate-200 flex flex-col border-r border-[#1a2e4c] transition-transform duration-200 ease-in-out print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header: Brand & App Title */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#1a2e4c]">
          <Link href="/apps/hrm" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#162744] border border-[#243d66] flex items-center justify-center text-slate-200">
              <Users className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-white">
                HRM SUITE
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Quản Trị Nhân Sự & Lương
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
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-[#183256] text-white font-semibold border-l-2 border-blue-400 shadow-xs"
                    : "text-slate-300 hover:bg-[#13233e] hover:text-white"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? "text-blue-300" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: User Info & Back to ERP */}
        <div className="p-3 border-t border-[#1a2e4c] space-y-2">
          {/* User info box */}
          <div className="px-3 py-2 rounded-lg bg-[#081324] border border-[#142642] flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || "Người dùng"}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate">
                {roles[0]?.name || "Thành viên"}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950 shrink-0" />
          </div>

          {/* Nút quay lại ERP Signage */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg bg-[#142642] hover:bg-[#1b3459] text-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
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
        <header className="md:hidden h-12 bg-[#0c1a30] text-white px-4 flex items-center justify-between border-b border-[#1a2e4c] print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-xs uppercase tracking-wide">
              HRM SUITE
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

        {/* Nội dung trang */}
        <main className="flex-1 w-full p-3 sm:p-5 print:p-0 print:m-0">
          {children}
        </main>
      </div>
    </div>
  );
}
