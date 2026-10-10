"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  User,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Gauge,
  FileText,
  Building2,
  Check,
} from "lucide-react";
import {
  SEED_VEHICLES,
  SEED_DRIVERS,
  SEED_SCHEDULE_ITEMS,
  Vehicle,
  DriverProfile,
  MaintenanceScheduleItem,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

export default function FleetVehiclesAndSchedulesPage() {
  const [activeTab, setActiveTab] = React.useState<"schedules" | "vehicles" | "drivers">("schedules");
  const [schedules, setSchedules] = React.useState<MaintenanceScheduleItem[]>(SEED_SCHEDULE_ITEMS);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>(SEED_VEHICLES);
  const [drivers, setDrivers] = React.useState<DriverProfile[]>(SEED_DRIVERS);

  // Modal Gia Hạn / Bảo Dưỡng
  const [showPerformModal, setShowPerformModal] = React.useState(false);
  const [selectedSchedule, setSelectedSchedule] = React.useState<MaintenanceScheduleItem | null>(null);
  const [performedDate, setPerformedDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [performedOdo, setPerformedOdo] = React.useState(142600);
  const [costAmount, setCostAmount] = React.useState(1500000);
  const [garageName, setGarageName] = React.useState("Garage Hino Trường Chinh");

  // Modal Cập nhật ODO km
  const [showOdoModal, setShowOdoModal] = React.useState(false);
  const [selectedVehForOdo, setSelectedVehForOdo] = React.useState<Vehicle | null>(null);
  const [newOdoValue, setNewOdoValue] = React.useState(145000);

  const overdueCount = schedules.filter((s) => s.status === "overdue").length;
  const warningCount = schedules.filter((s) => s.status === "warning_due_soon").length;

  const handleOpenPerform = (item: MaintenanceScheduleItem) => {
    setSelectedSchedule(item);
    setPerformedDate(new Date().toISOString().slice(0, 10));
    setShowPerformModal(true);
  };

  // Lưu bảo dưỡng / Gia hạn (NT28: sinh chu kỳ mới và giữ lịch sử)
  const handleSavePerform = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== selectedSchedule.id) return s;

        // Tính ngày hạn mới
        let nextExpiryDate = s.expiryDate;
        if (s.cycleMonths) {
          const d = new Date(performedDate);
          d.setMonth(d.getMonth() + s.cycleMonths);
          nextExpiryDate = d.toISOString().slice(0, 10);
        }

        let nextExpiryOdo = s.expiryOdoKm;
        if (s.cycleKm) {
          nextExpiryOdo = performedOdo + s.cycleKm;
        }

        return {
          ...s,
          lastPerformedDate: performedDate,
          lastPerformedOdoKm: performedOdo,
          expiryDate: nextExpiryDate,
          expiryOdoKm: nextExpiryOdo,
          status: "valid",
          daysRemaining: s.cycleMonths ? s.cycleMonths * 30 : undefined,
          kmRemaining: s.cycleKm ? s.cycleKm : undefined,
          notes: `Đã bảo dưỡng tại ${garageName} (Chi phí: ${costAmount.toLocaleString("vi-VN")} đ)`,
        };
      })
    );

    setShowPerformModal(false);
    toast.success(`Đã ghi nhận hoàn tất ${selectedSchedule.title} và thiết lập chu kỳ hạn tiếp theo!`);
  };

  // Cập nhật ODO
  const handleSaveOdo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehForOdo) return;

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehForOdo.id
          ? {
              ...v,
              currentOdoKm: Number(newOdoValue),
              lastOdoUpdate: new Date().toISOString().slice(0, 10),
            }
          : v
      )
    );

    setShowOdoModal(false);
    toast.success(`Đã cập nhật đồng hồ km xe ${selectedVehForOdo.plateNo} lên ${newOdoValue.toLocaleString("vi-VN")} km!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <ShieldCheck className="w-4 h-4" />
            </span>
            Hồ Sơ Phương Tiện & Lịch Hạn Bảo Dưỡng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông số kỹ thuật xe, hồ sơ tài xế, nhắc hạn đăng kiểm & chu kỳ bảo dưỡng km chuẩn xác
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("schedules")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "schedules"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Lịch Hạn & Bảo Dưỡng ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "vehicles"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Hồ Sơ Xe ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "drivers"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Hồ Sơ Tài Xế ({drivers.length})
          </button>
        </div>
      </div>

      {/* 2. Dải Thông Báo Cảnh Báo Hạn */}
      {(overdueCount > 0 || warningCount > 0) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              Có {overdueCount > 0 ? `${overdueCount} hạng mục QUÁ HẠN` : ""}{" "}
              {warningCount > 0 ? `và ${warningCount} hạng mục SẮP ĐẾN HẠN (≤ 30 ngày hoặc ≤ 500 km)` : ""}.
            </span>
          </div>
          <span className="text-[11px] text-amber-800 font-mono">Quy định an toàn</span>
        </div>
      )}

      {/* 3. Tab 1: Danh Sách Lịch Hạn & Bảo Dưỡng */}
      {activeTab === "schedules" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">
              Theo Dõi Hạn Giấy Tờ Pháp Lý & Bảo Dưỡng Kỹ Thuật (Theo Ngày & Theo Km)
            </span>
            <span className="text-[11px] text-slate-500">
              Đến hạn ngày hoặc km trước thì nhắc trước (Mục 14)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Hạng Mục Giám Sát</th>
                  <th className="p-3">Đối Tượng (Xe / Tài Xế)</th>
                  <th className="p-3">Chu Kỳ</th>
                  <th className="p-3">Lần Thực Hiện Gần Nhất</th>
                  <th className="p-3 font-mono">Hạn Tiếp Theo</th>
                  <th className="p-3 text-center">Thời Gian / Km Còn Lại</th>
                  <th className="p-3 text-center">Trạng Thái</th>
                  <th className="p-3 text-center">Ghi Chú & Nơi Làm</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {item.targetType === "vehicle" ? "Phương tiện" : "Tài xế"}
                      </span>
                    </td>

                    <td className="p-3">
                      {item.vehiclePlate ? (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                          {item.vehiclePlate}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.driverName}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-slate-600 font-medium">
                      {item.cycleMonths ? `${item.cycleMonths} tháng` : ""}
                      {item.cycleKm ? `${item.cycleKm.toLocaleString()} km` : ""}
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      {item.lastPerformedDate.split("-").reverse().join("/")}
                      {item.lastPerformedOdoKm ? (
                        <span className="block text-[10px] text-slate-400">
                          @{item.lastPerformedOdoKm.toLocaleString()} km
                        </span>
                      ) : null}
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-900">
                      {item.expiryDate ? item.expiryDate.split("-").reverse().join("/") : ""}
                      {item.expiryOdoKm ? (
                        <span className="block text-[10px] text-slate-500 font-normal">
                          @{item.expiryOdoKm.toLocaleString()} km
                        </span>
                      ) : null}
                    </td>

                    <td className="p-3 text-center font-mono">
                      {item.daysRemaining !== undefined && (
                        <span
                          className={`font-bold block ${
                            item.daysRemaining <= 5
                              ? "text-rose-600"
                              : item.daysRemaining <= 30
                              ? "text-amber-700"
                              : "text-slate-700"
                          }`}
                        >
                          {item.daysRemaining} ngày
                        </span>
                      )}
                      {item.kmRemaining !== undefined && (
                        <span className="text-[10px] text-slate-500 font-bold block">
                          Còn {item.kmRemaining.toLocaleString()} km
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === "overdue"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : item.status === "warning_due_soon"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {item.status === "overdue"
                          ? "Quá hạn"
                          : item.status === "warning_due_soon"
                          ? "Sắp đến hạn"
                          : "Còn hạn"}
                      </span>
                    </td>

                    <td className="p-3 text-slate-500 text-[11px] max-w-[170px] truncate" title={item.notes}>
                      {item.notes || "-"}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenPerform(item)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-2xs"
                      >
                        Gia Hạn / Làm
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Tab 2: Hồ Sơ Phương Tiện */}
      {activeTab === "vehicles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono font-bold text-xs tracking-wider">
                        {v.plateNo}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{v.name}</h3>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">
                      Mã tài sản: <strong className="text-slate-700">{v.code}</strong> • Năm SX: {v.yearManufactured}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedVehForOdo(v);
                      setNewOdoValue(v.currentOdoKm + 200);
                      setShowOdoModal(true);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-emerald-700 hover:text-white transition flex items-center gap-1"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Cập nhật ODO</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tải trọng cho phép:</span>
                    <strong className="text-slate-800 font-mono text-sm">{v.maxPayloadKg} kg</strong>
                    <span className="text-[10px] text-slate-500 block">
                      {v.payloadVerified ? "(Đã xác minh kiểm định)" : "(Tạm ghi, chờ xác minh)"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Hệ điện & Ngưỡng GPS:</span>
                    <strong className="text-slate-800 text-sm">{v.voltageSystem}</strong>
                    <span className="text-[10px] text-slate-500 block">Ngưỡng nổ máy: {v.voltageThreshold}V</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Định mức nhiên liệu:</span>
                    <strong className="text-slate-800 font-mono">{v.fuelRateMoving} L/100km</strong>
                    <span className="text-[10px] text-slate-500 block">Nổ chờ: {v.fuelRateIdle} L/h</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Đồng hồ km hiện tại:</span>
                    <strong className="text-emerald-800 font-mono text-sm font-black">
                      {v.currentOdoKm.toLocaleString("vi-VN")} km
                    </strong>
                    <span className="text-[10px] text-slate-400 block">Ngày cập nhật: {v.lastOdoUpdate}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs flex items-center justify-between text-slate-600">
                  <span>📍 Trực thuộc: <strong>{v.managingWorkshop}</strong></span>
                  <span>👤 Tài xế: <strong>{v.defaultDriverName}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Tab 3: Hồ Sơ Tài Xế */}
      {activeTab === "drivers" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {d.name.split(" ").pop()?.slice(0, 1) || "TX"}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{d.name}</h3>
                  <span className="text-[11px] text-slate-500 font-mono">{d.employeeCode}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-semibold text-slate-800">{d.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hạng bằng lái:</span>
                  <span className="font-semibold text-slate-800">{d.licenseClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hạn GPLX:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {d.licenseExpiry.split("-").reverse().join("/")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khám sức khỏe:</span>
                  <span className="font-mono font-semibold text-rose-700">
                    {d.healthCertExpiry.split("-").reverse().join("/")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. Modal Ghi Nhận Gia Hạn / Bảo Dưỡng (NT28) */}
      {showPerformModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                Ghi Nhận Thực Hiện: {selectedSchedule.title}
              </h3>
              <button onClick={() => setShowPerformModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePerform} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày Thực Hiện Mới *
                </label>
                <input
                  type="date"
                  required
                  value={performedDate}
                  onChange={(e) => setPerformedDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {selectedSchedule.cycleKm && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Km ODO Khi Bảo Dưỡng *
                  </label>
                  <input
                    type="number"
                    required
                    value={performedOdo}
                    onChange={(e) => setPerformedOdo(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nơi Thực Hiện / Garage / Đơn Vị Cung Cấp
                </label>
                <input
                  type="text"
                  value={garageName}
                  onChange={(e) => setGarageName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chi Phí Thực Hiện (VNĐ)
                </label>
                <input
                  type="number"
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPerformModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu & Thiết Lập Chu Kỳ Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Cập Nhật Số Km ODO */}
      {showOdoModal && selectedVehForOdo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-700" />
                Cập Nhật Km Đồng Hồ ODO
              </h3>
              <button onClick={() => setShowOdoModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOdo} className="space-y-3">
              <p className="text-xs text-slate-600">
                Cập nhật số km đồng hồ cho xe <strong>{selectedVehForOdo.plateNo}</strong> ({selectedVehForOdo.name}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Km Đồng Hồ Mới *
                </label>
                <input
                  type="number"
                  required
                  value={newOdoValue}
                  onChange={(e) => setNewOdoValue(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono text-base font-bold text-emerald-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Xác Nhận Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
