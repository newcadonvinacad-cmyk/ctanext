"use client";

import * as React from "react";
import {
  Boxes,
  Plus,
  Trash2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Building2,
  FolderGit2,
  AlertTriangle,
  Package,
  Sparkles,
  RotateCw,
} from "lucide-react";
import { Button, Modal, toast } from "@/components/ui";

export interface CreateStockDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialType?: "receipt" | "issue" | "transfer";
  initialProjectId?: string;
  initialWarehouseId?: string;
  initialReason?: string;
  initialPoId?: string;
  initialLines?: Array<{
    itemId: string;
    itemCode?: string;
    itemName?: string;
    unitId?: string;
    unitName?: string;
    qty: number;
    unitPrice?: number;
  }>;
  canViewCost?: boolean;
}

interface ItemOption {
  id: string;
  code: string;
  name: string;
  baseUnitId: string;
  baseUnitName: string;
  refCostPrice?: number;
  totalOnHand?: number;
  totalAvailable?: number;
  conversions?: Array<{
    unitId: string;
    unitCode?: string;
    unitName?: string;
    factorToBase: number;
  }>;
}

interface FormLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitName: string;
  qty: number;
  unitPrice: number;
  factor: number;
  availableStock: number;
  availableUnits: Array<{ id: string; name: string; factor: number }>;
}

