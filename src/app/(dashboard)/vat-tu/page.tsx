"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Package,
  Layers,
  Tag,
  Ruler,
  CheckCircle2,
  XCircle,
  Building2,
  X,
} from "lucide-react";
import {
  Button,
  Modal,
  Drawer,
  toast,
  type StatItem,
} from "@/components/ui";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
  type DataTableFacetFilterConfig,
} from "@/components/shared/DataTable";
import { useAuthorization } from "@/hooks/use-authorization";
import { useSetPageHeader } from "@/contexts/page-header-context";

interface ItemConversion {
  id?: string;
  unitId: string;
  unitCode?: string;
  unitName?: string;
  factorToBase: number;
}

interface ItemDto {
  id: string;
  code: string;
  name: string;
  kind: string;
  categoryId: string;
  categoryCode?: string;
  categoryName: string;
  baseUnitId: string;
  baseUnitCode?: string;
  baseUnitName: string;
  minQty: number;
  binLabel: string | null;
  specJson: Record<string, any>;
  conversions: ItemConversion[];
  totalOnHand: number;
  totalAvailable?: number;
  refCostPrice?: number;
  totalValue?: number;
  isActive: boolean;
}

interface CategoryDto {
  id: string;
  code: string;
  name: string;
  itemCount?: number;
}

interface UnitDto {
  id: string;
  code: string;
  name: string;
  dimension: string;
  itemCount?: number;
}

interface StockBalanceDto {
  balanceId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  binLabel: string | null;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  costPrice: number;
  totalValue: number;
  stockStatus: "normal" | "low_stock" | "out_of_stock";
}

