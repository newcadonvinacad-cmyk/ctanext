"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Coins,
  ShieldCheck,
  Save,
  RefreshCw,
  Check,
  Users,
  Briefcase,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { useAuthorization } from "@/hooks/use-authorization";

interface LeavePolicy {
  id?: string;
  standard_days: number;
  seniority_bonus_years: number;
  carryover_max_days: number;
  cash_out_allowed: boolean;
  pay_basis_types?: string[];
}

interface EmployeeLeaveBalance {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  onboardDate: string;
  yearsOfService: number;
  standardDays: number;
  seniorityBonus: number;
  totalEntitled: number;
  usedDays: number;
  remainingDays: number;
  carryoverEligible: number;
  cashOutAllowed: boolean;
}

export default function CheDoLuongPage() {
  const { can, hasRole, isLoading } = useAuthorization();
  const canReadSalary =
    can("salary.read") ||
    can("payroll.pay") ||
    hasRole("SUPER_ADMIN") ||
    hasRole("ACCOUNTANT");

  const [policy, setPolicy] = React.useState<LeavePolicy>({
    standard_days: 12,
    seniority_bonus_years: 5,
    carryover_max_days: 5,
    cash_out_allowed: true,
  });
  const [balances, setBalances] = React.useState<EmployeeLeaveBalance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingPolicy, setSavingPolicy] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  const fetchData = async () => {
    if (!canReadSalary) return;
    try {
      setLoading(true);
      const [resPolicy, resBalances] = await Promise.all([
        fetch("/api/hrm/leave-policy"),
        fetch("/api/hrm/leave-balances"),
      ]);
      const jsonPolicy = await resPolicy.json();
      const jsonBalances = await resBalances.json();

      if (jsonPolicy.success && jsonPolicy.data) {
        setPolicy(jsonPolicy.data);
      }
      if (jsonBalances.success && jsonBalances.data) {
        setBalances(jsonBalances.data);
      }
    } catch (err: any) {
      console.error("Lỗi tải chế độ lương & quỹ phép:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPolicy(true);
      const res = await fetch("/api/hrm/leave-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standardDays: Number(policy.standard_days) || 12,
          seniorityBonusYears: Number(policy.seniority_bonus_years) || 5,
          carryoverMaxDays: Number(policy.carryover_max_days) || 5,
          cashOutAllowed: Boolean(policy.cash_out_allowed),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast("Đã lưu chính sách quỹ phép năm thành công!");
      fetchData();
    } catch (err: any) {
      alert("Lỗi lưu chính sách: " + err.message);
    } finally {
      setSavingPolicy(false);
    }
  };

  if (!isLoading && !canReadSalary) {
    return (
      <AccessDenied
        screenCode="M18.1"
        screenName="Chế độ lương & Quỹ phép"
        requiredPermission="salary.read"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header gọn gàng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-700" />
            <h1 className="text-base font-bold text-slate-900">
              Chế Độ Lương, Phân Ca &amp; Quản Lý Quỹ Phép Năm
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình các hình thức trả lương, quy chế phân công làm việc và theo dõi hạn mức phép năm toàn công ty
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Tải Lại</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CẤU HÌNH CÁC HÌNH THỨC TÍNH LƯƠNG TRONG DOANH NGHIỆP */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Coins className="w-4 h-4 text-slate-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            1. Các Hình Thức Tính Lương Áp Dụng (Full-Time, Công Nhật, Giờ, Ca)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Hình thức 1: Tháng / Full-time */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-700" />
                Lương Theo Tháng (Full-time)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                Tiêu chuẩn
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Áp dụng cho Khối Văn phòng, Thiết kế, Kỹ sư, Quản lý dự án, Giám sát thi công.
            </p>
            <div className="space-y-1 pt-1 border-t border-slate-200 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Công chuẩn:</span>
                <strong className="text-slate-900">26 ngày/tháng</strong>
              </div>
              <div className="flex justify-between">
                <span>Cách tính:</span>
                <span className="font-mono text-slate-600">Lương / 26 * Công</span>
              </div>
              <div className="flex justify-between">
                <span>BHXH NLĐ:</span>
                <strong className="text-slate-900">10.5%</strong>
              </div>
              <div className="flex justify-between">
                <span>BHXH Doanh nghiệp:</span>
                <strong className="text-slate-900">21.5%</strong>
              </div>
            </div>
          </div>

          {/* Hình thức 2: Công nhật */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-700" />
                Lương Theo Công Nhật
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                Thợ phụ
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Áp dụng cho thợ phụ xưởng, thợ sơn, nhân sự phụ việc thi công ngắn hạn theo công nhật.
            </p>
            <div className="space-y-1 pt-1 border-t border-slate-200 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Định mức công:</span>
                <strong className="text-slate-900">8 giờ / công</strong>
              </div>
              <div className="flex justify-between">
                <span>Cách tính:</span>
                <span className="font-mono text-slate-600">Đơn giá ngày * Số công</span>
              </div>
              <div className="flex justify-between">
                <span>Ăn trưa / ca:</span>
                <strong className="text-slate-900">30.000đ - 50.000đ</strong>
              </div>
              <div className="flex justify-between">
                <span>Trừ BHXH:</span>
                <span className="text-slate-500">Không bắt buộc</span>
              </div>
            </div>
          </div>

          {/* Hình thức 3: Theo Giờ */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-700" />
                Lương Theo Giờ (Khoán)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                Part-time
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Áp dụng cho CTV thiết kế, thợ thời vụ mùa vụ cao điểm, sinh viên thực tập kỹ thuật.
            </p>
            <div className="space-y-1 pt-1 border-t border-slate-200 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Ghi nhận:</span>
                <strong className="text-slate-900">Checkin / Checkout</strong>
              </div>
              <div className="flex justify-between">
                <span>Cách tính:</span>
                <span className="font-mono text-slate-600">Đơn giá giờ * Tổng giờ</span>
              </div>
              <div className="flex justify-between">
                <span>Đơn giá mẫu:</span>
                <strong className="text-slate-900">35.000đ - 60.000đ/h</strong>
              </div>
              <div className="flex justify-between">
                <span>Hệ số đêm (&gt;22h):</span>
                <strong className="text-slate-900">+30% - 50%</strong>
              </div>
            </div>
          </div>

          {/* Hình thức 4: Theo Ca Sản Xuất */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-700" />
                Lương Theo Ca Sản Xuất
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                Xưởng kíp
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Áp dụng cho Thợ in bạt UV, Thợ cắt CNC Laser, Thợ hàn uốn chữ kíp ngày &amp; đêm.
            </p>
            <div className="space-y-1 pt-1 border-t border-slate-200 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>Ca ngày (8h):</span>
                <strong className="text-slate-900">420.000đ / ca</strong>
              </div>
              <div className="flex justify-between">
                <span>Ca đêm (8h):</span>
                <strong className="text-slate-900">550.000đ / ca</strong>
              </div>
              <div className="flex justify-between">
                <span>Phụ cấp độc hại:</span>
                <strong className="text-slate-900">1.000.000đ / tháng</strong>
              </div>
              <div className="flex justify-between">
                <span>Thưởng sản lượng:</span>
                <strong className="text-slate-900">Theo m² gia công</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CẤU HÌNH CHÍNH SÁCH QUỸ PHÉP NĂM (BỘ LUẬT LAO ĐỘNG) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Cấu Hình Chính Sách Quỹ Phép Năm (Annual Leave Policy)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Căn cứ Điều 113 &amp; Điều 114 Bộ Luật Lao Động 2019
          </span>
        </div>

        <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block font-semibold text-slate-800">
                Phép Năm Tiêu Chuẩn (ngày/năm)
              </label>
              <input
                type="number"
                min="12"
                max="24"
                value={policy.standard_days}
                onChange={(e) => setPolicy({ ...policy, standard_days: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                required
              />
              <p className="text-[10px] text-slate-500">
                Luật quy định tối thiểu 12 ngày làm việc cho điều kiện bình thường.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block font-semibold text-slate-800">
                Cộng Thâm Niên (năm làm việc)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={policy.seniority_bonus_years}
                onChange={(e) => setPolicy({ ...policy, seniority_bonus_years: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                required
              />
              <p className="text-[10px] text-slate-500">
                Cứ đủ 5 năm làm việc tại doanh nghiệp được cộng thêm 1 ngày phép.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block font-semibold text-slate-800">
                Phép Tồn Chuyển Tiếp Tối Đa (ngày)
              </label>
              <input
                type="number"
                min="0"
                max="12"
                value={policy.carryover_max_days}
                onChange={(e) => setPolicy({ ...policy, carryover_max_days: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                required
              />
              <p className="text-[10px] text-slate-500">
                Số ngày phép năm cũ được phép sử dụng sang năm tiếp theo (hạn hết Quý 1).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 flex flex-col justify-between">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Quy Đổi &amp; Chi Trả Tiền Phép Tồn
                </label>
                <p className="text-[10px] text-slate-500">
                  Cho phép thanh toán tiền mặt cho những ngày phép chưa nghỉ hết vào kỳ lương cuối năm.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(policy.cash_out_allowed)}
                  onChange={(e) => setPolicy({ ...policy, cash_out_allowed: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                />
                <span className="font-bold text-slate-900">Cho phép chi trả tiền mặt</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPolicy}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingPolicy ? "Đang lưu..." : "Cập Nhật Chính Sách Phép Năm"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* 3. BẢNG THEO DÕI SỐ DƯ QUỸ PHÉP TOÀN BỘ NHÂN SỰ CÔNG TY */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              3. Bảng Quản Lý Hạn Mức &amp; Số Dư Phép Năm Toàn Bộ Nhân Sự (Năm 2026)
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            Tổng cộng: {balances.length} nhân sự
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Mã NV</th>
                <th className="py-2.5 px-3">Họ Và Tên</th>
                <th className="py-2.5 px-3">Phòng Ban</th>
                <th className="py-2.5 px-3 text-center">Ngày Onboard</th>
                <th className="py-2.5 px-3 text-center">Thâm Niên</th>
                <th className="py-2.5 px-3 text-center">Phép Chuẩn</th>
                <th className="py-2.5 px-3 text-center">Phép Thâm Niên</th>
                <th className="py-2.5 px-3 text-center">Tổng Hưởng</th>
                <th className="py-2.5 px-3 text-center text-rose-700">Đã Nghỉ</th>
                <th className="py-2.5 px-3 text-center text-emerald-800 bg-emerald-50/40">Còn Lại</th>
                <th className="py-2.5 px-3 text-center">Chuyển Tiếp Tối Đa</th>
                <th className="py-2.5 px-3 text-center">Quy Đổi Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-400">
                    Chưa có dữ liệu số dư phép.
                  </td>
                </tr>
              ) : (
                balances.map((b) => (
                  <tr key={b.employeeId} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {b.employeeCode}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {b.employeeName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {b.departmentName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {b.onboardDate}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {b.yearsOfService} năm
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {b.standardDays}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      +{b.seniorityBonus}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {b.totalEntitled} ngày
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                      {b.usedDays} ngày
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-emerald-700 bg-emerald-50/30">
                      {b.remainingDays} ngày
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {b.carryoverEligible} ngày
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {b.cashOutAllowed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          Hợp lệ
                        </span>
                      ) : (
                        <span className="text-slate-400">Không</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
