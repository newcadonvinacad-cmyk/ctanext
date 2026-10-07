"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Modal, Button, toast } from "@/components/ui";
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Warehouse,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileText
} from "lucide-react";
import { WarehouseDto } from "@/services/inventory.service";
import { downloadStockImportTemplate } from "@/lib/inventory-excel";

export interface StockImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: WarehouseDto[];
  defaultWarehouseId?: string;
  onSuccess: () => void;
}

interface ParsedStockRow {
  index: number;
  itemCode: string;
  itemName: string;
  kindText: string;
  unitName: string;
  categoryName: string;
  lotCode: string;
  binLabel: string;
  onHandQty: number;
  minQty: number;
  unitCost: number;
  totalValue: number;
  targetWarehouseCode: string;
  isExisting: boolean;
  isValid: boolean;
  issues: string[];
}

export function StockImportModal({
  isOpen,
  onClose,
  warehouses,
  defaultWarehouseId = "all",
  onSuccess,
}: StockImportModalProps) {
  // Kho được chọn để nhập
  const [targetWarehouseId, setTargetWarehouseId] = React.useState<string>(
    defaultWarehouseId !== "all" ? defaultWarehouseId : warehouses[0]?.id || ""
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [rawRows, setRawRows] = React.useState<Array<Record<string, any>>>([]);
  const [sheetNames, setSheetNames] = React.useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = React.useState<string>("");
  const [workbook, setWorkbook] = React.useState<XLSX.WorkBook | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filterMode, setFilterMode] = React.useState<"all" | "new" | "existing" | "invalid">("all");
  const [searchKeyword, setSearchKeyword] = React.useState("");

  // Catalog item codes để kiểm tra mã đã tồn tại hay mới
  const [existingItemCodes, setExistingItemCodes] = React.useState<Set<string>>(new Set());
  const [existingItemNames, setExistingItemNames] = React.useState<Set<string>>(new Set());

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tải danh sách item hiện có để đối chiếu nhanh
  React.useEffect(() => {
    if (isOpen) {
      if (defaultWarehouseId !== "all" && defaultWarehouseId) {
        setTargetWarehouseId(defaultWarehouseId);
      } else if (warehouses.length > 0 && !targetWarehouseId) {
        setTargetWarehouseId(warehouses[0].id);
      }
      setFile(null);
      setRawRows([]);
      setSheetNames([]);
      setWorkbook(null);
      setFilterMode("all");
      setSearchKeyword("");

      // Fetch items danh mục
      fetch("/api/inventory/items?limit=1000")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items)) {
            const codes = new Set<string>();
            const names = new Set<string>();
            data.items.forEach((it: any) => {
              if (it.code) codes.add(String(it.code).trim().toUpperCase());
              if (it.name) names.add(String(it.name).trim().toLowerCase());
            });
            setExistingItemCodes(codes);
            setExistingItemNames(names);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultWarehouseId, warehouses]);

  // Đọc file Excel khi người dùng chọn
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls") && !f.name.endsWith(".csv")) {
      toast.error("Vui lòng chọn tệp định dạng .xlsx, .xls hoặc .csv");
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        setWorkbook(wb);
        const sheets = wb.SheetNames;
        setSheetNames(sheets);

        // Mặc định chọn sheet đầu tiên không phải Huong_Dan
        const initialSheet = sheets.find((s) => !s.toLowerCase().includes("huong_dan")) || sheets[0];
        setSelectedSheet(initialSheet);
        parseSheetData(wb, initialSheet);
      } catch (err: any) {
        toast.error("Lỗi đọc file Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(f);
  };

  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const json: Array<Record<string, any>> = XLSX.utils.sheet_to_json(ws, { defval: "" });
    setRawRows(json);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      parseSheetData(workbook, sheetName);
    }
  };

  const selectedWhObj = warehouses.find((w) => w.id === targetWarehouseId);

  // Phân tích chi tiết từng dòng preview
  const parsedRows = React.useMemo<ParsedStockRow[]>(() => {
    return rawRows.map((r, idx) => {
      const rawCode = (r["Mã vật tư"] || r["Mã hàng"] || r["Mã SKU"] || r["itemCode"] || "").toString().trim();
      const rawName = (r["Tên vật tư"] || r["Tên hàng"] || r["itemName"] || "").toString().trim();
      const rawKind = (r["Phân loại"] || r["Loại"] || r["kind"] || "NVL").toString().trim();
      const rawUnit = (r["Đơn vị tính"] || r["ĐVT"] || r["unitName"] || "Cái").toString().trim();
      const rawCat = (r["Tên nhóm"] || r["Mã nhóm"] || r["categoryName"] || "").toString().trim();
      const rawLot = (r["Mã lô / Quy cách"] || r["Quy cách"] || r["lotCode"] || "Tiêu chuẩn").toString().trim();
      const rawBin = (r["Vị trí kệ"] || r["Kệ"] || r["binLabel"] || "Chưa xếp kệ").toString().trim();
      const rawWhCode = (r["Mã kho"] || r["Kho"] || "").toString().trim();

      const rawOnHand = r["Tồn đầu kỳ"] ?? r["Số lượng"] ?? r["onHandQty"] ?? 0;
      const onHandQty = parseFloat(String(rawOnHand).replace(/,/g, "")) || 0;

      const rawMin = r["Tồn an toàn"] ?? r["minQty"] ?? 0;
      const minQty = parseFloat(String(rawMin).replace(/,/g, "")) || 0;

      const rawCost = r["Đơn giá vốn"] ?? r["Đơn giá"] ?? r["unitCost"] ?? 0;
      const unitCost = parseFloat(String(rawCost).replace(/,/g, "")) || 0;

      const totalValue = onHandQty * unitCost;

      const issues: string[] = [];
      if (!rawName && !rawCode) {
        issues.push("Thiếu cả mã và tên vật tư");
      }
      if (onHandQty < 0) {
        issues.push("Số lượng tồn âm");
      }

      const isValid = issues.length === 0;

      // Kiểm tra mặt hàng đã tồn tại hay tạo mới
      const isExisting =
        (rawCode && existingItemCodes.has(rawCode.toUpperCase())) ||
        (rawName && existingItemNames.has(rawName.toLowerCase())) ||
        false;

      return {
        index: idx + 1,
        itemCode: rawCode || "(Tự sinh mã)",
        itemName: rawName || "---",
        kindText: rawKind,
        unitName: rawUnit,
        categoryName: rawCat,
        lotCode: rawLot,
        binLabel: rawBin,
        onHandQty,
        minQty,
        unitCost,
        totalValue,
        targetWarehouseCode: rawWhCode || (selectedWhObj?.code || ""),
        isExisting,
        isValid,
        issues,
      };
    });
  }, [rawRows, existingItemCodes, existingItemNames, selectedWhObj]);

  // Thống kê tóm tắt
  const summary = React.useMemo(() => {
    let totalOnHand = 0;
    let totalValue = 0;
    let newItemsCount = 0;
    let existingItemsCount = 0;
    let invalidCount = 0;

    for (const r of parsedRows) {
      if (!r.isValid) {
        invalidCount++;
        continue;
      }
      totalOnHand += r.onHandQty;
      totalValue += r.totalValue;
      if (r.isExisting) {
        existingItemsCount++;
      } else {
        newItemsCount++;
      }
    }

    return {
      totalRows: parsedRows.length,
      validRows: parsedRows.length - invalidCount,
      newItemsCount,
      existingItemsCount,
      invalidCount,
      totalOnHand,
      totalValue,
    };
  }, [parsedRows]);

  // Lọc danh sách xem trước
  const filteredRows = React.useMemo(() => {
    return parsedRows.filter((r) => {
      if (filterMode === "new" && (r.isExisting || !r.isValid)) return false;
      if (filterMode === "existing" && (!r.isExisting || !r.isValid)) return false;
      if (filterMode === "invalid" && r.isValid) return false;

      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchCode = r.itemCode.toLowerCase().includes(kw);
        const matchName = r.itemName.toLowerCase().includes(kw);
        const matchUnit = r.unitName.toLowerCase().includes(kw);
        const matchBin = r.binLabel.toLowerCase().includes(kw);
        return matchCode || matchName || matchUnit || matchBin;
      }

      return true;
    });
  }, [parsedRows, filterMode, searchKeyword]);

  const handleSubmit = async () => {
    if (!targetWarehouseId || targetWarehouseId === "all") {
      toast.error("Vui lòng chọn cụ thể kho nhận trước khi nhập tồn kho");
      return;
    }

    if (!rawRows || rawRows.length === 0) {
      toast.error("Không có dòng dữ liệu nào trong tệp để nhập");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/import-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: targetWarehouseId,
          rows: rawRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || "Không thể nhập dữ liệu tồn kho");
      }

      toast.success(
        `Đã nhập thành công ${data.successCount} mặt hàng vào kho! ` +
          (data.createdItemsCount > 0 ? `(Tự động tạo mới ${data.createdItemsCount} vật tư/thành phẩm)` : "")
      );

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Có ${data.errors.length} dòng bị bỏ qua hoặc gặp lỗi.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý file Excel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhập Tồn Kho Hàng Loạt Từ File Excel"
      maxWidth="4xl"
      description="Xem trước toàn bộ dữ liệu, tự động phát hiện mặt hàng mới và ghi nhận số dư tồn đầu kỳ vào kho."
    >
      <div className="space-y-4 text-xs">
        {/* 1. BƯỚC 1: CHỌN KHO NHẬN & TẢI MẪU */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Warehouse className="w-4 h-4 text-blue-600" />
              <span>Kho nhận tồn kho <span className="text-rose-500">*</span>:</span>
            </label>
            <select
              value={targetWarehouseId}
              onChange={(e) => setTargetWarehouseId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.name} ({w.type === "workshop" ? "Kho xưởng" : "Kho phân phối/trung chuyển"})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              * Tồn đầu kỳ sẽ được gán vào kho này (nếu dòng trong file không ghi đè mã kho khác).
            </p>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block mb-1">Mẫu tệp chuẩn hóa:</span>
              <p className="text-[11px] text-slate-500">
                Tải file mẫu Excel chuẩn để điền mã vật tư, phân loại NVL/Thành phẩm, số lượng tồn đầu kỳ và giá vốn.
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadStockImportTemplate(selectedWhObj)}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 flex items-center justify-center gap-1.5 font-semibold"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Tải tệp mẫu Excel chuẩn (.xlsx)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 2. BƯỚC 2: CHỌN FILE HOẶC KÉO THẢ */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30"
          >
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
              {file ? (
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • Có <b>{parsedRows.length}</b> dòng phát hiện • Bấm để chọn lại file
                  </p>
                </div>
              ) : (
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-700">
                    Bấm để tải tệp lên hoặc kéo thả file Excel vào đây
                  </p>
                  <p className="text-[11px] text-slate-400">Hỗ trợ các định dạng .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CHỌN SHEET NẾU FILE ĐA SHEET */}
        {sheetNames.length > 1 && (
          <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Tệp có nhiều Sheet, chọn Sheet cần nhập:</span>
            </span>
            <select
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="px-2.5 py-1 bg-white border border-amber-300 rounded text-xs font-semibold focus:outline-none"
            >
              {sheetNames.map((s) => (
                <option key={s} value={s}>
                  Sheet: {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. BẢNG PREVIEW VÀ THỐNG KÊ CHI TIẾT */}
        {parsedRows.length > 0 && (
          <div className="space-y-3 pt-1">
            {/* Thẻ thống kê (Metric Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[11px] font-medium text-slate-500 block">Tổng số dòng đọc được</span>
                <span className="text-base font-black text-slate-900">{summary.totalRows} dòng</span>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                  ✓ {summary.validRows} hợp lệ
                </span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
                <span className="text-[11px] font-medium text-emerald-800 block">Mặt hàng tạo mới</span>
                <span className="text-base font-black text-emerald-700">+{summary.newItemsCount} SKU</span>
                <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                  Tự tạo vào danh mục
                </span>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5">
                <span className="text-[11px] font-medium text-blue-800 block">Mặt hàng đã có sẵn</span>
                <span className="text-base font-black text-blue-700">{summary.existingItemsCount} SKU</span>
                <span className="text-[10px] text-blue-600 font-medium block mt-0.5">
                  Cập nhật số dư tồn
                </span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
                <span className="text-[11px] font-medium text-amber-800 block">Tổng tồn & Giá trị</span>
                <span className="text-base font-black text-amber-900">
                  {summary.totalOnHand.toLocaleString("vi-VN")}
                </span>
                <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                  ≈ {summary.totalValue.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            {/* Thanh công cụ lọc & tìm kiếm dòng Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/70 p-2 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterMode === "all"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("new")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterMode === "new"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Tạo mới ({summary.newItemsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("existing")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterMode === "existing"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  Đã có ({summary.existingItemsCount})
                </button>
                {summary.invalidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("invalid")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      filterMode === "invalid"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    Cảnh báo ({summary.invalidCount})
                  </button>
                )}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã, tên vật tư, kệ..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full text-xs pl-8 pr-2.5 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bảng Preview toàn diện có thanh cuộn */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto divide-y divide-slate-100">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2 w-10 text-center">STT</th>
                      <th className="p-2">Trạng thái</th>
                      <th className="p-2">Mã vật tư</th>
                      <th className="p-2">Tên vật tư</th>
                      <th className="p-2">Phân loại</th>
                      <th className="p-2">ĐVT</th>
                      <th className="p-2">Vị trí kệ</th>
                      <th className="p-2 text-right">Tồn đầu kỳ</th>
                      <th className="p-2 text-right">Đơn giá vốn</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-slate-400">
                          Không tìm thấy dòng dữ liệu nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => (
                        <tr
                          key={r.index}
                          className={`hover:bg-slate-50/80 transition ${
                            !r.isValid ? "bg-rose-50/50" : ""
                          }`}
                        >
                          <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                            {r.index}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {!r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>{r.issues[0]}</span>
                              </span>
                            ) : !r.isExisting ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                <PlusCircle className="w-3 h-3 text-emerald-600" />
                                <span>Tạo mới</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                <RefreshCw className="w-3 h-3 text-blue-600" />
                                <span>Đã có</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-mono font-bold text-blue-800 whitespace-nowrap">
                            {r.itemCode}
                          </td>
                          <td className="p-2 font-medium text-slate-900 max-w-[200px] truncate" title={r.itemName}>
                            {r.itemName}
                          </td>
                          <td className="p-2 text-slate-600 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                              {r.kindText}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 whitespace-nowrap">{r.unitName}</td>
                          <td className="p-2 text-slate-500 whitespace-nowrap">{r.binLabel}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {r.onHandQty.toLocaleString("vi-VN")}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-600 whitespace-nowrap">
                            {r.unitCost > 0 ? `${r.unitCost.toLocaleString("vi-VN")} đ` : "---"}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {r.totalValue > 0 ? `${r.totalValue.toLocaleString("vi-VN")} đ` : "---"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Hiển thị <b>{filteredRows.length}</b> / <b>{parsedRows.length}</b> dòng dữ liệu
                </span>
                <span className="italic text-slate-400">
                  * Mặt hàng tạo mới sẽ tự động nhận diện theo mã SKU hoặc tên vật tư
                </span>
              </div>
            </div>
          </div>
        )}

        {/* NÚT THAO TÁC */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-slate-500">
            {selectedWhObj && (
              <span>
                Kho nhận: <b className="text-slate-800">{selectedWhObj.name}</b> ({selectedWhObj.code})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || parsedRows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? "Đang lưu tồn kho..."
                  : `Xác nhận nhập (${summary.validRows} mặt hàng)`}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
