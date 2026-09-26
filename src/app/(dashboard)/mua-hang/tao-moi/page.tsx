"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Building2,
  Calendar,
  Save,
  FileText,
  AlertTriangle,
  X,
  Eye,
} from "lucide-react";
import { Button, Badge, Drawer, toast } from "@/components/ui";

interface PurchaseOrderLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  description: string;
  qty: number;
  unit: string;
  unitId?: string;
  unitPrice: number;
}

interface OcrExtractedLine {
  id: string;
  rawName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  matchedItemId?: string;
  matchedItemName?: string;
  matchedItemCode?: string;
  selected: boolean;
}

export default function TaoMoiDonMuaHangPage() {
  const router = useRouter();

  // Danh mục tham chiếu
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);

  // Dữ liệu đơn mua PO
  const [supplierId, setSupplierId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [expectedDate, setExpectedDate] = React.useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Bảng dòng vật tư PO (khởi tạo rỗng, người dùng chủ động thêm)
  const [lines, setLines] = React.useState<PurchaseOrderLine[]>([]);

  // Quản lý Drawer Ảnh & AI OCR (Tùy chọn phụ, không chiếm không gian mặc định)
  const [isDocDrawerOpen, setIsDocDrawerOpen] = React.useState(false);
  const [invoiceImage, setInvoiceImage] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [ocrRunning, setOcrRunning] = React.useState(false);
  const [ocrProposals, setOcrProposals] = React.useState<OcrExtractedLine[]>([]);
  const [ocrMeta, setOcrMeta] = React.useState<{
    supplierName?: string;
    invoiceNo?: string;
    invoiceDate?: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Tải dữ liệu ban đầu
  React.useEffect(() => {
    async function loadAux() {
      try {
        const [sRes, iRes, pRes] = await Promise.all([
          fetch("/api/procurement/suppliers"),
          fetch("/api/inventory/items"),
          fetch("/api/projects"),
        ]);
        if (sRes.ok) {
          const sData = await sRes.json();
          setSuppliers(sData.suppliers || []);
        }
        if (iRes.ok) {
          const iData = await iRes.json();
          setItems(iData.items || []);
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setProjects(pData.projects || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadAux();
  }, []);

  // Thêm dòng vật tư thủ công
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        itemId: "",
        itemCode: "",
        itemName: "",
        description: "",
        qty: 1,
        unit: "",
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof PurchaseOrderLine, value: any) => {
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
            unitId: found?.baseUnitId,
            unitPrice: found?.referenceCost || l.unitPrice || 0,
            description: l.description || found?.name || "",
          };
        }
        return { ...l, [field]: value };
      })
    );
  };

  const totalAmount = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  // Xử lý nạp ảnh (chỉ lưu ảnh xem trước, không tự động gọi OCR ép buộc)
  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceImage(reader.result as string);
      setOcrProposals([]);
      setOcrMeta(null);
    };
    reader.readAsDataURL(file);
  };

  // Người dùng chủ động yêu cầu phân tích OCR
  const handleRunOcr = async () => {
    if (!invoiceImage) {
      toast.error("Vui lòng tải ảnh chứng từ trước khi phân tích");
      return;
    }

    try {
      setOcrRunning(true);
      toast.info("Đang gửi ảnh đến Gemini AI để phân tích dòng hóa đơn...");
      const res = await fetch("/api/procurement/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: invoiceImage }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi AI OCR hóa đơn");
      }

      const data = await res.json();
      const rawLines = data.lines || data.result?.lines || data.result?.items || [];

      if (rawLines.length === 0) {
        toast.warning("Không tìm thấy dòng vật tư nào từ ảnh hóa đơn");
        return;
      }

      setOcrMeta({
        supplierName: data.result?.supplierName,
        invoiceNo: data.result?.invoiceNo,
        invoiceDate: data.result?.invoiceDate,
      });

      const proposals: OcrExtractedLine[] = rawLines.map((l: any, idx: number) => {
        // So khớp thông minh với danh mục vật tư
        const rawDesc = (l.description || l.rawName || l.item_name || "").trim();
        const matched = items.find(
          (it) =>
            it.name.toLowerCase().includes(rawDesc.toLowerCase()) ||
            (rawDesc.length > 3 && rawDesc.toLowerCase().includes(it.name.toLowerCase()))
        );

        return {
          id: String(idx + 1),
          rawName: rawDesc,
          qty: Number(l.qty || l.quantity) || 1,
          unit: l.unit || "Cái",
          unitPrice: Number(l.unitPrice || l.unit_price) || 0,
          amount: Number(l.amount) || (Number(l.qty || 1) * Number(l.unitPrice || 0)),
          matchedItemId: matched?.id,
          matchedItemName: matched?.name,
          matchedItemCode: matched?.code,
          selected: true,
        };
      });

      setOcrProposals(proposals);
      toast.success(`Đã bóc tách ${proposals.length} dòng đề xuất. Vui lòng kiểm tra và áp dụng!`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi phân tích ảnh");
    } finally {
      setOcrRunning(false);
    }
  };

  // Áp dụng các dòng đề xuất đã chọn vào đơn mua
  const handleApplyProposals = () => {
    const selected = ocrProposals.filter((p) => p.selected);
    if (selected.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một dòng đề xuất để thêm vào đơn mua");
      return;
    }

    const newLines: PurchaseOrderLine[] = selected.map((p) => {
      const matched = items.find((it) => it.id === p.matchedItemId);
      return {
        id: String(Date.now() + Math.random()),
        itemId: matched?.id || "",
        itemCode: matched?.code || "",
        itemName: matched?.name || "",
        description: p.rawName,
        qty: p.qty,
        unit: p.unit || matched?.baseUnitName || "Cái",
        unitId: matched?.baseUnitId,
        unitPrice: p.unitPrice || matched?.referenceCost || 0,
      };
    });

    setLines((prev) => [...prev, ...newLines]);
    toast.success(`Đã thêm ${newLines.length} dòng vào đơn mua hàng!`);
    setIsDocDrawerOpen(false);
  };

  // Lưu Đơn Mua Hàng PO
  const handleSavePO = async () => {
    if (!supplierId) {
      toast.error("Vui lòng chọn Nhà cung cấp!");
      return;
    }
    if (lines.length === 0) {
      toast.error("Đơn hàng phải có ít nhất 1 dòng vật tư!");
      return;
    }

    const invalid = lines.find((l) => !l.itemId || l.qty <= 0);
    if (invalid) {
      toast.error("Vui lòng chọn vật tư hợp lệ và nhập số lượng lớn hơn 0 cho tất cả các dòng!");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        supplierId,
        projectId: projectId || undefined,
        expectedDate,
        notes,
        invoiceImage: invoiceImage || null,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          description: l.description || l.itemName,
          qty: l.qty,
          unitPrice: l.unitPrice,
          unitId: l.unitId,
        })),
      };

      const res = await fetch("/api/procurement/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi tạo đơn mua hàng");
      }

      toast.success("Tạo Đơn mua hàng (PO) thành công!");
      router.push("/mua-hang");
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu đơn hàng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-6 py-4 flex flex-col space-y-4 max-w-7xl mx-auto min-h-[calc(100vh-3.5rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/mua-hang"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Quay lại danh sách PO"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Tạo Đơn Mua Hàng (PO)
            </h1>
            <p className="text-xs text-slate-500">
              Lập đơn đặt mua vật tư từ nhà cung cấp phục vụ dự án hoặc nhập kho
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút tùy chọn Dùng ảnh / chứng từ */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDocDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            {invoiceImage ? "Xem ảnh chứng từ" : "Dùng ảnh / chứng từ"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSavePO}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Đang lưu..." : "Lưu Đơn Mua Hàng"}
          </Button>
        </div>
      </div>

      {/* THÔNG TIN CHUNG ĐƠN HÀNG */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Nhà cung cấp <span className="text-rose-500">*</span>
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="">-- Chọn nhà cung cấp --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Dự án công trình
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="">-- Mua bổ sung kho xưởng --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Ngày hẹn giao hàng
          </label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Ghi chú đơn hàng
          </label>
          <input
            type="text"
            placeholder="Điều khoản giao nhận, hóa đơn..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* BẢNG VẬT TƯ ĐƠN MUA HÀNG (FULL WIDTH, CLEAN) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs font-semibold text-slate-800">
            Danh sách vật tư đặt mua ({lines.length} dòng)
          </span>
          <div className="text-xs text-slate-600">
            Tổng tiền đơn mua:{" "}
            <strong className="font-mono text-sm text-slate-900 font-bold">
              {totalAmount.toLocaleString("vi-VN")} VND
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/75 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center font-semibold">#</th>
                <th className="py-2.5 px-3 min-w-[260px] font-semibold">Vật tư trong kho (SKU)</th>
                <th className="py-2.5 px-3 min-w-[200px] font-semibold">Quy cách / Mô tả chi tiết</th>
                <th className="py-2.5 px-3 text-center w-24 font-semibold">Số lượng</th>
                <th className="py-2.5 px-3 text-center w-20 font-semibold">ĐVT</th>
                <th className="py-2.5 px-3 text-right w-36 font-semibold">Đơn giá dự kiến</th>
                <th className="py-2.5 px-3 text-right w-36 font-semibold">Thành tiền</th>
                <th className="py-2.5 px-3 text-center w-12 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Chưa có mặt hàng nào trong đơn mua. Bấm <strong>"+ Thêm dòng vật tư"</strong> bên dưới hoặc dùng ảnh hóa đơn để nhập liệu.
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => {
                  const lineTotal = line.qty * line.unitPrice;
                  return (
                    <tr key={line.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={line.itemId}
                          onChange={(e) => handleUpdateLine(line.id, "itemId", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="">-- Chọn vật tư SKU --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} - {it.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={line.description}
                          placeholder="Mô tả quy cách, độ dày, màu sắc..."
                          onChange={(e) => handleUpdateLine(line.id, "description", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={line.qty}
                          onChange={(e) => handleUpdateLine(line.id, "qty", Math.max(1, Number(e.target.value)))}
                          className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-center font-mono focus:outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600 font-medium">
                        {line.unit || "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleUpdateLine(line.id, "unitPrice", Math.max(0, Number(e.target.value)))}
                          className="w-32 px-2 py-1.5 border border-slate-200 rounded text-xs text-right font-mono focus:outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {lineTotal.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer thêm dòng */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddLine}
            className="text-xs gap-1.5 text-slate-700"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm dòng vật tư
          </Button>

          <span className="text-xs text-slate-500">
            Tổng cộng: <strong>{lines.length} mặt hàng</strong> • Hạn mức duyệt trưởng phòng: 50.000.000 VND
          </span>
        </div>
      </div>

      {/* DRAWER CHỨNG TỪ & HỖ TRỢ AI OCR (KHÔNG CHE PHỦ HAY PHÁ VỠ GIAO DIỆN CHÍNH) */}
      <Drawer
        isOpen={isDocDrawerOpen}
        onClose={() => setIsDocDrawerOpen(false)}
        title="Chứng từ đính kèm & Hỗ trợ AI OCR"
        width="lg"
      >
        <div className="space-y-4 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleSelectImage}
            accept="image/*"
            className="hidden"
          />

          {/* Vùng chọn ảnh & thao tác */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                {invoiceImage ? "Thay ảnh chứng từ" : "Chọn ảnh hóa đơn / phiếu giao"}
              </Button>
              {invoiceImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunOcr}
                  disabled={ocrRunning}
                  className="text-xs gap-1.5 border-slate-300 text-slate-800 hover:bg-slate-100"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                  {ocrRunning ? "Đang phân tích..." : "Đọc ảnh bằng AI (Gemini)"}
                </Button>
              )}
            </div>

            {invoiceImage && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 20))}
                  className="p-1 hover:bg-slate-200 rounded"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] w-10 text-center">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(250, z + 20))}
                  className="p-1 hover:bg-slate-200 rounded"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:bg-slate-200 rounded"
                  title="Xoay 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Vùng xem ảnh */}
          {invoiceImage ? (
            <div className="border border-slate-200 rounded-xl overflow-auto h-64 bg-slate-100 flex items-center justify-center p-2 relative">
              <img
                src={invoiceImage}
                alt="Hóa đơn chứng từ"
                className="max-h-full object-contain transition-transform select-none"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p>Chưa có ảnh hóa đơn đính kèm</p>
              <p className="text-[11px] text-slate-400">
                Bạn có thể lập đơn mua hoàn toàn thủ công mà không cần tải ảnh.
              </p>
            </div>
          )}

          {/* Kết quả đề xuất OCR */}
          {ocrProposals.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    Kết quả đề xuất từ AI OCR ({ocrProposals.length} dòng)
                  </h4>
                  {ocrMeta?.supplierName && (
                    <p className="text-[11px] text-slate-500">
                      Nhà cung cấp nhận diện: <strong>{ocrMeta.supplierName}</strong>
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyProposals}
                  className="text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  Áp dụng dòng đã chọn vào PO
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">Chọn</th>
                      <th className="py-2 px-2">Tên trên hóa đơn</th>
                      <th className="py-2 px-2">Khớp vật tư kho</th>
                      <th className="py-2 px-2 text-center w-14">SL</th>
                      <th className="py-2 px-2 text-right w-24">Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ocrProposals.map((prop, idx) => (
                      <tr key={prop.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={prop.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setOcrProposals((prev) =>
                                prev.map((p) => (p.id === prop.id ? { ...p, selected: checked } : p))
                              );
                            }}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="py-1.5 px-2 font-medium text-slate-800">{prop.rawName}</td>
                        <td className="py-1.5 px-2">
                          <select
                            value={prop.matchedItemId || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const found = items.find((it) => it.id === val);
                              setOcrProposals((prev) =>
                                prev.map((p) =>
                                  p.id === prop.id
                                    ? {
                                        ...p,
                                        matchedItemId: val,
                                        matchedItemName: found?.name,
                                        matchedItemCode: found?.code,
                                      }
                                    : p
                                )
                              );
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800"
                          >
                            <option value="">-- Chưa khớp SKU kho --</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.code} - {it.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono">{prop.qty} {prop.unit}</td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {prop.unitPrice.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
