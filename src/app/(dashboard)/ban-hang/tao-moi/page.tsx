"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  PackageCheck,
  Receipt,
  Building2,
  AlertTriangle,
  Layers,
  Box,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Truck,
} from "lucide-react";
import { Button, Badge, Input, toast } from "@/components/ui";

interface OrderLine {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  qty: number;
  maxQty?: number;
  unit: string;
  unitId?: string;
  unitPrice: number;
  discountPercent: number;
  lotId?: string;
  lotCode?: string;
  warehouseId?: string;
  warehouseName?: string;
  productionOrderLineId?: string;
  productionCode?: string;
}

interface AvailableProduct {
  warehouse_id: string;
  warehouse_name: string;
  item_id: string;
  item_code: string;
  item_name: string;
  base_unit_id: string;
  unit_name: string;
  lot_id: string;
  lot_code: string;
  design_proof_id?: string;
  production_order_line_id: string;
  production_order_id: string;
  line_title: string;
  production_code: string;
  available_qty: number | string;
}

export default function TaoMoiDonBanHangPage() {
  const router = useRouter();

  const [customers, setCustomers] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [availableProducts, setAvailableProducts] = React.useState<AvailableProduct[]>([]);
  const [loadingAvailable, setLoadingAvailable] = React.useState(false);

  const [orderCode, setOrderCode] = React.useState(
    `SO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [paymentMode, setPaymentMode] = React.useState<"cash" | "debt">("debt");
  const [notes, setNotes] = React.useState("");
  const [taxRate, setTaxRate] = React.useState(0.08); // VAT 8%
  const [saving, setSaving] = React.useState(false);
  const [autoApproveFulfillment, setAutoApproveFulfillment] = React.useState(true);
  const [requestId, setRequestId] = React.useState(() => crypto.randomUUID());

  const [lines, setLines] = React.useState<OrderLine[]>([]);

  // Tải danh sách Khách hàng, Dự án & Danh mục mặt hàng
  React.useEffect(() => {
    async function loadAux() {
      try {
        const [cRes, pRes, iRes] = await Promise.all([
          fetch("/api/crm/customers?limit=500"),
          fetch("/api/projects?limit=500"),
          fetch("/api/inventory/items?limit=500"),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          const loadedCustomers = cData.customers || cData.items || [];
          setCustomers(loadedCustomers);
          if (loadedCustomers.length > 0 && !customerId) {
            setCustomerId(loadedCustomers[0].id);
          }
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setProjects(pData.projects || pData.items || []);
        }
        if (iRes.ok) {
          const iData = await iRes.json();
          setItems(iData.items || []);
        }
      } catch (err) {
        console.error("Lỗi nạp dữ liệu ban đầu:", err);
      }
    }
    loadAux();
  }, []);

  // Lọc các dự án theo Khách hàng được chọn
  const customerProjects = React.useMemo(() => {
    if (!customerId) return projects;
    return projects.filter(
      (p) => p.customerId === customerId || p.customer_id === customerId
    );
  }, [projects, customerId]);

  // Tự động chọn dự án đầu tiên khi đổi khách hàng (nếu có)
  React.useEffect(() => {
    if (customerProjects.length > 0) {
      if (!projectId || !customerProjects.some((p) => p.id === projectId)) {
        setProjectId(customerProjects[0].id);
      }
    } else {
      setProjectId("");
    }
  }, [customerId, customerProjects]);

  // Tải danh sách Thành phẩm đã nhập kho của Dự án (GET /api/production-orders/available-products)
  const fetchAvailableProducts = React.useCallback(async (targetProjectId: string) => {
    if (!targetProjectId) {
      setAvailableProducts([]);
      return;
    }
    try {
      setLoadingAvailable(true);
      const res = await fetch(`/api/production-orders/available-products?projectId=${targetProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableProducts(data.products || []);
      } else {
        setAvailableProducts([]);
      }
    } catch (err) {
      console.error("Lỗi nạp thành phẩm đã nhập kho:", err);
      setAvailableProducts([]);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  React.useEffect(() => {
    if (projectId) {
      fetchAvailableProducts(projectId);
    } else {
      setAvailableProducts([]);
    }
  }, [projectId, fetchAvailableProducts]);

  // Chọn 1 Thành phẩm từ kho sản xuất vào đơn hàng
  const handleAddAvailableProduct = (prod: AvailableProduct) => {
    const existing = lines.find((l) => l.lotId === prod.lot_id);
    if (existing) {
      toast.error(`Thành phẩm lô '${prod.lot_code}' đã được thêm vào đơn hàng!`);
      return;
    }

    const availableQty = Number(prod.available_qty) || 1;
    const newLine: OrderLine = {
      id: `prod-${prod.lot_id}-${Date.now()}`,
      itemId: prod.item_id,
      itemName: `${prod.item_name} [${prod.line_title || prod.production_code}]`,
      itemCode: prod.item_code,
      qty: Math.min(1, availableQty),
      maxQty: availableQty,
      unit: prod.unit_name || "Cái",
      unitId: prod.base_unit_id,
      unitPrice: 0,
      discountPercent: 0,
      lotId: prod.lot_id,
      lotCode: prod.lot_code,
      warehouseId: prod.warehouse_id,
      warehouseName: prod.warehouse_name,
      productionOrderLineId: prod.production_order_line_id,
      productionCode: prod.production_code,
    };

    setLines((prev) => [...prev, newLine]);
    toast.success(`Đã thêm thành phẩm lô ${prod.lot_code} vào đơn bán hàng!`);
  };

  // Thêm dòng mặt hàng tự do từ danh mục kho
  const handleAddCustomLine = () => {
    const defaultItem = items[0];
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemId: defaultItem?.id || "",
        itemName: defaultItem?.name || "Vật tư bán hàng",
        itemCode: defaultItem?.code || "SKU-NEW",
        qty: 1,
        unit: defaultItem?.unitName || "Cái",
        unitId: defaultItem?.baseUnitId || defaultItem?.unit_id,
        unitPrice: defaultItem?.sellingPrice || 0,
        discountPercent: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof OrderLine, value: any) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === "itemId") {
          const found = items.find((it) => it.id === value);
          return {
            ...l,
            itemId: value,
            itemName: found?.name || l.itemName,
            itemCode: found?.code || l.itemCode,
            unit: found?.unitName || l.unit,
            unitId: found?.baseUnitId || found?.unit_id || l.unitId,
            unitPrice: found?.sellingPrice || l.unitPrice,
          };
        }
        return { ...l, [field]: value };
      })
    );
  };

  // Tính toán tổng tiền
  const subTotal = lines.reduce(
    (sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPercent / 100),
    0
  );
  const taxAmount = subTotal * taxRate;
  const grandTotal = subTotal + taxAmount;

  // Lưu & Xử lý Đơn Bán Hàng
  const handleSaveOrder = async () => {
    if (!customerId) {
      toast.error("Vui lòng chọn Khách hàng!");
      return;
    }
    if (lines.length === 0) {
      toast.error("Đơn hàng phải có ít nhất 1 dòng mặt hàng / thành phẩm!");
      return;
    }

    const isProductionSales = lines.some((l) => l.lotId && l.productionOrderLineId);
    const hasStandardLines = lines.some((l) => !l.lotId || !l.productionOrderLineId);

    if (isProductionSales && hasStandardLines) {
      toast.error(
        "Không thể gộp chung thành phẩm sản xuất theo lô và vật tư bán lẻ trong 1 đơn hàng. Vui lòng tách riêng đơn xuất bán thành phẩm sản xuất!"
      );
      return;
    }

    // Kiểm tra đơn giá và mã hàng hợp lệ
    for (const l of lines) {
      if (!l.itemId) {
        toast.error(`Dòng '${l.itemName}' chưa chọn mã mặt hàng hợp lệ!`);
        return;
      }
      if (l.unitPrice <= 0) {
        toast.error(`Dòng '${l.itemName}' có đơn giá bằng 0 đ. Vui lòng nhập đơn giá bán!`);
        return;
      }
      if (l.qty <= 0) {
        toast.error(`Dòng '${l.itemName}' có số lượng không hợp lệ!`);
        return;
      }
    }

    try {
      setSaving(true);

      const payload = {
        requestId,
        code: orderCode,
        customerId,
        projectId: projectId || null,
        paymentMode,
        notes: notes.trim(),
        taxRate,
        recordReceivable: paymentMode === "debt",
        paymentDays: 30,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          unitId: l.unitId || items.find((i) => i.id === l.itemId)?.unit_id || items.find((i) => i.id === l.itemId)?.baseUnitId,
          description: l.itemName,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountAmount: (l.qty * l.unitPrice * l.discountPercent) / 100,
          lotId: l.lotId || undefined,
          warehouseId: l.warehouseId || undefined,
          productionOrderLineId: l.productionOrderLineId || undefined,
        })),
      };

      const res = await fetch("/api/crm/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi tạo đơn bán hàng");
      }

      const createdOrderId = data.orderId;

      // Nếu là đơn hàng thành phẩm sản xuất và bật tự động duyệt xuất kho
      if (isProductionSales && autoApproveFulfillment && createdOrderId) {
        try {
          const approveRes = await fetch(`/api/crm/orders/${createdOrderId}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "approve", requestId }),
          });
          const approveData = await approveRes.json();
          if (approveRes.ok) {
            toast.success(`Đã tạo đơn '${orderCode}' và tự động lập Phiếu Xuất Kho giao hàng thành công!`);
            setRequestId(crypto.randomUUID());
            router.push("/ban-hang");
            return;
          } else {
            toast.error(
              `Đã tạo đơn '${orderCode}' nhưng tự động xuất kho thất bại: ${approveData.error || "Lỗi duyệt"}`
            );
            setRequestId(crypto.randomUUID());
            router.push("/ban-hang");
            return;
          }
        } catch (approveErr: any) {
          console.error("Lỗi tự động duyệt đơn:", approveErr);
          toast.error(`Đã tạo đơn '${orderCode}' nhưng xuất kho thất bại.`);
          setRequestId(crypto.randomUUID());
          router.push("/ban-hang");
          return;
        }
      }

      toast.success(
        `Đã tạo đơn bán hàng '${orderCode}' thành công! Trạng thái: Chờ xuất kho giao hàng.`
      );
      setRequestId(crypto.randomUUID());
      router.push("/ban-hang");
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu đơn hàng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 py-2 flex flex-col space-y-3 min-h-[calc(100vh-3.5rem)] pb-10">
      {/* Top Header thanh mảnh */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href="/ban-hang"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
            M04 • POS
          </span>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            Lập Đơn Bán Hàng & Xuất Kho Thành Phẩm Dự Án
          </h1>
          <span className="text-slate-300 text-xs">/</span>
          <span className="text-xs font-mono font-bold text-blue-700">{orderCode}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveOrder}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Đang xử lý..." : "Lưu Đơn Bán Hàng (SO)"}</span>
          </Button>
        </div>
      </div>

      {/* THÔNG TIN CHUNG ĐƠN HÀNG & CHỌN DỰ ÁN */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">1. Chọn Khách Hàng *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-900"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            2. Chọn Dự Án Thi Công (Đã có thành phẩm)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-blue-900"
          >
            <option value="">-- Chọn dự án thi công --</option>
            {customerProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">3. Hình thức thanh toán</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
          >
            <option value="debt">Ghi nợ công nợ (Hạn 15-30 ngày)</option>
            <option value="cash">Thanh toán ngay (Tiền mặt / Chuyển khoản)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">4. Thuế suất VAT</label>
          <select
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
          >
            <option value={0.08}>VAT 8% (Ngành quảng cáo / in ấn)</option>
            <option value={0.1}>VAT 10% (Chuẩn)</option>
            <option value={0}>Không tính VAT (0%)</option>
          </select>
        </div>
      </div>

      {/* KHỐI HIỂN THỊ THÀNH PHẨM ĐÃ NHẬP KHO CỦA DỰ ÁN (ĐÃ NHẬP KHO - CHƯA XUẤT) */}
      {projectId && (
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-700" />
              <strong className="text-emerald-950 font-bold uppercase tracking-wide">
                Thành Phẩm Sản Xuất Của Dự Án Trong Kho (Đã Nhập Kho Chưa Xuất)
              </strong>
              <Badge variant="success" className="font-mono text-[10px]">
                {availableProducts.length} Lô Khả Dụng
              </Badge>
            </div>
            <span className="text-[11px] text-emerald-800">
              Nhấn <strong>+ Chọn Vào Đơn Hàng</strong> để tạo phiếu xuất kho theo Lô riêng cho Khách
            </span>
          </div>

          {loadingAvailable ? (
            <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Đang kiểm tra tồn kho thành phẩm của dự án...</span>
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-white rounded-lg border border-dashed border-emerald-200 space-y-1">
              <p className="font-medium text-slate-700">
                Chưa có thành phẩm nào của dự án này đang tồn kho (hoặc đã xuất hết).
              </p>
              <p className="text-[11px] text-slate-400">
                Vui lòng kiểm tra Lệnh sản xuất tại <Link href="/san-xuat" className="text-blue-600 underline">Quản lý Sản Xuất</Link> hoặc nghiệm thu nhập kho tại M09.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {availableProducts.map((prod) => {
                const isSelected = lines.some((l) => l.lotId === prod.lot_id);
                return (
                  <div
                    key={prod.lot_id}
                    className={`p-3 rounded-lg border transition space-y-2 ${
                      isSelected
                        ? "bg-emerald-100/60 border-emerald-400 shadow-2xs"
                        : "bg-white border-emerald-200 hover:border-emerald-300 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        {prod.lot_code}
                      </span>
                      <Badge variant="info" className="text-[10px] font-mono">
                        {prod.production_code}
                      </Badge>
                    </div>

                    <div>
                      <strong className="text-slate-900 block text-xs line-clamp-1">{prod.item_name}</strong>
                      <span className="text-[11px] text-slate-500 block">{prod.line_title}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <div>
                        Kho: <strong className="text-slate-800">{prod.warehouse_name}</strong>
                      </div>
                      <div className="font-mono text-emerald-800 font-bold">
                        Tồn: {prod.available_qty} {prod.unit_name}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAddAvailableProduct(prod)}
                      disabled={isSelected}
                      className={`w-full text-xs font-bold h-7 gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã Chọn Vào Đơn</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Chọn Vào Đơn Hàng</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BẢNG DÒNG MẶT HÀNG BÁN */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-3 flex flex-col justify-between space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>Chi Tiết Mặt Hàng & Thành Phẩm Đơn Bán ({lines.length} dòng)</span>
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApproveFulfillment}
                onChange={(e) => setAutoApproveFulfillment(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-emerald-800">
                ⚡ Tự động lập Phiếu Xuất Kho giao khách ngay sau khi lưu
              </span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCustomLine}
              className="text-xs gap-1 cursor-pointer h-7"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Mặt Hàng Tự Do
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center">#</th>
                <th className="py-2 px-2.5 min-w-[240px]">Mặt Hàng / Thành Phẩm & Mã Lô</th>
                <th className="py-2 px-2.5 text-center w-20">Kho Xuất</th>
                <th className="py-2 px-2.5 text-center w-24">Số Lượng</th>
                <th className="py-2 px-2.5 text-center w-16">ĐVT</th>
                <th className="py-2 px-2.5 text-right w-32">Đơn Giá (đ)</th>
                <th className="py-2 px-2.5 text-center w-20">CK (%)</th>
                <th className="py-2 px-2.5 text-right w-36">Thành Tiền</th>
                <th className="py-2 px-2.5 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có mặt hàng nào. Chọn từ danh sách <strong>Thành phẩm của dự án</strong> ở trên hoặc nhấn <strong>+ Thêm Mặt Hàng Tự Do</strong>.
                  </td>
                </tr>
              ) : (
                lines.map((l, index) => {
                  const lineTotal = l.qty * l.unitPrice * (1 - l.discountPercent / 100);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px] text-center">{index + 1}</td>
                      <td className="py-2 px-2.5">
                        <strong className="text-slate-900 block">{l.itemName}</strong>
                        {l.lotCode && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5 font-bold">
                            Lô: {l.lotCode} · {l.productionCode}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-center text-slate-600 font-medium">
                        {l.warehouseName || "Kho tổng"}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          max={l.maxQty}
                          value={l.qty}
                          onChange={(e) => handleUpdateLine(l.id, "qty", Number(e.target.value))}
                          className="w-18 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-center text-slate-600 font-medium">
                        {l.unit}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <input
                          type="number"
                          step="1000"
                          value={l.unitPrice}
                          onChange={(e) => handleUpdateLine(l.id, "unitPrice", Number(e.target.value))}
                          className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={l.discountPercent}
                          onChange={(e) => handleUpdateLine(l.id, "discountPercent", Number(e.target.value))}
                          className="w-14 px-1.5 py-1 border border-slate-300 rounded text-xs text-center font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-900">
                        {lineTotal.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(l.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Tổng Kết & Chi Tiết Thanh Toán */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4 shrink-0">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600 block">Ghi chú giao nhận / Vận chuyển:</span>
            <input
              type="text"
              placeholder="Giao tại chân công trình đại lý..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-80 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="text-right space-y-1 text-xs min-w-[280px]">
            <div className="flex justify-between gap-8 text-slate-500">
              <span>Tiền hàng trước thuế:</span>
              <span className="font-mono font-semibold text-slate-800">{subTotal.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="flex justify-between gap-8 text-slate-500">
              <span>Thuế GTGT (VAT {(taxRate * 100).toFixed(0)}%):</span>
              <span className="font-mono font-semibold text-slate-700">+{taxAmount.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="flex justify-between gap-8 text-sm font-bold text-emerald-800 pt-1.5 border-t border-slate-200">
              <span>TỔNG CỘNG THANH TOÁN:</span>
              <span className="font-mono text-base font-extrabold text-emerald-950">{grandTotal.toLocaleString("vi-VN")} đ</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/ban-hang")}
                disabled={saving}
                className="text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveOrder}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? "Đang xử lý..." : "Lưu Đơn Bán Hàng (SO)"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
