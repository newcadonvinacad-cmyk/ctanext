"use client";

import * as React from "react";
import {
  PackageCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button, Modal, Badge, toast } from "@/components/ui";
import { PurchaseOrderDto } from "@/services/procurement.service";

interface CreateInboundReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onSuccess: () => void;
}

interface ReceiptLineItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitName: string;
  orderedQty: number;
  qty: number;
  unitPrice: number;
}

export function CreateInboundReceiptModal({
  isOpen,
  onClose,
  orderId,
  onSuccess,
}: CreateInboundReceiptModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [order, setOrder] = React.useState<PurchaseOrderDto | null>(null);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [lines, setLines] = React.useState<ReceiptLineItem[]>([]);
  const [markCompleted, setMarkCompleted] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Load PO details & warehouses when modal opens with orderId
  React.useEffect(() => {
    if (!isOpen || !orderId) return;

    let active = true;
    setLoading(true);

    Promise.all([
      fetch(`/api/procurement/orders/${orderId}`).then((r) => {
        if (!r.ok) throw new Error("Không thể tải chi tiết đơn mua hàng");
        return r.json();
      }),
      fetch("/api/inventory/warehouses").then((r) => {
        if (!r.ok) throw new Error("Không thể tải danh sách kho");
        return r.json();
      }),
    ])
      .then(([orderData, whData]) => {
        if (!active) return;
        const po: PurchaseOrderDto = orderData.order;
        setOrder(po);

        const whs = whData.warehouses || [];
        setWarehouses(whs);
        if (whs.length > 0) {
          setSelectedWarehouseId(whs[0].id);
        }

        setReason(`Nhập kho theo đơn mua hàng ${po.code} - ${po.supplierName}`);

        const prefilledLines: ReceiptLineItem[] = (po.lines || []).map((l) => ({
          id: l.id,
          itemId: l.itemId,
          itemCode: l.itemCode,
          itemName: l.itemName,
          unitId: l.unitId,
          unitName: l.unitName || "Cái",
          orderedQty: l.qty,
          qty: l.qty,
          unitPrice: l.unitPrice,
        }));
        setLines(prefilledLines);
      })
      .catch((err) => {
        if (!active) return;
        toast.error(err.message || "Lỗi tải thông tin đơn mua");
        onClose();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, orderId, onClose]);

  const handleQtyChange = (index: number, val: number) => {
    setLines((prev) =>
      prev.map((l, idx) => (idx === index ? { ...l, qty: Math.max(0, val) } : l))
    );
  };

  const totalReceiptValue = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !order) return;

    if (!selectedWarehouseId) {
      toast.error("Vui lòng chọn Kho nhập hàng!");
      return;
    }

    const activeLines = lines.filter((l) => l.qty > 0);
    if (activeLines.length === 0) {
      toast.error("Phải có ít nhất 1 mặt hàng có số lượng thực nhận lớn hơn 0!");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/procurement/orders/${orderId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationWarehouseId: selectedWarehouseId,
          reason,
          markOrderCompleted: markCompleted,
          receivedLines: activeLines.map((l) => ({
            purchaseLineId: l.id,
            itemId: l.itemId,
            unitId: l.unitId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi tạo phiếu đề xuất nhập kho");
      }

      toast.success(
        data.message || `Đã tạo phiếu đề xuất nhập kho ${data.documentCode || ""} thành công!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Phiếu Đề Xuất Nhập Kho"
      description={
        order
          ? `Tự động trích xuất vật tư từ Đơn mua hàng ${order.code} • ${order.supplierName}`
          : "Đang tải dữ liệu đơn mua hàng..."
      }
      maxWidth="3xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải dữ liệu vật tư từ đơn mua hàng...
          </p>
        </div>
      ) : order ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Box thông tin PO & Chọn kho */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/75 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Đơn mua hàng:</span>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {order.code}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Nhà cung cấp:</span>
                <p className="font-semibold text-slate-900 truncate">{order.supplierName}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Dự án công trình:</span>
                <p className="text-slate-700 truncate">{order.projectName || "Nhập kho chung"}</p>
              </div>
            </div>

            {/* CHỌN KHO NHẬP (TRỌNG TÂM CỦA THAO TÁC) */}
            <div className="pt-3 border-t border-slate-200/80">
              <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Kho Nhập Hàng Thực Tế:</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-blue-300 bg-white text-xs font-semibold text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Diễn giải */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Lý do / Mục đích nhập kho:
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                placeholder="Ví dụ: Nhập kho theo đơn PO-2026-0001..."
              />
            </div>
          </div>

          {/* Bảng danh sách vật tư đã trích xuất từ PO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-slate-600" />
                <span>Danh mục vật tư thực nhận theo đơn:</span>
                <Badge variant="neutral" className="ml-1 text-[10px]">
                  {lines.length} mặt hàng
                </Badge>
              </h4>
              <span className="text-[11px] text-slate-500">
                (Số lượng đã được tự động điền sẵn theo đơn PO)
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 font-semibold text-slate-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center w-10">#</th>
                    <th className="px-3 py-2">Mã &amp; Tên vật tư</th>
                    <th className="px-3 py-2 text-center w-20">ĐVT</th>
                    <th className="px-3 py-2 text-right w-24">SL Đặt PO</th>
                    <th className="px-3 py-2 text-right w-32 bg-blue-50/60 text-blue-900">
                      SL Thực Nhận
                    </th>
                    <th className="px-3 py-2 text-right w-28">Đơn giá PO</th>
                    <th className="px-3 py-2 text-right w-32">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lines.map((l, idx) => {
                    const isFull = l.qty === l.orderedQty;
                    const isPartial = l.qty > 0 && l.qty < l.orderedQty;
                    return (
                      <tr key={l.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-900">{l.itemName}</p>
                          <span className="font-mono text-[10px] text-slate-400">
                            {l.itemCode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 font-medium">
                          {l.unitName}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                          {l.orderedQty}
                        </td>
                        <td className="px-3 py-1.5 text-right bg-blue-50/30">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={l.qty}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                            className="w-24 text-right px-2 py-1 border border-blue-300 rounded font-mono font-bold text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {l.unitPrice.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {(l.qty * l.unitPrice).toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[11px] font-medium text-slate-700">
                  Đánh dấu Đơn mua (PO) là <strong>Đã nhận hàng hoàn tất</strong>
                </span>
              </label>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 mr-2">Tổng giá trị thực nhận:</span>
                <span className="font-mono text-sm font-bold text-emerald-700">
                  {totalReceiptValue.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || lines.length === 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo phiếu đề xuất nhập...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Tạo Phiếu Đề Xuất Nhập Kho</span>
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
