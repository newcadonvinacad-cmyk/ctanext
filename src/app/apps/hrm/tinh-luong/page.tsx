"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Calendar,
  ShieldCheck,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  FileText,
  Search,
  X,
  Building,
  User,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge, toast } from "@/components/ui";
import * as XLSX from "xlsx";

interface PayrollPeriodItem {
  year: number;
  month: number;
  periodStatus: string;
  runId: string | null;
  runStatus: string;
  isApproved: boolean;
  approvedAt: string | null;
  approvedByName: string | null;
  lineCount: number;
  totalNetPayout: number;
}

interface PayrollLineItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  baseSalary: number;
  standardDays: number;
  actualDays: number;
  otHours: number;
  dailyRate: number;
  hourlyRate: number;
  timeSalary: number;
  otSalary: number;
  allowances: number;
  allowanceDetails: Array<{ ten: string; so_tien: number }>;
  bonus: number;
  bonusDetails: Array<{ ten: string; so_tien: number }>;
  fines: number;
  lateTimes?: number;
  socialInsurance: number;
  netSalary: number;
  policySnapshot: any;
  isLocked?: boolean;
}

// Hàm đọc tiền Việt Nam Đồng sang chữ chuẩn kế toán
function readVndNumberToWords(n: number): string {
  if (!n || n <= 0) return "Không đồng";
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readGroupOfThree(num: number): string {
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const one = num % 10;
    let res = "";

    if (hundred > 0 || num >= 100) {
      res += digits[hundred] + " trăm ";
    }
    if (ten > 1) {
      res += digits[ten] + " mươi ";
      if (one === 1) res += "mốt";
      else if (one === 5) res += "lăm";
      else if (one > 0) res += digits[one];
    } else if (ten === 1) {
      res += "mười ";
      if (one === 5) res += "lăm";
      else if (one > 0) res += digits[one];
    } else {
      if (hundred > 0 && one > 0) res += "lẻ ";
      if (one > 0) res += digits[one];
    }
    return res.trim();
  }

  let numStr = Math.round(n).toString();
  const groups: number[] = [];
  while (numStr.length > 0) {
    const len = Math.min(3, numStr.length);
    groups.unshift(parseInt(numStr.slice(-len), 10));
    numStr = numStr.slice(0, -len);
  }

  let words = "";
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g > 0) {
      const gWord = readGroupOfThree(g);
      const unitIdx = groups.length - 1 - i;
      words += gWord + " " + units[unitIdx] + " ";
    }
  }

  words = words.trim();
  if (!words) return "Không đồng";
  return words.charAt(0).toUpperCase() + words.slice(1) + " đồng chẵn.";
}

