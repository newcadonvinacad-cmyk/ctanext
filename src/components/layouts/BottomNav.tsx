"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, CheckSquare, FileText, User } from "lucide-react";

import { useAuthorization } from "@/hooks/use-authorization";

interface BottomNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  screenCode?: string;
  isActive: (pathname: string, tab: string | null) => boolean;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    title: "Hôm nay",
    href: "/hien-truong",
    screenCode: "M14",
    icon: CalendarDays,
    isActive: (pathname) => pathname === "/hien-truong" || pathname === "/",
  },
  {
    title: "Công việc",
    href: "/cong-viec",
    screenCode: "M10",
    icon: CheckSquare,
    isActive: (pathname, tab) =>
      (pathname === "/cong-viec" && tab !== "daily") ||
      pathname.startsWith("/du-an"),
  },
  {
    title: "Báo cáo",
    href: "/cong-viec?tab=daily",
    screenCode: "M10",
    icon: FileText,
    isActive: (pathname, tab) =>
      pathname === "/cong-viec" && tab === "daily",
  },
  {
    title: "Cá nhân",
    href: "/cai-dat",
    screenCode: "M20",
    icon: User,
    isActive: (pathname) => pathname === "/cai-dat",
  },
];

function BottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { canAccessScreen } = useAuthorization();

  const visibleItems = BOTTOM_NAV_ITEMS.filter(
    (item) => !item.screenCode || canAccessScreen(item.screenCode)
  );

  if (visibleItems.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-40 flex items-center justify-around px-2 shadow-lg select-none">
      {visibleItems.map((item) => {
        const active = item.isActive(pathname, currentTab);
        const Icon = item.icon;

        return (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 transition",
              active ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg transition",
                active && "bg-blue-50 text-blue-600"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] leading-tight mt-0.5 tracking-tight">
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  return (
    <React.Suspense fallback={<div className="h-14 md:hidden" />}>
      <BottomNavContent />
    </React.Suspense>
  );
}
