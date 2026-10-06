"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Button,
  Badge,
  Modal,
  Drawer,
  Tooltip,
  toast,
  StatItem,
} from "@/components/ui";
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  FileSpreadsheet,
  Receipt,
  CircleDollarSign,
  ChevronRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  Eye,
  Trash2,
  Edit2,
  CreditCard,
  ExternalLink,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from "lucide-react";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
  DataTableFacetFilterConfig,
} from "@/components/shared";
import {
  SupplierDto,
  SupplierPriceDto,
  PurchaseOrderDto,
  SupplierOpenItemDto,
  SupplierPaymentHistoryDto,
} from "@/services/procurement.service";
import { useSetPageHeader } from "@/contexts/page-header-context";

export default function SuppliersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [suppliers, setSuppliers] = React.useState<SupplierDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filters
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);

  // Drawer Profile State
  const [selectedSupplier, setSelectedSupplier] = React.useState<SupplierDto | null>(null);
  const [supplierDetails, setSupplierDetails] = React.useState<{
    prices: SupplierPriceDto[];
    purchaseOrders: PurchaseOrderDto[];
    openItems: SupplierOpenItemDto[];
    payments: SupplierPaymentHistoryDto[];
  } | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [profileTab, setProfileTab] = React.useState<"debts" | "orders" | "prices" | "info">("debts");

  // Ref chống vòng lặp đóng mở Drawer khi sync URL
  const openedCodeRef = React.useRef<string | null>(null);

  // Modal Create NCC State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    taxCode: "",
    phone: "",
    address: "",
    creditLimit: "50000000",
    paymentDays: "15",
  });

  // Modal Thanh Toán NCC (Theo tổng công nợ hoặc theo đơn hàng)
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [paymentMode, setPaymentMode] = React.useState<"TOTAL_DEBT" | "ORDER">("TOTAL_DEBT");
  const [targetPoId, setTargetPoId] = React.useState<string>("");
  const [paymentAmount, setPaymentAmount] = React.useState<string>("");
  const [paymentAccountId, setPaymentAccountId] = React.useState<string>("");
  const [paymentPurpose, setPaymentPurpose] = React.useState<string>("");
  const [paymentDate, setPaymentDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [paying, setPaying] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Array<{ id: string; name: string; kind: string; balance: number }>>([]);

  // Đồng bộ tiêu đề vào TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Nhà cung cấp",
      subtitle: "Danh sách",
      screenCode: "M05",
      quickViews: [
        { label: "Tất cả nhà cung cấp", href: "/nha-cung-cap" },
        { label: "Có công nợ phải trả", href: "/nha-cung-cap?tab=cong-no" },
        { label: "Bảng giá vật tư thỏa thuận", href: "/nha-cung-cap?tab=bang-gia" },
      ],
    },
    []
  );

  const fetchSuppliers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/procurement/suppliers");
      if (!res.ok) throw new Error("Không thể tải danh sách nhà cung cấp");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/finance/accounts");
      if (res.ok) {
        const data = await res.json();
        const accs = data.accounts || [];
        setAccounts(accs);
        if (accs.length > 0 && !paymentAccountId) {
          setPaymentAccountId(accs[0].id);
        }
      }
    } catch (e) {
      console.error("Lỗi tải tài khoản quỹ:", e);
    }
  }, [paymentAccountId]);

  React.useEffect(() => {
    fetchSuppliers();
    fetchAccounts();
  }, [fetchSuppliers, fetchAccounts]);

  // Deep-linking URL Sync
  const updateUrlParams = (supplierCode: string | null, tab: string = "debts") => {
    const params = new URLSearchParams(window.location.search);
    if (supplierCode) {
      params.set("ho-so", supplierCode);
      params.set("tab", tab);
      params.set("view", "drawer");
    } else {
      params.delete("ho-so");
      params.delete("tab");
      params.delete("view");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const loadSupplierDetails = React.useCallback(async (supplierId: string) => {
    try {
      setDrawerLoading(true);
      const res = await fetch(`/api/procurement/suppliers/${supplierId}`);
      if (!res.ok) throw new Error("Không thể tải hồ sơ chi tiết");
      const data = await res.json();
      if (data.supplier) {
        setSelectedSupplier(data.supplier);
      }
      setSupplierDetails({
        prices: data.prices || [],
        purchaseOrders: data.purchaseOrders || data.orders || [],
        openItems: data.openItems || [],
        payments: data.payments || [],
      });
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu chi tiết");
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handleOpenDrawer = React.useCallback(
    async (supplier: SupplierDto, initialTab: "debts" | "orders" | "prices" | "info" = "debts") => {
      setSelectedSupplier(supplier);
      setProfileTab(initialTab);
      openedCodeRef.current = supplier.code;
      updateUrlParams(supplier.code, initialTab);
      await loadSupplierDetails(supplier.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadSupplierDetails]
  );

  // Đóng Drawer triệt để - xóa query param và reset ref để không bị mở lại
  const handleCloseDrawer = () => {
    openedCodeRef.current = null;
    setSelectedSupplier(null);
    setSupplierDetails(null);
    updateUrlParams(null);
  };

  // Khôi phục Drawer khi mở trực tiếp URL deep-link
  React.useEffect(() => {
    const hoSoParam = searchParams.get("ho-so");
    const tabParam = (searchParams.get("tab") as any) || "debts";
    if (hoSoParam && hoSoParam !== openedCodeRef.current && suppliers.length > 0) {
      openedCodeRef.current = hoSoParam;
      const match = suppliers.find((s) => s.code === hoSoParam);
      if (match) {
        handleOpenDrawer(match, tabParam);
      }
    } else if (!hoSoParam) {
      openedCodeRef.current = null;
    }
  }, [searchParams, suppliers, handleOpenDrawer]);

  // Mở modal thanh toán theo tổng công nợ
  const handleOpenPaymentTotalDebt = (supplier: SupplierDto) => {
    setSelectedSupplier(supplier);
    setPaymentMode("TOTAL_DEBT");
    setTargetPoId("");
    setPaymentAmount(String(supplier.totalPayable > 0 ? supplier.totalPayable : ""));
    setPaymentPurpose(`Thanh toán công nợ nhà cung cấp ${supplier.name} (${supplier.code})`);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setIsPaymentOpen(true);
  };

  // Mở modal thanh toán theo đơn hàng cụ thể
  const handleOpenPaymentForOrder = (po: PurchaseOrderDto) => {
    if (!selectedSupplier) return;
    setPaymentMode("ORDER");
    setTargetPoId(po.id);

    // Tính số tiền còn nợ của đơn từ openItems nếu có
    const linkedOi = supplierDetails?.openItems.find((oi) => oi.purchaseOrderId === po.id);
    const amountToPay = linkedOi ? linkedOi.remainingAmount : po.total;

    setPaymentAmount(String(amountToPay > 0 ? amountToPay : po.total));
    setPaymentPurpose(`Thanh toán đơn mua hàng ${po.code} - NCC ${selectedSupplier.name}`);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setIsPaymentOpen(true);
  };

  // Xử lý gửi phiếu chi thanh toán
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0");
      return;
    }

    if (!paymentAccountId) {
      toast.error("Vui lòng chọn tài khoản / quỹ chi tiền");
      return;
    }

    try {
      setPaying(true);

      // Xác định danh sách open items gạch nợ
      let targetOpenItemIds: string[] = [];
      let allocations: Array<{ openItemId: string; amount: number }> | undefined = undefined;

      if (paymentMode === "ORDER" && targetPoId) {
        const oi = supplierDetails?.openItems.find((item) => item.purchaseOrderId === targetPoId);
        if (oi) {
          targetOpenItemIds = [oi.id];
          allocations = [{ openItemId: oi.id, amount: amountNum }];
        }
      } else {
        // Mode TOTAL_DEBT: gạch nợ cho các đơn còn nợ theo thứ tự đến hạn
        const validOpenItems = (supplierDetails?.openItems || []).filter((oi) => oi.remainingAmount > 0);
        targetOpenItemIds = validOpenItems.map((oi) => oi.id);
      }

      const payload = {
        direction: "disbursement",
        amount: amountNum,
        currency: "VND",
        cashAccountId: paymentAccountId,
        purpose: paymentPurpose.trim() || `Thanh toán cho NCC ${selectedSupplier.name}`,
        partnerId: selectedSupplier.id,
        allocatedItemIds: targetOpenItemIds.length > 0 ? targetOpenItemIds : undefined,
        allocations,
      };

      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi tạo phiếu chi thanh toán");
      }

      toast.success(`Đã lập phiếu chi và thanh toán ${amountNum.toLocaleString("vi-VN")} đ thành công!`);
      setIsPaymentOpen(false);

      // Cập nhật lại dữ liệu
      await loadSupplierDetails(selectedSupplier.id);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xử lý thanh toán");
    } finally {
      setPaying(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/procurement/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          creditLimit: Number(formData.creditLimit) || 0,
          paymentDays: Number(formData.paymentDays) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi tạo nhà cung cấp");
      }

      toast.success("Thêm nhà cung cấp mới thành công!");
      setIsCreateOpen(false);
      setFormData({
        name: "",
        taxCode: "",
        phone: "",
        address: "",
        creditLimit: "50000000",
        paymentDays: "15",
      });
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Lọc suppliers
  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilters.length > 0) {
        const hasDebt = s.totalPayable > 0;
        const matchDebt = statusFilters.some((f) => (f === "co-no" ? hasDebt : !hasDebt));
        if (!matchDebt) return false;
      }
      return true;
    });
  }, [suppliers, statusFilters]);

  // Facet Filters
  const facetFilters: DataTableFacetFilterConfig[] = [
    {
      id: "status",
      title: "Tình trạng công nợ",
      options: [
        {
          value: "co-no",
          label: "Có dư nợ phải trả",
          count: suppliers.filter((s) => s.totalPayable > 0).length,
        },
        {
          value: "khong-no",
          label: "Đã tất toán / Không nợ",
          count: suppliers.filter((s) => s.totalPayable === 0).length,
        },
      ],
      selectedValues: statusFilters,
      onChange: setStatusFilters,
    },
  ];

  // Thống kê nhanh
  const stats: StatItem[] = React.useMemo(() => {
    const totalCount = filteredSuppliers.length;
    const totalDebt = filteredSuppliers.reduce((sum, s) => sum + (s.totalPayable || 0), 0);
    const withDebtCount = filteredSuppliers.filter((s) => s.totalPayable > 0).length;

    return [
      { label: "Tổng Nhà Cung Cấp", value: `${totalCount} NCC`, color: "blue" },
      {
        label: "Tổng Dư Nợ Phải Trả",
        value: `${(totalDebt / 1_000_000).toFixed(1)} tr`,
        color: totalDebt > 0 ? "rose" : "emerald",
        highlight: totalDebt > 0,
      },
      {
        label: "NCC Đang Có Nợ",
        value: `${withDebtCount} đối tác`,
        color: withDebtCount > 0 ? "amber" : "neutral",
      },
      { label: "Tiêu Chuẩn Thanh Toán", value: "Gối đầu 15-30 ngày", color: "neutral" },
    ];
  }, [filteredSuppliers]);

  // Cấu hình Cột DataTable
  const columns: DataTableColumn<SupplierDto>[] = [
    {
      id: "code",
      header: "Mã NCC",
      accessorKey: "code",
      sortable: true,
      width: "w-28 min-w-[110px]",
      permanent: true,
      cell: (s) => (
        <span
          onClick={() => handleOpenDrawer(s)}
          className="font-mono text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer"
        >
          {s.code}
        </span>
      ),
    },
    {
      id: "name",
      header: "Tên Nhà Cung Cấp",
      accessorKey: "name",
      sortable: true,
      width: "min-w-[260px]",
      cell: (s) => {
        const firstLetter = (s.name || "N").trim().charAt(0).toUpperCase();
        return (
          <div
            onClick={() => handleOpenDrawer(s)}
            className="flex items-center gap-2.5 cursor-pointer group py-0.5"
            title={s.name}
          >
            <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-600 transition-colors">
              {firstLetter}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-900 truncate max-w-[240px] group-hover:text-blue-600 transition-colors">
                {s.name}
              </span>
              {s.address && (
                <span className="text-[10px] text-slate-400 truncate max-w-[240px]">
                  {s.address}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "phone",
      header: "Số Điện Thoại",
      accessorKey: "phone",
      width: "w-32 min-w-[120px]",
      cell: (s) => (
        <span className="font-mono text-slate-600 text-xs">
          {s.phone || "---"}
        </span>
      ),
    },
    {
      id: "poCount",
      header: "Số Đơn PO",
      accessorKey: "poCount",
      sortable: true,
      align: "center",
      width: "w-28 min-w-[100px]",
      cell: (s) => (
        <span
          onClick={() => handleOpenDrawer(s, "orders")}
          className="font-mono text-xs font-medium text-slate-700 hover:text-blue-600 cursor-pointer underline decoration-dotted"
        >
          {s.poCount} đơn
        </span>
      ),
    },
    {
      id: "totalPayable",
      header: "Dư Nợ Phải Trả",
      accessorKey: "totalPayable",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[140px]",
      cell: (s) => (
        <span
          className={`font-mono text-xs font-bold ${
            s.totalPayable > 0 ? "text-rose-600" : "text-slate-400"
          }`}
        >
          {(s.totalPayable || 0).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "creditLimit",
      header: "Hạn Mức Nợ",
      accessorKey: "creditLimit",
      sortable: true,
      align: "right",
      width: "w-32 min-w-[120px]",
      cell: (s) => (
        <span className="font-mono text-xs text-slate-600">
          {(s.creditLimit || 0).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
  ];

  const rowActions: DataTableRowAction<SupplierDto>[] = [
    {
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      title: "Xem hồ sơ & công nợ",
      onClick: (s) => handleOpenDrawer(s),
    },
    {
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Thanh toán công nợ",
      onClick: (s) => handleOpenPaymentTotalDebt(s),
    },
  ];

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">
      {/* DataTable Doanh Nghiệp Chuẩn Benchmark UI */}
      <DataTable
        data={filteredSuppliers}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        searchPlaceholder="Tên / mã nhà cung cấp, số điện thoại, MST..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={facetFilters}
        onResetFilters={() => {
          setStatusFilters([]);
          setSearchTerm("");
        }}
        stats={stats}
        defaultShowStats={false}
        onRefresh={fetchSuppliers}
        exportFileName="Danh_sach_nha_cung_cap"
        rowActions={rowActions}
        isLoading={loading}
        onRowClick={handleOpenDrawer}
        primaryAction={
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nhà cung cấp</span>
          </Button>
        }
      />

      {/* DRAWER CHI TIẾT HỒ SƠ NHÀ CUNG CẤP & THANH TOÁN */}
      <Drawer
        isOpen={!!selectedSupplier}
        onClose={handleCloseDrawer}
        title={selectedSupplier ? `Hồ Sơ: ${selectedSupplier.name}` : "Hồ sơ nhà cung cấp"}
        width="lg"
      >
        {selectedSupplier && (
          <div className="space-y-4 pb-6 text-xs">
            {/* Thẻ Tổng Quan Tài Chính & Thông Tin Đầu Drawer */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {selectedSupplier.code}
                    </span>
                    <Badge variant={selectedSupplier.totalPayable > 0 ? "danger" : "success"}>
                      {selectedSupplier.totalPayable > 0 ? "Đang có nợ phải trả" : "Không có dư nợ"}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate">{selectedSupplier.name}</h3>
                  {selectedSupplier.address && (
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{selectedSupplier.address}</span>
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-slate-400 block text-[11px]">Dư nợ phải trả:</span>
                  <span
                    className={`font-mono text-lg font-bold ${
                      selectedSupplier.totalPayable > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {(selectedSupplier.totalPayable || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              {/* Thông số nhanh */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Hạn mức nợ</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">
                    {(selectedSupplier.creditLimit || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Thời hạn gối đầu</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {selectedSupplier.paymentDays || 15} ngày
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Số đơn mua (PO)</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {supplierDetails?.purchaseOrders.length || selectedSupplier.poCount || 0} đơn
                  </span>
                </div>
              </div>

              {/* Thanh hành động chính */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => handleOpenPaymentTotalDebt(selectedSupplier)}
                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Thanh Toán Công Nợ</span>
                </Button>

                <Link
                  href={`/mua-hang/tao-moi?supplierId=${selectedSupplier.id}`}
                  className="flex-1"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lập Đơn Mua (PO)</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setProfileTab("debts");
                  updateUrlParams(selectedSupplier.code, "debts");
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  profileTab === "debts"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Công Nợ & Phiếu Chi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileTab("orders");
                  updateUrlParams(selectedSupplier.code, "orders");
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  profileTab === "orders"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Đơn Mua PO ({supplierDetails?.purchaseOrders.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileTab("prices");
                  updateUrlParams(selectedSupplier.code, "prices");
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  profileTab === "prices"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bảng Giá ({supplierDetails?.prices.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileTab("info");
                  updateUrlParams(selectedSupplier.code, "info");
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  profileTab === "info"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Thông Tin Pháp Lý</span>
              </button>
            </div>

            {drawerLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                <span>Đang tải thông tin chi tiết hồ sơ...</span>
              </div>
            ) : (
              <div>
                {/* TAB 1: CÔNG NỢ & THANH TOÁN */}
                {profileTab === "debts" && (
                  <div className="space-y-4">
                    {/* Bảng các khoản nợ cần thanh toán */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <CircleDollarSign className="w-3.5 h-3.5 text-blue-600" />
                          <span>Hóa đơn / Đơn mua còn nợ:</span>
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {supplierDetails?.openItems.filter((i) => i.remainingAmount > 0).length || 0} khoản nợ
                        </span>
                      </div>

                      {supplierDetails?.openItems && supplierDetails.openItems.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                          {supplierDetails.openItems.map((oi) => (
                            <div
                              key={oi.id}
                              className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-blue-600">
                                    {oi.purchaseOrderCode || "Nợ mua hàng"}
                                  </span>
                                  <Badge variant={oi.remainingAmount > 0 ? "warning" : "success"}>
                                    {oi.remainingAmount > 0 ? "Chưa thanh toán" : "Đã tất toán"}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Ngày lập: {new Date(oi.createdAt).toLocaleDateString("vi-VN")}
                                  {oi.dueDate && ` • Hạn trả: ${new Date(oi.dueDate).toLocaleDateString("vi-VN")}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="font-mono font-bold text-slate-900 block">
                                    {oi.originalAmount.toLocaleString("vi-VN")} đ
                                  </span>
                                  {oi.remainingAmount > 0 && oi.allocatedAmount > 0 && (
                                    <span className="text-[10px] text-rose-500 font-mono block">
                                      Còn nợ: {oi.remainingAmount.toLocaleString("vi-VN")} đ
                                    </span>
                                  )}
                                </div>

                                {oi.remainingAmount > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const po = supplierDetails.purchaseOrders.find((p) => p.id === oi.purchaseOrderId);
                                      if (po) {
                                        handleOpenPaymentForOrder(po);
                                      } else {
                                        handleOpenPaymentTotalDebt(selectedSupplier);
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded shadow-2xs h-7"
                                  >
                                    Thanh toán
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-xs">
                          Hiện tại không có khoản nợ nào cho nhà cung cấp này
                        </div>
                      )}
                    </div>

                    {/* Lịch sử các phiếu chi đã thanh toán */}
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lịch sử các phiếu chi thanh toán:</span>
                      </h4>

                      {supplierDetails?.payments && supplierDetails.payments.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                          {supplierDetails.payments.map((pm) => (
                            <div key={pm.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-emerald-700">{pm.code}</span>
                                  <span className="text-slate-400 text-[10px]">
                                    {pm.accountName || "Quỹ tiền mặt/Ngân hàng"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">{pm.purpose}</p>
                                <span className="text-[10px] text-slate-400">
                                  {pm.paidAt
                                    ? new Date(pm.paidAt).toLocaleDateString("vi-VN")
                                    : new Date(pm.createdAt).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-emerald-600 text-sm">
                                -{pm.amount.toLocaleString("vi-VN")} đ
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-xs">
                          Chưa có lịch sử phiếu chi thanh toán nào
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: ĐƠN MUA HÀNG (PO) */}
                {profileTab === "orders" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 font-medium text-xs">
                        Danh sách tất cả các đơn mua hàng (PO) đã lập
                      </span>
                      <Link href={`/mua-hang/tao-moi?supplierId=${selectedSupplier.id}`}>
                        <Button
                          size="sm"
                          className="bg-slate-900 text-white font-semibold text-[11px] h-7 px-2.5 rounded-lg flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tạo PO mới</span>
                        </Button>
                      </Link>
                    </div>

                    {supplierDetails?.purchaseOrders && supplierDetails.purchaseOrders.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                        {supplierDetails.purchaseOrders.map((o) => (
                          <div key={o.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600">{o.code}</span>
                                <Badge
                                  variant={
                                    o.status === "completed"
                                      ? "info"
                                      : o.status === "approved"
                                      ? "success"
                                      : "neutral"
                                  }
                                >
                                  {o.status === "completed"
                                    ? "Đã nhận hàng"
                                    : o.status === "approved"
                                    ? "Đã duyệt"
                                    : o.status}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Ngày đặt: {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                                {o.expectedDate && ` • Dự kiến giao: ${new Date(o.expectedDate).toLocaleDateString("vi-VN")}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {o.total.toLocaleString("vi-VN")} đ
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleOpenPaymentForOrder(o)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded shadow-2xs h-7"
                              >
                                Thanh toán
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-xs">
                        Chưa có đơn mua hàng nào cho nhà cung cấp này
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: BẢNG GIÁ THỎA THUẬN */}
                {profileTab === "prices" && (
                  <div className="space-y-2">
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                      {supplierDetails?.prices && supplierDetails.prices.length > 0 ? (
                        supplierDetails.prices.map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <span className="font-bold text-slate-800">{p.itemName}</span>
                              <span className="text-slate-400 font-mono text-[11px] ml-2">({p.itemCode})</span>
                            </div>
                            <span className="font-mono font-bold text-blue-700">
                              {p.price.toLocaleString("vi-VN")} đ / {p.unitName}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400">
                          Chưa có bảng giá vật tư thỏa thuận cam kết
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: THÔNG TIN PHÁP LÝ */}
                {profileTab === "info" && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Mã số thuế:</span>
                        <span className="font-mono font-medium text-slate-800">{selectedSupplier.taxCode || "---"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
                        <span className="font-mono font-medium text-slate-800">{selectedSupplier.phone || "---"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block mb-0.5">Địa chỉ trụ sở / kho:</span>
                        <span className="font-medium text-slate-800">{selectedSupplier.address || "---"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Hạn thanh toán gối đầu:</span>
                        <span className="font-medium text-slate-800">{selectedSupplier.paymentDays} ngày</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Hạn mức tín dụng:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {selectedSupplier.creditLimit.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* MODAL THANH TOÁN CÔNG NỢ & ĐƠN HÀNG (M05 -> M17/M18) */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Lập Phiếu Chi / Thanh Toán Nhà Cung Cấp"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-3.5 text-xs">
          {/* Thông tin đối tác */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">Nhà cung cấp thụ hưởng:</span>
              <p className="font-bold text-slate-900 text-sm">{selectedSupplier?.name}</p>
              <span className="font-mono text-slate-500 text-[11px]">{selectedSupplier?.code}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Tổng nợ hiện tại:</span>
              <span className="font-mono font-bold text-rose-600 text-sm">
                {(selectedSupplier?.totalPayable || 0).toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Chọn hình thức thanh toán */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Hình thức thanh toán:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMode("TOTAL_DEBT");
                  setTargetPoId("");
                  if (selectedSupplier) {
                    setPaymentAmount(String(selectedSupplier.totalPayable > 0 ? selectedSupplier.totalPayable : ""));
                    setPaymentPurpose(`Thanh toán công nợ nhà cung cấp ${selectedSupplier.name}`);
                  }
                }}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                  paymentMode === "TOTAL_DEBT"
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 font-semibold ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  paymentMode === "TOTAL_DEBT" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                }`}>
                  {paymentMode === "TOTAL_DEBT" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>Thanh toán theo tổng nợ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode("ORDER");
                  if (supplierDetails?.purchaseOrders && supplierDetails.purchaseOrders.length > 0) {
                    const firstPo = supplierDetails.purchaseOrders[0];
                    setTargetPoId(firstPo.id);
                    const oi = supplierDetails.openItems.find((item) => item.purchaseOrderId === firstPo.id);
                    setPaymentAmount(String(oi ? oi.remainingAmount : firstPo.total));
                    setPaymentPurpose(`Thanh toán đơn mua hàng ${firstPo.code} - NCC ${selectedSupplier?.name}`);
                  }
                }}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                  paymentMode === "ORDER"
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 font-semibold ring-1 ring-emerald-600"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  paymentMode === "ORDER" ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                }`}>
                  {paymentMode === "ORDER" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span>Thanh toán theo đơn hàng</span>
              </button>
            </div>
          </div>

          {/* Nếu chọn theo đơn hàng: Dropdown chọn đơn */}
          {paymentMode === "ORDER" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Chọn đơn mua hàng cần thanh toán: <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetPoId}
                onChange={(e) => {
                  const poId = e.target.value;
                  setTargetPoId(poId);
                  const foundPo = supplierDetails?.purchaseOrders.find((p) => p.id === poId);
                  const foundOi = supplierDetails?.openItems.find((item) => item.purchaseOrderId === poId);
                  if (foundPo) {
                    const amt = foundOi ? foundOi.remainingAmount : foundPo.total;
                    setPaymentAmount(String(amt > 0 ? amt : foundPo.total));
                    setPaymentPurpose(`Thanh toán đơn mua hàng ${foundPo.code} - NCC ${selectedSupplier?.name}`);
                  }
                }}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
              >
                {supplierDetails?.purchaseOrders.map((po) => {
                  const oi = supplierDetails.openItems.find((item) => item.purchaseOrderId === po.id);
                  const remain = oi ? oi.remainingAmount : po.total;
                  return (
                    <option key={po.id} value={po.id}>
                      {po.code} - Giá trị: {po.total.toLocaleString("vi-VN")} đ (Còn nợ: {remain.toLocaleString("vi-VN")} đ)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Số tiền thanh toán */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Số tiền thanh toán (VNĐ) <span className="text-rose-500">*</span>
              </label>
              {Number(paymentAmount) > 0 && (
                <span className="font-mono text-emerald-600 font-bold text-xs">
                  {Number(paymentAmount).toLocaleString("vi-VN")} đ
                </span>
              )}
            </div>
            <input
              type="number"
              required
              min={1}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="VD: 15000000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />

            {/* Nút bấm nhanh số tiền */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => {
                  if (paymentMode === "ORDER" && targetPoId) {
                    const oi = supplierDetails?.openItems.find((item) => item.purchaseOrderId === targetPoId);
                    const po = supplierDetails?.purchaseOrders.find((p) => p.id === targetPoId);
                    setPaymentAmount(String(oi ? oi.remainingAmount : po?.total || 0));
                  } else {
                    setPaymentAmount(String(selectedSupplier?.totalPayable || 0));
                  }
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
              >
                Trả hết nợ (100%)
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = paymentMode === "ORDER" && targetPoId
                    ? (supplierDetails?.openItems.find((i) => i.purchaseOrderId === targetPoId)?.remainingAmount || 0)
                    : (selectedSupplier?.totalPayable || 0);
                  setPaymentAmount(String(Math.round(base / 2)));
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
              >
                Trả 50%
              </button>
              <button
                type="button"
                onClick={() => setPaymentAmount("10000000")}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
              >
                10 triệu
              </button>
              <button
                type="button"
                onClick={() => setPaymentAmount("20000000")}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
              >
                20 triệu
              </button>
            </div>
          </div>

          {/* Tài khoản nguồn tiền chi */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Trích từ quỹ / Tài khoản: <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.kind === "cash" ? "Quỹ tiền mặt" : "Ngân hàng"}) - Số dư: {(acc.balance || 0).toLocaleString("vi-VN")} đ
                </option>
              ))}
            </select>
          </div>

          {/* Lý do chi tiền */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Lý do / Nội dung chi tiền:
            </label>
            <input
              type="text"
              required
              value={paymentPurpose}
              onChange={(e) => setPaymentPurpose(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Ngày chi tiền */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Ngày chi tiền:
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsPaymentOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={paying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{paying ? "Đang xử lý..." : "Xác nhận chi tiền & Gạch nợ"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal tạo NCC mới */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Thêm Nhà Cung Cấp Mới">
        <form onSubmit={handleCreateSupplier} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Tên Nhà Cung Cấp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Công ty TNHH Nhôm Alu Hà Nội"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Mã số thuế</label>
              <input
                type="text"
                placeholder="010..."
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Số điện thoại</label>
              <input
                type="text"
                placeholder="09..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Địa chỉ kho / văn phòng</label>
            <input
              type="text"
              placeholder="Số nhà, đường, quận/huyện..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creating}>
              {creating ? "Đang lưu..." : "Thêm nhà cung cấp"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
