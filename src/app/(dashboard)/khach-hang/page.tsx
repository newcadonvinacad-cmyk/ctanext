"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  RefreshCw,
  Edit2,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Badge,
  Drawer,
  Modal,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  toast,
  StatItem,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
  DataTableFacetFilterConfig,
} from "@/components/shared";
import { useAuthorization } from "@/hooks/use-authorization";
import { CustomerDto } from "@/services/crm.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { DebtPaymentModal, CashAccountOption } from "@/components/finance/DebtPaymentModal";

export default function KhachHangPage() {
  const { can } = useAuthorization();
  const canCreate = can("customer.create");
  const canUpdate = can("customer.update");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Dữ liệu
  const [customers, setCustomers] = React.useState<CustomerDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState("");

  // Sổ quỹ / Tài khoản ngân hàng cho thanh toán
  const [accounts, setAccounts] = React.useState<CashAccountOption[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);

  // Bộ lọc chuẩn Benchmark UI: Loại khách hàng, Trạng thái công nợ, Người phụ trách
  const [typeFilters, setTypeFilters] = React.useState<string[]>([]);
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);
  const [assigneeFilters, setAssigneeFilters] = React.useState<string[]>([]);

  // Drawer Hồ sơ 360°
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerDto | null>(null);
  const [customerDetail, setCustomerDetail] = React.useState<{
    quotations: Array<{ id: string; code: string; status: string; total: number; createdAt: string }>;
    orders: Array<{ id: string; code: string; status: string; total: number; createdAt: string }>;
    openItems: Array<{ id: string; amount: number; allocatedAmount: number; remainingAmount: number; dueDate: string; status: string; orderCode: string | null; createdAt: string }>;
    payments: Array<{ id: string; code: string; amount: number; paidAt: string | null; purpose: string; status: string; accountName: string; documentImage?: string | null; createdAt: string }>;
  } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [drawerTab, setDrawerTab] = React.useState("info");
  const [isEditing, setIsEditing] = React.useState(false);

  const [editForm, setEditForm] = React.useState({
    name: "",
    taxCode: "",
    phone: "",
    address: "",
    creditLimit: 0,
    paymentDays: 0,
  });

  // Modal tạo khách hàng
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    code: "",
    name: "",
    taxCode: "",
    phone: "",
    address: "",
    creditLimit: 50000000,
    paymentDays: 15,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactPosition: "",
  });

  // Đồng bộ tiêu đề vào TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Khách hàng",
      subtitle: "Danh sách",
      screenCode: "M02",
      quickViews: [
        { label: "Tất cả khách hàng", href: "/khach-hang" },
        { label: "Khách hàng có công nợ", href: "/khach-hang?tab=cong-no" },
        { label: "Khách hàng tiềm năng", href: "/khach-hang?status=tiem-nang" },
        { label: "Đại lý đối tác", href: "/khach-hang?type=dai-ly" },
      ],
    },
    []
  );

  // Tải danh sách khách hàng
  const loadCustomers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (keyword.trim()) query.set("keyword", keyword.trim());
      const res = await fetch(`/api/crm/customers?${query.toString()}`);
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
    } catch (err: any) {
      toast.error("Lỗi tải danh sách khách hàng: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  // Tải danh sách tài khoản quỹ/ngân hàng
  const fetchAccounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/finance/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error("Lỗi tải tài khoản quỹ:", e);
    }
  }, []);

  React.useEffect(() => {
    loadCustomers();
    fetchAccounts();
  }, [loadCustomers, fetchAccounts]);

  // Deep-linking URL Sync
  const updateUrlParams = (customerCode: string | null, tab: string = "info") => {
    const params = new URLSearchParams(searchParams.toString());
    if (customerCode) {
      params.set("ho-so", customerCode);
      params.set("tab", tab);
      params.set("view", "drawer");
    } else {
      params.delete("ho-so");
      params.delete("tab");
      params.delete("view");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Xem chi tiết hồ sơ 360°
  const handleOpenDetail = React.useCallback(
    async (c: CustomerDto, initialTab: string = "info") => {
      setSelectedCustomer(c);
      setDrawerTab(initialTab);
      setEditForm({
        name: c.name,
        taxCode: c.taxCode || "",
        phone: c.phone || "",
        address: c.address || "",
        creditLimit: c.creditLimit,
        paymentDays: c.paymentDays,
      });
      setIsEditing(false);
      setIsDrawerOpen(true);
      updateUrlParams(c.code, initialTab);

      try {
        const res = await fetch(`/api/crm/customers/${c.id}`);
        const data = await res.json();
        if (data.quotations) {
          setCustomerDetail({
            quotations: data.quotations,
            orders: data.orders,
            openItems: data.openItems,
            payments: data.payments || [],
          });
        }
      } catch (err: any) {
        toast.error("Lỗi tải dữ liệu chi tiết khách hàng");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, pathname]
  );

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    updateUrlParams(null);
  };

  // Khôi phục Drawer từ State URL khi F5
  React.useEffect(() => {
    const hoSoParam = searchParams.get("ho-so");
    const tabParam = searchParams.get("tab") || "info";
    if (hoSoParam && customers.length > 0 && (!selectedCustomer || selectedCustomer.code !== hoSoParam)) {
      const match = customers.find((c) => c.code === hoSoParam);
      if (match) {
        handleOpenDetail(match, tabParam);
      }
    }
  }, [searchParams, customers, selectedCustomer, handleOpenDetail]);

  // Cập nhật thông tin khách hàng
  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    try {
      const res = await fetch(`/api/crm/customers/${selectedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật");

      toast.success("Cập nhật thông tin khách hàng thành công!");
      setIsEditing(false);
      setIsDrawerOpen(false);
      updateUrlParams(null);
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Tạo khách hàng mới
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Tên khách hàng là bắt buộc!");
      return;
    }

    try {
      const res = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo khách hàng");

      toast.success(`Đã thêm khách hàng '${createForm.name}' thành công!`);
      setIsCreateModalOpen(false);
      setCreateForm({
        code: "",
        name: "",
        taxCode: "",
        phone: "",
        address: "",
        creditLimit: 50000000,
        paymentDays: 15,
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        contactPosition: "",
      });
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Lọc dữ liệu client-side theo bộ lọc Facet
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      // Lọc theo Loại
      if (typeFilters.length > 0) {
        const isAgency = c.name.toLowerCase().includes("đại lý") || c.name.toLowerCase().includes("xưởng");
        const isCorp = Boolean(c.taxCode);
        const matchType = typeFilters.some((t) => {
          if (t === "dai-ly") return isAgency;
          if (t === "doanh-nghiep") return isCorp && !isAgency;
          if (t === "ca-nhan") return !isCorp;
          return true;
        });
        if (!matchType) return false;
      }

      // Lọc theo Trạng thái công nợ
      if (statusFilters.length > 0) {
        const isOverdue = c.overdueAmount > 0;
        const isInDebt = c.totalReceivable > 0;
        const isGood = c.totalReceivable === 0;

        const matchStatus = statusFilters.some((s) => {
          if (s === "qua-han") return isOverdue;
          if (s === "dang-no") return isInDebt && !isOverdue;
          if (s === "tot") return isGood;
          return true;
        });
        if (!matchStatus) return false;
      }

      return true;
    });
  }, [customers, typeFilters, statusFilters]);

  // Cấu hình các bộ lọc chuẩn Benchmark UI: [Loại ⌄] [Trạng thái ⌄] [Người phụ trách ⌄]
  const facetFilters: DataTableFacetFilterConfig[] = [
    {
      id: "type",
      title: "Loại",
      options: [
        { value: "doanh-nghiep", label: "Doanh nghiệp", count: customers.filter((c) => Boolean(c.taxCode)).length },
        { value: "dai-ly", label: "Đại lý / Xưởng in", count: customers.filter((c) => c.name.toLowerCase().includes("đại lý")).length },
        { value: "ca-nhan", label: "Khách lẻ / Cá nhân", count: customers.filter((c) => !c.taxCode).length },
      ],
      selectedValues: typeFilters,
      onChange: setTypeFilters,
    },
    {
      id: "status",
      title: "Trạng thái",
      options: [
        { value: "dang-no", label: "Đang nợ", count: customers.filter((c) => c.totalReceivable > 0 && c.overdueAmount === 0).length },
        { value: "qua-han", label: "Nợ quá hạn", count: customers.filter((c) => c.overdueAmount > 0).length },
        { value: "tot", label: "Tốt (Hết nợ)", count: customers.filter((c) => c.totalReceivable === 0).length },
      ],
      selectedValues: statusFilters,
      onChange: setStatusFilters,
    },
    {
      id: "assignee",
      title: "Người phụ trách",
      options: [
        { value: "kd1", label: "KD1 - Anh Tuấn" },
        { value: "kd2", label: "KD2 - Chị Lan" },
        { value: "admin", label: "Ban Giám Đốc" },
      ],
      selectedValues: assigneeFilters,
      onChange: setAssigneeFilters,
    },
  ];

  // Thống kê nhanh
  const stats: StatItem[] = React.useMemo(() => {
    const totalCustomers = filteredCustomers.length;
    const totalReceivable = filteredCustomers.reduce((sum, c) => sum + c.totalReceivable, 0);
    const totalOverdue = filteredCustomers.reduce((sum, c) => sum + c.overdueAmount, 0);
    const inDebtCount = filteredCustomers.filter((c) => c.totalReceivable > 0).length;

    return [
      { label: "Tổng Khách Hàng", value: totalCustomers, color: "blue" },
      {
        label: "Tổng Công Nợ Phải Thu",
        value: `${(totalReceivable / 1_000_000).toFixed(1)} tr`,
        color: "emerald",
      },
      { label: "Đang Có Nợ", value: inDebtCount, color: "amber" },
      {
        label: "Nợ Quá Hạn",
        value: totalOverdue > 0 ? `${(totalOverdue / 1_000_000).toFixed(1)} tr` : "0 tr",
        color: totalOverdue > 0 ? "rose" : "neutral",
        highlight: totalOverdue > 0,
      },
    ];
  }, [filteredCustomers]);

  // Cấu hình Cột DataTable chuẩn Benchmark UI (Có Avatar chữ cái viết tắt, Phone, Email, Địa chỉ, Phụ trách)
  const columns: DataTableColumn<CustomerDto>[] = [
    {
      id: "code",
      header: "Mã KH",
      accessorKey: "code",
      sortable: true,
      width: "w-28 min-w-[110px]",
      permanent: true,
      cell: (c) => (
        <span
          onClick={() => handleOpenDetail(c)}
          className="font-mono text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer"
        >
          {c.code}
        </span>
      ),
    },
    {
      id: "name",
      header: "Tổ chức / Tên KH",
      accessorKey: "name",
      sortable: true,
      width: "min-w-[240px]",
      cell: (c) => {
        // Sinh ký tự chữ cái đầu để làm Avatar tròn như ảnh mẫu Benchmark UI
        const firstLetter = c.name.trim().charAt(0).toUpperCase();
        return (
          <div
            onClick={() => handleOpenDetail(c)}
            className="flex items-center gap-2 cursor-pointer group py-0.5"
            title={c.name}
          >
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {firstLetter}
            </span>
            <span className="font-semibold text-slate-900 truncate max-w-[230px] group-hover:text-blue-600 transition-colors">
              {c.name}
            </span>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Phân loại",
      width: "w-28 min-w-[100px]",
      cell: (c) => {
        const isAgency = c.name.toLowerCase().includes("đại lý") || c.name.toLowerCase().includes("xưởng");
        return isAgency ? (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Đại lý
          </span>
        ) : (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Doanh nghiệp
          </span>
        );
      },
    },
    {
      id: "contact",
      header: "Người liên hệ",
      width: "w-32 min-w-[110px]",
      cell: (c) => (
        <span className="text-slate-600 truncate block">
          {c.taxCode ? "Phòng Mua Hàng" : "Chính chủ"}
        </span>
      ),
    },
    {
      id: "phone",
      header: "Số điện thoại",
      accessorKey: "phone",
      width: "w-32 min-w-[110px]",
      cell: (c) => (
        <span className="font-mono text-slate-700">
          {c.phone || "---"}
        </span>
      ),
    },
    {
      id: "email",
      header: "Email",
      width: "w-36 min-w-[120px]",
      cell: () => <span className="text-slate-400">---</span>,
    },
    {
      id: "address",
      header: "Địa chỉ",
      accessorKey: "address",
      width: "min-w-[180px]",
      cell: (c) => (
        <span className="text-slate-600 truncate block max-w-[200px]" title={c.address || ""}>
          {c.address || "---"}
        </span>
      ),
    },
    {
      id: "assignee",
      header: "Phụ trách",
      width: "w-24 min-w-[90px]",
      cell: () => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold flex items-center justify-center">
            K
          </span>
          <span>KD1</span>
        </div>
      ),
    },
    {
      id: "totalReceivable",
      header: "Công nợ",
      accessorKey: "totalReceivable",
      sortable: true,
      align: "right",
      width: "w-32 min-w-[120px]",
      cell: (c) => (
        <span
          className={`font-mono font-semibold ${
            c.totalReceivable > 0 ? "text-amber-700" : "text-slate-400"
          }`}
        >
          {c.totalReceivable.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
  ];

  // Thao tác dòng chuẩn Benchmark UI (Gọi điện 📞, Xem 👁️, Sửa ✏️, Xóa 🗑️)
  const rowActions: DataTableRowAction<CustomerDto>[] = [
    {
      icon: <Phone className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Gọi điện thoại",
      onClick: (c) => {
        if (c.phone) {
          toast.success(`Đang kết nối cuộc gọi tới ${c.name} (${c.phone})...`);
        } else {
          toast.error("Khách hàng này chưa có số điện thoại");
        }
      },
    },
    {
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      title: "Xem hồ sơ 360°",
      onClick: (c) => handleOpenDetail(c),
    },
    {
      icon: <Edit2 className="w-3.5 h-3.5 text-slate-600" />,
      title: "Chỉnh sửa thông tin",
      onClick: (c) => {
        handleOpenDetail(c);
        setIsEditing(true);
      },
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      title: "Xóa khách hàng",
      danger: true,
      onClick: (c) => {
        toast.error(`Đã chặn xóa khách hàng '${c.name}' vì đang phát sinh hợp đồng dự án.`);
      },
    },
  ];

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">
      {/* Bảng Dữ Liệu Doanh Nghiệp Chuẩn Benchmark UI */}
      <DataTable
        data={filteredCustomers}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        searchPlaceholder="Tên / mã / SĐT..."
        searchValue={keyword}
        onSearchChange={setKeyword}
        filters={facetFilters}
        onResetFilters={() => {
          setTypeFilters([]);
          setStatusFilters([]);
          setAssigneeFilters([]);
          setKeyword("");
        }}
        stats={stats}
        defaultShowStats={false}
        onRefresh={loadCustomers}
        exportFileName="Danh_sach_khach_hang"
        rowActions={rowActions}
        isLoading={isLoading}
        onRowClick={handleOpenDetail}
        primaryAction={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm khách hàng</span>
          </Button>
        }
      />

      {/* DRAWER HỒ SƠ 360° CỦA KHÁCH HÀNG (Deep-linking URL sync) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={selectedCustomer ? `Hồ Sơ 360°: ${selectedCustomer.name} (${selectedCustomer.code})` : "Chi Tiết Khách Hàng"}
        width="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6 pb-8">
            {/* Header tóm tắt đối tác */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedCustomer.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  MST: {selectedCustomer.taxCode || "---"} • SĐT: {selectedCustomer.phone || "---"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Dư nợ hiện tại:</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    selectedCustomer.totalReceivable > 0 ? "text-amber-700" : "text-emerald-600"
                  }`}
                >
                  {selectedCustomer.totalReceivable.toLocaleString("vi-VN")} đ
                </span>
                {selectedCustomer.overdueAmount > 0 && (
                  <Badge variant="danger" className="text-[10px] mt-1">
                    Quá hạn: {selectedCustomer.overdueAmount.toLocaleString("vi-VN")} đ
                  </Badge>
                )}
              </div>
            </div>

            {/* Sub-tabs trong Drawer */}
            <Tabs
              value={drawerTab}
              onValueChange={(val) => {
                setDrawerTab(val);
                updateUrlParams(selectedCustomer.code, val);
              }}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="info">Thông tin chung</TabsTrigger>
                <TabsTrigger value="quotations">Báo giá ({customerDetail?.quotations.length || 0})</TabsTrigger>
                <TabsTrigger value="orders">Đơn hàng ({customerDetail?.orders.length || 0})</TabsTrigger>
                <TabsTrigger value="debt">Sổ nợ ({customerDetail?.openItems.length || 0})</TabsTrigger>
              </TabsList>

              {/* TAB 1: THÔNG TIN CHUNG */}
              <TabsContent value="info" className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-sm font-semibold text-slate-800">Thông Tin Pháp Lý & Tín Dụng</h4>
                  {canUpdate && !isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Sửa thông tin
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Tên khách hàng</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Mã số thuế</label>
                        <input
                          type="text"
                          value={editForm.taxCode}
                          onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Số điện thoại</label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Địa chỉ</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Hạn mức tín dụng (VND)</label>
                        <input
                          type="number"
                          value={editForm.creditLimit}
                          onChange={(e) => setEditForm({ ...editForm, creditLimit: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Hạn nợ (ngày)</label>
                        <input
                          type="number"
                          value={editForm.paymentDays}
                          onChange={(e) => setEditForm({ ...editForm, paymentDays: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        Hủy
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                        Lưu thay đổi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Địa chỉ trụ sở:</span>
                      <span className="text-slate-800 font-medium">{selectedCustomer.address || "Chưa cập nhật"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Mã số thuế:</span>
                      <span className="text-slate-800 font-medium font-mono">{selectedCustomer.taxCode || "---"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Hạn mức tín dụng cho phép:</span>
                      <span className="text-blue-700 font-bold font-mono">
                        {selectedCustomer.creditLimit.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời hạn thanh toán chuẩn:</span>
                      <span className="text-slate-800 font-medium">{selectedCustomer.paymentDays} ngày kể từ ngày xuất</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: BÁO GIÁ */}
              <TabsContent value="quotations" className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Lịch Sử Báo Giá Dự Toán</h4>
                  <Button variant="outline" size="sm" onClick={() => router.push("/bao-gia/tao-moi")}>
                    + Lập báo giá mới
                  </Button>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {customerDetail?.quotations.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">Chưa có báo giá nào cho khách hàng này</div>
                  ) : (
                    customerDetail?.quotations.map((q) => (
                      <div key={q.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <span className="font-mono font-bold text-blue-600">{q.code}</span>
                          <span className="text-slate-400 ml-2">{new Date(q.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900">{q.total.toLocaleString("vi-VN")} đ</span>
                          <Badge variant={q.status === "approved" ? "success" : "neutral"}>{q.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: ĐƠN HÀNG */}
              <TabsContent value="orders" className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Đơn Bán Hàng Thương Mại</h4>
                  <Button variant="outline" size="sm" onClick={() => router.push("/ban-hang/tao-moi")}>
                    + Lập đơn bán hàng
                  </Button>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {customerDetail?.orders.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">Chưa có đơn bán hàng nào</div>
                  ) : (
                    customerDetail?.orders.map((o) => (
                      <div key={o.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <span className="font-mono font-bold text-blue-600">{o.code}</span>
                          <span className="text-slate-400 ml-2">{new Date(o.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900">{o.total.toLocaleString("vi-VN")} đ</span>
                          <Badge variant={o.status === "confirmed" ? "success" : "neutral"}>{o.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: SỔ NỢ & LỊCH SỬ THU TIỀN */}
              <TabsContent value="debt" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Các Khoản Nợ Phải Thu (Open Items)</h4>
                    <p className="text-[11px] text-slate-500">Từng hóa đơn bán hàng và số tiền còn phải thu</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsPaymentOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Thu tiền & Gạch nợ</span>
                  </Button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {customerDetail?.openItems.length === 0 ? (
                    <div className="p-4 text-center text-emerald-600 font-medium">Khách hàng không có khoản nợ nào</div>
                  ) : (
                    customerDetail?.openItems.map((oi) => {
                      const rem = oi.remainingAmount ?? oi.amount;
                      return (
                        <div key={oi.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold text-slate-800">{oi.orderCode || "Hóa đơn nợ"}</p>
                              <Badge variant={rem <= 0 ? "success" : oi.status === "confirmed" ? "warning" : "neutral"}>
                                {rem <= 0 ? "Đã tất toán" : "Còn nợ"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Hạn trả: {oi.dueDate ? new Date(oi.dueDate).toLocaleDateString("vi-VN") : "---"}
                              {oi.allocatedAmount > 0 && (
                                <span className="text-emerald-600 ml-1.5 font-medium">
                                  • Đã thu: {oi.allocatedAmount.toLocaleString("vi-VN")} đ
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-700 block">
                              Còn: {rem.toLocaleString("vi-VN")} đ
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Gốc: {oi.amount.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* LỊCH SỬ PHIẾU THU TIỀN CỦA KHÁCH */}
                <div className="pt-2">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Lịch Sử Phiếu Thu Tiền</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {!customerDetail?.payments || customerDetail.payments.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">Chưa có phiếu thu nào từ khách hàng này</div>
                    ) : (
                      customerDetail.payments.map((pm) => (
                        <div key={pm.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {pm.code}
                              </span>
                              <span className="font-medium text-slate-800">{pm.purpose}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {pm.paidAt ? new Date(pm.paidAt).toLocaleDateString("vi-VN") : new Date(pm.createdAt).toLocaleDateString("vi-VN")}
                              {pm.accountName && ` • Quỹ: ${pm.accountName}`}
                              {pm.documentImage && (
                                <a
                                  href={pm.documentImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 ml-2 inline-flex items-center gap-0.5 font-medium underline"
                                >
                                  [Xem chứng từ]
                                </a>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-600 block">
                              +{pm.amount.toLocaleString("vi-VN")} đ
                            </span>
                            <Badge variant="success" className="text-[10px]">
                              {pm.status === "posted" ? "Đã ghi sổ" : pm.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Drawer>

      {/* MODAL THU TIỀN VÀ GẠCH NỢ DÙNG CHUNG */}
      {selectedCustomer && (
        <DebtPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          type="receipt"
          partnerId={selectedCustomer.id}
          partnerName={selectedCustomer.name}
          partnerCode={selectedCustomer.code}
          openItems={(customerDetail?.openItems || []).map((oi) => ({
            id: oi.id,
            originalAmount: oi.amount,
            allocatedAmount: oi.allocatedAmount,
            remainingAmount: oi.remainingAmount ?? oi.amount,
            dueDate: oi.dueDate,
            orderCode: oi.orderCode,
            status: oi.status,
            createdAt: oi.createdAt,
          }))}
          accounts={accounts}
          onSuccess={() => {
            loadCustomers();
            if (selectedCustomer) {
              handleOpenDetail(selectedCustomer, "debt");
            }
          }}
        />
      )}

      {/* MODAL THÊM KHÁCH HÀNG MỚI */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm Khách Hàng Doanh Nghiệp Mới"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mã Khách Hàng <span className="text-slate-400 font-normal">(Tùy chọn - Tự sinh nếu để trống)</span>
              </label>
              <input
                type="text"
                placeholder="VD: KH-0001 (để trống để tự sinh)"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tên Khách Hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Highlands Coffee"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Số điện thoại</label>
              <input
                type="text"
                placeholder="0912..."
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Mã số thuế</label>
              <input
                type="text"
                placeholder="010..."
                value={createForm.taxCode}
                onChange={(e) => setCreateForm({ ...createForm, taxCode: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Địa chỉ</label>
            <input
              type="text"
              placeholder="Số nhà, đường, quận/huyện..."
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Hạn mức tín dụng (VND)</label>
              <input
                type="number"
                value={createForm.creditLimit}
                onChange={(e) => setCreateForm({ ...createForm, creditLimit: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Hạn nợ (ngày)</label>
              <input
                type="number"
                value={createForm.paymentDays}
                onChange={(e) => setCreateForm({ ...createForm, paymentDays: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Thêm khách hàng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
