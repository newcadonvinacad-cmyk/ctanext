"use client";

import * as React from "react";
import { Button, Input, Modal, toast } from "@/components/ui";
import {
  Boxes,
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  Check,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [categories, setCategories] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [units, setUnits] = React.useState<Array<{ id: string; code: string; name: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // ID thành phẩm đang chọn để xem/cấu hình BOM
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState<string>("");

  // Modal tạo thành phẩm mới vào danh mục erp.items
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = React.useState(false);
  const [productForm, setProductForm] = React.useState({
    code: "",
    name: "",
    categoryId: "",
    baseUnitId: "",
  });

  // Modal thêm/sửa dòng vật tư vào định mức của thành phẩm đang chọn
  const [isMaterialModalOpen, setIsMaterialModalOpen] = React.useState(false);
  const [isSavingMaterial, setIsSavingMaterial] = React.useState(false);
  const [materialForm, setMaterialForm] = React.useState<{
    id?: string;
    selectedItemId: string;
    name: string;
    unit: string;
    quantity: number;
    note: string;
  }>({
    selectedItemId: "",
    name: "",
    unit: "",
    quantity: 1,
    note: "",
  });

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

  // Danh sách vật tư định mức của thành phẩm đang chọn (lấy từ specJson.bom của item đó)
  const currentBomMaterials = React.useMemo<BomMaterialLine[]>(() => {
    if (!currentProduct || !currentProduct.specJson?.bom) return [];
    const bom = currentProduct.specJson.bom;
    return Array.isArray(bom) ? bom : [];
  }, [currentProduct]);

  // Lọc danh sách thành phẩm theo từ khóa tìm kiếm
  const filteredProducts = React.useMemo(() => {
    if (!searchTerm.trim()) return productItems;
    const q = searchTerm.toLowerCase().trim();
    return productItems.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [productItems, searchTerm]);

  // Mở modal thêm thành phẩm mới
  const handleOpenCreateProduct = () => {
    const defaultCat = categories[0]?.id || "";
    const defaultUnit = units.find((u) => u.code === "M2" || u.code === "BO" || u.code === "CAI")?.id || units[0]?.id || "";
    setProductForm({
      code: `TP-${Date.now().toString().slice(-4)}`,
      name: "",
      categoryId: defaultCat,
      baseUnitId: defaultUnit,
    });
    setIsProductModalOpen(true);
  };

  // Lưu thành phẩm mới trực tiếp vào danh mục erp.items (kind = 'product')
  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.code.trim()) {
      toast.error("Vui lòng nhập Mã SKU và Tên thành phẩm");
      return;
    }
    if (!productForm.categoryId || !productForm.baseUnitId) {
      toast.error("Vui lòng chọn Nhóm ngành và Đơn vị tính cơ sở");
      return;
    }

    try {
      setIsCreatingProduct(true);
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: productForm.code.trim().toUpperCase(),
          name: productForm.name.trim(),
          kind: "product",
          categoryId: productForm.categoryId,
          baseUnitId: productForm.baseUnitId,
          specJson: { bom: [] },
          minQty: 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể tạo thành phẩm vào danh mục");
      }

      const data = await res.json();
      const newItem = data.item;
      toast.success(`Đã thêm thành phẩm [${newItem.code}] vào danh mục vật tư!`);
      setIsProductModalOpen(false);
      await fetchInventoryData();
      if (newItem?.id) {
        setSelectedProductId(newItem.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo thành phẩm");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Mở modal thêm dòng vật tư vào thành phẩm đang chọn
  const handleOpenAddMaterial = () => {
    if (!currentProduct) {
      toast.error("Vui lòng chọn một Thành phẩm trước");
      return;
    }

    const firstMat = availableMaterials[0];
    setMaterialForm({
      selectedItemId: firstMat?.id || "",
      name: firstMat?.name || "",
      unit: firstMat?.baseUnitName || firstMat?.baseUnitCode || "Cái",
      quantity: 1,
      note: "",
    });
    setIsMaterialModalOpen(true);
  };

  // Mở modal sửa dòng vật tư
  const handleOpenEditMaterial = (m: BomMaterialLine) => {
    setMaterialForm({
      id: m.id,
      selectedItemId: m.itemId || "",
      name: m.name,
      unit: m.unit,
      quantity: m.quantity,
      note: m.note || "",
    });
    setIsMaterialModalOpen(true);
  };

  // Khi người dùng chọn 1 vật tư từ dropdown danh mục
  const handleSelectMaterialOption = (itemId: string) => {
    const found = availableMaterials.find((i) => i.id === itemId);
    if (found) {
      setMaterialForm((prev) => ({
        ...prev,
        selectedItemId: found.id,
        name: found.name,
        unit: found.baseUnitName || found.baseUnitCode || "Cái",
      }));
    }
  };

  // Lưu dòng vật tư vào định mức của thành phẩm trong erp.items (qua PUT /api/inventory/items/[id])
  const handleSaveMaterial = async () => {
    if (!currentProduct) return;
    if (!materialForm.name.trim()) {
      toast.error("Vui lòng chọn hoặc nhập tên nguyên vật liệu");
      return;
    }
    if (!materialForm.quantity || materialForm.quantity <= 0) {
      toast.error("Số lượng định mức phải lớn hơn 0");
      return;
    }

    try {
      setIsSavingMaterial(true);
      const currentList = [...currentBomMaterials];
      const selectedMatItem = availableMaterials.find((i) => i.id === materialForm.selectedItemId);

      let updatedList: BomMaterialLine[];

      if (materialForm.id) {
        // Cập nhật dòng cũ
        updatedList = currentList.map((item) =>
          item.id === materialForm.id
            ? {
                ...item,
                itemId: materialForm.selectedItemId || item.itemId,
                itemCode: selectedMatItem?.code || item.itemCode,
                name: materialForm.name.trim(),
                unit: materialForm.unit.trim() || item.unit,
                quantity: Number(materialForm.quantity),
                note: materialForm.note.trim(),
              }
            : item
        );
      } else {
        // Thêm dòng mới
        const newLine: BomMaterialLine = {
          id: `bom-${Date.now()}`,
          itemId: materialForm.selectedItemId || undefined,
          itemCode: selectedMatItem?.code || undefined,
          name: materialForm.name.trim(),
          unit: materialForm.unit.trim() || "Cái",
          quantity: Number(materialForm.quantity),
          note: materialForm.note.trim(),
        };
        updatedList = [...currentList, newLine];
      }

      // Gửi PUT cập nhật specification.bom của item
      const newSpecJson = {
        ...(currentProduct.specJson || {}),
        bom: updatedList,
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

      toast.success("Đã cập nhật định mức vật tư thành công!");
      setIsMaterialModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu định mức vật tư");
    } finally {
      setIsSavingMaterial(false);
    }
  };

  // Xóa dòng vật tư khỏi định mức
  const handleDeleteMaterial = async (matId: string) => {
    if (!currentProduct) return;
    try {
      const updatedList = currentBomMaterials.filter((m) => m.id !== matId);
      const newSpecJson = {
        ...(currentProduct.specJson || {}),
        bom: updatedList,
      };

      const res = await fetch(`/api/inventory/items/${currentProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specJson: newSpecJson,
        }),
      });

      if (!res.ok) throw new Error("Không thể xóa dòng định mức");

      setAllItems((prev) =>
        prev.map((i) => (i.id === currentProduct.id ? { ...i, specJson: newSpecJson } : i))
      );
      toast.success("Đã xóa dòng vật tư khỏi định mức");
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa dòng vật tư");
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
            onClick={handleOpenCreateProduct}
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

                <Button
                  size="sm"
                  onClick={handleOpenAddMaterial}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shrink-0 font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Thêm vật tư vào định mức
                </Button>
              </div>

              {/* Bảng danh sách vật tư */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">STT</th>
                      <th className="px-3 py-2 w-28">Mã SKU</th>
                      <th className="px-3 py-2">Tên nguyên vật liệu</th>
                      <th className="px-3 py-2 text-center w-24">ĐVT</th>
                      <th className="px-3 py-2 text-right w-36">
                        Số lượng cần / 1 {currentProduct.baseUnitName || currentProduct.baseUnitCode}
                      </th>
                      <th className="px-3 py-2">Ghi chú kỹ thuật</th>
                      <th className="px-3 py-2 text-center w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentBomMaterials.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-[11px] font-medium text-slate-600">
                          {m.itemCode || "—"}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{m.name}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600 bg-slate-50/50">{m.unit}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-700 text-xs">
                          {m.quantity}
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-[11px] italic">{m.note || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMaterial(m)}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded"
                              title="Sửa dòng này"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {currentBomMaterials.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Chưa có vật tư nào trong định mức của thành phẩm này. Bấm "+ Thêm vật tư vào định mức" để chọn từ danh mục vật tư.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Tổng cộng: <strong>{currentBomMaterials.length}</strong> loại nguyên vật liệu cấu thành.
                </span>
                <span>
                  * Dữ liệu được lưu trực tiếp vào danh mục mặt hàng trong hệ thống.
                </span>
              </div>
            </div>
          )}

      {/* MODAL THÊM THÀNH PHẨM MỚI VÀO DANH MỤC ERP.ITEMS */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Thêm Thành Phẩm Vào Danh Mục Vật Tư & Quy Cách"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mã SKU Thành Phẩm *</label>
              <Input
                value={productForm.code}
                onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                placeholder="VD: TP-HOP-DEN-3M"
                className="text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên Thành Phẩm *</label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="VD: Hộp đèn 3M in UV..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nhóm Ngành Hàng *</label>
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Đơn Vị Tính Cơ Sở *</label>
              <select
                value={productForm.baseUnitId}
                onChange={(e) => setProductForm({ ...productForm, baseUnitId: e.target.value })}
                className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
            Thành phẩm này sẽ được lưu trực tiếp vào cơ sở dữ liệu với phân loại <strong>Thành phẩm (product)</strong> và xuất hiện ở cả tab <strong>Danh mục Vật tư & Quy cách</strong>.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsProductModalOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isCreatingProduct}
              onClick={handleSaveProduct}
              className="bg-slate-900 text-white text-xs"
            >
              {isCreatingProduct ? "Đang lưu..." : "Lưu vào danh mục"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL THÊM / SỬA DÒNG VẬT TƯ VÀO ĐỊNH MỨC */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        title={
          materialForm.id
            ? `Sửa Vật Tư Trong Định Mức`
            : `Thêm Vật Tư Vào Định Mức 1 ${currentProduct?.baseUnitName || currentProduct?.baseUnitCode} ${currentProduct?.name}`
        }
      >
        <div className="space-y-3.5 text-xs">
          {/* Chọn từ danh mục vật tư hiện có */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Chọn Vật Tư Từ Danh Mục (vat-tu?tab=items) *
            </label>
            <select
              value={materialForm.selectedItemId}
              onChange={(e) => handleSelectMaterialOption(e.target.value)}
              className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white"
            >
              <option value="">-- Chọn nguyên vật liệu trong kho --</option>
              {availableMaterials.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  [{mat.code}] {mat.name} ({mat.baseUnitName || mat.baseUnitCode})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 block mt-1">
              Vật tư được liên kết trực tiếp từ Danh mục Vật tư của hệ thống.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên Nguyên Vật Liệu *</label>
              <Input
                value={materialForm.name}
                onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                placeholder="Tên vật tư quy cách..."
                className="text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Đơn Vị Tính (ĐVT) *</label>
              <Input
                value={materialForm.unit}
                onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                placeholder="ĐVT..."
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Số Lượng Cần / 1 {currentProduct?.baseUnitName || currentProduct?.baseUnitCode} *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.001"
              value={materialForm.quantity}
              onChange={(e) =>
                setMaterialForm({ ...materialForm, quantity: parseFloat(e.target.value) || 0 })
              }
              className="text-xs font-mono font-bold"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Ví dụ: Để làm 1 {currentProduct?.baseUnitName || "đơn vị"} thành phẩm này thì cần bao nhiêu {materialForm.unit || "vật tư"}.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Kỹ Thuật (Tùy chọn)</label>
            <Input
              value={materialForm.note}
              onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
              placeholder="VD: Tính mép gấp viền 5cm, nan bước 40cm..."
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsMaterialModalOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isSavingMaterial}
              onClick={handleSaveMaterial}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {isSavingMaterial ? "Đang lưu..." : "Lưu vào định mức"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
