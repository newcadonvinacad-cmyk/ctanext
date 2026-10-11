"use client";

import React from "react";
import {
  Layers,
  Plus,
  Trash2,
  Ruler,
  CheckCircle2,
  Box,
  Cpu,
  Zap,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Sparkles,
} from "lucide-react";
import { Button, Input, Badge, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  STANDARD_IRON_OPTIONS,
  STANDARD_SURFACE_OPTIONS,
  STANDARD_LED_OPTIONS,
  STANDARD_POWER_OPTIONS,
  STANDARD_LETTER_OPTIONS,
  STANDARD_SURVEY_ITEM_PRESETS,
} from "@/lib/signage-bom-calculator";

export interface SurveyItemFormState {
  id?: string;
  templateId: string;
  itemTitle: string;
  quantity: number;
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  parameters: Record<string, any>;
  selectedSpecs: Record<string, string>;
  designatedItemText?: string;
  notes?: string;
  estimatedCost?: number;
  bomLines?: Array<{
    lineNo: number;
    groupCode: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
    notes?: string;
  }>;
}

export interface SurveyItemsManagerProps {
  items: SurveyItemFormState[];
  onChange: (items: SurveyItemFormState[]) => void;
  productTemplates: any[];
}

export function getDefaultSpecsForTemplate(signageType: string = "alu_letters"): Record<string, string> {
  if (signageType === "lightbox_3m" || signageType === "lightbox_blade") {
    return {
      frame: "NHOM-DINH-HINH",
      face: "BAT-3M-UV",
      lighting: "LED-NC-12W",
      power: "NGUON-MEANWELL-400W",
      letters: "NONE",
    };
  }
  if (signageType === "canvas_hiflex" || signageType === "repair_service") {
    return {
      frame: "SAT-HOP-20",
      face: "BAT-HIFLEX-UV",
      lighting: "NONE",
      power: "NONE",
      letters: "NONE",
    };
  }
  if (signageType === "letters_logo") {
    return {
      frame: "KHONG-KHUNG",
      face: "NONE",
      lighting: "LED-NC-12W",
      power: "NGUON-MEANWELL-400W",
      letters: "MICA-UON-CHAN",
    };
  }
  // Mặc định: Alu chữ nổi
  return {
    frame: "SAT-HOP-25",
    face: "ALU-ALCO-3MM",
    lighting: "LED-NC-12W",
    power: "NGUON-MEANWELL-400W",
    letters: "MICA-UON-CHAN",
  };
}

