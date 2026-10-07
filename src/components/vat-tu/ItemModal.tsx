"use client";

import * as React from "react";
import { Modal, Button, toast } from "@/components/ui";
import { Plus, X } from "lucide-react";

export interface ItemConversion {
  id?: string;
  unitId: string;
  unitCode?: string;
  unitName?: string;
  factorToBase: number;
}

export interface ItemFormData {
  id?: string;
  code: string;
  name: string;
  categoryId: string;
  kind: string;
  baseUnitId: string;
  minQty: number;
  binLabel: string | null;
  isActive: boolean;
  specJson?: Record<string, any>;
  conversions?: ItemConversion[];
}

export interface ItemCategoryOption {
  id: string;
  code: string;
  name: string;
}

export interface ItemUnitOption {
  id: string;
  code: string;
  name: string;
  dimension?: string;
}

export const KIND_LABELS: Record<string, { label: string; badgeClass: string }> = {
  material: { label: "Nguyên vật liệu", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  product: { label: "Thành phẩm", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  tool: { label: "Công cụ / Dụng cụ", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  service: { label: "Dịch vụ gia công", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
};

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ItemFormData | null;
  defaultKind?: string;
  categories: ItemCategoryOption[];
  units: ItemUnitOption[];
  onSuccess: (savedItem: any) => void;
}

export function ItemModal({
  isOpen,
  onClose,
  initialData,
  defaultKind = "material",
  categories,
  units,
  onSuccess,
}: ItemModalProps) {
  const [formData, setFormData] = React.useState<ItemFormData>({
    code: "",
    name: "",
    categoryId: "",
    kind: defaultKind,
    baseUnitId: "",
    minQty: 10,
    binLabel: "",
    isActive: true,
  });

  const [formSpecs, setFormSpecs] = React.useState<Array<{ key: string; value: string }>>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        id: initialData.id,
        code: initialData.code || "",
        name: initialData.name || "",
        categoryId: initialData.categoryId || (categories[0]?.id ?? ""),
        kind: initialData.kind || defaultKind,
        baseUnitId: initialData.baseUnitId || (units[0]?.id ?? ""),
        minQty: initialData.minQty ?? 10,
        binLabel: initialData.binLabel || "",
        isActive: initialData.isActive !== false,
      });

      const specs = Object.entries(initialData.specJson || {})
        .filter(([k]) => k !== "bom") // BOM lưu riêng
        .map(([key, val]) => ({
          key,
          value: typeof val === "object" ? JSON.stringify(val) : String(val),
        }));
      setFormSpecs(specs);
    } else {
      const defaultCat = categories.length > 0 ? categories[0].id : "";
      const defaultUnit = units.length > 0 ? units[0].id : "";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const prefix = defaultKind === "product" ? "TP" : "VT";

      setFormData({
        code: `${prefix}-2026-${randomSuffix}`,
        name: "",
        categoryId: defaultCat,
        kind: defaultKind,
        baseUnitId: defaultUnit,
        minQty: defaultKind === "product" ? 0 : 10,
        binLabel: defaultKind === "product" ? "KHO-THANH-PHAM" : "KHE-A01",
        isActive: true,
      });
      setFormSpecs(
        defaultKind === "product"
          ? [{ key: "Quy cách sản xuất", value: "Chuẩn thiết kế" }]
          : [
              { key: "Độ dày", value: "3mm" },
              { key: "Kích thước", value: "1220 x 2440 mm" },
            ]
      );
    }
  }, [isOpen, initialData, defaultKind, categories, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Vui lòng điền mã và tên mặt hàng");
      return;
    }
    if (!formData.categoryId || !formData.baseUnitId) {
      toast.error("Vui lòng chọn nhóm ngành và đơn vị tính cơ sở");
      return;
    }

    setIsSubmitting(true);
    try {
      const specification: Record<string, any> = initialData?.specJson?.bom
        ? { bom: initialData.specJson.bom }
        : {};

      formSpecs.forEach((s) => {
        if (s.key.trim()) specification[s.key.trim()] = s.value.trim();
      });

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        kind: formData.kind,
        baseUnitId: formData.baseUnitId,
        minQty: Number(formData.minQty) || 0,
        binLabel: (formData.binLabel || "").trim(),
        isActive: formData.isActive,
        specification,
        conversions: initialData?.conversions || [],
      };

      const url = formData.id
        ? `/api/inventory/items/${formData.id}`
        : "/api/inventory/items";
      const method = formData.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Không thể lưu thông tin mặt hàng");
      }

      const resData = await res.json();
      toast.success(
        formData.id
          ? "Đã cập nhật thông tin mặt hàng thành công!"
          : "Đã thêm mặt hàng mới vào danh mục!"
      );
      onSuccess(resData.item || resData);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu mặt hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(formData.id);
  const modalTitle = isEditing
    ? "Chỉnh sửa thông tin mặt hàng"
    : formData.kind === "product"
    ? "Thêm thành phẩm vào danh mục"
    : "Thêm mới vật tư vào danh mục";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã SKU <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="VD: VT-2026-001 hoặc TP-HOP-DEN"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên mặt hàng / Thành phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Hộp đèn mica hút nổi 60cm, Tấm Alu..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhóm ngành / Loại vật tư <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.categoryId}
              required
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">-- Chọn nhóm ngành --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tính chất mặt hàng <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {Object.entries(KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Đơn vị tính cơ sở <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.baseUnitId}
              required
              onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">-- Chọn ĐVT cơ sở --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Định mức tồn tối thiểu
            </label>
            <input
              type="number"
              value={formData.minQty}
              onChange={(e) => setFormData({ ...formData, minQty: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Thông số kỹ thuật chi tiết */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700">
              Thông số kỹ thuật chi tiết
            </label>
            <button
              type="button"
              onClick={() => setFormSpecs([...formSpecs, { key: "", value: "" }])}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Thêm thông số
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {formSpecs.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tên thông số (VD: Độ dày, Khổ rộng, Xuất xứ...)"
                  value={s.key}
                  onChange={(e) => {
                    const updated = [...formSpecs];
                    updated[idx].key = e.target.value;
                    setFormSpecs(updated);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  placeholder="Giá trị (VD: 3mm, 1220x2440mm, Hàn Quốc...)"
                  value={s.value}
                  onChange={(e) => {
                    const updated = [...formSpecs];
                    updated[idx].value = e.target.value;
                    setFormSpecs(updated);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setFormSpecs(formSpecs.filter((_, i) => i !== idx))}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            {isEditing ? "Lưu thay đổi" : formData.kind === "product" ? "Tạo thành phẩm" : "Tạo vật tư"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
