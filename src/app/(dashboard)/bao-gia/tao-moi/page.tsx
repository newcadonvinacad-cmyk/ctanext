"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Percent,
  TrendingUp,
  Layers,
  Wrench,
  Sparkles,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { Button, Badge, toast } from "@/components/ui";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { useAuthorization } from "@/hooks/use-authorization";

interface EstimateComponent {
  id: string;
  category: "FRAME" | "SURFACE" | "LED_LETTER" | "LABOR_TRANSPORT";
  categoryName: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export default function TaoMoiBaoGiaPage() {
  const router = useRouter();
  const { can, hasRole, isLoading } = useAuthorization();
  const canCreateQuote = can("quotation.create") || hasRole("SUPER_ADMIN");

  const [customers, setCustomers] = React.useState<any[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [quotationCode, setQuotationCode] = React.useState(`BG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [signName, setSignName] = React.useState("Biển Hộp Đèn 3M Cao Cấp & Chữ Nổi LED");
  const [dimensions, setDimensions] = React.useState({ length: 8.0, height: 2.5 }); // 8m x 2.5m = 20m2
  const [wasteRatePercent, setWasteRatePercent] = React.useState(5); // 5% hao hụt
  const [markupPercent, setMarkupPercent] = React.useState(45); // Biên lợi nhuận mục tiêu
  const [targetSellingPrice, setTargetSellingPrice] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  // 4 Thành phần bóc tách dự toán kỹ thuật chuẩn ngành quảng cáo
  const [components, setComponents] = React.useState<EstimateComponent[]>([
    // 1. Khung chịu lực
    {
      id: "1",
      category: "FRAME",
      categoryName: "1. Khung chịu lực",
      name: "Sắt hộp mạ kẽm Hòa Phát 30x30x1.4mm",
      spec: "Đan xương 500x500mm, mạ kẽm nhúng nóng",
      qty: 18,
      unit: "Cây",
      unitCost: 165000,
    },
    {
      id: "2",
      category: "FRAME",
      categoryName: "1. Khung chịu lực",
      name: "Bản mã neo chân cột & Que hàn Việt Đức",
      spec: "Thép tấm 10mm khoan lỗ bulong D16",
      qty: 1,
      unit: "Gói",
      unitCost: 1200000,
    },
    // 2. Bề mặt biển
    {
      id: "3",
      category: "SURFACE",
      categoryName: "2. Bề mặt biển",
      name: "Bạt 3M Panagraphics III không gân in UV",
      spec: "In công nghệ UV 2 mặt chống bay màu 5 năm",
      qty: 21,
      unit: "m²",
      unitCost: 450000,
    },
    {
      id: "4",
      category: "SURFACE",
      categoryName: "2. Bề mặt biển",
      name: "Nẹp nhôm định hình viền hộp đèn & Keo Titebond",
      spec: "Nhôm định hình sơn tĩnh điện chống nước",
      qty: 21,
      unit: "Mét",
      unitCost: 85000,
    },
    // 3. Chữ nổi & Đèn LED
    {
      id: "5",
      category: "LED_LETTER",
      categoryName: "3. Chữ nổi & Đèn LED",
      name: "Module LED 3 bóng mắt lồi NC Hàn Quốc",
      spec: "Ánh sáng trắng 6500K, chống nước IP68, 1.2W/bóng",
      qty: 750,
      unit: "Bóng",
      unitCost: 8500,
    },
    {
      id: "6",
      category: "LED_LETTER",
      categoryName: "3. Chữ nổi & Đèn LED",
      name: "Bộ nguồn chống nước ngoài trời 12V 33A 400W",
      spec: "Hiệu suất 85%, tải dự phòng 20%",
      qty: 4,
      unit: "Bộ",
      unitCost: 420000,
    },
    // 4. Nhân công & Vận chuyển
    {
      id: "7",
      category: "LABOR_TRANSPORT",
      categoryName: "4. Nhân công & Vận chuyển",
      name: "Công thợ hàn kết cấu & thợ dán LED xưởng",
      spec: "2 thợ x 2 ngày làm việc xưởng",
      qty: 4,
      unit: "Công",
      unitCost: 550000,
    },
    {
      id: "8",
      category: "LABOR_TRANSPORT",
      categoryName: "4. Nhân công & Vận chuyển",
      name: "Ca xe cẩu tự hành 3.5T & lắp dựng cao độ",
      spec: "Thi công lắp đặt ban đêm tại trung tâm thương mại",
      qty: 1,
      unit: "Ca",
      unitCost: 3500000,
    },
  ]);

  // Load danh sách khách hàng
  React.useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/crm/customers");
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
          if (data.customers?.length > 0) setCustomerId(data.customers[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCustomers();
  }, []);

  // Tính toán chi phí tự động
  const area = dimensions.length * dimensions.height;
  const rawCostTotal = components.reduce((sum, c) => sum + c.qty * c.unitCost, 0);
  const wasteCost = (rawCostTotal * wasteRatePercent) / 100;
  const totalCost = rawCostTotal + wasteCost; // Tổng giá vốn sau hao hụt

  // Tự động tính giá chào ban đầu nếu chưa nhập
  React.useEffect(() => {
    if (totalCost > 0 && targetSellingPrice === 0) {
      const calculatedSelling = Math.round(totalCost / (1 - markupPercent / 100));
      setTargetSellingPrice(calculatedSelling);
    }
  }, [totalCost, markupPercent, targetSellingPrice]);

  const grossProfit = targetSellingPrice - totalCost;
  const grossMarginPercent = targetSellingPrice > 0 ? (grossProfit / targetSellingPrice) * 100 : 0;

  const handleAddComponent = (category: EstimateComponent["category"], categoryName: string) => {
    setComponents((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        category,
        categoryName,
        name: "Hạng mục vật tư / chi phí mới",
        spec: "Quy cách kỹ thuật...",
        qty: 1,
        unit: "Cái",
        unitCost: 0,
      },
    ]);
  };

  const handleRemoveComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateComponent = (id: string, field: keyof EstimateComponent, value: any) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Lưu Báo Giá
  const handleSaveQuotation = async () => {
    if (!customerId) {
      toast.error("Vui lòng chọn Khách hàng!");
      return;
    }

    try {
      setSaving(true);
      const lines = [
        {
          description: `${signName || "Sản phẩm biển hiệu"} (${dimensions.length}m x ${dimensions.height}m)`,
          qty: 1,
          unitPrice: targetSellingPrice > 0 ? targetSellingPrice : totalCost,
          components: components.map((c) => ({
            kind: (c.category === "labor" ? "labor" : c.category === "machine" ? "transport" : c.category === "other" ? "other" : "material") as any,
            qty: c.qty || 1,
            unitCost: c.unitCost || 0,
            wasteRate: 0,
          })),
        },
      ];

      const payload = {
        code: quotationCode,
        customerId,
        title: signName,
        dimensions: `${dimensions.length}m x ${dimensions.height}m (${area.toFixed(1)} m²)`,
        estimatedCost: totalCost,
        totalAmount: targetSellingPrice,
        grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
        lines,
        components,
      };

      const res = await fetch("/api/crm/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi lưu báo giá");
      }

      toast.success("Tạo Báo giá dự toán bóc tách 4 thành phần thành công!");
      router.push("/bao-gia");
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu báo giá");
    } finally {
      setSaving(false);
    }
  };

  const categories: Array<{ key: EstimateComponent["category"]; label: string }> = [
    { key: "FRAME", label: "1. Khung chịu lực & Kết cấu sắt thép" },
    { key: "SURFACE", label: "2. Bề mặt biển (Alu / Bạt 3M / Decal)" },
    { key: "LED_LETTER", label: "3. Chữ nổi, Đèn LED & Bộ nguồn chống nước" },
    { key: "LABOR_TRANSPORT", label: "4. Nhân công thợ, Xe cẩu & Vận chuyển" },
  ];

  if (!isLoading && !canCreateQuote) {
    return (
      <AccessDenied
        screenCode="M03.1"
        screenName="Lập báo giá mới"
        requiredPermission="quotation.create"
      />
    );
  }

  return (
    <div className="w-full px-4 py-2 flex flex-col space-y-3 h-[calc(100vh-3.5rem)]">
      {/* Top Header thanh mảnh */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href="/bao-gia"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            M03 • FULL PAGE
          </span>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-blue-600" />
            Lập Báo Giá Dự Toán Bóc Tách 4 Thành Phần Kỹ Thuật
          </h1>
          <span className="text-slate-300 text-xs">/</span>
          <span className="text-xs text-slate-500">{quotationCode}</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveQuotation}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Đang lưu dự toán..." : "Lưu Báo Giá & Tính Lãi Gộp"}
          </Button>
        </div>
      </div>

      {/* DẢI THỐNG KÊ BIÊN LÃI GỘP THỜI GIAN THỰC (GROSS MARGIN STATBAR) */}
      <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-sm shrink-0 flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-400 block text-[11px]">Tổng giá vốn (Cost):</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {totalCost.toLocaleString("vi-VN")} đ
            </span>
            <span className="text-[10px] text-slate-400 block">Đã gồm {wasteRatePercent}% hao hụt</span>
          </div>

          <div className="border-l border-slate-700 pl-6">
            <span className="text-slate-400 block text-[11px]">Giá chào khách hàng (Revenue):</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={targetSellingPrice}
                onChange={(e) => setTargetSellingPrice(Number(e.target.value))}
                className="font-mono text-sm font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 w-36"
              />
              <span className="text-emerald-400 font-bold">đ</span>
            </div>
          </div>

          <div className="border-l border-slate-700 pl-6">
            <span className="text-slate-400 block text-[11px]">Lợi nhuận gộp (Profit):</span>
            <span className="font-mono text-sm font-bold text-blue-300">
              +{grossProfit.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">Biên lãi gộp (Gross Margin):</span>
            <span
              className={`font-mono text-lg font-extrabold ${
                grossMarginPercent >= 40
                  ? "text-emerald-400"
                  : grossMarginPercent >= 25
                  ? "text-blue-400"
                  : "text-amber-400"
              }`}
            >
              {grossMarginPercent.toFixed(1)}%
            </span>
          </div>
          <Badge
            variant={grossMarginPercent >= 40 ? "success" : grossMarginPercent >= 25 ? "info" : "warning"}
            className="text-xs"
          >
            {grossMarginPercent >= 40 ? "Lãi cao" : grossMarginPercent >= 25 ? "Đạt chuẩn" : "Biên mỏng"}
          </Badge>
        </div>
      </div>

      {/* THÔNG TIN CHUNG BIỂN BẢNG */}
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
          <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Tên hạng mục biển bảng</label>
          <input
            type="text"
            value={signName}
            onChange={(e) => setSignName(e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Dài (m)</label>
            <input
              type="number"
              step="0.1"
              value={dimensions.length}
              onChange={(e) => setDimensions({ ...dimensions, length: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Cao (m)</label>
            <input
              type="number"
              step="0.1"
              value={dimensions.height}
              onChange={(e) => setDimensions({ ...dimensions, height: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Diện tích (m²)</label>
            <input
              type="text"
              readOnly
              value={`${area.toFixed(1)} m²`}
              className="w-full px-2 py-1.5 border border-slate-200 bg-slate-50 rounded text-xs font-mono font-bold text-slate-700"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Hao hụt (%)</label>
            <input
              type="number"
              value={wasteRatePercent}
              onChange={(e) => setWasteRatePercent(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* BẢNG BÓC TÁCH 4 THÀNH PHẦN KỸ THUẬT */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-4">
        {categories.map((cat) => {
          const catItems = components.filter((c) => c.category === cat.key);
          const catTotal = catItems.reduce((sum, c) => sum + c.qty * c.unitCost, 0);

          return (
            <div key={cat.key} className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              {/* Header Thành Phần */}
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  {cat.label} ({catItems.length} hạng mục)
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700">
                    Tiểu kế: {catTotal.toLocaleString("vi-VN")} đ
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddComponent(cat.key, cat.label)}
                    className="text-[11px] px-2 py-1 h-7 gap-1"
                  >
                    <Plus className="w-3 h-3" /> Thêm dòng
                  </Button>
                </div>
              </div>

              {/* Table dòng vật tư */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 min-w-[200px]">Tên vật tư / Công việc</th>
                    <th className="py-2 px-2.5 min-w-[220px]">Quy cách kỹ thuật & Tiêu chuẩn</th>
                    <th className="py-2 px-2.5 text-center w-16">SL</th>
                    <th className="py-2 px-2.5 text-center w-16">ĐVT</th>
                    <th className="py-2 px-2.5 text-right w-28">Đơn giá vốn</th>
                    <th className="py-2 px-2.5 text-right w-32">Thành tiền</th>
                    <th className="py-2 px-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catItems.map((c) => {
                    const lineTotal = c.qty * c.unitCost;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-2.5">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => handleUpdateComponent(c.id, "name", e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium"
                          />
                        </td>
                        <td className="py-1.5 px-2.5">
                          <input
                            type="text"
                            value={c.spec}
                            onChange={(e) => handleUpdateComponent(c.id, "spec", e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-500"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={c.qty}
                            onChange={(e) => handleUpdateComponent(c.id, "qty", Number(e.target.value))}
                            className="w-14 px-1.5 py-1 border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <input
                            type="text"
                            value={c.unit}
                            onChange={(e) => handleUpdateComponent(c.id, "unit", e.target.value)}
                            className="w-14 px-1.5 py-1 border border-slate-200 rounded text-xs text-center text-slate-500"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-right">
                          <input
                            type="number"
                            value={c.unitCost}
                            onChange={(e) => handleUpdateComponent(c.id, "unitCost", Number(e.target.value))}
                            className="w-24 px-1.5 py-1 border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                          {lineTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <button
                            onClick={() => handleRemoveComponent(c.id)}
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
          );
        })}
      </div>
    </div>
  );
}
