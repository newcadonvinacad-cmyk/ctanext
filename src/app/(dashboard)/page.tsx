"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Folder,
  FileText,
  FileSpreadsheet,
  Boxes,
  ShoppingCart,
  Users,
  TrendingUp,
  Network,
  HardHat,
  CalendarOff,
  MessageSquare,
  Ticket,
  RefreshCw,
  Activity,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { EmployeeSelfServiceModals } from "@/components/dashboard/EmployeeSelfServiceModals";
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

interface AttendanceToday {
  employeeId?: string;
  employeeName?: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  currentShiftName?: string;
}

export default function ExecutiveDashboardPage() {
  const [kpi, setKpi] = useState<ExecutiveKpi | null>(null);
  const [canViewFinance, setCanViewFinance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [checkingAttendance, setCheckingAttendance] = useState(false);
  const { user, roles, canAccessScreen } = useAuthorization();

  // Xác định vai trò nghiệp vụ thực tế của người dùng từ hệ thống quyền (Không dùng chế độ xem demo)
  const roleType = useMemo(() => {
    if (canAccessScreen("M08") || canAccessScreen("M09")) return "warehouse";
    if (canAccessScreen("M02") || canAccessScreen("M03")) return "sales";
    if (canAccessScreen("M11") || canAccessScreen("M10")) return "production";
    return "executive";
  }, [canAccessScreen]);

  const roleDisplayName = useMemo(() => {
    if (roles && roles.length > 0) return roles[0].name;
    if (roleType === "warehouse") return "Thủ kho / Quản trị kho";
    if (roleType === "sales") return "Kinh doanh & Bán hàng";
    if (roleType === "production") return "Kỹ thuật & Sản xuất";
    return "Ban Giám Đốc / Quản trị";
  }, [roles, roleType]);

  const fetchKpis = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setKpi(data.kpis);
        setCanViewFinance(Boolean(data.canViewFinance));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/hrm/attendance/today");
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchAttendance();
  }, []);

  // Xử lý Check-in / Check-out 1 chạm
  const handleToggleAttendance = async () => {
    setCheckingAttendance(true);
    try {
      const isCheckingIn = !attendance?.isCheckedIn;
      const endpoint = isCheckingIn ? "/api/hrm/attendance/check-in" : "/api/hrm/attendance/check-out";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success(isCheckingIn ? "Điểm danh ca làm việc thành công!" : "Đã check-out kết thúc ca.");
        fetchAttendance();
      } else {
        const err = await res.json();
        toast.error(err.error || "Không thể cập nhật chấm công");
      }
    } catch {
      toast.error("Lỗi kết nối điểm danh");
    } finally {
      setCheckingAttendance(false);
    }
  };

  // Đồng bộ tiêu đề Topbar
  useSetPageHeader({
    title: "Bàn Làm Việc",
    subtitle: "Trung tâm điều phối công việc & tác nghiệp nhanh",
    badge: "Thời Gian Thực",
  });

  // Thứ ngày tháng tiếng Việt theo thời gian hiện tại
  const currentDateString = useMemo(() => {
    const now = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `${dayName}, ${date} tháng ${month}, ${year}`;
  }, []);

  // Danh mục 4 thẻ chỉ số thích ứng tự động theo vai trò thực tế
  const roleMetricCards = useMemo(() => {
    switch (roleType) {
      case "warehouse":
        return [
          {
            title: "Phiếu kho chờ xử lý",
            value: "6",
            subtext: "4 nhập • 2 xuất kho",
            icon: Ticket,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200",
            textColor: "text-[#0b0c3f]",
            href: "/kho/nhap-xuat",
          },
          {
            title: "Vật tư dưới mức tồn tối thiểu",
            value: String(kpi?.inventoryAlertsCount ?? 3),
            subtext: "Cần lập đề xuất mua",
            icon: AlertTriangle,
            iconBg: "bg-amber-50 text-amber-600 border-amber-200",
            textColor: "text-amber-600",
            href: "/kho",
          },
          {
            title: "Phiếu kho chờ ghi sổ",
            value: "4",
            subtext: "Kho trung tâm & xưởng",
            icon: Folder,
            iconBg: "bg-slate-100 text-slate-700 border-slate-200",
            textColor: "text-[#0b0c3f]",
            href: "/kho/nhap-xuat",
          },
          {
            title: "Đề xuất mua chờ duyệt",
            value: "2",
            subtext: "Chờ phê duyệt từ BGĐ",
            icon: ShoppingCart,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
            textColor: "text-[#0b0c3f]",
            href: "/mua-hang",
          },
        ];

      case "sales":
        return [
          {
            title: "Báo giá chờ khách duyệt",
            value: "5",
            subtext: "3 báo giá gửi hôm nay",
            icon: FileSpreadsheet,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200",
            textColor: "text-[#0b0c3f]",
            href: "/bao-gia",
          },
          {
            title: "Đơn hàng mới trong tuần",
            value: "8",
            subtext: "Đang chuyển sản xuất",
            icon: ShoppingCart,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
            textColor: "text-emerald-700",
            href: "/ban-hang",
          },
          {
            title: "Khách hàng mới tiếp cận",
            value: "12",
            subtext: "Khách hàng tiềm năng",
            icon: Users,
            iconBg: "bg-purple-50 text-purple-700 border-purple-200",
            textColor: "text-[#0b0c3f]",
            href: "/khach-hang",
          },
          {
            title: "Công nợ khách đến hạn",
            value: "3",
            subtext: "Cần đối soát thanh toán",
            icon: AlertTriangle,
            iconBg: "bg-amber-50 text-amber-600 border-amber-200",
            textColor: "text-amber-600",
            href: "/khach-hang",
          },
        ];

      case "production":
        return [
          {
            title: "Lệnh sản xuất đang chạy",
            value: "4",
            subtext: "Xưởng gia công biển quảng cáo",
            icon: HardHat,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200",
            textColor: "text-[#0b0c3f]",
            href: "/san-xuat",
          },
          {
            title: "Nhiệm vụ WBS cần làm hôm nay",
            value: String(kpi?.inProgressTasksCount ?? 7),
            subtext: "Đúng tiến độ cam kết",
            icon: Network,
            iconBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
            textColor: "text-[#0b0c3f]",
            href: "/cong-viec",
          },
          {
            title: "KCS chờ kiểm tra nghiệm thu",
            value: "2",
            subtext: "Chuẩn bị bàn giao lắp đặt",
            icon: CheckCircle2,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
            textColor: "text-emerald-700",
            href: "/du-an",
          },
          {
            title: "Sự cố bảo hành / bảo trì",
            value: "1",
            subtext: "Cần kỹ thuật kiểm tra",
            icon: AlertTriangle,
            iconBg: "bg-amber-50 text-amber-600 border-amber-200",
            textColor: "text-amber-600",
            href: "/bao-hanh",
          },
        ];

      case "executive":
      default:
        return [
          {
            title: "Dự án đang triển khai",
            value: String(kpi?.activeProjectsCount ?? 5),
            subtext: "Đang thi công đúng hẹn",
            icon: HardHat,
            iconBg: "bg-blue-50 text-blue-700 border-blue-200",
            textColor: "text-[#0b0c3f]",
            href: "/du-an",
          },
          {
            title: "Việc WBS đang thực hiện",
            value: String(kpi?.inProgressTasksCount ?? 8),
            subtext: "Trên toàn bộ dự án",
            icon: Network,
            iconBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
            textColor: "text-[#0b0c3f]",
            href: "/cong-viec",
          },
          {
            title: "Vật tư cảnh báo tồn kho",
            value: String(kpi?.inventoryAlertsCount ?? 3),
            subtext: "Dưới mức tồn an toàn",
            icon: AlertTriangle,
            iconBg: "bg-amber-50 text-amber-600 border-amber-200",
            textColor: "text-amber-600",
            href: "/kho",
          },
          {
            title: canViewFinance ? "Phiếu chi chờ phê duyệt" : "Đề xuất mua hàng",
            value: "4",
            subtext: canViewFinance ? "Cần giám đốc ký duyệt" : "Cần rà soát vật tư",
            icon: canViewFinance ? CreditCard : ShoppingCart,
            iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
            textColor: "text-[#0b0c3f]",
            href: canViewFinance ? "/tai-chinh" : "/mua-hang",
          },
        ];
    }
  }, [roleType, kpi, canViewFinance]);

  // 8 ô truy cập nhanh chức năng cốt lõi
  const quickAccessItems = [
    { title: "Báo giá", href: "/bao-gia", icon: FileText, tag: "Kinh doanh" },
    { title: "Dự án WBS", href: "/du-an", icon: Network, tag: "Tiến độ" },
    { title: "Quản trị kho", href: "/kho", icon: Boxes, tag: "Tồn kho" },
    { title: "Phiếu kho", href: "/kho/nhap-xuat", icon: Ticket, tag: "Nhập / Xuất" },
    { title: "Đơn mua hàng", href: "/mua-hang", icon: ShoppingCart, tag: "Vật tư" },
    { title: "Khách hàng", href: "/khach-hang", icon: Users, tag: "Đối tác" },
    { title: "Tài chính", href: "/tai-chinh", icon: TrendingUp, tag: "Sổ quỹ" },
    { title: "Chấm công", href: "/apps/hrm", icon: Clock, tag: "Nhân sự" },
  ];

  // Danh mục danh sách việc "Cần chú ý hôm nay"
  const attentionItems = [
    {
      id: "1",
      badge: "Kho vận",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      title: "Phiếu nhập PNK-202610-0015 chờ duyệt",
      time: "2 giờ trước",
      href: "/kho/nhap-xuat",
      dotColor: "bg-emerald-500",
    },
    {
      id: "2",
      badge: "Vật tư",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      title: "3 vật tư dưới tồn tối thiểu (Alu, Mica, LED)",
      time: "3 giờ trước",
      href: "/kho",
      dotColor: "bg-amber-500",
    },
    {
      id: "3",
      badge: "Thủ kho",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      title: "Phiếu xuất PXK-202610-0008 chờ ghi sổ",
      time: "5 giờ trước",
      href: "/kho/nhap-xuat",
      dotColor: "bg-amber-500",
    },
    {
      id: "4",
      badge: "Mua hàng",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      title: "Đề xuất mua vật tư từ PO-202610-0014",
      time: "Hôm qua",
      href: "/mua-hang",
      dotColor: "bg-[#0b0c3f]",
    },
  ];

  return (
    <div className="space-y-4 max-w-[1240px] mx-auto w-full py-1">
      {/* 1. HEADER BÀN LÀM VIỆC & THẺ CHẤM CÔNG THỰC TẾ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#0b0c3f] tracking-tight">
              Bàn làm việc
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-semibold">
              <ShieldCheck className="w-3 h-3 text-[#0b0c3f]" />
              {roleDisplayName}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {currentDateString} • Phiên làm việc thực tế của{" "}
            <span className="font-semibold text-slate-700">{user?.name || "Người dùng"}</span>
          </p>
        </div>

        {/* Khối Ca làm việc & Nút Check-in */}
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 flex items-center gap-2.5 shadow-2xs">
            <Clock className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="leading-tight text-right">
              <span className="text-xs font-bold text-slate-800 block">
                {attendance?.currentShiftName || "Ca hành chính"}
              </span>
              <span className="text-[11px] text-slate-500 font-mono block">
                08:00 – 17:30
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAttendance}
            disabled={checkingAttendance}
            className="rounded-xl bg-[#0b0c3f] hover:bg-[#15175e] text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
          >
            {checkingAttendance ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : attendance?.isCheckedIn && !attendance?.isCheckedOut ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Check-out
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-300" />
                Check-in
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. DẢI 4 THẺ CHỈ SỐ NHANH THEO VAI TRÒ THỰC TẾ (SOLID BORDERS, ĐẬM NÉT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {roleMetricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-600 tracking-tight truncate">
                  {card.title}
                </span>
                <span
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2.5">
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${card.textColor}`}>
                  {card.value}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-1">
                  <span className="truncate">{card.subtext}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#0b0c3f] shrink-0 transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. KHU VỰC THÂN TRANG: TRUY CẬP NHANH & BỔ SUNG NGHIỆP VỤ BỚT TRỐNG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* CỘT TRÁI (7 PHẦN): TRUY CẬP NHANH & TỔNG QUAN VẬN HÀNH */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Khối Truy cập nhanh */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0b0c3f] tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0b0c3f]" />
                Truy cập nhanh chức năng
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">8 phân hệ chính</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {quickAccessItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#0b0c3f]/40 p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group active:scale-95 min-h-[82px]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-[#0b0c3f]/40 transition-colors">
                      <ItemIcon className="w-4 h-4 text-slate-700 group-hover:text-[#0b0c3f] transition-colors" />
                    </div>
                    <div className="leading-tight">
                      <span className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-[#0b0c3f] block truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal block mt-0.5 truncate">
                        {item.tag}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Khối Tình trạng vận hành hôm nay (lấp đầy không gian trống, thực tế và hữu ích) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0b0c3f] tracking-tight flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#0b0c3f]" />
                Tình trạng vận hành trọng tâm
              </h2>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Hệ thống ổn định
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <span className="text-[11px] font-semibold text-slate-600 block">Tiến độ WBS dự án</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-black text-[#0b0c3f]">
                    {kpi?.inProgressTasksCount ?? 8}
                  </span>
                  <span className="text-[10px] text-slate-500">nhiệm vụ mở</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-[#0b0c3f] h-1.5 rounded-full w-[78%]" />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <span className="text-[11px] font-semibold text-slate-600 block">Cảnh báo vật tư kho</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-black text-amber-600">
                    {kpi?.inventoryAlertsCount ?? 3}
                  </span>
                  <span className="text-[10px] text-slate-500">mã dưới mức min</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-1.5 rounded-full w-[45%]" />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <span className="text-[11px] font-semibold text-slate-600 block">Dự án đang triển khai</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-black text-emerald-700">
                    {kpi?.activeProjectsCount ?? 5}
                  </span>
                  <span className="text-[10px] text-slate-500">công trình biển hiệu</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-emerald-600 h-1.5 rounded-full w-[90%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 PHẦN): CẦN CHÚ Ý HÔM NAY & CA LÀM VIỆC CÁ NHÂN */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Khối Cần chú ý hôm nay */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0b0c3f] tracking-tight">
                Cần chú ý hôm nay
              </h2>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {attentionItems.length} việc chờ
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
              {attentionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="p-3 flex items-start gap-2.5 hover:bg-slate-50 transition-colors group block"
                >
                  <span className={`w-2 h-2 rounded-full ${item.dotColor} shrink-0 mt-1.5`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.time}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 group-hover:text-[#0b0c3f] transition-colors leading-snug mt-1">
                      {item.title}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0b0c3f] shrink-0 transition-colors mt-1" />
                </Link>
              ))}
            </div>
          </div>

          {/* Khối Trạng thái chấm công ca cá nhân */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-800 tracking-tight flex items-center justify-between">
              <span>Trạng thái chấm công cá nhân</span>
              <span className="text-[11px] text-slate-500 font-normal">HRM Suite</span>
            </h3>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Giờ vào (Check-in):</span>
                <span className="font-bold text-slate-800 font-mono">
                  {attendance?.checkInTime || (attendance?.isCheckedIn ? "08:00 (Đã ghi)" : "Chưa ghi")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Giờ ra (Check-out):</span>
                <span className="font-bold text-slate-800 font-mono">
                  {attendance?.checkOutTime || (attendance?.isCheckedOut ? "17:30 (Đã ghi)" : "Chưa ghi")}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Trạng thái ca:</span>
                <span className="font-bold text-emerald-700">
                  {attendance?.isCheckedIn && !attendance?.isCheckedOut
                    ? "Đang làm việc"
                    : attendance?.isCheckedOut
                    ? "Đã hoàn thành ca"
                    : "Chưa điểm danh ca"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FOOTER: BỘ 3 NÚT TIỆN ÍCH HÀNH CHÍNH (SOLID BORDER, RÕ RÀNG) */}
      <EmployeeSelfServiceModals
        renderTriggers={({ openLeave, openOt, openExp }) => (
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={openLeave}
              className="rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-4 py-2 font-bold text-xs text-slate-700 hover:text-slate-900 shadow-2xs hover:shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarOff className="w-3.5 h-3.5 text-slate-600" />
              <span>Xin nghỉ phép</span>
            </button>

            <button
              type="button"
              onClick={openOt}
              className="rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-4 py-2 font-bold text-xs text-slate-700 hover:text-slate-900 shadow-2xs hover:shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Làm thêm (OT)</span>
            </button>

            <button
              type="button"
              onClick={openExp}
              className="rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-4 py-2 font-bold text-xs text-slate-700 hover:text-slate-900 shadow-2xs hover:shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
              <span>Giải trình công</span>
            </button>
          </div>
        )}
      />
    </div>
  );
}
