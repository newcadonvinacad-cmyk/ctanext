"use client";

import * as React from "react";
import { Modal, Button, Badge, toast } from "@/components/ui";
import {
  CheckCircle2,
  DollarSign,
  ListChecks,
  Wallet,
  AlertCircle,
  Search,
  User,
  Building2,
  ChevronDown,
  Check,
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

export interface OpenItemPaymentTarget {
  id: string;
  originalAmount: number;
  allocatedAmount?: number;
  remainingAmount: number;
  dueDate?: string;
  orderCode?: string | null;
  status?: string;
  partnerId?: string;
  partnerCode?: string;
  partnerName?: string;
  createdAt?: string;
}

export interface CashAccountOption {
  id: string;
  name: string;
  kind: "cash" | "bank";
  balance?: number;
}

export interface PartnerOption {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  totalDebt?: number;
}

export interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "receipt" | "disbursement"; // receipt: thu nợ khách, disbursement: trả nợ NCC
  partnerId?: string;
  partnerName?: string;
  partnerCode?: string;
  openItems?: OpenItemPaymentTarget[];
  accounts: CashAccountOption[];
  onSuccess: () => void;
}

export function DebtPaymentModal({
  isOpen,
  onClose,
  type,
  partnerId: initialPartnerId,
  partnerName: initialPartnerName,
  partnerCode: initialPartnerCode,
  openItems: initialOpenItems = [],
  accounts = [],
  onSuccess,
}: DebtPaymentModalProps) {
  const isReceipt = type === "receipt";

  // Danh sách đối tác load từ API
  const [partnerList, setPartnerList] = React.useState<PartnerOption[]>([]);
  const [loadingPartners, setLoadingPartners] = React.useState(false);

  // Đối tác được chọn
  const [selectedPartner, setSelectedPartner] = React.useState<PartnerOption | null>(null);
  const [partnerSearch, setPartnerSearch] = React.useState("");
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = React.useState(false);
  const partnerDropdownRef = React.useRef<HTMLDivElement>(null);

  // Danh sách đơn nợ của đối tác được chọn
  const [partnerOpenItems, setPartnerOpenItems] = React.useState<OpenItemPaymentTarget[]>([]);
  const [loadingOpenItems, setLoadingOpenItems] = React.useState(false);
  const [itemSearch, setItemSearch] = React.useState("");

  // Chế độ: by_amount (Theo số tiền) | by_items (Theo đơn)
  const [mode, setMode] = React.useState<"by_items" | "by_amount">("by_amount");
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);
  const [amount, setAmount] = React.useState<string>("");
  const [cashAccountId, setCashAccountId] = React.useState<string>("");
  const [purpose, setPurpose] = React.useState<string>("");
  const [paidAt, setPaidAt] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Chứng từ đính kèm (Ủy nhiệm chi, hóa đơn, biên lai)
  const [documentImage, setDocumentImage] = React.useState<string | null>(null);
  const [documentFileName, setDocumentFileName] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dung lượng file tối đa là 10MB");
      return;
    }

    setDocumentFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setDocumentImage(null);
    setDocumentFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 1. Tải danh sách đối tác (Khách hàng hoặc NCC)
  const fetchPartners = React.useCallback(async () => {
    try {
      setLoadingPartners(true);
      const url = isReceipt ? "/api/crm/customers?limit=500" : "/api/procurement/suppliers";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list: PartnerOption[] = isReceipt
          ? (data.customers || []).map((c: any) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              phone: c.phone,
              totalDebt: c.totalReceivable || 0,
            }))
          : (data.suppliers || []).map((s: any) => ({
              id: s.id,
              code: s.code,
              name: s.name,
              phone: s.phone,
              totalDebt: s.totalPayable || 0,
            }));
        setPartnerList(list);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách đối tác:", err);
    } finally {
      setLoadingPartners(false);
    }
  }, [isReceipt]);

  // 2. Tải danh sách hóa đơn/đơn nợ của đối tác được chọn
  const fetchPartnerOpenItems = React.useCallback(async (pId: string) => {
    try {
      setLoadingOpenItems(true);
      const side = isReceipt ? "receivable" : "payable";
      const res = await fetch(`/api/finance/open-items?side=${side}&partnerId=${pId}`);
      if (res.ok) {
        const data = await res.json();
        const items: OpenItemPaymentTarget[] = (data.items || []).map((oi: any) => ({
          id: oi.id,
          originalAmount: oi.originalAmount,
          allocatedAmount: oi.allocatedAmount,
          remainingAmount: oi.remainingAmount ?? oi.originalAmount,
          dueDate: oi.dueDate,
          orderCode: oi.orderCode || oi.purchaseOrderCode,
          status: oi.status,
          partnerId: oi.partnerId,
          createdAt: oi.createdAt,
        }));
        setPartnerOpenItems(items);
      }
    } catch (err) {
      console.error("Lỗi tải công nợ đối tác:", err);
    } finally {
      setLoadingOpenItems(false);
    }
  }, [isReceipt]);

  // Reset & Init khi Modal mở
  React.useEffect(() => {
    if (isOpen) {
      fetchPartners();
      setPaidAt(new Date().toISOString().split("T")[0]);
      setDocumentImage(null);
      setDocumentFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (accounts.length > 0 && !cashAccountId) {
        setCashAccountId(accounts[0].id);
      }

      // Nếu có sẵn partnerId truyền từ prop (ví dụ mở từ Drawer khách / NCC)
      if (initialPartnerId) {
        const pObj: PartnerOption = {
          id: initialPartnerId,
          code: initialPartnerCode || "",
          name: initialPartnerName || "",
        };
        setSelectedPartner(pObj);
        setPartnerSearch(`${pObj.name} (${pObj.code})`);

        if (initialOpenItems.length > 0) {
          setPartnerOpenItems(initialOpenItems);
        } else {
          fetchPartnerOpenItems(initialPartnerId);
        }
      } else {
        setSelectedPartner(null);
        setPartnerSearch("");
        setPartnerOpenItems([]);
        setAmount("");
      }

      setSelectedItemIds([]);
      setMode("by_amount");
    }
  }, [isOpen, initialPartnerId, initialPartnerCode, initialPartnerName, initialOpenItems, accounts, cashAccountId, fetchPartners, fetchPartnerOpenItems]);

  // Đóng dropdown khi click ra ngoài
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(e.target as Node)) {
        setIsPartnerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Khi chọn 1 đối tác từ dropdown
  const handleSelectPartner = (p: PartnerOption) => {
    setSelectedPartner(p);
    setPartnerSearch(`${p.name} (${p.code})`);
    setIsPartnerDropdownOpen(false);
    setSelectedItemIds([]);
    setItemSearch("");

    const defPurpose = isReceipt
      ? `Thu tiền công nợ khách hàng ${p.name} (${p.code})`
      : `Thanh toán công nợ nhà cung cấp ${p.name} (${p.code})`;
    setPurpose(defPurpose);

    fetchPartnerOpenItems(p.id);
  };

  // Danh sách đơn chưa trả hết (> 0) của đối tác hiện tại
  const unpaidItems = React.useMemo(() => {
    return partnerOpenItems.filter((item) => (item.remainingAmount ?? item.originalAmount) > 0);
  }, [partnerOpenItems]);

  // Lọc danh sách đơn theo ô tìm kiếm mã đơn
  const filteredUnpaidItems = React.useMemo(() => {
    if (!itemSearch.trim()) return unpaidItems;
    const kw = itemSearch.trim().toLowerCase();
    return unpaidItems.filter((item) =>
      (item.orderCode || "").toLowerCase().includes(kw) || item.id.toLowerCase().includes(kw)
    );
  }, [unpaidItems, itemSearch]);

  const totalUnpaid = React.useMemo(() => {
    return unpaidItems.reduce((sum, item) => sum + (item.remainingAmount ?? item.originalAmount), 0);
  }, [unpaidItems]);

  // Cập nhật số tiền mặc định khi chọn đối tác và có dữ liệu đơn
  React.useEffect(() => {
    if (selectedPartner) {
      if (totalUnpaid > 0) {
        setAmount(totalUnpaid.toString());
      } else {
        setAmount("");
      }
    }
  }, [selectedPartner, totalUnpaid]);

  // Lọc đối tác trong dropdown theo từ khóa tìm kiếm
  const filteredPartners = React.useMemo(() => {
    if (!partnerSearch.trim() || (selectedPartner && partnerSearch === `${selectedPartner.name} (${selectedPartner.code})`)) {
      return partnerList;
    }
    const kw = partnerSearch.trim().toLowerCase();
    return partnerList.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.code.toLowerCase().includes(kw) ||
        (p.phone && p.phone.includes(kw))
    );
  }, [partnerList, partnerSearch, selectedPartner]);

  // Khi chọn theo danh sách đơn: tự động tính tổng tiền các đơn được chọn
  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId];
      const sum = unpaidItems
        .filter((it) => next.includes(it.id))
        .reduce((s, it) => s + (it.remainingAmount ?? it.originalAmount), 0);
      setAmount(sum > 0 ? sum.toString() : "");
      return next;
    });
  };

  const handleSelectAllFilteredItems = () => {
    const filteredIds = filteredUnpaidItems.map((it) => it.id);
    const isAllChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedItemIds.includes(id));

    if (isAllChecked) {
      // Bỏ chọn các đơn đang được lọc
      const next = selectedItemIds.filter((id) => !filteredIds.includes(id));
      setSelectedItemIds(next);
      const sum = unpaidItems
        .filter((it) => next.includes(it.id))
        .reduce((s, it) => s + (it.remainingAmount ?? it.originalAmount), 0);
      setAmount(sum > 0 ? sum.toString() : "");
    } else {
      // Chọn tất cả các đơn đang được lọc
      const next = Array.from(new Set([...selectedItemIds, ...filteredIds]));
      setSelectedItemIds(next);
      const sum = unpaidItems
        .filter((it) => next.includes(it.id))
        .reduce((s, it) => s + (it.remainingAmount ?? it.originalAmount), 0);
      setAmount(sum > 0 ? sum.toString() : "");
    }
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPartner) {
      toast.error(isReceipt ? "Vui lòng chọn khách hàng cần thu nợ" : "Vui lòng chọn nhà cung cấp cần trả nợ");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0");
      return;
    }

    if (!cashAccountId) {
      toast.error("Vui lòng chọn tài khoản/quỹ tiền thực hiện giao dịch");
      return;
    }

    if (mode === "by_items" && selectedItemIds.length === 0) {
      toast.error("Vui lòng tích chọn ít nhất 1 đơn nợ cần thanh toán hoặc đổi sang chế độ 'Theo số tiền'");
      return;
    }

    setIsSubmitting(true);
    try {
      let allocations: Array<{ openItemId: string; amount: number }> | undefined = undefined;
      let allocatedItemIds: string[] | undefined = undefined;

      if (mode === "by_items" && selectedItemIds.length > 0) {
        let remainingToDistribute = numAmount;
        allocations = [];
        for (const itemId of selectedItemIds) {
          if (remainingToDistribute <= 0) break;
          const target = unpaidItems.find((it) => it.id === itemId);
          const itemDebt = target ? (target.remainingAmount ?? target.originalAmount) : 0;
          const alloc = Math.min(remainingToDistribute, itemDebt);
          if (alloc > 0) {
            allocations.push({ openItemId: itemId, amount: alloc });
            remainingToDistribute -= alloc;
          }
        }
        allocatedItemIds = selectedItemIds;
      } else if (unpaidItems.length > 0) {
        // Chế độ theo số tiền: tự động gạch nợ các đơn còn nợ theo thứ tự ngày đến hạn
        allocatedItemIds = unpaidItems.map((it) => it.id);
      }

      const payload = {
        direction: isReceipt ? "receipt" : "disbursement",
        amount: numAmount,
        purpose: purpose.trim() || (isReceipt ? `Thu nợ ${selectedPartner.name}` : `Trả nợ ${selectedPartner.name}`),
        cashAccountId,
        partnerId: selectedPartner.id,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        documentImage: documentImage || undefined,
        allocations,
        allocatedItemIds,
      };

      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể ghi nhận thanh toán");
      }

      toast.success(
        isReceipt
          ? `Đã lập phiếu thu thành công và gạch nợ ${numAmount.toLocaleString("vi-VN")} đ`
          : `Đã lập phiếu chi thành công và gạch nợ ${numAmount.toLocaleString("vi-VN")} đ`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý giao dịch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isReceipt
          ? `Lập Phiếu Thu Tiền & Gạch Nợ Khách Hàng`
          : `Lập Phiếu Chi Tiền & Thanh Toán Nhà Cung Cấp`
      }
      description="Chọn đối tác, sau đó chọn thanh toán theo số tiền hoặc chọn cụ thể từng đơn hàng cần gạch nợ"
      maxWidth="2xl"
      zIndex="z-[80]"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* KHỐI 1: DROPDOWN CHỌN ĐỐI TÁC CÓ Ô TÌM KIẾM */}
        <div ref={partnerDropdownRef} className="relative">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            {isReceipt ? "Khách hàng thụ nợ:" : "Nhà cung cấp nhận thanh toán:"}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={isReceipt ? "Gõ tìm tên khách hàng, mã KH hoặc SĐT..." : "Gõ tìm tên nhà cung cấp hoặc mã NCC..."}
              value={partnerSearch}
              onFocus={() => setIsPartnerDropdownOpen(true)}
              onChange={(e) => {
                setPartnerSearch(e.target.value);
                setIsPartnerDropdownOpen(true);
              }}
              className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <button
              type="button"
              onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Menu Dropdown kết quả tìm kiếm đối tác */}
          {isPartnerDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
              {loadingPartners ? (
                <div className="p-3 text-center text-slate-400">Đang tải danh sách...</div>
              ) : filteredPartners.length === 0 ? (
                <div className="p-3 text-center text-slate-400">Không tìm thấy đối tác phù hợp</div>
              ) : (
                filteredPartners.map((p) => {
                  const isSelected = selectedPartner?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPartner(p)}
                      className={`w-full p-2.5 text-left flex items-center justify-between hover:bg-blue-50/70 transition ${
                        isSelected ? "bg-blue-50 font-semibold" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isReceipt ? (
                          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-blue-700 bg-slate-100 px-1 rounded">
                              {p.code}
                            </span>
                            <span className="text-slate-900">{p.name}</span>
                          </div>
                          {p.phone && <span className="text-[10px] text-slate-400">{p.phone}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        {p.totalDebt !== undefined && p.totalDebt > 0 ? (
                          <span className="font-mono text-xs font-bold text-rose-600">
                            Nợ: {p.totalDebt.toLocaleString("vi-VN")} đ
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium">Hết nợ</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* BANNER TỔNG DƯ NỢ CỦA ĐỐI TÁC ĐÃ CHỌN */}
        {selectedPartner && (
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              isReceipt
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div>
              <span className="text-[11px] font-medium block">
                {isReceipt ? `Dư nợ hiện tại của ${selectedPartner.name}:` : `Dư nợ phải trả ${selectedPartner.name}:`}
              </span>
              <span className="text-base font-bold font-mono">
                {totalUnpaid.toLocaleString("vi-VN")} đ
              </span>
              <span className="text-[10px] ml-2 opacity-80">
                ({unpaidItems.length} đơn/hóa đơn chưa thanh toán hết)
              </span>
            </div>

            {totalUnpaid > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (mode === "by_items") {
                    setSelectedItemIds(unpaidItems.map((it) => it.id));
                    setAmount(totalUnpaid.toString());
                  } else {
                    handleQuickAmount(totalUnpaid);
                  }
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold shadow-sm transition ${
                  isReceipt
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                Tất toán toàn bộ
              </button>
            )}
          </div>
        )}

        {/* KHỐI 2: TAB CHỌN KIỂU THANH TOÁN (THEO SỐ TIỀN / THEO ĐƠN) */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setMode("by_amount")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
              mode === "by_amount"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Thanh toán theo số tiền</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("by_items")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition ${
              mode === "by_items"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Thanh toán chọn theo đơn ({unpaidItems.length})</span>
          </button>
        </div>

        {/* NẾU CHỌN CHẾ ĐỘ THEO ĐƠN: CÓ Ô TÌM KIẾM ĐƠN VÀ DANH SÁCH CHECKBOX */}
        {mode === "by_items" && (
          <div className="space-y-2">
            {!selectedPartner ? (
              <div className="p-4 text-center rounded-lg border border-dashed border-slate-200 text-slate-400 bg-slate-50">
                Vui lòng chọn {isReceipt ? "khách hàng" : "nhà cung cấp"} ở phía trên để tải danh sách đơn nợ
              </div>
            ) : loadingOpenItems ? (
              <div className="p-4 text-center text-slate-400">Đang tải danh sách hóa đơn nợ...</div>
            ) : unpaidItems.length === 0 ? (
              <div className="p-4 text-center rounded-lg border border-dashed border-slate-200 text-emerald-600 font-medium bg-emerald-50/50">
                Đối tác này hiện không có khoản nợ nào cần thanh toán
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Tìm mã đơn hàng (SO / PO)..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllFilteredItems}
                    className="text-blue-600 hover:underline font-semibold text-xs whitespace-nowrap"
                  >
                    {filteredUnpaidItems.every((it) => selectedItemIds.includes(it.id))
                      ? "Bỏ chọn các đơn này"
                      : `Chọn tất cả (${filteredUnpaidItems.length})`}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {filteredUnpaidItems.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">Không tìm thấy đơn nợ phù hợp từ khóa</div>
                  ) : (
                    filteredUnpaidItems.map((item) => {
                      const rem = item.remainingAmount ?? item.originalAmount;
                      const isChecked = selectedItemIds.includes(item.id);

                      return (
                        <label
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded border cursor-pointer transition ${
                            isChecked
                              ? "bg-blue-50/80 border-blue-300"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem(item.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <div>
                              <p className="font-semibold text-slate-800 font-mono">
                                {item.orderCode || `Đơn nợ #${item.id.slice(0, 8)}`}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.dueDate ? `Hạn: ${new Date(item.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn trả"}
                                {item.allocatedAmount ? ` • Đã thanh toán: ${item.allocatedAmount.toLocaleString("vi-VN")} đ` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              {rem.toLocaleString("vi-VN")} đ
                            </span>
                            <span className="text-[9px] text-slate-400">
                              Gốc: {item.originalAmount.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* KHỐI 3: Ô NHẬP SỐ TIỀN THANH TOÁN */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Số tiền thanh toán (VNĐ) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              required
              min={1}
              placeholder="VD: 15000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {amount && !isNaN(Number(amount)) && (
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                {Number(amount).toLocaleString("vi-VN")} đ
              </span>
            )}
          </div>

          {/* Nút bấm nhanh số tiền */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {totalUnpaid > 0 && (
              <button
                type="button"
                onClick={() => handleQuickAmount(totalUnpaid)}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-medium border border-blue-200"
              >
                Tất toán ({totalUnpaid.toLocaleString("vi-VN")} đ)
              </button>
            )}
            {totalUnpaid > 0 && (
              <button
                type="button"
                onClick={() => handleQuickAmount(Math.round(totalUnpaid / 2))}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
              >
                Trả 50%
              </button>
            )}
            <button
              type="button"
              onClick={() => handleQuickAmount(5000000)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
            >
              5 triệu
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(10000000)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
            >
              10 triệu
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(20000000)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
            >
              20 triệu
            </button>
          </div>
        </div>

        {/* KHỐI 4: CHỌN SỔ QUỸ TIỀN MẶT / NGÂN HÀNG */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            {isReceipt ? "Thu vào Sổ quỹ / Tài khoản:" : "Trích từ Sổ quỹ / Tài khoản:"}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={cashAccountId}
            onChange={(e) => setCashAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.kind === "cash" ? "Quỹ tiền mặt" : "Ngân hàng"}) - Số dư:{" "}
                {(acc.balance || 0).toLocaleString("vi-VN")} đ
              </option>
            ))}
          </select>
        </div>

        {/* KHỐI 5: NỘI DUNG VÀ NGÀY GIAO DỊCH */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Lý do / Nội dung chứng từ: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Ngày chứng từ:</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* KHỐI 6: ĐÍNH KÈM CHỨNG TỪ (ỦY NHIỆM CHI / BIÊN LAI / HÓA ĐƠN) */}
        <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/60">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>Chứng từ đính kèm (Ủy nhiệm chi, biên lai, hóa đơn...):</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            {!documentImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 px-2.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1 font-medium"
              >
                <Upload className="w-3 h-3" />
                <span>Tải file lên</span>
              </Button>
            )}
          </div>

          {documentImage ? (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {documentImage.startsWith("data:image/") ? (
                  <img
                    src={documentImage}
                    alt="Chứng từ preview"
                    className="w-12 h-12 object-cover rounded border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">
                    {documentFileName || "Chứng từ đính kèm"}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">✓ Đã sẵn sàng lưu cùng phiếu</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-slate-400 hover:text-rose-600 h-7 w-7 p-0 rounded-full"
                title="Gỡ bỏ file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="text-center py-2 cursor-pointer hover:bg-slate-100/60 rounded-lg transition"
            >
              <p className="text-[11px] text-slate-500">
                Nhấp để chọn ảnh chụp chứng từ hoặc kéo thả file vào đây (PNG, JPG, PDF tối đa 10MB)
              </p>
            </div>
          )}
        </div>

        {/* NÚT HÀNH ĐỘNG */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting || !selectedPartner}
            className={`font-semibold flex items-center gap-1.5 text-white ${
              isReceipt ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {isSubmitting
                ? "Đang ghi nhận..."
                : isReceipt
                ? "Xác nhận thu tiền & Gạch nợ"
                : "Xác nhận chi tiền & Gạch nợ"}
            </span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
