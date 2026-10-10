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
  Search,
  Filter,
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
import { toast, Modal } from "@/components/ui";

export default function FleetOverviewPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(SEED_VEHICLES);
  const [search, setSearch] = React.useState("");
  const [selectedWorkshop, setSelectedWorkshop] = React.useState("all");
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
  const warningSchedules = SEED_SCHEDULE_ITEMS.filter((s) => s.status === "warning_due_soon" || s.status === "overdue").length;

  const filteredVehicles = vehicles.filter((v) => {
    const matchSearch =
      v.plateNo.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.defaultDriverName.toLowerCase().includes(search.toLowerCase());
    const matchWorkshop = selectedWorkshop === "all" || v.managingWorkshop === selectedWorkshop;
    return matchSearch && matchWorkshop;
  });

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar Thanh Mảnh Theo Chuẩn UI/UX ERP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            FLEET SUITE / TỔNG QUAN ĐIỀU HÀNH
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            Bàn Làm Việc & Trung Tâm Vận Hành Đội Xe Biển Quảng Cáo
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => toast.success("Đã đồng bộ chỉ số vận hành mới nhất!")}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Thêm Xe Mới</span>
          </button>
          <Link
            href="/apps/doi-xe/dieu-xe"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Lập Lệnh Điều Xe</span>
          </Link>
          <Link
            href="/apps/doi-xe/nhat-ky"
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Nhập GPS Bình Minh</span>
          </Link>
        </div>
      </div>

      {/* 2. StatBar 1 Dòng Thu Gọn Chuẩn Enterprise */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        {/* Xe khả dụng */}
        <div className="flex items-center gap-2 px-2">
          <Truck className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[10px] leading-tight">Xe Khả Dụng:</span>
            <strong className="text-slate-900 font-bold">
              {vehicles.filter((v) => v.status === "available").length}/{vehicles.length} xe
            </strong>
          </div>
        </div>

        {/* Lệnh điều xe */}
        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <CalendarDays className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[10px] leading-tight">Lệnh Tuần:</span>
            <strong className="text-slate-900 font-bold">
              {SEED_DISPATCH_ORDERS.length} lệnh
            </strong>
          </div>
        </div>

        {/* OT chờ duyệt */}
        <Link href="/apps/doi-xe/tang-ca" className="flex items-center gap-2 px-2 border-l border-slate-200 hover:bg-slate-100/60 rounded">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[10px] leading-tight">OT Chờ Duyệt:</span>
            <strong className="text-amber-800 font-bold">
              {pendingOtCount} hồ sơ ({pendingOtAmount.toLocaleString("vi-VN")} đ)
            </strong>
          </div>
        </Link>

        {/* Vấn đề mở */}
        <Link href="/apps/doi-xe/van-de" className="flex items-center gap-2 px-2 border-l border-slate-200 hover:bg-slate-100/60 rounded">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[10px] leading-tight">Vấn Đề Đang Mở:</span>
            <strong className="text-rose-700 font-bold">
              {openIssuesCount} vụ việc
            </strong>
          </div>
        </Link>

        {/* Lịch hạn */}
        <Link href="/apps/doi-xe/ho-so-lich" className="flex items-center gap-2 px-2 border-l border-slate-200 hover:bg-slate-100/60 rounded">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[10px] leading-tight">Lịch Sắp Đến Hạn:</span>
            <strong className="text-slate-900 font-bold">
              {warningSchedules} hạng mục
            </strong>
          </div>
        </Link>

        {/* Dữ liệu GPS */}
        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block text-[10px] leading-tight">Dữ Liệu GPS:</span>
            <strong className="text-slate-900 font-bold">
              Bình Minh 10/10
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Bảng Dữ Liệu Phương Tiện Mật Độ Cao (High-Density Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm biển số, tài xế, model xe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">Tất cả xưởng</option>
              <option value="Xưởng TP.HCM">Xưởng TP.HCM</option>
              <option value="Xưởng Cần Thơ">Xưởng Cần Thơ</option>
              <option value="Xưởng Nha Trang">Xưởng Nha Trang</option>
              <option value="Xưởng Bình Dương">Xưởng Bình Dương</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-500">
            Hiển thị <strong>{filteredVehicles.length}</strong> / {vehicles.length} xe trong đội
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="px-3.5 py-2.5">Biển Số Xe</th>
                <th className="px-3 py-2.5">Tên Xe & Model</th>
                <th className="px-3 py-2.5">Hệ Điện</th>
                <th className="px-3 py-2.5 text-right">Tải Trọng</th>
                <th className="px-3 py-2.5 text-right">Định Mức Dầu</th>
                <th className="px-3 py-2.5 text-right">Đồng Hồ ODO</th>
                <th className="px-3 py-2.5">Tài Xế Mặc Định</th>
                <th className="px-3 py-2.5">Xưởng Quản Lý</th>
                <th className="px-3 py-2.5 text-center">Trạng Thái</th>
                <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 font-bold font-mono text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                      {v.plateNo}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-900">{v.name}</div>
                    <div className="text-[11px] text-slate-400">{v.model}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    <span className="font-medium text-slate-800">{v.voltageSystem}</span>
                    <span className="text-[10px] text-slate-400 block">≥{v.voltageThreshold}V</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                    {v.maxPayloadKg.toLocaleString("vi-VN")} kg
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {v.fuelRateMoving} L/100km
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                    {v.currentOdoKm.toLocaleString("vi-VN")} km
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium">
                    {v.defaultDriverName}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 text-[11px]">
                    {v.managingWorkshop}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Khả dụng
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href="/apps/doi-xe/dieu-xe"
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                      >
                        Điều xe
                      </Link>
                      <Link
                        href="/apps/doi-xe/nhat-ky"
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold transition"
                      >
                        GPS
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Hàng Chờ Xử Lý & Việc Cần Quyết Định (2 Cột Chuẩn Benchmark) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Cột Trái: Vấn đề cần giải trình & OT chờ duyệt */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Hàng Chờ Cần Xử Lý & Giải Trình
              </h3>
            </div>
            <Link
              href="/apps/doi-xe/van-de"
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-2.5 space-y-2">
            {/* Lệch nạp dầu */}
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-600 text-white">
                    GIẢI TRÌNH
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Lệch nạp dầu 14.86% xe 51D-699.98 (Hóa đơn 35L vs GPS 29.8L)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Phát hiện ngày 09/10 tại Cần Thơ. Thiếu ảnh cột bơm cây xăng.
                </p>
              </div>
              <Link
                href="/apps/doi-xe/chi-phi"
                className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
              >
                Đối soát
              </Link>
            </div>

            {/* Tăng ca chờ duyệt */}
            <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-700 text-white">
                    DUYỆT OT
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Tăng ca 10/10 - Nguyễn Văn A: 245 phút (264.583 đ)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Khung sáng 145 phút & khung chiều 100 phút theo chặng máy GPS.
                </p>
              </div>
              <Link
                href="/apps/doi-xe/tang-ca"
                className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 transition"
              >
                Duyệt
              </Link>
            </div>
          </div>
        </div>

        {/* Cột Phải: Lịch hạn kiểm định & chu kỳ bảo dưỡng sắp đến */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Lịch Hạn Giấy Tờ & Bảo Dưỡng Sắp Đến
              </h3>
            </div>
            <Link
              href="/apps/doi-xe/ho-so-lich"
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
            >
              <span>Xem sổ lịch</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-2.5 space-y-2">
            {/* Khám sức khỏe */}
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white">
                    GẤP
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Khám sức khỏe tài xế Trần Văn B hết hạn 15/10/2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Còn 5 ngày. Cần thông báo tài xế đến bệnh viện GTVT khám sức khỏe lái xe.
                </p>
              </div>
              <Link
                href="/apps/doi-xe/ho-so-lich"
                className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 transition"
              >
                Gia hạn
              </Link>
            </div>

            {/* Bảo dưỡng ODO */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-700 text-white">
                    BẢO DƯỠNG
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Xe 51D-982.46 sắp đến mốc thay nhớt 145.000 km
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  ODO hiện tại: 142.800 km (còn 2.200 km). Lịch dự kiến: Tuần 43.
                </p>
              </div>
              <Link
                href="/apps/doi-xe/ho-so-lich"
                className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL THÊM XE MỚI */}
      {showAddVehicleModal && (
        <Modal
          isOpen={showAddVehicleModal}
          onClose={() => setShowAddVehicleModal(false)}
          title="Thêm Phương Tiện Mới Vào Đội Xe"
        >
          <form onSubmit={handleAddVehicle} className="space-y-3 p-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Biển Số Xe *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 51D-123.45"
                  value={newVehicle.plateNo}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plateNo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tên Gọi Xe *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Xe Tải Hino 1.9T"
                  value={newVehicle.name}
                  onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Hệ Điện Bình *</label>
                <select
                  value={newVehicle.voltageSystem}
                  onChange={(e) =>
                    setNewVehicle({
                      ...newVehicle,
                      voltageSystem: e.target.value as "12V" | "24V",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="12V">12V (ngưỡng 12.6V)</option>
                  <option value="24V">24V (ngưỡng 26.0V)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tải Trọng (kg)</label>
                <input
                  type="number"
                  value={newVehicle.maxPayloadKg}
                  onChange={(e) => setNewVehicle({ ...newVehicle, maxPayloadKg: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Định Mức Dầu (L/100km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newVehicle.fuelRateMoving}
                  onChange={(e) => setNewVehicle({ ...newVehicle, fuelRateMoving: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Đồng Hồ ODO Ban Đầu (km)</label>
                <input
                  type="number"
                  value={newVehicle.currentOdoKm}
                  onChange={(e) => setNewVehicle({ ...newVehicle, currentOdoKm: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Xưởng Phụ Trách</label>
                <select
                  value={newVehicle.managingWorkshop}
                  onChange={(e) => setNewVehicle({ ...newVehicle, managingWorkshop: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="Xưởng TP.HCM">Xưởng TP.HCM</option>
                  <option value="Xưởng Cần Thơ">Xưởng Cần Thơ</option>
                  <option value="Xưởng Nha Trang">Xưởng Nha Trang</option>
                  <option value="Xưởng Bình Dương">Xưởng Bình Dương</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddVehicleModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
              >
                Lưu Phương Tiện
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
