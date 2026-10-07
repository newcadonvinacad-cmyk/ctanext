"use client";

import * as React from "react";
import {
  Clock,
  CalendarDays,
  Plus,
  Check,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  X,
} from "lucide-react";

interface WorkShift {
  id: string;
  code: string;
  name: string;
  type: "standard" | "split" | "overnight" | "parttime";
  start_time: string;
  end_time: string;
  break_minutes: number;
  work_hours: number;
  split_start_time?: string | null;
  split_end_time?: string | null;
  night_multiplier: number;
  is_default: boolean;
  is_active: boolean;
}

interface HolidayConfig {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  multiplier: number;
  is_paid: boolean;
  note: string | null;
}

export default function CaVaLePage() {
  const [shifts, setShifts] = React.useState<WorkShift[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayConfig[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  // Modal thêm/sửa ca làm việc
  const [editingShift, setEditingShift] = React.useState<Partial<WorkShift> | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = React.useState(false);

  // Modal thêm/sửa ngày lễ
  const [editingHoliday, setEditingHoliday] = React.useState<Partial<HolidayConfig> | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = React.useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resShifts, resHolidays] = await Promise.all([
        fetch("/api/hrm/shifts"),
        fetch("/api/hrm/holidays"),
      ]);
      const jsonShifts = await resShifts.json();
      const jsonHolidays = await resHolidays.json();

      if (jsonShifts.success) setShifts(jsonShifts.data || []);
      if (jsonHolidays.success) setHolidays(jsonHolidays.data || []);
    } catch (err: any) {
      console.error("Lỗi tải dữ liệu ca & lễ:", err);
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

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift?.code || !editingShift?.name || !editingShift?.start_time || !editingShift?.end_time) {
      alert("Vui lòng điền đủ mã ca, tên ca, giờ bắt đầu và giờ kết thúc.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/hrm/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editingShift.code,
          name: editingShift.name,
          type: editingShift.type || "standard",
          startTime: editingShift.start_time,
          endTime: editingShift.end_time,
          breakMinutes: Number(editingShift.break_minutes) || 0,
          workHours: Number(editingShift.work_hours) || 8.0,
          splitStartTime: editingShift.split_start_time || null,
          splitEndTime: editingShift.split_end_time || null,
          nightMultiplier: Number(editingShift.night_multiplier) || 130,
          isDefault: Boolean(editingShift.is_default),
          isActive: editingShift.is_active !== undefined ? Boolean(editingShift.is_active) : true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast("Đã lưu ca làm việc thành công!");
      setIsShiftModalOpen(false);
      setEditingShift(null);
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi lưu ca làm việc: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      alert("Không thể xóa ca làm việc mặc định.");
      return;
    }
    if (!confirm("Xác nhận xóa ca làm việc này?")) return;
    try {
      const res = await fetch(`/api/hrm/shifts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Đã xóa ca làm việc.");
      fetchData();
    } catch (err: any) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday?.code || !editingHoliday?.name || !editingHoliday?.start_date || !editingHoliday?.end_date) {
      alert("Vui lòng điền đủ thông tin ngày lễ.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/hrm/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editingHoliday.code,
          name: editingHoliday.name,
          startDate: editingHoliday.start_date,
          endDate: editingHoliday.end_date,
          multiplier: Number(editingHoliday.multiplier) || 300,
          isPaid: editingHoliday.is_paid !== undefined ? Boolean(editingHoliday.is_paid) : true,
          note: editingHoliday.note || "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      showToast("Đã lưu ngày lễ thành công!");
      setIsHolidayModalOpen(false);
      setEditingHoliday(null);
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi lưu ngày lễ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Xác nhận xóa ngày nghỉ lễ này?")) return;
    try {
      const res = await fetch(`/api/hrm/holidays?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast("Đã xóa ngày lễ.");
      fetchData();
    } catch (err: any) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  const getShiftTypeBadge = (type: string) => {
    switch (type) {
      case "split":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800">Ca Ghép / Gãy</span>;
      case "overnight":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-100">Ca Đêm (150%)</span>;
      case "parttime":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">Part-Time (4h)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">Ca Chuẩn (8h)</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast notification */}
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
            <Clock className="w-5 h-5 text-slate-700" />
            <h1 className="text-base font-bold text-slate-900">
              Cấu Hình Ca Làm Việc & Lịch Nghỉ Lễ Năm 2026
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập danh mục ca chuẩn, ca ghép, ca kíp xưởng, hệ số ngoài giờ và ngày lễ theo Bộ Luật Lao Động
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

      {/* 4 Thẻ tóm tắt quy chuẩn */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Danh Mục Ca</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{shifts.length} ca</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Đã phân bổ cho Xưởng & Thi công</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Ca Mặc Định</span>
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {shifts.find((s) => s.is_default)?.name || "Ca Hành Chính"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">08:00 - 17:30 (8.0 giờ công)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Nghỉ Lễ Năm 2026</span>
            <CalendarDays className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{holidays.length} đợt lễ</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Hưởng 100% nguyên lương</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Hệ Số Làm Ngày Lễ</span>
            <Sliders className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">300%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Theo Điều 98 BLLĐ số 45/2019</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PHẦN 1: BẢNG DANH MỤC CA LÀM VIỆC */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Cấu Hình Danh Mục Ca Làm Việc (Work Shifts)
            </h2>
          </div>
          <button
            onClick={() => {
              setEditingShift({
                code: `SHIFT_${Date.now().toString().slice(-4)}`,
                name: "",
                type: "standard",
                start_time: "08:00",
                end_time: "17:30",
                break_minutes: 60,
                work_hours: 8.0,
                night_multiplier: 130,
                is_default: false,
                is_active: true,
              });
              setIsShiftModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Ca Mới</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Mã Ca</th>
                <th className="py-2.5 px-3">Tên Ca Làm Việc</th>
                <th className="py-2.5 px-3">Loại Ca</th>
                <th className="py-2.5 px-3 text-center">Khung Giờ Hoạt Động</th>
                <th className="py-2.5 px-3 text-center">Nghỉ Trưa/Giữa Ca</th>
                <th className="py-2.5 px-3 text-center">Công Chuẩn</th>
                <th className="py-2.5 px-3 text-center">Hệ Số Ca Đêm</th>
                <th className="py-2.5 px-3 text-center">Mặc Định</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    Chưa có ca làm việc nào.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {s.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {s.name}
                    </td>
                    <td className="py-2.5 px-3">{getShiftTypeBadge(s.type)}</td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {s.type === "split" ? (
                        <span>
                          {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} &amp;{" "}
                          {s.split_start_time?.slice(0, 5) || "16:00"} -{" "}
                          {s.split_end_time?.slice(0, 5) || "20:00"}
                        </span>
                      ) : (
                        <span>
                          {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">
                      {s.break_minutes > 0 ? `${s.break_minutes} phút` : "Không nghỉ"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {s.work_hours} giờ (1 công)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                      {s.night_multiplier}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {s.is_default ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                          Mặc định
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingShift(s);
                          setIsShiftModalOpen(true);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
                        title="Sửa ca"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!s.is_default && (
                        <button
                          onClick={() => handleDeleteShift(s.id, s.is_default)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                          title="Xóa ca"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PHẦN 2: LỊCH NGHỈ LỄ NĂM 2026 THEO LUẬT LAO ĐỘNG */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Lịch Nghỉ Lễ Quốc Gia Năm 2026 (Bộ Luật Lao Động)
            </h2>
          </div>
          <button
            onClick={() => {
              setEditingHoliday({
                code: `HOLIDAY_${Date.now().toString().slice(-4)}`,
                name: "",
                start_date: "2026-05-02",
                end_date: "2026-05-02",
                multiplier: 300,
                is_paid: true,
                note: "",
              });
              setIsHolidayModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Ngày Lễ</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Mã Lễ</th>
                <th className="py-2.5 px-3">Tên Ngày Lễ</th>
                <th className="py-2.5 px-3 text-center">Từ Ngày</th>
                <th className="py-2.5 px-3 text-center">Đến Ngày</th>
                <th className="py-2.5 px-3 text-center">Hệ Số Lương Đi Làm</th>
                <th className="py-2.5 px-3 text-center">Hưởng Nguyên Lương</th>
                <th className="py-2.5 px-3">Ghi Chú Quy Định</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holidays.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    Chưa có cấu hình ngày lễ nào.
                  </td>
                </tr>
              ) : (
                holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {h.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {h.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {h.start_date}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {h.end_date}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                      {h.multiplier}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {h.is_paid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          Hưởng 100%
                        </span>
                      ) : (
                        <span className="text-slate-400">Không lương</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {h.note || "Quy định BLLĐ"}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingHoliday(h);
                          setIsHolidayModalOpen(true);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
                        title="Sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PHẦN 3: BẢNG QUY ĐỊNH HỆ SỐ LÀM THÊM GIỜ (OT MULTIPLIERS) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            3. Quy Định Hệ Số Ngoài Giờ (OT &amp; Phụ Cấp Ca Đêm)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500 font-medium">Làm Thêm Ngày Thường</div>
            <div className="text-lg font-black text-slate-900 mt-1">150%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Lương giờ x 1.5</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500 font-medium">Làm Thêm Thứ Bảy</div>
            <div className="text-lg font-black text-slate-900 mt-1">150%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Hoặc tính theo ca thứ 7</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500 font-medium">Làm Thêm Chủ Nhật</div>
            <div className="text-lg font-black text-slate-900 mt-1">200%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ngày nghỉ hàng tuần x 2.0</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500 font-medium">Làm Thêm Ngày Nghỉ Lễ</div>
            <div className="text-lg font-black text-slate-900 mt-1">300%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Chưa kể lương ngày nghỉ lễ</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL THÊM / SỬA CA LÀM VIỆC */}
      {/* ======================================================== */}
      {isShiftModalOpen && editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingShift.id ? "Chỉnh Sửa Ca Làm Việc" : "Thêm Ca Làm Việc Mới"}
              </h3>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mã Ca (*)</label>
                  <input
                    type="text"
                    value={editingShift.code || ""}
                    onChange={(e) => setEditingShift({ ...editingShift, code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Loại Ca</label>
                  <select
                    value={editingShift.type || "standard"}
                    onChange={(e) => setEditingShift({ ...editingShift, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="standard">Ca chuẩn (Hành chính / Xưởng)</option>
                    <option value="split">Ca ghép 2 buổi (Ca gãy)</option>
                    <option value="overnight">Ca đêm (Qua 00:00)</option>
                    <option value="parttime">Ca bán thời gian (Part-time)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tên Ca (*)</label>
                <input
                  type="text"
                  value={editingShift.name || ""}
                  onChange={(e) => setEditingShift({ ...editingShift, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  placeholder="Ví dụ: Ca Kíp Sáng Xưởng In"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giờ Bắt Đầu (*)</label>
                  <input
                    type="time"
                    value={editingShift.start_time || "08:00"}
                    onChange={(e) => setEditingShift({ ...editingShift, start_time: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giờ Kết Thúc (*)</label>
                  <input
                    type="time"
                    value={editingShift.end_time || "17:30"}
                    onChange={(e) => setEditingShift({ ...editingShift, end_time: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              {/* Nếu là ca ghép (split) */}
              {editingShift.type === "split" && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-bold text-slate-800">Cấu hình buổi thứ 2 của Ca Ghép:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Giờ Bắt Đầu Buổi 2</label>
                      <input
                        type="time"
                        value={editingShift.split_start_time || "16:00"}
                        onChange={(e) => setEditingShift({ ...editingShift, split_start_time: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Giờ Kết Thúc Buổi 2</label>
                      <input
                        type="time"
                        value={editingShift.split_end_time || "20:00"}
                        onChange={(e) => setEditingShift({ ...editingShift, split_end_time: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nghỉ Giữa Ca (phút)</label>
                  <input
                    type="number"
                    value={editingShift.break_minutes ?? 60}
                    onChange={(e) => setEditingShift({ ...editingShift, break_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giờ Công Tiêu Chuẩn</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingShift.work_hours ?? 8.0}
                    onChange={(e) => setEditingShift({ ...editingShift, work_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hệ Số Ca Đêm (%)</label>
                  <input
                    type="number"
                    value={editingShift.night_multiplier ?? 130}
                    onChange={(e) => setEditingShift({ ...editingShift, night_multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_default_shift"
                  checked={Boolean(editingShift.is_default)}
                  onChange={(e) => setEditingShift({ ...editingShift, is_default: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="is_default_shift" className="text-slate-700 font-medium cursor-pointer">
                  Đặt làm ca mặc định cho toàn công ty
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs"
                >
                  {saving ? "Đang lưu..." : "Lưu Ca Làm Việc"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL THÊM / SỬA NGÀY LỄ */}
      {/* ======================================================== */}
      {isHolidayModalOpen && editingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingHoliday.id ? "Chỉnh Sửa Ngày Lễ" : "Thêm Ngày Nghỉ Lễ Năm 2026"}
              </h3>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mã Lễ (*)</label>
                  <input
                    type="text"
                    value={editingHoliday.code || ""}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hệ Số Lương Đi Làm (%)</label>
                  <input
                    type="number"
                    value={editingHoliday.multiplier ?? 300}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tên Dịp Nghỉ Lễ (*)</label>
                <input
                  type="text"
                  value={editingHoliday.name || ""}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  placeholder="Ví dụ: Nghỉ Tết Dương Lịch 2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Từ Ngày (*)</label>
                  <input
                    type="date"
                    value={editingHoliday.start_date || "2026-01-01"}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Đến Ngày (*)</label>
                  <input
                    type="date"
                    value={editingHoliday.end_date || "2026-01-01"}
                    onChange={(e) => setEditingHoliday({ ...editingHoliday, end_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ghi Chú Quy Định</label>
                <textarea
                  value={editingHoliday.note || ""}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, note: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  placeholder="Căn cứ Điều 112 Bộ luật Lao động 2019..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_paid_holiday"
                  checked={editingHoliday.is_paid !== false}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, is_paid: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="is_paid_holiday" className="text-slate-700 font-medium cursor-pointer">
                  Người lao động được nghỉ và hưởng nguyên lương (100%)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs"
                >
                  {saving ? "Đang lưu..." : "Lưu Ngày Lễ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
