"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, toast } from "@/components/ui";
import {
  LayoutDashboard,
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
  Sparkles,
  Compass,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  BarChart3,
  LayoutGrid,
  FolderKanban,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { authClient } from "@/lib/auth-client";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  screenCode: string;
}

export interface NavGroup {
  id: string;
  groupTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

/**
 * Bản đồ điều hướng chuẩn công nghiệp ngành Quảng Cáo & Nội thất
 * Đồng bộ theo phong cách Mockup AI mới:
 * - Nhóm phân cấp rõ ràng
 * - Bỏ triệt để các badge đếm số theo yêu cầu
 * - Header Logo S tím than đậm cao cấp
 * - Tích hợp ô Tìm chức năng trực quan
 */
export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: "overview",
    groupTitle: "TỔNG QUAN",
    icon: LayoutDashboard,
    items: [
      {
        title: "Bàn làm việc & KPI",
        href: "/",
        screenCode: "M01",
        icon: TrendingUp,
      },
      {
        title: "Trợ lý AI Signage",
        href: "/ai-assistant",
        screenCode: "M19",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "sales",
    groupTitle: "KINH DOANH",
    icon: Users,
    items: [
      {
        title: "Khách hàng & Leads",
        href: "/khach-hang",
        screenCode: "M02",
        icon: Users,
      },
      {
        title: "Khảo sát mặt bằng",
        href: "/khao-sat",
        screenCode: "M02.1",
        icon: Compass,
      },
      {
        title: "Thiết kế chuẩn Nippon",
        href: "/du-an/thiet-ke-quy-chuan",
        screenCode: "M02.2",
        icon: Sparkles,
      },
      {
        title: "Báo giá",
        href: "/bao-gia",
        screenCode: "M03",
        icon: FileSpreadsheet,
      },
      {
        title: "Đơn hàng & HĐ điện tử",
        href: "/ban-hang",
        screenCode: "M04",
        icon: ShoppingCart,
      },
    ],
  },
  {
    id: "inventory",
    groupTitle: "KHO & MUA HÀNG",
    icon: Boxes,
    items: [
      {
        title: "Danh mục vật tư",
        href: "/vat-tu",
        screenCode: "M07",
        icon: Boxes,
      },
      {
        title: "Quản trị đa kho",
        href: "/kho",
        screenCode: "M08",
        icon: Package,
      },
      {
        title: "Phiếu nhập - xuất - chuyển",
        href: "/kho/nhap-xuat",
        screenCode: "M09",
        icon: ArrowLeftRight,
      },
      {
        title: "Nhà cung cấp & công nợ",
        href: "/nha-cung-cap",
        screenCode: "M05",
        icon: Building2,
      },
      {
        title: "Đơn mua hàng",
        href: "/mua-hang",
        screenCode: "M06",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: "production",
    groupTitle: "SẢN XUẤT & THI CÔNG",
    icon: HardHat,
    items: [
      {
        title: "Sản xuất",
        href: "/san-xuat",
        screenCode: "M13.1",
        icon: HardHat,
      },
      {
        title: "Dự án & Tiến độ WBS",
        href: "/du-an",
        screenCode: "M11",
        icon: HardHat,
      },
      {
        title: "Nhiệm vụ & Phê duyệt",
        href: "/cong-viec",
        screenCode: "M10",
        icon: CheckSquare,
      },
    ],
  },
  {
    id: "finance_analytics",
    groupTitle: "TÀI CHÍNH & PHÂN TÍCH",
    icon: CircleDollarSign,
    items: [
      {
        title: "Tài chính & Sổ quỹ",
        href: "/tai-chinh",
        screenCode: "M16",
        icon: CircleDollarSign,
      },
      {
        title: "Phân tích BI",
        href: "/phan-tich",
        screenCode: "M16.1",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "apps",
    groupTitle: "ỨNG DỤNG MỞ RỘNG",
    icon: LayoutGrid,
    items: [
      {
        title: "Hiện trường 1 chạm (Field Ops)",
        href: "/apps/hien-truong",
        screenCode: "APP_FIELD",
        icon: HardHat,
      },
      {
        title: "HRM - Nhân sự & Lương",
        href: "/apps/hrm",
        screenCode: "APP_HRM",
        icon: Users,
      },
      {
        title: "Tài liệu nội bộ & Drive",
        href: "/apps/tai-lieu",
        screenCode: "APP_DOCS",
        icon: FolderKanban,
      },
      {
        title: "Đội xe & Vận chuyển (Fleet)",
        href: "/apps/doi-xe",
        screenCode: "APP_FLEET",
        icon: Truck,
      },
    ],
  },
  {
    id: "system",
    groupTitle: "CẤU HÌNH & HỆ THỐNG",
    icon: Settings,
    items: [
      {
        title: "Cài Đặt & Phân Quyền (RBAC)",
        href: "/cai-dat",
        screenCode: "M20",
        icon: Settings,
      },
    ],
  },
];

const ALL_NAV_HREFS = NAVIGATION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.href)
);

function checkIsNavActive(itemHref: string, pathname: string): boolean {
  if (pathname === itemHref) return true;
  if (itemHref === "/") return false;

  if (pathname.startsWith(itemHref + "/")) {
    const hasMoreSpecific = ALL_NAV_HREFS.some(
      (other) =>
        other !== itemHref &&
        other.length > itemHref.length &&
        (pathname === other || pathname.startsWith(other + "/"))
    );
    return !hasMoreSpecific;
  }
  return false;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, canAccessScreen } = useAuthorization();
  const [productionReady, setProductionReady] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    fetch("/api/production-orders/readiness")
      .then((r) => (r.ok ? r.json() : { ready: false }))
      .then((d) => setProductionReady(Boolean(d.ready)))
      .catch(() => setProductionReady(false));
  }, []);

