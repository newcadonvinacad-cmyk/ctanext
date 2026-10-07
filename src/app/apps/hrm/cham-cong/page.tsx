"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Printer,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  MapPin,
  Users,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";
import { Badge, toast } from "@/components/ui";

interface TodayRosterItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
  lateMinutes: number;
  durationMinutes: number;
  source: string;
  status: "working" | "completed" | "late" | "absent";
  statusLabel: string;
}

export default function HrmChamCongPage() {
  const [activeTab, setActiveTab] = useState<"today" | "matrix">("today");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // State cho Điểm Danh Hôm Nay
  const [todaySummary, setTodaySummary] = useState({
    total: 0,
    working: 0,
    completed: 0,
    late: 0,
    absent: 0,
  });
  const [todayRoster, setTodayRoster] = useState<TodayRosterItem[]>([]);

  // State cho Ma Trận Tháng
  const [matrixData, setMatrixData] = useState<any>(null);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hrm/attendance/today-status");
      if (!res.ok) throw new Error("Lỗi tải điểm danh hôm nay");
      const json = await res.json();
      setTodaySummary(json.summary || { total: 0, working: 0, completed: 0, late: 0, absent: 0 });
      setTodayRoster(json.roster || []);
    } catch (e: any) {
      toast.error(e.message || "Không thể tải danh sách điểm danh");
    } finally {
      setLoading(false);
    }
  };

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/attendance?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Lỗi tải bảng chấm công tháng");
      const json = await res.json();
      setMatrixData(json);
    } catch (e: any) {
      toast.error(e.message || "Không thể tải ma trận chấm công");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "today") {
      fetchTodayData();
    } else {
      fetchMatrixData();
    }
  }, [activeTab, year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Lọc dữ liệu hôm nay
  const filteredTodayRoster = todayRoster.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      item.employeeName.toLowerCase().includes(q) ||
      item.employeeCode.toLowerCase().includes(q) ||
      item.departmentName.toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (statusFilter === "working") return item.status === "working";
    if (statusFilter === "late") return item.isLate;
    if (statusFilter === "absent") return item.status === "absent";
    if (statusFilter === "completed") return item.status === "completed";
    return true;
  });

  // Lọc dữ liệu ma trận tháng
  const daysInMonth = matrixData?.daysInMonth || 31;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredMatrixList = (matrixData?.matrix || []).filter((item: any) => {
    const q = search.toLowerCase();
    return (
      item.employeeName.toLowerCase().includes(q) ||
      item.employeeCode.toLowerCase().includes(q)
    );
  });

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} phút`;
    return `${h}h ${m}p`;
  };

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar Thanh Mảnh Theo Chuẩn UI/UX ERP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              HRM / Chấm Công & Ca Kíp
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              Quản Trị Điểm Danh Thực Tế & Bảng Công Doanh Nghiệp
            </h2>
          </div>

          {/* Sub-Tabs chuyển đổi Bảng Hôm Nay vs Ma Trận Tháng */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold ml-2">
            <button
              onClick={() => setActiveTab("today")}
              className={`px-3 py-1 rounded-md transition ${
                activeTab === "today"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📍 Điểm Danh Hôm Nay ({todaySummary.total})
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1 rounded-md transition ${
                activeTab === "matrix"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📅 Ma Trận Tháng (1..31)
            </button>
          </div>
        </div>

        {/* Nút hành động phải */}
        <div className="flex items-center gap-2">
          {activeTab === "matrix" && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-xs text-xs">
              <button onClick={handlePrevMonth} className="p-0.5 hover:bg-slate-100 rounded text-slate-600">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-bold text-slate-800">
                Tháng {month}/{year}
              </span>
              <button onClick={handleNextMonth} className="p-0.5 hover:bg-slate-100 rounded text-slate-600">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={activeTab === "today" ? fetchTodayData : fetchMatrixData}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {activeTab === "matrix" && (
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bảng Công</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* NỘI DUNG TAB 1: TÌNH TRẠNG ĐIỂM DANH HÔM NAY (REALTIME) */}
      {/* ======================================================== */}
      {activeTab === "today" && (
        <div className="space-y-3">
          {/* StatBar 1 Dòng Mật Độ Cao Chuẩn Enterprise */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-left transition ${
                statusFilter === "all" ? "bg-white shadow-xs font-bold" : "hover:bg-slate-100"
              }`}
            >
              <Users className="w-4 h-4 text-slate-700 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500">Quân số:</span>{" "}
                <strong className="text-slate-900 font-bold">{todaySummary.total}</strong>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("working")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-left border-l border-slate-200 transition ${
                statusFilter === "working" ? "bg-white shadow-xs font-bold" : "hover:bg-slate-100"
              }`}
            >
              <UserCheck className="w-4 h-4 text-slate-700 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500">Đang làm:</span>{" "}
                <strong className="text-slate-900 font-bold">{todaySummary.working}</strong>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("late")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-left border-l border-slate-200 transition ${
                statusFilter === "late" ? "bg-white shadow-xs font-bold" : "hover:bg-slate-100"
              }`}
            >
              <Clock className="w-4 h-4 text-slate-700 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500">Đi muộn:</span>{" "}
                <strong className="text-slate-900 font-bold">{todaySummary.late}</strong>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("completed")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-left border-l border-slate-200 transition ${
                statusFilter === "completed" ? "bg-white shadow-xs font-bold" : "hover:bg-slate-100"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500">Đã check-out:</span>{" "}
                <strong className="text-slate-900 font-bold">{todaySummary.completed}</strong>
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("absent")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-left border-l border-slate-200 transition ${
                statusFilter === "absent" ? "bg-white shadow-xs font-bold" : "hover:bg-slate-100"
              }`}
            >
              <UserX className="w-4 h-4 text-slate-700 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500">Chưa đến / Vắng:</span>{" "}
                <strong className="text-slate-900 font-bold">{todaySummary.absent}</strong>
              </div>
            </button>
          </div>

          {/* Table Toolbar Tìm Kiếm & Bộ Lọc Nhanh */}
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

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <span className="text-slate-400 text-[11px]">Lọc theo trạng thái:</span>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setStatusFilter("working")}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  statusFilter === "working" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                Đang làm ({todaySummary.working})
              </button>
              <button
                onClick={() => setStatusFilter("late")}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  statusFilter === "late" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800"
                }`}
              >
                Đi muộn ({todaySummary.late})
              </button>
              <button
                onClick={() => setStatusFilter("absent")}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  statusFilter === "absent" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800"
                }`}
              >
                Vắng ({todaySummary.absent})
              </button>
            </div>
          </div>

          {/* Bảng Dữ Liệu Điểm Danh Hôm Nay Mật Độ Cao */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">MÃ NV</th>
                    <th className="py-2.5 px-3">HỌ VÀ TÊN</th>
                    <th className="py-2.5 px-3">PHÒNG BAN</th>
                    <th className="py-2.5 px-3">GIỜ CHECK-IN</th>
                    <th className="py-2.5 px-3">GIỜ CHECK-OUT</th>
                    <th className="py-2.5 px-3">THỜI GIAN ĐÃ LÀM</th>
                    <th className="py-2.5 px-3">NGUỒN / ĐỊA ĐIỂM</th>
                    <th className="py-2.5 px-3">TRẠNG THÁI</th>
                    <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-50 shadow-xs">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTodayRoster.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Không có dữ liệu phù hợp với bộ lọc hiện tại
                      </td>
                    </tr>
                  ) : (
                    filteredTodayRoster.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                          {item.employeeCode}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.employeeName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{item.departmentName}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.checkInTime ? (
                            <span
                              className={`font-semibold ${
                                item.isLate ? "text-rose-600 font-bold" : "text-emerald-700"
                              }`}
                            >
                              {item.checkInTime}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {item.checkOutTime ? (
                            item.checkOutTime
                          ) : item.checkInTime ? (
                            <span className="text-amber-600 font-medium text-[11px]">Chưa check-out</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {item.durationMinutes > 0 ? formatMinutes(item.durationMinutes) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.source}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.status === "working" ? (
                            item.isLate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Muộn {item.lateMinutes} phút
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đang làm việc
                              </span>
                            )
                          ) : item.status === "completed" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Đã về ({item.checkOutTime})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Chưa điểm danh
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right sticky right-0 bg-white shadow-xs">
                          <Link
                            href={`/apps/hrm/nhan-su?empId=${item.employeeId}`}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition text-[11px]"
                          >
                            Hồ sơ
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NỘI DUNG TAB 2: MA TRẬN BẢNG CÔNG THÁNG 1..31 NGÀY */}
      {/* ======================================================== */}
      {activeTab === "matrix" && (
        <div className="space-y-3">
          {/* Chú thích ký hiệu & Thanh tìm kiếm */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nhân viên trong bảng công..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-400">Ký hiệu:</span>
              <span><strong className="text-emerald-700">1</strong>: Đủ công (8h)</span>
              <span><strong className="text-amber-600">½</strong>: Nửa công (&lt;5h)</span>
              <span><span className="px-1 py-0.2 bg-blue-100 text-blue-700 font-bold rounded">OT</span>: Có tăng ca</span>
              <span><strong className="text-rose-500">Q</strong>: Quên check-out</span>
              <span><strong className="text-slate-400">-</strong>: Vắng / Nghỉ</span>
            </div>
          </div>

          {/* Ma trận bảng chấm công */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left sticky left-0 bg-slate-50 z-10 w-44 shadow-xs">
                      NHÂN VIÊN
                    </th>
                    <th className="py-2 px-2 w-12 bg-emerald-50 text-emerald-800">CÔNG</th>
                    <th className="py-2 px-2 w-12 bg-blue-50 text-blue-800">OT (h)</th>
                    <th className="py-2 px-2 w-12 bg-rose-50 text-rose-800">MUỘN</th>
                    {daysArray.map((d) => {
                      const dateObj = new Date(year, month - 1, d);
                      const isSun = dateObj.getDay() === 0;
                      return (
                        <th
                          key={d}
                          className={`py-2 px-1 font-semibold min-w-[28px] ${
                            isSun ? "bg-rose-50 text-rose-600 font-bold" : "text-slate-600"
                          }`}
                        >
                          {d}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMatrixList.map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/70 transition">
                      <td className="py-2 px-3 text-left sticky left-0 bg-white z-10 shadow-xs">
                        <div className="font-bold text-slate-900">{emp.employeeName}</div>
                        <div className="text-[10px] font-mono text-blue-600">{emp.employeeCode}</div>
                      </td>
                      <td className="py-2 px-2 font-bold text-emerald-700 bg-emerald-50/30">
                        {emp.totalWorkDays}
                      </td>
                      <td className="py-2 px-2 font-bold text-blue-600 bg-blue-50/30">
                        {emp.totalOtHours || "-"}
                      </td>
                      <td className="py-2 px-2 font-semibold text-rose-600 bg-rose-50/30">
                        {emp.lateCount || "-"}
                      </td>
                      {daysArray.map((d) => {
                        const dayInfo = emp.days[d] || { status: "-" };
                        const dateObj = new Date(year, month - 1, d);
                        const isSun = dateObj.getDay() === 0;

                        return (
                          <td
                            key={d}
                            className={`py-2 px-1 border-l border-slate-100 ${
                              isSun ? "bg-rose-50/20" : ""
                            }`}
                          >
                            {dayInfo.status === "1" ? (
                              <span className="text-emerald-700 font-bold">1</span>
                            ) : dayInfo.status === "1/2" ? (
                              <span className="text-amber-600 font-semibold text-[10px]">½</span>
                            ) : dayInfo.status === "OT" ? (
                              <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-bold text-[9px]">OT</span>
                            ) : dayInfo.status === "Q" ? (
                              <span className="text-rose-500 font-bold text-[10px]">Q</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