export function SurveyItemsManager({
  items,
  onChange,
  productTemplates,
}: SurveyItemsManagerProps) {
  const [expandedItems, setExpandedItems] = React.useState<Record<number, boolean>>({
    0: true,
  });
  const [calculatingIdx, setCalculatingIdx] = React.useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Tính lại dự toán của 1 hạng mục qua API
  const calculateItemCost = React.useCallback(
    async (item: SurveyItemFormState): Promise<{ totalCost: number; bomLines: any[] }> => {
      if (!item.templateId) return { totalCost: 0, bomLines: [] };
      try {
        const res = await fetch("/api/product-templates/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: item.templateId,
            widthMeters: Number(item.widthMeters) || 1,
            heightMeters: Number(item.heightMeters) || 1,
            depthMeters: Number(item.depthMeters) || 0.1,
            quantity: Number(item.quantity) || 1,
            parameters: item.parameters || {},
            selectedSpecs: item.selectedSpecs || {},
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return {
            totalCost: data.totalCost || 0,
            bomLines: data.items || [],
          };
        }
      } catch (e) {
        console.warn("Lỗi tính dự toán mẫu:", e);
      }
      return { totalCost: 0, bomLines: [] };
    },
    []
  );

  const updateItem = async (index: number, patch: Partial<SurveyItemFormState>) => {
    const next = [...items];
    let target = { ...next[index], ...patch };

    // Khi đổi mẫu sản phẩm
    if (patch.templateId && patch.templateId !== next[index].templateId) {
      const chosenTpl = productTemplates.find((t) => t.id === patch.templateId);
      if (chosenTpl) {
        // Cập nhật tên theo mẫu nếu chưa đặt tên riêng
        target.itemTitle = `${chosenTpl.name} (#${index + 1})`;

        // Điều chỉnh kích thước mặc định hợp lý theo mẫu
        if (chosenTpl.signageType === "lightbox_blade") {
          target.widthMeters = 0.8;
          target.heightMeters = 0.8;
          target.depthMeters = 0.15;
        } else if (chosenTpl.signageType === "letters_logo") {
          target.widthMeters = 3.0;
          target.heightMeters = 0.8;
          target.depthMeters = 0.05;
        } else if (chosenTpl.signageType === "alu_letters") {
          target.widthMeters = 6.0;
          target.heightMeters = 2.0;
          target.depthMeters = 0.2;
        }

        const schemaParams: Record<string, any> = {};
        for (const p of chosenTpl.parameterSchema || []) {
          schemaParams[p.key] = p.default;
        }
        target.parameters = { ...schemaParams, ...(target.parameters || {}) };
        target.selectedSpecs = {
          ...getDefaultSpecsForTemplate(chosenTpl.signageType),
          ...(target.selectedSpecs || {}),
        };
      }
    }

    // Nếu thay đổi thông số ảnh hưởng dự toán: tự tính lại
    const shouldRecalculate =
      patch.templateId !== undefined ||
      patch.widthMeters !== undefined ||
      patch.heightMeters !== undefined ||
      patch.depthMeters !== undefined ||
      patch.quantity !== undefined ||
      patch.parameters !== undefined ||
      patch.selectedSpecs !== undefined;

    if (shouldRecalculate && target.templateId) {
      setCalculatingIdx(index);
      try {
        const calcRes = await calculateItemCost(target);
        target.estimatedCost = calcRes.totalCost;
        target.bomLines = calcRes.bomLines;
      } finally {
        setCalculatingIdx(null);
      }
    }

    next[index] = target;
    onChange(next);
  };

  const addItem = () => {
    const newIdx = items.length;
    // Chọn mẫu luân phiên hợp lý (1: Alu chính, 2: Hộp vẫy, 3: Bạt/Logo...)
    const suggestedTpl =
      productTemplates[newIdx % Math.max(1, productTemplates.length)] || productTemplates[0];
    const signageType = suggestedTpl?.signageType || "alu_letters";
    const defaultSpecs = getDefaultSpecsForTemplate(signageType);

    let w = 4.0;
    let h = 1.2;
    let d = 0.15;
    let title = suggestedTpl ? `${suggestedTpl.name} (#${newIdx + 1})` : `Hạng mục ${newIdx + 1}`;

    if (signageType === "lightbox_blade") {
      w = 0.8;
      h = 0.8;
      d = 0.15;
      title = `Biển hộp đèn vẫy 2 mặt (#${newIdx + 1})`;
    } else if (signageType === "letters_logo") {
      w = 3.0;
      h = 0.8;
      d = 0.05;
      title = `Bộ chữ nổi thương hiệu (#${newIdx + 1})`;
    } else if (signageType === "repair_service") {
      w = 4.0;
      h = 1.5;
      d = 0.1;
      title = `Hạng mục sửa chữa / bảo trì (#${newIdx + 1})`;
    } else if (signageType === "alu_letters") {
      w = 6.0;
      h = 2.0;
      d = 0.2;
      title = `Biển hiệu chính mặt tiền (#${newIdx + 1})`;
    } else if (signageType === "canvas_hiflex") {
      w = 5.0;
      h = 1.5;
      d = 0.1;
      title = `Biển bạt Hiflex căng khung (#${newIdx + 1})`;
    }

    const newItem: SurveyItemFormState = {
      templateId: suggestedTpl?.id || "",
      itemTitle: title,
      quantity: 1,
      widthMeters: w,
      heightMeters: h,
      depthMeters: d,
      parameters: {
        grid_cm: 40,
        is_lit: true,
        has_logo: false,
        faces: signageType === "lightbox_blade" ? 2 : 1,
      },
      selectedSpecs: defaultSpecs,
      designatedItemText: "",
      notes: "",
      estimatedCost: 0,
    };

    // Thu gọn các card cũ, mở rộng card mới thêm vào
    setExpandedItems({ [newIdx]: true });

    // Cập nhật State tức thì (0ms - người dùng thấy ngay lập tức)
    const nextItems = [...items, newItem];
    onChange(nextItems);
    toast.success(`Đã thêm: ${title}`);

    // Tính toán dự toán ngầm ở background
    if (newItem.templateId) {
      calculateItemCost(newItem).then((calcRes) => {
        if (calcRes.totalCost > 0) {
          updateItem(newIdx, {
            estimatedCost: calcRes.totalCost,
            bomLines: calcRes.bomLines,
          });
        }
      });
    }

    // Cuộn nhẹ nhàng tới card vừa thêm
    setTimeout(() => {
      const el = document.getElementById(`survey-item-card-${newIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 60);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== index));
    toast.info("Đã xóa 1 hạng mục khỏi danh sách");
  };

  const totalCost = React.useMemo(() => {
    return items.reduce((sum, it) => sum + (it.estimatedCost || 0), 0);
  }, [items]);

  return (
    <div className="space-y-3">
      {/* HEADER SECTION: TIÊU ĐỀ & NÚT THÊM HẠNG MỤC */}
      <div className="flex items-center justify-between p-2.5 bg-blue-50/70 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">
                Danh Sách Hạng Mục Khảo Sát & Đo Đạc ({items.length} thành phẩm)
              </span>
              <Badge variant="info" className="text-[10px] font-semibold">
                Chọn mẫu & quy cách
              </Badge>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Mỗi hạng mục chọn quy cách (Khung, Mặt, Đèn, Nguồn) qua ô chọn, tự động tính dự toán sơ bộ
            </span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={addItem}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-bold shadow-xs cursor-pointer h-7"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Hạng Mục</span>
        </Button>
      </div>

      {/* THANH ĐIỀU HƯỚNG NHANH CÁC HẠNG MỤC (QUICK ITEM TABS KHI CÓ NHIỀU HẠNG MỤC) */}
      {items.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setExpandedItems({ [i]: true });
                const el = document.getElementById(`survey-item-card-${i}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className={cn(
                "px-2.5 py-1 text-xs rounded-lg border font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer",
                expandedItems[i]
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>#{i + 1}. {it.itemTitle || `Hạng mục ${i + 1}`}</span>
              {it.estimatedCost && it.estimatedCost > 0 ? (
                <span
                  className={cn(
                    "text-[10px] font-mono px-1 py-0.2 rounded font-bold",
                    expandedItems[i] ? "bg-blue-700 text-blue-100" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {(it.estimatedCost / 1000).toFixed(0)}k
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* DANH SÁCH CÁC HẠNG MỤC (CARDS) */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const area = Math.round(Number(item.widthMeters) * Number(item.heightMeters) * 100) / 100;
          const isExpanded = expandedItems[idx] ?? true;
          const specs = item.selectedSpecs || {};

          return (
            <div
              key={idx}
              id={`survey-item-card-${idx}`}
              className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-blue-300"
            >
              {/* Card Header (Click to toggle collapse) */}
              <div
                onClick={() => toggleExpand(idx)}
                className="p-3 bg-slate-50/90 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-200 select-none transition"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <strong className="text-xs font-bold text-slate-900 truncate">
                    {item.itemTitle || `Hạng mục ${idx + 1}`}
                  </strong>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({item.widthMeters}m × {item.heightMeters}m × {item.depthMeters}m = {area} m² × {item.quantity} cái)
                  </span>
                  {item.estimatedCost && item.estimatedCost > 0 ? (
                    <Badge variant="success" className="text-[10px] font-mono font-bold">
                      Dự toán: {item.estimatedCost.toLocaleString("vi-VN")} đ
                    </Badge>
                  ) : null}
                  {calculatingIdx === idx && (
                    <span className="text-[10px] text-blue-600 animate-pulse font-semibold">
                      Đang tính lại dự toán...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      title="Xóa hạng mục này"
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpand(idx)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded transition cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="p-3.5 space-y-3 text-xs bg-white">
                  {/* HÀNG 1: CHỌN MẪU ĐỊNH MỨC & TÊN HẠNG MỤC & SỐ LƯỢNG */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* 1. Chọn Mẫu sản phẩm */}
                    <div className="sm:col-span-5">
                      <label className="font-semibold text-slate-700 block mb-1">
                        1. Loại biển / Mẫu định mức chuẩn *
                      </label>
                      <select
                        value={item.templateId || ""}
                        onChange={(e) => updateItem(idx, { templateId: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-blue-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Tự do / Chưa áp mẫu --</option>
                        {productTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            📐 {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Nhập hoặc Chọn nhanh Tên hạng mục */}
                    <div className="sm:col-span-5">
                      <label className="font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                        <span>2. Tên hạng mục / Vị trí thực tế *</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          (Chọn gợi ý hoặc sửa tên)
                        </span>
                      </label>
                      <Input
                        list={`preset-titles-${idx}`}
                        value={item.itemTitle}
                        onChange={(e) => updateItem(idx, { itemTitle: e.target.value })}
                        placeholder="VD: Biển hiệu chính mặt tiền, Hộp đèn vẫy 2 mặt..."
                        className="text-xs font-semibold"
                        required
                      />
                      <datalist id={`preset-titles-${idx}`}>
                        <option value="Biển hiệu chính mặt tiền" />
                        <option value="Biển hộp đèn vẫy 2 mặt" />
                        <option value="Biển bạt Hiflex căng khung" />
                        <option value="Biển phụ / Biển vẫy bên hông" />
                        <option value="Bộ chữ nổi thương hiệu" />
                        <option value="Logo Mica quầy lễ tân" />
                        <option value="Hạng mục sửa chữa / bảo trì" />
                      </datalist>
                    </div>

                    {/* 3. Số lượng */}
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1 text-center">
                        Số lượng
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        className="text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* HÀNG 2: KÍCH THƯỚC PHỦ BÌ (W x H x D) */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                      <Ruler className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kích thước đo đạc thực tế (Mét)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Ngang W (m) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.widthMeters}
                          onChange={(e) =>
                            updateItem(idx, { widthMeters: parseFloat(e.target.value) || 0 })
                          }
                          className="text-xs font-mono font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Cao H (m) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.heightMeters}
                          onChange={(e) =>
                            updateItem(idx, { heightMeters: parseFloat(e.target.value) || 0 })
                          }
                          className="text-xs font-mono font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Sâu D (m)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.depthMeters}
                          onChange={(e) =>
                            updateItem(idx, { depthMeters: parseFloat(e.target.value) || 0 })
                          }
                          className="text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Diện tích 1 cái</label>
                        <div className="px-2 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 rounded border border-blue-200 font-mono">
                          {area.toFixed(2)} m²
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HÀNG 3: CHỌN QUY CÁCH VẬT TƯ THEO TỪNG NHÓM (SELECT DROPDOWNS CHUẨN) */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                        <Box className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Quy Cách Vật Tư Chỉ Định Theo Nhóm (Chọn từ ô chọn)</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 italic">
                        Chọn quy cách kỹ thuật, kho sẽ gắn mã cụ thể khi duyệt BOM sản xuất
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {/* 1. Nhóm Khung sắt */}
                      <div className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1">
                        <label className="text-[11px] font-bold text-slate-800 block">
                          ① Khung kết cấu
                        </label>
                        <select
                          value={specs.frame || "SAT-HOP-25"}
                          onChange={(e) =>
                            updateItem(idx, {
                              selectedSpecs: { ...specs, frame: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 text-[11px] border border-slate-300 rounded font-medium text-slate-900 bg-white"
                        >
                          {STANDARD_IRON_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name} {opt.defaultPrice > 0 ? `(${opt.defaultPrice.toLocaleString("vi-VN")} đ)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Nhóm Mặt biển */}
                      <div className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1">
                        <label className="text-[11px] font-bold text-slate-800 block">
                          ② Mặt biển / Nền
                        </label>
                        <select
                          value={specs.face || "ALU-ALCO-3MM"}
                          onChange={(e) =>
                            updateItem(idx, {
                              selectedSpecs: { ...specs, face: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 text-[11px] border border-slate-300 rounded font-medium text-slate-900 bg-white"
                        >
                          {STANDARD_SURFACE_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name} {opt.defaultPrice > 0 ? `(${opt.defaultPrice.toLocaleString("vi-VN")} đ)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Nhóm Đèn LED */}
                      <div className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1">
                        <label className="text-[11px] font-bold text-slate-800 block">
                          ③ Đèn LED chiếu sáng
                        </label>
                        <select
                          value={specs.lighting || "LED-NC-12W"}
                          onChange={(e) =>
                            updateItem(idx, {
                              selectedSpecs: { ...specs, lighting: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 text-[11px] border border-slate-300 rounded font-medium text-slate-900 bg-white"
                        >
                          {STANDARD_LED_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name} {opt.defaultPrice > 0 ? `(${opt.defaultPrice.toLocaleString("vi-VN")} đ)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Nhóm Bộ nguồn */}
                      <div className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1">
                        <label className="text-[11px] font-bold text-slate-800 block">
                          ④ Bộ nguồn 12V
                        </label>
                        <select
                          value={specs.power || "NGUON-MEANWELL-400W"}
                          onChange={(e) =>
                            updateItem(idx, {
                              selectedSpecs: { ...specs, power: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 text-[11px] border border-slate-300 rounded font-medium text-slate-900 bg-white"
                        >
                          {STANDARD_POWER_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name} {opt.defaultPrice > 0 ? `(${opt.defaultPrice.toLocaleString("vi-VN")} đ)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 5. Nhóm Chữ nổi & Logo */}
                      <div className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1 sm:col-span-2 lg:col-span-2">
                        <label className="text-[11px] font-bold text-slate-800 block">
                          ⑤ Chữ nổi thương hiệu & Logo
                        </label>
                        <select
                          value={specs.letters || "MICA-UON-CHAN"}
                          onChange={(e) =>
                            updateItem(idx, {
                              selectedSpecs: { ...specs, letters: e.target.value },
                            })
                          }
                          className="w-full px-2 py-1.5 text-[11px] border border-slate-300 rounded font-medium text-slate-900 bg-white"
                        >
                          {STANDARD_LETTER_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name} {opt.defaultPrice > 0 ? `(${opt.defaultPrice.toLocaleString("vi-VN")} đ)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* HÀNG 4: THAM SỐ ĐỊNH MỨC THEO MẪU (NẾU CÓ) */}
                  {item.templateId && (() => {
                    const tpl = productTemplates.find((t) => t.id === item.templateId);
                    if (!tpl || !tpl.parameterSchema || tpl.parameterSchema.length === 0) return null;
                    const dynamicParams = tpl.parameterSchema.filter(
                      (p: any) => p.key !== "w" && p.key !== "h" && p.key !== "d"
                    );
                    if (dynamicParams.length === 0) return null;

                    return (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-700 block uppercase">
                          Tham số định mức ({tpl.name}):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {dynamicParams.map((param: any) => {
                            if (param.type === "boolean") {
                              return (
                                <label
                                  key={param.key}
                                  className="flex items-center gap-1.5 text-[11px] text-slate-800 cursor-pointer pt-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.parameters?.[param.key] ?? param.default)}
                                    onChange={(e) =>
                                      updateItem(idx, {
                                        parameters: {
                                          ...item.parameters,
                                          [param.key]: e.target.checked,
                                        },
                                      })
                                    }
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{param.label}</span>
                                </label>
                              );
                            }
                            return (
                              <div key={param.key}>
                                <label className="text-[10px] text-slate-500 block mb-0.5">
                                  {param.label}
                                </label>
                                <Input
                                  type={param.type === "number" ? "number" : "text"}
                                  value={item.parameters?.[param.key] ?? param.default ?? ""}
                                  onChange={(e) =>
                                    updateItem(idx, {
                                      parameters: {
                                        ...item.parameters,
                                        [param.key]:
                                          param.type === "number"
                                            ? parseFloat(e.target.value) || 0
                                            : e.target.value,
                                      },
                                    })
                                  }
                                  className="text-xs h-7"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* HÀNG 5: VẬT TƯ CHỈ ĐỊNH & GHI CHÚ KỸ THUẬT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Vật tư chỉ định (Khách yêu cầu đúng hãng / mã màu)
                      </label>
                      <Input
                        value={item.designatedItemText || ""}
                        onChange={(e) => updateItem(idx, { designatedItemText: e.target.value })}
                        placeholder="VD: Alu Alcorest EV-2002, Bạt 3M mã 3630..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Ghi chú kỹ thuật thi công
                      </label>
                      <Input
                        value={item.notes || ""}
                        onChange={(e) => updateItem(idx, { notes: e.target.value })}
                        placeholder="VD: Gia cố dầm thép sau, cắt gấp rãnh hộp alu..."
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* HÀNG 6: LIVE PREVIEW DỰ TOÁN BÓC TÁCH CỦA HẠNG MỤC */}
                  {item.bomLines && item.bomLines.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                          <TableIcon className="w-3 h-3 text-blue-600" />
                          <span>Dự toán NVL sơ bộ ({item.bomLines.length} dòng vật tư)</span>
                        </span>
                        <strong className="text-blue-700 font-mono text-xs">
                          {(item.estimatedCost || 0).toLocaleString("vi-VN")} đ
                        </strong>
                      </div>
                      <div className="p-2 space-y-1">
                        {item.bomLines.map((l, lIdx) => (
                          <div
                            key={lIdx}
                            className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-slate-700 truncate flex-1 pr-2">
                              • {l.description}
                            </span>
                            <span className="font-mono text-slate-600 font-semibold shrink-0 pr-3">
                              {l.quantity} {l.unit}
                            </span>
                            <span className="font-mono text-slate-900 font-bold shrink-0">
                              {(l.amount || 0).toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TỔNG KẾT DỰ TOÁN TOÀN BỘ PHIẾU */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <span className="text-[11px] text-slate-600 font-medium block">
            Tổng dự toán NVL toàn phiếu ({items.length} hạng mục):
          </span>
          <span className="text-base font-extrabold text-blue-700 font-mono">
            {totalCost.toLocaleString("vi-VN")} đ
          </span>
        </div>
        <div className="sm:text-right bg-white px-3 py-1.5 rounded-lg border border-blue-100">
          <span className="text-[10px] text-slate-500 font-medium block">
            Ước tính giá chào khách hàng sơ bộ:
          </span>
          <span className="text-sm font-extrabold text-emerald-700 font-mono">
            {Math.round(totalCost * 1.3 * 1.2).toLocaleString("vi-VN")} đ
          </span>
          <span className="text-[9px] text-slate-400 block">
            (+30% nhân công/lắp đặt, +20% lợi nhuận)
          </span>
        </div>
      </div>
    </div>
  );
}
