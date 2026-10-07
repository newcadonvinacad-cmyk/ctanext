"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { TimeAttendanceWidget } from "@/components/dashboard/TimeAttendanceWidget";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { ModuleShortcutCards } from "@/components/dashboard/ModuleShortcutCards";
import { useAuthorization } from "@/hooks/use-authorization";

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
  const [canViewFinance, setCanViewFinance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canAccessScreen } = useAuthorization();

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
      setCanViewFinance(Boolean(data.canViewFinance));
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
    title: "Bàn Làm Việc & Điều Hành",
    subtitle: "Chấm công 1-chạm thời gian thực & phím tắt chức năng tác nghiệp nhanh",
    badge: "Thời Gian Thực",
    primaryAction: (
      <div className="flex items-center gap-2">
        <Link
          href="/apps/hrm"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          App HRM Mở Rộng
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

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Thanh Chấm Công 1-Chạm Bàn Làm Việc & Live Working Timer */}
      <TimeAttendanceWidget />

      {/* 2. Banner Thông Báo Động Chuẩn Gọn Gàng */}
      <AnnouncementBanner />

      {/* 3. Các Thẻ Chức Năng Nhanh Đến Từng Module Theo Role Thực Tế */}
      <ModuleShortcutCards kpi={kpi} canViewFinance={canViewFinance} />
    </div>
  );
}
