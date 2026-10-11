"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calculator,
  Layers,
  Sparkles,
  Zap,
  Plus,
  Trash2,
  Save,
  Building2,
  CheckCircle2,
  Loader2,
  Table as TableIcon,
  Search,
  ExternalLink,
  Wrench,
  DollarSign,
  PackageCheck,
  Eye,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { Button, Badge, Input, Modal, Drawer, toast } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";
import {
  calculateSignageBom,
  BomItemLine,
  STANDARD_IRON_OPTIONS,
  STANDARD_SURFACE_OPTIONS,
  STANDARD_LED_OPTIONS,
  STANDARD_POWER_OPTIONS,
  type SignageType,
  type ProjectBomDto,
} from "@/lib/signage-bom-calculator";

export default function DinhMucBomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "list" ? "list" : "calculator";

  const [activeTab, setActiveTab] = React.useState<"calculator" | "list">(initialTab);

  useSetPageHeader({
    title: "Trung Tâm Định Mức & Bóc Tách Kỹ Thuật BOM",
    subtitle: "Bóc tách định lượng linh hoạt theo kích thước thực tế, lưu định mức dự án & chuyển tiếp sản xuất",
    screenCode: "M07-BOM",
    quickViews: [
      { label: "Khảo sát hiện trường", href: "/khao-sat" },
      { label: "Lệnh sản xuất", href: "/san-xuat" },
      { label: "Báo giá dự toán", href: "/bao-gia" },
      { label: "Danh mục vật tư", href: "/vat-tu" },
      { label: "Dự án thi công", href: "/du-an" },
    ],
  });

  const [projects, setProjects] = React.useState<any[]>([]);
  const [boms, setBoms] = React.useState<ProjectBomDto[]>([]);
  const [loadingBoms, setLoadingBoms] = React.useState(false);
  const [selectedBomDetail, setSelectedBomDetail] = React.useState<ProjectBomDto | null>(null);

  // Search & Filters cho Tab Danh sách BOM
  const [bomSearch, setBomSearch] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");

  // Form State cho Tab Bóc Tách Linh Hoạt (Parametric Takeoff)
  const [editingBomId, setEditingBomId] = React.useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [bomTitle, setBomTitle] = React.useState<string>("BOM Bóc Tách Biển Hiệu Quảng Cáo");
  const [bomNotes, setBomNotes] = React.useState<string>("");
  const [savingBom, setSavingBom] = React.useState<boolean>(false);

  const [params, setParams] = React.useState({
    widthMeters: 6.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    signageType: "alu_letters" as SignageType,
    ironBoxType: "SAT-HOP-25",
    gridSpacingCm: 40,
    signMaterial: "Bảng alu ngoài trời",
    aluScrapRate: 10,
    ledType: "LED-NC-12W",
    ledDensityPerM2: 80,
    powerUnitType: "NGUON-MEANWELL-400W",
    hasMicaLogo65: false,
    hasSideTrim: false,
    hasColorStrip: false,
    subAccessories: "",
  });

  const [lines, setLines] = React.useState<BomItemLine[]>([]);
  const [addingMaterial, setAddingMaterial] = React.useState(false);
  const [customLine, setCustomLine] = React.useState<BomItemLine>({
    category: "Vật tư phụ & Keo",
    itemCode: "SKU-CUSTOM",
    itemName: "",
    unit: "Cái",
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    note: "",
  });

  // Tải danh sách Dự án & BOMs
  const fetchProjects = React.useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=200");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || data.items || []);
      }
    } catch (err) {
      console.error("Lỗi tải dự án:", err);
    }
  }, []);

  const fetchBoms = React.useCallback(async () => {
    try {
      setLoadingBoms(true);
      const res = await fetch("/api/bom");
      if (res.ok) {
        const data = await res.json();
        setBoms(data.boms || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách BOM:", err);
      toast.error("Không thể tải danh sách BOM");
    } finally {
      setLoadingBoms(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProjects();
    fetchBoms();
  }, [fetchProjects, fetchBoms]);

  // Khởi tạo phép tính BOM đầu tiên
  React.useEffect(() => {
    const calc = calculateSignageBom({
      ...params,
    });
    setLines(calc.items);
  }, []);

  // Tính lại toàn bộ theo công thức
  const handleRecalculate = () => {
    const customItems = lines.filter((l) => l.itemCode?.startsWith("SKU-") || l.itemCode === "SKU-CUSTOM");
    const calc = calculateSignageBom({
      ...params,
      customItems,
    });
    setLines(calc.items);
    toast.success("Đã tính lại định mức BOM theo công thức kỹ thuật!");
  };

  // Cập nhật từng dòng vật tư
  const handleUpdateLine = (index: number, field: keyof BomItemLine, value: any) => {
    setLines((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }
      next[index] = item;
      return next;
    });
  };

  // Xóa dòng vật tư
  const handleDeleteLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Thêm dòng vật tư tự do
  const handleAddCustomItem = () => {
    if (!customLine.itemName.trim()) {
      toast.error("Vui lòng nhập tên vật tư!");
      return;
    }
    const newLine: BomItemLine = {
      ...customLine,
      amount: (Number(customLine.quantity) || 1) * (Number(customLine.unitPrice) || 0),
    };
    setLines((prev) => [...prev, newLine]);
    setCustomLine({
      category: "Vật tư phụ & Keo",
      itemCode: `SKU-${Date.now().toString().slice(-4)}`,
      itemName: "",
      unit: "Cái",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      note: "",
    });
    setAddingMaterial(false);
    toast.success("Đã thêm vật tư mới vào bảng định mức!");
  };

  // Metric tổng hợp từ params & lines
  const metrics = React.useMemo(() => {
    const width = Number(params.widthMeters) || 1.0;
    const height = Number(params.heightMeters) || 1.0;
    const area = Math.round(width * height * 100) / 100;
    const perimeter = 2 * (width + height);
    const spacing = (Number(params.gridSpacingCm) || 40) / 100;
    const steelMeters = Math.round((perimeter + (width / spacing) * height + (height / spacing) * width) * 10) / 10;
    const steelBars = Math.ceil(steelMeters / 6.0);

    const scrapRate = (Number(params.aluScrapRate) || 10) / 100;
    const aluSqm = Math.round(area * (1 + scrapRate) * 100) / 100;
    const aluSheets = Math.ceil(aluSqm / (1.22 * 2.44));

    const density = Number(params.ledDensityPerM2) || 80;
    const totalLeds = Math.ceil(area * density);

    const ledOpt =
      STANDARD_LED_OPTIONS.find((o) => o.code === params.ledType || o.name === params.ledType) ||
      STANDARD_LED_OPTIONS[0];
    const ledWatts = (ledOpt.specs?.watts as number) || 1.2;

    const powerOpt =
      STANDARD_POWER_OPTIONS.find((o) => o.code === params.powerUnitType || o.name === params.powerUnitType) ||
      STANDARD_POWER_OPTIONS[0];
    const powerWatts = (powerOpt.specs?.watts as number) || 400;

    const totalWatts = Math.round(totalLeds * ledWatts * 10) / 10;
    const powerUnits = totalWatts > 0 ? Math.ceil(totalWatts / (powerWatts * 0.8)) : 0;

    const totalCost = lines.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

    return {
      area,
      steelMeters,
      steelBars,
      aluSqm,
      aluSheets,
      totalLeds,
      totalWatts,
      powerUnits,
      totalCost,
    };
  }, [params, lines]);

  // Lưu BOM vào database (Tạo mới hoặc Cập nhật theo editingBomId)
  const handleSaveBom = async (andGoToProduction: boolean = false) => {
    if (!bomTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề bảng bóc tách BOM!");
      return;
    }

    try {
      setSavingBom(true);
      const totalEstimatedCost = lines.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

      const method = editingBomId ? "PUT" : "POST";
      const url = editingBomId ? `/api/bom/${editingBomId}` : "/api/bom";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId || null,
          title: bomTitle.trim(),
          signageType: params.signageType,
          widthMeters: Number(params.widthMeters) || 1.0,
          heightMeters: Number(params.heightMeters) || 1.0,
          depthMeters: Number(params.depthMeters) || 0.1,
          ironBoxType: params.ironBoxType,
          gridSpacingCm: Number(params.gridSpacingCm) || 40,
          aluScrapRate: Number(params.aluScrapRate) || 10,
          ledType: params.ledType,
          ledDensityPerM2: Number(params.ledDensityPerM2) || 80,
          powerUnitType: params.powerUnitType,
          signMaterial: params.signMaterial,
          hasMicaLogo65: params.hasMicaLogo65,
          hasSideTrim: params.hasSideTrim,
          hasColorStrip: params.hasColorStrip,
          subAccessories: params.subAccessories,
          items: lines,
          itemsJson: lines,
          estimatedMaterialCost: totalEstimatedCost,
          notes: bomNotes.trim() || "Bóc tách định lượng linh hoạt từ Trung Tâm BOM",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu định mức BOM");

      const savedBomId = data.bom?.id || editingBomId;
      toast.success(
        editingBomId
          ? `Đã cập nhật định mức BOM ${data.bom?.code || ""} thành công!`
          : `Đã lưu thành công định mức BOM ${data.bom?.code || ""}!`
      );
      fetchBoms();

      if (andGoToProduction) {
        if (selectedProjectId) {
          router.push(`/du-an/${selectedProjectId}?tab=production&bomId=${savedBomId || ""}`);
        } else {
          router.push(`/san-xuat?bomId=${savedBomId || ""}`);
        }
      } else {
        setActiveTab("list");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu BOM");
    } finally {
      setSavingBom(false);
    }
  };

  // Nạp một BOM đã lưu trở lại Workbench để tái sử dụng hoặc sửa
  const handleLoadBomToWorkbench = (bom: ProjectBomDto, asDuplicate: boolean = false) => {
    setSelectedProjectId(bom.projectId || "");
    if (asDuplicate) {
      setEditingBomId(null);
      setBomTitle(`Bản sao - ${bom.title}`);
    } else {
      setEditingBomId(bom.id);
      setBomTitle(bom.title);
    }
    setBomNotes(bom.notes || "");

    const parsedItems: BomItemLine[] = Array.isArray(bom.itemsJson)
      ? bom.itemsJson
      : typeof bom.itemsJson === "string"
      ? JSON.parse(bom.itemsJson)
      : [];

    const surfaceItem = parsedItems.find((it) => it.category === "Mặt dựng");
    const signMat = surfaceItem?.itemName || surfaceItem?.itemCode || "Bảng alu ngoài trời";
    const hasLogo = parsedItems.some(
      (it) => it.itemCode === "MICA-LOGO-65" || it.itemName?.toLowerCase().includes("logo")
    );
    const hasTrim = parsedItems.some(
      (it) => it.itemCode === "NEP-LUON-NHOM" || it.itemName?.toLowerCase().includes("lườn")
    );
    const hasStrip = parsedItems.some(
      (it) => it.itemCode === "DECAL-DAI-MAU" || it.itemName?.toLowerCase().includes("dải màu")
    );

    setParams({
      widthMeters: Number(bom.widthMeters) || 6.0,
      heightMeters: Number(bom.heightMeters) || 2.0,
      depthMeters: Number(bom.depthMeters) || 0.2,
      signageType: (bom.signageType as SignageType) || "alu_letters",
      ironBoxType: bom.ironBoxType || "SAT-HOP-25",
      gridSpacingCm: Number(bom.gridSpacingCm) || 40,
      signMaterial: signMat,
      aluScrapRate: Number(bom.aluScrapRate) || 10,
      ledType: bom.ledType || "LED-NC-12W",
      ledDensityPerM2: Number(bom.ledDensityPerM2) || 80,
      powerUnitType: bom.powerUnitType || "NGUON-MEANWELL-400W",
      hasMicaLogo65: hasLogo,
      hasSideTrim: hasTrim,
      hasColorStrip: hasStrip,
      subAccessories: "",
    });

    if (parsedItems.length > 0) {
      setLines(parsedItems);
    } else {
      const calc = calculateSignageBom({
        widthMeters: Number(bom.widthMeters) || 6.0,
        heightMeters: Number(bom.heightMeters) || 2.0,
        depthMeters: Number(bom.depthMeters) || 0.2,
        signageType: (bom.signageType as SignageType) || "alu_letters",
      });
      setLines(calc.items);
    }

    setSelectedBomDetail(null);
    setActiveTab("calculator");
    toast.success(
      asDuplicate
        ? `Đã sao chép định mức BOM ${bom.code} vào bàn bóc tách!`
        : `Đang mở chỉnh sửa định mức BOM ${bom.code}`
    );
  };

  // Lọc danh sách BOMs
  const filteredBoms = React.useMemo(() => {
    return boms.filter((b) => {
      const q = bomSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.code.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (b.projectName && b.projectName.toLowerCase().includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q));

      const matchesProject = projectFilter === "all" || b.projectId === projectFilter;
      const matchesType = typeFilter === "all" || b.signageType === typeFilter;

      return matchesSearch && matchesProject && matchesType;
    });
  }, [boms, bomSearch, projectFilter, typeFilter]);

  return (
    <div className="w-full px-4 py-3 space-y-4">
      {/* Top Header & Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
            <Calculator className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono">
                M07-BOM
              </span>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Trung Tâm Định Mức Kỹ Thuật & Bóc Tách BOM
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Công thức bóc tách vật tư linh hoạt theo kích thước phủ bì • Lưu trữ BOM dự án & 1-Click Sản xuất
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "calculator"
                ? "bg-white text-purple-800 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span>Bàn Bóc Tách Linh Hoạt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "list"
                ? "bg-white text-purple-800 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Thư Viện BOM Dự Án ({boms.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BÀN BÓC TÁCH LINH HOẠT THEO THÔNG SỐ (PARAMETRIC TAKEOFF WORKBENCH) */}
      {activeTab === "calculator" && (
        <div className="space-y-4">
          {/* Banner thông báo khi đang chỉnh sửa BOM đã lưu */}
          {editingBomId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono text-[11px]">
                  CHẾ ĐỘ SỬA BOM
                </span>
                <span>
                  Đang hiệu chỉnh định mức BOM <strong>{bomTitle}</strong>. Nhấn Lưu để cập nhật bản ghi này.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBomId(null);
                  setBomTitle(`Bản sao - ${bomTitle}`);
                  toast.info("Đã chuyển sang chế độ tạo mới BOM!");
                }}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-bold cursor-pointer transition text-[11px]"
              >
                Chuyển thành Tạo BOM Mới (Không đè)
              </button>
            </div>
          )}

          {/* Form Thông Tin Chung & Liên Kết Dự Án */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tiêu đề bảng bóc tách BOM *</label>
              <Input
                value={bomTitle}
                onChange={(e) => setBomTitle(e.target.value)}
                placeholder="Ví dụ: BOM Bảng hiệu alu chữ nổi LED Nam Long Phát..."
                className="text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Dự án thi công liên kết (Tùy chọn)</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="">-- Bóc tách độc lập (Không liên kết dự án) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Loại kết cấu bảng hiệu</label>
              <select
                value={params.signageType}
                onChange={(e) => setParams({ ...params, signageType: e.target.value as SignageType })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-purple-900"
              >
                <option value="alu_letters">Biển Alu Chữ Nổi LED Đèn Hắt</option>
                <option value="lightbox_3m">Biển Hộp Đèn 3M / Decal Dán Khung</option>
                <option value="canvas_hiflex">Biển Bạt Hiflex / Bạt UV Khung Sắt</option>
                <option value="posm_booth">Quầy Kệ / POSM / Nội Thất Đại Lý</option>
              </select>
            </div>
          </div>

          {/* BẢNG CẤU HÌNH THÔNG SỐ ĐỘNG */}
          <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-purple-200/70 pb-2">
              <span className="font-bold text-purple-950 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                <Wrench className="w-4 h-4 text-purple-600" />
                Cấu Hình Kích Thước & Thông Số Kỹ Thuật Động (Kích thước thay đổi liên tục)
              </span>
              <Button
                size="sm"
                onClick={handleRecalculate}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold shadow-2xs cursor-pointer h-7 px-3"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tính Lại Theo Công Thức Kỹ Thuật (0ms)</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Kích thước */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-800 block">1. Kích thước phủ bì (m)</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Ngang W</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={params.widthMeters}
                      onChange={(e) => setParams({ ...params, widthMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs h-7 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Cao H</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={params.heightMeters}
                      onChange={(e) => setParams({ ...params, heightMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs h-7 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Sâu D</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={params.depthMeters}
                      onChange={(e) => setParams({ ...params, depthMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs h-7 font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-purple-700 font-bold text-right pt-0.5 font-mono">
                  Diện tích: {metrics.area} m²
                </div>
              </div>

              {/* 2. Khung sắt */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-800 block">2. Khung xương sắt</span>
                <select
                  value={params.ironBoxType}
                  onChange={(e) => setParams({ ...params, ironBoxType: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-medium text-slate-800 bg-white"
                >
                  {STANDARD_IRON_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ/{opt.unit})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Khoảng cách đan nan:</span>
                  <select
                    value={params.gridSpacingCm}
                    onChange={(e) => setParams({ ...params, gridSpacingCm: parseInt(e.target.value, 10) || 40 })}
                    className="px-1.5 py-0.5 text-[10px] border border-slate-300 rounded bg-white"
                  >
                    <option value="30">30 cm</option>
                    <option value="40">40 cm (Chuẩn)</option>
                    <option value="50">50 cm</option>
                    <option value="60">60 cm</option>
                  </select>
                </div>
              </div>

              {/* 3. Bề mặt */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-800 block">3. Vật liệu bề mặt</span>
                <select
                  value={params.signMaterial}
                  onChange={(e) => setParams({ ...params, signMaterial: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-medium text-slate-800 bg-white"
                >
                  {STANDARD_SURFACE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.name}>
                      {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ/{opt.unit})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Hao hụt cắt góc:</span>
                  <select
                    value={params.aluScrapRate}
                    onChange={(e) => setParams({ ...params, aluScrapRate: parseInt(e.target.value, 10) || 10 })}
                    className="px-1.5 py-0.5 text-[10px] border border-slate-300 rounded bg-white"
                  >
                    <option value="5">5%</option>
                    <option value="8">8%</option>
                    <option value="10">10% (Chuẩn)</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                  </select>
                </div>
              </div>

              {/* 4. LED & Nguồn */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-800 block">4. Module LED & Nguồn</span>
                <select
                  value={params.ledType}
                  onChange={(e) => setParams({ ...params, ledType: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-medium text-slate-800 bg-white mb-1"
                >
                  {STANDARD_LED_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                </select>
                <select
                  value={params.powerUnitType}
                  onChange={(e) => setParams({ ...params, powerUnitType: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-medium text-slate-800 bg-white"
                >
                  {STANDARD_POWER_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phụ kiện thương hiệu Nippon */}
            <div className="flex items-center gap-4 pt-1 px-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-700">Phụ kiện Nippon:</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.hasMicaLogo65}
                  onChange={(e) => setParams({ ...params, hasMicaLogo65: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Logo Mica 65×65 hút nổi kèm LED</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.hasSideTrim}
                  onChange={(e) => setParams({ ...params, hasSideTrim: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Nẹp lườn viền nhôm</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.hasColorStrip}
                  onChange={(e) => setParams({ ...params, hasColorStrip: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Decal 3M dải 3 màu nhận diện</span>
              </label>
            </div>
          </div>

          {/* 4 CHỈ SỐ BÓC TÁCH TRỌNG TÂM */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[11px] text-slate-500 font-semibold block">Khung Sắt Hộp Mạ Kẽm</span>
              <strong className="text-base font-bold text-slate-900 font-mono block">
                {metrics.steelBars} cây 6m
              </strong>
              <span className="text-[10px] text-slate-400 block font-mono">({metrics.steelMeters}m sắt hàn)</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[11px] text-slate-500 font-semibold block">Tấm Alu / Bạt UV Mặt Bảng</span>
              <strong className="text-base font-bold text-slate-900 font-mono block">
                {metrics.aluSheets} tấm
              </strong>
              <span className="text-[10px] text-slate-400 block font-mono">({metrics.aluSqm} m² diện tích)</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[11px] text-slate-500 font-semibold block">Hệ Thống LED & Nguồn Cấp</span>
              <strong className="text-base font-bold text-slate-900 font-mono block">
                {metrics.totalLeds} bóng LED
              </strong>
              <span className="text-[10px] text-slate-400 block font-mono">({metrics.powerUnits} bộ nguồn chống nước)</span>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-2xs space-y-0.5">
              <span className="text-[11px] text-purple-700 font-bold block">Tổng Dự Toán Chi Phí Vật Tư</span>
              <strong className="text-base font-extrabold text-purple-900 font-mono block">
                {metrics.totalCost.toLocaleString("vi-VN")} đ
              </strong>
              <span className="text-[10px] text-purple-600 block">{lines.length} hạng mục bóc tách</span>
            </div>
          </div>

          {/* BẢNG CHI TIẾT VẬT TƯ (LIVE EDITABLE TABLE) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-xs">
            <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-purple-600" />
                <span>Bảng Định Mức Chi Tiết ({lines.length} dòng - Cho phép sửa trực tiếp số lượng, đơn giá, ghi chú)</span>
              </span>
              <button
                type="button"
                onClick={() => setAddingMaterial(!addingMaterial)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-300 transition cursor-pointer shadow-2xs"
              >
                {addingMaterial ? "Đóng thêm vật tư" : "+ Thêm Vật Tư Thủ Công"}
              </button>
            </div>

            {/* Form thêm vật tư tự do */}
            {addingMaterial && (
              <div className="p-3 bg-purple-50/50 border-b border-purple-200 grid grid-cols-1 sm:grid-cols-6 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Phân loại</label>
                  <select
                    value={customLine.category}
                    onChange={(e) => setCustomLine({ ...customLine, category: e.target.value as any })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  >
                    <option value="Khung sắt">Khung sắt</option>
                    <option value="Mặt dựng">Mặt dựng</option>
                    <option value="Hệ thống LED">Hệ thống LED</option>
                    <option value="Nguồn điện">Nguồn điện</option>
                    <option value="Logo & Nhận diện">Logo & Nhận diện</option>
                    <option value="Nội thất & POSM">Nội thất & POSM</option>
                    <option value="Vật tư phụ & Keo">Vật tư phụ & Keo</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-500 block">Tên vật tư / Quy cách</label>
                  <Input
                    placeholder="Ví dụ: Dây điện Cadivi 2.5, Khóa lục giác..."
                    value={customLine.itemName}
                    onChange={(e) => setCustomLine({ ...customLine, itemName: e.target.value })}
                    className="text-xs h-7"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">ĐVT</label>
                  <Input
                    placeholder="Cái, Cuộn, Kg..."
                    value={customLine.unit}
                    onChange={(e) => setCustomLine({ ...customLine, unit: e.target.value })}
                    className="text-xs h-7"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Số lượng</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={customLine.quantity}
                    onChange={(e) => setCustomLine({ ...customLine, quantity: parseFloat(e.target.value) || 1 })}
                    className="text-xs h-7 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Đơn giá (đ)</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="1000"
                      value={customLine.unitPrice}
                      onChange={(e) => setCustomLine({ ...customLine, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="text-xs h-7 font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddCustomItem}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2.5 h-7 shrink-0 cursor-pointer"
                    >
                      Lưu
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 w-32">Phân loại</th>
                    <th className="p-2.5">Tên vật tư kỹ thuật</th>
                    <th className="p-2.5 text-center w-20">ĐVT</th>
                    <th className="p-2.5 text-right w-28">Số lượng</th>
                    <th className="p-2.5 text-right w-32">Đơn giá (đ)</th>
                    <th className="p-2.5 text-right w-32">Thành tiền</th>
                    <th className="p-2.5 w-40">Ghi chú</th>
                    <th className="p-2.5 text-center w-12">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((it, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30">
                      <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {it.category}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <strong className="text-slate-900 block">{it.itemName}</strong>
                        {it.itemCode && (
                          <span className="text-[10px] text-purple-700 font-mono">{it.itemCode}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center text-slate-600 font-medium">{it.unit}</td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.1"
                          value={it.quantity}
                          onChange={(e) => handleUpdateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 text-right font-mono font-bold text-slate-900 border border-slate-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="1000"
                          value={it.unitPrice}
                          onChange={(e) => handleUpdateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1 text-right font-mono text-slate-700 border border-slate-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-900">
                        {it.amount.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={it.note || ""}
                          onChange={(e) => handleUpdateLine(idx, "note", e.target.value)}
                          placeholder="Ghi chú..."
                          className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded focus:border-purple-500 focus:outline-none text-slate-600"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Toolbar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
              <div className="text-slate-500 text-xs">
                Tổng cộng: <strong className="text-slate-900 font-mono">{lines.length} dòng vật tư</strong> • Dự toán:{" "}
                <strong className="text-purple-900 font-mono font-bold">{metrics.totalCost.toLocaleString("vi-VN")} đ</strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/bao-gia")}
                  className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Lập Báo Giá Dự Toán</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSaveBom(false)}
                  disabled={savingBom}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold cursor-pointer shadow-xs"
                >
                  {savingBom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingBom ? "Đang lưu..." : "Lưu Vào BOM Hệ Thống"}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSaveBom(true)}
                  disabled={savingBom}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold cursor-pointer shadow-sm"
                >
                  {savingBom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>⚡ Tạo BOM Sản Xuất</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THƯ VIỆN ĐỊNH MỨC BOM DỰ ÁN ĐÃ LƯU */}
      {activeTab === "list" && (
        <div className="space-y-3">
          {/* Bộ lọc & Tìm kiếm */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Tìm mã BOM, tên công trình, dự án..."
                  value={bomSearch}
                  onChange={(e) => setBomSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Tất cả dự án</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Tất cả quy cách</option>
                <option value="alu_letters">Biển Alu Chữ Nổi</option>
                <option value="lightbox_3m">Biển Hộp Đèn 3M</option>
                <option value="canvas_hiflex">Biển Bạt UV</option>
                <option value="posm_booth">Quầy Kệ / POSM</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={() => setActiveTab("calculator")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Bóc Tách BOM Mới</span>
            </Button>
          </div>

          {/* Bảng Danh Sách BOMs */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-xs">
            {loadingBoms ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                <p>Đang tải danh sách định mức BOM...</p>
              </div>
            ) : filteredBoms.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-300" />
                <p>Chưa có bảng định mức BOM nào phù hợp</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 w-28">Mã BOM</th>
                      <th className="p-3">Tiêu đề & Dự án</th>
                      <th className="p-3 w-36">Quy cách & Kích thước</th>
                      <th className="p-3 text-right w-36">Dự toán vật tư</th>
                      <th className="p-3 text-center w-28">Trạng thái</th>
                      <th className="p-3 text-right w-44">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBoms.map((bom) => (
                      <tr key={bom.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-purple-700">{bom.code}</td>
                        <td className="p-3 space-y-0.5">
                          <strong className="text-slate-900 block">{bom.title}</strong>
                          {bom.projectName && (
                            <span className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {bom.projectCode} · {bom.projectName}
                            </span>
                          )}
                        </td>
                        <td className="p-3 space-y-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {bom.signageType}
                          </span>
                          <div className="font-mono text-slate-600 text-[11px] pt-0.5">
                            {bom.widthMeters}m × {bom.heightMeters}m
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-purple-900">
                          {bom.estimatedMaterialCost.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              bom.status === "applied"
                                ? "success"
                                : bom.status === "approved"
                                ? "info"
                                : "warning"
                            }
                            className="text-[10px]"
                          >
                            {bom.status === "applied"
                              ? "Đã đưa vào SX"
                              : bom.status === "approved"
                              ? "Đã duyệt"
                              : "Bản nháp"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedBomDetail(bom)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                            >
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadBomToWorkbench(bom, false)}
                              className="px-2 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition cursor-pointer"
                              title="Mở chỉnh sửa định mức BOM này"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadBomToWorkbench(bom, true)}
                              className="px-2 py-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition cursor-pointer"
                              title="Sao chép thành BOM mới"
                            >
                              Nhân bản
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAWER CHI TIẾT ĐỊNH MỨC BOM */}
      {selectedBomDetail && (
        <Drawer
          isOpen={Boolean(selectedBomDetail)}
          onClose={() => setSelectedBomDetail(null)}
          title={`Hồ Sơ Định Mức BOM: ${selectedBomDetail.code}`}
          width="lg"
        >
          <div className="space-y-4 text-xs pb-6">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
              <strong className="text-slate-900 block text-sm font-bold">{selectedBomDetail.title}</strong>
              <div className="text-slate-600 flex items-center gap-2 text-[11px]">
                <span>Quy cách: {selectedBomDetail.signageType}</span>
                <span>•</span>
                <span className="font-mono text-purple-800 font-bold">
                  {selectedBomDetail.widthMeters}m × {selectedBomDetail.heightMeters}m
                </span>
              </div>
              {selectedBomDetail.notes && (
                <p className="text-slate-500 text-[11px] pt-1">{selectedBomDetail.notes}</p>
              )}
            </div>

            {/* Bảng vật tư chi tiết */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2 font-bold text-slate-800 border-b border-slate-200">
                Bảng Bóc Tách Vật Tư
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2">Vật tư</th>
                      <th className="p-2 text-center">ĐVT</th>
                      <th className="p-2 text-right">Số lượng</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(Array.isArray(selectedBomDetail.itemsJson)
                      ? selectedBomDetail.itemsJson
                      : typeof selectedBomDetail.itemsJson === "string"
                      ? JSON.parse(selectedBomDetail.itemsJson)
                      : []
                    ).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-sans font-medium text-slate-800">{it.itemName}</td>
                        <td className="p-2 text-center text-slate-600">{it.unit}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{it.quantity}</td>
                        <td className="p-2 text-right text-slate-600">
                          {(it.unitPrice || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="p-2 text-right font-bold text-purple-900">
                          {(it.amount || 0).toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBomDetail(null)}
                className="text-xs cursor-pointer"
              >
                Đóng
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadBomToWorkbench(selectedBomDetail, true)}
                  className="text-xs gap-1.5 font-bold cursor-pointer text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nhân bản BOM mới</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleLoadBomToWorkbench(selectedBomDetail, false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa BOM này</span>
                </Button>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
