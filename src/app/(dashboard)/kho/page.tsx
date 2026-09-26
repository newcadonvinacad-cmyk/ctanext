"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Building2,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  XCircle,
  Warehouse,
} from "lucide-react";
import { Button, Modal, toast, type StatItem } from "@/components/ui";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
  type DataTableFacetFilterConfig,
} from "@/components/shared/DataTable";
import { useAuthorization } from "@/hooks/use-authorization";
import { useSetPageHeader } from "@/contexts/page-header-context";
import type { WarehouseDto, StockBalanceDto } from "@/services/inventory.service";

const WAREHOUSE_KINDS: Record<
  string,
  { label: string; badgeClass: string }
> = {
  workshop: { label: "Kho xưởng", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  distribution: { label: "Kho phân phối", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  vehicle: { label: "Kho trên xe", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  transit: { label: "Kho trung chuyển", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
};

const STOCK_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  normal: {
    label: "Bình thường",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 inline mr-1" />,
  },
  low_stock: {
    label: "Dưới ngưỡng",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertTriangle className="w-3 h-3 text-amber-600 inline mr-1" />,
  },
  out_of_stock: {
    label: "Hết hàng",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="w-3 h-3 text-rose-600 inline mr-1" />,
  },
};

const LOT_KINDS: Record<string, string> = {
  standard: "Tiêu chuẩn",
  remnant: "Tấm lẻ",
  scrap: "Phế liệu",
};

const formatNumber = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
const formatMoney = (v: number) => v.toLocaleString("vi-VN") + " ₫";

function WarehousesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useAuthorization();

  const tab = searchParams.get("tab") === "warehouses" ? "warehouses" : "stocks";
  const warehouseId = searchParams.get("warehouse") || "all";

  const canManage = can("company_setting.update");
  const canViewCost = can("item.cost_read");
  const canReadStock = can("inventory.read") || can("stock_document.read");

  const [warehouses, setWarehouses] = React.useState<WarehouseDto[]>([]);
  const [stocks, setStocks] = React.useState<StockBalanceDto[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = React.useState(true);
  const [loadingStocks, setLoadingStocks] = React.useState(false);
  const [revision, setRevision] = React.useState(0);

  // Bộ lọc tìm kiếm & Facet cho Điểm Kho
  const [warehouseSearch, setWarehouseSearch] = React.useState("");
  const [warehouseTypeFilters, setWarehouseTypeFilters] = React.useState<string[]>([]);
  const [warehouseStatusFilters, setWarehouseStatusFilters] = React.useState<string[]>([]);

  // Bộ lọc tìm kiếm & Facet cho Tồn Kho
  const [stockSearch, setStockSearch] = React.useState("");
  const [stockWhFilters, setStockWhFilters] = React.useState<string[]>([]);
  const [stockStatusFilters, setStockStatusFilters] = React.useState<string[]>([]);
  const [stockLotFilters, setStockLotFilters] = React.useState<string[]>([]);

  // Modal tạo / sửa kho
  const [editor, setEditor] = React.useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = React.useState<WarehouseDto | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    type: "workshop" as WarehouseDto["type"],
    isActive: true,
  });

  const navigateTab = (nextTab: string, nextWarehouse = warehouseId) => {
    const q = new URLSearchParams();
    q.set("tab", nextTab);
    if (nextWarehouse !== "all") q.set("warehouse", nextWarehouse);
    router.replace(`/kho?${q.toString()}`, { scroll: false });
  };

  const handleOpenEdit = (w?: WarehouseDto) => {
    if (w) {
      setForm({ code: w.code, name: w.name, type: w.type, isActive: w.isActive });
      setEditor({ id: w.id });
    } else {
      const rand = Math.floor(100 + Math.random() * 900);
      setForm({ code: `KHO-X${rand}`, name: "", type: "workshop", isActive: true });
      setEditor({});
    }
  };

  // Thiết lập tiêu đề TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Quản Trị Kho & Tồn Kho",
      subtitle: "Hệ thống đa điểm kho và theo dõi số dư tồn thực tế",
      quickViews: [
        { label: "Bảng theo dõi tồn kho", href: "/kho?tab=stocks" },
        { label: "Danh sách điểm kho", href: "/kho?tab=warehouses" },
        { label: "Phiếu nhập xuất", href: "/kho/nhap-xuat" },
      ],
    },
    []
  );

  // Tải danh sách điểm kho
  React.useEffect(() => {
    let active = true;
    setLoadingWarehouses(true);
    fetch("/api/inventory/warehouses")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách kho");
        return res.json();
      })
      .then((data) => {
        if (active) setWarehouses(data.warehouses || []);
      })
      .catch((err) => {
        if (active) {
          setWarehouses([]);
          toast.error(err.message || "Lỗi tải kho");
        }
      })
      .finally(() => {
        if (active) setLoadingWarehouses(false);
      });

    return () => {
      active = false;
    };
  }, [revision]);

  // Tải danh sách số dư tồn kho
  React.useEffect(() => {
    if (tab !== "stocks" || !canReadStock) return;
    let active = true;
    setLoadingStocks(true);
    fetch(`/api/inventory/warehouses/${encodeURIComponent(warehouseId)}/stocks`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải số dư tồn kho");
        return res.json();
      })
      .then((data) => {
        if (active) setStocks(data.stocks || []);
      })
      .catch((err) => {
        if (active) {
          setStocks([]);
          toast.error(err.message || "Lỗi tải tồn kho");
        }
      })
      .finally(() => {
        if (active) setLoadingStocks(false);
      });

    return () => {
      active = false;
    };
  }, [tab, warehouseId, revision, canReadStock]);

  // Lưu thông tin kho
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Vui lòng điền mã và tên kho");
      return;
    }

    setSaving(true);
    try {
      const url = editor?.id ? `/api/inventory/warehouses/${editor.id}` : "/api/inventory/warehouses";
      const method = editor?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể lưu kho");
      }

      toast.success(editor?.id ? "Đã cập nhật điểm kho" : "Đã thêm điểm kho mới");
      setEditor(null);
      setRevision((r) => r + 1);
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu kho");
    } finally {
      setSaving(false);
    }
  };

  // Xóa kho
  const handleDeleteWarehouse = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/warehouses/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể xóa kho");
      }

      toast.success(`Đã xóa kho ${deleting.name}`);
      if (warehouseId === deleting.id) navigateTab(tab, "all");
      setDeleting(null);
      setRevision((r) => r + 1);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa kho");
    } finally {
      setSaving(false);
    }
  };

  // Lọc dữ liệu Điểm Kho
  const filteredWarehouses = React.useMemo(() => {
    return warehouses.filter((w) => {
      if (warehouseSearch.trim()) {
        const q = warehouseSearch.toLowerCase().trim();
        const match = w.code.toLowerCase().includes(q) || w.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (warehouseTypeFilters.length > 0 && !warehouseTypeFilters.includes(w.type)) {
        return false;
      }
      if (warehouseStatusFilters.length > 0) {
        const stStr = String(w.isActive);
        if (!warehouseStatusFilters.includes(stStr)) return false;
      }
      return true;
    });
  }, [warehouses, warehouseSearch, warehouseTypeFilters, warehouseStatusFilters]);

  // Lọc dữ liệu Tồn Kho
  const filteredStocks = React.useMemo(() => {
    return stocks.filter((s) => {
      if (stockSearch.trim()) {
        const q = stockSearch.toLowerCase().trim();
        const match =
          s.itemCode.toLowerCase().includes(q) ||
          s.itemName.toLowerCase().includes(q) ||
          s.lotCode.toLowerCase().includes(q) ||
          s.warehouseCode.toLowerCase().includes(q) ||
          s.warehouseName.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (stockWhFilters.length > 0 && !stockWhFilters.includes(s.warehouseCode)) {
        return false;
      }
      if (stockStatusFilters.length > 0 && !stockStatusFilters.includes(s.stockStatus)) {
        return false;
      }
      if (stockLotFilters.length > 0 && !stockLotFilters.includes(s.lotKind)) {
        return false;
      }
      return true;
    });
  }, [stocks, stockSearch, stockWhFilters, stockStatusFilters, stockLotFilters]);

  // StatBar cho Tab Kho
  const warehouseStats = React.useMemo<StatItem[]>(() => {
    const activeCount = warehouses.filter((w) => w.isActive).length;
    const totalSku = warehouses.reduce((acc, w) => acc + (w.totalSku || 0), 0);
    const totalVal = warehouses.reduce((acc, w) => acc + (w.totalValue || 0), 0);

    const stats: StatItem[] = [
      { label: "Tổng số điểm kho", value: warehouses.length.toString() },
      { label: "Đang hoạt động", value: activeCount.toString(), color: "emerald" },
      { label: "Tổng SKU tồn", value: formatNumber(totalSku) },
    ];
    if (canViewCost) {
      stats.push({ label: "Tổng giá trị tồn", value: formatMoney(totalVal) });
    }
    return stats;
  }, [warehouses, canViewCost]);

  // StatBar cho Tab Tồn Kho
  const stockStats = React.useMemo<StatItem[]>(() => {
    const normalCount = stocks.filter((s) => s.stockStatus === "normal").length;
    const lowCount = stocks.filter((s) => s.stockStatus === "low_stock").length;
    const outCount = stocks.filter((s) => s.stockStatus === "out_of_stock").length;
    const totalVal = stocks.reduce((acc, s) => acc + (s.inventoryValue || 0), 0);

    const stats: StatItem[] = [
      { label: "Số lượng mặt hàng", value: stocks.length.toString() },
      { label: "Tồn bình thường", value: normalCount.toString(), color: "emerald" },
      { label: "Dưới định mức", value: lowCount.toString(), color: lowCount > 0 ? "amber" : "neutral" },
      { label: "Hết hàng", value: outCount.toString(), color: outCount > 0 ? "rose" : "neutral" },
    ];
    if (canViewCost) {
      stats.push({ label: "Tổng giá trị tồn", value: formatMoney(totalVal) });
    }
    return stats;
  }, [stocks, canViewCost]);

  // Cột bảng Điểm Kho
  const warehouseColumns = React.useMemo<DataTableColumn<WarehouseDto>[]>(() => {
    const cols: DataTableColumn<WarehouseDto>[] = [
      {
        id: "code",
        header: "Mã kho",
        accessorKey: "code",
        sortable: true,
        width: "w-32 min-w-[120px]",
        cell: (w) => (
          <span
            onClick={() => navigateTab("stocks", w.id)}
            className="font-mono text-xs font-bold text-slate-900 hover:text-blue-600 cursor-pointer block"
          >
            {w.code}
          </span>
        ),
      },
      {
        id: "name",
        header: "Tên điểm kho",
        accessorKey: "name",
        sortable: true,
        width: "min-w-[220px]",
        cell: (w) => (
          <div
            onClick={() => navigateTab("stocks", w.id)}
            className="flex items-center gap-2.5 cursor-pointer group py-0.5"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors block text-xs">
                {w.name}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Phân loại",
        accessorKey: "type",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (w) => {
          const info = WAREHOUSE_KINDS[w.type] || {
            label: w.type,
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
        id: "totalSku",
        header: "Tổng SKU",
        accessorKey: "totalSku",
        sortable: true,
        align: "right",
        width: "w-28 min-w-[100px]",
        cell: (w) => <span className="font-mono text-xs text-slate-700">{formatNumber(w.totalSku || 0)}</span>,
      },
      {
        id: "totalOnHand",
        header: "Tổng lượng tồn",
        accessorKey: "totalOnHand",
        sortable: true,
        align: "right",
        width: "w-32 min-w-[110px]",
        cell: (w) => (
          <span className="font-mono font-bold text-xs text-slate-900">
            {formatNumber(w.totalOnHand || 0)}
          </span>
        ),
      },
    ];

    if (canViewCost) {
      cols.push({
        id: "totalValue",
        header: "Giá trị tồn (₫)",
        accessorKey: "totalValue",
        sortable: true,
        align: "right",
        width: "w-36 min-w-[130px]",
        cell: (w) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {formatMoney(w.totalValue || 0)}
          </span>
        ),
      });
    }

    cols.push({
      id: "isActive",
      header: "Trạng thái",
      accessorKey: "isActive",
      sortable: true,
      width: "w-36 min-w-[120px]",
      cell: (w) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
            w.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${w.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
          />
          {w.isActive ? "Đang sử dụng" : "Ngừng sử dụng"}
        </span>
      ),
    });

    return cols;
  }, [canViewCost]);

  // Hành động dòng cho Điểm Kho
  const warehouseRowActions = React.useMemo<DataTableRowAction<WarehouseDto>[]>(() => {
    const actions: DataTableRowAction<WarehouseDto>[] = [];
    if (canReadStock) {
      actions.push({
        title: "Xem chi tiết tồn",
        icon: <Package className="w-3.5 h-3.5" />,
        onClick: (w) => navigateTab("stocks", w.id),
      });
    }
    if (canManage) {
      actions.push({
        title: "Chỉnh sửa kho",
        icon: <Pencil className="w-3.5 h-3.5" />,
        onClick: (w) => handleOpenEdit(w),
      });
      actions.push({
        title: "Xóa điểm kho",
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        onClick: (w) => setDeleting(w),
      });
    }
    return actions;
  }, [canReadStock, canManage]);

  // Bộ lọc Facet cho Điểm Kho
  const warehouseFacetFilters = React.useMemo<DataTableFacetFilterConfig[]>(() => [
    {
      id: "type",
      title: "Loại kho",
      options: Object.entries(WAREHOUSE_KINDS).map(([key, info]) => ({
        label: info.label,
        value: key,
      })),
      selectedValues: warehouseTypeFilters,
      onChange: setWarehouseTypeFilters,
    },
    {
      id: "isActive",
      title: "Trạng thái",
      options: [
        { label: "Đang sử dụng", value: "true" },
        { label: "Ngừng sử dụng", value: "false" },
      ],
      selectedValues: warehouseStatusFilters,
      onChange: setWarehouseStatusFilters,
    },
  ], [warehouseTypeFilters, warehouseStatusFilters]);

  // Cột bảng Tồn Kho Chi Tiết
  const stockColumns = React.useMemo<DataTableColumn<StockBalanceDto>[]>(() => {
    const cols: DataTableColumn<StockBalanceDto>[] = [
      {
        id: "warehouseCode",
        header: "Kho",
        accessorKey: "warehouseCode",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (s) => (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[120px]" title={`${s.warehouseCode} · ${s.warehouseName}`}>
            {s.warehouseCode} · {s.warehouseName}
          </span>
        ),
      },
      {
        id: "itemCode",
        header: "Mã SKU",
        accessorKey: "itemCode",
        sortable: true,
        width: "w-32 min-w-[120px]",
        cell: (s) => (
          <span className="font-mono text-xs font-bold text-slate-900 block">
            {s.itemCode}
          </span>
        ),
      },
      {
        id: "itemName",
        header: "Vật tư & Quy cách",
        accessorKey: "itemName",
        sortable: true,
        width: "min-w-[220px]",
        cell: (s) => (
          <div className="py-0.5">
            <span className="font-semibold text-slate-900 block text-xs truncate max-w-[260px]" title={s.itemName}>
              {s.itemName}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
              <span className="font-mono font-medium text-slate-500">{s.lotCode}</span>
              <span>·</span>
              <span>{LOT_KINDS[s.lotKind] || s.lotKind}</span>
              {s.lengthMm && s.widthMm ? (
                <>
                  <span>·</span>
                  <span className="text-blue-600 font-medium">
                    {formatNumber(s.lengthMm)} × {formatNumber(s.widthMm)} mm
                  </span>
                </>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "unitName",
        header: "ĐVT",
        accessorKey: "unitName",
        width: "w-20 min-w-[70px]",
        cell: (s) => <span className="text-xs text-slate-600 font-medium">{s.unitName}</span>,
      },
      {
        id: "onHandQty",
        header: "Tồn thực tế",
        accessorKey: "onHandQty",
        sortable: true,
        align: "right",
        width: "w-28 min-w-[100px]",
        cell: (s) => (
          <span className="font-mono font-bold text-xs text-slate-900">
            {formatNumber(s.onHandQty)}
          </span>
        ),
      },
      {
        id: "reservedQty",
        header: "Giữ chỗ",
        accessorKey: "reservedQty",
        sortable: true,
        align: "right",
        width: "w-24 min-w-[85px]",
        cell: (s) => (
          <span className="font-mono text-xs text-slate-500">
            {formatNumber(s.reservedQty)}
          </span>
        ),
      },
      {
        id: "availableQty",
        header: "Khả dụng",
        accessorKey: "availableQty",
        sortable: true,
        align: "right",
        width: "w-28 min-w-[100px]",
        cell: (s) => (
          <span className="font-mono font-bold text-xs text-emerald-700">
            {formatNumber(s.availableQty)}
          </span>
        ),
      },
      {
        id: "binLabel",
        header: "Vị trí kệ",
        accessorKey: "binLabel",
        width: "w-28 min-w-[90px]",
        cell: (s) => (
          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200">
            {s.binLabel || "—"}
          </span>
        ),
      },
      {
        id: "stockStatus",
        header: "Tình trạng",
        accessorKey: "stockStatus",
        sortable: true,
        width: "w-32 min-w-[120px]",
        cell: (s) => {
          const info = STOCK_STATUS_CONFIG[s.stockStatus] || {
            label: s.stockStatus,
            badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
            icon: null,
          };
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${info.badgeClass}`}
            >
              {info.icon}
              {info.label}
            </span>
          );
        },
      },
    ];

    if (canViewCost) {
      cols.push({
        id: "inventoryValue",
        header: "Giá trị tồn (₫)",
        accessorKey: "inventoryValue",
        sortable: true,
        align: "right",
        width: "w-36 min-w-[130px]",
        cell: (s) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {formatMoney(s.inventoryValue)}
          </span>
        ),
      });
    }

    return cols;
  }, [canViewCost]);

  // Bộ lọc Facet cho Tồn Kho
  const stockFacetFilters = React.useMemo<DataTableFacetFilterConfig[]>(() => [
    {
      id: "warehouseCode",
      title: "Điểm kho",
      options: warehouses.map((w) => ({
        label: `${w.code} - ${w.name}`,
        value: w.code,
      })),
      selectedValues: stockWhFilters,
      onChange: setStockWhFilters,
    },
    {
      id: "stockStatus",
      title: "Tình trạng tồn",
      options: [
        { label: "Bình thường", value: "normal" },
        { label: "Dưới định mức", value: "low_stock" },
        { label: "Hết hàng", value: "out_of_stock" },
      ],
      selectedValues: stockStatusFilters,
      onChange: setStockStatusFilters,
    },
    {
      id: "lotKind",
      title: "Loại lô",
      options: [
        { label: "Tiêu chuẩn", value: "standard" },
        { label: "Tấm lẻ", value: "remnant" },
        { label: "Phế liệu", value: "scrap" },
      ],
      selectedValues: stockLotFilters,
      onChange: setStockLotFilters,
    },
  ], [warehouses, stockWhFilters, stockStatusFilters, stockLotFilters]);

  return (
    <div className="w-full flex flex-col space-y-3 flex-1">
      {/* 1. Sub-Tabs ngang chuẩn Enterprise */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => navigateTab("stocks")}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
              tab === "stocks"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Bảng Theo Dõi Tồn Kho ({stocks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab("warehouses")}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
              tab === "warehouses"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>Danh Sách Điểm Kho ({warehouses.length})</span>
          </button>
        </div>

        {tab === "stocks" && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-slate-500 font-medium">Lọc theo kho:</span>
            <select
              value={warehouseId}
              onChange={(e) => navigateTab("stocks", e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="all">Tất cả các kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.name} {w.isActive ? "" : "(ngừng sử dụng)"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Nội dung Tab 1: Bảng Theo Dõi Tồn Kho */}
      {tab === "stocks" && (
        canReadStock ? (
          <DataTable<StockBalanceDto>
            data={filteredStocks}
            columns={stockColumns}
            keyExtractor={(s: StockBalanceDto) => s.balanceId}
            searchable
            searchPlaceholder="Tìm kiếm theo mã SKU, tên vật tư, số lô, kho..."
            searchValue={stockSearch}
            onSearchChange={setStockSearch}
            filters={stockFacetFilters}
            onResetFilters={() => {
              setStockWhFilters([]);
              setStockStatusFilters([]);
              setStockLotFilters([]);
              setStockSearch("");
            }}
            stats={stockStats}
            defaultShowStats={false}
            exportFileName="ton-kho-chi-tiet"
            isLoading={loadingStocks}
            onRefresh={() => setRevision((r) => r + 1)}
            primaryAction={
              <Link href="/kho/nhap-xuat">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo phiếu kho</span>
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Bạn chưa được phân quyền xem số dư tồn kho.</p>
          </div>
        )
      )}

      {/* 3. Nội dung Tab 2: Danh Sách Điểm Kho */}
      {tab === "warehouses" && (
        <DataTable<WarehouseDto>
          data={filteredWarehouses}
          columns={warehouseColumns}
          rowActions={warehouseRowActions}
          keyExtractor={(w: WarehouseDto) => w.id}
          searchable
          searchPlaceholder="Tìm kiếm kho theo mã, tên..."
          searchValue={warehouseSearch}
          onSearchChange={setWarehouseSearch}
          filters={warehouseFacetFilters}
          onResetFilters={() => {
            setWarehouseTypeFilters([]);
            setWarehouseStatusFilters([]);
            setWarehouseSearch("");
          }}
          stats={warehouseStats}
          defaultShowStats={false}
          exportFileName="danh-sach-kho"
          onRowClick={(w: WarehouseDto) => navigateTab("stocks", w.id)}
          isLoading={loadingWarehouses}
          onRefresh={() => setRevision((r) => r + 1)}
          primaryAction={
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenEdit()}
              className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm kho mới</span>
            </Button>
          }
        />
      )}

      {/* MODAL: THÊM / CHỈNH SỬA KHO */}
      <Modal
        isOpen={!!editor}
        onClose={() => {
          if (!saving) setEditor(null);
        }}
        title={editor?.id ? "Chỉnh sửa thông tin kho" : "Thêm điểm kho mới"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveWarehouse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã kho <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={50}
              placeholder="VD: KHO-X01, KHO-XE01..."
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên điểm kho <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="VD: Kho Tổng Xưởng Cơ Khí, Kho Xe Tải 29A..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phân loại kho <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as WarehouseDto["type"] })
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {Object.entries(WAREHOUSE_KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái vận hành</label>
            <select
              value={String(form.isActive)}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="true">Đang sử dụng</option>
              <option value="false">Ngừng sử dụng</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Kho chỉ được ngừng sử dụng khi đã xuất hết tồn kho và không còn phiếu chờ duyệt.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setEditor(null)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              {editor?.id ? "Lưu thay đổi" : "Tạo điểm kho"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: XÁC NHẬN XÓA KHO */}
      <Modal
        isOpen={!!deleting}
        onClose={() => {
          if (!saving) setDeleting(null);
        }}
        title="Xác nhận xóa điểm kho"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Bạn có chắc chắn muốn xóa kho <strong>{deleting?.name}</strong> (
            <span className="font-mono">{deleting?.code}</span>)?
          </p>
          <p className="text-[11px] text-slate-400">
            Hệ thống chỉ cho phép xóa kho chưa phát sinh giao dịch nhập xuất nào. Nếu đã có dữ liệu, vui lòng chuyển trạng thái sang &quot;Ngừng sử dụng&quot;.
          </p>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={saving}
              onClick={handleDeleteWarehouse}
            >
              Xóa kho
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function WarehousesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Đang nạp dữ liệu kho...
        </div>
      }
    >
      <WarehousesContent />
    </React.Suspense>
  );
}
