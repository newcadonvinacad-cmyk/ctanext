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
  Scissors,
  ClipboardList,
  RotateCw,
  Check,
  ExternalLink,
  FileText,
  Sparkles,
  Calendar,
  Eye,
  FileSpreadsheet,
  Download,
  Upload,
} from "lucide-react";
import { Button, Modal, Drawer, Badge, toast, type StatItem } from "@/components/ui";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
  type DataTableFacetFilterConfig,
} from "@/components/shared/DataTable";
import { useAuthorization } from "@/hooks/use-authorization";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { CreateStockDocModal } from "@/components/inventory/CreateStockDocModal";
import { StockImportModal } from "@/components/inventory/StockImportModal";
import { exportWarehouseStocksToExcel } from "@/lib/inventory-excel";
import type {
  WarehouseDto,
  StockBalanceDto,
  RemnantDto,
  InventoryCountDto,
  InventoryCountLineDto,
} from "@/services/inventory.service";

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

  const tabParam = searchParams.get("tab");
  const tab: "stocks" | "warehouses" | "remnants" | "counts" =
    tabParam === "warehouses" || tabParam === "remnants" || tabParam === "counts"
      ? tabParam
      : "stocks";
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

  // State & Bộ lọc cho Kho Tấm Lẻ & Tận Dụng (Remnants)
  const [remnants, setRemnants] = React.useState<RemnantDto[]>([]);
  const [loadingRemnants, setLoadingRemnants] = React.useState(false);
  const [remnantSearch, setRemnantSearch] = React.useState("");
  const [remnantWhFilters, setRemnantWhFilters] = React.useState<string[]>([]);
  const [remnantKindFilters, setRemnantKindFilters] = React.useState<string[]>([]);
  const [cutRemnantItem, setCutRemnantItem] = React.useState<RemnantDto | null>(null);
  const [cutLength, setCutLength] = React.useState("");
  const [cutWidth, setCutWidth] = React.useState("");
  const [cutProjectId, setCutProjectId] = React.useState("");
  const [isCutting, setIsCutting] = React.useState(false);
  const [projectsList, setProjectsList] = React.useState<Array<{ id: string; code: string; name: string }>>([]);

  // State & Bộ lọc cho Phiếu Kiểm Kê & Cân Đối Kho (Counts)
  const [counts, setCounts] = React.useState<InventoryCountDto[]>([]);
  const [loadingCounts, setLoadingCounts] = React.useState(false);
  const [countSearch, setCountSearch] = React.useState("");
  const [countStatusFilters, setCountStatusFilters] = React.useState<string[]>([]);
  const [selectedCount, setSelectedCount] = React.useState<InventoryCountDto | null>(null);
  const [loadingCountDetail, setLoadingCountDetail] = React.useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = React.useState(false);
  const [countModalWarehouseId, setCountModalWarehouseId] = React.useState("");
  const [countLines, setCountLines] = React.useState<
    Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      unitName: string;
      lotId: string;
      lotCode: string;
      lotKind: string;
      expectedQty: number;
      actualQty: number;
    }>
  >([]);
  const [loadingWarehouseStocks, setLoadingWarehouseStocks] = React.useState(false);
  const [submittingCount, setSubmittingCount] = React.useState(false);
  const [completingCount, setCompletingCount] = React.useState(false);

  // Modal tạo / sửa kho
  const [editor, setEditor] = React.useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = React.useState<WarehouseDto | null>(null);
  const [isStockDocModalOpen, setIsStockDocModalOpen] = React.useState(false);
  const [isImportStockModalOpen, setIsImportStockModalOpen] = React.useState(false);
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

  // Thiết lập tiêu đề TopBar
  useSetPageHeader(
    {
      title: "Quản Trị Kho & Tồn Kho",
      subtitle: "Hệ thống đa điểm kho, số dư thực tế, quản lý tấm lẻ & kiểm kê tự động",
      quickViews: [
        { label: "Bảng theo dõi tồn kho", href: "/kho?tab=stocks" },
        { label: "Kho tấm lẻ & Tận dụng", href: "/kho?tab=remnants" },
        { label: "Kiểm kê & Cân đối kho", href: "/kho?tab=counts" },
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

  // Tải danh sách tấm lẻ Alu & Mica dở
  React.useEffect(() => {
    if (tab !== "remnants" || !canReadStock) return;
    let active = true;
    setLoadingRemnants(true);
    fetch("/api/inventory/remnants")
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách tấm lẻ");
        return res.json();
      })
      .then((data) => {
        if (active) setRemnants(data.remnants || []);
      })
      .catch((err) => {
        if (active) {
          setRemnants([]);
          toast.error(err.message || "Lỗi tải kho tấm lẻ");
        }
      })
      .finally(() => {
        if (active) setLoadingRemnants(false);
      });

    return () => {
      active = false;
    };
  }, [tab, revision, canReadStock]);

  // Tải danh sách phiếu kiểm kê
  React.useEffect(() => {
    if (tab !== "counts" || !canReadStock) return;
    let active = true;
    setLoadingCounts(true);
    const q = warehouseId !== "all" ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";
    fetch(`/api/inventory/counts${q}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải danh sách phiếu kiểm kê");
        return res.json();
      })
      .then((data) => {
        if (active) setCounts(data.counts || []);
      })
      .catch((err) => {
        if (active) {
          setCounts([]);
          toast.error(err.message || "Lỗi tải kiểm kê");
        }
      })
      .finally(() => {
        if (active) setLoadingCounts(false);
      });

    return () => {
      active = false;
    };
  }, [tab, warehouseId, revision, canReadStock]);

  // Tải danh sách dự án cho modal cắt tấm lẻ
  React.useEffect(() => {
    if (!cutRemnantItem && !isCountModalOpen) return;
    if (projectsList.length > 0) return;
    fetch("/api/projects?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.items)) {
          setProjectsList(data.items.map((p: any) => ({ id: p.id, code: p.code, name: p.name })));
        }
      })
      .catch(() => {});
  }, [cutRemnantItem, isCountModalOpen, projectsList.length]);

  // Handler: Chọn kho kiểm kê & nạp vật tư
  const handleSelectCountWarehouse = async (whId: string) => {
    setCountModalWarehouseId(whId);
    if (!whId) {
      setCountLines([]);
      return;
    }
    setLoadingWarehouseStocks(true);
    try {
      const res = await fetch(`/api/inventory/warehouses/${whId}/stocks`);
      if (!res.ok) throw new Error("Không thể tải danh sách vật tư kho");
      const data = await res.json();
      const stList: StockBalanceDto[] = data.stocks || [];
      setCountLines(
        stList.map((s) => ({
          itemId: s.itemId,
          itemCode: s.itemCode,
          itemName: s.itemName,
          unitName: s.unitName,
          lotId: s.lotId,
          lotCode: s.lotCode,
          lotKind: s.lotKind,
          expectedQty: s.onHandQty,
          actualQty: s.onHandQty,
        }))
      );
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải số dư kho");
      setCountLines([]);
    } finally {
      setLoadingWarehouseStocks(false);
    }
  };

  // Handler: Lưu phiếu kiểm kê mới
  const handleSaveInventoryCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countModalWarehouseId) {
      toast.error("Vui lòng chọn điểm kho cần kiểm kê");
      return;
    }
    if (countLines.length === 0) {
      toast.error("Kho này chưa có mặt hàng nào để kiểm kê");
      return;
    }
    setSubmittingCount(true);
    try {
      const res = await fetch("/api/inventory/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: countModalWarehouseId,
          lines: countLines.map((l) => ({
            itemId: l.itemId,
            lotId: l.lotId,
            expectedQty: l.expectedQty,
            actualQty: Number(l.actualQty) || 0,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể tạo phiếu kiểm kê");
      }

      const data = await res.json();
      toast.success(`Đã tạo phiếu kiểm kê ${data.count?.code || ""}`);
      setIsCountModalOpen(false);
      setCountLines([]);
      setCountModalWarehouseId("");
      setRevision((r) => r + 1);
      if (data.count) {
        setSelectedCount(data.count);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo phiếu kiểm kê");
    } finally {
      setSubmittingCount(false);
    }
  };

  // Handler: Mở drawer xem chi tiết phiếu kiểm kê
  const handleOpenCountDetail = async (c: InventoryCountDto) => {
    setSelectedCount(c);
    setLoadingCountDetail(true);
    try {
      const res = await fetch(`/api/inventory/counts/${c.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.count) setSelectedCount(data.count);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCountDetail(false);
    }
  };

  // Handler: Chốt kiểm kê & Cân đối kho tự động
  const handleCompleteCount = async (countId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn chốt kiểm kê? Hệ thống sẽ tự động sinh phiếu điều chỉnh (Adjustment) để cân đối kho thực tế khớp với số liệu đếm."
      )
    ) {
      return;
    }
    setCompletingCount(true);
    try {
      const res = await fetch(`/api/inventory/counts/${countId}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể chốt kiểm kê");
      }
      toast.success("Đã chốt kiểm kê và tự động cân đối tồn kho thành công!");
      setRevision((r) => r + 1);
      const detailRes = await fetch(`/api/inventory/counts/${countId}`);
      if (detailRes.ok) {
        const d = await detailRes.json();
        if (d.count) setSelectedCount(d.count);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi chốt kiểm kê");
    } finally {
      setCompletingCount(false);
    }
  };

  // Handler: Mở modal cắt tấm lẻ
  const handleOpenCutModal = (rem: RemnantDto) => {
    setCutRemnantItem(rem);
    setCutLength("");
    setCutWidth("");
    setCutProjectId("");
  };

  // Handler: Thực hiện cắt tấm lẻ
  const handleCutRemnant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cutRemnantItem) return;
    const l = parseFloat(cutLength);
    const w = parseFloat(cutWidth);
    if (!l || l <= 0 || !w || w <= 0) {
      toast.error("Vui lòng nhập kích thước cắt dài và rộng hợp lệ (mm)");
      return;
    }
    if (l > cutRemnantItem.lengthMm || w > cutRemnantItem.widthMm) {
      toast.error(
        `Kích thước cắt (${l}×${w}mm) không được lớn hơn kích thước phôi (${cutRemnantItem.lengthMm}×${cutRemnantItem.widthMm}mm)`
      );
      return;
    }

    setIsCutting(true);
    try {
      const res = await fetch("/api/inventory/remnants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRemnantId: cutRemnantItem.lotId,
          cutLengthMm: l,
          cutWidthMm: w,
          projectId: cutProjectId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể thực hiện cắt tấm lẻ");
      }

      toast.success(
        `Đã cắt thành công! Mảnh cắt: ${l}×${w}mm. Mảnh thừa đã được ghi nhận tự động vào kho tấm lẻ.`
      );
      setCutRemnantItem(null);
      setRevision((r) => r + 1);
    } catch (err: any) {
      toast.error(err.message || "Lỗi cắt tấm lẻ");
    } finally {
      setIsCutting(false);
    }
  };

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

  // ==========================================
  // BỘ LỌC & CỘT CHO KHO TẤM LẺ & TẬN DỤNG
  // ==========================================
  const filteredRemnants = React.useMemo(() => {
    return remnants.filter((r) => {
      if (remnantSearch.trim()) {
        const q = remnantSearch.toLowerCase().trim();
        const match =
          r.itemCode.toLowerCase().includes(q) ||
          r.itemName.toLowerCase().includes(q) ||
          r.lotCode.toLowerCase().includes(q) ||
          r.warehouseName.toLowerCase().includes(q) ||
          r.binLabel.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (remnantWhFilters.length > 0 && !remnantWhFilters.includes(r.warehouseId)) {
        return false;
      }
      if (remnantKindFilters.length > 0 && !remnantKindFilters.includes(r.kind)) {
        return false;
      }
      return true;
    });
  }, [remnants, remnantSearch, remnantWhFilters, remnantKindFilters]);

  const remnantStats = React.useMemo<StatItem[]>(() => {
    const totalCount = remnants.length;
    const remnantCount = remnants.filter((r) => r.kind === "remnant").length;
    const scrapCount = remnants.filter((r) => r.kind === "scrap").length;
    const totalArea = remnants.reduce((acc, r) => acc + (r.areaM2 || 0), 0);
    const totalVal = remnants.reduce((acc, r) => acc + (r.inventoryValue || 0), 0);

    const stats: StatItem[] = [
      { label: "Tổng số phôi thừa", value: totalCount.toString() },
      { label: "Tấm lẻ sử dụng được", value: remnantCount.toString(), color: "emerald" },
      { label: "Phế liệu dở vụn", value: scrapCount.toString(), color: "amber" },
      { label: "Tổng diện tích phôi", value: `${totalArea.toFixed(2)} m²` },
    ];
    if (canViewCost) {
      stats.push({ label: "Tổng giá trị phôi", value: formatMoney(totalVal) });
    }
    return stats;
  }, [remnants, canViewCost]);

  const remnantColumns = React.useMemo<DataTableColumn<RemnantDto>[]>(() => {
    const cols: DataTableColumn<RemnantDto>[] = [
      {
        id: "lotCode",
        header: "Mã lô phôi",
        accessorKey: "lotCode",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (r) => (
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {r.lotCode}
          </span>
        ),
      },
      {
        id: "itemName",
        header: "Vật tư & Chủng loại",
        accessorKey: "itemName",
        sortable: true,
        width: "min-w-[220px]",
        cell: (r) => (
          <div className="py-0.5">
            <span className="font-semibold text-slate-900 block text-xs truncate max-w-[260px]" title={r.itemName}>
              {r.itemName}
            </span>
            <span className="font-mono text-[10px] text-slate-400">{r.itemCode}</span>
          </div>
        ),
      },
      {
        id: "dimensions",
        header: "Kích thước phôi (Dài × Rộng)",
        accessorKey: "lengthMm",
        sortable: true,
        width: "w-48 min-w-[170px]",
        cell: (r) => (
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {formatNumber(r.lengthMm)} × {formatNumber(r.widthMm)} mm
          </span>
        ),
      },
      {
        id: "areaM2",
        header: "Diện tích",
        accessorKey: "areaM2",
        sortable: true,
        align: "right",
        width: "w-28 min-w-[100px]",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {r.areaM2} m²
          </span>
        ),
      },
      {
        id: "onHandQty",
        header: "Số tấm",
        accessorKey: "onHandQty",
        sortable: true,
        align: "right",
        width: "w-24 min-w-[80px]",
        cell: (r) => (
          <span className="font-mono text-xs font-bold text-slate-900">
            {formatNumber(r.onHandQty)}
          </span>
        ),
      },
      {
        id: "warehouseName",
        header: "Kho & Vị trí kệ",
        accessorKey: "warehouseName",
        sortable: true,
        width: "w-44 min-w-[150px]",
        cell: (r) => (
          <div>
            <span className="text-xs text-slate-800 font-medium block truncate max-w-[150px]">{r.warehouseName}</span>
            <span className="text-[10px] font-mono text-slate-400">{r.binLabel}</span>
          </div>
        ),
      },
      {
        id: "kind",
        header: "Phân loại",
        accessorKey: "kind",
        sortable: true,
        width: "w-28 min-w-[100px]",
        cell: (r) => (
          <span
            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
              r.kind === "remnant"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {r.kind === "remnant" ? "Tấm lẻ" : "Phế liệu"}
          </span>
        ),
      },
    ];

    if (canViewCost) {
      cols.push({
        id: "inventoryValue",
        header: "Giá trị (₫)",
        accessorKey: "inventoryValue",
        sortable: true,
        align: "right",
        width: "w-32 min-w-[110px]",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {formatMoney(r.inventoryValue)}
          </span>
        ),
      });
    }

    return cols;
  }, [canViewCost]);

  const remnantRowActions = React.useMemo<DataTableRowAction<RemnantDto>[]>(() => {
    return [
      {
        title: "Cắt tấm lẻ & Tận dụng",
        icon: <Scissors className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (r) => handleOpenCutModal(r),
      },
    ];
  }, []);

  const remnantFacetFilters = React.useMemo<DataTableFacetFilterConfig[]>(() => [
    {
      id: "warehouseId",
      title: "Điểm kho",
      options: warehouses.map((w) => ({
        label: `${w.code} - ${w.name}`,
        value: w.id,
      })),
      selectedValues: remnantWhFilters,
      onChange: setRemnantWhFilters,
    },
    {
      id: "kind",
      title: "Phân loại phôi",
      options: [
        { label: "Tấm lẻ sử dụng được", value: "remnant" },
        { label: "Phế liệu", value: "scrap" },
      ],
      selectedValues: remnantKindFilters,
      onChange: setRemnantKindFilters,
    },
  ], [warehouses, remnantWhFilters, remnantKindFilters]);

  // ==========================================
  // BỘ LỌC & CỘT CHO PHIẾU KIỂM KÊ & CÂN ĐỐI KHO
  // ==========================================
  const filteredCounts = React.useMemo(() => {
    return counts.filter((c) => {
      if (countSearch.trim()) {
        const q = countSearch.toLowerCase().trim();
        const match =
          c.code.toLowerCase().includes(q) ||
          c.warehouseName.toLowerCase().includes(q) ||
          (c.warehouseCode && c.warehouseCode.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (countStatusFilters.length > 0 && !countStatusFilters.includes(c.status)) {
        return false;
      }
      return true;
    });
  }, [counts, countSearch, countStatusFilters]);

  const countStats = React.useMemo<StatItem[]>(() => {
    const totalCount = counts.length;
    const draftCount = counts.filter((c) => c.status === "draft").length;
    const completedCount = counts.filter((c) => c.status === "completed").length;
    const totalDiscrepancies = counts.reduce((acc, c) => acc + (c.discrepancyCount || 0), 0);

    return [
      { label: "Tổng số phiếu kiểm kê", value: totalCount.toString() },
      { label: "Đang kiểm kê (Nháp)", value: draftCount.toString(), color: draftCount > 0 ? "amber" : "neutral" },
      { label: "Đã chốt & Cân đối kho", value: completedCount.toString(), color: "emerald" },
      { label: "Mặt hàng lệch sổ sách", value: totalDiscrepancies.toString(), color: totalDiscrepancies > 0 ? "rose" : "neutral" },
    ];
  }, [counts]);

  const countColumns = React.useMemo<DataTableColumn<InventoryCountDto>[]>(() => {
    return [
      {
        id: "code",
        header: "Mã phiếu kiểm kê",
        accessorKey: "code",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (c) => (
          <span
            onClick={() => handleOpenCountDetail(c)}
            className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block"
          >
            {c.code}
          </span>
        ),
      },
      {
        id: "warehouseName",
        header: "Điểm kho kiểm kê",
        accessorKey: "warehouseName",
        sortable: true,
        width: "w-48 min-w-[180px]",
        cell: (c) => (
          <div className="flex items-center gap-2">
            <Warehouse className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900 text-xs">{c.warehouseName}</span>
          </div>
        ),
      },
      {
        id: "countedAt",
        header: "Ngày kiểm kê",
        accessorKey: "countedAt",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (c) => (
          <span className="text-xs text-slate-600 font-mono">
            {c.countedAt || c.createdAt
              ? new Date(c.countedAt || c.createdAt).toLocaleDateString("vi-VN")
              : "—"}
          </span>
        ),
      },
      {
        id: "linesCount",
        header: "Số mặt hàng",
        accessorKey: "linesCount",
        sortable: true,
        align: "right",
        width: "w-28 min-w-[100px]",
        cell: (c) => (
          <span className="font-mono text-xs font-medium text-slate-700">
            {formatNumber(c.linesCount || 0)}
          </span>
        ),
      },
      {
        id: "discrepancyCount",
        header: "Lệch sổ sách",
        accessorKey: "discrepancyCount",
        sortable: true,
        align: "right",
        width: "w-32 min-w-[110px]",
        cell: (c) => {
          const count = c.discrepancyCount || 0;
          return count > 0 ? (
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {count} mặt hàng
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Khớp 100%
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Trạng thái",
        accessorKey: "status",
        sortable: true,
        width: "w-36 min-w-[130px]",
        cell: (c) => {
          if (c.status === "completed") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đã cân đối kho
              </span>
            );
          }
          if (c.status === "draft") {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Đang kiểm kê
              </span>
            );
          }
          return (
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {c.status}
            </span>
          );
        },
      },
    ];
  }, []);

  const countRowActions = React.useMemo<DataTableRowAction<InventoryCountDto>[]>(() => {
    return [
      {
        title: "Xem chi tiết & Cân đối kho",
        icon: <ClipboardList className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (c) => handleOpenCountDetail(c),
      },
    ];
  }, []);

  const countFacetFilters = React.useMemo<DataTableFacetFilterConfig[]>(() => [
    {
      id: "status",
      title: "Trạng thái",
      options: [
        { label: "Đang kiểm kê (Nháp)", value: "draft" },
        { label: "Đã cân đối kho", value: "completed" },
        { label: "Đã hủy", value: "cancelled" },
      ],
      selectedValues: countStatusFilters,
      onChange: setCountStatusFilters,
    },
  ], [countStatusFilters]);

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
            onClick={() => navigateTab("remnants")}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
              tab === "remnants"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Kho Tấm Lẻ & Tận Dụng ({remnants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab("counts")}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition ${
              tab === "counts"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Kiểm Kê & Cân Đối Kho ({counts.length})</span>
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

        {(tab === "stocks" || tab === "counts") && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-slate-500 font-medium">Lọc theo kho:</span>
            <select
              value={warehouseId}
              onChange={(e) => navigateTab(tab, e.target.value)}
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
            onExport={() =>
              exportWarehouseStocksToExcel({
                stocks: filteredStocks,
                warehouses,
                selectedWarehouseId: warehouseId,
                canViewCost,
              })
            }
            onImport={() => setIsImportStockModalOpen(true)}
            isLoading={loadingStocks}
            onRefresh={() => setRevision((r) => r + 1)}
            primaryAction={
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsStockDocModalOpen(true)}
                className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo phiếu kho</span>
              </Button>
            }
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Bạn chưa được phân quyền xem số dư tồn kho.</p>
          </div>
        )
      )}

      {/* 3. Nội dung Tab 2: Kho Tấm Lẻ & Tận Dụng (Remnants) */}
      {tab === "remnants" && (
        canReadStock ? (
          <DataTable<RemnantDto>
            data={filteredRemnants}
            columns={remnantColumns}
            rowActions={remnantRowActions}
            keyExtractor={(r: RemnantDto) => r.lotId}
            searchable
            searchPlaceholder="Tìm kiếm phôi tấm lẻ theo mã lô, tên vật tư, kho, kệ..."
            searchValue={remnantSearch}
            onSearchChange={setRemnantSearch}
            filters={remnantFacetFilters}
            onResetFilters={() => {
              setRemnantWhFilters([]);
              setRemnantKindFilters([]);
              setRemnantSearch("");
            }}
            stats={remnantStats}
            defaultShowStats={true}
            exportFileName="kho-tam-le-phoi-thua"
            isLoading={loadingRemnants}
            onRefresh={() => setRevision((r) => r + 1)}
            primaryAction={
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsStockDocModalOpen(true)}
                className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo phiếu kho</span>
              </Button>
            }
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Bạn chưa được phân quyền xem kho tấm lẻ.</p>
          </div>
        )
      )}

      {/* 4. Nội dung Tab 3: Phiếu Kiểm Kê & Cân Đối Kho (Counts) */}
      {tab === "counts" && (
        canReadStock ? (
          <DataTable<InventoryCountDto>
            data={filteredCounts}
            columns={countColumns}
            rowActions={countRowActions}
            keyExtractor={(c: InventoryCountDto) => c.id}
            searchable
            searchPlaceholder="Tìm kiếm phiếu kiểm kê theo mã, kho..."
            searchValue={countSearch}
            onSearchChange={setCountSearch}
            filters={countFacetFilters}
            onResetFilters={() => {
              setCountStatusFilters([]);
              setCountSearch("");
            }}
            stats={countStats}
            defaultShowStats={true}
            exportFileName="phieu-kiem-ke-kho"
            isLoading={loadingCounts}
            onRefresh={() => setRevision((r) => r + 1)}
            onRowClick={(c) => handleOpenCountDetail(c)}
            primaryAction={
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setCountModalWarehouseId(warehouseId !== "all" ? warehouseId : "");
                  if (warehouseId !== "all") {
                    handleSelectCountWarehouse(warehouseId);
                  }
                  setIsCountModalOpen(true);
                }}
                className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo phiếu kiểm kê</span>
              </Button>
            }
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Bạn chưa được phân quyền xem phiếu kiểm kê kho.</p>
          </div>
        )
      )}

      {/* 5. Nội dung Tab 4: Danh Sách Điểm Kho */}
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

      {/* MODAL TẠO PHIẾU KHO HIỆN ĐẠI */}
      <CreateStockDocModal
        isOpen={isStockDocModalOpen}
        onClose={() => setIsStockDocModalOpen(false)}
        onSuccess={() => setRevision((r) => r + 1)}
        canViewCost={canViewCost}
      />

      {/* MODAL: CẮT TẤM LẺ & TẬN DỤNG */}
      <Modal
        isOpen={!!cutRemnantItem}
        onClose={() => {
          if (!isCutting) setCutRemnantItem(null);
        }}
        title="Cắt tấm lẻ & Tận dụng cho công trình"
        maxWidth="lg"
      >
        {cutRemnantItem && (
          <form onSubmit={handleCutRemnant} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">{cutRemnantItem.itemName}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {cutRemnantItem.lotCode}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Kích thước hiện tại:</span>
                  <span className="font-semibold text-slate-900">
                    {formatNumber(cutRemnantItem.lengthMm)} × {formatNumber(cutRemnantItem.widthMm)} mm
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Diện tích phôi:</span>
                  <span className="font-semibold text-slate-900">{cutRemnantItem.areaM2} m²</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Điểm kho & Kệ:</span>
                  <span className="font-medium text-slate-900 truncate block">
                    {cutRemnantItem.warehouseName} ({cutRemnantItem.binLabel})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chiều dài cần cắt (mm) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={cutRemnantItem.lengthMm}
                  placeholder={`Tối đa ${cutRemnantItem.lengthMm} mm`}
                  value={cutLength}
                  onChange={(e) => setCutLength(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chiều rộng cần cắt (mm) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={cutRemnantItem.widthMm}
                  placeholder={`Tối đa ${cutRemnantItem.widthMm} mm`}
                  value={cutWidth}
                  onChange={(e) => setCutWidth(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            {cutLength && cutWidth && Number(cutLength) > 0 && Number(cutWidth) > 0 && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Phân rã tấm lẻ tự động:</span>
                </div>
                <p className="text-slate-700">
                  • <strong>Mảnh lấy ra thi công:</strong> {formatNumber(Number(cutLength))} × {formatNumber(Number(cutWidth))} mm (
                  {(((Number(cutLength) * Number(cutWidth)) / 1000000)).toFixed(3)} m²)
                </p>
                <p className="text-slate-700">
                  • <strong>Mảnh dư thừa còn lại:</strong> Tự động sinh lô tấm lẻ mới trong kho với diện tích còn lại (
                  {(cutRemnantItem.areaM2 - (Number(cutLength) * Number(cutWidth)) / 1000000).toFixed(3)} m²).
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sử dụng cho Dự án / Công trình (Tùy chọn)
              </label>
              <select
                value={cutProjectId}
                onChange={(e) => setCutProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">-- Không gán dự án (cắt chuẩn bị phôi sẵn) --</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isCutting}
                onClick={() => setCutRemnantItem(null)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isCutting}>
                <Scissors className="w-3.5 h-3.5 mr-1" />
                Xác nhận cắt & Tận dụng
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: TẠO PHIẾU KIỂM KÊ KHO */}
      <Modal
        isOpen={isCountModalOpen}
        onClose={() => {
          if (!submittingCount) {
            setIsCountModalOpen(false);
            setCountLines([]);
            setCountModalWarehouseId("");
          }
        }}
        title="Tạo Phiếu Kiểm Kê & Cân Đối Kho"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveInventoryCount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn điểm kho kiểm kê <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={countModalWarehouseId}
              onChange={(e) => handleSelectCountWarehouse(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">-- Vui lòng chọn kho để nạp danh sách vật tư --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.name} {w.isActive ? "" : "(ngừng sử dụng)"}
                </option>
              ))}
            </select>
          </div>

          {loadingWarehouseStocks && (
            <div className="py-8 text-center text-xs text-slate-400">
              Đang nạp danh sách tồn kho thực tế của điểm kho...
            </div>
          )}

          {!loadingWarehouseStocks && countModalWarehouseId && countLines.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Kho này hiện chưa có mặt hàng nào có số dư để kiểm kê.
            </div>
          )}

          {!loadingWarehouseStocks && countLines.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Danh sách vật tư kiểm đếm ({countLines.length} mặt hàng)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Nhập số lượng thực tế đếm được vào ô &quot;Thực đếm&quot;
                </span>
              </div>

              <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Mã & Vật tư</th>
                      <th className="px-2 py-2">Số lô</th>
                      <th className="px-2 py-2 text-right">Sổ sách</th>
                      <th className="px-3 py-2 text-right w-28">Thực đếm</th>
                      <th className="px-3 py-2 text-right">Lệch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {countLines.map((line, idx) => {
                      const diff = (Number(line.actualQty) || 0) - line.expectedQty;
                      return (
                        <tr key={`${line.lotId}-${idx}`} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2">
                            <span className="font-semibold text-slate-900 block truncate max-w-[200px]" title={line.itemName}>
                              {line.itemName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">{line.itemCode}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span className="font-mono text-[11px] text-slate-600">{line.lotCode}</span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-700">
                            {formatNumber(line.expectedQty)} <span className="text-[10px] text-slate-400">{line.unitName}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={line.actualQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setCountLines((prev) =>
                                  prev.map((pl, i) =>
                                    i === idx ? { ...pl, actualQty: isNaN(val) ? 0 : val } : pl
                                  )
                                );
                              }}
                              className="w-24 px-2 py-1 text-right font-mono text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">
                            {diff === 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-600">+{formatNumber(diff)}</span>
                            ) : (
                              <span className="text-rose-600">{formatNumber(diff)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={submittingCount}
              onClick={() => {
                setIsCountModalOpen(false);
                setCountLines([]);
                setCountModalWarehouseId("");
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submittingCount}
              disabled={countLines.length === 0}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1" />
              Tạo phiếu kiểm kê
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRAWER: CHI TIẾT PHIẾU KIỂM KÊ & CÂN ĐỐI KHO */}
      <Drawer
        isOpen={!!selectedCount}
        onClose={() => setSelectedCount(null)}
        title={`Phiếu Kiểm Kê: ${selectedCount?.code || ""}`}
        width="xl"
      >
        {selectedCount && (
          <div className="space-y-4 text-xs">
            {/* Header Info */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] block">Mã phiếu</span>
                  <span className="font-mono font-bold text-slate-900">{selectedCount.code}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Điểm kho</span>
                  <span className="font-semibold text-slate-900">{selectedCount.warehouseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Trạng thái</span>
                  {selectedCount.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Đã cân đối kho
                    </span>
                  ) : selectedCount.status === "draft" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> Đang kiểm kê (Nháp)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {selectedCount.status}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Ngày kiểm kê</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedCount.countedAt || selectedCount.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Banner if Draft */}
            {selectedCount.status === "draft" && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-900 block">Sẵn sàng chốt số liệu kiểm kê?</span>
                  <p className="text-[11px] text-blue-700">
                    Hệ thống sẽ tự động sinh phiếu điều chỉnh (Adjustment) và cập nhật số dư tồn kho khớp số thực tế.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={completingCount}
                  onClick={() => handleCompleteCount(selectedCount.id)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Chốt kiểm kê & Cân đối kho
                </Button>
              </div>
            )}

            {/* Lines Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                Chi tiết dòng kiểm kê ({selectedCount.lines?.length || 0} mặt hàng)
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">STT</th>
                    <th className="px-3 py-2">Mã SKU & Tên vật tư</th>
                    <th className="px-2 py-2">Số lô</th>
                    <th className="px-3 py-2 text-right">Sổ sách</th>
                    <th className="px-3 py-2 text-right">Thực đếm</th>
                    <th className="px-3 py-2 text-right">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCount.lines?.map((line, idx) => {
                    const diff = line.differenceQty;
                    return (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-slate-900 block">{line.itemName}</span>
                          <span className="font-mono text-[10px] text-slate-400">{line.itemCode}</span>
                        </td>
                        <td className="px-2 py-2 font-mono text-[11px] text-slate-600">{line.lotCode}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {formatNumber(line.expectedQtySnapshot)} <span className="text-[10px] text-slate-400">{line.unitName}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {formatNumber(line.actualQty)} <span className="text-[10px] text-slate-400">{line.unitName}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {diff === 0 ? (
                            <span className="text-slate-400">Khớp (0)</span>
                          ) : diff > 0 ? (
                            <span className="text-emerald-600">+{formatNumber(diff)}</span>
                          ) : (
                            <span className="text-rose-600">{formatNumber(diff)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL NHẬP TỒN KHO HÀNG LOẠT TỪ FILE EXCEL */}
      <StockImportModal
        isOpen={isImportStockModalOpen}
        onClose={() => setIsImportStockModalOpen(false)}
        warehouses={warehouses}
        defaultWarehouseId={warehouseId}
        onSuccess={() => setRevision((r) => r + 1)}
      />
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
