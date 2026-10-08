"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  FileCheck,
  RefreshCw,
  Sliders,
  UserCheck,
  Edit3,
  RotateCcw,
  ExternalLink,
  Printer
} from "lucide-react";
import { Badge, toast, TableLoadingOverlay } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";

interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  baseSalary: number;
  payBasis: string;
  allowances: Record<string, any>;
  performanceScore: number;
  aiSuggestedBonus: number;
}

export default function DanhGiaLuongAIPage() {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<SalaryRecord | null>(null);
  const [selectedSalaryIds, setSelectedSalaryIds] = useState<string[]>([]);

  // State Ban Giám Đốc điều chỉnh con số thực tế
  const [overrides, setOverrides] = useState<Record<string, {
    baseSalary: number;
    approvedBonus: number;
    directorNote: string;
    isEdited: boolean;
  }>>({});

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/hr/salaries");
      if (!res.ok) {
        throw new Error("Không thể tải bảng tính lương & KPI");
      }
      const data = await res.json();
      const list: SalaryRecord[] = data.salaries || [];
      setSalaries(list);

      // Khởi tạo overrides ban đầu lấy từ AI
      const initialOverrides: typeof overrides = {};
      list.forEach((s) => {
        initialOverrides[s.id] = {
          baseSalary: s.baseSalary,
          approvedBonus: s.aiSuggestedBonus,
          directorNote: "",
          isEdited: false,
        };
      });
      setOverrides(initialOverrides);

      if (list.length > 0) {
        setSelectedEmp(list[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  const handleOverrideChange = (id: string, field: "baseSalary" | "approvedBonus" | "directorNote", value: any) => {
    setOverrides((prev) => {
      const current = prev[id] || { baseSalary: 0, approvedBonus: 0, directorNote: "", isEdited: false };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
          isEdited: true,
        },
      };
    });
  };

  const handleResetToAI = (s: SalaryRecord) => {
    setOverrides((prev) => ({
      ...prev,
      [s.id]: {
        baseSalary: s.baseSalary,
        approvedBonus: s.aiSuggestedBonus,
        directorNote: "",
        isEdited: false,
      },
    }));
  };

  const handleApprovePayroll = async () => {
    if (salaries.length === 0) {
      toast.error("Không có dữ liệu nhân sự để phê duyệt");
      return;
    }

    setApproving(true);
    try {
      const lines = salaries.map((s) => {
        const ov = overrides[s.id];
        const baseAmount = ov ? Number(ov.baseSalary) || 0 : s.baseSalary;
        const bonus = ov ? Number(ov.approvedBonus) || 0 : s.aiSuggestedBonus;
        return {
          employeeId: s.employeeId,
          baseAmount,
          bonus,
          directorNote: ov?.directorNote || "",
          salarySnapshot: {
            employeeCode: s.employeeCode,
            employeeName: s.employeeName,
            departmentName: s.departmentName,
            performanceScore: s.performanceScore,
            aiSuggestedBonus: s.aiSuggestedBonus,
            approvedBaseSalary: baseAmount,
            approvedBonus: bonus,
            directorNote: ov?.directorNote || "",
          },
        };
      });

      const res = await fetch("/api/hr/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          month: 3,
          lines,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Lỗi khi lưu bảng lương phê duyệt");
      }

      setApprovedSuccess(true);
      toast.success("Bảng lương Kỳ 03/2026 đã được lưu và phê duyệt thành công!");
    } catch (err: any) {
      toast.error(err.message || "Không thể phê duyệt bảng lương");
    } finally {
      setApproving(false);
    }
  };

  // Tính tổng thực tế sau khi BGĐ điều chỉnh
  const totalBaseApproved = salaries.reduce((acc, s) => {
    const ov = overrides[s.id];
    return acc + (ov ? Number(ov.baseSalary) || 0 : s.baseSalary);
  }, 0);

  const totalBonusApproved = salaries.reduce((acc, s) => {
    const ov = overrides[s.id];
    return acc + (ov ? Number(ov.approvedBonus) || 0 : s.aiSuggestedBonus);
  }, 0);

  const totalPayrollApproved = totalBaseApproved + totalBonusApproved;
  const isAnyEdited = Object.values(overrides).some((o) => o.isEdited);

  useSetPageHeader({
    title: "Đánh Giá Hiệu Suất & Lương",
    subtitle: isAnyEdited 
      ? "Kỳ Tháng 03/2026 • Đã có điều chỉnh con số từ Ban Giám Đốc" 
      : "Kỳ Tháng 03/2026 • AI đề xuất định lượng, Ban Giám Đốc phê duyệt",
    badge: "Kỳ 03/2026",
    primaryAction: (
      <div className="flex items-center gap-2">
        <Link
          href="/nhan-su"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Nhân sự
        </Link>
        <button
          onClick={fetchSalaries}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
          title="AI Phân tích lại"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <Printer className="w-3.5 h-3.5" />
          In Bảng Lương
        </button>
        <button
          onClick={handleApprovePayroll}
          disabled={approving || approvedSuccess || salaries.length === 0}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition ${
            approvedSuccess
              ? "bg-emerald-600 text-white cursor-default"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {approvedSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã Duyệt Kỳ 03/2026
            </>
          ) : approving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Đang Ký...
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              Ký Duyệt Lương
            </>
          )}
        </button>
      </div>
    ),
  });

  return (
    <div className="space-y-4">
      {/* Banner thông báo App HRM độc lập */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Khám Phá Bảng Tính Lương Thông Minh Tại App HRM
              <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full">NEW</span>
            </h4>
            <p className="text-xs text-blue-200 mt-0.5">
              Hỗ trợ tự động tính lương theo công chuẩn, hệ số OT, thưởng chuyên cần, phạt đi muộn/quên dập thẻ và trích nộp BHXH.
            </p>
          </div>
        </div>
        <Link
          href="/apps/hrm/tinh-luong"
          className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-900 font-bold text-xs rounded-lg shadow transition shrink-0 flex items-center gap-1.5"
        >
          Mở Bảng Lương HRM Mới &rarr;
        </Link>
      </div>

      {/* 2. StatBar 1 dòng thu gọn theo quy chuẩn UI/UX */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 px-2">
          <DollarSign className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Tổng Quỹ Lương:</span>{" "}
            <strong className="text-slate-900 font-bold">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalPayrollApproved)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <FileCheck className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Lương Cứng Cố Định:</span>{" "}
            <strong className="text-slate-700">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalBaseApproved)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Thưởng BGĐ Phê Duyệt:</span>{" "}
            <strong className="text-purple-600 font-bold">
              +{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalBonusApproved)}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Điểm KPI Trung Bình:</span>{" "}
            <strong className="text-emerald-600 font-bold">91.6 / 100</strong>
          </div>
        </div>
      </div>

      {/* Thông báo ký duyệt thành công kèm Nút liên kết sang Sổ quỹ M16 */}
      {approvedSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-950">
                Ký duyệt thành công! Bảng lương Tháng 03/2026 đã được Ban Giám Đốc xác nhận chính thức.
              </p>
              <p className="text-emerald-700 mt-0.5">
                Tổng số tiền chi trả: <strong>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalPayrollApproved)}</strong>. Dữ liệu đã sẵn sàng để lập phiếu chi.
              </p>
            </div>
          </div>
          <Link
            href={`/tai-chinh?action=lap-phieu-chi&noi_dung=Chi+luong+thang+03-2026&so_tien=${totalPayrollApproved}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition self-start sm:self-auto flex-shrink-0"
          >
            <span>Lập Phiếu Chi Lương Sang Sổ Quỹ (M16)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Grid 2 cột: Bảng điều chỉnh của BGĐ (Cột lớn) & Trợ lý tham mưu AI (Cột phụ) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cột 1 & 2: Bảng lương cho phép BGĐ can thiệp sửa trực tiếp con số */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[420px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-blue-600" />
              Bảng Tính Lương & Ô Chỉnh Sửa Trực Tiếp Của Ban Giám Đốc
            </h3>
            <span className="text-[11px] text-slate-500">
              * Nhập trực tiếp số tiền vào ô để điều chỉnh mức lương/thưởng
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium uppercase text-[10px]">
                <tr>
                  <th className="w-10 px-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={salaries.length > 0 && selectedSalaryIds.length === salaries.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSalaryIds(salaries.map((s) => s.id));
                        } else {
                          setSelectedSalaryIds([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      aria-label="Chọn tất cả bảng lương"
                    />
                  </th>
                  <th className="px-3 py-2.5">Nhân sự</th>
                  <th className="px-3 py-2.5 text-center w-28 min-w-[110px]">KPI AI</th>
                  <th className="px-3 py-2.5 text-right w-36">Lương Cứng (đ)</th>
                  <th className="px-3 py-2.5 text-right w-44">Thưởng BGĐ Duyệt (đ)</th>
                  <th className="px-3 py-2.5 text-right">Tổng Thực Lĩnh</th>
                  <th className="px-3 py-2.5 text-center w-16">Thao tác</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${loading ? "opacity-25 pointer-events-none select-none" : ""}`}>
                {salaries.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                      Chưa có dữ liệu bảng lương tháng này
                    </td>
                  </tr>
                ) : (
                  salaries.map((s) => {
                    const isSelected = selectedEmp?.id === s.id;
                    const isChecked = selectedSalaryIds.includes(s.id);
                    const ov = overrides[s.id] || {
                      baseSalary: s.baseSalary,
                      approvedBonus: s.aiSuggestedBonus,
                      directorNote: "",
                      isEdited: false,
                    };
                    const total = Number(ov.baseSalary) + Number(ov.approvedBonus);

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedEmp(s)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-blue-50/70" : isChecked ? "bg-blue-50/30" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-2.5 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSalaryIds((prev) =>
                                prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            aria-label={`Chọn nhân viên ${s.employeeName}`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900">{s.employeeName}</p>
                          <p className="text-[11px] text-slate-500">
                            {s.employeeCode} • {s.departmentName || "Xưởng sản xuất"}
                          </p>
                        </td>

                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full font-bold text-xs whitespace-nowrap min-w-[76px] ${
                              s.performanceScore >= 90
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {s.performanceScore} điểm
                          </span>
                        </td>

                        {/* Ô nhập Lương cứng */}
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="500000"
                            value={ov.baseSalary}
                            onChange={(e) => handleOverrideChange(s.id, "baseSalary", Number(e.target.value))}
                            className="w-full text-right px-2 py-1 text-xs border border-slate-200 rounded font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Ô nhập Thưởng thực tế do BGĐ quyết */}
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <input
                              type="number"
                              step="200000"
                              value={ov.approvedBonus}
                              onChange={(e) => handleOverrideChange(s.id, "approvedBonus", Number(e.target.value))}
                              className="w-full text-right px-2 py-1 text-xs border border-purple-200 bg-purple-50/30 rounded font-bold text-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>AI gợi ý:</span>
                              <span className="font-medium text-purple-600">
                                +{new Intl.NumberFormat("vi-VN").format(s.aiSuggestedBonus)} đ
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Tổng thực tế */}
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          <span className="text-xs text-emerald-700">
                            {new Intl.NumberFormat("vi-VN").format(total)} đ
                          </span>
                          {ov.isEdited && (
                            <div className="text-[10px] text-amber-600 font-medium">Đã chỉnh sửa</div>
                          )}
                        </td>

                        {/* Nút reset về số AI */}
                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {ov.isEdited ? (
                            <button
                              type="button"
                              onClick={() => handleResetToAI(s)}
                              title="Khôi phục số đề xuất ban đầu của AI"
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">Chuẩn</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Ghi chú điều chỉnh của BGĐ cho nhân sự được chọn */}
          {selectedEmp && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-700 flex-shrink-0">
                Ghi chú phê duyệt của BGĐ ({selectedEmp.employeeName}):
              </span>
              <input
                type="text"
                placeholder="VD: Thưởng thêm 500k do hỗ trợ dự án Vincom tăng ca ban đêm..."
                value={overrides[selectedEmp.id]?.directorNote || ""}
                onChange={(e) => handleOverrideChange(selectedEmp.id, "directorNote", e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          )}

          <TableLoadingOverlay
            isLoading={loading}
            title="ĐÁNH GIÁ LƯƠNG & KPI AI"
            statusText="Đang tính toán ma trận lương và điểm hiệu suất nhân sự..."
          />
        </div>

        {/* Cột 3: Chi tiết giải trình của Trợ lý AI */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl shadow-sm p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-semibold text-xs text-white">Hồ Sơ Đánh Giá & Tham Mưu AI</h4>
              </div>
              <Badge variant="warning" className="bg-amber-400/20 text-amber-300 border-none text-[10px]">
                Signage Model
              </Badge>
            </div>

            {selectedEmp ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedEmp.employeeName}</h3>
                  <p className="text-[11px] text-indigo-300">
                    Mã: {selectedEmp.employeeCode} • {selectedEmp.departmentName || "Tổ thi công"}
                  </p>
                </div>

                <div className="p-2.5 bg-indigo-900/40 rounded-lg border border-indigo-700/40 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-indigo-200">Điểm định lượng KPI:</span>
                    <span className="font-bold text-emerald-400 text-xs">
                      {selectedEmp.performanceScore} / 100
                    </span>
                  </div>
                  <div className="w-full bg-indigo-950 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${selectedEmp.performanceScore}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="font-semibold text-amber-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Điểm mạnh ghi nhận trong kỳ:
                  </p>
                  <p className="text-slate-300 leading-relaxed bg-indigo-950/50 p-2 rounded-lg border border-indigo-900/50">
                    {selectedEmp.employeeCode === "NV-THO"
                      ? "• 100% check-in GPS đúng giờ tại công trình Vincom Ocean Park.\n• Gia công khung sắt biển 3M đạt chuẩn dung sai < 2mm.\n• Không có phát sinh lỗi phải sửa lại từ khách hàng."
                      : selectedEmp.employeeCode === "NV-DUAN"
                      ? "• Điều phối WBS đúng tiến độ 92%.\n• Quản lý chi phí vật tư thực tế bám sát dự toán.\n• Nghiệm thu giai đoạn 1 thành công."
                      : "• Vận chuyển 100% chuyến xe an toàn, đúng giờ hẹn công trường."}
                  </p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="font-semibold text-blue-300 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Bóc tách chi trả sau điều chỉnh:
                  </p>
                  <div className="p-2.5 bg-indigo-950/60 rounded-lg border border-indigo-800/50 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>Lương cứng duyệt:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("vi-VN").format(overrides[selectedEmp.id]?.baseSalary ?? selectedEmp.baseSalary)} đ
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Thưởng duyệt:</span>
                      <span className="font-bold">
                        +{new Intl.NumberFormat("vi-VN").format(overrides[selectedEmp.id]?.approvedBonus ?? selectedEmp.aiSuggestedBonus)} đ
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-indigo-800/60 flex justify-between font-bold text-white text-xs">
                      <span>Tổng thực tế:</span>
                      <span className="text-emerald-400">
                        {new Intl.NumberFormat("vi-VN").format(
                          (overrides[selectedEmp.id]?.baseSalary ?? selectedEmp.baseSalary) +
                          (overrides[selectedEmp.id]?.approvedBonus ?? selectedEmp.aiSuggestedBonus)
                        )} đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-indigo-300">Chọn một nhân sự để xem phân tích</p>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-indigo-800/60 text-[10px] text-indigo-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>AI chỉ đóng vai trò tham mưu; Ban Giám Đốc giữ toàn quyền phê duyệt cuối cùng.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
