"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Inbox,
  Send,
  HardHat,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Wallet,
  Building2,
  CreditCard,
  RefreshCw,
  Eye,
  Landmark,
  History,
  DollarSign,
  ChevronRight,
  Paperclip,
} from "lucide-react";
import {
  Button,
  Badge,
  Modal,
  Tooltip,
  toast,
  StatItem,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
} from "@/components/shared";
import {
  CashAccountDto,
  PaymentDto,
  OpenItemDto,
  CashMovementDto,
} from "@/services/finance.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { DebtPaymentModal } from "@/components/finance/DebtPaymentModal";
import { useAuthorization } from "@/hooks/use-authorization";

export default function FinancePage() {
  const { can, hasRole } = useAuthorization();
  const canManageAccounts =
    can("payment.create") ||
    can("company_setting.update") ||
    hasRole("SUPER_ADMIN") ||
    hasRole("ACCOUNTANT");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get("tab") as any) || "cashbook";
  const [activeTab, setActiveTab] = React.useState<"cashbook" | "receivables" | "payables" | "claims">(
    tabParam === "receivables" || tabParam === "payables" || tabParam === "claims"
      ? tabParam
      : "cashbook"
  );

  const [accounts, setAccounts] = React.useState<CashAccountDto[]>([]);
  const [payments, setPayments] = React.useState<PaymentDto[]>([]);
  const [movements, setMovements] = React.useState<CashMovementDto[]>([]);
  const [receivables, setReceivables] = React.useState<OpenItemDto[]>([]);
  const [payables, setPayables] = React.useState<OpenItemDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState("");

  // Lọc biến động sổ quỹ theo tài khoản cụ thể
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("");

  // Modal lập phiếu Thu/Chi & Gạch nợ
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [paymentType, setPaymentType] = React.useState<"receipt" | "disbursement">("receipt");
  const [creating, setCreating] = React.useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = React.useState("");
  const [allocatedItemIds, setAllocatedItemIds] = React.useState<string[]>([]);
  const [formData, setFormData] = React.useState({
    amount: "",
    purpose: "",
    cashAccountId: "",
  });

  // Modal Quản Lý Sổ Quỹ (Tạo mới & Sửa)
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<CashAccountDto | null>(null);
  const [savingAccount, setSavingAccount] = React.useState(false);
  const [accountFormData, setAccountFormData] = React.useState({
    code: "",
    name: "",
    kind: "cash" as "cash" | "bank",
    initialBalance: "0",
  });

  // Đồng bộ tiêu đề vào TopBar
  useSetPageHeader(
    {
      title: "Tài chính & Sổ quỹ",
      subtitle: "Quản trị dòng tiền",
      screenCode: "M16",
      quickViews: [
        { label: "Sổ quỹ / Tài khoản", href: "/tai-chinh?tab=cashbook" },
        { label: "Phải thu khách hàng", href: "/tai-chinh?tab=receivables" },
        { label: "Phải trả nhà cung cấp", href: "/tai-chinh?tab=payables" },
        { label: "Tạm ứng & quyết toán", href: "/tai-chinh?tab=claims" },
      ],
    },
    []
  );

  const switchTab = (tab: "cashbook" | "receivables" | "payables" | "claims") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const url = selectedAccountId
        ? `/api/finance/overview?accountId=${encodeURIComponent(selectedAccountId)}`
        : "/api/finance/overview";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setPayments(data.payments || []);
        setMovements(data.movements || []);
        setReceivables(data.receivables || []);
        setPayables(data.payables || []);

        if (data.accounts?.length > 0) {
          setFormData((prev) =>
            prev.cashAccountId ? prev : { ...prev, cashAccountId: data.accounts[0].id }
          );
        }
      } else {
        toast.error("Không thể tải dữ liệu tài chính");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu tài chính");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPayment = (type: "receipt" | "disbursement") => {
    setPaymentType(type);
    setAllocatedItemIds([]);
    setSelectedPartnerId("");
    setIsPaymentOpen(true);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.cashAccountId) {
      toast.error("Vui lòng điền đủ số tiền và chọn tài khoản quỹ!");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: paymentType,
          amount: parseFloat(formData.amount),
          purpose: formData.purpose || (paymentType === "receipt" ? "Thu tiền khách hàng" : "Chi tiền mua hàng / chi phí"),
          cashAccountId: formData.cashAccountId,
          partnerId: selectedPartnerId || undefined,
          allocatedItemIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Giao dịch thất bại");
      }

      toast.success(
        paymentType === "receipt"
          ? "Lập phiếu thu & Gạch nợ thành công!"
          : "Lập phiếu chi thành công!"
      );
      setIsPaymentOpen(false);
      setFormData({
        amount: "",
        purpose: "",
        cashAccountId: accounts[0]?.id || "",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý giao dịch");
    } finally {
      setCreating(false);
    }
  };

  // Mở modal tạo sổ quỹ
  const handleOpenCreateAccount = () => {
    setEditingAccount(null);
    setAccountFormData({
      code: "",
      name: "",
      kind: "cash",
      initialBalance: "0",
    });
    setIsAccountModalOpen(true);
  };

  // Mở modal sửa sổ quỹ
  const handleOpenEditAccount = (acc: CashAccountDto) => {
    setEditingAccount(acc);
    setAccountFormData({
      code: acc.code,
      name: acc.name,
      kind: acc.kind,
      initialBalance: "0",
    });
    setIsAccountModalOpen(true);
  };

  // Lưu sổ quỹ (Tạo mới hoặc Cập nhật)
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.name.trim()) {
      toast.error("Vui lòng nhập tên sổ quỹ / tài khoản ngân hàng");
      return;
    }

    try {
      setSavingAccount(true);
      if (editingAccount) {
        // Cập nhật
        const res = await fetch(`/api/finance/accounts/${editingAccount.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: accountFormData.name.trim(),
            kind: accountFormData.kind,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Lỗi cập nhật sổ quỹ");
        }
        toast.success("Cập nhật thông tin sổ quỹ thành công!");
      } else {
        // Tạo mới
        const res = await fetch("/api/finance/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: accountFormData.code.trim() || undefined,
            name: accountFormData.name.trim(),
            kind: accountFormData.kind,
            initialBalance: Number(accountFormData.initialBalance) || 0,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Lỗi tạo sổ quỹ");
        }
        toast.success("Thêm sổ quỹ / tài khoản ngân hàng mới thành công!");
      }

      setIsAccountModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu thông tin sổ quỹ");
    } finally {
      setSavingAccount(false);
    }
  };

  // Xóa / Ngưng hoạt động sổ quỹ
  const handleDeleteAccount = async (acc: CashAccountDto) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa / ngưng sử dụng sổ quỹ "${acc.name}" (${acc.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/finance/accounts/${acc.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi xóa sổ quỹ");
      }

      toast.success(`Đã xử lý xóa / ngưng hoạt động sổ quỹ ${acc.name}!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa sổ quỹ");
    }
  };

  const totalCash = accounts.filter((a) => a.kind === "cash").reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalBank = accounts.filter((a) => a.kind === "bank").reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalReceivables = receivables.reduce((sum, r) => sum + r.originalAmount, 0);
  const totalPayables = payables.reduce((sum, p) => sum + p.originalAmount, 0);

  // Thống kê thu gọn cho StatBar
  const stats: StatItem[] = React.useMemo(() => {
    if (loading && accounts.length === 0) {
      return [
        { label: "Tổng Quỹ Tiền Mặt", value: "Đang tải...", color: "emerald" },
        { label: "Tổng Tài Khoản Ngân Hàng", value: "Đang tải...", color: "blue" },
        { label: "Phải Thu Khách Hàng", value: "Đang tải...", color: "amber" },
        { label: "Phải Trả Nhà Cung Cấp", value: "Đang tải...", color: "neutral" },
      ];
    }
    return [
      {
        label: "Tổng Quỹ Tiền Mặt",
        value: `${(totalCash / 1_000_000).toFixed(1)} tr`,
        color: "emerald",
      },
      {
        label: "Tổng Tài Khoản Ngân Hàng",
        value: `${(totalBank / 1_000_000).toFixed(1)} tr`,
        color: "blue",
      },
      {
        label: "Phải Thu Khách Hàng",
        value: `${(totalReceivables / 1_000_000).toFixed(1)} tr`,
        color: "amber",
        highlight: totalReceivables > 0,
      },
      {
        label: "Phải Trả Nhà Cung Cấp",
        value: `${(totalPayables / 1_000_000).toFixed(1)} tr`,
        color: totalPayables > 0 ? "rose" : "neutral",
        highlight: totalPayables > 0,
      },
    ];
  }, [loading, accounts.length, totalCash, totalBank, totalReceivables, totalPayables]);

  // Cột DataTable Biến Động Sổ Quỹ (Nhật ký phát sinh & Số dư sau giao dịch)
  const movementColumns: DataTableColumn<CashMovementDto>[] = [
    {
      id: "paymentCode",
      header: "Mã Phiếu",
      accessorKey: "paymentCode",
      sortable: true,
      width: "w-32 min-w-[120px]",
      permanent: true,
      cell: (m) => (
        <span className="font-mono text-xs font-bold text-blue-600">{m.paymentCode}</span>
      ),
    },
    {
      id: "paidAt",
      header: "Ngày Ghi Sổ",
      accessorKey: "paidAt",
      sortable: true,
      width: "w-28 min-w-[110px]",
      cell: (m) => (
        <span className="text-xs text-slate-600 font-mono">
          {m.paidAt
            ? new Date(m.paidAt).toLocaleDateString("vi-VN")
            : new Date(m.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      id: "direction",
      header: "Nghiệp Vụ",
      accessorKey: "direction",
      sortable: true,
      align: "center",
      width: "w-28 min-w-[110px]",
      cell: (m) =>
        m.direction === "receipt" ? (
          <Badge variant="success" className="text-[11px]">
            + Thu Tiền
          </Badge>
        ) : (
          <Badge variant="danger" className="text-[11px]">
            - Chi Tiền
          </Badge>
        ),
    },
    {
      id: "purpose",
      header: "Nội Dung / Diễn Giải",
      accessorKey: "purpose",
      width: "min-w-[240px]",
      cell: (m) => (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-slate-900 font-medium truncate" title={m.purpose}>
              {m.purpose || "---"}
            </span>
            {m.documentImage && (
              <a
                href={m.documentImage}
                target="_blank"
                rel="noopener noreferrer"
                title="Xem chứng từ đính kèm"
                className="text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px]"
              >
                <Paperclip className="w-2.5 h-2.5" />
                <span>Chứng từ</span>
              </a>
            )}
          </div>
          {m.partnerName && (
            <span className="text-[10px] text-slate-400 truncate">
              Đối tác: {m.partnerName}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "cashAccountName",
      header: "Tài Khoản Quỹ",
      accessorKey: "cashAccountName",
      width: "w-36 min-w-[140px]",
      cell: (m) => (
        <div className="flex items-center gap-1.5">
          {m.cashAccountKind === "cash" ? (
            <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          )}
          <span className="text-xs text-slate-700 font-medium truncate">
            {m.cashAccountName}
          </span>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Số Tiền Phát Sinh",
      accessorKey: "amount",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[140px]",
      cell: (m) => (
        <span
          className={`font-mono text-xs font-bold ${
            m.direction === "receipt" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {m.direction === "receipt" ? "+" : "-"}
          {m.amount.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "runningBalance",
      header: "Số Dư Sau Giao Dịch",
      accessorKey: "runningBalance",
      align: "right",
      width: "w-40 min-w-[150px]",
      cell: (m) => (
        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {(m.runningBalance || 0).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
  ];

  // Cột DataTable Quản Lý Danh Sách Sổ Quỹ
  const accountColumns: DataTableColumn<CashAccountDto>[] = [
    {
      id: "code",
      header: "Mã Sổ",
      accessorKey: "code",
      sortable: true,
      width: "w-28 min-w-[110px]",
      permanent: true,
      cell: (a) => (
        <span className="font-mono text-xs font-bold text-blue-600">{a.code}</span>
      ),
    },
    {
      id: "name",
      header: "Tên Sổ Quỹ / Tài Khoản Ngân Hàng",
      accessorKey: "name",
      sortable: true,
      width: "min-w-[260px]",
      cell: (a) => (
        <div className="flex items-center gap-2 py-0.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            a.kind === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
          }`}>
            {a.kind === "cash" ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-xs block">{a.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {a.kind === "cash" ? "Quỹ tiền mặt vật lý" : "Tài khoản thanh toán ngân hàng"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "kind",
      header: "Loại Hình",
      accessorKey: "kind",
      sortable: true,
      align: "center",
      width: "w-32 min-w-[120px]",
      cell: (a) => (
        <Badge variant={a.kind === "cash" ? "success" : "info"}>
          {a.kind === "cash" ? "Tiền Mặt" : "Ngân Hàng"}
        </Badge>
      ),
    },
    {
      id: "balance",
      header: "Số Dư Hiện Tại",
      accessorKey: "balance",
      sortable: true,
      align: "right",
      width: "w-40 min-w-[150px]",
      cell: (a) => (
        <span className={`font-mono text-sm font-bold ${
          a.balance >= 0 ? "text-slate-900" : "text-rose-600"
        }`}>
          {a.balance.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng Thái",
      align: "center",
      width: "w-28 min-w-[110px]",
      cell: (a) => (
        <Badge variant={a.isActive !== false ? "success" : "neutral"}>
          {a.isActive !== false ? "Đang dùng" : "Ngưng dùng"}
        </Badge>
      ),
    },
  ];

  const accountRowActions: DataTableRowAction<CashAccountDto>[] = [
    {
      icon: <History className="w-3.5 h-3.5 text-blue-600" />,
      title: "Xem biến động phát sinh",
      onClick: (a) => {
        setSelectedAccountId(a.id);
        switchTab("cashbook");
      },
    },
    {
      icon: <Edit2 className="w-3.5 h-3.5 text-slate-600" />,
      title: "Sửa thông tin sổ",
      onClick: (a) => handleOpenEditAccount(a),
    },
    {
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      title: "Xóa / Ngưng sử dụng",
      onClick: (a) => handleDeleteAccount(a),
    },
  ];

  // Cột DataTable Công Nợ
  const openItemColumns: DataTableColumn<OpenItemDto>[] = [
    {
      id: "partnerCode",
      header: "Mã Đối Tác",
      accessorKey: "partnerCode",
      sortable: true,
      width: "w-32 min-w-[130px]",
      permanent: true,
      cell: (i) => (
        <span className="font-mono text-xs font-bold text-blue-600">{i.partnerCode}</span>
      ),
    },
    {
      id: "partnerName",
      header: "Tên Khách Hàng / Nhà Cung Cấp",
      accessorKey: "partnerName",
      sortable: true,
      width: "min-w-[240px]",
      cell: (i) => (
        <Tooltip content={i.partnerName}>
          <span className="font-medium text-slate-900 truncate block max-w-[260px] text-xs">
            {i.partnerName}
          </span>
        </Tooltip>
      ),
    },
    {
      id: "dueDate",
      header: "Hạn Thanh Toán",
      accessorKey: "dueDate",
      sortable: true,
      align: "center",
      width: "w-32 min-w-[120px]",
      cell: (i) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(i.dueDate).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      id: "originalAmount",
      header: "Số Tiền Gốc",
      accessorKey: "originalAmount",
      sortable: true,
      align: "right",
      width: "w-32 min-w-[120px]",
      cell: (i) => (
        <span className="font-mono text-xs text-slate-500">
          {i.originalAmount.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "remainingAmount",
      header: "Còn Phải Thu/Trả",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[140px]",
      cell: (i) => {
        const rem = i.remainingAmount !== undefined ? i.remainingAmount : i.originalAmount;
        return (
          <span className={`font-mono text-xs font-bold ${rem > 0 ? "text-amber-700" : "text-emerald-600"}`}>
            {rem.toLocaleString("vi-VN")} đ
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Trạng Thái",
      accessorKey: "status",
      align: "center",
      width: "w-28 min-w-[110px]",
      cell: (i) => {
        const rem = i.remainingAmount !== undefined ? i.remainingAmount : i.originalAmount;
        return (
          <Badge variant={rem <= 0 ? "success" : i.status === "confirmed" ? "warning" : "neutral"}>
            {rem <= 0 ? "Đã tất toán" : "Còn nợ"}
          </Badge>
        );
      },
    },
  ];

  const handleOpenPaymentForItem = (item: OpenItemDto) => {
    setSelectedPartnerId(item.partnerId);
    setPaymentType(item.side === "receivable" ? "receipt" : "disbursement");
    setAllocatedItemIds([item.id]);
    setIsPaymentOpen(true);
  };

  const openItemRowActions: DataTableRowAction<OpenItemDto>[] = [
    {
      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Thanh toán & Gạch nợ khoản này",
      onClick: (i) => handleOpenPaymentForItem(i),
    },
  ];

  return (
    <div className="w-full flex flex-col space-y-3 flex-1">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTab("cashbook")}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "cashbook"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Sổ Quỹ / Tài Khoản</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("receivables")}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "receivables"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Phải Thu Khách Hàng</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("payables")}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "payables"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>Phải Trả Nhà Cung Cấp</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("claims")}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "claims"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-600" />
            <span>Tạm Ứng Hiện Trường</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SỔ QUỸ & TÀI KHOẢN (TOP: THẺ TÀI KHOẢN + CRUD; BOTTOM: BIẾN ĐỘNG SỔ QUỸ & THU CHI) */}
      {activeTab === "cashbook" && (
        <div className="space-y-4">
          {/* KHỐI SỔ QUỸ & TÀI KHOẢN (THÊM / SỬA / XÓA / SỐ DƯ ĐẦU KỲ & XEM BIẾN ĐỘNG) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Danh Sách Sổ Quỹ & Tài Khoản Ngân Hàng {loading && accounts.length === 0 ? "" : `(${accounts.length})`}
                </h3>
              </div>
              {canManageAccounts && (
                <Button
                  size="sm"
                  onClick={handleOpenCreateAccount}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs h-7"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm sổ quỹ mới</span>
                </Button>
              )}
            </div>

            {/* Grid các thẻ tài khoản: Hiện skeleton khi đang tải từ database */}
            {loading && accounts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs animate-pulse space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                      <div className="h-3 w-14 bg-slate-100 rounded" />
                    </div>
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                    <div className="h-5 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded pt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {/* Thẻ xem toàn bộ các sổ */}
                <div
                  onClick={() => setSelectedAccountId("")}
                  className={`p-3 rounded-lg border cursor-pointer transition text-xs flex flex-col justify-between ${
                    !selectedAccountId
                      ? "border-blue-500 bg-white ring-2 ring-blue-500/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-800">Tất cả sổ quỹ</span>
                    <Badge variant={!selectedAccountId ? "info" : "neutral"} className="text-[10px]">
                      {!selectedAccountId ? "Đang chọn xem" : "Tổng hợp"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400">Tổng số dư khả dụng:</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                    {accounts.reduce((s, a) => s + (a.balance || 0), 0).toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center text-[11px] text-blue-600 font-medium">
                  <History className="w-3 h-3 mr-1" />
                  <span>Xem toàn bộ biến động</span>
                </div>
              </div>

              {/* Các thẻ sổ quỹ cụ thể */}
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <div
                    key={acc.id}
                    className={`p-3 rounded-lg border transition text-xs flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-500 bg-white ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                            acc.kind === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {acc.kind === "cash" ? <Wallet className="w-3 h-3" /> : <Landmark className="w-3 h-3" />}
                          </span>
                          <span className="font-bold text-slate-900 truncate" title={acc.name}>
                            {acc.name}
                          </span>
                        </div>
                        <Badge variant={acc.isActive !== false ? "success" : "neutral"} className="text-[9px] px-1 py-0 shrink-0">
                          {acc.isActive !== false ? "Hoạt động" : "Ngưng dùng"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">{acc.code}</span>
                        <span>{acc.kind === "cash" ? "Tiền mặt" : "Ngân hàng"}</span>
                      </div>

                      <div className="font-mono text-base font-bold text-slate-900 mt-1">
                        {(acc.balance || 0).toLocaleString("vi-VN")} đ
                      </div>
                    </div>

                    {/* Thao tác nhanh trên thẻ: Xem biến động / Sửa / Xóa */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`text-[11px] font-medium flex items-center gap-1 transition ${
                          isSelected ? "text-blue-700 font-bold" : "text-slate-600 hover:text-blue-600"
                        }`}
                      >
                        <History className="w-3 h-3" />
                        <span>{isSelected ? "Đang lọc xem" : "Xem biến động"}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAccount(acc);
                          }}
                          title="Sửa thông tin sổ"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAccount(acc);
                          }}
                          title="Xóa / Ngưng sử dụng sổ"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

          {/* BẢNG BIẾN ĐỘNG SỔ QUỸ & LỊCH SỬ THU CHI */}
          <div className="space-y-2">
            {selectedAccountId && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs">
                <div className="flex items-center gap-1.5 text-blue-800">
                  <History className="w-3.5 h-3.5" />
                  <span>
                    Đang lọc biến động sổ: <strong>{accounts.find((a) => a.id === selectedAccountId)?.name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAccountId("")}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline text-[11px]"
                >
                  Xem tất cả các sổ
                </button>
              </div>
            )}

            <DataTable
              data={movements}
              columns={movementColumns}
              keyExtractor={(item) => item.id}
              searchable
              searchPlaceholder="Tìm mã phiếu, nội dung, đối tác..."
              searchValue={keyword}
              onSearchChange={setKeyword}
              stats={stats}
              defaultShowStats={true}
              onRefresh={fetchData}
              loading={loading}
              primaryAction={
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleOpenPayment("receipt")}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 shadow-sm bg-slate-900 hover:bg-slate-800 text-white font-medium h-8"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Lập phiếu Thu</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenPayment("disbursement")}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 shadow-sm bg-white hover:bg-slate-100 text-slate-800 font-medium border border-slate-300 h-8"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                    <span>- Lập phiếu Chi</span>
                  </Button>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* TAB 3: PHẢI THU KHÁCH HÀNG */}
      {activeTab === "receivables" && (
        <DataTable
          data={receivables}
          columns={openItemColumns}
          rowActions={openItemRowActions}
          keyExtractor={(item) => item.id}
          searchable
          searchPlaceholder="Tìm đối tác..."
          searchValue={keyword}
          onSearchChange={setKeyword}
          stats={stats}
          defaultShowStats={true}
          onRefresh={fetchData}
          loading={loading}
          primaryAction={
            <Button
              size="sm"
              onClick={() => handleOpenPayment("receipt")}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 shadow-sm bg-slate-900 hover:bg-slate-800 text-white font-medium h-8"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ Thu nợ khách</span>
            </Button>
          }
        />
      )}

      {/* TAB 4: PHẢI TRẢ NHÀ CUNG CẤP */}
      {activeTab === "payables" && (
        <DataTable
          data={payables}
          columns={openItemColumns}
          rowActions={openItemRowActions}
          keyExtractor={(item) => item.id}
          searchable
          searchPlaceholder="Tìm NCC..."
          searchValue={keyword}
          onSearchChange={setKeyword}
          stats={stats}
          defaultShowStats={true}
          onRefresh={fetchData}
          loading={loading}
          primaryAction={
            <Button
              size="sm"
              onClick={() => handleOpenPayment("disbursement")}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 shadow-sm bg-slate-900 hover:bg-slate-800 text-white font-medium h-8"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>- Trả nợ NCC</span>
            </Button>
          }
        />
      )}

      {/* TAB 5: TẠM ỨNG HIỆN TRƯỜNG */}
      {activeTab === "claims" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="font-semibold text-slate-800 text-sm">Hồ Sơ Tạm Ứng & Quyết Toán Chi Phí Thợ Hiện Trường</h4>
            <span className="text-slate-400">Đối soát với phiếu chi tạm ứng ban đầu</span>
          </div>

          <div className="space-y-2">
            <div className="p-3 border rounded-xl bg-slate-50/50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Nguyễn Văn Thợ (NV-THO) - Biển Vincom Ocean Park</p>
                <p className="text-[11px] text-slate-500">
                  Tạm ứng: 5.000.000 đ • Thực chi (Ốc vít, que hàn mua lẻ, thuê cẩu): 4.850.000 đ
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-emerald-700">Hoàn ứng: +150.000 đ</span>
                <Badge variant="success">Đã quyết toán</Badge>
              </div>
            </div>

            <div className="p-3 border rounded-xl bg-slate-50/50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Lê Văn Lái (NV-LAI) - Chuyến xe 29H-888.88</p>
                <p className="text-[11px] text-slate-500">
                  Tạm ứng: 1.000.000 đ • Thực chi vé BOT + xăng dầu: 1.150.000 đ
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-rose-700">Chi bổ sung: 150.000 đ</span>
                <Badge variant="warning">Chờ kế toán chi</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO & SỬA SỔ QUỸ / TÀI KHOẢN NGÂN HÀNG */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={editingAccount ? `Sửa Sổ Quỹ: ${editingAccount.name}` : "Thêm Sổ Quỹ / Tài Khoản Ngân Hàng Mới"}
      >
        <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Tên Sổ Quỹ / Tài Khoản <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Két tiền mặt xưởng, Vietcombank - CN Thăng Long..."
              value={accountFormData.name}
              onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Loại Sổ Quỹ <span className="text-rose-500">*</span>
              </label>
              <select
                value={accountFormData.kind}
                onChange={(e) => setAccountFormData({ ...accountFormData, kind: e.target.value as any })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="cash">Tiền mặt tại quỹ / két</option>
                <option value="bank">Tài khoản ngân hàng</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Mã sổ (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="VD: TM-01, VCB-01"
                value={accountFormData.code}
                onChange={(e) => setAccountFormData({ ...accountFormData, code: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {!editingAccount && (
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Số dư ban đầu khi tạo sổ (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                value={accountFormData.initialBalance}
                onChange={(e) => setAccountFormData({ ...accountFormData, initialBalance: e.target.value })}
                placeholder="VD: 50000000"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                (Hệ thống sẽ tự động tạo một bút toán nạp số dư ban đầu vào sổ quỹ này)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAccountModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={savingAccount}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              {savingAccount ? "Đang lưu..." : editingAccount ? "Lưu thay đổi" : "Tạo sổ quỹ"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL LẬP PHIẾU THU / CHI & GẠCH NỢ DÙNG CHUNG */}
      <DebtPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedPartnerId("");
          setAllocatedItemIds([]);
        }}
        type={paymentType}
        partnerId={selectedPartnerId || undefined}
        partnerName={
          selectedPartnerId
            ? (paymentType === "receipt" ? receivables : payables).find((i) => i.partnerId === selectedPartnerId)?.partnerName
            : undefined
        }
        partnerCode={
          selectedPartnerId
            ? (paymentType === "receipt" ? receivables : payables).find((i) => i.partnerId === selectedPartnerId)?.partnerCode
            : undefined
        }
        openItems={(paymentType === "receipt" ? receivables : payables)
          .filter((i) => !selectedPartnerId || i.partnerId === selectedPartnerId)
          .map((i) => ({
            id: i.id,
            originalAmount: i.originalAmount,
            allocatedAmount: i.allocatedAmount,
            remainingAmount: i.remainingAmount !== undefined ? i.remainingAmount : i.originalAmount,
            dueDate: i.dueDate,
            orderCode: i.partnerCode,
            status: i.status,
            createdAt: i.createdAt,
          }))}
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          kind: a.kind as "cash" | "bank",
          balance: a.balance,
        }))}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
