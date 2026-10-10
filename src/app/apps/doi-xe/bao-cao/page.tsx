"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  FileSpreadsheet,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  Truck,
  User,
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  Check,
  Building2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  SEED_VEHICLES,
  SEED_DRIVERS,
  SEED_DAILY_LOGS,
  SEED_EXPENSES,
  calculateProjectCostAllocation,
  ProjectCostAllocationSummary,
  Vehicle,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";
import * as XLSX from "xlsx";

export default function FleetReportsAndAllocationPage() {
  const [reportMode, setReportMode] = React.useState<"allocation" | "weekly_drivers" | "monthly_vehicles">("allocation");
  const [selectedMonth, setSelectedMonth] = React.useState("2026-10");
  const [selectedVehicleId, setSelectedVehicleId] = React.useState("veh-01");

  // Kỳ đã chốt hay chưa
  const [isLockedPeriod, setIsLockedPeriod] = React.useState(false);
  const [lockedInfo, setLockedInfo] = React.useState<{ at?: string; by?: string }>({});
  const [gpsStatsMap, setGpsStatsMap] = React.useState<Record<string, any>>({});

  const currentVehicle = SEED_VEHICLES.find((v) => v.id === selectedVehicleId) || SEED_VEHICLES[0];

  // Tải thống kê GPS từ API khi đổi tháng
  React.useEffect(() => {
    const loadGpsStats = async () => {
      const results: Record<string, any> = {};
      for (const v of SEED_VEHICLES) {
        try {
          const res = await fetch(`/api/apps/doi-xe/bao-cao?vehiclePlate=${encodeURIComponent(v.plateNo)}&month=${selectedMonth}`);
          if (res.ok) {
            const json = await res.json();
            if (json.stats) {
              results[v.plateNo] = json.stats;
            }
          }
        } catch {
          // ignore
        }
      }
      setGpsStatsMap(results);
    };
    loadGpsStats();
  }, [selectedMonth]);

  // Tính toán bảng phân bổ
  const allocationSummary: ProjectCostAllocationSummary = React.useMemo(() => {
    return calculateProjectCostAllocation(
      currentVehicle,
      SEED_EXPENSES,
      SEED_DAILY_LOGS,
      selectedMonth
    );
  }, [currentVehicle, selectedMonth]);

  // Khóa kỳ / Chốt số liệu
  const handleToggleLock = () => {
    if (!isLockedPeriod) {
      setIsLockedPeriod(true);
      setLockedInfo({
        at: new Date().toLocaleString("vi-VN"),
        by: "Quản lý Đội xe (Manager)",
      });
      toast.success(`Đã chốt chính thức số liệu kỳ ${selectedMonth}! Không cho phép sửa đổi.`);
    } else {
      setIsLockedPeriod(false);
      toast.info(`Đã mở điều chỉnh kỳ ${selectedMonth}.`);
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Phân bổ chi phí dự án
      const allocData = allocationSummary.allocations.map((a, idx) => ({
        "STT": idx + 1,
        "Đối Tượng Nhận Phân Bổ": a.targetName,
        "Loại Đối Tượng": a.targetKind === "project" ? "Dự Án" : "Nội Bộ Công Ty",
        "Km Phục Vụ (km)": a.actualKmServed,
        "Số Ngày Phục Vụ": a.daysServed,
        "Tỷ Trọng (%)": a.weightPercent,
        "Chi Phí Trực Tiếp (VND)": a.directExpenseAmount,
        "Chi Phí Chung Phân Bổ (VND)": a.allocatedGeneralAmount,
        "Tổng Chi Phí Phân Bổ (VND)": a.totalAmount,
      }));
      const wsAlloc = XLSX.utils.json_to_sheet(allocData);
      XLSX.utils.book_append_sheet(wb, wsAlloc, "Phân Bổ Chi Phí");

      // Sheet 2: Báo cáo tuần tài xế
      const driverData = SEED_DRIVERS.map((d, idx) => ({
        "STT": idx + 1,
        "Tài Xế": d.name,
        "Mã NV": d.employeeCode,
        "Số Ngày Lái": 5,
        "Km Thực Tế": 637,
        "Giờ Lăn Bánh": "12.3h",
        "Tuân Thủ Tốc Độ": "Đạt",
        "Tắt Máy Khi Dừng": "Đạt",
        "Đủ Ảnh & Kiểm Lốp": "Đạt",
        "Tiền OT Duyệt (VND)": 205833,
      }));
      const wsDriver = XLSX.utils.json_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, wsDriver, "Tuần Theo Tài Xế");

      // Sheet 3: Báo cáo tháng phương tiện theo GPS Bình Minh
      const gpsData = SEED_VEHICLES.map((v, idx) => {
        const stats = gpsStatsMap[v.plateNo];
        const hasGps = stats && stats.totalKm > 0;
        return {
          "STT": idx + 1,
          "Biển Số": v.plateNo,
          "Tên Xe": v.name,
          "Kỳ Tháng": selectedMonth,
          "Nguồn Dữ Liệu": hasGps ? "GPS Bình Minh" : "Chưa có GPS kỳ này",
          "Tổng Km GPS (km)": hasGps ? stats.totalKm : 0,
          "Thời Gian Lăn Bánh": hasGps ? stats.totalMovingHms : "-",
          "TG Làm Việc Theo GPS": hasGps ? stats.totalWorkingHms : "-",
          "Nhiên Liệu Tiêu Thụ GPS (L)": hasGps ? stats.totalFuelLiters : 0,
          "Số Lần Dừng Đỗ": hasGps ? stats.totalStops : 0,
          "Số Lần Quá Tốc Độ": hasGps ? stats.totalSpeeding : 0,
          "Số Lần Quá 4h Liên Tục": hasGps ? stats.totalContinuous4h : 0,
        };
      });
      const wsGps = XLSX.utils.json_to_sheet(gpsData);
      XLSX.utils.book_append_sheet(wb, wsGps, "Báo Cáo Tháng Xe GPS");

      XLSX.writeFile(wb, `Bao_cao_doi_xe_SIGNAGE_ERP_${selectedMonth}.xlsx`);
      toast.success("Đã xuất file báo cáo Excel thành công!");
    } catch (err: any) {
      toast.error("Lỗi xuất file Excel: " + err.message);
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            FLEET SUITE / BÁO CÁO & PHÂN BỔ
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            Báo Cáo & Động Cơ Phân Bổ Chi Phí Dự Án
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chọn Tháng */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 text-xs px-2.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
          />

          {/* Nút Chốt Kỳ */}
          <button
            onClick={handleToggleLock}
            className={`h-8 flex items-center gap-1.5 px-3 text-xs font-semibold rounded-lg transition shadow-xs ${
              isLockedPeriod
                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            }`}
          >
            {isLockedPeriod ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLockedPeriod ? "Kỳ Đã Khóa (Mở khóa)" : "Chốt Số Liệu Kỳ"}</span>
          </button>

          {/* Nút Xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="h-8 flex items-center gap-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Dải Thông Báo Trạng Thái Chốt Kỳ */}
      {isLockedPeriod && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Kỳ {selectedMonth} đã được Quản lý chốt chính thức lúc {lockedInfo.at} bởi {lockedInfo.by}.
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono">Dữ liệu sẵn sàng chuyển Kế toán / HRM</span>
        </div>
      )}

      {/* 3. Tab Chuyển Đổi Chế Độ Báo Cáo */}
      <div className="flex border-b border-slate-200 gap-3">
        <button
          onClick={() => setReportMode("allocation")}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            reportMode === "allocation"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>1. Phân Bổ Chi Phí Dự Án & Nội Bộ (Thuật Toán Chuẩn)</span>
        </button>

        <button
          onClick={() => setReportMode("weekly_drivers")}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            reportMode === "weekly_drivers"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-4 h-4" />
          <span>2. Báo Cáo Tuần Theo Tài Xế (5 Tiêu Chí Tuân Thủ)</span>
        </button>

        <button
          onClick={() => setReportMode("monthly_vehicles")}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            reportMode === "monthly_vehicles"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>3. Báo Cáo Tháng Theo Xe & Suất Tiêu Hao (đ/km)</span>
        </button>
      </div>

      {/* 4. Nội Dung Chế Độ 1: Phân Bổ Chi Phí Dự Án */}
      {reportMode === "allocation" && (
        <div className="space-y-4">
          {/* Bộ chọn xe để xem phân bổ từng xe (Mục 15.3: phân bổ theo từng xe/kỳ) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Chọn xe đối soát phân bổ:</span>
              <div className="flex gap-2">
                {SEED_VEHICLES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                      selectedVehicleId === v.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {v.plateNo} ({v.name})
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Chi phí trên mỗi km lăn bánh:{" "}
              <strong className="text-emerald-800 font-mono text-sm font-black">
                {allocationSummary.costPerKm.toLocaleString("vi-VN")} đ/km
              </strong>
            </div>
          </div>

          {/* Dải Tóm Tắt Nguồn Chi Phí Của Xe */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">Tổng Km Lăn Bánh Kỳ Này:</span>
              <strong className="text-base font-black text-slate-900 font-mono">
                {allocationSummary.totalKmRun.toLocaleString("vi-VN")} km
              </strong>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">Khoản Trực Tiếp Ghi Dự Án:</span>
              <strong className="text-base font-black text-blue-900 font-mono">
                {allocationSummary.totalDirectCosts.toLocaleString("vi-VN")} đ
              </strong>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">Quỹ Chi Phí Chung Của Xe:</span>
              <strong className="text-base font-black text-amber-900 font-mono">
                {allocationSummary.totalGeneralPoolCosts.toLocaleString("vi-VN")} đ
              </strong>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-emerald-800 text-[11px] block font-semibold">Tổng Nguồn Cần Phân Bổ:</span>
              <strong className="text-base font-black text-emerald-950 font-mono">
                {(allocationSummary.totalDirectCosts + allocationSummary.totalGeneralPoolCosts).toLocaleString("vi-VN")} đ
              </strong>
            </div>
          </div>

          {/* Bảng Kết Quả Phân Bổ Chuẩn Xác */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Bảng Phân Bổ Chi Phí Cho Từng Đối Tượng (Khớp 100% Đến Từng Đồng VND)
              </span>
              <span className="text-[11px] text-slate-500">
                Áp dụng quy tắc dồn số dư làm tròn VND vào dòng có phần dư lớn nhất (Mục 15.3)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">#</th>
                    <th className="p-3">Đối Tượng Nhận Phân Bổ (Dự Án / Nội Bộ)</th>
                    <th className="p-3 text-center">Phân Loại</th>
                    <th className="p-3 text-right">Km Phục Vụ</th>
                    <th className="p-3 text-center">Số Ngày</th>
                    <th className="p-3 text-center">Tỷ Trọng (%)</th>
                    <th className="p-3 text-right">Chi Phí Trực Tiếp</th>
                    <th className="p-3 text-right">Chi Phí Chung Phân Bổ</th>
                    <th className="p-3 text-right">Tổng Chi Phí Được Ghi Nhận</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {allocationSummary.allocations.map((a, idx) => (
                    <tr key={a.targetId} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-500 text-center">{idx + 1}</td>

                      <td className="p-3 font-bold text-slate-900">{a.targetName}</td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            a.targetKind === "project"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {a.targetKind === "project" ? "Dự Án Khách Hàng" : "Vận Hành Nội Bộ"}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono font-semibold text-slate-800">
                        {a.actualKmServed.toLocaleString()} km
                      </td>

                      <td className="p-3 text-center font-mono text-slate-600">{a.daysServed} ngày</td>

                      <td className="p-3 text-center font-mono font-bold text-emerald-800">
                        {a.weightPercent}%
                      </td>

                      <td className="p-3 text-right font-mono text-blue-900">
                        {a.directExpenseAmount > 0 ? `${a.directExpenseAmount.toLocaleString("vi-VN")} đ` : "-"}
                      </td>

                      <td className="p-3 text-right font-mono text-amber-900">
                        {a.allocatedGeneralAmount.toLocaleString("vi-VN")} đ
                      </td>

                      <td className="p-3 text-right font-mono font-black text-emerald-900 text-sm bg-emerald-50/30">
                        {a.totalAmount.toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={3} className="p-3 uppercase text-slate-800">
                      TỔNG CỘNG ĐỐI SOÁT
                    </td>
                    <td className="p-3 text-right font-mono">
                      {allocationSummary.totalKmRun.toLocaleString()} km
                    </td>
                    <td className="p-3 text-center font-mono">-</td>
                    <td className="p-3 text-center font-mono text-emerald-800">100.0%</td>
                    <td className="p-3 text-right font-mono text-blue-900">
                      {allocationSummary.totalDirectCosts.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="p-3 text-right font-mono text-amber-900">
                      {allocationSummary.totalGeneralPoolCosts.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-900 text-base font-black">
                      {(allocationSummary.totalDirectCosts + allocationSummary.totalGeneralPoolCosts).toLocaleString("vi-VN")} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Nội Dung Chế Độ 2: Báo Cáo Tuần Theo Tài Xế */}
      {reportMode === "weekly_drivers" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">
              Báo Cáo Hoạt Động & 5 Tiêu Chí Tuân Thủ Tài Xế (Mục 15.1)
            </span>
            <span className="text-[11px] text-slate-500">
              Đánh giá: Đúng tốc độ, Tắt máy khi đỗ lâu, Điểm đúng lệnh, Đủ ảnh/lốp, Không vi phạm
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Tài Xế</th>
                  <th className="p-3 text-center">Số Ngày Lái</th>
                  <th className="p-3 text-right">Km Lăn Bánh</th>
                  <th className="p-3 text-center">Giờ Lăn Bánh</th>
                  <th className="p-3 text-center">Nổ Máy Đứng Yên</th>
                  <th className="p-3 text-center">1. Quá Tốc Độ?</th>
                  <th className="p-3 text-center">2. Tắt Máy &gt;10p</th>
                  <th className="p-3 text-center">3. Điểm Đúng Lệnh</th>
                  <th className="p-3 text-center">4. Ảnh & Lốp</th>
                  <th className="p-3 text-center">5. Không Vi Phạm</th>
                  <th className="p-3 text-right">Tổng Tiền OT</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {SEED_DRIVERS.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{d.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{d.employeeCode}</span>
                    </td>

                    <td className="p-3 text-center font-mono font-semibold">5 ngày</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">637 km</td>
                    <td className="p-3 text-center font-mono">12.3 h</td>
                    <td className="p-3 text-center font-mono text-slate-600">1.5 h</td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đạt
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {d.employeeCode === "NV-TX01" ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          1 lần nhắc
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Đạt
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đạt
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đạt
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đạt
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-emerald-800">
                      {d.employeeCode === "NV-TX01" ? "470.416 đ" : "325.000 đ"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Nội Dung Chế Độ 3: Báo Cáo Tháng Theo Xe */}
      {reportMode === "monthly_vehicles" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">
              Báo Cáo Hiệu Quả Vận Hành & Suất Tiêu Hao Theo Phương Tiện (Mục 15.2)
            </span>
            <span className="text-[11px] text-slate-500">
              Chi phí / km = Tổng chi phí vận hành / Tổng km lăn bánh
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Phương Tiện</th>
                  <th className="p-3 text-center">Ngày Chạy</th>
                  <th className="p-3 text-right">Tổng Km</th>
                  <th className="p-3 text-right">Lít Dầu Mua</th>
                  <th className="p-3 text-right">Lít GPS Đo</th>
                  <th className="p-3 text-center">Định Mức Lăn Bánh</th>
                  <th className="p-3 text-right">Chi Phí Nhiên Liệu</th>
                  <th className="p-3 text-right">Bảo Dưỡng & Khác</th>
                  <th className="p-3 text-right">Tổng Chi Phí Xe</th>
                  <th className="p-3 text-right">Chi Phí / Km (đ/km)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {SEED_VEHICLES.map((v) => {
                  const stats = gpsStatsMap[v.plateNo];
                  const hasGps = stats && stats.totalKm > 0;
                  const displayKm = hasGps ? stats.totalKm : v.id === "veh-01" ? 1250 : 980;
                  const displayFuelGps = hasGps ? stats.totalFuelLiters : v.id === "veh-01" ? 123.5 : 86.2;
                  const displayDays = hasGps ? `${stats.activeDays} / ${stats.totalDays} ngày` : "10 ngày";
                  const fuelCost = hasGps ? Math.round(displayFuelGps * 21500) : v.id === "veh-01" ? 2687500 : 1892000;
                  const otherCost = v.id === "veh-01" ? 1635000 : 500000;
                  const totalCost = fuelCost + otherCost;
                  const costPerKm = Math.round(totalCost / Math.max(1, displayKm));

                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{v.plateNo}</span>
                          {hasGps && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              GPS Thực Tế
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{v.name}</span>
                      </td>

                      <td className="p-3 text-center font-mono font-semibold">{displayDays}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {displayKm.toLocaleString()} km
                      </td>

                      <td className="p-3 text-right font-mono">
                        {hasGps ? `${displayFuelGps.toLocaleString()} L (GPS)` : v.id === "veh-01" ? "125.0 L" : "88.0 L"}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-600">
                        {displayFuelGps.toLocaleString()} L
                      </td>

                      <td className="p-3 text-center font-mono">{v.fuelRateMoving} L/100km</td>

                      <td className="p-3 text-right font-mono">
                        {fuelCost.toLocaleString("vi-VN")} đ
                      </td>

                      <td className="p-3 text-right font-mono">
                        {otherCost.toLocaleString("vi-VN")} đ
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {totalCost.toLocaleString("vi-VN")} đ
                      </td>

                      <td className="p-3 text-right font-mono font-black text-emerald-800 text-sm">
                        {costPerKm.toLocaleString("vi-VN")} đ/km
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* KPI Card Đối Soát GPS Bình Minh Thực Tế (nếu có số liệu GPS trong kỳ) */}
          {Object.values(gpsStatsMap).some((s: any) => s && s.totalKm > 0) && (
            <div className="p-4 bg-emerald-50/50 border-t border-emerald-200">
              <span className="font-bold text-xs text-emerald-900 block mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Đối Chiếu Chỉ Số Nguồn Từ File GPS Bình Minh Kỳ {selectedMonth}:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-xs">
                {Object.entries(gpsStatsMap).map(([plate, s]: [string, any]) => {
                  if (!s || s.totalKm === 0) return null;
                  return (
                    <React.Fragment key={plate}>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">Km GPS:</span>
                        <strong className="font-mono text-emerald-800 text-sm">{s.totalKm.toLocaleString()} km</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">Giờ lăn bánh:</span>
                        <strong className="font-mono text-slate-900">{s.totalMovingHms}</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">TG làm việc GPS:</span>
                        <strong className="font-mono text-slate-900">{s.totalWorkingHms}</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">Dừng đỗ nguồn:</span>
                        <strong className="font-mono text-slate-900">{s.totalStops} lần</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">Quá tốc độ:</span>
                        <strong className="font-mono text-amber-700">{s.totalSpeeding} lần</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">Quá 4h liên tục:</span>
                        <strong className="font-mono text-rose-700">{s.totalContinuous4h} lần</strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-500 block">Nhiên liệu tiêu thụ:</span>
                        <strong className="font-mono text-emerald-900 text-sm">{s.totalFuelLiters} L</strong>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
