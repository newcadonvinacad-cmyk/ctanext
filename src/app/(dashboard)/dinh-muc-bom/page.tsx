"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Input,
  Modal,
  toast,
} from "@/components/ui";
import {
  Boxes,
  Plus,
  RefreshCw,
  Sparkles,
  Layers,
  Zap,
  HardHat,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ExternalLink,
  FileSpreadsheet,
  Grid,
} from "lucide-react";
import { useSetPageHeader } from "@/contexts/page-header-context";
import {
  calculateSignageBom,
  type SignageType,
  type BomCalculationResult,
  type ProjectBomDto,
} from "@/lib/signage-bom-calculator";
import { cn } from "@/lib/utils";

export default function DinhMucBomPage() {
  useSetPageHeader({
    title: "Định Mức Kỹ Thuật & Bóc Tách Vật Tư (BOM Optimizer)",
    subtitle: "Tự động tính toán số tấm Alu, số cây sắt hộp, module LED, bộ nguồn 12V & keo dán",
    screenCode: "M09-BOM",
    quickViews: [
      { label: "Dự án thi công", href: "/du-an" },
      { label: "Báo giá dự toán", href: "/bao-gia" },
      { label: "Kho & Vật tư", href: "/kho" },
    ],
  });

  // Tham số tính toán tương tác (Interactive Calculator)
  const [calcInput, setCalcInput] = React.useState({
    title: "Biển hiệu mặt tiền Alu chữ nổi",
    signageType: "alu_letters" as SignageType,
    widthMeters: 6.0,
    heightMeters: 2.4,
    depthMeters: 0.15,
    ironBoxType: "Hộp mạ kẽm 25x25x1.4mm",
    gridSpacingCm: 40,
    aluMarginCm: 8,
    aluScrapRate: 10,
    ledDensityPerM2: 80,
    ledWattsPerUnit: 1.2,
    powerUnitWatts: 400,
  });

  const [calcResult, setCalcResult] = React.useState<BomCalculationResult | null>(null);
  const [savedBoms, setSavedBoms] = React.useState<ProjectBomDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [savingBom, setSavingBom] = React.useState(false);

  // Modal liên kết dự án
  const [selectedBomToApply, setSelectedBomToApply] = React.useState<ProjectBomDto | null>(null);
  const [projectsList, setProjectsList] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [targetProjectId, setTargetProjectId] = React.useState("");
  const [applying, setApplying] = React.useState(false);

  // Tính toán thời gian thực mỗi khi đổi thông số
  React.useEffect(() => {
    try {
      const res = calculateSignageBom(calcInput);
      setCalcResult(res);
    } catch (e) {
      console.error(e);
    }
  }, [calcInput]);

  const fetchBoms = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bom");
      if (res.ok) {
        const data = await res.json();
        setSavedBoms(data.boms || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = React.useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    fetchBoms();
    fetchProjects();
  }, [fetchBoms, fetchProjects]);

  const handleSaveCurrentBom = async () => {
    if (!calcInput.title.trim()) {
      toast.error("Vui lòng nhập tên bảng định mức");
      return;
    }
    try {
      setSavingBom(true);
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calcInput),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu bảng bóc tách");
      toast.success("Đã lưu bảng bóc tách định mức BOM thành công!");
      fetchBoms();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu định mức");
    } finally {
      setSavingBom(false);
    }
  };

  const handleApplyBom = async () => {
    if (!selectedBomToApply || !targetProjectId) return;
    try {
      setApplying(true);
      const res = await fetch(`/api/bom/${selectedBomToApply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_to_project",
          projectId: targetProjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi áp dụng định mức");
      toast.success("Đã liên kết bảng BOM vào dự án thành công!");
      setSelectedBomToApply(null);
      setTargetProjectId("");
      fetchBoms();
    } catch (err: any) {
      toast.error(err.message || "Lỗi áp dụng định mức");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KHỐI 1: TÍNH TOÁN BÓC TÁCH THỜI GIAN THỰC (INTERACTIVE CALCULATOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột trái: Nhập thông số kỹ thuật (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>Thiết lập kích thước & Kết cấu</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nhập số đo mặt bằng để hệ thống tự động bóc tách vật tư
              </p>
            </div>
            <Badge variant="info" className="text-[10px] font-mono">
              Auto-Nesting
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Tên bảng định mức / Hạng mục
              </label>
              <Input
                value={calcInput.title}
                onChange={(e) => setCalcInput({ ...calcInput, title: e.target.value })}
                placeholder="VD: Mặt dựng Alu Highlands Coffee 6m x 2.4m"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Quy cách loại biển quảng cáo
              </label>
              <select
                value={calcInput.signageType}
                onChange={(e) => setCalcInput({ ...calcInput, signageType: e.target.value as SignageType })}
                className="w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="alu_letters">Biển mặt dựng Alu & Chữ Inox lọng Mica</option>
                <option value="lightbox_3m">Biển hộp đèn bạt không gân 3M in UV</option>
                <option value="led_matrix">Màn hình LED ma trận ngoài trời (P3, P4, P5)</option>
                <option value="pylon_sign">Biển Pylon trung tâm & Cột mốc tòa nhà</option>
                <option value="neon_sign">Biển đèn LED Neon Sign nghệ thuật</option>
                <option value="canvas_hiflex">Biển khung sắt căng bạt Hiflex</option>
              </select>
            </div>

            {/* Kích thước 3 chiều */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block">Chiều rộng (m)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.2"
                  value={calcInput.widthMeters}
                  onChange={(e) => setCalcInput({ ...calcInput, widthMeters: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block">Chiều cao (m)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.2"
                  value={calcInput.heightMeters}
                  onChange={(e) => setCalcInput({ ...calcInput, heightMeters: parseFloat(e.target.value) || 1.0 })}
                  className="mt-1 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block">Độ dày (m)</label>
                <Input
                  type="number"
                  step="0.05"
                  min="0.05"
                  value={calcInput.depthMeters}
                  onChange={(e) => setCalcInput({ ...calcInput, depthMeters: parseFloat(e.target.value) || 0.1 })}
                  className="mt-1 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Tham số khung sắt & Alu */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Quy cách sắt hộp</label>
                <select
                  value={calcInput.ironBoxType}
                  onChange={(e) => setCalcInput({ ...calcInput, ironBoxType: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs"
                >
                  <option value="Hộp mạ kẽm 20x20x1.2mm">Hộp kẽm 20x20x1.2mm</option>
                  <option value="Hộp mạ kẽm 25x25x1.4mm">Hộp kẽm 25x25x1.4mm (Phổ biến)</option>
                  <option value="Hộp mạ kẽm 30x30x1.4mm">Hộp kẽm 30x30x1.4mm</option>
                  <option value="Hộp mạ kẽm 40x40x1.4mm">Hộp kẽm 40x40x1.4mm (Chịu lực)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Bước nan đan xương (cm)</label>
                <select
                  value={calcInput.gridSpacingCm}
                  onChange={(e) => setCalcInput({ ...calcInput, gridSpacingCm: parseInt(e.target.value, 10) })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs font-mono"
                >
                  <option value={30}>30 cm (Rất dày dặn)</option>
                  <option value={40}>40 cm (Chuẩn kỹ thuật)</option>
                  <option value={50}>50 cm (Chuẩn tiết kiệm)</option>
                  <option value={60}>60 cm (Biển nhỏ)</option>
                </select>
              </div>
            </div>

            {/* Tham số LED & Gấp viền */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Mật độ bóng LED (bóng/m²)</label>
                <Input
                  type="number"
                  min="0"
                  max="300"
                  value={calcInput.ledDensityPerM2}
                  onChange={(e) => setCalcInput({ ...calcInput, ledDensityPerM2: parseInt(e.target.value, 10) || 0 })}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Gấp viền Alu (cm)</label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={calcInput.aluMarginCm}
                  onChange={(e) => setCalcInput({ ...calcInput, aluMarginCm: parseInt(e.target.value, 10) || 0 })}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              * Tự động cập nhật dự toán tức thì
            </span>
            <Button
              size="sm"
              disabled={savingBom}
              onClick={handleSaveCurrentBom}
              className="h-8 text-xs bg-slate-900 text-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {savingBom ? "Đang lưu..." : "Lưu bảng BOM"}
            </Button>
          </div>
        </div>

        {/* Cột phải: Kết quả bóc tách & Blueprint (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {calcResult && (
            <>
              {/* 4 Thẻ KPI vật tư chính */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Diện tích bề mặt</span>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {calcResult.areaSqm} m²
                  </div>
                  <span className="text-[10px] text-slate-400">Trải phẳng: {calcResult.flatAreaSqm} m²</span>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 shadow-2xs">
                  <span className="text-[11px] text-blue-700 font-medium block">Tấm Alu (1.22x2.44)</span>
                  <div className="text-base font-bold text-blue-900 font-mono mt-0.5">
                    {calcResult.aluSheetsCount} tấm
                  </div>
                  <span className="text-[10px] text-blue-600">Hiệu suất: {calcResult.aluEfficiencyPercent}%</span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 shadow-2xs">
                  <span className="text-[11px] text-amber-700 font-medium block">Sắt hộp (Cây 6m)</span>
                  <div className="text-base font-bold text-amber-900 font-mono mt-0.5">
                    {calcResult.steelBars6m} cây
                  </div>
                  <span className="text-[10px] text-amber-600">Tổng dài: {calcResult.steelMeters} m</span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] text-emerald-700 font-medium block">LED & Nguồn 12V</span>
                  <div className="text-base font-bold text-emerald-900 font-mono mt-0.5">
                    {calcResult.powerUnitsNeeded} nguồn
                  </div>
                  <span className="text-[10px] text-emerald-600">{calcResult.totalLeds} LED ({calcResult.totalWatts}W)</span>
                </div>
              </div>

              {/* Sơ đồ trực quan Nesting & Lưới đan nan */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-indigo-600" />
                    <span>Mô phỏng đan nan xương sắt & Bố trí tấm Alu</span>
                  </span>
                  <span className="font-mono text-slate-500">
                    Lưới ô {calcInput.gridSpacingCm}cm × {calcInput.gridSpacingCm}cm
                  </span>
                </div>

                {/* Khung visual preview tỉ lệ */}
                <div className="h-32 w-full rounded-xl bg-slate-900 border border-slate-800 p-2 flex items-center justify-center relative overflow-hidden">
                  <div
                    className="border-2 border-blue-400 bg-blue-950/40 relative flex items-center justify-center shadow-inner"
                    style={{
                      width: `${Math.min(90, Math.max(30, (calcInput.widthMeters / 10) * 100))}%`,
                      height: `${Math.min(85, Math.max(35, (calcInput.heightMeters / 4) * 100))}%`,
                    }}
                  >
                    {/* Đường nan dọc mờ */}
                    <div className="absolute inset-0 grid grid-cols-6 divide-x divide-blue-500/30 pointer-events-none" />
                    {/* Đường nan ngang mờ */}
                    <div className="absolute inset-0 grid grid-rows-3 divide-y divide-blue-500/30 pointer-events-none" />

                    <div className="text-center z-10 select-none">
                      <span className="text-xs font-bold text-white font-mono block">
                        {calcInput.widthMeters}m × {calcInput.heightMeters}m
                      </span>
                      <span className="text-[10px] text-blue-300 font-mono">
                        {calcResult.steelGridDetails.horizontalBars} nan ngang • {calcResult.steelGridDetails.verticalBars} nan dọc
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tải nguồn an toàn: <strong>{calcResult.powerLoadPercent}%</strong> định mức.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Vật tư phụ: <strong>{calcResult.titebondTubes} chai Titebond, {calcResult.siliconeTubes} chai A500</strong>.</span>
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết vật tư bóc tách */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Dự toán danh mục vật tư xuất kho (BOM Details)</span>
                  </span>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 mr-2">Tổng chi phí vật tư:</span>
                    <strong className="text-sm font-bold text-blue-600 font-mono">
                      {calcResult.totalEstimatedMaterialCost.toLocaleString("vi-VN")} đ
                    </strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2">Hạng mục</th>
                        <th className="px-3.5 py-2">Tên vật tư quy cách</th>
                        <th className="px-3.5 py-2 text-center">ĐVT</th>
                        <th className="px-3.5 py-2 text-right">Số lượng</th>
                        <th className="px-3.5 py-2 text-right">Đơn giá</th>
                        <th className="px-3.5 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calcResult.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2 text-slate-500 text-[11px]">{it.category}</td>
                          <td className="px-3.5 py-2">
                            <span className="font-medium text-slate-900 block">{it.itemName}</span>
                            {it.note && <span className="text-[10px] text-slate-400 block">{it.note}</span>}
                          </td>
                          <td className="px-3.5 py-2 text-center text-slate-500 font-mono">{it.unit}</td>
                          <td className="px-3.5 py-2 text-right font-bold text-blue-700 font-mono">{it.quantity}</td>
                          <td className="px-3.5 py-2 text-right text-slate-600 font-mono">{it.unitPrice.toLocaleString("vi-VN")} đ</td>
                          <td className="px-3.5 py-2 text-right font-bold text-slate-900 font-mono">{it.amount.toLocaleString("vi-VN")} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KHỐI 2: DANH SÁCH BẢNG BÓC TÁCH BOM ĐÃ LƯU TRONG DỰ ÁN */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <span className="font-bold text-slate-900 text-sm">
              Hồ sơ Bóc tách Định mức BOM đã lưu ({savedBoms.length})
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Danh mục định mức có thể liên kết trực tiếp vào Dự án thi công hoặc xuất sang Phiếu kho
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchBoms}
            className="h-8 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1", loading && "animate-spin")} />
            Làm mới
          </Button>
        </div>

        {savedBoms.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Chưa có bảng bóc tách BOM nào được lưu. Hãy bấm "Lưu bảng BOM" sau khi thiết lập thông số ở trên.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-3.5 py-2.5">Mã BOM</th>
                  <th className="px-3.5 py-2.5">Tên bảng định mức</th>
                  <th className="px-3.5 py-2.5">Kích thước & Quy cách</th>
                  <th className="px-3.5 py-2.5">Dự án liên kết</th>
                  <th className="px-3.5 py-2.5 text-right">Tổng chi phí COGS</th>
                  <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                  <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savedBoms.map((bom) => (
                  <tr key={bom.id} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 font-mono font-bold text-blue-600">{bom.code}</td>
                    <td className="px-3.5 py-2.5 font-medium text-slate-900">{bom.title}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-slate-700">
                        {bom.widthMeters}m × {bom.heightMeters}m ({bom.areaSqm}m²)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {bom.calculatedAluSheets} tấm Alu • {bom.calculatedSteelBars} cây sắt • {bom.calculatedPowerUnits} nguồn
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {bom.projectCode ? (
                        <Link
                          href={`/du-an/${bom.projectId}`}
                          className="font-mono text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>{bom.projectCode}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold font-mono text-slate-900">
                      {bom.estimatedMaterialCost.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <Badge
                        variant={bom.status === "applied" ? "success" : "neutral"}
                        className="text-[10px]"
                      >
                        {bom.status === "applied" ? "Đã vào dự án" : "Bản nháp"}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {bom.status !== "applied" ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBomToApply(bom);
                            setTargetProjectId(bom.projectId || "");
                          }}
                          className="h-6 text-[11px] bg-blue-600 text-white"
                        >
                          Áp dụng vào dự án
                        </Button>
                      ) : (
                        <Link
                          href={`/kho/nhap-xuat/tao-moi?loai=xuat&du_an=${bom.projectId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold hover:underline"
                        >
                          <Package className="w-3 h-3" />
                          <span>Xuất kho vật tư</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL LIÊN KẾT BOM VÀO DỰ ÁN */}
      <Modal
        isOpen={Boolean(selectedBomToApply)}
        onClose={() => setSelectedBomToApply(null)}
        title="Áp Dụng Định Mức BOM Vào Dự Án"
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Bảng định mức được chọn:
            </label>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-blue-600 mr-2">{selectedBomToApply?.code}</span>
              <strong className="text-slate-900">{selectedBomToApply?.title}</strong>
              <div className="text-[11px] text-slate-500 mt-1">
                Kích thước: {selectedBomToApply?.widthMeters}m × {selectedBomToApply?.heightMeters}m | Dự toán vật tư: {selectedBomToApply?.estimatedMaterialCost.toLocaleString("vi-VN")} đ
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Chọn dự án thi công liên kết *
            </label>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-xs"
            >
              <option value="">-- Chọn công trình / dự án --</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
            Sau khi áp dụng, định mức vật tư sẽ được đưa vào hồ sơ dự toán công trình và đồng bộ với Phiếu kho (M09).
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => setSelectedBomToApply(null)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!targetProjectId || applying}
              onClick={handleApplyBom}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {applying ? "Đang áp dụng..." : "Xác nhận áp dụng"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
