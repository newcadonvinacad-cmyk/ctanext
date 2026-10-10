"use client";

import * as React from "react";
import Link from "next/link";
import {
  Truck,
  CalendarDays,
  Navigation,
  Clock,
  Fuel,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  User,
  Plus,
  RefreshCw,
  Gauge,
  Activity,
  FileText,
  Copy,
} from "lucide-react";
import {
  SEED_VEHICLES,
  SEED_DRIVERS,
  SEED_DISPATCH_ORDERS,
  SEED_DAILY_LOGS,
  SEED_OVERTIME_RECORDS,
  SEED_ISSUES,
  SEED_SCHEDULE_ITEMS,
  Vehicle,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

export default function FleetOverviewPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(SEED_VEHICLES);
  const [showAddVehicleModal, setShowAddVehicleModal] = React.useState(false);
  const [newVehicle, setNewVehicle] = React.useState({
    plateNo: "",
    name: "",
    model: "",
    voltageSystem: "12V" as "12V" | "24V",
    maxPayloadKg: 1900,
    fuelRateMoving: 10,
    currentOdoKm: 50000,
    managingWorkshop: "Xưởng Nha Trang",
  });

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plateNo || !newVehicle.name) {
      toast.error("Vui lòng điền biển số và tên xe");
      return;
    }
    const created: Vehicle = {
      id: `veh-${Date.now()}`,
      code: `XE-${newVehicle.plateNo.replace(/[^a-zA-Z0-9]/g, "")}`,
      plateNo: newVehicle.plateNo,
      name: newVehicle.name,
      model: newVehicle.model || "Tải nhẹ",
      voltageSystem: newVehicle.voltageSystem,
      voltageThreshold: newVehicle.voltageSystem === "24V" ? 26.0 : 12.6,
      maxPayloadKg: Number(newVehicle.maxPayloadKg) || 1500,
      payloadVerified: true,
      fuelRateMoving: Number(newVehicle.fuelRateMoving) || 10,
      fuelRateIdle: 2.0,
      stdSpeedKmh: 50,
      currentOdoKm: Number(newVehicle.currentOdoKm) || 0,
      lastOdoUpdate: new Date().toISOString().slice(0, 10),
      managingWorkshop: newVehicle.managingWorkshop,
      defaultDriverId: "drv-03",
      defaultDriverName: "Lê Hoàng C",
      status: "available",
      yearManufactured: 2024,
    };

    setVehicles([...vehicles, created]);
    setShowAddVehicleModal(false);
    toast.success(`Đã thêm xe mới: ${created.plateNo}`);
  };

  const pendingOtCount = SEED_OVERTIME_RECORDS.filter((r) => r.approvalStatus === "pending").length;
  const pendingOtAmount = SEED_OVERTIME_RECORDS.filter((r) => r.approvalStatus === "pending").reduce(
    (sum, r) => sum + r.proposedTotalAmount,
    0
  );
  const openIssuesCount = SEED_ISSUES.filter((i) => i.status !== "closed").length;
  const highSeverityIssues = SEED_ISSUES.filter((i) => i.status !== "closed" && i.severity === "high").length;
  const warningSchedules = SEED_SCHEDULE_ITEMS.filter((s) => s.status === "warning_due_soon" || s.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* 1. Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-sm shadow-xs">
              <Truck className="w-4 h-4" />
            </span>
            Bàn Làm Việc Đội Xe & Vận Chuyển
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Điều hành phương tiện, tiếp nhận dữ liệu GPS Bình Minh, duyệt tăng ca và phân bổ chi phí dự án
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Xe Mới</span>
          </button>
          <Link
            href="/apps/doi-xe/dieu-xe"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Lập Lệnh Điều Xe</span>
          </Link>
        </div>
      </div>

      {/* 2. Dải Thông Tin Thu Gọn (KPI Bảng Điều Khiển - Theo Mục 7.0 Thiết Kế) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Xe khả dụng */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Xe Khả Dụng</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{vehicles.filter(v => v.status === "available").length}</span>
            <span className="text-xs text-slate-400">/ {vehicles.length} xe</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sẵn sàng điều xe
          </div>
        </div>

        {/* Lệnh điều xe */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Lệnh Tuần Này</span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{SEED_DISPATCH_ORDERS.length}</span>
            <span className="text-xs text-slate-400">lệnh</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-700 font-medium">
            1 đang chạy, 1 đã duyệt
          </div>
        </div>

        {/* Tăng ca chờ duyệt */}
        <Link
          href="/apps/doi-xe/tang-ca"
          className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 hover:bg-amber-50/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>OT Chờ Duyệt</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-900">{pendingOtCount}</span>
            <span className="text-xs text-amber-700 font-semibold">hồ sơ</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-800 font-semibold">
            {pendingOtAmount.toLocaleString("vi-VN")} đ
          </div>
        </Link>

        {/* Vấn đề & Sự cố */}
        <Link
          href="/apps/doi-xe/van-de"
          className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 hover:bg-rose-50/50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Vấn Đề Đang Mở</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-900">{openIssuesCount}</span>
            <span className="text-xs text-rose-700 font-semibold">vụ việc</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700 font-semibold">
            {highSeverityIssues > 0 ? `⚠️ ${highSeverityIssues} việc gấp` : "Bình thường"}
          </div>
        </Link>

        {/* Lịch hạn sắp đến */}
        <Link
          href="/apps/doi-xe/ho-so-lich"
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Lịch Sắp Đến Hạn</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{warningSchedules}</span>
            <span className="text-xs text-slate-400">hạng mục</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-700 font-medium">
            Đăng kiểm & sức khỏe
          </div>
        </Link>

        {/* Dữ liệu GPS mới nhất */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Dữ Liệu GPS</span>
            <Navigation className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xs font-black text-slate-900">10/10/2026</span>
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> Bình Minh GPS
          </div>
        </div>
      </div>

      {/* 3. Danh Sách Phương Tiện Trong Đội & Trạng Thái Vận Hành */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-700" />
            Phương Tiện Đang Quản Lý ({vehicles.length} xe)
          </h2>
          <span className="text-xs text-slate-500">
            Hỗ trợ mở rộng xe thứ 3, 4 theo chuẩn NT01
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-xs tracking-wider">
                      {v.plateNo}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{v.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Model: <strong className="text-slate-700">{v.model}</strong> • Điện:{" "}
                    <strong className="text-slate-700">{v.voltageSystem} (ngưỡng {v.voltageThreshold}V)</strong>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {v.status === "available" ? "Khả dụng" : v.status}
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tải trọng cho phép:</span>
                  <span className="font-semibold text-slate-800">
                    {v.maxPayloadKg.toLocaleString("vi-VN")} kg{" "}
                    {v.payloadVerified ? (
                      <span className="text-[9px] text-emerald-600 font-normal">(Đã xác minh)</span>
                    ) : (
                      <span className="text-[9px] text-amber-600 font-normal">(Số tạm)</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Định mức lăn bánh:</span>
                  <span className="font-semibold text-slate-800">{v.fuelRateMoving} L/100km</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Đồng hồ ODO hiện tại:</span>
                  <span className="font-semibold font-mono text-slate-900">
                    {v.currentOdoKm.toLocaleString("vi-VN")} km
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tài xế mặc định:</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {v.defaultDriverName}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] truncate max-w-[190px]">
                  📍 {v.managingWorkshop}
                </span>
                <Link
                  href="/apps/doi-xe/dieu-xe"
                  className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 text-[11px]"
                >
                  <span>Điều xe</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Hàng Chờ Xử Lý & Việc Cần Quyết Định (Admin xe & Quản lý) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Việc cần quyết định & giải trình */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Hàng Chờ Cần Xử Lý & Quyết Định ({SEED_ISSUES.length + pendingOtCount})
              </h3>
            </div>
            <Link
              href="/apps/doi-xe/van-de"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-3 space-y-2.5">
            {/* Mục 1: Khám sức khỏe TX */}
            <div className="p-3 rounded-lg border border-rose-100 bg-rose-50/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white">
                    GẤP
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Khám sức khỏe tài xế Trần Văn B hết hạn 15/10/2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Còn 5 ngày. Cần thông báo tài xế đến bệnh viện GTVT khám để đảm bảo điều kiện lái xe.
                </p>
              </div>
              <Link
                href="/apps/doi-xe/ho-so-lich"
                className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
              >
                Gia hạn
              </Link>
            </div>

            {/* Mục 2: Lệch nạp dầu */}
            <div className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-600 text-white">
                    CẦN GIẢI TRÌNH
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Lệch nạp dầu 14.86% xe 51D-699.98 (Hóa đơn 35L vs GPS 29.8L)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Phát hiện ngày 09/10 tại Cần Thơ. Thiếu ảnh cột bơm cây xăng.
                </p>
              </div>
              <Link
                href="/apps/doi-xe/chi-phi"
                className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
              >
                Đối soát
              </Link>
            </div>

            {/* Mục 3: Tăng ca chờ duyệt */}
            <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-700 text-white">
                    DUYỆT OT
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Hồ sơ tăng ca ngày 10/10 - Nguyễn Văn A (264.583 đ)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Khung sáng 145 phút (05:05 - 07:30) & khung chiều 100 phút (17:00 - 18:40).
                </p>
              </div>
              <Link
                href="/apps/doi-xe/tang-ca"
                className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 transition"
              >
                Duyệt ngay
              </Link>
            </div>
          </div>
        </div>

        {/* Lối tắt 7 phân hệ nghiệp vụ */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Lối Tắt 7 Phân Hệ Nghiệp Vụ
            </h3>
            <span className="text-xs text-slate-400">Sidebar dọc màu xanh lá</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Link
              href="/apps/doi-xe/dieu-xe"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-slate-800 group-hover:text-emerald-800 font-bold text-xs">
                <CalendarDays className="w-4 h-4 text-emerald-700" />
                <span>Điều Xe & Lịch Tuần</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Lịch tuần Ngày × Xe, sao chép tin Zalo 1-click
              </p>
            </Link>

            <Link
              href="/apps/doi-xe/nhat-ky"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-slate-800 group-hover:text-emerald-800 font-bold text-xs">
                <Navigation className="w-4 h-4 text-emerald-700" />
                <span>Nhật Ký & GPS</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Nhập file Bình Minh, điểm dừng, kiểm lốp & ảnh
              </p>
            </Link>

            <Link
              href="/apps/doi-xe/tang-ca"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-slate-800 group-hover:text-emerald-800 font-bold text-xs">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Duyệt Tăng Ca (OT)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                4 khung giờ tự động, duyệt đủ / một phần / từ chối
              </p>
            </Link>

            <Link
              href="/apps/doi-xe/chi-phi"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-slate-800 group-hover:text-emerald-800 font-bold text-xs">
                <Fuel className="w-4 h-4 text-emerald-700" />
                <span>Chi Phí & Sổ Đổ Dầu</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                3 khái niệm dầu (mua / GPS / đầy bình), sổ chi phí
              </p>
            </Link>

            <Link
              href="/apps/doi-xe/van-de"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-slate-800 group-hover:text-emerald-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-emerald-700" />
                <span>Sổ Sự Cố & Vấn Đề</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Ngoại lệ tự sinh, quy trình 5 bước, cảnh báo lặp lại
              </p>
            </Link>

            <Link
              href="/apps/doi-xe/bao-cao"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 text-slate-800 group-hover:text-emerald-800 font-bold text-xs">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <span>Báo Cáo & Phân Bổ</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Phân bổ chi phí dự án chuẩn xác tới từng đồng VND
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Thêm Xe Mới (Đáp ứng tình huống NT01) */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                Thêm Phương Tiện Mới Vào Đội Xe (NT01)
              </h3>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Biển Số Xe *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 51D-123.45"
                    value={newVehicle.plateNo}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plateNo: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Hiển Thị *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Xe tải Hyundai 2.5T"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Xe
                  </label>
                  <input
                    type="text"
                    placeholder="Hyundai Mighty 75S"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hệ Điện GPS
                  </label>
                  <select
                    value={newVehicle.voltageSystem}
                    onChange={(e) =>
                      setNewVehicle({
                        ...newVehicle,
                        voltageSystem: e.target.value as "12V" | "24V",
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="12V">12V (Ngưỡng nổ máy 12.6V)</option>
                    <option value="24V">24V (Ngưỡng nổ máy 26.0V)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tải Cho Phép (kg)
                  </label>
                  <input
                    type="number"
                    value={newVehicle.maxPayloadKg}
                    onChange={(e) => setNewVehicle({ ...newVehicle, maxPayloadKg: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Định Mức (L/100km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newVehicle.fuelRateMoving}
                    onChange={(e) => setNewVehicle({ ...newVehicle, fuelRateMoving: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Km ODO Hiện Tại
                  </label>
                  <input
                    type="number"
                    value={newVehicle.currentOdoKm}
                    onChange={(e) => setNewVehicle({ ...newVehicle, currentOdoKm: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xưởng Trực Thuộc Quản Lý
                </label>
                <select
                  value={newVehicle.managingWorkshop}
                  onChange={(e) => setNewVehicle({ ...newVehicle, managingWorkshop: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Xưởng TP.HCM (Tổng kho Miền Nam)">Xưởng TP.HCM (Tổng kho Miền Nam)</option>
                  <option value="Xưởng Cần Thơ (Chi nhánh Tây Nam Bộ)">Xưởng Cần Thơ (Chi nhánh Tây Nam Bộ)</option>
                  <option value="Xưởng Nha Trang (Chi nhánh Nam Trung Bộ)">Xưởng Nha Trang (Chi nhánh Nam Trung Bộ)</option>
                  <option value="Xưởng Nam Định (Chi nhánh Miền Bắc)">Xưởng Nam Định (Chi nhánh Miền Bắc)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu Phương Tiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