export function CreateStockDocModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = "receipt",
  initialProjectId,
  initialWarehouseId,
  initialReason,
  initialPoId,
  initialLines,
  canViewCost = false,
}: CreateStockDocModalProps) {
  const [docType, setDocType] = React.useState<"receipt" | "issue" | "transfer">(initialType);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<ItemOption[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = React.useState<any[]>([]);
  const [selectedPoId, setSelectedPoId] = React.useState<string>(initialPoId || "");
  const [loadingAux, setLoadingAux] = React.useState(false);

  const [sourceWarehouseId, setSourceWarehouseId] = React.useState(initialWarehouseId || "");
  const [destWarehouseId, setDestWarehouseId] = React.useState("");
  const [projectId, setProjectId] = React.useState(initialProjectId || "");
  const [reason, setReason] = React.useState(initialReason || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [lines, setLines] = React.useState<FormLine[]>([]);

  // Tải danh mục hỗ trợ khi mở Modal
  React.useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingAux(true);

    Promise.all([
      fetch("/api/inventory/warehouses").then((r) => (r.ok ? r.json() : { warehouses: [] })),
      fetch("/api/inventory/items?limit=500").then((r) => (r.ok ? r.json() : { items: [] })),
      fetch("/api/projects").then((r) => (r.ok ? r.json() : { projects: [] })),
      fetch("/api/procurement/orders").then((r) => (r.ok ? r.json() : { orders: [] })),
    ])
      .then(([wData, iData, pData, poData]) => {
        if (!active) return;
        const whs = wData.warehouses || [];
        setWarehouses(whs);
        setItems(iData.items || []);
        setProjects(pData.projects || []);
        setPurchaseOrders(poData.orders || []);

        if (whs.length > 0) {
          if (!sourceWarehouseId && !initialWarehouseId) {
            setSourceWarehouseId(whs[0].id);
          }
          setDestWarehouseId(whs.length > 1 ? whs[1].id : whs[0].id);
        }
      })
      .catch((err) => {
        console.error("Lỗi nạp danh mục phụ trợ phiếu kho:", err);
      })
      .finally(() => {
        if (active) setLoadingAux(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Đồng bộ props đầu vào khi modal được mở
  React.useEffect(() => {
    if (!isOpen) return;
    if (initialType) setDocType(initialType);
    if (initialProjectId !== undefined) setProjectId(initialProjectId);
    if (initialReason !== undefined) setReason(initialReason);
    if (initialWarehouseId) setSourceWarehouseId(initialWarehouseId);
    if (initialPoId) {
      setSelectedPoId(initialPoId);
      handleSelectPo(initialPoId);
    }
  }, [isOpen, initialType, initialProjectId, initialReason, initialWarehouseId, initialPoId]);

  // Xử lý tự động nạp mặt hàng khi chọn Đơn Mua Hàng (PO)
  const handleSelectPo = async (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) return;
    try {
      const res = await fetch(`/api/procurement/orders/${poId}`);
      if (!res.ok) return;
      const data = await res.json();
      const po = data.order;
      if (!po || !po.lines || po.lines.length === 0) return;

      const prefilled: FormLine[] = po.lines.map((l: any) => {
        const matchingItem = items.find((it) => it.id === l.itemId);
        const availableUnits = matchingItem
          ? [
              { id: matchingItem.baseUnitId, name: matchingItem.baseUnitName || "Đơn vị", factor: 1 },
              ...(matchingItem.conversions || []).map((c) => ({
                id: c.unitId,
                name: c.unitName || c.unitCode || "ĐVT",
                factor: Number(c.factorToBase) || 1,
              })),
            ]
          : [{ id: l.unitId, name: l.unitName || "Cái", factor: 1 }];

        return {
          id: l.id || String(Date.now() + Math.random()),
          itemId: l.itemId,
          itemCode: l.itemCode || "",
          itemName: l.itemName || l.description || "Vật tư",
          unitId: l.unitId,
          unitName: l.unitName || "Cái",
          qty: l.qty,
          unitPrice: l.unitPrice || 0,
          factor: 1,
          availableStock: matchingItem?.totalOnHand || 0,
          availableUnits,
        };
      });

      setLines(prefilled);
      setReason(`Nhập kho theo đơn mua ${po.code} - ${po.supplierName}`);
      if (po.projectId) setProjectId(po.projectId);
      toast.success(`Đã tự động điền ${prefilled.length} mặt hàng từ đơn mua ${po.code}`);
    } catch (err) {
      console.error("Lỗi nạp PO trong modal:", err);
    }
  };

  const [isLoadingProjectMaterials, setIsLoadingProjectMaterials] = React.useState(false);

  // Tự động nạp danh sách vật tư từ Dự án (để xuất theo định mức hoặc nhập hoàn trả dư thừa)
  const handleLoadProjectMaterials = async () => {
    if (!projectId) {
      toast.error("Vui lòng chọn Dự án trước khi nạp vật tư!");
      return;
    }
    setIsLoadingProjectMaterials(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/materials`);
      if (!res.ok) throw new Error("Không thể tải vật tư dự án");
      const data = await res.json();
      const projectMaterials = data.summary || [];

      if (projectMaterials.length === 0) {
        toast.info("Dự án này chưa phát sinh danh mục vật tư định mức hoặc xuất kho nào.");
        return;
      }

      const prefilled: FormLine[] = projectMaterials.map((m: any, idx: number) => {
        const matchingItem = items.find((it) => it.id === m.itemId || it.code === m.itemCode);
        const baseItem = matchingItem || items[0];
        const availableUnits = baseItem
          ? [
              { id: baseItem.baseUnitId, name: baseItem.baseUnitName || "Đơn vị", factor: 1 },
              ...(baseItem.conversions || []).map((c) => ({
                id: c.unitId,
                name: c.unitName || c.unitCode || "ĐVT",
                factor: Number(c.factorToBase) || 1,
              })),
            ]
          : [{ id: "default", name: m.unitName || "Cái", factor: 1 }];

        return {
          id: `pm-line-${Date.now()}-${idx}`,
          itemId: m.itemId || baseItem?.id,
          itemCode: m.itemCode || baseItem?.code || "",
          itemName: m.itemName || baseItem?.name || "Vật tư",
          unitId: baseItem?.baseUnitId || "default",
          unitName: m.unitName || baseItem?.baseUnitName || "Cái",
          qty: m.issuedQty || 1,
          unitPrice: baseItem?.refCostPrice || 0,
          factor: 1,
          availableStock: baseItem?.totalOnHand || 0,
          availableUnits,
        };
      });

      setLines(prefilled);
      const projName = projects.find((p) => p.id === projectId)?.name || "";
      if (docType === "receipt") {
        setReason(`Nhập hoàn trả vật tư thừa từ công trình [${projName}] về kho`);
      } else {
        setReason(`Xuất kho vật tư thi công cho dự án [${projName}]`);
      }
      toast.success(`Đã tự động nạp ${prefilled.length} mặt hàng từ dự án!`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải vật tư dự án");
    } finally {
      setIsLoadingProjectMaterials(false);
    }
  };

  // Nạp initialLines nếu được truyền
  React.useEffect(() => {
    if (!isOpen || !initialLines || initialLines.length === 0 || items.length === 0) return;
    const mapped: FormLine[] = initialLines.map((il, idx) => {
      const matchingItem = items.find((it) => it.id === il.itemId || it.code === il.itemCode);
      const baseItem = matchingItem || items[0];
      const availableUnits = baseItem
        ? [
            { id: baseItem.baseUnitId, name: baseItem.baseUnitName || "Đơn vị", factor: 1 },
            ...(baseItem.conversions || []).map((c) => ({
              id: c.unitId,
              name: c.unitName || c.unitCode || "ĐVT",
              factor: Number(c.factorToBase) || 1,
            })),
          ]
        : [{ id: il.unitId || "default", name: il.unitName || "Cái", factor: 1 }];

      return {
        id: `init-line-${Date.now()}-${idx}`,
        itemId: baseItem?.id || il.itemId,
        itemCode: baseItem?.code || il.itemCode || "",
        itemName: baseItem?.name || il.itemName || "Vật tư",
        unitId: il.unitId || baseItem?.baseUnitId || "",
        unitName: il.unitName || baseItem?.baseUnitName || "Đơn vị",
        qty: il.qty || 1,
        unitPrice: il.unitPrice ?? baseItem?.refCostPrice ?? 0,
        factor: 1,
        availableStock: baseItem?.totalAvailable ?? baseItem?.totalOnHand ?? 0,
        availableUnits,
      };
    });
    setLines(mapped);
  }, [isOpen, items, initialLines]);

  // Thiết lập mặc định khi đổi loại chứng từ
  React.useEffect(() => {
    if (!isOpen) return;
    if (initialReason && reason === initialReason) return;
    if (
      !reason ||
      reason === "Nhập kho vật tư mới từ nhà cung cấp" ||
      reason === "Xuất kho vật tư thi công gia công xưởng / công trình" ||
      reason === "Điều chuyển luân chuyển vật tư giữa các phân xưởng"
    ) {
      if (docType === "receipt") {
        setReason("Nhập kho vật tư mới từ nhà cung cấp");
      } else if (docType === "issue") {
        setReason("Xuất kho vật tư thi công gia công xưởng / công trình");
      } else {
        setReason("Điều chuyển luân chuyển vật tư giữa các phân xưởng");
      }
    }
  }, [docType, isOpen, initialReason]);

  // Thêm dòng mới
  const handleAddLine = () => {
    if (items.length === 0) {
      toast.error("Chưa có danh mục vật tư để thêm dòng");
      return;
    }
    const defaultItem = items[0];
    const availableUnits = [
      { id: defaultItem.baseUnitId, name: defaultItem.baseUnitName || "Đơn vị", factor: 1 },
      ...(defaultItem.conversions || []).map((c) => ({
        id: c.unitId,
        name: c.unitName || c.unitCode || "ĐVT",
        factor: Number(c.factorToBase) || 1,
      })),
    ];

    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemId: defaultItem.id,
        itemCode: defaultItem.code,
        itemName: defaultItem.name,
        unitId: defaultItem.baseUnitId,
        unitName: defaultItem.baseUnitName || "Đơn vị",
        qty: 1,
        unitPrice: defaultItem.refCostPrice || 0,
        factor: 1,
        availableStock: defaultItem.totalAvailable ?? defaultItem.totalOnHand ?? 0,
        availableUnits,
      },
    ]);
  };

  // Khởi tạo 1 dòng sẵn khi modal mở nếu lines rỗng
  React.useEffect(() => {
    if (isOpen && items.length > 0 && lines.length === 0 && (!initialLines || initialLines.length === 0) && !selectedPoId) {
      handleAddLine();
    }
  }, [isOpen, items, initialLines, selectedPoId]);

  // Xóa dòng
  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Chọn vật tư cho dòng
  const handleChangeItem = (lineId: string, newItemId: string) => {
    const selectedItem = items.find((i) => i.id === newItemId);
    if (!selectedItem) return;

    const availableUnits = [
      { id: selectedItem.baseUnitId, name: selectedItem.baseUnitName || "Đơn vị", factor: 1 },
      ...(selectedItem.conversions || []).map((c) => ({
        id: c.unitId,
        name: c.unitName || c.unitCode || "ĐVT",
        factor: Number(c.factorToBase) || 1,
      })),
    ];

    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          itemId: selectedItem.id,
          itemCode: selectedItem.code,
          itemName: selectedItem.name,
          unitId: selectedItem.baseUnitId,
          unitName: selectedItem.baseUnitName || "Đơn vị",
          unitPrice: selectedItem.refCostPrice || 0,
          factor: 1,
          availableStock: selectedItem.totalAvailable ?? selectedItem.totalOnHand ?? 0,
          availableUnits,
        };
      })
    );
  };

  // Thay đổi đơn vị tính
  const handleChangeUnit = (lineId: string, newUnitId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const foundUnit = l.availableUnits.find((u) => u.id === newUnitId);
        return {
          ...l,
          unitId: newUnitId,
          unitName: foundUnit?.name || l.unitName,
          factor: foundUnit?.factor || 1,
        };
      })
    );
  };

  // Cập nhật số lượng
  const handleChangeQty = (lineId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, qty: num } : l)));
  };

  // Cập nhật đơn giá
  const handleChangePrice = (lineId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, unitPrice: num } : l)));
  };

  // Tính tổng
  const totalAmount = React.useMemo(() => {
    return lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  }, [lines]);

  const totalQty = React.useMemo(() => {
    return lines.reduce((sum, l) => sum + l.qty, 0);
  }, [lines]);

  // Gửi tạo phiếu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 dòng vật tư vào phiếu!");
      return;
    }

    if (docType === "receipt" && !destWarehouseId) {
      toast.error("Vui lòng chọn Kho đích nhập về!");
      return;
    }

    if (docType === "issue" && !sourceWarehouseId) {
      toast.error("Vui lòng chọn Kho nguồn xuất đi!");
      return;
    }

    if (docType === "transfer") {
      if (!sourceWarehouseId || !destWarehouseId) {
        toast.error("Vui lòng chọn đủ Kho nguồn và Kho đích điều chuyển!");
        return;
      }
      if (sourceWarehouseId === destWarehouseId) {
        toast.error("Kho nguồn và Kho đích không được trùng nhau!");
        return;
      }
    }

    // Kiểm tra dòng hợp lệ
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.itemId) {
        toast.error(`Dòng ${i + 1} chưa chọn vật tư!`);
        return;
      }
      if (line.qty <= 0) {
        toast.error(`Dòng ${i + 1} (${line.itemCode}) số lượng phải lớn hơn 0!`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: docType,
        purpose:
          reason.trim() ||
          (docType === "receipt"
            ? "Nhập kho vật tư"
            : docType === "issue"
            ? "Xuất kho vật tư"
            : "Điều chuyển kho"),
        reason: reason.trim(),
        sourceWarehouseId: docType === "receipt" ? null : sourceWarehouseId,
        destinationWarehouseId: docType === "issue" ? null : destWarehouseId,
        projectId: projectId || null,
        submitNow: true,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          unitId: l.unitId,
          qty: Number(l.qty),
          factorSnapshot: Number(l.factor) || 1,
          unitCostSnapshot: Number(l.unitPrice) || 0,
        })),
      };

      const res = await fetch("/api/inventory/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Không thể tạo phiếu kho");
      }

      toast.success(
        docType === "receipt"
          ? "Đã lập phiếu nhập kho thành công!"
          : docType === "issue"
          ? "Đã lập phiếu xuất kho thành công!"
          : "Đã lập phiếu điều chuyển kho thành công!"
      );

      setLines([]);
      setReason("");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi tạo phiếu kho");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Phiếu Kho Mới"
      description="Lập phiếu nhập, xuất hoặc điều chuyển luân chuyển vật tư nội bộ"
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Số mặt hàng: <strong className="text-slate-800 font-mono">{lines.length}</strong>
            </span>
            <span>·</span>
            <span>
              Tổng số lượng:{" "}
              <strong className="text-slate-800 font-mono">
                {totalQty.toLocaleString("vi-VN")}
              </strong>
            </span>
            {canViewCost && (
              <>
                <span>·</span>
                <span>
                  Tổng giá trị:{" "}
                  <strong className="text-blue-700 font-mono font-bold">
                    {totalAmount.toLocaleString("vi-VN")} ₫
                  </strong>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || lines.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4"
            >
              {isSubmitting ? "Đang xử lý..." : "Lập & Lưu phiếu kho"}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1 text-xs">
        {/* 1. Chọn loại phiếu Segmented Toggle */}
        <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-3 gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setDocType("receipt")}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold transition text-xs ${
              docType === "receipt"
                ? "bg-white text-emerald-700 shadow-2xs border border-emerald-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>1. Phiếu Nhập Kho</span>
          </button>

          <button
            type="button"
            onClick={() => setDocType("issue")}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold transition text-xs ${
              docType === "issue"
                ? "bg-white text-blue-700 shadow-2xs border border-blue-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <TrendingDown className="w-4 h-4 text-blue-600" />
            <span>2. Phiếu Xuất Kho</span>
          </button>

          <button
            type="button"
            onClick={() => setDocType("transfer")}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold transition text-xs ${
              docType === "transfer"
                ? "bg-white text-purple-700 shadow-2xs border border-purple-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-purple-600" />
            <span>3. Phiếu Điều Chuyển</span>
          </button>
        </div>

        {/* 2. Thông tin kho & Dự án */}
        <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Kho nguồn (Xuất hoặc Điều chuyển) */}
          {docType !== "receipt" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kho nguồn (Xuất từ) <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kho đích (Nhập hoặc Điều chuyển) */}
          {docType !== "issue" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kho đích (Nhập về) <span className="text-rose-500">*</span>
              </label>
              <select
                value={destWarehouseId}
                onChange={(e) => setDestWarehouseId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dự án thi công liên kết */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Dự án / Công trình liên kết (tùy chọn)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-slate-400 focus:outline-none"
            >
              <option value="">-- Không gắn dự án --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} · ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
            {projectId && (
              <button
                type="button"
                onClick={handleLoadProjectMaterials}
                disabled={isLoadingProjectMaterials}
                className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {docType === "receipt"
                    ? "⚡ Nạp vật tư hoàn trả từ công trình"
                    : "⚡ Nạp vật tư theo định mức dự án"}
                </span>
                {isLoadingProjectMaterials && <RotateCw className="w-3 h-3 animate-spin text-blue-500" />}
              </button>
            )}
          </div>

          {/* Nhập theo Đơn Mua Hàng PO */}
          {docType === "receipt" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Nhập theo Đơn Mua (PO)</span>
                <span className="text-slate-400 font-normal">Tự động nạp hàng</span>
              </label>
              <select
                value={selectedPoId}
                onChange={(e) => handleSelectPo(e.target.value)}
                className="w-full text-xs border border-blue-300 rounded-lg px-2.5 py-1.5 bg-blue-50/40 font-medium focus:ring-1 focus:ring-blue-400 focus:outline-none"
              >
                <option value="">-- Tự nhập thủ công --</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.code} - {po.supplierName} ({po.linesCount} mục)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lý do / Diễn giải */}
          <div className={docType === "transfer" ? "md:col-span-3" : docType === "receipt" ? "md:col-span-2" : "md:col-span-2"}>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Lý do / Mục đích chứng từ
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Xuất vật tư mica gia công biển led cửa hàng Highlands Coffee..."
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
            {docType === "receipt" && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">Gợi ý nhanh:</span>
                {[
                  "Nhập mua hàng từ NCC",
                  "Nhập hoàn trả từ công trình",
                  "Nhập điều chỉnh kiểm kê",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReason(s)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Danh sách dòng chi tiết vật tư */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              <h4 className="font-bold text-slate-900 text-xs">Chi Tiết Vật Tư ({lines.length})</h4>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="flex items-center gap-1 text-[11px] font-semibold py-1 px-2.5 h-auto text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm dòng vật tư</span>
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3 min-w-[200px]">Mặt hàng vật tư</th>
                  {docType !== "receipt" && (
                    <th className="py-2 px-3 w-28 text-right">Tồn khả dụng</th>
                  )}
                  <th className="py-2 px-3 w-28">Đơn vị tính</th>
                  <th className="py-2 px-3 w-28 text-right">Số lượng</th>
                  {canViewCost && <th className="py-2 px-3 w-32 text-right">Đơn giá vốn</th>}
                  {canViewCost && <th className="py-2 px-3 w-32 text-right">Thành tiền</th>}
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lines.map((line, idx) => {
                  const lineTotal = line.qty * line.unitPrice;
                  const isOverStock =
                    docType !== "receipt" && line.qty > line.availableStock;

                  return (
                    <tr
                      key={line.id}
                      className={isOverStock ? "bg-rose-50/50" : "hover:bg-slate-50/50"}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={line.itemId}
                          onChange={(e) => handleChangeItem(line.id, e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        >
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} · {it.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {docType !== "receipt" && (
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              line.availableStock <= 0
                                ? "text-rose-600"
                                : line.availableStock <= 5
                                ? "text-amber-600"
                                : "text-slate-700"
                            }`}
                          >
                            {line.availableStock.toLocaleString("vi-VN")}
                          </span>
                        </td>
                      )}

                      <td className="py-2 px-3">
                        <select
                          value={line.unitId}
                          onChange={(e) => handleChangeUnit(line.id, e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        >
                          {line.availableUnits.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} {u.factor !== 1 ? `(x${u.factor})` : ""}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={line.qty || ""}
                          onChange={(e) => handleChangeQty(line.id, e.target.value)}
                          className={`w-full text-right text-xs font-mono border rounded-md px-2 py-1 focus:ring-1 focus:outline-none ${
                            isOverStock
                              ? "border-rose-400 text-rose-700 bg-rose-50/70"
                              : "border-slate-300 bg-white"
                          }`}
                        />
                        {isOverStock && (
                          <span className="block text-[10px] text-rose-600 mt-0.5 font-medium">
                            Vượt quá tồn!
                          </span>
                        )}
                      </td>

                      {canViewCost && (
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={line.unitPrice || ""}
                            onChange={(e) => handleChangePrice(line.id, e.target.value)}
                            className="w-full text-right text-xs font-mono border border-slate-300 rounded-md px-2 py-1 bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none"
                          />
                        </td>
                      )}

                      {canViewCost && (
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                          {lineTotal.toLocaleString("vi-VN")} ₫
                        </td>
                      )}

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </Modal>
  );
}
