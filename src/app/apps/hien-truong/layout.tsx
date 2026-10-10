"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  HardHat,
  LayoutDashboard,
  Navigation,
  Camera,
  Mic,
  FileCheck,
  Package,
  Sparkles,
  ArrowLeft,
  Menu,
  X,
  Compass,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { AccessDenied } from "@/components/auth/AccessDenied";

interface NavItem {
  name: string;
  screenKey: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  permission?: string;
}

const FIELD_NAV_ITEMS: NavItem[] = [
  {
    name: "Ca Làm Hôm Nay",
    screenKey: "task_list",
    href: "/apps/hien-truong",
    icon: LayoutDashboard,
    badge: "Dashboard",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    name: "Bàn Điều Khiển 1 Chạm",
    screenKey: "action_hub",
    href: "/apps/hien-truong?screen=action_hub",
    icon: Sparkles,
    badge: "3 Tác vụ",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    name: "Điểm Danh GPS Vệ Tinh",
    screenKey: "gps_view",
    href: "/apps/hien-truong?screen=gps_view",
    icon: Navigation,
    badge: "< 500m",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    name: "Máy Ảnh GPS & Báo Cáo AI",
    screenKey: "camera_view",
    href: "/apps/hien-truong?screen=camera_view",
    icon: Camera,
    badge: "Ảnh & Voice AI",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  {
    name: "Ký Số Nghiệm Thu",
    screenKey: "signature_view",
    href: "/apps/hien-truong?screen=signature_view",
    icon: FileCheck,
    badge: "Ký tay",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
];

function FieldAppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentScreenParam = searchParams.get("screen") || "task_list";
  const { user, roles, can, hasRole } = useAuthorization();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isScreenActive = (item: NavItem) => {
    if (item.screenKey === "task_list") {
      return !searchParams.get("screen") || searchParams.get("screen") === "task_list";
    }
    return currentScreenParam === item.screenKey;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans text-slate-100">
      {/* ======================================================== */}
      {/* 1. SIDEBAR DỌC NỀN XANH ĐEN CÔNG NGHIỆP (DEEP INDUSTRIAL SLATE) */}
      {/* ======================================================== */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0c1322] text-slate-200 flex flex-col border-r border-[#19253d] transition-transform duration-200 ease-in-out print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header: Brand & App Title */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#19253d] bg-[#090f1b]">
          <Link href="/apps/hien-truong" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <HardHat className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                FIELD OPS PRO
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Hiện Trường & Thi Công 1 Chạm
              </div>
            </div>
          </Link>

          {/* Nút đóng menu trên mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Live Status Banner */}
        <div className="px-3.5 py-2.5 bg-[#091120] border-b border-[#152238] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Compass className="w-3.5 h-3.5 animate-spin" />
            <span>GPS Vệ Tinh Đang Bật</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Realtime
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2.5 py-3.5 space-y-1.5 overflow-y-auto">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tính Năng Hiện Trường
          </div>

          {FIELD_NAV_ITEMS.map((item) => {
            const active = isScreenActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.screenKey}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-600/20 border border-blue-400/30 translate-x-0.5"
                    : "text-slate-300 hover:bg-[#131f36] hover:text-white border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? "text-amber-300" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase border shrink-0 ${
                      active
                        ? "bg-white/20 text-white border-white/30"
                        : item.badgeColor || "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: User Info */}
        <div className="p-3 border-t border-[#19253d] bg-[#090f1b]">
          {/* User info box */}
          <div className="px-3 py-2 rounded-xl bg-[#0e172a] border border-[#1e2d4a] flex items-center justify-between shadow-2xs">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || "Kỹ thuật viên"}
              </div>
              <div className="text-[10px] text-blue-400 font-medium truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{roles[0]?.name || "Đội Thi Công"}</span>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-950 shrink-0" title="Trực tuyến" />
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 md:hidden print:hidden backdrop-blur-xs"
        />
      )}

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE CONTENT */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-950">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 bg-[#0c1322] text-white px-4 flex items-center justify-between border-b border-[#19253d] sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800 border border-slate-700 active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <HardHat className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-black text-xs uppercase tracking-wide">
                FIELD OPS
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full p-2.5 sm:p-5 print:p-0 print:m-0 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function FieldAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-semibold">
          Đang khởi tạo ứng dụng Hiện Trường...
        </div>
      }
    >
      <FieldAppLayoutContent>{children}</FieldAppLayoutContent>
    </React.Suspense>
  );
}
