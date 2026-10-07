"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit3,
  Phone,
  Calendar,
  Building2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  X,
  Sliders,
  Sparkles,
  RefreshCw,
  Award,
} from "lucide-react";
import { Badge, Modal, toast } from "@/components/ui";

export default function HrmNhanSuPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  // State chỉnh sửa chính sách lương nhân sự
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state cho chính sách lương
  const [policyForm, setPolicyForm] = useState<any>({
    loai: "Tháng",
    muc_luong: 10000000,
    cong_chuan: 26,
    tong_phep: 12,
    ngay_onboard: "2026-01-01",
    luong_gio_mac_dinh: 0,
    he_so_ot: 150,
    he_so_ot_t7: 150,
    he_so_ot_cn: 200,
    he_so_le: 300,
    thuong_bat: true,
    thuong: [],
    phu_cap_bat: true,
    phu_cap: [],
    phat_bat: true,
    phat_muon: 50000,
    phat_quen_cham: 50000,
    luong_bhxh: 5500000,
    ptram_bhxh: 10.5,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, tplRes] = await Promise.all([
        fetch("/api/hrm/employees"),
        fetch("/api/hrm/templates"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplates(tplData.templates || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải danh sách nhân sự");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (emp: any) => {
    setSelectedEmp(emp);
    const existing = emp.policy || {};
    setPolicyForm({
      loai: existing.loai || "Tháng",
      muc_luong: existing.muc_luong || emp.baseSalary || 10000000,
      cong_chuan: existing.cong_chuan || 26,
      tong_phep: existing.tong_phep || 12,
      ngay_onboard: existing.ngay_onboard || emp.hireDate || "2026-01-01",
      luong_gio_mac_dinh: existing.luong_gio_mac_dinh || 0,
      he_so_ot: existing.he_so_ot || 150,
      he_so_ot_t7: existing.he_so_ot_t7 || 150,
      he_so_ot_cn: existing.he_so_ot_cn || 200,
      he_so_le: existing.he_so_le || 300,
      thuong_bat: existing.thuong_bat ?? true,
      thuong: existing.thuong || [{ ten: "Thưởng chuyên cần", so_tien: 500000, tu_dong: true }],
      phu_cap_bat: existing.phu_cap_bat ?? true,
      phu_cap: existing.phu_cap || [{ ten: "Ăn trưa", so_tien: 730000, mien_thue: true }],
      phat_bat: existing.phat_bat ?? true,
      phat_muon: existing.phat_muon ?? 50000,
      phat_quen_cham: existing.phat_quen_cham ?? 50000,
      luong_bhxh: existing.luong_bhxh || 5500000,
      ptram_bhxh: existing.ptram_bhxh ?? 10.5,
      template_code: existing.template_code || emp.templateCode || "",
    });
    setEditModalOpen(true);
  };

  const applyTemplate = (templateCode: string) => {
    const tpl = templates.find((t) => t.code === templateCode);
    if (!tpl) return;
    const p = tpl.policy;
    setPolicyForm((prev: any) => ({
      ...prev,
      ...p,
      template_code: tpl.code,
      muc_luong: prev.muc_luong, // giữ nguyên lương thỏa thuận
    }));
    toast.success(`Đã áp dụng mẫu: ${tpl.name}`);
  };

  const handleSavePolicy = async () => {
    if (!selectedEmp) return;
    try {
      setSaving(true);
      const res = await fetch("/api/hrm/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmp.id,
          policy: policyForm,
        }),
      });

      if (!res.ok) throw new Error("Lỗi lưu chính sách lương");

      toast.success(`Đã lưu chính sách lương cho ${selectedEmp.name}`);
      setEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const formatVnd = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const filteredEmployees = employees.filter((e) => {
    const matchSearch =
      (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.phone || "").includes(search);
    const matchDept = selectedDept === "all" || e.departmentId === selectedDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar Thanh Mảnh Theo Chuẩn UI/UX ERP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            HRM / Hồ Sơ Nhân Sự
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            Quản Lý Nhân Viên & Cấu Hình Chính Sách Lương Đãi Ngộ
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/apps/hrm/che-do-luong"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Chế Độ Lương & Quỹ Phép</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter Bar Gọn Gàng */}
      <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, mã NV, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden text-slate-700 bg-white shadow-xs"
          >
            <option value="all">Tất cả phòng ban</option>
            <option value="dept-prod">Xưởng sản xuất</option>
            <option value="dept-field">Thi công hiện trường</option>
            <option value="dept-office">Văn phòng / Kế toán</option>
          </select>
        </div>
      </div>

      {/* 3. Bảng Danh Sách Nhân Viên */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã NV</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Phòng Ban / Vị Trí</th>
                <th className="py-3 px-4">Ngày Onboard</th>
                <th className="py-3 px-4">Lương Cơ Bản</th>
                <th className="py-3 px-4">Công Chuẩn</th>
                <th className="py-3 px-4">Hệ Số OT</th>
                <th className="py-3 px-4">Chính Sách Lương</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const pol = emp.policy || {};
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {emp.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      {emp.phone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {emp.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {emp.departmentName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.hireDate || "01/01/2026"}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {formatVnd(emp.baseSalary)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{pol.cong_chuan || 26}</span> ngày
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                        OT: {pol.he_so_ot || 150}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {pol.loai || "Tháng"} • {pol.template_code || "Tiêu chuẩn"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          BHXH: {formatVnd(pol.luong_bhxh)} ({pol.ptram_bhxh || 10.5}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Chính Sách Lương
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Chỉnh Sửa Chính Sách Lương Nhân Sự */}
      {editModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Cấu Hình Chính Sách Lương & Chế Độ: {selectedEmp.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Mã nhân viên: {selectedEmp.code} • Phòng ban: {selectedEmp.departmentName}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Presets: Chọn Mẫu Nhanh */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Áp Dụng Nhanh Theo Mẫu Chính Sách (Tiện ích không cần nhập tay):
                  </label>
                  <span className="text-[11px] text-blue-700">Tự điền tất cả các trường bên dưới</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.code}
                      type="button"
                      onClick={() => applyTemplate(tpl.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        policyForm.template_code === tpl.code
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:bg-blue-50/50"
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhóm 1: Cơ chế & Mức lương */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  1. Mức Lương & Công Chuẩn
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Loại hình tính lương
                    </label>
                    <select
                      value={policyForm.loai}
                      onChange={(e) => setPolicyForm({ ...policyForm, loai: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="Tháng">Lương Tháng</option>
                      <option value="Giờ">Lương Giờ</option>
                      <option value="Ca">Lương Theo Ca</option>
                      <option value="Khoán">Lương Khoán / Dự Án</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mức lương thỏa thuận (VND)
                    </label>
                    <input
                      type="number"
                      value={policyForm.muc_luong}
                      onChange={(e) => setPolicyForm({ ...policyForm, muc_luong: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Công chuẩn trong tháng (ngày)
                    </label>
                    <input
                      type="number"
                      value={policyForm.cong_chuan}
                      onChange={(e) => setPolicyForm({ ...policyForm, cong_chuan: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày onboard (bắt đầu)
                    </label>
                    <input
                      type="date"
                      value={policyForm.ngay_onboard}
                      onChange={(e) => setPolicyForm({ ...policyForm, ngay_onboard: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tổng ngày phép năm
                    </label>
                    <input
                      type="number"
                      value={policyForm.tong_phep}
                      onChange={(e) => setPolicyForm({ ...policyForm, tong_phep: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Đơn giá giờ tự tính (VND)
                    </label>
                    <div className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700">
                      {formatVnd(Math.round((policyForm.muc_luong || 0) / ((policyForm.cong_chuan || 26) * 8)))} / giờ
                    </div>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Hệ số Tăng ca OT */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  2. Hệ Số Tăng Ca OT (%)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ngày thường (%)
                    </label>
                    <input
                      type="number"
                      value={policyForm.he_so_ot}
                      onChange={(e) => setPolicyForm({ ...policyForm, he_so_ot: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Thứ 7 (%)
                    </label>
                    <input
                      type="number"
                      value={policyForm.he_so_ot_t7}
                      onChange={(e) => setPolicyForm({ ...policyForm, he_so_ot_t7: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Chủ nhật (%)
                    </label>
                    <input
                      type="number"
                      value={policyForm.he_so_ot_cn}
                      onChange={(e) => setPolicyForm({ ...policyForm, he_so_ot_cn: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ngày Lễ / Tết (%)
                    </label>
                    <input
                      type="number"
                      value={policyForm.he_so_le}
                      onChange={(e) => setPolicyForm({ ...policyForm, he_so_le: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Phạt vi phạm & Bảo hiểm xã hội */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  3. Quy Tắc Phạt Tự Động & Trích Đóng BHXH
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900">Quy tắc phạt đi muộn & quên chấm</span>
                      <input
                        type="checkbox"
                        checked={policyForm.phat_bat}
                        onChange={(e) => setPolicyForm({ ...policyForm, phat_bat: e.target.checked })}
                        className="rounded text-rose-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600">Phạt đi muộn (đ/lần)</label>
                        <input
                          type="number"
                          value={policyForm.phat_muon}
                          onChange={(e) => setPolicyForm({ ...policyForm, phat_muon: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600">Phạt quên dập thẻ (đ/lần)</label>
                        <input
                          type="number"
                          value={policyForm.phat_quen_cham}
                          onChange={(e) => setPolicyForm({ ...policyForm, phat_quen_cham: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg mt-0.5"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                    <span className="text-xs font-bold text-indigo-900">Bảo hiểm xã hội (BHXH)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-600">Mức lương đóng BHXH (đ)</label>
                        <input
                          type="number"
                          value={policyForm.luong_bhxh}
                          onChange={(e) => setPolicyForm({ ...policyForm, luong_bhxh: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600">Tỷ lệ NLĐ trích đóng (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={policyForm.ptram_bhxh}
                          onChange={(e) => setPolicyForm({ ...policyForm, ptram_bhxh: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Các thay đổi sẽ tự động áp dụng vào Bảng tính lương kỳ này
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Lưu Chính Sách Lương
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