export default function HrmTinhLuongPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);
  const [payrollData, setPayrollData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [search, setSearch] = useState("");

  // Modal in phiếu lương cá nhân
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollLineItem | null>(null);

  // Overrides tạm thời trước khi duyệt
  const [overrides, setOverrides] = useState<Record<string, { bonus: number; directorNote: string }>>({});

  // 1. Tải danh sách các kỳ lương lịch sử & hiện hành
  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/hrm/payroll/periods");
      if (res.ok) {
        const json = await res.json();
        setPeriods(json.periods || []);
      }
    } catch (e) {
      console.error("Lỗi tải kỳ lương:", e);
    }
  };

  // 2. Tính toán hoặc tải số liệu kỳ lương đang chọn
  const loadPayrollData = async (y: number, m: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/payroll/calculate?year=${y}&month=${m}`);
      if (!res.ok) throw new Error("Không thể tải bảng lương kỳ này");
      const json = await res.json();
      setPayrollData(json);
    } catch (e: any) {
      toast.error(e.message || "Lỗi tải số liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    loadPayrollData(year, month);
  }, [year, month]);

  const handlePeriodChange = (val: string) => {
    const [y, m] = val.split("-").map(Number);
    setYear(y);
    setMonth(m);
  };

  // Phê duyệt và chốt khóa sổ bảng lương
  const handleApproveAndLock = async () => {
    if (!payrollData?.lines || payrollData.lines.length === 0) {
      toast.error("Không có dòng lương nào để phê duyệt");
      return;
    }

    setApproving(true);
    try {
      const updatedLines = payrollData.lines.map((l: any) => {
        const ov = overrides[l.employeeId];
        return {
          ...l,
          bonus: ov ? ov.bonus : l.bonus,
          netSalary: ov
            ? Math.max(0, l.timeSalary + l.otSalary + l.allowances + ov.bonus - l.fines - l.socialInsurance)
            : l.netSalary,
          directorNote: ov?.directorNote || "",
        };
      });

      const res = await fetch("/api/hrm/payroll/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          lines: updatedLines,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi phê duyệt bảng lương");
      }

      toast.success(`Đã phê duyệt và khóa sổ thành công bảng lương Tháng ${month}/${year}!`);
      await fetchPeriods();
      await loadPayrollData(year, month);
    } catch (e: any) {
      toast.error(e.message || "Lỗi phê duyệt");
    } finally {
      setApproving(false);
    }
  };

  const handleExportExcel = () => {
    if (!payrollData?.lines) return;
    try {
      const rows = payrollData.lines.map((l: any, idx: number) => ({
        STT: idx + 1,
        "Mã NV": l.employeeCode,
        "Họ và Tên": l.employeeName,
        "Phòng Ban": l.departmentName,
        "Lương Cơ Bản": l.baseSalary,
        "Công Chuẩn": l.standardDays,
        "Công Đi Làm": l.actualDays,
        "Lương Thời Gian": l.timeSalary,
        "Giờ OT": l.otHours,
        "Lương OT": l.otSalary,
        "Phụ Cấp": l.allowances,
        "Thưởng": overrides[l.employeeId]?.bonus ?? l.bonus,
        "Phạt Vi Phạm": l.fines,
        "BHXH NLĐ (10.5%)": l.socialInsurance,
        "LƯƠNG THỰC NHẬN (NET)": overrides[l.employeeId]
          ? Math.max(0, l.timeSalary + l.otSalary + l.allowances + overrides[l.employeeId].bonus - l.fines - l.socialInsurance)
          : l.netSalary,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Luong_T${month}_${year}`);
      XLSX.writeFile(wb, `Bang_Luong_Signage_T${month}_${year}.xlsx`);
      toast.success("Đã xuất file Excel bảng lương thành công!");
    } catch (err: any) {
      toast.error("Lỗi xuất Excel: " + err.message);
    }
  };

  const formatVnd = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const isCurrentPeriodApproved = Boolean(payrollData?.isApproved);

  const filteredLines: PayrollLineItem[] = (payrollData?.lines || []).filter((l: any) => {
    const q = search.toLowerCase();
    return (
      l.employeeName.toLowerCase().includes(q) ||
      l.employeeCode.toLowerCase().includes(q) ||
      l.departmentName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar Thanh Mảnh Theo Chuẩn UI/UX ERP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              HRM / Tiền Lương & Đãi Ngộ
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              Bảng Thanh Toán Lương & Hồ Sơ Khóa Sổ Doanh Nghiệp
            </h2>
          </div>

          {/* Badge Trạng thái Khóa Sổ / Bản Nháp */}
          {isCurrentPeriodApproved ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
              <Lock className="w-3.5 h-3.5 text-slate-700" />
              <span>ĐÃ CHỐT LƯƠNG & KHÓA SỔ</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              <span>BẢN NHÁP / ĐANG ĐỐI SOÁT</span>
            </span>
          )}
        </div>

        {/* Nút hành động phải: Bộ chọn kỳ lương lịch sử & Xuất in */}
        <div className="flex items-center gap-2">
          {/* Menu Dropdown Chọn Kỳ Lương Lịch Sử */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-600 mr-1.5 shrink-0" />
            <select
              value={`${year}-${month}`}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {periods.length > 0 ? (
                periods.map((p) => (
                  <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                    Tháng {p.month}/{p.year} {p.isApproved ? "• [Đã Chốt]" : "• [Bản Nháp]"}
                  </option>
                ))
              ) : (
                <option value={`${year}-${month}`}>Tháng {month}/{year}</option>
              )}
            </select>
          </div>

          <button
            onClick={() => loadPayrollData(year, month)}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center gap-1 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" />
            <span>Xuất Excel</span>
          </button>

          {!isCurrentPeriodApproved ? (
            <button
              onClick={handleApproveAndLock}
              disabled={approving || loading}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-200" />
              <span>{approving ? "Đang khóa sổ..." : "Phê Duyệt & Khóa Sổ"}</span>
            </button>
          ) : (
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-200" />
              <span>In Toàn Bộ Bảng Lương</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông tin phê duyệt nếu đã khóa sổ */}
      {isCurrentPeriodApproved && payrollData?.approvedAt && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-700 shrink-0" />
            <span>
              Kỳ lương đã được chốt và chuyển sang Kế toán tài chính. Người duyệt:{" "}
              <strong className="text-slate-900 font-semibold">{payrollData.approvedByName || "Ban Giám Đốc"}</strong>{" "}
              vào ngày <span className="font-mono">{new Date(payrollData.approvedAt).toLocaleDateString("vi-VN")}</span>.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-700 uppercase">Dữ Liệu Bất Biến</span>
        </div>
      )}

      {/* 2. StatBar 1 Dòng Mật Độ Cao Chuẩn Enterprise */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 px-2">
          <CircleDollarSign className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Quân số:</span>{" "}
            <strong className="text-slate-900 font-bold">{payrollData?.totalEmployees || 0} nhân sự</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <div className="truncate">
            <span className="text-slate-500">Tổng chi phí công ty:</span>{" "}
            <strong className="text-slate-900 font-bold">{formatVnd(payrollData?.totalCompanyCost || 0)}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <div className="truncate">
            <span className="text-slate-500">BHXH trích nộp:</span>{" "}
            <strong className="text-slate-700 font-bold">
              {formatVnd(
                (payrollData?.lines || []).reduce((sum: number, l: any) => sum + (l.socialInsurance || 0), 0)
              )}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <div className="truncate">
            <span className="text-slate-500">Tổng thực chi (Net):</span>{" "}
            <strong className="text-slate-900 font-black text-sm">
              {formatVnd(payrollData?.totalNetPayout || 0)}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Table Toolbar Tìm Kiếm */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm nhân viên, mã NV, phòng ban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 shadow-xs"
          />
        </div>
        <div className="text-[11px] text-slate-400">
          Bấm <strong className="text-slate-700 font-semibold">"In Phiếu"</strong> tại từng dòng để in phiếu lương cá nhân cho nhân viên
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu Lương Mật Độ Cao (Data Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">MÃ NV</th>
                <th className="py-2.5 px-3">HỌ VÀ TÊN</th>
                <th className="py-2.5 px-3">PHÒNG BAN</th>
                <th className="py-2.5 px-3 text-right">LƯƠNG CƠ BẢN</th>
                <th className="py-2.5 px-2 text-center">CÔNG</th>
                <th className="py-2.5 px-3 text-right">LƯƠNG THỜI GIAN</th>
                <th className="py-2.5 px-2 text-center">OT (h)</th>
                <th className="py-2.5 px-3 text-right">LƯƠNG OT</th>
                <th className="py-2.5 px-3 text-right">PHỤ CẤP</th>
                <th className="py-2.5 px-3 text-right">THƯỞNG</th>
                <th className="py-2.5 px-3 text-right">PHẠT</th>
                <th className="py-2.5 px-3 text-right">TRÍCH BHXH</th>
                <th className="py-2.5 px-3 text-right font-black text-emerald-800 bg-emerald-50/50">
                  THỰC LĨNH (NET)
                </th>
                <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-50 shadow-xs">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400">
                    Không có dòng lương nào trong kỳ này
                  </td>
                </tr>
              ) : (
                filteredLines.map((l: PayrollLineItem) => {
                  const ov = overrides[l.employeeId];
                  const currentBonus = ov?.bonus ?? l.bonus;
                  const finalNet = ov
                    ? Math.max(0, l.timeSalary + l.otSalary + l.allowances + ov.bonus - l.fines - l.socialInsurance)
                    : l.netSalary;

                  return (
                    <tr key={l.employeeId} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                        {l.employeeCode}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {l.employeeName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{l.departmentName}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {formatVnd(l.baseSalary)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                        {l.actualDays} / {l.standardDays}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {formatVnd(l.timeSalary)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-blue-600">
                        {l.otHours || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-700 font-semibold">
                        {l.otSalary ? `+${formatVnd(l.otSalary)}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                        {l.allowances ? `+${formatVnd(l.allowances)}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                        {currentBonus ? `+${formatVnd(currentBonus)}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                        {l.fines ? `-${formatVnd(l.fines)}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                        {l.socialInsurance ? `-${formatVnd(l.socialInsurance)}` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-xs bg-emerald-50/30">
                        {formatVnd(finalNet)}
                      </td>
                      <td className="py-2.5 px-3 text-right sticky right-0 bg-white shadow-xs">
                        <button
                          onClick={() => setSelectedPayslip({ ...l, bonus: currentBonus, netSalary: finalNet })}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold transition text-[11px] inline-flex items-center gap-1 shadow-xs"
                          title="In phiếu lương cá nhân"
                        >
                          <Printer className="w-3 h-3" />
                          <span>In Phiếu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL IN PHIẾU LƯƠNG CÁ NHÂN (PRINT-ISOLATED VOUCHER) */}
      {/* ======================================================== */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:static print:bg-white print:p-0 print:backdrop-blur-none print:z-auto">
          {/* Print isolation stylesheet */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 12mm 15mm;
                }
                html, body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                }
                body * {
                  visibility: hidden !important;
                }
                .no-print, .no-print * {
                  display: none !important;
                }
                #printable-payslip-root,
                #printable-payslip-root * {
                  visibility: visible !important;
                }
                #printable-payslip-root {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  box-shadow: none !important;
                  border: none !important;
                  overflow: visible !important;
                }
                .payslip-doc {
                  font-family: "Times New Roman", Times, serif, system-ui !important;
                  color: #000000 !important;
                  background: #ffffff !important;
                  width: 100% !important;
                  padding: 0 !important;
                  border: none !important;
                }
                .payslip-table {
                  border: 1px solid #000000 !important;
                  border-collapse: collapse !important;
                  width: 100% !important;
                }
                .payslip-table th,
                .payslip-table td {
                  border: 1px solid #000000 !important;
                  color: #000000 !important;
                  background-color: transparent !important;
                  padding: 6px 8px !important;
                  font-size: 11pt !important;
                }
                .payslip-table thead th {
                  background-color: #f2f2f2 !important;
                  font-weight: bold !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .payslip-header-sub {
                  background-color: #f7f7f7 !important;
                  font-weight: bold !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .payslip-net-row {
                  background-color: #f0f0f0 !important;
                  font-weight: 900 !important;
                  font-size: 12pt !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .payslip-box {
                  border: 1px solid #000000 !important;
                  background: transparent !important;
                  border-radius: 0 !important;
                  padding: 8px !important;
                }
              }
            `,
            }}
          />

          <div
            id="printable-payslip-root"
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none print:p-0 print:border-none print:max-w-none print:overflow-visible"
          >
            {/* Top Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Phiếu Thanh Toán Tiền Lương - {selectedPayslip.employeeName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Phiếu / Xuất PDF (Ctrl+P)</span>
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Khung Phiếu Lương In Chuẩn Kế Toán (Mẫu 02-LĐTL) */}
            <div className="payslip-doc p-6 sm:p-8 border border-slate-300 rounded-xl space-y-4 text-xs font-sans text-slate-900 bg-white print:border-none print:p-0">
              {/* Header phiếu chuẩn Bộ Tài Chính */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div className="space-y-0.5">
                  <h4 className="font-bold uppercase tracking-wider text-xs text-slate-900">
                    CÔNG TY TNHH QUẢNG CÁO &amp; NỘI THẤT SIGNAGE
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Địa chỉ: Số 18 Ngõ 120 Định Công, Hoàng Mai, Hà Nội
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Mã số thuế: 0108923456
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-xs uppercase">
                    Mẫu số: 02 - LĐTL
                  </div>
                  <div className="text-[10px] text-slate-500 italic">
                    (Ban hành theo Thông tư số 133/2016/TT-BTC
                    <br />
                    ngày 26/8/2016 của Bộ Tài chính)
                  </div>
                </div>
              </div>

              {/* Tiêu đề chính */}
              <div className="text-center py-1">
                <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
                  PHIẾU THANH TOÁN TIỀN LƯƠNG
                </h3>
                <p className="text-xs font-semibold text-slate-700 italic mt-0.5">
                  Kỳ thanh toán: Tháng {month} năm {year}
                </p>
              </div>

              {/* Thông tin nhân viên */}
              <div className="payslip-box grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-600">Họ và tên người lao động:</span>{" "}
                  <strong className="text-slate-900 uppercase font-bold">
                    {selectedPayslip.employeeName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600">Mã nhân viên:</span>{" "}
                  <strong className="font-mono text-slate-900">
                    {selectedPayslip.employeeCode}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600">Phòng ban / Vị trí:</span>{" "}
                  <strong className="text-slate-800">
                    {selectedPayslip.departmentName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600">Ngày công chuẩn:</span>{" "}
                  <strong className="text-slate-900">{selectedPayslip.standardDays} ngày</strong>{" "}
                  | Thực tế:{" "}
                  <strong className="text-slate-900">{selectedPayslip.actualDays} ngày</strong>
                </div>
              </div>

              {/* Bảng chi tiết lương chuẩn kế toán */}
              <table className="payslip-table w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300 w-12 text-center">STT</th>
                    <th className="p-2 border border-slate-300">KHOẢN MỤC THU NHẬP / GIẢM TRỪ</th>
                    <th className="p-2 border border-slate-300 w-28 text-center">TỶ LỆ / GHI CHÚ</th>
                    <th className="p-2 border border-slate-300 text-right w-36">SỐ TIỀN (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mục I: Thu nhập */}
                  <tr className="payslip-header-sub bg-slate-50 font-bold text-slate-900">
                    <td className="p-2 text-center border border-slate-300">I</td>
                    <td colSpan={2} className="p-2 border border-slate-300 uppercase">
                      CÁC KHOẢN THU NHẬP (A)
                    </td>
                    <td className="p-2 text-right border border-slate-300 font-black text-slate-900">
                      {formatVnd(
                        selectedPayslip.timeSalary +
                          selectedPayslip.otSalary +
                          selectedPayslip.allowances +
                          selectedPayslip.bonus
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">1</td>
                    <td className="p-2 border border-slate-300">Lương thỏa thuận cơ bản</td>
                    <td className="p-2 border border-slate-300 text-center text-slate-500">-</td>
                    <td className="p-2 text-right border border-slate-300 font-mono">
                      {formatVnd(selectedPayslip.baseSalary)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">2</td>
                    <td className="p-2 border border-slate-300">Lương theo thời gian thực tế</td>
                    <td className="p-2 border border-slate-300 text-center">
                      {selectedPayslip.actualDays} công
                    </td>
                    <td className="p-2 text-right border border-slate-300 font-mono font-semibold">
                      {formatVnd(selectedPayslip.timeSalary)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">3</td>
                    <td className="p-2 border border-slate-300">Làm thêm giờ (OT)</td>
                    <td className="p-2 border border-slate-300 text-center">
                      {selectedPayslip.otHours ? `${selectedPayslip.otHours} giờ (150%)` : "-"}
                    </td>
                    <td className="p-2 text-right border border-slate-300 font-mono">
                      {selectedPayslip.otSalary ? `+${formatVnd(selectedPayslip.otSalary)}` : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">4</td>
                    <td className="p-2 border border-slate-300">Phụ cấp ăn trưa, công trình, độc hại</td>
                    <td className="p-2 border border-slate-300 text-center text-slate-500">Miễn thuế</td>
                    <td className="p-2 text-right border border-slate-300 font-mono">
                      {selectedPayslip.allowances ? `+${formatVnd(selectedPayslip.allowances)}` : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">5</td>
                    <td className="p-2 border border-slate-300">Thưởng chuyên cần, hoàn thành KPI</td>
                    <td className="p-2 border border-slate-300 text-center text-slate-500">Năng suất</td>
                    <td className="p-2 text-right border border-slate-300 font-mono">
                      {selectedPayslip.bonus ? `+${formatVnd(selectedPayslip.bonus)}` : "-"}
                    </td>
                  </tr>

                  {/* Mục II: Giảm trừ */}
                  <tr className="payslip-header-sub bg-slate-50 font-bold text-slate-900">
                    <td className="p-2 text-center border border-slate-300">II</td>
                    <td colSpan={2} className="p-2 border border-slate-300 uppercase">
                      CÁC KHOẢN GIẢM TRỪ (B)
                    </td>
                    <td className="p-2 text-right border border-slate-300 font-black text-slate-900">
                      -{formatVnd(selectedPayslip.socialInsurance + selectedPayslip.fines)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">1</td>
                    <td className="p-2 border border-slate-300">Trích nộp BHXH, BHYT, BHTN</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">10.5%</td>
                    <td className="p-2 text-right border border-slate-300 font-mono">
                      -{formatVnd(selectedPayslip.socialInsurance)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center border border-slate-300 text-slate-500">2</td>
                    <td className="p-2 border border-slate-300">
                      Khấu trừ vi phạm quy chế (Đi muộn / Quên chấm)
                    </td>
                    <td className="p-2 border border-slate-300 text-center text-slate-500">Nội quy</td>
                    <td className="p-2 text-right border border-slate-300 font-mono">
                      {selectedPayslip.fines ? `-${formatVnd(selectedPayslip.fines)}` : "0 đ"}
                    </td>
                  </tr>

                  {/* Mục III: Thực nhận Net */}
                  <tr className="payslip-net-row bg-slate-100 font-black text-slate-900 text-sm">
                    <td className="p-2.5 text-center border border-slate-300">III</td>
                    <td colSpan={2} className="p-2.5 border border-slate-300 uppercase">
                      THỰC LĨNH CHUYỂN KHOẢN (NET = A - B)
                    </td>
                    <td className="p-2.5 text-right border border-slate-300 font-black font-mono text-base">
                      {formatVnd(selectedPayslip.netSalary)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Số tiền bằng chữ */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs italic text-slate-800 print:bg-white print:border-slate-400">
                <strong>Bằng chữ:</strong> {readVndNumberToWords(selectedPayslip.netSalary)}
              </div>

              {/* 4 Chữ ký xác nhận kế toán */}
              <div className="pt-4 text-xs font-sans">
                <div className="text-right italic text-[11px] text-slate-600 mb-3">
                  Hà Nội, ngày 28 tháng {month} năm {year}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px]">Người lập biểu</div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                    <div className="h-16"></div>
                    <div className="font-semibold text-slate-800">Kế Toán Lương</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px]">Kế toán trưởng</div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                    <div className="h-16"></div>
                    <div className="font-semibold text-slate-800">Trần Thị Mai</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px]">Giám đốc duyệt</div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, đóng dấu)</div>
                    <div className="h-16"></div>
                    <div className="font-semibold text-slate-800">Nguyễn Văn An</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px]">Người nhận tiền</div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký xác nhận)</div>
                    <div className="h-16"></div>
                    <div className="font-semibold text-slate-800">{selectedPayslip.employeeName}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