const KIND_LABELS: Record<string, { label: string; badgeClass: string }> = {
  material: { label: "Nguyên vật liệu", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  product: { label: "Thành phẩm", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  tool: { label: "Công cụ / Dụng cụ", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  service: { label: "Dịch vụ gia công", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
};

const DIMENSION_LABELS: Record<string, string> = {
  count: "Đếm số lượng (Cái, Cây, Tấm, Cuộn...)",
  length: "Độ dài (Mét, Centimet...)",
  area: "Diện tích (Mét vuông m²...)",
  mass: "Khối lượng (Kg, Tấn...)",
  volume: "Thể tích (Lít, m³...)",
  time: "Thời gian (Giờ, Ngày...)",
};

const formatNumber = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
const formatMoney = (v: number) => v.toLocaleString("vi-VN") + " ₫";

function MaterialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "classifications" || tabParam === "categories" || tabParam === "units"
      ? "classifications"
      : "items";

  const { can } = useAuthorization();
  const canCreate = can("item.create");
  const canEdit = can("item.update");
  const canViewCost = can("item.cost_read");
  const canManage = can("company_setting.update");

  // Dữ liệu chính
  const [items, setItems] = React.useState<ItemDto[]>([]);
  const [categories, setCategories] = React.useState<CategoryDto[]>([]);
  const [units, setUnits] = React.useState<UnitDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingCategories, setLoadingCategories] = React.useState(false);
  const [loadingUnits, setLoadingUnits] = React.useState(false);

  // Bộ lọc tìm kiếm & Facet cho Vật tư
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilters, setCategoryFilters] = React.useState<string[]>([]);
  const [kindFilters, setKindFilters] = React.useState<string[]>([]);
  const [activeFilters, setActiveFilters] = React.useState<string[]>([]);

  // Bộ lọc tìm kiếm cho Loại vật tư & Đơn vị tính
  const [catSearch, setCatSearch] = React.useState("");
  const [unitSearch, setUnitSearch] = React.useState("");

  // Drawer xem chi tiết thẻ quy cách vật tư
  const [selectedItem, setSelectedItem] = React.useState<ItemDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [itemStocks, setItemStocks] = React.useState<StockBalanceDto[]>([]);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Modal Thêm / Chỉnh sửa Vật tư
  const [isItemModalOpen, setIsItemModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ItemDto | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = React.useState(false);
  const [formData, setFormData] = React.useState({
    code: "",
    name: "",
    categoryId: "",
    kind: "material",
    baseUnitId: "",
    minQty: 10,
    binLabel: "",
    isActive: true,
  });
  const [formSpecs, setFormSpecs] = React.useState<Array<{ key: string; value: string }>>([]);
  const [formConversions, setFormConversions] = React.useState<Array<{ unitId: string; factorToBase: number }>>([]);

  // Modal Thêm / Sửa / Xóa Loại vật tư
  const [isCatModalOpen, setIsCatModalOpen] = React.useState(false);
  const [editingCat, setEditingCat] = React.useState<CategoryDto | null>(null);
  const [deletingCat, setDeletingCat] = React.useState<CategoryDto | null>(null);
  const [catForm, setCatForm] = React.useState({ code: "", name: "" });
  const [isSubmittingCat, setIsSubmittingCat] = React.useState(false);

  // Modal Thêm / Sửa / Xóa Đơn vị tính
  const [isUnitModalOpen, setIsUnitModalOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<UnitDto | null>(null);
  const [deletingUnit, setDeletingUnit] = React.useState<UnitDto | null>(null);
  const [unitForm, setUnitForm] = React.useState({ code: "", name: "", dimension: "count" });
  const [isSubmittingUnit, setIsSubmittingUnit] = React.useState(false);

  const navigateTab = (nextTab: string) => {
    router.replace(`/vat-tu?tab=${nextTab}`, { scroll: false });
  };

  // Nạp danh mục & đơn vị tính
  const fetchMetadata = React.useCallback(async () => {
    try {
      setLoadingCategories(true);
      setLoadingUnits(true);
      const [resCat, resUnit] = await Promise.all([
        fetch("/api/inventory/categories"),
        fetch("/api/inventory/units"),
      ]);
      if (resCat.ok) {
        const d = await resCat.json();
        setCategories(d.categories || []);
      }
      if (resUnit.ok) {
        const d = await resUnit.json();
        setUnits(d.units || []);
      }
    } catch {
      // Fallback sang endpoint metadata chung
      fetch("/api/inventory/metadata")
        .then((r) => r.json())
        .then((d) => {
          if (d.categories) setCategories(d.categories);
          if (d.units) setUnits(d.units);
        })
        .catch(() => {});
    } finally {
      setLoadingCategories(false);
      setLoadingUnits(false);
    }
  }, []);

  // Nạp danh sách vật tư
  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/items?limit=500");
      if (!res.ok) throw new Error("Lỗi khi tải danh sách vật tư");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      toast.error(err.message || "Không thể tải danh sách vật tư");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMetadata();
    fetchItems();
  }, [fetchMetadata, fetchItems]);

  // Mở modal thêm vật tư mới
  const handleOpenCreateItem = () => {
    const defaultCat = categories.length > 0 ? categories[0].id : "";
    const defaultUnit = units.length > 0 ? units[0].id : "";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    setEditingItem(null);
    setFormData({
      code: `VT-2026-${randomSuffix}`,
      name: "",
      categoryId: defaultCat,
      kind: "material",
      baseUnitId: defaultUnit,
      minQty: 10,
      binLabel: "KHE-A01",
      isActive: true,
    });
    setFormSpecs([
      { key: "Độ dày", value: "3mm" },
      { key: "Kích thước", value: "1220 x 2440 mm" },
    ]);
    setFormConversions([]);
    setIsItemModalOpen(true);
  };

  // Mở modal sửa vật tư
  const handleOpenEditItem = (item: ItemDto) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      categoryId: item.categoryId,
      kind: item.kind || "material",
      baseUnitId: item.baseUnitId,
      minQty: item.minQty ?? 10,
      binLabel: item.binLabel || "Chưa xếp kệ",
      isActive: item.isActive,
    });
    const specs = Object.entries(item.specJson || {}).map(([key, val]) => ({
      key,
      value: typeof val === "object" ? JSON.stringify(val) : String(val),
    }));
    setFormSpecs(specs);
    setFormConversions(
      (item.conversions || []).map((c) => ({
        unitId: c.unitId,
        factorToBase: c.factorToBase,
      }))
    );
    setIsItemModalOpen(true);
  };

  // Mở Thẻ kho 360°
  const handleOpenDetail = async (item: ItemDto) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/inventory/items/${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setItemStocks(data.stocks || []);
      } else {
        setItemStocks([]);
      }
    } catch {
      setItemStocks([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Đổi trạng thái vật tư
  const handleToggleStatus = async (item: ItemDto) => {
    try {
      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          isActive: !item.isActive,
        }),
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại");
      toast.success(`Đã ${item.isActive ? "ngừng sử dụng" : "kích hoạt lại"} vật tư ${item.code}`);
      fetchItems();
    } catch (e: any) {
      toast.error(e.message || "Lỗi thao tác");
    }
  };

  // Lưu vật tư
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Vui lòng điền mã và tên vật tư");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const specification: Record<string, string> = {};
      formSpecs.forEach((s) => {
        if (s.key.trim()) specification[s.key.trim()] = s.value.trim();
      });

      const conversions = formConversions
        .filter((c) => c.unitId && c.factorToBase > 0)
        .map((c) => ({
          unitId: c.unitId,
          factorToBase: Number(c.factorToBase),
        }));

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        kind: formData.kind,
        baseUnitId: formData.baseUnitId,
        minQty: Number(formData.minQty),
        binLabel: formData.binLabel.trim(),
        isActive: formData.isActive,
        specification,
        conversions,
      };

      const url = editingItem
        ? `/api/inventory/items/${editingItem.id}`
        : "/api/inventory/items";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Không thể lưu vật tư");
      }

      toast.success(editingItem ? "Đã cập nhật thông tin vật tư!" : "Đã thêm vật tư mới vào danh mục!");
      setIsItemModalOpen(false);
      fetchItems();
      fetchMetadata();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu vật tư");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Mở modal tạo / sửa Loại vật tư
  const handleOpenCatModal = (cat?: CategoryDto) => {
    if (cat) {
      setEditingCat(cat);
      setCatForm({ code: cat.code, name: cat.name });
    } else {
      setEditingCat(null);
      setCatForm({ code: "", name: "" });
    }
    setIsCatModalOpen(true);
  };

  // Lưu Loại vật tư
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.code.trim() || !catForm.name.trim()) {
      toast.error("Vui lòng điền mã và tên loại vật tư");
      return;
    }
    setIsSubmittingCat(true);
    try {
      const url = editingCat ? `/api/inventory/categories/${editingCat.id}` : "/api/inventory/categories";
      const method = editingCat ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể lưu loại vật tư");
      }
      toast.success(editingCat ? "Đã cập nhật loại vật tư" : "Đã thêm loại vật tư mới");
      setIsCatModalOpen(false);
      fetchMetadata();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu loại vật tư");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Xóa Loại vật tư
  const handleDeleteCat = async () => {
    if (!deletingCat) return;
    setIsSubmittingCat(true);
    try {
      const res = await fetch(`/api/inventory/categories/${deletingCat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể xóa loại vật tư");
      }
      toast.success(`Đã xóa loại vật tư ${deletingCat.name}`);
      setDeletingCat(null);
      fetchMetadata();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa loại vật tư");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // Mở modal tạo / sửa Đơn vị tính
  const handleOpenUnitModal = (u?: UnitDto) => {
    if (u) {
      setEditingUnit(u);
      setUnitForm({ code: u.code, name: u.name, dimension: u.dimension || "count" });
    } else {
      setEditingUnit(null);
      setUnitForm({ code: "", name: "", dimension: "count" });
    }
    setIsUnitModalOpen(true);
  };

  // Lưu Đơn vị tính
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.code.trim() || !unitForm.name.trim()) {
      toast.error("Vui lòng điền mã và tên đơn vị tính");
      return;
    }
    setIsSubmittingUnit(true);
    try {
      const url = editingUnit ? `/api/inventory/units/${editingUnit.id}` : "/api/inventory/units";
      const method = editingUnit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể lưu đơn vị tính");
      }
      toast.success(editingUnit ? "Đã cập nhật đơn vị tính" : "Đã thêm đơn vị tính mới");
      setIsUnitModalOpen(false);
      fetchMetadata();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu đơn vị tính");
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  // Xóa Đơn vị tính
  const handleDeleteUnit = async () => {
    if (!deletingUnit) return;
    setIsSubmittingUnit(true);
    try {
      const res = await fetch(`/api/inventory/units/${deletingUnit.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể xóa đơn vị tính");
      }
      toast.success(`Đã xóa đơn vị tính ${deletingUnit.name}`);
      setDeletingUnit(null);
      fetchMetadata();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa đơn vị tính");
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  // Thiết lập tiêu đề TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Danh Mục Vật Tư & Quy Cách",
      subtitle: "Hồ sơ chuẩn hóa vật tư, phân loại nhóm ngành và quy chuẩn đơn vị đo",
      quickViews: [
        { label: "Tất cả vật tư", href: "/vat-tu" },
        { label: "Nhóm ngành & Đơn vị tính", href: "/vat-tu?tab=classifications" },
      ],
    },
    []
  );

  // Lọc dữ liệu Vật tư
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchName = item.name.toLowerCase().includes(query);
        const matchCat = (item.categoryName || "").toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchCat) return false;
      }
      if (categoryFilters.length > 0 && !categoryFilters.includes(item.categoryId)) {
        return false;
      }
      if (kindFilters.length > 0 && !kindFilters.includes(item.kind)) {
        return false;
      }
      if (activeFilters.length > 0) {
        const activeStr = String(item.isActive);
        if (!activeFilters.includes(activeStr)) return false;
      }
      return true;
    });
  }, [items, searchTerm, categoryFilters, kindFilters, activeFilters]);

  // Lọc Loại vật tư
  const filteredCategories = React.useMemo(() => {
    return categories.filter((c) => {
      if (catSearch.trim()) {
        const q = catSearch.toLowerCase().trim();
        return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categories, catSearch]);

  // Lọc Đơn vị tính
  const filteredUnits = React.useMemo(() => {
    return units.filter((u) => {
      if (unitSearch.trim()) {
        const q = unitSearch.toLowerCase().trim();
        return u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [units, unitSearch]);

  // StatBar cho Tab Vật tư
  const itemStats = React.useMemo<StatItem[]>(() => {
    const materialCount = items.filter((i) => i.kind === "material").length;
    const productCount = items.filter((i) => i.kind === "product").length;
    const toolCount = items.filter((i) => i.kind === "tool" || i.kind === "service").length;
    const activeCount = items.filter((i) => i.isActive).length;

    return [
      { label: "Tổng số mặt hàng", value: items.length.toString() },
      { label: "Nguyên vật liệu", value: materialCount.toString() },
      { label: "Thành phẩm biển bảng", value: productCount.toString() },
      { label: "Dụng cụ / Phụ kiện", value: toolCount.toString() },
      { label: "Đang sử dụng", value: activeCount.toString(), color: "emerald" },
    ];
  }, [items]);

  // StatBar cho Tab Loại vật tư
  const categoryStats = React.useMemo<StatItem[]>(() => {
    const withItems = categories.filter((c) => (c.itemCount || 0) > 0).length;
    const totalAssigned = categories.reduce((acc, c) => acc + (c.itemCount || 0), 0);
    return [
      { label: "Tổng số nhóm loại", value: categories.length.toString() },
      { label: "Đang có mặt hàng", value: withItems.toString(), color: "emerald" },
      { label: "Tổng SKU phân nhóm", value: formatNumber(totalAssigned) },
    ];
  }, [categories]);

  // StatBar cho Tab Đơn vị tính
  const unitStats = React.useMemo<StatItem[]>(() => {
    const inUse = units.filter((u) => (u.itemCount || 0) > 0).length;
    return [
      { label: "Tổng số ĐVT", value: units.length.toString() },
      { label: "Đang được sử dụng", value: inUse.toString(), color: "emerald" },
    ];
  }, [units]);

  // Cột bảng Vật tư
  const itemColumns = React.useMemo<DataTableColumn<ItemDto>[]>(() => {
    const cols: DataTableColumn<ItemDto>[] = [
      {
        id: "code",
        header: "Mã SKU",
        accessorKey: "code",
        sortable: true,
        width: "w-32 min-w-[120px]",
        cell: (item) => (
          <span
            onClick={() => handleOpenDetail(item)}
            className="font-mono text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer block"
          >
            {item.code}
          </span>
        ),
      },
      {
        id: "name",
        header: "Tên vật tư & Quy cách",
        accessorKey: "name",
        sortable: true,
        width: "min-w-[240px]",
        cell: (item) => {
          const firstLetter = (item.name || "V").charAt(0).toUpperCase();
          return (
            <div
              onClick={() => handleOpenDetail(item)}
              className="flex items-center gap-2 cursor-pointer group py-0.5"
              title={item.name}
            >
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 transition-colors">
                {firstLetter}
              </span>
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate block max-w-[280px]">
                  {item.name}
                </span>
                {Object.keys(item.specJson || {}).length > 0 && (
                  <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                    {Object.entries(item.specJson)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" • ")}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "categoryName",
        header: "Nhóm ngành",
        accessorKey: "categoryName",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (item) => (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {item.categoryName}
          </span>
        ),
      },
      {
        id: "kind",
        header: "Tính chất",
        accessorKey: "kind",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (item) => {
          const info = KIND_LABELS[item.kind] || {
            label: item.kind,
            badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
          };
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${info.badgeClass}`}
            >
              {info.label}
            </span>
          );
        },
      },
      {
        id: "baseUnitName",
        header: "ĐVT cơ sở",
        accessorKey: "baseUnitName",
        width: "w-24 min-w-[85px]",
        cell: (item) => (
          <span className="text-xs font-medium text-slate-700">{item.baseUnitName}</span>
        ),
      },
      {
        id: "minQty",
        header: "Định mức tồn",
        accessorKey: "minQty",
        sortable: true,
        align: "right",
        width: "w-28 min-w-[100px]",
        cell: (item) => (
          <span className="font-mono text-xs text-slate-600">
            {formatNumber(item.minQty || 0)}
          </span>
        ),
      },
      {
        id: "binLabel",
        header: "Vị trí kệ",
        width: "w-28 min-w-[90px]",
        cell: (item) => (
          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200">
            {item.binLabel || "—"}
          </span>
        ),
      },
      {
        id: "isActive",
        header: "Trạng thái",
        accessorKey: "isActive",
        sortable: true,
        width: "w-32 min-w-[120px]",
        cell: (item) => (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              item.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.isActive ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {item.isActive ? "Đang sử dụng" : "Ngừng sử dụng"}
          </span>
        ),
      },
    ];

    return cols;
  }, []);

  // Hành động dòng cho Vật tư
  const itemRowActions = React.useMemo<DataTableRowAction<ItemDto>[]>(() => {
    const actions: DataTableRowAction<ItemDto>[] = [
      {
        icon: <Eye className="w-3.5 h-3.5" />,
        title: "Xem hồ sơ quy cách",
        onClick: (item) => handleOpenDetail(item),
      },
    ];

    if (canEdit) {
      actions.push({
        icon: <Pencil className="w-3.5 h-3.5" />,
        title: "Chỉnh sửa thông tin",
        onClick: (item) => handleOpenEditItem(item),
      });
      actions.push({
        icon: <XCircle className="w-3.5 h-3.5" />,
        title: "Ngừng / Kích hoạt sử dụng",
        onClick: (item) => handleToggleStatus(item),
      });
    }

    return actions;
  }, [canEdit]);

  // Bộ lọc Facet cho Vật tư
  const itemFacetFilters = React.useMemo<DataTableFacetFilterConfig[]>(() => {
    return [
      {
        id: "categoryId",
        title: "Nhóm ngành",
        options: categories.map((c) => ({
          label: c.name,
          value: c.id,
        })),
        selectedValues: categoryFilters,
        onChange: setCategoryFilters,
      },
      {
        id: "kind",
        title: "Tính chất",
        options: Object.entries(KIND_LABELS).map(([k, v]) => ({
          label: v.label,
          value: k,
        })),
        selectedValues: kindFilters,
        onChange: setKindFilters,
      },
      {
        id: "isActive",
        title: "Trạng thái",
        options: [
          { label: "Đang sử dụng", value: "true" },
          { label: "Ngừng sử dụng", value: "false" },
        ],
        selectedValues: activeFilters,
        onChange: setActiveFilters,
      },
    ];
  }, [categories, categoryFilters, kindFilters, activeFilters]);

  // Cột bảng Loại vật tư
  const categoryColumns = React.useMemo<DataTableColumn<CategoryDto>[]>(() => {
    return [
      {
        id: "code",
        header: "Mã loại",
        accessorKey: "code",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (c) => <span className="font-mono text-xs font-bold text-slate-900">{c.code}</span>,
      },
      {
        id: "name",
        header: "Tên loại vật tư / Nhóm ngành",
        accessorKey: "name",
        sortable: true,
        width: "min-w-[260px]",
        cell: (c) => (
          <div className="flex items-center gap-2 py-0.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-900 text-xs">{c.name}</span>
          </div>
        ),
      },
      {
        id: "itemCount",
        header: "Số mặt hàng trực thuộc",
        accessorKey: "itemCount",
        sortable: true,
        align: "right",
        width: "w-44 min-w-[150px]",
        cell: (c) => (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {formatNumber(c.itemCount || 0)} SKU
          </span>
        ),
      },
    ];
  }, []);

  // Hành động dòng cho Loại vật tư
  const categoryRowActions = React.useMemo<DataTableRowAction<CategoryDto>[]>(() => {
    const actions: DataTableRowAction<CategoryDto>[] = [];
    if (canManage) {
      actions.push({
        icon: <Pencil className="w-3.5 h-3.5" />,
        title: "Chỉnh sửa nhóm",
        onClick: (c) => handleOpenCatModal(c),
      });
      actions.push({
        icon: <Trash2 className="w-3.5 h-3.5" />,
        title: "Xóa nhóm loại",
        danger: true,
        onClick: (c) => setDeletingCat(c),
      });
    }
    return actions;
  }, [canManage]);

  // Cột bảng Đơn vị tính
  const unitColumns = React.useMemo<DataTableColumn<UnitDto>[]>(() => {
    return [
      {
        id: "code",
        header: "Mã ĐVT",
        accessorKey: "code",
        sortable: true,
        width: "w-32 min-w-[110px]",
        cell: (u) => <span className="font-mono text-xs font-bold text-slate-900">{u.code}</span>,
      },
      {
        id: "name",
        header: "Tên đơn vị tính",
        accessorKey: "name",
        sortable: true,
        width: "min-w-[200px]",
        cell: (u) => (
          <div className="flex items-center gap-2 py-0.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
              <Ruler className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-900 text-xs">{u.name}</span>
          </div>
        ),
      },
      {
        id: "dimension",
        header: "Thứ nguyên đo lường",
        accessorKey: "dimension",
        sortable: true,
        width: "min-w-[220px]",
        cell: (u) => (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {DIMENSION_LABELS[u.dimension] || u.dimension}
          </span>
        ),
      },
      {
        id: "itemCount",
        header: "Đang sử dụng",
        accessorKey: "itemCount",
        sortable: true,
        align: "right",
        width: "w-36 min-w-[130px]",
        cell: (u) => (
          <span className="font-mono text-xs text-slate-700">
            {formatNumber(u.itemCount || 0)} mặt hàng
          </span>
        ),
      },
    ];
  }, []);

  // Hành động dòng cho Đơn vị tính
  const unitRowActions = React.useMemo<DataTableRowAction<UnitDto>[]>(() => {
    const actions: DataTableRowAction<UnitDto>[] = [];
    if (canManage) {
      actions.push({
        icon: <Pencil className="w-3.5 h-3.5" />,
        title: "Chỉnh sửa đơn vị",
        onClick: (u) => handleOpenUnitModal(u),
      });
      actions.push({
        icon: <Trash2 className="w-3.5 h-3.5" />,
        title: "Xóa đơn vị tính",
        danger: true,
        onClick: (u) => setDeletingUnit(u),
      });
    }
    return actions;
  }, [canManage]);

  return (
    <div className="w-full flex flex-col space-y-3 flex-1">
      {/* 1. Sub-Tabs ngang chuẩn Enterprise */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => navigateTab("items")}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "items"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Danh Mục Vật Tư & Quy Cách ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab("classifications")}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "classifications"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Nhóm Ngành & Đơn Vị Tính ({categories.length} loại · {units.length} ĐVT)</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: DANH MỤC VẬT TƯ & QUY CÁCH */}
      {activeTab === "items" && (
        <DataTable<ItemDto>
          data={filteredItems}
          columns={itemColumns}
          keyExtractor={(item: ItemDto) => item.id}
          searchable
          searchPlaceholder="Tìm theo mã SKU, tên vật tư, nhóm ngành..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={itemFacetFilters}
          onResetFilters={() => {
            setCategoryFilters([]);
            setKindFilters([]);
            setActiveFilters([]);
            setSearchTerm("");
          }}
          stats={itemStats}
          defaultShowStats={false}
          onRefresh={fetchItems}
          exportFileName="danh-muc-vat-tu"
          rowActions={itemRowActions}
          onRowClick={handleOpenDetail}
          isLoading={loading}
          primaryAction={
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenCreateItem}
              className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm vật tư</span>
            </Button>
          }
        />
      )}

      {/* 3. TAB 2: NHÓM NGÀNH & ĐƠN VỊ TÍNH (2 BẢNG SONG SONG TRÁI - PHẢI) */}
      {activeTab === "classifications" && (
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Cột trái: Nhóm Ngành & Loại Vật Tư */}
            <div className="flex flex-col space-y-2 bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">Nhóm Ngành & Phân Loại</h3>
                    <p className="text-[11px] text-slate-500">{categories.length} phân nhóm mặt hàng</p>
                  </div>
                </div>
              </div>
              <DataTable<CategoryDto>
                data={filteredCategories}
                columns={categoryColumns}
                keyExtractor={(c: CategoryDto) => c.id}
                searchable
                searchPlaceholder="Tìm kiếm loại vật tư..."
                searchValue={catSearch}
                onSearchChange={setCatSearch}
                stats={categoryStats}
                defaultShowStats={false}
                exportFileName="loai-vat-tu"
                rowActions={categoryRowActions}
                isLoading={loadingCategories}
                onRefresh={fetchMetadata}
                primaryAction={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenCatModal()}
                    className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm loại</span>
                  </Button>
                }
              />
            </div>

            {/* Cột phải: Đơn Vị Tính & Thứ Nguyên Đo */}
            <div className="flex flex-col space-y-2 bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">Đơn Vị Tính & Thứ Nguyên Đo</h3>
                    <p className="text-[11px] text-slate-500">{units.length} đơn vị quy chuẩn</p>
                  </div>
                </div>
              </div>
              <DataTable<UnitDto>
                data={filteredUnits}
                columns={unitColumns}
                keyExtractor={(u: UnitDto) => u.id}
                searchable
                searchPlaceholder="Tìm kiếm đơn vị tính..."
                searchValue={unitSearch}
                onSearchChange={setUnitSearch}
                stats={unitStats}
                defaultShowStats={false}
                exportFileName="don-vi-tinh"
                rowActions={unitRowActions}
                isLoading={loadingUnits}
                onRefresh={fetchMetadata}
                primaryAction={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenUnitModal()}
                    className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm ĐVT</span>
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* DRAWER THẺ QUY CÁCH VẬT TƯ 360° */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedItem ? `Hồ Sơ Vật Tư: ${selectedItem.name}` : "Chi Tiết Vật Tư"}
        width="lg"
      >
        {selectedItem && (
          <div className="space-y-6 pb-6 text-xs">
            {/* Header Thẻ */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedItem.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{selectedItem.name}</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Nhóm: <strong>{selectedItem.categoryName}</strong> • Vị trí kệ: <strong>{selectedItem.binLabel || "Chưa xếp kệ"}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Định mức tối thiểu:</span>
                <span className="font-mono text-base font-bold text-slate-900">
                  {formatNumber(selectedItem.minQty)} {selectedItem.baseUnitName}
                </span>
              </div>
            </div>

            {/* Thông số kỹ thuật specJson */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Quy Cách Kỹ Thuật (Thông Số Chi Tiết)</span>
              </h4>
              {Object.keys(selectedItem.specJson || {}).length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  Chưa khai báo thông số kỹ thuật cho vật tư này.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {Object.entries(selectedItem.specJson).map(([k, v]) => (
                    <div key={k} className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{k}</span>
                      <span className="font-bold text-slate-900">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Đơn vị quy đổi */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-slate-500" />
                <span>Bảng Đơn Vị Quy Đổi Xuất / Nhập Kho</span>
              </h4>
              {(!selectedItem.conversions || selectedItem.conversions.length === 0) ? (
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500">
                  Sử dụng đơn vị tính cơ sở duy nhất: <strong>{selectedItem.baseUnitName}</strong>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {selectedItem.conversions.map((c, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        1 {c.unitName || c.unitCode}
                      </span>
                      <span className="font-mono font-bold text-blue-600">
                        = {formatNumber(c.factorToBase)} {selectedItem.baseUnitName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phân bổ tồn kho tại các điểm kho */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tồn Kho Thực Tế Tại Các Điểm Kho</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  {itemStocks.length} điểm kho
                </span>
              </h4>
              {loadingDetail ? (
                <div className="p-4 text-center text-slate-400">Đang kiểm tra tồn kho các điểm...</div>
              ) : itemStocks.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  Chưa có số dư tồn kho tại điểm kho nào.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {itemStocks.map((sb) => (
                    <div key={sb.balanceId} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block text-xs">
                          {sb.warehouseName} ({sb.warehouseCode})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Vị trí kệ: {sb.binLabel || "Chưa xếp"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-xs block">
                          {formatNumber(sb.onHandQty)} {selectedItem.baseUnitName}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          Khả dụng: {formatNumber(sb.availableQty)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL: THÊM / CHỈNH SỬA VẬT TƯ */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? "Chỉnh sửa thông tin vật tư" : "Thêm mới vật tư vào danh mục"}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
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
                placeholder="VD: VT-2026-001"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên vật tư hàng hóa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Tấm Alu Alcorest 3mm..."
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
                Tính chất vật tư <span className="text-rose-500">*</span>
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

          {/* Quy cách kỹ thuật specJson */}
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
            <div className="space-y-2">
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
              disabled={isSubmittingItem}
              onClick={() => setIsItemModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingItem}>
              {editingItem ? "Lưu thay đổi" : "Tạo vật tư"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: THÊM / SỬA LOẠI VẬT TƯ */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCat ? "Chỉnh sửa nhóm loại vật tư" : "Thêm loại vật tư mới"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCat} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã loại vật tư <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: ALU_MICA, LED_NGUON, SAT_THEP..."
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên loại vật tư / Nhóm ngành <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Tấm Alu & Mica, Đèn LED & Bộ nguồn..."
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingCat}
              onClick={() => setIsCatModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingCat}>
              {editingCat ? "Lưu thay đổi" : "Tạo loại vật tư"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: XÓA LOẠI VẬT TƯ */}
      <Modal
        isOpen={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        title="Xác nhận xóa loại vật tư"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Bạn có chắc chắn muốn xóa nhóm loại vật tư <strong>{deletingCat?.name}</strong> (
            <span className="font-mono">{deletingCat?.code}</span>)?
          </p>
          <p className="text-[11px] text-slate-400">
            Hệ thống chỉ cho phép xóa nhóm loại khi không có mặt hàng nào trực thuộc.
          </p>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingCat}
              onClick={() => setDeletingCat(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isSubmittingCat}
              onClick={handleDeleteCat}
            >
              Xóa loại
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: THÊM / SỬA ĐƠN VỊ TÍNH */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title={editingUnit ? "Chỉnh sửa đơn vị tính" : "Thêm đơn vị tính mới"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveUnit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã ĐVT <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: CAY, MET, CUON, TAM, HOP..."
              value={unitForm.code}
              onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên đơn vị tính <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Cây, Mét, Cuộn, Tấm, Hộp..."
              value={unitForm.name}
              onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Thứ nguyên đo lường <span className="text-rose-500">*</span>
            </label>
            <select
              value={unitForm.dimension}
              onChange={(e) => setUnitForm({ ...unitForm, dimension: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {Object.entries(DIMENSION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingUnit}
              onClick={() => setIsUnitModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingUnit}>
              {editingUnit ? "Lưu thay đổi" : "Tạo đơn vị"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: XÓA ĐƠN VỊ TÍNH */}
      <Modal
        isOpen={!!deletingUnit}
        onClose={() => setDeletingUnit(null)}
        title="Xác nhận xóa đơn vị tính"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Bạn có chắc chắn muốn xóa đơn vị tính <strong>{deletingUnit?.name}</strong> (
            <span className="font-mono">{deletingUnit?.code}</span>)?
          </p>
          <p className="text-[11px] text-slate-400">
            Hệ thống chỉ cho phép xóa đơn vị tính khi không có mặt hàng nào đang sử dụng làm ĐVT cơ sở.
          </p>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmittingUnit}
              onClick={() => setDeletingUnit(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isSubmittingUnit}
              onClick={handleDeleteUnit}
            >
              Xóa đơn vị
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Đang nạp danh mục vật tư...
        </div>
      }
    >
      <MaterialsContent />
    </React.Suspense>
  );
}