  const visibleScreen = React.useCallback(
    (item: NavItem) =>
      (item.href !== "/san-xuat" || productionReady) && canAccessScreen(item.screenCode),
    [canAccessScreen, productionReady]
  );

  // Xác định nhóm lớn chứa trang đang active
  const computeActiveGroupId = React.useCallback(
    (path: string) => {
      const activeGroup = NAVIGATION_GROUPS.find((group) => {
        const visible = group.items.filter(visibleScreen);
        return visible.some((item) => checkIsNavActive(item.href, path));
      });
      return activeGroup ? activeGroup.id : "overview";
    },
    [visibleScreen]
  );

  // Set các nhóm đang mở (hỗ trợ nhiều nhóm mở cùng lúc hoặc accordion)
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const active = computeActiveGroupId(pathname);
    return {
      overview: true,
      sales: true,
      inventory: true,
      [active]: true,
    };
  });

  // Tự động mở nhóm khi đường dẫn thay đổi
  React.useEffect(() => {
    const currentActiveGroup = computeActiveGroupId(pathname);
    if (currentActiveGroup) {
      setOpenGroups((prev) => ({ ...prev, [currentActiveGroup]: true }));
    }
  }, [pathname, computeActiveGroupId]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Flyout khi sidebar thu gọn
  const [flyoutGroupId, setFlyoutGroupId] = React.useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = React.useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const flyoutCloseTimer = React.useRef<number | null>(null);

  const openFlyout = React.useCallback(
    (groupId: string, anchorRect: { right: number; top: number }, itemCount: number) => {
      if (flyoutCloseTimer.current) {
        window.clearTimeout(flyoutCloseTimer.current);
        flyoutCloseTimer.current = null;
      }
      const estimatedHeight = 44 + itemCount * 38 + 12;
      const top = Math.max(
        8,
        Math.min(anchorRect.top - 4, window.innerHeight - estimatedHeight)
      );
      setFlyoutPos({ left: anchorRect.right + 10, top });
      setFlyoutGroupId(groupId);
    },
    []
  );

  const scheduleFlyoutClose = React.useCallback(() => {
    if (flyoutCloseTimer.current) window.clearTimeout(flyoutCloseTimer.current);
    flyoutCloseTimer.current = window.setTimeout(() => setFlyoutGroupId(null), 120);
  }, []);

  React.useEffect(() => {
    return () => {
      if (flyoutCloseTimer.current) window.clearTimeout(flyoutCloseTimer.current);
    };
  }, []);

  React.useEffect(() => {
    setFlyoutGroupId(null);
  }, [collapsed, pathname]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      toast.success("Đã đăng xuất khỏi hệ thống.");
    } catch {
      // Ignored
    } finally {
      window.location.href = "/login";
    }
  };

  // Avatar viết tắt 2 ký tự đầu
  const userInitials = React.useMemo(() => {
    if (!user?.name) return "BA";
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user]);

  // Danh sách menu tìm kiếm được
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const results: Array<NavItem & { groupTitle: string }> = [];
    NAVIGATION_GROUPS.forEach((group) => {
      const visible = group.items.filter(visibleScreen);
      visible.forEach((item) => {
        if (
          item.title.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q)
        ) {
          results.push({ ...item, groupTitle: group.groupTitle });
        }
      });
    });
    return results;
  }, [searchQuery, visibleScreen]);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-white text-slate-700 border-r border-slate-200/80 transition-[width] duration-300 ease-in-out z-30 select-none overflow-hidden",
        collapsed ? "w-[76px]" : "w-[276px]",
        className
      )}
    >
      {/* 1. HEADER & LOGO BRAND CHUẨN MOCKUP */}
      <div
        className={cn(
          "h-16 flex items-center shrink-0 border-b border-slate-100",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Mở rộng thanh điều hướng"
            className="w-11 h-11 rounded-2xl bg-[#0b0c3f] text-white flex items-center justify-center font-black text-2xl shadow-md hover:opacity-90 transition-transform active:scale-95"
          >
            S
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link
              href="/"
              onClick={onNavigate}
              className="flex items-center gap-3 min-w-0 group"
            >
              {/* Logo S vuông bo góc đậm */}
              <div className="w-11 h-11 rounded-2xl bg-[#0b0c3f] text-white flex items-center justify-center font-black text-2xl shadow-sm border border-[#0b0c3f]/20 shrink-0 group-hover:scale-102 transition-transform">
                S
              </div>
              <div className="flex flex-col truncate leading-tight">
                <span className="font-extrabold text-[15px] tracking-tight text-[#0e1726]">
                  Signage ERP
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  signage-erp.vn
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="Thu gọn menu"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. THANH TÌM KIẾM CHỨC NĂNG (ẨN KHI COLLAPSED) */}
      {!collapsed && (
        <div className="px-3.5 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chức năng..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0b0c3f] focus:bg-white transition-all font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. DANH SÁCH MENU ĐIỀU HƯỚNG */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 space-y-3 scrollbar-thin"
        onScroll={() => setFlyoutGroupId(null)}
      >
        {collapsed ? (
          /* CHẾ ĐỘ THU GỌN: CHỈ HIỆN ICON TRÒN / VUÔNG BO GÓC */
          <div className="space-y-1.5">
            {NAVIGATION_GROUPS.map((group) => {
              const visibleItems = group.items.filter(visibleScreen);
              if (visibleItems.length === 0) return null;

              const GroupIcon = group.icon;
              const hasActiveChild = visibleItems.some((item) =>
                checkIsNavActive(item.href, pathname)
              );

              if (visibleItems.length === 1) {
                const singleItem = visibleItems[0];
                const isActive = checkIsNavActive(singleItem.href, pathname);
                const ItemIcon = singleItem.icon || GroupIcon;
                return (
                  <Link
                    key={group.id}
                    href={singleItem.href}
                    onClick={onNavigate}
                    aria-label={singleItem.title}
                    className={cn(
                      "relative mx-auto flex items-center justify-center w-11 h-11 rounded-xl transition-all",
                      isActive
                        ? "bg-[#0b0c3f] text-white shadow-md font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    )}
                  >
                    <ItemIcon className="w-[18px] h-[18px] shrink-0" />
                  </Link>
                );
              }

              return (
                <div
                  key={group.id}
                  onMouseLeave={scheduleFlyoutClose}
                  className="relative"
                >
                  <button
                    type="button"
                    onMouseEnter={(e) =>
                      openFlyout(group.id, e.currentTarget.getBoundingClientRect(), visibleItems.length)
                    }
                    onClick={(e) =>
                      flyoutGroupId === group.id
                        ? setFlyoutGroupId(null)
                        : openFlyout(group.id, e.currentTarget.getBoundingClientRect(), visibleItems.length)
                    }
                    title={group.groupTitle}
                    className={cn(
                      "relative mx-auto flex items-center justify-center w-11 h-11 rounded-xl transition-all",
                      hasActiveChild || flyoutGroupId === group.id
                        ? "bg-[#0b0c3f] text-white shadow-md"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    )}
                  >
                    <GroupIcon className="w-[18px] h-[18px] shrink-0" />
                  </button>

                  {flyoutGroupId === group.id &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div
                        onMouseEnter={() => setFlyoutGroupId(group.id)}
                        onMouseLeave={scheduleFlyoutClose}
                        className="fixed z-[60] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5"
                        style={{ left: flyoutPos.left, top: flyoutPos.top }}
                      >
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
                          {group.groupTitle}
                        </div>
                        <div className="max-h-[55vh] overflow-y-auto space-y-0.5">
                          {visibleItems.map((item) => {
                            const isActive = checkIsNavActive(item.href, pathname);
                            const SubIcon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setFlyoutGroupId(null);
                                  onNavigate?.();
                                }}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all",
                                  isActive
                                    ? "bg-[#0b0c3f] text-white font-semibold shadow-md"
                                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                                )}
                              >
                                <SubIcon className="w-4 h-4 shrink-0" />
                                <span className="truncate flex-1">{item.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>,
                      document.body
                    )}
                </div>
              );
            })}
          </div>
        ) : searchResults ? (
          /* ĐANG TÌM KIẾM: HIỆN DANH SÁCH PHẲNG CÁC KẾT QUẢ KHỚP */
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kết quả tìm kiếm ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Không tìm thấy chức năng phù hợp.
              </div>
            ) : (
              searchResults.map((item) => {
                const isActive = checkIsNavActive(item.href, pathname);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setSearchQuery("");
                      onNavigate?.();
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                      isActive
                        ? "bg-[#0b0c3f] text-white font-semibold shadow-sm"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                    )}
                  >
                    <ItemIcon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900"
                      )}
                    />
                    <div className="flex flex-col truncate min-w-0">
                      <span className="truncate font-semibold">{item.title}</span>
                      <span
                        className={cn(
                          "text-[10px] truncate",
                          isActive ? "text-slate-300" : "text-slate-400"
                        )}
                      >
                        {item.groupTitle}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        ) : (
          /* CHẾ ĐỘ MẶC ĐỊNH: PHÂN NHÓM CHUẨN MOCKUP VÀ BỎ TRIỆT ĐỂ SỐ BADGE */
          NAVIGATION_GROUPS.map((group) => {
            const visibleItems = group.items.filter(visibleScreen);
            if (visibleItems.length === 0) return null;

            const isOpen = openGroups[group.id] !== false;

            return (
              <div key={group.id} className="space-y-1">
                {/* Tiêu đề nhóm lớn (Có mũi tên thu gọn / mở rộng) */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors select-none group"
                >
                  <span className="truncate">{group.groupTitle}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                  )}
                </button>

                {/* Các mục menu con */}
                {isOpen && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = checkIsNavActive(item.href, pathname);
                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group",
                            isActive
                              ? "bg-[#0b0c3f] text-white font-semibold shadow-sm"
                              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                          )}
                        >
                          <ItemIcon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive ? "text-white" : "text-slate-600 group-hover:text-slate-900"
                            )}
                          />
                          <span className="truncate flex-1 tracking-tight">
                            {item.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. FOOTER: PROFILE CARD & THU GỌN / ĐĂNG XUẤT */}
      <div className="p-3 shrink-0 border-t border-slate-100 bg-white">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip content={user?.name || "Ban Giám Đốc"} position="right" delayMs={50}>
              <div className="w-10 h-10 rounded-full bg-slate-200/90 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {userInitials}
              </div>
            </Tooltip>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Mở rộng menu"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <ChevronsRight className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200/90 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {userInitials}
              </div>
              <div className="flex flex-col truncate min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {user?.name || "Ban Giám Đốc"}
                </span>
                <span className="text-[11px] text-slate-400 font-normal truncate">
                  {user?.email === "admin@signage.vn" || user?.email?.includes("admin") ? "Super Admin" : "Quản trị viên"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 px-0.5">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors font-semibold"
                title="Thu gọn menu"
              >
                <ChevronsLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Thu gọn</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 transition-colors font-bold"
                title="Đăng xuất khỏi tài khoản"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
