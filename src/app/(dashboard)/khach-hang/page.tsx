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
import { useConfirm } from "@/contexts/confirm-dialog-context";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { DebtPaymentModal, CashAccountOption } from "@/components/finance/DebtPaymentModal";

export default function KhachHangPage() {
  const { can } = useAuthorization();
  const canCreate = can("customer.create");
  const canUpdate = can("customer.update");
  const confirm = useConfirm();
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
    customerType: "doanh-nghiep",
  });

  // Modal tạo khách hàng
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    code: "",
    name: "",
    customerType: "doanh-nghiep",
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
    async (c: CustomerDto, initialTab: string = "info", editMode: boolean = false) => {
      setSelectedCustomer(c);
      setDrawerTab(initialTab);
      setEditForm({
        name: c.name,
        taxCode: c.taxCode || "",
        phone: c.phone || "",
        address: c.address || "",
        creditLimit: c.creditLimit,
        paymentDays: c.paymentDays,
        customerType: c.customerType || (c.name.toLowerCase().includes("đại lý") || c.name.toLowerCase().includes("xưởng") ? "dai-ly" : (c.taxCode ? "doanh-nghiep" : "ca-nhan")),
      });
      setIsEditing(editMode);
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

  const resetCreateForm = () => {
    setCreateForm({
      code: "",
      name: "",
      customerType: "doanh-nghiep",
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
  };

  const handleDeleteCustomer = async (c: CustomerDto) => {
    const ok = await confirm({
      title: "Xóa / Vô hiệu hóa khách hàng",
      message: `Bạn có chắc chắn muốn xóa khách hàng "${c.name}"? Nếu khách hàng đã phát sinh báo giá, đơn hàng hoặc công nợ, hệ thống sẽ tự động chuyển sang trạng thái vô hiệu hóa để bảo toàn lịch sử chứng từ.`,
      variant: "danger",
      confirmText: "Xác nhận xóa",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/crm/customers/${c.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa khách hàng");

      toast.success(data.message || "Đã xóa khách hàng thành công!");
      if (selectedCustomer?.id === c.id) {
        handleCloseDrawer();
      }
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa khách hàng");
    }
  };

  // Cập nhật thông tin khách hàng
  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    if (editForm.phone?.trim()) {
      const phoneRegex = /^(0|\+84)[0-9]{8,10}$/;
      if (!phoneRegex.test(editForm.phone.trim())) {
        toast.error("Số điện thoại không hợp lệ (phải bắt đầu bằng 0 hoặc +84 và gồm 9-11 chữ số)!");
        return;
      }
    }
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
    if (createForm.phone?.trim()) {
      const phoneRegex = /^(0|\+84)[0-9]{8,10}$/;
      if (!phoneRegex.test(createForm.phone.trim())) {
        toast.error("Số điện thoại không hợp lệ (phải bắt đầu bằng 0 hoặc +84 và gồm 9-11 chữ số)!");
        return;
      }
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
      resetCreateForm();
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
        const cType = c.customerType || (c.name.toLowerCase().includes("đại lý") || c.name.toLowerCase().includes("xưởng") ? "dai-ly" : (c.taxCode ? "doanh-nghiep" : "ca-nhan"));
        const matchType = typeFilters.includes(cType);
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
        const cType = c.customerType || (c.name.toLowerCase().includes("đại lý") || c.name.toLowerCase().includes("xưởng") ? "dai-ly" : (c.taxCode ? "doanh-nghiep" : "ca-nhan"));
        if (cType === "dai-ly") {
          return (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
              Đại lý
            </span>
          );
        }
        if (cType === "ca-nhan") {
          return (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Cá nhân
            </span>
          );
        }
        return (
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
      onClick: (c) => handleOpenDetail(c, "info", true),
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      title: "Xóa khách hàng",
      danger: true,
      onClick: (c) => handleDeleteCustomer(c),
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
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm khách hàng</span>
          </Button>
        }
      />

      {/* DRAWER HỒ SƠ 360° CỦA KHÁCH HÀNG (THEO CHUẨN MOCKUP) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        avatar={
          selectedCustomer ? (
            <div className="w-14 h-14 rounded-2xl bg-[#0b0c3f] text-white flex items-center justify-center font-black text-xl shadow-md tracking-wider">
              {selectedCustomer.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("") || "KH"}
            </div>
          ) : undefined
        }
        title={
          selectedCustomer ? (
            <span className="text-xl font-extrabold text-[#0e1726]">
              {selectedCustomer.name}
            </span>
          ) : (
            "Chi Tiết Khách Hàng"
          )
        }
        badge={
          selectedCustomer ? (
            <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {selectedCustomer.code}
            </span>
          ) : undefined
        }
        width="lg"
      >
        {selectedCustomer && (
          <div className="space-y-5 pb-4 select-text">
            {/* ======================================================== */}
            {/* 1. BỘ 3 THẺ KPI TỔNG QUAN THEO MOCKUP                   */}
            {/* ======================================================== */}
            <div className="grid grid-cols-3 gap-3">
              {/* Thẻ 1: Dư nợ hiện tại (Có chấm đỏ cảnh báo) */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>Dư nợ hiện tại</span>
                </div>
                <div
                  className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                    selectedCustomer.totalReceivable > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {selectedCustomer.totalReceivable.toLocaleString("vi-VN")} đ
                </div>
              </div>

              {/* Thẻ 2: Hạn mức tín dụng */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium mb-1">
                  Hạn mức tín dụng
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-[#0e1726] tracking-tight">
                  {selectedCustomer.creditLimit.toLocaleString("vi-VN")} đ
                </div>
              </div>

              {/* Thẻ 3: Báo giá chờ duyệt */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-xs text-slate-500 font-medium mb-1">
                  Báo giá chờ duyệt
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-[#0e1726] tracking-tight">
                  {customerDetail?.quotations.filter((q) => q.status === "pending" || q.status === "draft").length || 0}
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 2. SUB-TABS TRONG DRAWER THEO CHUẨN MOCKUP              */}
            {/* ======================================================== */}
            <Tabs
              value={drawerTab}
              onValueChange={(val) => {
                setDrawerTab(val);
                updateUrlParams(selectedCustomer.code, val);
              }}
            >
              <TabsList className="bg-transparent p-0 flex items-center gap-2 border-b border-slate-200 w-full justify-start rounded-none h-auto pb-0">
                <TabsTrigger
                  value="info"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0b0c3f] data-[state=active]:text-[#0b0c3f] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-bold px-3 py-2 text-slate-500"
                >
                  Thông tin chung
                </TabsTrigger>
                <TabsTrigger
                  value="quotations"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0b0c3f] data-[state=active]:text-[#0b0c3f] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-bold px-3 py-2 text-slate-500"
                >
                  Báo giá{" "}
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 text-[10px]">
                    {customerDetail?.quotations.length || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0b0c3f] data-[state=active]:text-[#0b0c3f] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-bold px-3 py-2 text-slate-500"
                >
                  Đơn hàng{" "}
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 text-[10px]">
                    {customerDetail?.orders.length || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="debt"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0b0c3f] data-[state=active]:text-[#0b0c3f] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-bold px-3 py-2 text-slate-500"
                >
                  Sổ nợ{" "}
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 text-[10px]">
                    {customerDetail?.openItems.length || 0}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: THÔNG TIN PHÁP LÝ & TÍN DỤNG + LỊCH SỬ BÁO GIÁ */}
              <TabsContent value="info" className="space-y-4 pt-4">
                {/* Khung Thông tin pháp lý & tín dụng theo mockup */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#0e1726] uppercase tracking-wider">
                      Thông Tin Pháp Lý &amp; Tín Dụng
                    </h4>
                    {canUpdate && !isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                        <span>Sửa thông tin</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-slate-700 block mb-1">Tên khách hàng</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1">Phân loại</label>
                          <select
                            value={editForm.customerType}
                            onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            <option value="doanh-nghiep">Doanh nghiệp</option>
                            <option value="dai-ly">Đại lý</option>
                            <option value="ca-nhan">Cá nhân</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1">Mã số thuế</label>
                          <input
                            type="text"
                            value={editForm.taxCode}
                            onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1">Số điện thoại</label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1">Địa chỉ</label>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1">Hạn mức tín dụng (VND)</label>
                          <input
                            type="number"
                            value={editForm.creditLimit}
                            onChange={(e) => setEditForm({ ...editForm, creditLimit: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1">Hạn nợ (ngày)</label>
                          <input
                            type="number"
                            value={editForm.paymentDays}
                            onChange={(e) => setEditForm({ ...editForm, paymentDays: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
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
                    <div className="space-y-2.5 text-xs pt-1">
                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 font-medium">Địa chỉ trụ sở:</span>
                        <span className="text-slate-800 font-bold text-right max-w-xs leading-snug">
                          {selectedCustomer.address || "Chưa cập nhật"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Mã số thuế:</span>
                        <span className="text-slate-800 font-mono font-bold">
                          {selectedCustomer.taxCode || "---"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Thời hạn thanh toán:</span>
                        <span className="text-slate-800 font-bold">
                          {selectedCustomer.paymentDays} ngày
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Khối Lịch sử báo giá theo mockup */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <h4 className="text-xs font-extrabold text-[#0e1726] uppercase tracking-wider">
                    Lịch Sử Báo Giá
                  </h4>

                  <div className="space-y-3">
                    {(!customerDetail?.quotations || customerDetail.quotations.length === 0) ? (
                      <p className="text-xs text-slate-400 text-center py-2">Chưa có báo giá nào</p>
                    ) : (
                      customerDetail.quotations.slice(0, 3).map((q) => (
                        <div key={q.id} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#0b0c3f] mt-1 shrink-0" />
                            <div>
                              <div className="font-bold font-mono text-[#0e1726]">{q.code}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(q.createdAt).toLocaleDateString("vi-VN")} • {new Date(q.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold font-mono text-slate-900">
                              {q.total.toLocaleString("vi-VN")} đ
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 ${
                              q.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {q.status === "approved" ? "Đã chốt" : "Chờ duyệt"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: BÁO GIÁ ĐẦY ĐỦ */}
              <TabsContent value="quotations" className="space-y-3 pt-4">
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs bg-white">
                  {customerDetail?.quotations.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">Chưa có báo giá nào cho khách hàng này</div>
                  ) : (
                    customerDetail?.quotations.map((q) => (
                      <div key={q.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                        <div>
                          <span className="font-mono font-bold text-blue-700">{q.code}</span>
                          <span className="text-slate-400 ml-2">{new Date(q.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900">{q.total.toLocaleString("vi-VN")} đ</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            q.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {q.status === "approved" ? "Đã chốt" : "Chờ duyệt"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: ĐƠN HÀNG */}
              <TabsContent value="orders" className="space-y-3 pt-4">
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs bg-white">
                  {customerDetail?.orders.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">Chưa có đơn bán hàng nào</div>
                  ) : (
                    customerDetail?.orders.map((o) => (
                      <div key={o.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                        <div>
                          <span className="font-mono font-bold text-blue-700">{o.code}</span>
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

              {/* TAB 4: SỔ NỢ */}
              <TabsContent value="debt" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Khoản Nợ Phải Thu</h4>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsPaymentOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 rounded-xl shadow-xs text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Thu tiền &amp; Gạch nợ</span>
                  </Button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs bg-white">
                  {customerDetail?.openItems.length === 0 ? (
                    <div className="p-6 text-center text-emerald-600 font-medium">Khách hàng không có khoản nợ nào</div>
                  ) : (
                    customerDetail?.openItems.map((oi) => {
                      const rem = oi.remainingAmount ?? oi.amount;
                      return (
                        <div key={oi.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-slate-800">{oi.orderCode || "Hóa đơn nợ"}</p>
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
              </TabsContent>
            </Tabs>

            {/* ======================================================== */}
            {/* 3. NÚT HÀNH ĐỘNG CHÍNH CHÂN TRANG THEO ĐÚNG MOCKUP       */}
            {/* ======================================================== */}
            <div className="pt-2">
              <button
                onClick={() => router.push(`/bao-gia/tao-moi?customerId=${selectedCustomer.id}`)}
                className="w-full py-3.5 px-4 bg-[#0b0c3f] hover:bg-[#15176b] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-md active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Lập báo giá mới</span>
              </button>
            </div>
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
        onClose={() => {
          resetCreateForm();
          setIsCreateModalOpen(false);
        }}
        title="Thêm Khách Hàng Mới"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mã Khách Hàng <span className="text-slate-400 font-normal">(Tùy chọn)</span>
              </label>
              <input
                type="text"
                placeholder="VD: KH-0001"
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
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Loại Khách Hàng <span className="text-red-500">*</span>
              </label>
              <select
                value={createForm.customerType}
                onChange={(e) => setCreateForm({ ...createForm, customerType: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="doanh-nghiep">Doanh nghiệp</option>
                <option value="dai-ly">Đại lý</option>
                <option value="ca-nhan">Cá nhân</option>
              </select>
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
