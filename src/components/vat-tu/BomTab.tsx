"use client";

import * as React from "react";
import { Button, Input, Modal, toast } from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  Layers,
  Loader2,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemModal, ItemCategoryOption, ItemUnitOption } from "./ItemModal";

export interface BomMaterialLine {
  id: string;
  itemId?: string;
  itemCode?: string;
  name: string;
  unit: string;
  quantity: number;
  note?: string;
}

export interface InventoryItemOption {
  id: string;
  code: string;
  name: string;
  kind: string;
  categoryId: string;
  categoryName?: string;
  baseUnitId: string;
  baseUnitCode?: string;
  baseUnitName: string;
  specJson?: Record<string, any>;
}

export function BomTab() {
  const [allItems, setAllItems] = React.useState<InventoryItemOption[]>([]);
  const [categories, setCategories] = React.useState<ItemCategoryOption[]>([]);
  const [units, setUnits] = React.useState<ItemUnitOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // ID thành phẩm đang chọn để xem/cấu hình BOM
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState<string>("");

  // Modal tạo thành phẩm mới dùng chung ItemModal (kind = "product")
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);

  // Modal chọn nhanh nhiều NVL vào định mức
  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = React.useState(false);
  const [materialSearchTerm, setMaterialSearchTerm] = React.useState("");
  const [selectedMatIds, setSelectedMatIds] = React.useState<Set<string>>(new Set());

  // Trạng thái chỉnh sửa trực tiếp trên bảng BOM (local working copy)
  const [editingLines, setEditingLines] = React.useState<BomMaterialLine[]>([]);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSavingBom, setIsSavingBom] = React.useState(false);

  // Modal sửa riêng 1 dòng (tùy chọn)
  const [editingSingleLine, setEditingSingleLine] = React.useState<BomMaterialLine | null>(null);

  // Tải danh mục vật tư từ API
  const fetchInventoryData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [itemsRes, metaRes] = await Promise.all([
        fetch("/api/inventory/items?limit=500"),
        fetch("/api/inventory/metadata").catch(() => null),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        const loadedItems: InventoryItemOption[] = itemsData.items || [];
        setAllItems(loadedItems);

        // Tự động chọn thành phẩm đầu tiên có BOM hoặc kind === 'product'
        const products = loadedItems.filter(
          (i) => i.kind === "product" || Boolean(i.specJson?.bom && Array.isArray(i.specJson.bom))
        );
        if (products.length > 0 && !selectedProductId) {
          setSelectedProductId(products[0].id);
        }
      }

      if (metaRes && metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.categories) setCategories(metaData.categories);
        if (metaData.units) setUnits(metaData.units);
      }
    } catch (err) {
      console.error("Lỗi nạp danh mục vật tư:", err);
      toast.error("Không thể tải danh mục vật tư");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProductId]);

  React.useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // Danh sách các Thành phẩm (từ danh mục erp.items có kind === 'product' hoặc đã có specJson.bom)
  const productItems = React.useMemo(() => {
    return allItems.filter(
      (i) => i.kind === "product" || Boolean(i.specJson?.bom && Array.isArray(i.specJson.bom))
    );
  }, [allItems]);

  // Danh sách Nguyên vật liệu có sẵn trong danh mục (để chọn khi làm BOM)
  const availableMaterials = React.useMemo(() => {
    return allItems.filter((i) => i.kind === "material" || i.kind === "semi_finished" || !i.kind);
  }, [allItems]);

  // Thành phẩm hiện tại đang được chọn
  const currentProduct = React.useMemo(() => {
    return productItems.find((p) => p.id === selectedProductId) || productItems[0] || null;
  }, [productItems, selectedProductId]);

  // Đồng bộ working copy editingLines khi đổi thành phẩm
  React.useEffect(() => {
    if (currentProduct) {
      const bom = currentProduct.specJson?.bom;
      const initial = Array.isArray(bom) ? [...bom] : [];
      setEditingLines(initial);
      setIsDirty(false);
    } else {
      setEditingLines([]);
      setIsDirty(false);
    }
  }, [currentProduct?.id, currentProduct?.specJson]);

  // Lọc danh sách thành phẩm theo từ khóa tìm kiếm
  const filteredProducts = React.useMemo(() => {
    if (!searchTerm.trim()) return productItems;
    const q = searchTerm.toLowerCase().trim();
    return productItems.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [productItems, searchTerm]);

  // Lọc danh sách NVL trong modal chọn nhiều
  const filteredMaterials = React.useMemo(() => {
    if (!materialSearchTerm.trim()) return availableMaterials;
    const q = materialSearchTerm.toLowerCase().trim();
    return availableMaterials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.categoryName || "").toLowerCase().includes(q)
    );
  }, [availableMaterials, materialSearchTerm]);

  // Mở modal chọn nhiều NVL
  const handleOpenMultiSelect = () => {
    if (!currentProduct) {
      toast.error("Vui lòng chọn một Thành phẩm trước");
      return;
    }
    // Đánh dấu những NVL đã có sẵn trong bảng BOM
    const existingItemIds = new Set(
      editingLines.map((l) => l.itemId).filter(Boolean) as string[]
    );
    setSelectedMatIds(new Set(existingItemIds));
    setMaterialSearchTerm("");
    setIsMultiSelectModalOpen(true);
  };

  // Toggle chọn 1 NVL
  const handleToggleMat = (id: string) => {
    const next = new Set(selectedMatIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMatIds(next);
  };

  // Toggle chọn tất cả NVL đang lọc
  const handleToggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredMaterials.every((m) => selectedMatIds.has(m.id));
    const next = new Set(selectedMatIds);
    if (allFilteredSelected) {
      filteredMaterials.forEach((m) => next.delete(m.id));
    } else {
      filteredMaterials.forEach((m) => next.add(m.id));
    }
    setSelectedMatIds(next);
  };

  // Xác nhận thêm các NVL đã chọn vào bảng BOM
  const handleConfirmMultiSelect = () => {
    if (!currentProduct) return;

    // Giữ lại các dòng cũ đã có
    const existingMap = new Map<string, BomMaterialLine>();
    editingLines.forEach((line) => {
      if (line.itemId) existingMap.set(line.itemId, line);
    });

    const newLines: BomMaterialLine[] = [];

    // Duyệt qua tất cả ID được chọn
    selectedMatIds.forEach((matId) => {
      if (existingMap.has(matId)) {
        newLines.push(existingMap.get(matId)!);
      } else {
        const mat = availableMaterials.find((m) => m.id === matId);
        if (mat) {
          newLines.push({
            id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            itemId: mat.id,
            itemCode: mat.code,
            name: mat.name,
            unit: mat.baseUnitName || mat.baseUnitCode || "Cái",
            quantity: 1,
            note: "",
          });
        }
      }
    });

    // Thêm cả những dòng tự do (không có itemId) nếu có
    editingLines.forEach((l) => {
      if (!l.itemId) newLines.push(l);
    });

    setEditingLines(newLines);
    setIsDirty(true);
    setIsMultiSelectModalOpen(false);
    toast.success(`Đã cập nhật ${newLines.length} loại vật tư vào bảng định mức!`);
  };

  // Thay đổi số lượng trực tiếp trên dòng
  const handleLineQtyChange = (idx: number, qty: number) => {
    setEditingLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: qty };
      return next;
    });
    setIsDirty(true);
  };

  // Thay đổi ghi chú trực tiếp trên dòng
  const handleLineNoteChange = (idx: number, note: string) => {
    setEditingLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], note };
      return next;
    });
    setIsDirty(true);
  };

  // Xóa 1 dòng khỏi bảng BOM
  const handleRemoveLine = (idx: number) => {
    setEditingLines((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // Lưu toàn bộ bảng BOM vào Database (PUT /api/inventory/items/[id])
  const handleSaveBomTable = async () => {
    if (!currentProduct) return;

    try {
      setIsSavingBom(true);
      const newSpecJson = {
        ...(currentProduct.specJson || {}),
        bom: editingLines,
      };

      const res = await fetch(`/api/inventory/items/${currentProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specJson: newSpecJson,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể cập nhật định mức vật tư");
      }

      // Cập nhật state local
      setAllItems((prev) =>
        prev.map((i) => (i.id === currentProduct.id ? { ...i, specJson: newSpecJson } : i))
      );

      setIsDirty(false);
      toast.success(`Đã lưu định mức BOM cho [${currentProduct.code}] thành công!`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu định mức vật tư");
    } finally {
      setIsSavingBom(false);
    }
  };

  // Khi tạo thành phẩm mới thành công từ ItemModal dùng chung
  const handleProductCreated = async (newItem: any) => {
    await fetchInventoryData();
    if (newItem?.id) {
      setSelectedProductId(newItem.id);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span>Đang nạp dữ liệu định mức từ Danh mục Vật tư & Quy cách...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      {/* CỘT TRÁI (4 COLS): DANH SÁCH THÀNH PHẨM */}
      <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col p-3 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Thành phẩm ({filteredProducts.length})</span>
          </span>
          <Button
            size="sm"
            onClick={() => setIsProductModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] h-7 px-2 font-medium"
          >
            <Plus className="w-3 h-3 mr-1" />
            Thêm thành phẩm
          </Button>
        </div>

        {/* Ô tìm kiếm thành phẩm */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc mã SKU..."
            className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
          />
        </div>

        {/* Danh sách thành phẩm */}
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {filteredProducts.map((p) => {
            const isSelected = p.id === currentProduct?.id;
            const bomCount = Array.isArray(p.specJson?.bom) ? p.specJson.bom.length : 0;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={cn(
                  "p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between group",
                  isSelected
                    ? "border-blue-500 bg-blue-50/70 font-semibold text-blue-950 ring-1 ring-blue-500/30"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-blue-600 bg-white px-1 py-0.5 rounded border border-blue-200 font-bold shrink-0">
                      {p.code}
                    </span>
                    <span className="truncate text-xs font-medium text-slate-900">{p.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal block mt-1">
                    ĐVT: <strong>1 {p.baseUnitName || p.baseUnitCode || "Đơn vị"}</strong> • {bomCount} loại vật tư định mức
                  </span>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-lg">
              Chưa có thành phẩm nào. Bấm &quot;Thêm thành phẩm&quot; để tạo.
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI (8 COLS): BẢNG NGUYÊN VẬT LIỆU CẤU THÀNH */}
      {currentProduct && (
        <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col p-4 space-y-3">
          {/* Header bảng định mức */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {currentProduct.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">{currentProduct.name}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Định mức cho: 1 {currentProduct.baseUnitName || currentProduct.baseUnitCode || "Đơn vị"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Nguyên vật liệu tiêu hao từ kho để chế tạo 1 {currentProduct.baseUnitName || currentProduct.baseUnitCode || "đơn vị"} thành phẩm này.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleOpenMultiSelect}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 font-medium"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Chọn nguyên vật liệu
              </Button>

              {isDirty && (
                <Button
                  size="sm"
                  onClick={handleSaveBomTable}
                  disabled={isSavingBom}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSavingBom ? "Đang lưu..." : "Lưu định mức"}
                </Button>
              )}
            </div>
          </div>

          {/* Bảng danh sách vật tư */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">STT</th>
                  <th className="px-3 py-2 w-28">Mã SKU</th>
                  <th className="px-3 py-2">Tên nguyên vật liệu</th>
                  <th className="px-3 py-2 text-center w-20">ĐVT</th>
                  <th className="px-3 py-2 text-right w-32">
                    Số lượng / 1 {currentProduct.baseUnitName || currentProduct.baseUnitCode}
                  </th>
                  <th className="px-3 py-2">Ghi chú kỹ thuật</th>
                  <th className="px-3 py-2 text-center w-16">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {editingLines.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-[11px] font-medium text-slate-600">
                      {m.itemCode || "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{m.name}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-600 bg-slate-50/50">{m.unit}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={m.quantity}
                        onChange={(e) => handleLineQtyChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 text-xs text-right font-mono font-bold text-blue-700 rounded border border-slate-200 focus:border-blue-500 focus:outline-none bg-blue-50/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={m.note || ""}
                        placeholder="Ghi chú kỹ thuật..."
                        onChange={(e) => handleLineNoteChange(idx, e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {editingLines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Chưa có vật tư nào trong định mức. Bấm &quot;+ Chọn nguyên vật liệu&quot; để tích chọn hàng loạt từ kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Tổng cộng: <strong>{editingLines.length}</strong> loại nguyên vật liệu cấu thành.
              {isDirty && (
                <span className="ml-2 font-bold text-amber-600">
                  (Có thay đổi chưa lưu - bấm &quot;Lưu định mức&quot;)
                </span>
              )}
            </span>
            {isDirty && (
              <Button
                size="sm"
                onClick={handleSaveBomTable}
                disabled={isSavingBom}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {isSavingBom ? "Đang lưu..." : "Lưu định mức"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* MODAL TẠO THÀNH PHẨM DÙNG CHUNG ItemModal */}
      <ItemModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        defaultKind="product"
        categories={categories}
        units={units}
        onSuccess={handleProductCreated}
      />

      {/* MODAL CHỌN NHIỀU NGUYÊN VẬT LIỆU TỪ KHO */}
      <Modal
        isOpen={isMultiSelectModalOpen}
        onClose={() => setIsMultiSelectModalOpen(false)}
        title={`Chọn Nguyên Vật Liệu Cho Định Mức: ${currentProduct?.name}`}
        maxWidth="2xl"
      >
        <div className="space-y-3 text-xs">
          {/* Thanh tìm kiếm và chọn tất cả */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={materialSearchTerm}
                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                placeholder="Tìm mã SKU, tên vật tư, nhóm ngành..."
                className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAllFiltered}
              className="text-xs h-8 shrink-0 flex items-center gap-1"
            >
              {filteredMaterials.length > 0 &&
              filteredMaterials.every((m) => selectedMatIds.has(m.id)) ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bỏ chọn tất cả</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chọn tất cả ({filteredMaterials.length})</span>
                </>
              )}
            </Button>
          </div>

          {/* Danh sách NVL dạng checklist */}
          <div className="border border-slate-200 rounded-lg max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {filteredMaterials.map((mat) => {
              const isChecked = selectedMatIds.has(mat.id);
              return (
                <div
                  key={mat.id}
                  onClick={() => handleToggleMat(mat.id)}
                  className={cn(
                    "p-2.5 flex items-center gap-3 cursor-pointer transition select-none",
                    isChecked ? "bg-blue-50/70" : "hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Đã xử lý ở div click
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 pointer-events-none"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-1 py-0.5 rounded border border-slate-200 shrink-0">
                        {mat.code}
                      </span>
                      <span className="font-medium text-slate-900 truncate">{mat.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Nhóm: <strong>{mat.categoryName || "Chưa phân nhóm"}</strong> • ĐVT:{" "}
                      <strong>{mat.baseUnitName || mat.baseUnitCode}</strong>
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredMaterials.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                Không tìm thấy nguyên vật liệu nào khớp từ khóa.
              </div>
            )}
          </div>

          {/* Footer modal */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-500 text-[11px]">
              Đã chọn: <strong className="text-blue-600">{selectedMatIds.size}</strong> nguyên vật liệu
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsMultiSelectModalOpen(false)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmMultiSelect}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Áp dụng vào định mức ({selectedMatIds.size})
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
