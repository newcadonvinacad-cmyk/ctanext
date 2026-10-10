"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Toaster, Drawer, LogoProgressLoader } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthorization } from "@/hooks/use-authorization";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { SCREEN_REQUIREMENTS } from "@/constants/permissions";
import { PageHeaderProvider } from "@/contexts/page-header-context";

export interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Bản đồ đối chiếu đường dẫn URL sang Mã màn hình đặc tả [M01-M20]
 */
function getScreenCodeForPath(pathname: string): { code: string; name: string } | null {
  if (pathname === "/") return { code: "M01", name: "Bàn làm việc & KPI Điều hành" };
  if (pathname.startsWith("/khao-sat")) return { code: "M02.1", name: "Khảo sát mặt bằng" };
  if (pathname.startsWith("/du-an/thiet-ke-quy-chuan")) return { code: "M02.2", name: "Thiết kế chuẩn Nippon" };
  if (pathname.startsWith("/khach-hang")) return { code: "M02", name: "Quản lý khách hàng & Công nợ 360°" };
  if (pathname.startsWith("/bao-gia/tao-moi")) return { code: "M03.1", name: "Lập báo giá mới" };
  if (pathname.startsWith("/bao-gia")) return { code: "M03", name: "Lập & Quản lý báo giá dự toán" };
  if (pathname.startsWith("/ban-hang")) return { code: "M04", name: "Đơn bán hàng thương mại" };
  if (pathname.startsWith("/nha-cung-cap")) return { code: "M05", name: "Quản lý nhà cung cấp" };
  if (pathname.startsWith("/mua-hang/tao-moi")) return { code: "M06.1", name: "Lập đơn mua hàng (PO)" };
  if (pathname.startsWith("/mua-hang")) return { code: "M06", name: "Quản lý đơn mua hàng (PO)" };
  if (pathname.startsWith("/vat-tu") || pathname.startsWith("/dinh-muc-bom")) return { code: "M07", name: "Danh mục quy cách vật tư & Định mức" };
  if (pathname.startsWith("/kho/nhap-xuat/tao-moi")) return { code: "M09.1", name: "Lập phiếu kho mới" };
  if (pathname.startsWith("/kho/nhap-xuat")) return { code: "M09", name: "Trung tâm lập & duyệt phiếu kho" };
  if (pathname.startsWith("/kho")) return { code: "M08", name: "Quản trị tồn kho đa kho" };
  if (pathname.startsWith("/cong-viec")) return { code: "M10", name: "Điều phối công việc & Báo cáo tiến độ AI" };
  if (pathname.startsWith("/du-an/mau") || pathname.startsWith("/du-an/templates")) return { code: "M13", name: "Mẫu dự án chuẩn" };
  if (pathname.startsWith("/san-xuat")) return { code: "M13.1", name: "Sản xuất tại xưởng" };
  if (pathname.startsWith("/du-an/")) return { code: "M12", name: "Chi tiết dự án 360°" };
  if (pathname.startsWith("/du-an")) return { code: "M11", name: "Danh sách & Tiến độ dự án thi công" };
  if (pathname.startsWith("/bao-hanh")) return { code: "M11", name: "Bảo hành & Dịch vụ hậu mãi" };
  if (pathname.startsWith("/hien-truong")) return { code: "M14", name: "Không gian tác nghiệp di động của thợ & Lái xe" };
  if (pathname.startsWith("/van-chuyen") || pathname.startsWith("/doi-xe")) return { code: "M15", name: "Vận chuyển & Đội xe" };
  if (pathname.startsWith("/phan-tich")) return { code: "M16.1", name: "Phân tích Điều hành Signage" };
  if (pathname.startsWith("/tai-chinh")) return { code: "M16", name: "Quản lý thu chi & Sổ quỹ" };
  if (pathname.startsWith("/nhan-su/danh-gia-luong") || pathname.startsWith("/tinh-luong")) return { code: "M18", name: "Báo cáo tiền lương & Đánh giá AI" };
  if (pathname.startsWith("/apps/hrm/che-do-luong")) return { code: "M18.1", name: "Chế độ lương & Quỹ phép" };
  if (pathname.startsWith("/apps/hrm")) return { code: "APP_HRM", name: "HRM - Quản trị Nhân sự & Lương" };
  if (pathname.startsWith("/apps/tai-lieu") || pathname.startsWith("/tai-lieu")) return { code: "APP_DOCS", name: "Tài liệu nội bộ & Drive" };
  if (pathname.startsWith("/apps/doi-xe") || pathname.startsWith("/apps/van-chuyen")) return { code: "APP_FLEET", name: "Đội xe & Vận chuyển (Fleet Pro)" };
  if (pathname.startsWith("/nhan-su") || pathname.startsWith("/cham-cong")) return { code: "M17", name: "Nhân sự & Chấm công" };
  if (pathname.startsWith("/ai-assistant")) return { code: "M19", name: "Trợ lý AI Signage ERP" };
  if (pathname.startsWith("/cai-dat")) return { code: "M20", name: "Cài đặt hệ thống, Phân quyền động RBAC" };
  return null;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, isLoading, canAccessScreen } = useAuthorization();

  // Trạng thái thu gọn Sidebar trên Desktop (mặc định THU GỌN, nhớ lựa chọn user)
  const [collapsed, setCollapsed] = React.useState(true);

  // Nạp lựa chọn đã lưu (nếu có)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) setCollapsed(saved === "1");
    } catch {
      // Bỏ qua khi không đọc được storage
    }
  }, []);

  const updateCollapsed = React.useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
    } catch {
      // Bỏ qua khi không ghi được storage
    }
  }, []);

  // Tự động thu sidebar khi user thao tác trên vùng nội dung chính
  const handleMainInteract = React.useCallback(() => {
    setCollapsed((prev) => {
      if (!prev) {
        try {
          localStorage.setItem("sidebar-collapsed", "1");
        } catch {
          // Bỏ qua
        }
        return true;
      }
      return prev;
    });
  }, []);

  // Trạng thái mở menu Drawer trên Mobile
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Xác định màn hình hiện tại
  const currentScreen = getScreenCodeForPath(pathname);
  const isAllowed = !currentScreen || canAccessScreen(currentScreen.code);
  const isAiAssistant = pathname.startsWith("/ai-assistant");

  return (
    <PageHeaderProvider>
      <div className="min-h-screen bg-[#f8fafc] flex text-slate-800 antialiased font-sans">
        {/* 1. Desktop Sidebar (Ẩn trên mobile, sticky top-0 cố định) */}
        <div className="hidden md:block shrink-0">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => updateCollapsed(!collapsed)}
          />
        </div>

        {/* 2. Mobile Drawer Navigation */}
        <Drawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="Danh Mục Nghiệp Vụ Signage ERP"
          width="sm"
        >
          <Sidebar
            collapsed={false}
            onToggleCollapse={() => setMobileMenuOpen(false)}
            onNavigate={() => setMobileMenuOpen(false)}
            className="h-full border-none w-full sticky top-0"
          />
        </Drawer>

        {/* 3. Main Workspace Area */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 pb-16 md:pb-0",
            isAiAssistant ? "h-screen overflow-hidden" : "min-h-screen"
          )}
        >
          {/* Top Header thanh mảnh tích hợp Breadcrumb & Nút [+ Tạo] chuẩn Benchmark */}
          <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

          {/* Page Content Body tràn viền, mật độ cao */}
          <main
            onPointerDown={handleMainInteract}
            className={cn(
              "flex-1 flex flex-col",
              isAiAssistant
                ? "p-0 h-[calc(100vh-3.5rem)] overflow-hidden"
                : "p-2 sm:p-3 md:p-4 overflow-x-clip"
            )}
          >
            {isLoading ? (
              <div className="min-h-[50vh] flex items-center justify-center">
                <LogoProgressLoader
                  variant="inline"
                  size="lg"
                  title="SIGNAGE ERP"
                  statusText="Đang kết nối phiên bảo mật & nạp phân quyền..."
                />
              </div>
            ) : isAllowed ? (
              children
            ) : (
              <AccessDenied
                screenCode={currentScreen?.code}
                screenName={currentScreen?.name}
                requiredPermission={
                  currentScreen
                    ? SCREEN_REQUIREMENTS[currentScreen.code]?.permissions.join(", ")
                    : undefined
                }
              />
            )}
          </main>
        </div>

        {/* 4. Mobile Bottom Navigation */}
        <BottomNav />

        {/* 5. Global Toast Container */}
        <Toaster />
      </div>
    </PageHeaderProvider>
  );
}
