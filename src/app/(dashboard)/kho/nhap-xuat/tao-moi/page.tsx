"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeftRight,
  Boxes,
  Truck,
  Building,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button, Badge, Tooltip, toast } from "@/components/ui";

interface StockLine {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  qty: number;
  unit: string;
  unitPrice: number;
  availableStock?: number;
}

export default function TaoMoiPhieuKhoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawType = (searchParams.get("type") || searchParams.get("loai") || "").toLowerCase();
  const rawProject = searchParams.get("du_an") || searchParams.get("projectId") || "";
  const poCodeParam = searchParams.get("poCode") || searchParams.get("refPO") || "";
  const soCodeParam = searchParams.get("soCode") || "";
  const poIdParam = searchParams.get("poId") || "";
  const soIdParam = searchParams.get("soId") || "";

  const [documentType, setDocumentType] = React.useState<"receipt" | "issue" | "transfer">(
    rawType === "issue" || rawType === "xuat"
      ? "issue"
      : rawType === "transfer" || rawType === "chuyen"
      ? "transfer"
      : "receipt"
  );

  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);

  const [sourceWarehouseId, setSourceWarehouseId] = React.useState("");
  const [destWarehouseId, setDestWarehouseId] = React.useState("");
  const [projectId, setProjectId] = React.useState(rawProject);
  const [reason, setReason] = React.useState(
    poCodeParam
      ? `Nhập kho đối soát thực nhận theo đơn mua ${poCodeParam}`
      : soCodeParam
      ? `Xuất kho giao hàng theo đơn bán ${soCodeParam}`
      : rawType === "xuat" || rawType === "issue"
      ? "Xuất kho vật tư thi công dự án"
      : "Nhập xuất vật tư định kỳ"
  );
  const [saving, setSaving] = React.useState(false);

  const [lines, setLines] = React.useState<StockLine[]>([]);

  React.useEffect(() => {
    async function loadAux() {
      try {
        const [wRes, iRes, pRes] = await Promise.all([
          fetch("/api/inventory/warehouses"),
          fetch("/api/inventory/items"),
          fetch("/api/projects"),
        ]);

        if (wRes.ok) {
          const wData = await wRes.json();
          setWarehouses(wData.warehouses || []);
          if (wData.warehouses?.length > 0) {
            setSourceWarehouseId(wData.warehouses[0].id);
            setDestWarehouseId(wData.warehouses[1]?.id || wData.warehouses[0].id);
          }
        }
        if (iRes.ok) {
          const iData = await iRes.json();
          setItems(iData.items || []);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setProjects(pData.projects || []);
        }

        // Tự động trích xuất danh sách mặt hàng nếu có tham số đơn mua hàng (PO)
        if (poIdParam || poCodeParam) {
          try {
            let poOrder: any = null;
            if (poIdParam) {
              const poRes = await fetch(`/api/procurement/orders/${poIdParam}`);
              if (poRes.ok) {
                const poData = await poRes.json();
                poOrder = poData.order;
              }
            } else if (poCodeParam) {
              const poListRes = await fetch(`/api/procurement/orders`);
              if (poListRes.ok) {
                const poListData = await poListRes.json();
                const found = (poListData.orders || []).find((o: any) => o.code === poCodeParam);
                if (found) {
                  const poRes = await fetch(`/api/procurement/orders/${found.id}`);
                  if (poRes.ok) {
                    const poData = await poRes.json();
                    poOrder = poData.order;
                  }
                }
              }
            }

            if (poOrder && poOrder.lines?.length > 0) {
              if (poOrder.projectId) setProjectId(poOrder.projectId);
              setLines(
                poOrder.lines.map((l: any) => ({
                  id: l.id || String(Date.now() + Math.random()),
                  itemId: l.itemId,
                  itemName: l.itemName || l.description,
                  itemCode: l.itemCode || "",
                  qty: l.qty,
                  unit: l.unitName || "Cái",
                  unitPrice: l.unitPrice,
                  availableStock: 0,
                }))
              );
              setReason(
                `Nhập kho đối soát thực nhận theo đơn mua ${poOrder.code} - ${poOrder.supplierName}`
              );
            }
          } catch (poErr) {
            console.error("Lỗi tự động tải vật tư từ PO:", poErr);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadAux();
  }, [poIdParam, poCodeParam]);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemId: "",
        itemName: "",
        itemCode: "",
        qty: 1,
        unit: "",
        unitPrice: 0,
        availableStock: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof StockLine, value: any) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === "itemId") {
          const found = items.find((it) => it.id === value);
          return {
            ...l,
            itemId: value,
            itemName: found?.name || "",
            itemCode: found?.code || "",
            unit: found?.baseUnitName || found?.unitName || "Cái",
            unitPrice: found?.referenceCost || 0,
            availableStock: found?.totalOnHand || 0,
          };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const totalValue = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  // Lưu Phiếu Kho
  const handleSaveDocument = async (shouldApproveNow: boolean = false) => {
    if (lines.length === 0) {
      toast.error("Phiếu kho phải có ít nhất 1 dòng vật tư! Vui lòng bấm '+ Thêm vật tư'.");
      return;
    }

    const invalidLine = lines.find((l) => !l.itemId || l.qty <= 0);
    if (invalidLine) {
      toast.error("Vui lòng chọn vật tư và nhập số lượng lớn hơn 0 cho tất cả các dòng!");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        type: documentType,
        purpose: reason || (documentType === "receipt" ? "Nhập kho vật tư" : documentType === "issue" ? "Xuất kho vật tư" : "Điều chuyển kho"),
        sourceWarehouseId: documentType !== "receipt" ? sourceWarehouseId : null,
        destinationWarehouseId: documentType !== "issue" ? destWarehouseId : null,
        projectId: projectId || null,
        reason,
        submitNow: shouldApproveNow,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          qty: l.qty,
          unitCostSnapshot: l.unitPrice,
          purchaseLineId: poIdParam || null,
          salesLineId: soIdParam || null,
        })),
      };

      const res = await fetch("/api/inventory/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi tạo phiếu kho");
      }

      const resData = await res.json();
      toast.success(`Tạo phiếu kho thành công!`);
      router.push("/kho/nhap-xuat");
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu phiếu kho");
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
            href="/kho/nhap-xuat"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            M09 • FULL PAGE
          </span>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            Lập Chứng Từ Kho (Nhập / Xuất / Điều Chuyển 2 Pha)
          </h1>
          <span className="text-slate-300 text-xs">/</span>
          <span className="text-xs text-slate-500">
            {documentType === "receipt" ? "Nhập Kho" : documentType === "issue" ? "Xuất Kho" : "Điều Chuyển"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveDocument(false)}
            disabled={saving}
            className="text-xs"
          >
            Lưu Nháp
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSaveDocument(true)}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Đang lưu..." : "Lưu & Gửi Phê Duyệt"}
          </Button>
        </div>
      </div>

      {/* CHỌN LOẠI PHIẾU KHO */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Loại chứng từ kho:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDocumentType("receipt")}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                documentType === "receipt"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-500/20"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📥 Phiếu Nhập Kho (Đối Soát PO / Nhà Cung Cấp)
            </button>
            <button
              onClick={() => setDocumentType("issue")}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                documentType === "issue"
                  ? "bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-500/20"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              📤 Phiếu Xuất Kho (Dự Án / Lệnh Sản Xuất / Bán Lẻ)
            </button>
            <button
              onClick={() => setDocumentType("transfer")}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                documentType === "transfer"
                  ? "bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-500/20"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              🔄 Điều Chuyển Kho 2 Pha (Xưởng &rarr; Xe Lưu Động)
            </button>
          </div>
        </div>

        <div className="text-right">
          <span className="text-slate-400 block text-[11px]">Tổng giá trị vật tư:</span>
          <span className="font-mono text-sm font-bold text-blue-700">
            {totalValue.toLocaleString("vi-VN")} đ
          </span>
        </div>
      </div>

      {/* CẤU HÌNH KHO NGUỒN / ĐÍCH & DỰ ÁN */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 grid grid-cols-4 gap-3 text-xs">
        {documentType !== "receipt" && (
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Kho xuất hàng (Nguồn)</label>
            <select
              value={sourceWarehouseId}
              onChange={(e) => setSourceWarehouseId(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {documentType !== "issue" && (
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Kho nhập hàng (Đích)</label>
            <select
              value={destWarehouseId}
              onChange={(e) => setDestWarehouseId(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Dự án công trình</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
          >
            <option value="">-- Dùng chung kho xưởng --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Lý do nhập xuất</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
          />
        </div>
      </div>

      {/* BẢNG DÒNG VẬT TƯ (TỰ ĐỘNG QUY ĐỔI ĐVT & TỒN KHẢ DỤNG) */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-col justify-between">
        <div className="overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-600 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-2.5 min-w-[220px]">Tên vật tư trong kho</th>
                <th className="py-2 px-2.5 text-center w-24">Tồn khả dụng</th>
                <th className="py-2 px-2.5 text-center w-20">SL yêu cầu</th>
                <th className="py-2 px-2.5 text-center w-16">ĐVT</th>
                <th className="py-2 px-2.5 text-right w-28">Đơn giá vốn</th>
                <th className="py-2 px-2.5 text-right w-32">Thành tiền</th>
                <th className="py-2 px-2.5 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Chưa có dòng vật tư nào. Bấm <strong>"+ Thêm vật tư"</strong> bên dưới để lập danh sách xuất / nhập kho.
                  </td>
                </tr>
              ) : (
                lines.map((l, index) => {
                  const lineTotal = l.qty * l.unitPrice;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="py-1.5 px-2.5 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                      <td className="py-1.5 px-2.5">
                        <select
                          value={l.itemId}
                          onChange={(e) => handleUpdateLine(l.id, "itemId", e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800"
                        >
                          <option value="">{l.itemName || "-- Chọn vật tư SKU --"}</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} - {it.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-600">
                      {l.availableStock || 10} {l.unit}
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
              }))}
            </tbody>
          </table>
        </div>

        {/* Footer thêm dòng */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={handleAddLine} className="text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> Thêm dòng vật tư
          </Button>

          <span className="text-xs text-slate-500">
            Tổng cộng: <strong>{lines.length} mặt hàng</strong> • Hạn mức duyệt thủ kho: 50.000.000 VND
          </span>
        </div>
      </div>
    </div>
  );
}
