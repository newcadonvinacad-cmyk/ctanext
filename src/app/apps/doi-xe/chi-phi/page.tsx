"use client";

import * as React from "react";
import Link from "next/link";
import {
  Fuel,
  Receipt,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Camera,
  FileText,
  DollarSign,
  TrendingDown,
  Gauge,
  User,
  Truck,
  Filter,
  Search,
} from "lucide-react";
import {
  SEED_FUEL_RECORDS,
  SEED_EXPENSES,
  SEED_VEHICLES,
  FuelRefillRecord,
  FleetExpenseRecord,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

export default function ExpensesAndFuelPage() {
  const [activeTab, setActiveTab] = React.useState<"fuel" | "expenses">("fuel");
  const [fuelRecords, setFuelRecords] = React.useState<FuelRefillRecord[]>(SEED_FUEL_RECORDS);
  const [expenses, setExpenses] = React.useState<FleetExpenseRecord[]>(SEED_EXPENSES);

  const [selectedVehicle, setSelectedVehicle] = React.useState("all");

  // Modal Thêm Đổ Dầu
  const [showAddFuelModal, setShowAddFuelModal] = React.useState(false);
  const [newFuel, setNewFuel] = React.useState({
    refillTime: new Date().toISOString().slice(0, 16),
    vehicleId: "veh-01",
    gasStation: "Cây xăng Petrolimex 18, Đồng Nai",
    invoiceNumber: "",
    invoiceLiters: 40,
    unitPriceVnd: 21500,
    currentOdoKm: 142800,
    isFullTank: true,
    gpsReportedLiters: 39.5,
    photoReceiptAttached: true,
    photoPumpAttached: true,
    notes: "",
  });

  // Modal Thêm Khoản Chi
  const [showAddExpenseModal, setShowAddExpenseModal] = React.useState(false);
  const [newExpense, setNewExpense] = React.useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    vehicleId: "veh-01",
    expenseType: "toll_epass" as FleetExpenseRecord["expenseType"],
    amountVnd: 150000,
    payer: "company" as FleetExpenseRecord["payer"],
    allocationTarget: "general_fleet_pool" as FleetExpenseRecord["allocationTarget"],
    targetProjectName: "",
    invoiceDocNo: "",
    description: "",
  });

  const filteredFuel = fuelRecords.filter((f) => {
    if (selectedVehicle !== "all" && f.vehicleId !== selectedVehicle) return false;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (selectedVehicle !== "all" && e.vehicleId !== selectedVehicle) return false;
    return true;
  });

  const totalFuelLitersBought = filteredFuel.reduce((sum, f) => sum + f.invoiceLiters, 0);
  const totalFuelCost = filteredFuel.reduce((sum, f) => sum + f.totalAmountVnd, 0);
  const totalAllExpenses = filteredExpenses.reduce((sum, e) => sum + e.amountVnd, 0);

  // Thêm Đổ Dầu
  const handleSaveFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = SEED_VEHICLES.find((v) => v.id === newFuel.vehicleId) || SEED_VEHICLES[0];
    const totalAmount = Math.round(newFuel.invoiceLiters * newFuel.unitPriceVnd);

    let variancePercent = 0;
    if (newFuel.gpsReportedLiters) {
      variancePercent = Math.round(
        (Math.abs(newFuel.invoiceLiters - newFuel.gpsReportedLiters) / newFuel.invoiceLiters) * 1000
      ) / 10;
    }

    const created: FuelRefillRecord = {
      id: `fuel-${Date.now()}`,
      refillTime: newFuel.refillTime,
      vehicleId: veh.id,
      vehiclePlate: veh.plateNo,
      driverId: veh.defaultDriverId,
      driverName: veh.defaultDriverName,
      gasStation: newFuel.gasStation,
      invoiceNumber: newFuel.invoiceNumber || `HD-${Date.now().toString().slice(-6)}`,
      invoiceLiters: Number(newFuel.invoiceLiters),
      unitPriceVnd: Number(newFuel.unitPriceVnd),
      totalAmountVnd: totalAmount,
      currentOdoKm: Number(newFuel.currentOdoKm),
      isFullTank: newFuel.isFullTank,
      gpsReportedLiters: newFuel.gpsReportedLiters ? Number(newFuel.gpsReportedLiters) : undefined,
      fuelVariancePercent: variancePercent,
      isVarianceAlert: variancePercent > 10,
      photoReceiptAttached: newFuel.photoReceiptAttached,
      photoPumpAttached: newFuel.photoPumpAttached,
      payerType: "company",
      notes: newFuel.notes,
    };

    setFuelRecords([created, ...fuelRecords]);

    // Tự động tạo một dòng trong Sổ chi phí (NT26: một khoản tiền có một nguồn duy nhất)
    const newExp: FleetExpenseRecord = {
      id: `exp-${Date.now()}`,
      expenseDate: newFuel.refillTime.slice(0, 10),
      vehicleId: veh.id,
      vehiclePlate: veh.plateNo,
      expenseType: "fuel",
      amountVnd: totalAmount,
      payer: "company",
      allocationTarget: "general_fleet_pool",
      invoiceDocNo: created.invoiceNumber,
      isConfirmed: true,
      sourceReferenceId: created.id,
      paymentStatus: "paid",
      description: `Đổ dầu ${created.invoiceLiters}L tại ${created.gasStation}`,
    };
    setExpenses([newExp, ...expenses]);

    setShowAddFuelModal(false);
    toast.success(`Đã thêm phiếu nạp dầu: ${totalAmount.toLocaleString("vi-VN")} đ`);
  };

  // Thêm Khoản Chi Phí Khác
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = SEED_VEHICLES.find((v) => v.id === newExpense.vehicleId) || SEED_VEHICLES[0];

    const created: FleetExpenseRecord = {
      id: `exp-${Date.now()}`,
      expenseDate: newExpense.expenseDate,
      vehicleId: veh.id,
      vehiclePlate: veh.plateNo,
      expenseType: newExpense.expenseType,
      amountVnd: Number(newExpense.amountVnd),
      payer: newExpense.payer,
      allocationTarget: newExpense.allocationTarget,
      targetProjectName: newExpense.targetProjectName || undefined,
      invoiceDocNo: newExpense.invoiceDocNo || undefined,
      isConfirmed: true,
      paymentStatus: "paid",
      description: newExpense.description || "Khoản chi phí vận hành xe",
    };

    setExpenses([created, ...expenses]);
    setShowAddExpenseModal(false);
    toast.success("Đã ghi nhận khoản chi phí vào sổ tổng hợp!");
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <Fuel className="w-4 h-4" />
            </span>
            Quản Lý Chi Phí & Sổ Đổ Dầu Đội Xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bóc tách 3 khái niệm nhiên liệu (mua / GPS / đầy bình), cảnh báo lệch nạp &gt;10% và sổ chi phí tổng hợp
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc Xe */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
          >
            <option value="all">Tất cả xe</option>
            {SEED_VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNo} ({v.name})
              </option>
            ))}
          </select>

          {/* Nút Thêm Đổ Dầu */}
          <button
            onClick={() => setShowAddFuelModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Thêm Phiếu Đổ Dầu</span>
          </button>

          {/* Nút Thêm Chi Phí */}
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Khoản Chi Khác</span>
          </button>
        </div>
      </div>

      {/* 2. Dải KPI Tổng Quan Chi Phí & Nhiên Liệu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lượng dầu đã mua */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">1. Lượng Dầu Đã Mua (Hóa Đơn)</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {totalFuelLitersBought.toLocaleString("vi-VN")} Lít
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Thành tiền: {totalFuelCost.toLocaleString("vi-VN")} đ
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Fuel className="w-5 h-5" />
          </div>
        </div>

        {/* Tiêu hao đầy bình thực nghiệm */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">2. Suất Tiêu Hao Đầy Bình</span>
            <div className="text-2xl font-black text-emerald-800 font-mono mt-1">
              10.0 L/100km
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Đoạn 420 km khép chu kỳ (HINO 51D-982.46)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* Tổng chi phí vận hành */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">3. Tổng Chi Phí Sổ Quỹ</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {totalAllExpenses.toLocaleString("vi-VN")} đ
            </div>
            <span className="text-[11px] text-slate-500">
              Gồm Dầu, OT, Cầu đường, Bảo dưỡng
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Tab Chuyển Đổi: Sổ Đổ Dầu vs Sổ Chi Phí Tổng Hợp */}
      <div className="flex border-b border-slate-200 gap-3">
        <button
          onClick={() => setActiveTab("fuel")}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === "fuel"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>Sổ Đổ Dầu Chuyên Sâu ({filteredFuel.length} phiếu)</span>
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
            activeTab === "expenses"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sổ Chi Phí Tổng Hợp ({filteredExpenses.length} khoản)</span>
        </button>
      </div>

      {/* 4. Nội Dung Tab 1: Sổ Đổ Dầu */}
      {activeTab === "fuel" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">
              Nhật Ký Nạp Nhiên Liệu & Đối Soát GPS Cảm Biến
            </span>
            <span className="text-[11px] text-slate-500">
              Cảnh báo khi chênh lệch &gt; 10% giữa Hóa đơn vs GPS hoặc thiếu ảnh
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Thời Gian & Số HĐ</th>
                  <th className="p-3">Phương Tiện & Tài Xế</th>
                  <th className="p-3">Cây Xăng / Trạm Bơm</th>
                  <th className="p-3 text-right">Lít Hóa Đơn</th>
                  <th className="p-3 text-right">Đơn Giá / Thành Tiền</th>
                  <th className="p-3 text-center">Đồng Hồ ODO</th>
                  <th className="p-3 text-center">Đầy Bình?</th>
                  <th className="p-3 text-right">GPS Ghi Nhận</th>
                  <th className="p-3 text-center">Chênh Lệch</th>
                  <th className="p-3 text-center">Bằng Chứng Ảnh</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredFuel.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-900">
                        {new Date(f.refillTime).toLocaleDateString("vi-VN")}{" "}
                        <span className="text-[11px] text-slate-500 font-normal">
                          {new Date(f.refillTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">{f.invoiceNumber}</span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                          {f.vehiclePlate}
                        </span>
                        <span className="font-semibold text-slate-800">{f.driverName}</span>
                      </div>
                    </td>

                    <td className="p-3 text-slate-700 max-w-[180px] truncate" title={f.gasStation}>
                      {f.gasStation}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {f.invoiceLiters} L
                    </td>

                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-slate-900">{f.totalAmountVnd.toLocaleString("vi-VN")} đ</div>
                      <span className="text-[10px] text-slate-400">@{f.unitPriceVnd.toLocaleString()} đ/L</span>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {f.currentOdoKm.toLocaleString("vi-VN")} km
                    </td>

                    <td className="p-3 text-center">
                      {f.isFullTank ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                          ĐẦY BÌNH
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          Nạp 1 phần
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right font-mono text-slate-800">
                      {f.gpsReportedLiters ? `${f.gpsReportedLiters} L` : <span className="text-slate-400">Chưa có</span>}
                    </td>

                    <td className="p-3 text-center font-mono">
                      {f.isVarianceAlert ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 text-[10px] flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Lệch {f.fuelVariancePercent}%
                        </span>
                      ) : f.fuelVariancePercent !== undefined ? (
                        <span className="text-emerald-700 text-[11px] font-semibold">
                          {f.fuelVariancePercent}% (Đạt)
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          title={f.photoReceiptAttached ? "Có ảnh hóa đơn" : "Thiếu ảnh hóa đơn"}
                          className={`w-2.5 h-2.5 rounded-full ${
                            f.photoReceiptAttached ? "bg-emerald-500" : "bg-rose-400"
                          }`}
                        />
                        <span
                          title={f.photoPumpAttached ? "Có ảnh cột bơm" : "Thiếu ảnh cột bơm"}
                          className={`w-2.5 h-2.5 rounded-full ${
                            f.photoPumpAttached ? "bg-emerald-500" : "bg-rose-400"
                          }`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Nội Dung Tab 2: Sổ Chi Phí Tổng Hợp */}
      {activeTab === "expenses" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">
              Sổ Chi Phí Vận Hành Toàn Đội Xe (Một Sổ Duy Nhất)
            </span>
            <span className="text-[11px] text-slate-500">
              Chi phí đổ dầu & Tăng ca tự động lấy từ nguồn, không nhập trùng (Mục 12.4)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Ngày Phát Sinh</th>
                  <th className="p-3">Phương Tiện</th>
                  <th className="p-3">Loại Chi Phí</th>
                  <th className="p-3">Nội Dung / Diễn Giải</th>
                  <th className="p-3 text-right">Số Tiền (VNĐ)</th>
                  <th className="p-3 text-center">Bên Chịu</th>
                  <th className="p-3 text-center">Phân Bổ Chi Phí</th>
                  <th className="p-3 text-center">Chứng Từ</th>
                  <th className="p-3 text-center">Thanh Toán</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {exp.expenseDate.split("-").reverse().join("/")}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                        {exp.vehiclePlate}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          exp.expenseType === "fuel"
                            ? "bg-amber-100 text-amber-900"
                            : exp.expenseType === "overtime"
                            ? "bg-purple-100 text-purple-900"
                            : exp.expenseType === "toll_epass"
                            ? "bg-blue-100 text-blue-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {exp.expenseType === "fuel"
                          ? "Nhiên liệu (Dầu)"
                          : exp.expenseType === "overtime"
                          ? "Tăng ca (OT)"
                          : exp.expenseType === "toll_epass"
                          ? "Phí cầu đường"
                          : "Bảo dưỡng"}
                      </span>
                    </td>

                    <td className="p-3 font-medium text-slate-800">{exp.description}</td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {exp.amountVnd.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {exp.payer === "company" ? "Công ty chịu" : "Tài xế chịu"}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {exp.allocationTarget === "direct_project" ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800 text-[10px]">
                          Trực tiếp Dự án
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          Chi phí chung đội xe
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center font-mono text-[10px] text-slate-600">
                      {exp.invoiceDocNo || "-"}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Đã thanh toán
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Modal Thêm Đổ Dầu */}
      {showAddFuelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-emerald-700" />
                Thêm Phiếu Đổ Dầu Mới
              </h3>
              <button onClick={() => setShowAddFuelModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFuel} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phương Tiện *</label>
                  <select
                    value={newFuel.vehicleId}
                    onChange={(e) => setNewFuel({ ...newFuel, vehicleId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {SEED_VEHICLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNo} ({v.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời Gian Nạp *</label>
                  <input
                    type="datetime-local"
                    value={newFuel.refillTime}
                    onChange={(e) => setNewFuel({ ...newFuel, refillTime: e.target.value })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cây Xăng / Trạm Bơm *</label>
                <input
                  type="text"
                  required
                  value={newFuel.gasStation}
                  onChange={(e) => setNewFuel({ ...newFuel, gasStation: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Lít Hóa Đơn *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newFuel.invoiceLiters}
                    onChange={(e) => setNewFuel({ ...newFuel, invoiceLiters: Number(e.target.value) })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Đơn Giá (đ/L) *</label>
                  <input
                    type="number"
                    required
                    value={newFuel.unitPriceVnd}
                    onChange={(e) => setNewFuel({ ...newFuel, unitPriceVnd: Number(e.target.value) })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Số ODO (km) *</label>
                  <input
                    type="number"
                    required
                    value={newFuel.currentOdoKm}
                    onChange={(e) => setNewFuel({ ...newFuel, currentOdoKm: Number(e.target.value) })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lít Cảm Biến GPS Nạp</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ví dụ: 39.5"
                    value={newFuel.gpsReportedLiters || ""}
                    onChange={(e) => setNewFuel({ ...newFuel, gpsReportedLiters: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số Hóa Đơn VAT</label>
                  <input
                    type="text"
                    placeholder="HD-0091234"
                    value={newFuel.invoiceNumber}
                    onChange={(e) => setNewFuel({ ...newFuel, invoiceNumber: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Tùy chọn Đầy bình */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Có đổ đầy bình không?</span>
                  <span className="text-[11px] text-slate-500">
                    Mốc đầy bình dùng để tính suất tiêu hao thực nghiệm L/100km
                  </span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFuel.isFullTank}
                    onChange={(e) => setNewFuel({ ...newFuel, isFullTank: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-bold text-emerald-800">ĐẦY BÌNH</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddFuelModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu Phiếu Đổ Dầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Thêm Khoản Chi Khác */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-700" />
                Ghi Nhận Khoản Chi Phí Xe
              </h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại Chi Phí *</label>
                <select
                  value={newExpense.expenseType}
                  onChange={(e) => setNewExpense({ ...newExpense, expenseType: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="toll_epass">Phí cầu đường / Vé trạm / ePass</option>
                  <option value="parking">Phí gửi xe qua đêm</option>
                  <option value="maintenance">Bảo dưỡng định kỳ</option>
                  <option value="repair_parts">Sửa chữa / Thay thế phụ tùng</option>
                  <option value="tyres">Thay vỏ / Vá lốp</option>
                  <option value="inspection_insurance">Phí đăng kiểm / Bảo hiểm</option>
                  <option value="incident_penalty">Sự cố / Phạt vi phạm</option>
                  <option value="other">Khoản chi khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diễn Giải Nội Dung *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nạp tiền thẻ ePass VETC 500.000 đ"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số Tiền (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={newExpense.amountVnd}
                    onChange={(e) => setNewExpense({ ...newExpense, amountVnd: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đối Tượng Phân Bổ</label>
                  <select
                    value={newExpense.allocationTarget}
                    onChange={(e) => setNewExpense({ ...newExpense, allocationTarget: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="general_fleet_pool">Chi phí chung đội xe</option>
                    <option value="direct_project">Ghi thẳng cho Dự Án</option>
                    <option value="internal_operations">Nội bộ công ty</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                >
                  Lưu Khoản Chi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
