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
} from "lucide-react";
import { Button, Badge, toast } from "@/components/ui";

interface OrderLine {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
}

export default function TaoMoiDonBanHangPage() {
  const router = useRouter();

  const [customers, setCustomers] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [orderCode, setOrderCode] = React.useState(
    `SO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [paymentMode, setPaymentMode] = React.useState<"cash" | "debt">("debt");
  const [notes, setNotes] = React.useState("");
  const [taxRate, setTaxRate] = React.useState(0.08); // VAT 8%
  const [saving, setSaving] = React.useState(false);

  const [lines, setLines] = React.useState<OrderLine[]>([
    {
      id: "1",
      itemId: "",
      itemName: "Tấm Alu Alcorest 3mm ngoài trời EV3002",
      itemCode: "ALU-ALCO-01",
      qty: 10,
      unit: "Tấm",
      unitPrice: 420000,
      discountPercent: 0,
    },
    {
      id: "2",
      itemId: "",
      itemName: "In bạt Hiflex 3.6z độ phân giải cao",
      itemCode: "BAT-HIFLEX-01",
      qty: 35,
      unit: "m²",
      unitPrice: 65000,
      discountPercent: 5,
    },
  ]);

  React.useEffect(() => {
    async function loadAux() {
      try {
        const [cRes, iRes] = await Promise.all([
          fetch("/api/crm/customers"),
          fetch("/api/inventory/items"),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          setCustomers(cData.customers || []);
          if (cData.customers?.length > 0) setCustomerId(cData.customers[0].id);
        }
        if (iRes.ok) {
          const iData = await iRes.json();
          setItems(iData.items || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadAux();
  }, []);

  const handleAddLine = () => {
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
        unitPrice: 0,
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
            unitPrice: found?.sellingPrice || l.unitPrice,
          };
        }
        return { ...l, [field]: value };
      })
    );
  };

  // Tính toán
  const subTotal = lines.reduce(
    (sum, l) => sum + l.qty * l.unitPrice * (1 - l.discountPercent / 100),
    0
  );
  const taxAmount = subTotal * taxRate;
  const grandTotal = subTotal + taxAmount;

  // Lưu Đơn Bán Hàng
  const handleSaveOrder = async () => {
    if (!customerId) {
      toast.error("Vui lòng chọn Khách hàng!");
      return;
    }
    if (lines.length === 0) {
      toast.error("Đơn hàng phải có ít nhất 1 dòng mặt hàng!");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: orderCode,
        customerId,
        paymentMode,
        notes,
        taxRate,
        lines: lines.map((l) => ({
          itemId: l.itemId || items[0]?.id,
          unitId: (l as any).unitId || (l as any).unit_id || items.find((i) => i.id === l.itemId)?.unit_id || (items[0] as any)?.unit_id,
          description: l.itemName,
          qty: l.qty,
          unitPrice: l.unitPrice,
          discountAmount: (l.qty * l.unitPrice * l.discountPercent) / 100,
        })),
      };

      const res = await fetch("/api/crm/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi tạo đơn bán hàng");
      }

      toast.success(
        `Đã tạo đơn '${orderCode}' thành công! (Lưu ý: Chưa trừ kho; bấm Tạo Xuất Kho tại M09 để giao hàng)`
      );
      router.push("/ban-hang");
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu đơn hàng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 py-2 flex flex-col space-y-3 h-[calc(100vh-3.5rem)]">
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
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            M04 • POS
          </span>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            Lập Đơn Bán Hàng Thương Mại / Bán Lẻ Tại Quầy
          </h1>
          <span className="text-slate-300 text-xs">/</span>
          <span className="text-xs text-slate-500">{orderCode}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveOrder}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Đang lưu đơn..." : "Lưu Đơn Bán Hàng (SO)"}
          </Button>
        </div>
      </div>

      {/* CẢNH BÁO QUY TRÌNH KẾ TOÁN */}
      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Nguyên tắc kế toán ERP:</strong> Tạo Đơn Bán Hàng chỉ ghi nhận cam kết doanh thu và công nợ. Hệ thống <strong>CHƯA TỰ ĐỘNG TRỪ TỒN KHO</strong> và <strong>CHƯA GHI SỔ QUỸ</strong> cho đến khi thủ kho xác nhận phiếu xuất kho (M09) và kế toán lập phiếu thu (M16).
          </span>
        </div>
        <Badge variant="warning">Tuân thủ ERP</Badge>
      </div>

      {/* THÔNG TIN CHUNG ĐƠN HÀNG */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 grid grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Khách hàng</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Hình thức thanh toán</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as any)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
          >
            <option value="debt">Ghi nợ công nợ (Hạn 15-30 ngày)</option>
            <option value="cash">Thanh toán ngay (Tiền mặt / Chuyển khoản)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Thuế suất VAT</label>
          <select
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
          >
            <option value={0.08}>VAT 8% (Ngành quảng cáo / in ấn)</option>
            <option value={0.1}>VAT 10% (Chuẩn)</option>
            <option value={0}>Không tính VAT</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Ghi chú giao nhận</label>
          <input
            type="text"
            placeholder="Giao tại xưởng hoặc chân công trình..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
          />
        </div>
      </div>

      {/* BẢNG DÒNG MẶT HÀNG BÁN */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-col justify-between">
        <div className="overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-2.5 min-w-[200px]">Chọn mặt hàng từ Kho xưởng</th>
                <th className="py-2 px-2.5 text-center w-20">SL</th>
                <th className="py-2 px-2.5 text-center w-16">ĐVT</th>
                <th className="py-2 px-2.5 text-right w-28">Đơn giá</th>
                <th className="py-2 px-2.5 text-center w-20">CK (%)</th>
                <th className="py-2 px-2.5 text-right w-32">Thành tiền</th>
                <th className="py-2 px-2.5 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, index) => {
                const lineTotal = l.qty * l.unitPrice * (1 - l.discountPercent / 100);
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="py-1.5 px-2.5 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-1.5 px-2.5">
                      <select
                        value={l.itemId}
                        onChange={(e) => handleUpdateLine(l.id, "itemId", e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800"
                      >
                        <option value="">{l.itemName}</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.code} - {it.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={l.qty}
                        onChange={(e) => handleUpdateLine(l.id, "qty", Number(e.target.value))}
                        className="w-16 px-1.5 py-1 border border-slate-200 rounded text-xs text-center font-mono"
                      />
                    </td>
                    <td className="py-1.5 px-2.5 text-center text-slate-500 font-medium">
                      {l.unit}
                    </td>
                    <td className="py-1.5 px-2.5 text-right">
                      <input
                        type="number"
                        value={l.unitPrice}
                        onChange={(e) => handleUpdateLine(l.id, "unitPrice", Number(e.target.value))}
                        className="w-24 px-1.5 py-1 border border-slate-200 rounded text-xs text-right font-mono"
                      />
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={l.discountPercent}
                        onChange={(e) => handleUpdateLine(l.id, "discountPercent", Number(e.target.value))}
                        className="w-14 px-1.5 py-1 border border-slate-200 rounded text-xs text-center font-mono"
                      />
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                      {lineTotal.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      <button
                        onClick={() => handleRemoveLine(l.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Thanh Tổng Kết & Nút Thêm Dòng */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={handleAddLine} className="text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Thêm mặt hàng bán
          </Button>

          <div className="text-right space-y-1 text-xs">
            <div className="flex justify-between gap-8 text-slate-500">
              <span>Tiền hàng trước thuế:</span>
              <span className="font-mono font-medium">{subTotal.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="flex justify-between gap-8 text-slate-500">
              <span>Thuế GTGT (VAT {(taxRate * 100).toFixed(0)}%):</span>
              <span className="font-mono font-medium">+{taxAmount.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="flex justify-between gap-8 text-sm font-bold text-emerald-700 pt-1 border-t">
              <span>Tổng cộng thanh toán:</span>
              <span className="font-mono text-base">{grandTotal.toLocaleString("vi-VN")} đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
