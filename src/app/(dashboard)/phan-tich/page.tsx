"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Button,
  Badge,
} from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ShieldAlert,
  Award,
  Layers,
  Zap,
  HardHat,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { useSetPageHeader } from "@/contexts/page-header-context";
import type { SignageExecutiveAnalyticsDto } from "@/lib/signage-bom-calculator";
import { cn } from "@/lib/utils";

const ROOT_CAUSE_COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#64748B"];

export default function PhanTichSignagePage() {
  useSetPageHeader({
    title: "Phân Tích Điều Hành & Chất Lượng Signage (Executive BI)",
    subtitle: "Tỷ lệ hao hụt vật tư, căn nguyên sự cố bảo hành, ma trận nhà cung cấp & năng suất đội thợ",
    screenCode: "M16-BI",
    quickViews: [
      { label: "Bảo hành & Sự cố", href: "/bao-hanh" },
      { label: "Dự án thi công", href: "/du-an" },
      { label: "Bóc tách BOM", href: "/dinh-muc-bom" },
    ],
  });

  const [analytics, setAnalytics] = React.useState<SignageExecutiveAnalyticsDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics/signage");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics || null);
      }
    } catch (err) {
      console.error("Lỗi tải báo cáo BI:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      {/* HÀNG 1: 4 THẺ CHỈ SỐ VẬN HÀNH CỐT LÕI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Hiệu suất tận dụng Alu</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-2">
            {analytics?.scrapRates.aluYieldPercent || 89.4}%
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Hao hụt cắt góc: {(100 - (analytics?.scrapRates.aluYieldPercent || 89.4)).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Hiệu suất sắt hộp 6m</span>
            <HardHat className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 mt-2">
            {analytics?.scrapRates.steelYieldPercent || 94.2}%
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Hao hụt xỉ hàn & mòi: {(100 - (analytics?.scrapRates.steelYieldPercent || 94.2)).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Tỷ lệ KCS LED Xuất xưởng</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {analytics?.scrapRates.ledPassRatePercent || 98.8}%
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
            Đạt Aging Test 4h liên tục
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Tổn thất phế liệu ước tính</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {(analytics?.scrapRates.totalScrapLossEstimate || 14200000).toLocaleString("vi-VN")} đ
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Lũy kế quý hiện tại
          </span>
        </div>
      </div>

      {/* HÀNG 2: PHÂN TÍCH NGUYÊN NHÂN SỰ CỐ & BIÊN LỢI NHUẬN DÒNG SẢN PHẨM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Biểu đồ Donut: Nguyên nhân sự cố bảo hành (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Căn nguyên sự cố bảo hành (Root Cause)</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tỷ lệ các nguyên nhân hư hỏng ghi nhận từ ticket sau bán hàng
            </p>
          </div>

          <div className="h-64 w-full relative">
            {!isMounted || loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                Đang tổng hợp dữ liệu...
              </div>
            ) : !analytics?.warrantyRootCauses.length ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu sự cố
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.warrantyRootCauses}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="percentage"
                    nameKey="label"
                  >
                    {analytics.warrantyRootCauses.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ROOT_CAUSE_COLORS[index % ROOT_CAUSE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-md">
                            <span className="font-bold block">{d.label}</span>
                            <span>Tỷ lệ: <strong>{d.percentage}%</strong> ({d.ticketsCount} ca)</span>
                            <span className="block text-slate-300 mt-0.5">
                              Chi phí TB: {d.avgCost.toLocaleString("vi-VN")} đ/ca
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Biểu đồ Bar: Cơ cấu Lợi nhuận theo Loại Biển Quảng Cáo (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Hiệu quả Tài chính theo Dòng sản phẩm Biển Quảng Cáo</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                So sánh Doanh thu, Chi phí COGS và Biên lãi gộp thực tế (%)
              </p>
            </div>
            <Badge variant="success" className="text-[10px] font-mono">
              Margin Analysis
            </Badge>
          </div>

          <div className="h-64 w-full">
            {!isMounted || loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                Đang nạp dữ liệu...
              </div>
            ) : !analytics?.profitabilityByCategory.length ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu phân tích
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.profitabilityByCategory}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="category"
                    tickFormatter={(val) => {
                      if (val === "alu_letters") return "Alu chữ Inox";
                      if (val === "lightbox_3m") return "Hộp đèn 3M";
                      if (val === "led_matrix") return "LED ma trận";
                      return "Pylon / Khác";
                    }}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-md space-y-1">
                            <strong className="block text-blue-300">{d.label}</strong>
                            <div>Doanh thu: {d.revenue.toLocaleString("vi-VN")} đ</div>
                            <div>Giá vốn COGS: {d.cogs.toLocaleString("vi-VN")} đ</div>
                            <div className="text-emerald-400 font-bold">
                              Lãi gộp: {d.grossProfit.toLocaleString("vi-VN")} đ ({d.marginPercent}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cogs" name="Giá vốn COGS" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="grossProfit" name="Lợi nhuận gộp" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* HÀNG 3: MA TRẬN NHÀ CUNG CẤP & XẾP HẠNG ĐỘI THỢ THI CÔNG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ma trận đánh giá chất lượng linh kiện nhà cung cấp (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Ma trận Đánh giá Chất lượng Nhà cung cấp Vật tư</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tỷ lệ lỗi thực tế tại công trình theo từng thương hiệu linh kiện
              </p>
            </div>
            <Badge variant="neutral" className="text-[10px]">
              Vendor Quality
            </Badge>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-3 py-2">Thương hiệu / Linh kiện</th>
                  <th className="px-3 py-2 text-right">Lắp đặt</th>
                  <th className="px-3 py-2 text-right">Sự cố</th>
                  <th className="px-3 py-2 text-center">Tỷ lệ lỗi</th>
                  <th className="px-3 py-2 text-center">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics?.vendorReliabilities.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <strong className="text-slate-900 block">{v.vendorName}</strong>
                      <span className="text-[10px] text-slate-400 block">{v.productType}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">
                      {v.installedCount.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                      {v.failedCount}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-semibold">
                      {v.defectRatePercent}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                          v.grade === "A+" && "bg-emerald-100 text-emerald-800",
                          v.grade === "A" && "bg-blue-100 text-blue-800",
                          v.grade === "B" && "bg-amber-100 text-amber-800",
                          v.grade === "C" && "bg-rose-100 text-rose-800"
                        )}
                      >
                        {v.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bảng Xếp hạng Năng suất Đội thợ / Chỉ huy trưởng (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Bảng Xếp Hạng Năng Suất Đội Thợ & Chỉ Huy Trưởng</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Đánh giá theo tỷ lệ nghiệm thu ĐẠT lần đầu & sự cố phát sinh
              </p>
            </div>
            <Badge variant="warning" className="text-[10px]">
              Leaderboard
            </Badge>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-center">Hạng</th>
                  <th className="px-3 py-2">Nhân sự / Vai trò</th>
                  <th className="px-3 py-2 text-right">Dự án xong</th>
                  <th className="px-3 py-2 text-center">Nghiệm thu 1 lần</th>
                  <th className="px-3 py-2 text-center">Sự cố BH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics?.teamProductivity.map((t) => (
                  <tr key={t.employeeId} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] font-mono",
                          t.rank === 1 && "bg-amber-100 text-amber-900 border border-amber-300",
                          t.rank === 2 && "bg-slate-200 text-slate-800",
                          t.rank === 3 && "bg-amber-700/20 text-amber-900",
                          t.rank > 3 && "text-slate-500"
                        )}
                      >
                        {t.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <strong className="text-slate-900 block">{t.employeeName}</strong>
                      <span className="text-[10px] text-slate-500 block">{t.role}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                      {t.completedProjects}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600">
                      {t.firstTimeRightPercent}%
                    </td>
                    <td className="px-3 py-2 text-center font-mono">
                      <Badge variant={t.warrantyTicketsIncurred <= 1 ? "success" : "neutral"} className="text-[10px]">
                        {t.warrantyTicketsIncurred} ca
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
