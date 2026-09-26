"use client";

import * as React from "react";
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
  CalendarCheck,
  Award,
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
  EyeOff,
  TrendingUp,
} from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";
import { authClient } from "@/lib/auth-client";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  screenCode: string;
  badge?: string | number;
}

export interface NavGroup {
  id: string;
  groupTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

/**
 * Bản đồ điều hướng chuẩn công nghiệp ngành Quảng Cáo & Nội thất
 * 6 Nhóm chức năng logic, có icon đại diện và hỗ trợ Accordion xổ ra
 */
export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: "overview",
    groupTitle: "TỔNG QUAN & ĐIỀU HÀNH",
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
        badge: "AI",
      },
    ],
  },
  {
    id: "sales",
    groupTitle: "KINH DOANH & KHÁCH HÀNG",
    icon: Users,
    items: [
      {
        title: "Khách hàng & Công nợ",
        href: "/khach-hang",
        screenCode: "M02",
        icon: Users,
      },
      {
        title: "Báo giá & Dự toán",
        href: "/bao-gia",
        screenCode: "M03",
        icon: FileSpreadsheet,
      },
      {
        title: "Bán hàng thương mại",
        href: "/ban-hang",
        screenCode: "M04",
        icon: ShoppingCart,
      },
    ],
  },
  {
    id: "inventory",
    groupTitle: "KHO & VẬT TƯ MUA HÀNG",
    icon: Boxes,
    items: [
      {
        title: "Danh mục Vật tư & Quy cách",
        href: "/vat-tu",
        screenCode: "M07",
        icon: Boxes,
      },
      {
        title: "Quản trị Đa kho",
        href: "/kho",
        screenCode: "M08",
        icon: Package,
      },
      {
        title: "Phiếu Nhập - Xuất - Chuyển",
        href: "/kho/nhap-xuat",
        screenCode: "M09",
        icon: ArrowLeftRight,
      },
      {
        title: "Nhà cung cấp & Công nợ",
        href: "/nha-cung-cap",
        screenCode: "M05",
        icon: Building2,
      },
      {
        title: "Đơn mua hàng (PO)",
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
        title: "Dự án & Tiến độ WBS",
        href: "/du-an",
        screenCode: "M11",
        icon: HardHat,
      },
      {
        title: "Trung tâm Việc làm",
        href: "/cong-viec",
        screenCode: "M10",
        icon: CheckSquare,
      },
      {
        title: "Hiện trường 1 chạm (GPS)",
        href: "/hien-truong",
        screenCode: "M14",
        icon: MapPin,
        badge: "GPS",
      },
      {
        title: "Đội xe & Vận chuyển",
        href: "/van-chuyen",
        screenCode: "M15",
        icon: Truck,
      },
    ],
  },
  {
    id: "finance_hr",
    groupTitle: "TÀI CHÍNH & NHÂN SỰ",
    icon: CircleDollarSign,
    items: [
      {
        title: "Tài chính & Sổ quỹ",
        href: "/tai-chinh",
        screenCode: "M16",
        icon: CircleDollarSign,
      },
      {
        title: "Hồ sơ & Chấm công",
        href: "/nhan-su",
        screenCode: "M17",
        icon: CalendarCheck,
      },
      {
        title: "Đánh giá KPI & Duyệt lương",
        href: "/nhan-su/danh-gia-luong",
        screenCode: "M18",
        icon: Award,
        badge: "AI",
      },
    ],
  },
  {
    id: "system",
    groupTitle: "CẤU HÌNH & HỆ THỐNG",
    icon: Settings,
    items: [
      {
        title: "Quản trị người dùng & RBAC",
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

  // State mở accordion: CHỈ 1 MỤC LỚN ĐƯỢC XỔ RA TẠI 1 THỜI ĐIỂM
  const [openGroupId, setOpenGroupId] = React.useState<string | null>(null);

  // Tự động mở nhóm có trang đang active khi tải trang hoặc khi đổi URL
  React.useEffect(() => {
    const activeGroup = NAVIGATION_GROUPS.find((group) => {
      const visible = group.items.filter((item) => canAccessScreen(item.screenCode));
      // Nếu chỉ có 1 item duy nhất thì nó đã được thay thế ra ngoài, không cần mở accordion
      if (visible.length <= 1) return false;
      return visible.some((item) => checkIsNavActive(item.href, pathname));
    });

    if (activeGroup) {
      setOpenGroupId(activeGroup.id);
    }
  }, [pathname, canAccessScreen]);

  const toggleGroup = (groupId: string) => {
    // Chỉ 1 phần được xổ ra 1 lúc: nếu đang mở chính nó thì đóng lại, ngược lại mở nhóm này và đóng nhóm khác
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      toast.success("Đã đăng xuất khỏi hệ thống.");
    } catch (e) {
      // Ignored
    } finally {
      window.location.href = "/login";
    }
  };

  // Avatar viết tắt 2 ký tự đầu
  const userInitials = React.useMemo(() => {
    if (!user?.name) return "AD";
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-white text-slate-700 border-r border-slate-200 transition-all duration-200 z-30 select-none",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* 1. Header & Logo chuẩn Benchmark UI */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-100 shrink-0">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0 group"
        >
          {/* Logo đỏ nổi bật */}
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            SE
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate leading-tight">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 group-hover:text-red-600 transition-colors">
                SIGNAGE ERP
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                signage-erp.vn
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Thu gọn menu"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Navigation Items: Accordion có Icon, Xổ gọn, Thay thế mục đơn */}
      <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1.5 scrollbar-thin">
        {NAVIGATION_GROUPS.map((group) => {
          // Lọc danh sách mục con người dùng có quyền xem
          const visibleItems = group.items.filter((item) =>
            canAccessScreen(item.screenCode)
          );

          // Nếu không có mục nào được cấp quyền: Ẩn hoàn toàn nhóm
          if (visibleItems.length === 0) return null;

          const GroupIcon = group.icon;

          // ==============================================================
          // ĐẶC BIỆT: NẾU DO PHÂN QUYỀN CHỈ CÒN ĐÚNG 1 MỤC DUY NHẤT:
          // HIỆN THAY THẾ RA NGOÀI LUÔN, KHÔNG CẦN ACCORDION!
          // ==============================================================
          if (visibleItems.length === 1) {
            const singleItem = visibleItems[0];
            const isActive = checkIsNavActive(singleItem.href, pathname);
            const ItemIcon = singleItem.icon || GroupIcon;

            const singleNavLink = (
              <Link
                href={singleItem.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors relative group",
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal",
                  collapsed && "justify-center px-0 py-2.5"
                )}
              >
                <ItemIcon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-900"
                  )}
                />

                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{singleItem.title}</span>
                    {singleItem.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                          isActive
                            ? "bg-slate-200 text-slate-800"
                            : "bg-blue-50 text-blue-600 border border-blue-200"
                        )}
                      >
                        {singleItem.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            return collapsed ? (
              <Tooltip
                key={group.id}
                content={singleItem.title}
                position="right"
                delayMs={50}
              >
                {singleNavLink}
              </Tooltip>
            ) : (
              <div key={group.id}>{singleNavLink}</div>
            );
          }

          // ==============================================================
          // NẾU CÓ TỪ 2 MỤC TRỞ LÊN: RENDER DẠNG ACCORDION CÓ ICON & XỔ RA
          // ==============================================================
          const isOpen = openGroupId === group.id;
          const hasActiveChild = visibleItems.some((item) =>
            checkIsNavActive(item.href, pathname)
          );

          if (collapsed) {
            // Khi thu gọn sidebar: Hiển thị icon nhóm kèm Tooltip
            return (
              <Tooltip
                key={group.id}
                content={`${group.groupTitle} (${visibleItems.length} mục)`}
                position="right"
                delayMs={50}
              >
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className={cn(
                    "w-full flex items-center justify-center py-2.5 rounded-lg text-xs transition-colors",
                    hasActiveChild
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <GroupIcon className="w-4 h-4 shrink-0" />
                </button>
              </Tooltip>
            );
          }

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Nút bấm tiêu đề nhóm lớn (Có icon, tên nhóm, mũi tên xổ) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors group",
                  hasActiveChild
                    ? "text-slate-900 font-bold bg-slate-50/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <GroupIcon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      hasActiveChild ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"
                    )}
                  />
                  <span className="truncate text-[11px] font-bold tracking-tight">
                    {group.groupTitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500">
                    {visibleItems.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                      isOpen && "rotate-180 text-slate-700"
                    )}
                  />
                </div>
              </button>

              {/* Danh sách các mục nhỏ được xổ ra khi isOpen */}
              {isOpen && (
                <div className="ml-3.5 pl-3 border-l-2 border-slate-100 space-y-0.5 pt-0.5 pb-1 transition-all">
                  {visibleItems.map((item) => {
                    const isActive = checkIsNavActive(item.href, pathname);
                    const SubIcon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group",
                          isActive
                            ? "bg-slate-100 text-slate-900 font-semibold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 font-normal"
                        )}
                      >
                        <SubIcon
                          className={cn(
                            "w-3.5 h-3.5 shrink-0 transition-colors",
                            isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate flex-1 text-[11.5px]">{item.title}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "px-1 py-0.2 rounded text-[8.5px] font-bold uppercase",
                              isActive
                                ? "bg-slate-200 text-slate-800"
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Footer chuẩn mẫu Benchmark: Khối User Avatar AD & Nút [Thu gọn] [Đăng xuất] */}
      <div className="border-t border-slate-100 p-2.5 shrink-0 bg-slate-50/50 space-y-2">
        {/* User Card */}
        <div
          className={cn(
            "flex items-center gap-2.5 p-1 rounded-lg transition",
            collapsed && "justify-center p-0"
          )}
        >
          {/* Avatar vuông đen tròn góc AD */}
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {userInitials}
          </div>

          {!collapsed && (
            <div className="flex flex-col truncate min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                {user?.name || "Admin"}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user?.email || "admin@signage-erp.vn"}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons: Thu gọn & Đăng xuất */}
        <div
          className={cn(
            "flex items-center gap-1 pt-1 border-t border-slate-200/60",
            collapsed ? "flex-col" : "justify-between"
          )}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition font-medium",
              collapsed && "justify-center w-full px-0"
            )}
            title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          >
            <EyeOff className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Thu gọn</span>}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 transition font-medium",
              collapsed && "justify-center w-full px-0"
            )}
            title="Đăng xuất khỏi tài khoản"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
