"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CircleDollarSign,
  FileSpreadsheet,
  Check,
  X,
  Sliders,
  Send,
  User,
  Truck,
  HelpCircle,
  ArrowRight,
  Filter,
  Search,
} from "lucide-react";
import {
  SEED_OVERTIME_RECORDS,
  OvertimeApprovalRecord,
  calculateOtAmount,
  splitOtProportionally,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

export default function OvertimeApprovalPage() {
  const [records, setRecords] = React.useState<OvertimeApprovalRecord[]>(SEED_OVERTIME_RECORDS);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<OvertimeApprovalRecord | null>(null);

  // State cho Modal duyệt một phần
  const [showPartialModal, setShowPartialModal] = React.useState(false);
  const [partialMinutesTarget, setPartialMinutesTarget] = React.useState(120);
  const [partialK1, setPartialK1] = React.useState(0);
  const [partialK2, setPartialK2] = React.useState(0);
  const [partialK3, setPartialK3] = React.useState(0);
  const [partialK4, setPartialK4] = React.useState(0);

  // State cho Modal từ chối
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const filteredRecords = records.filter((r) => {
    if (statusFilter !== "all" && r.approvalStatus !== statusFilter) return false;
    return true;
  });

  const pendingCount = records.filter((r) => r.approvalStatus === "pending").length;
  const approvedTotalSum = records
    .filter((r) => r.approvalStatus.startsWith("approved"))
    .reduce((sum, r) => sum + r.approvedTotalAmount, 0);

  // Duyệt đủ
  const handleApproveFull = (recordId: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          approvalStatus: "approved_full",
          approvedMinsK1: r.minsK1_Morning,
          approvedMinsK2: r.minsK2_Evening,
          approvedMinsK3: r.minsK3_LateNight,
          approvedMinsK4: r.minsK4_Midnight,
          approvedTotalAmount: r.proposedTotalAmount,
          approvalMode: "by_windows",
          approvedBy: "Quản lý Đội xe (Manager)",
          approvedAt: new Date().toISOString(),
          decisionReason: "Duyệt đủ theo đề xuất chặng máy GPS hợp lệ",
        };
      })
    );
    toast.success("Đã phê duyệt đủ toàn bộ giờ tăng ca!");
  };

  // Mở modal duyệt một phần
  const handleOpenPartial = (record: OvertimeApprovalRecord) => {
    setSelectedRecord(record);
    const halfTarget = Math.round((record.minsK1_Morning + record.minsK2_Evening + record.minsK3_LateNight + record.minsK4_Midnight) / 2);
    setPartialMinutesTarget(halfTarget);

    const split = splitOtProportionally(
      halfTarget,
      record.minsK1_Morning,
      record.minsK2_Evening,
      record.minsK3_LateNight,
      record.minsK4_Midnight
    );
    setPartialK1(split.k1);
    setPartialK2(split.k2);
    setPartialK3(split.k3);
    setPartialK4(split.k4);
    setShowPartialModal(true);
  };

  // Tự động phân bổ lại theo tỷ lệ
  const handleRecalculateProportional = () => {
    if (!selectedRecord) return;
    const split = splitOtProportionally(
      partialMinutesTarget,
      selectedRecord.minsK1_Morning,
      selectedRecord.minsK2_Evening,
      selectedRecord.minsK3_LateNight,
      selectedRecord.minsK4_Midnight
    );
    setPartialK1(split.k1);
    setPartialK2(split.k2);
    setPartialK3(split.k3);
    setPartialK4(split.k4);
    toast.success("Đã phân bổ lại theo tỷ lệ thời gian các khung gốc!");
  };

  // Lưu duyệt một phần
  const handleSavePartial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const calc = calculateOtAmount(partialK1, partialK2, partialK3, partialK4);

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRecord.id) return r;
        return {
          ...r,
          approvalStatus: "approved_partial",
          approvedMinsK1: partialK1,
          approvedMinsK2: partialK2,
          approvedMinsK3: partialK3,
          approvedMinsK4: partialK4,
          approvedTotalAmount: calc.totalAmount,
          approvalMode: "by_windows",
          approvedBy: "Quản lý Đội xe (Manager)",
          approvedAt: new Date().toISOString(),
          decisionReason: `Duyệt một phần: ${calc.totalHours} giờ (${calc.totalAmount.toLocaleString("vi-VN")} đ)`,
        };
      })
    );

    setShowPartialModal(false);
    toast.success(`Đã duyệt một phần thành công: ${calc.totalAmount.toLocaleString("vi-VN")} đ`);
  };

  // Từ chối duyệt
  const handleOpenReject = (record: OvertimeApprovalRecord) => {
    setSelectedRecord(record);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRecord.id) return r;
        return {
          ...r,
          approvalStatus: "rejected",
          approvedMinsK1: 0,
          approvedMinsK2: 0,
          approvedMinsK3: 0,
          approvedMinsK4: 0,
          approvedTotalAmount: 0,
          approvedBy: "Quản lý Đội xe (Manager)",
          approvedAt: new Date().toISOString(),
          decisionReason: rejectReason || "Không đủ căn cứ tăng ca",
        };
      })
    );

    setShowRejectModal(false);
    toast.error("Đã từ chối duyệt hồ sơ tăng ca.");
  };

  // Duyệt hàng loạt cho các dòng đủ điều kiện
  const handleBatchApprove = () => {
    let count = 0;
    setRecords((prev) =>
      prev.map((r) => {
        if (r.approvalStatus === "pending" && !r.requiresExplanation && r.hasOrder) {
          count++;
          return {
            ...r,
            approvalStatus: "approved_full",
            approvedMinsK1: r.minsK1_Morning,
            approvedMinsK2: r.minsK2_Evening,
            approvedMinsK3: r.minsK3_LateNight,
            approvedMinsK4: r.minsK4_Midnight,
            approvedTotalAmount: r.proposedTotalAmount,
            approvedBy: "Quản lý Đội xe (Batch)",
            approvedAt: new Date().toISOString(),
            decisionReason: "Duyệt hàng loạt các hồ sơ đủ điều kiện",
          };
        }
        return r;
      })
    );

    if (count > 0) {
      toast.success(`Đã duyệt hàng loạt ${count} hồ sơ đủ điều kiện!`);
    } else {
      toast.info("Không có hồ sơ nào đủ điều kiện duyệt hàng loạt hoặc đã duyệt hết.");
    }
  };

  // Xuất bảng OT sang HRM
  const handleSyncToHrm = () => {
    setRecords((prev) =>
      prev.map((r) =>
        r.approvalStatus.startsWith("approved") ? { ...r, hrmSynced: true, hrmPeriod: "2026-10" } : r
      )
    );
    toast.success("Đã đồng bộ kết quả tăng ca sang Phân hệ HRM (Bảng tính lương Tháng 10/2026)!");
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <Clock className="w-4 h-4" />
            </span>
            Hàng Chờ Duyệt Tăng Ca (OT) Đội Xe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân bổ 4 khung giờ tự động, đối chiếu lệnh, kiểm tra định mức (km, tốc độ, giờ về) và xuất sang HRM
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ phê duyệt ({pendingCount})</option>
            <option value="approved_full">Đã duyệt đủ</option>
            <option value="approved_partial">Đã duyệt một phần</option>
            <option value="rejected">Đã từ chối</option>
          </select>

          {/* Duyệt hàng loạt */}
          <button
            onClick={handleBatchApprove}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Duyệt Hàng Loạt</span>
          </button>

          {/* Xuất sang HRM */}
          <button
            onClick={handleSyncToHrm}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Xuất Bảng OT Sang HRM</span>
          </button>
        </div>
      </div>

      {/* 2. Dải Thông Tin Các Khung Giờ & Chính Sách */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
          <div className="text-[11px] font-bold text-amber-900 uppercase">Khung 1: Sáng sớm (K1)</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">04:00 - 08:00</div>
          <div className="text-sm font-black text-amber-800 mt-1 font-mono">75.000 đ/giờ</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Yêu cầu lệnh cho phép OT sáng</div>
        </div>

        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
          <div className="text-[11px] font-bold text-indigo-900 uppercase">Khung 2: Chiều tối (K2)</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">17:00 - 22:00</div>
          <div className="text-sm font-black text-indigo-800 mt-1 font-mono">50.000 đ/giờ</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Yêu cầu lệnh cho phép OT tối</div>
        </div>

        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200">
          <div className="text-[11px] font-bold text-purple-900 uppercase">Khung 3: Đêm khuya (K3)</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">22:00 - 24:00</div>
          <div className="text-sm font-black text-purple-800 mt-1 font-mono">75.000 đ/giờ</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Yêu cầu lệnh cho phép OT đêm</div>
        </div>

        <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200">
          <div className="text-[11px] font-bold text-rose-900 uppercase">Khung 4: Nửa đêm (K4)</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">00:00 - 04:00 (D+1)</div>
          <div className="text-sm font-black text-rose-800 mt-1 font-mono">100.000 đ/giờ</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Đơn giá đặc biệt sau nửa đêm</div>
        </div>
      </div>

      {/* 3. Bảng Hàng Chờ Phê Duyệt OT */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">
            Danh Sách Hồ Sơ Tăng Ca Theo Tài Xế / Ngày Công
          </span>
          <span className="text-[11px] text-slate-500">
            Tổng tiền đã phê duyệt kỳ này: <strong className="text-emerald-700 font-mono">{approvedTotalSum.toLocaleString("vi-VN")} đ</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Ngày & Phương Tiện</th>
                <th className="p-3">Tài Xế Phụ Trách</th>
                <th className="p-3">Khớp Lệnh Điều Xe</th>
                <th className="p-3 text-center">4 Khung Đề Xuất (Phút)</th>
                <th className="p-3 text-right">Tổng Giờ & Tiền Đề Xuất</th>
                <th className="p-3 text-center">Kiểm Tra Định Mức</th>
                <th className="p-3 text-right">Số Tiền Đã Duyệt</th>
                <th className="p-3 text-center">Trạng Thái & HRM</th>
                <th className="p-3 text-center">Quyết Định Quản Lý</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map((r) => {
                const isPending = r.approvalStatus === "pending";

                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-mono font-bold text-slate-900">
                        {r.workDate.split("-").reverse().join("/")}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                          {r.vehiclePlate}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.driverName}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      {r.hasOrder ? (
                        <div className="space-y-0.5 text-[10px]">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đúng lệnh
                          </span>
                          <span className="text-slate-500 block">
                            Cho phép: {r.orderAllowsMorningOt ? "Sáng" : "Không sáng"} • {r.orderAllowsEveningOt ? "Tối" : "Không tối"}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 text-[10px]">
                          Không có lệnh
                        </span>
                      )}
                    </td>

                    {/* 4 Khung */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded ${r.minsK1_Morning > 0 ? "bg-amber-100 text-amber-900 font-bold" : "bg-slate-100 text-slate-400"}`}>
                          K1: {r.minsK1_Morning}p
                        </span>
                        <span className={`px-1.5 py-0.5 rounded ${r.minsK2_Evening > 0 ? "bg-indigo-100 text-indigo-900 font-bold" : "bg-slate-100 text-slate-400"}`}>
                          K2: {r.minsK2_Evening}p
                        </span>
                        <span className={`px-1.5 py-0.5 rounded ${r.minsK3_LateNight > 0 ? "bg-purple-100 text-purple-900 font-bold" : "bg-slate-100 text-slate-400"}`}>
                          K3: {r.minsK3_LateNight}p
                        </span>
                        <span className={`px-1.5 py-0.5 rounded ${r.minsK4_Midnight > 0 ? "bg-rose-100 text-rose-900 font-bold" : "bg-slate-100 text-slate-400"}`}>
                          K4: {r.minsK4_Midnight}p
                        </span>
                      </div>
                    </td>

                    {/* Đề xuất */}
                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-slate-900">
                        {r.proposedTotalAmount.toLocaleString("vi-VN")} đ
                      </div>
                      <div className="text-[10px] text-slate-400">{r.proposedTotalHours} giờ</div>
                    </td>

                    {/* Kiểm tra định mức */}
                    <td className="p-3 text-center">
                      {r.requiresExplanation ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 text-[10px]">
                          Cần giải trình
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[10px] flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đạt định mức
                        </span>
                      )}
                    </td>

                    {/* Đã duyệt */}
                    <td className="p-3 text-right font-mono">
                      {isPending ? (
                        <span className="text-slate-400 italic text-[11px]">Chưa duyệt</span>
                      ) : (
                        <span className="font-bold text-emerald-700 text-sm">
                          {r.approvedTotalAmount.toLocaleString("vi-VN")} đ
                        </span>
                      )}
                    </td>

                    {/* Trạng thái & HRM */}
                    <td className="p-3 text-center">
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold block ${
                            r.approvalStatus === "approved_full"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : r.approvalStatus === "approved_partial"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : r.approvalStatus === "rejected"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {r.approvalStatus === "approved_full"
                            ? "Duyệt đủ"
                            : r.approvalStatus === "approved_partial"
                            ? "Duyệt 1 phần"
                            : r.approvalStatus === "rejected"
                            ? "Từ chối"
                            : "Chờ duyệt"}
                        </span>

                        {r.hrmSynced && (
                          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1 rounded block">
                            Đã chuyển HRM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3 text-center">
                      {isPending ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleApproveFull(r.id)}
                            title="Duyệt đủ 100%"
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-2xs"
                          >
                            Duyệt Đủ
                          </button>
                          <button
                            onClick={() => handleOpenPartial(r)}
                            title="Duyệt một phần / Chia tỷ lệ"
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            1 Phần
                          </button>
                          <button
                            onClick={() => handleOpenReject(r)}
                            title="Từ chối"
                            className="px-1.5 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Đã chốt</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Duyệt Một Phần (NT19 - Chia theo tỷ lệ hoặc theo từng khung) */}
      {showPartialModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                Duyệt Một Phần Tăng Ca - {selectedRecord.driverName}
              </h3>
              <button
                onClick={() => setShowPartialModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePartial} className="space-y-4">
              {/* Công cụ chia theo tỷ lệ */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Cách 1: Nhập Tổng Phút Cần Duyệt & Chia Theo Tỷ Lệ
                  </span>
                  <button
                    type="button"
                    onClick={handleRecalculateProportional}
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px]"
                  >
                    Chia theo tỷ lệ
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={partialMinutesTarget}
                    onChange={(e) => setPartialMinutesTarget(Number(e.target.value))}
                    className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                  />
                  <span className="text-slate-500 text-[11px]">
                    phút (tương đương {(partialMinutesTarget / 60).toFixed(2)} giờ)
                  </span>
                </div>
              </div>

              {/* Cách 2: Nhập từng khung */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 text-xs block">
                  Cách 2: Điều Chỉnh Cụ Thể Từng Khung Giờ (Phút)
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">K1 (04-08h): 75k</span>
                    <input
                      type="number"
                      value={partialK1}
                      onChange={(e) => setPartialK1(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400">Gốc: {selectedRecord.minsK1_Morning}p</span>
                  </div>

                  <div className="p-2 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">K2 (17-22h): 50k</span>
                    <input
                      type="number"
                      value={partialK2}
                      onChange={(e) => setPartialK2(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400">Gốc: {selectedRecord.minsK2_Evening}p</span>
                  </div>

                  <div className="p-2 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">K3 (22-24h): 75k</span>
                    <input
                      type="number"
                      value={partialK3}
                      onChange={(e) => setPartialK3(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400">Gốc: {selectedRecord.minsK3_LateNight}p</span>
                  </div>

                  <div className="p-2 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">K4 (00-04h): 100k</span>
                    <input
                      type="number"
                      value={partialK4}
                      onChange={(e) => setPartialK4(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400">Gốc: {selectedRecord.minsK4_Midnight}p</span>
                  </div>
                </div>
              </div>

              {/* Tóm tắt tiền sau khi chia */}
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 block">Số tiền duyệt sau điều chỉnh:</span>
                  <span className="text-base font-black text-emerald-950 font-mono">
                    {calculateOtAmount(partialK1, partialK2, partialK3, partialK4).totalAmount.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="text-right text-xs font-mono text-emerald-800">
                  Tổng {calculateOtAmount(partialK1, partialK2, partialK3, partialK4).totalHours} giờ
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPartialModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu Quyết Định Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Từ Chối */}
      {showRejectModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Từ Chối Duyệt Tăng Ca
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Bạn đang từ chối duyệt hồ sơ tăng ca ngày {selectedRecord.workDate} của tài xế{" "}
                <strong>{selectedRecord.driverName}</strong> ({selectedRecord.vehiclePlate}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý Do Từ Chối Phê Duyệt *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ví dụ: Xe dừng không tắt máy bật điều hòa ngủ trưa, không thuộc thời gian làm việc."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
