"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FolderKanban,
  HardHat,
  Truck,
  Sparkles,
  RefreshCw,
  CreditCard,
  ShoppingCart,
  Users,
  ShieldCheck,
  ChevronRight,
  Package
} from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";

interface ExecutiveKpi {
  totalRevenue: number;
  totalExpense: number;
  grossProfit: number;
  cashBalance: number;
  bankBalance: number;
  receivablesTotal: number;
  payablesTotal: number;
  activeProjectsCount: number;
  inProgressTasksCount: number;
  inventoryAlertsCount: number;
}

export default function ExecutiveDashboardPage() {
  const [kpi, setKpi] = useState<ExecutiveKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) {
        throw new Error("Không thể tải chỉ số điều hành");
      }
      const data = await res.json();
      setKpi(data.kpis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  useSetPageHeader({
    title: "Tổng Quan Điều Hành",
    subtitle: "Trung tâm điều hành sản xuất, tài chính thời gian thực & trợ lý AI",
    badge: "Thời Gian Thực",
    primaryAction: (
      <div className="flex items-center gap-2">
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Trợ Lý Kỹ Thuật
        </Link>
        <button
          onClick={fetchKpis}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
          title="Làm mới chỉ số"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    ),
  });

  const formatVnd = (val?: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Thẻ KPI Cốt Lõi Tài Chính */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Doanh thu */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Doanh Thu Thực Thu
              </span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900">
                {formatVnd(kpi?.totalRevenue)}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="w-4 h-4" />
                <span>Đã đối soát vào sổ quỹ</span>
              </div>
            </div>
          </div>

          {/* Tổng chi phí */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng Chi Phí Thực Tế
              </span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-slate-900">
                {formatVnd(kpi?.totalExpense)}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span>Vật tư + Nhân công + Vận chuyển</span>
              </div>
            </div>
          </div>

          {/* Lợi nhuận gộp */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lợi Nhuận Gộp
              </span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-blue-600">
                {formatVnd(kpi?.grossProfit)}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Biên lợi nhuận gộp: 61.3%</span>
              </div>
            </div>
          </div>

          {/* Số dư khả dụng */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Số Dư Quỹ Tiền Mặt & Ngân Hàng
              </span>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-purple-700">
                {formatVnd((kpi?.cashBalance || 0) + (kpi?.bankBalance || 0))}
              </h3>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>Quỹ mặt: {formatVnd(kpi?.cashBalance)}</span>
                <span>MB Bank: {formatVnd(kpi?.bankBalance)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cân Đối Công Nợ & Vận Hành Thực Địa */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Phải thu vs Phải trả */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Cân Đối Công Nợ Hai Đầu
              </h3>
              <Link
                href="/tai-chinh"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Chi tiết &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-800">Phải thu Khách hàng</p>
                  <div className="text-lg font-bold text-emerald-700 mt-0.5">
                    {formatVnd(kpi?.receivablesTotal)}
                  </div>
                </div>
                <Badge variant="success">Thu hồi đúng hạn</Badge>
              </div>

              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-800">Phải trả Nhà cung cấp</p>
                  <div className="text-lg font-bold text-amber-700 mt-0.5">
                    {formatVnd(kpi?.payablesTotal)}
                  </div>
                </div>
                <Badge variant="warning">Hạn 15 ngày</Badge>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
              <span>Chênh lệch an toàn dòng tiền:</span>
              <strong className="text-emerald-600">
                +{formatVnd((kpi?.receivablesTotal || 0) - (kpi?.payablesTotal || 0))}
              </strong>
            </div>
          </div>

        {/* Tình trạng sản xuất & thi công */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600" />
              Sản Xuất & Dự Án Đang Chạy
            </h3>
            <Link
              href="/du-an"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Xem tất cả &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Dự án thi công</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {kpi?.activeProjectsCount || 2}
              </p>
              <span className="text-[11px] text-emerald-600">Đang đúng tiến độ WBS</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500">Đầu việc đang làm</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {kpi?.inProgressTasksCount || 3}
              </p>
              <span className="text-[11px] text-blue-600">Tổ cơ khí & hiện trường</span>
            </div>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Cảnh báo tồn kho vật tư chạm ngưỡng:</span>
            </div>
            <Link href="/kho" className="font-bold text-rose-700 underline">
              2 mã vật tư
            </Link>
          </div>
        </div>

        {/* Phím tắt tác nghiệp nhanh */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">Lối Tắt Tác Nghiệp</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/cong-viec"
              className="p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition flex flex-col gap-1"
            >
              <HardHat className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">Việc Của Tôi</span>
              <span className="text-slate-400 text-[10px]">Cập nhật % tiến độ</span>
            </Link>

            <Link
              href="/mua-hang"
              className="p-3 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition flex flex-col gap-1"
            >
              <ShoppingCart className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-slate-800">Mua Hàng & OCR</span>
              <span className="text-slate-400 text-[10px]">Nhập từ ảnh HĐ</span>
            </Link>

            <Link
              href="/nhan-su"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition flex flex-col gap-1"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">Chấm Công GPS</span>
              <span className="text-slate-400 text-[10px]">Đa nguồn xưởng + thợ</span>
            </Link>

            <Link
              href="/doi-xe"
              className="p-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition flex flex-col gap-1"
            >
              <Truck className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-slate-800">Đội Xe Vận Tải</span>
              <span className="text-slate-400 text-[10px]">Điều xe & chuyến</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Trọng Điểm Dự Án Đang Thi Công */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Dự Án Trọng Điểm Đang Triển Khai Thực Địa
            </h3>
          </div>
          <Link
            href="/du-an"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Quản trị WBS & Bàn giao &rarr;
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600">DA-2026-001</span>
                <span className="font-semibold text-slate-900 text-sm">
                  Biển Hộp Đèn 3M Vincom Ocean Park
                </span>
                <Badge variant="warning">Đang thi công</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Khách hàng: Công ty Cổ phần Vincom Retail • Quản lý: Trần Quản Lý (NV-DUAN)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Tiến độ WBS</p>
                <p className="text-sm font-bold text-blue-600">65%</p>
              </div>
              <Link
                href="/du-an"
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition"
              >
                Vào dự án
              </Link>
            </div>
          </div>

          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600">DA-2026-002</span>
                <span className="font-semibold text-slate-900 text-sm">
                  Bộ Chữ Nổi LED Tòa Nhà Toyota Mỹ Đình
                </span>
                <Badge variant="info">Khảo sát & Chuẩn bị vật tư</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Khách hàng: Toyota Mỹ Đình • Quản lý: Trần Quản Lý (NV-DUAN)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Tiến độ WBS</p>
                <p className="text-sm font-bold text-slate-700">20%</p>
              </div>
              <Link
                href="/du-an"
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition"
              >
                Vào dự án
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
