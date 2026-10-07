"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  CircleDollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  Sliders,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui";

export default function HrmOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, payRes] = await Promise.all([
        fetch("/api/hrm/employees"),
        fetch("/api/hrm/payroll/calculate"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayrollSummary(payData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatVnd = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalEmployees = employees.length || 0;
  const activeEmployees = employees.filter((e) => e.isActive).length || totalEmployees;
  const totalBaseSalary = employees.reduce((sum, e) => sum + (e.baseSalary || 0), 0);

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.name || "").toLowerCase().includes(q) ||
      (e.code || "").toLowerCase().includes(q) ||
      (e.departmentName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar Thanh Mảnh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            HRM / Tổng Quan Điều Hành
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            Quân Số Thực Tế & Quỹ Lương Biển Quảng Cáo (Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/apps/hrm/tinh-luong"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            <span>Bảng Tính Lương Tháng</span>
          </Link>
        </div>
      </div>

      {/* 2. StatBar 1 Dòng Thu Gọn Chuẩn Enterprise */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 px-2">
          <Users className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Tổng Quân Số:</span>{" "}
            <strong className="text-slate-900 font-bold">{totalEmployees} nhân sự</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <CalendarCheck className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Đi Làm Hôm Nay:</span>{" "}
            <strong className="text-slate-900 font-bold">100% ({activeEmployees}/{activeEmployees})</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <CircleDollarSign className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Quỹ Lương Cơ Bản:</span>{" "}
            <strong className="text-slate-900 font-bold">{formatVnd(totalBaseSalary)}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <TrendingUp className="w-4 h-4 text-slate-700 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Dự Tính Net:</span>{" "}
            <strong className="text-slate-900 font-bold">{formatVnd(payrollSummary?.totalNetPayout || 0)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Bảng Dữ Liệu Nhân Sự & Chính Sách Mật Độ Cao (High-Density Data Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm nhân viên, mã NV, phòng ban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link
              href="/apps/hrm/nhan-su"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Quản lý chi tiết hồ sơ &rarr;
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">MÃ NV</th>
                <th className="py-2.5 px-3">HỌ VÀ TÊN</th>
                <th className="py-2.5 px-3">PHÒNG BAN</th>
                <th className="py-2.5 px-3 text-right">LƯƠNG CƠ BẢN</th>
                <th className="py-2.5 px-3 text-center">CÔNG CHUẨN</th>
                <th className="py-2.5 px-3 text-center">HỆ SỐ OT</th>
                <th className="py-2.5 px-3">MẪU CHÍNH SÁCH</th>
                <th className="py-2.5 px-3">NGÀY ONBOARD</th>
                <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-50 shadow-xs">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const pol = emp.policy || {};
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{emp.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{emp.departmentName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatVnd(emp.baseSalary)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      {pol.cong_chuan || 26} ngày
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                        {pol.he_so_ot || 150}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-slate-700">
                        {pol.loai || "Tháng"} • {pol.template_code || "Tiêu chuẩn"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {emp.hireDate || "01/01/2026"}
                    </td>
                    <td className="py-2.5 px-3 text-right sticky right-0 bg-white shadow-xs">
                      <Link
                        href={`/apps/hrm/nhan-su?empId=${emp.id}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition text-[11px]"
                      >
                        Chính sách
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
