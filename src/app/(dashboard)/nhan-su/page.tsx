"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  Phone,
  HardHat,
  ChevronRight,
  Printer,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  totalCheckIns: number;
  lastCheckInAt: string | null;
  workDays: number;
}

export default function NhanSuPage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "daily_reports" | "employees">("attendance");
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/hr/attendance");
      if (!res.ok) {
        throw new Error("Không thể tải dữ liệu chấm công nhân sự");
      }
      const data = await res.json();
      setAttendances(data.attendance || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  useSetPageHeader({
    title: "Nhân Sự & Chấm Công",
    subtitle: "Dữ liệu chấm công GPS, quản lý tổ đội thợ cơ khí & hoàn thiện",
    badge: "Nhân Sự",
    views: [
      { label: "Bảng Chấm Công", active: activeTab === "attendance", onClick: () => setActiveTab("attendance") },
      { label: "Báo Cáo Nhật Ký", active: activeTab === "daily_reports", onClick: () => setActiveTab("daily_reports") },
      { label: "Hồ Sơ Nhân Sự", active: activeTab === "employees", onClick: () => setActiveTab("employees") },
    ],
    primaryAction: (
      <div className="flex items-center gap-1.5">
        <Link
          href="/nhan-su/danh-gia-luong"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Đánh Giá & Phê Duyệt Lương
        </Link>
        <button
          onClick={fetchAttendance}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    ),
  });

  const filteredAttendance = useMemo(() => {
    return attendances.filter(
      (a) =>
        a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [attendances, searchQuery]);

  return (
    <div className="space-y-4">


      {/* 2. StatBar 1 dòng thu gọn theo quy chuẩn UI/UX */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 px-2">
          <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Tổng Nhân Sự:</span>{" "}
            <strong className="text-slate-900 font-bold">{attendances.length || 3} người</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <CalendarCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Check-in Hôm Nay:</span>{" "}
            <strong className="text-emerald-600 font-bold">100% (3/3 thợ)</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Tăng Ca (OT):</span>{" "}
            <strong className="text-amber-600 font-bold">18.5 giờ</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <HardHat className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Quy Mô Tổ Đội:</span>{" "}
            <strong className="text-purple-600 font-bold">4 Tổ Chuyên Trách</strong>
          </div>
        </div>
      </div>

      {/* 3. Sub-tabs điều hướng */}
      <div className="border-b border-slate-200 bg-white px-3 rounded-t-xl border-x">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`py-3 px-1 border-b-2 font-medium text-xs transition flex items-center gap-1.5 ${
              activeTab === "attendance"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            1. Bảng Chấm Công Tháng 03/2026
          </button>
          <button
            onClick={() => setActiveTab("daily_reports")}
            className={`py-3 px-1 border-b-2 font-medium text-xs transition flex items-center gap-1.5 ${
              activeTab === "daily_reports"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Nhật Ký Báo Cáo Ngày (Daily Reports)
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`py-3 px-1 border-b-2 font-medium text-xs transition flex items-center gap-1.5 ${
              activeTab === "employees"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Users className="w-4 h-4" />
            3. Hồ Sơ Nhân Sự & Tổ Đội
          </button>
        </nav>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. NỘI DUNG TỪNG SUB-TAB */}
      {activeTab === "attendance" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên thợ, mã NV..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Kỳ công chuẩn: <strong className="text-slate-800">26 công</strong>
              </span>
              <button 
                onClick={() => window.print()}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-100 text-slate-600"
                title="In bảng chấm công"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Mã NV</th>
                  <th className="px-3 py-2.5">Họ và Tên</th>
                  <th className="px-3 py-2.5 text-center">Số Ngày Công</th>
                  <th className="px-3 py-2.5 text-center">Lượt GPS Check-in</th>
                  <th className="px-3 py-2.5">Lần Check-in Gần Nhất</th>
                  <th className="px-3 py-2.5 text-center">Tăng Ca (OT)</th>
                  <th className="px-3 py-2.5 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Đang đồng bộ dữ liệu chấm công...
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Không tìm thấy bản ghi chấm công nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5 font-semibold text-blue-600 font-mono">
                        {rec.employeeCode}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {rec.employeeName}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded">
                          {rec.workDays} / 26 công
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="info" className="text-[11px]">
                          {rec.totalCheckIns} lượt
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                        {rec.lastCheckInAt
                          ? new Date(rec.lastCheckInAt).toLocaleString("vi-VN")
                          : "Xưởng cơ khí (Vân Đồn)"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-amber-600 font-bold">
                          {rec.employeeCode === "NV-THO" ? "+6.5 giờ" : "+0 giờ"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="success" className="text-[10px]">Hợp lệ</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "daily_reports" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Nhật Ký Báo Cáo Công Việc & Hiện Trường Hôm Nay
            </h3>
            <span className="text-[11px] text-slate-500">Đồng bộ tức thời từ App Mobile Thợ Hiện Trường M14</span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Nguyễn Văn Thợ (NV-THO)</span>
                    <Badge variant="info" className="text-[10px]">Tổ Cơ Khí & Hàn</Badge>
                    <span className="text-[11px] text-slate-400">17:30 hôm nay</span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    <strong>Dự án:</strong> Biển Hộp Đèn 3M Vincom Ocean Park (DA-2026-001)
                  </p>
                  <p className="text-slate-700 mt-1.5 bg-white p-2.5 rounded border border-slate-200 leading-relaxed">
                    &quot;Đã hoàn thiện liên kết bu lông bản mã chân cột, lắp xong 2 module khung sắt hộp 30x30. 
                    Đã căn chỉnh tia laser thăng bằng. Dự kiến sáng mai cho tổ led tiến hành luồn dây và gắn bóng NC.&quot;
                  </p>
                </div>
                <Badge variant="success" className="text-[10px]">Đã duyệt WBS</Badge>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Lê Văn Lái (NV-LAI)</span>
                    <Badge variant="neutral" className="text-[10px]">Đội Xe Vận Tải</Badge>
                    <span className="text-[11px] text-slate-400">14:15 hôm nay</span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    <strong>Dự án:</strong> Showroom Toyota Mỹ Đình (DA-2026-002)
                  </p>
                  <p className="text-slate-700 mt-1.5 bg-white p-2.5 rounded border border-slate-200 leading-relaxed">
                    &quot;Xe tải 29H-888.88 đã vận chuyển 55 tấm Alu Alcorest và vật tư phụ đến chân công trình an toàn. 
                    Thủ kho công trình đã ký biên bản giao nhận đủ số lượng.&quot;
                  </p>
                </div>
                <Badge variant="success" className="text-[10px]">Hoàn thành chuyến</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "employees" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Danh Sách Nhân Sự & Phân Chia Tổ Đội Sản Xuất
            </h3>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition">
              <UserPlus className="w-3.5 h-3.5" /> Thêm Nhân Viên Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  VT
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Nguyễn Văn Thợ</h4>
                  <p className="text-[11px] text-slate-500">Mã: NV-THO • Thợ Cả Cơ Khí</p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tổ Trưởng Tổ Cơ Khí & Hàn Xưởng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>0988.111.222</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                  QL
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Trần Quản Lý</h4>
                  <p className="text-[11px] text-slate-500">Mã: NV-DUAN • Chỉ Huy Trưởng</p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phòng Quản Lý Thi Công Hiện Trường</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>0977.333.444</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs">
                  TX
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Lê Văn Lái</h4>
                  <p className="text-[11px] text-slate-500">Mã: NV-LAI • Tài Xế Xe Tải</p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đội Xe Vận Tải & Cẩu Nâng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>0966.555.666</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
