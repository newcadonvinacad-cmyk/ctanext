import * as XLSX from "xlsx";
import { StockBalanceDto, WarehouseDto } from "@/services/inventory.service";

/**
 * Cấu trúc cột Excel chuẩn ERP cho Tồn Kho:
 * Cột này vừa dùng để xuất file vừa dùng làm tệp mẫu (Template) chuẩn để nhập lại kho.
 */
export interface ExcelStockRow {
  "Mã kho": string;
  "Tên kho": string;
  "Mã vật tư": string;
  "Tên vật tư": string;
  "Phân loại"?: string; // NVL (material) | Thành phẩm (product) | Bán thành phẩm (semi_finished)
  "Đơn vị tính": string;
  "Mã nhóm"?: string;
  "Tên nhóm"?: string;
  "Mã lô / Quy cách"?: string;
  "Vị trí kệ"?: string;
  "Tồn đầu kỳ"?: number | string; // Số lượng tồn thực tế / đầu kỳ
  "Tồn an toàn"?: number | string;
  "Đơn giá vốn"?: number | string;
  "Thành tiền tồn"?: number | string;
}

/**
 * Xuất file Excel tồn kho:
 * - Nếu xem 1 kho: Xuất 1 sheet với tên là Mã kho (hoặc Tên kho)
 * - Nếu xem "Tất cả các kho" (selectedWarehouseId === "all"):
 *   + Sheet 1: "Tổng hợp tất cả kho"
 *   + Các sheet tiếp theo: Mỗi kho là 1 Sheet riêng biệt theo từng Mã kho
 */
export function exportWarehouseStocksToExcel({
  stocks,
  warehouses,
  selectedWarehouseId,
  canViewCost = false,
}: {
  stocks: StockBalanceDto[];
  warehouses: WarehouseDto[];
  selectedWarehouseId: string;
  canViewCost?: boolean;
}) {
  const wb = XLSX.utils.book_new();

  const mapStockToRow = (s: StockBalanceDto): Record<string, any> => {
    const row: Record<string, any> = {
      "Mã kho": s.warehouseCode,
      "Tên kho": s.warehouseName,
      "Mã vật tư": s.itemCode,
      "Tên vật tư": s.itemName,
      "Đơn vị tính": s.unitName || s.unitCode,
      "Mã lô / Quy cách": s.lotCode || "Tiêu chuẩn",
      "Vị trí kệ": s.binLabel || "Chưa xếp kệ",
      "Tồn đầu kỳ": Number(s.onHandQty) || 0,
      "Tồn an toàn": Number(s.minQty) || 0,
    };

    if (canViewCost) {
      const onHand = Number(s.onHandQty) || 0;
      const val = Number(s.inventoryValue) || 0;
      const unitCost = onHand > 0 ? Math.round(val / onHand) : 0;
      row["Đơn giá vốn"] = unitCost;
      row["Thành tiền tồn"] = val;
    }

    return row;
  };

  const colWidths = [
    { wch: 12 }, // Mã kho
    { wch: 22 }, // Tên kho
    { wch: 15 }, // Mã vật tư
    { wch: 35 }, // Tên vật tư
    { wch: 12 }, // Đơn vị tính
    { wch: 18 }, // Mã lô / Quy cách
    { wch: 15 }, // Vị trí kệ
    { wch: 14 }, // Tồn đầu kỳ
    { wch: 14 }, // Tồn an toàn
    ...(canViewCost ? [{ wch: 15 }, { wch: 18 }] : []),
  ];

  if (selectedWarehouseId !== "all") {
    // Xuất duy nhất 1 kho đang chọn
    const targetWh = warehouses.find((w) => w.id === selectedWarehouseId);
    const sheetName = (targetWh ? `${targetWh.code}` : "TonKho").slice(0, 31);
    const rows = stocks.map(mapStockToRow);

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [getEmptySampleRow(targetWh)]);
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `TonKho_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return;
  }

  // Chế độ: "Tất cả các kho" -> Xuất file đa Sheet (Multi-sheet)
  // Sheet 1: "Tổng hợp tất cả kho"
  const allRows = stocks.map(mapStockToRow);
  const summaryWs = XLSX.utils.json_to_sheet(
    allRows.length > 0 ? allRows : [getEmptySampleRow()]
  );
  summaryWs["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, summaryWs, "Tong_Hop_Cac_Kho");

  // Các sheet tiếp theo: Mỗi kho là 1 sheet riêng biệt
  for (const wh of warehouses) {
    const whStocks = stocks.filter(
      (s) => s.warehouseId === wh.id || s.warehouseCode === wh.code
    );
    const whRows = whStocks.map(mapStockToRow);
    const ws = XLSX.utils.json_to_sheet(
      whRows.length > 0 ? whRows : [getEmptySampleRow(wh)]
    );
    ws["!cols"] = colWidths;

    // Tên sheet trong Excel tối đa 31 ký tự, không chứa ký tự cấm: \ / ? * [ ]
    const safeSheetName = `${wh.code}`.replace(/[\\/?*[\]]/g, "_").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  }

  const fileName = `TonKho_TongHop_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Tải file Excel mẫu chuẩn (Template) để người dùng nhập liệu
 */
export function downloadStockImportTemplate(warehouse?: WarehouseDto) {
  const wb = XLSX.utils.book_new();

  const templateRows: Record<string, any>[] = [
    {
      "Mã kho": warehouse ? warehouse.code : "KHO-TONG",
      "Tên kho": warehouse ? warehouse.name : "Kho Xưởng Sản Xuất Chính",
      "Mã vật tư": "ALU-EV-01",
      "Tên vật tư": "Tấm Alu Alcorest EV3002 Nhôm Vàng",
      "Phân loại": "NVL", // NVL (material) | Thành phẩm (product) | Bán thành phẩm (semi_finished)
      "Đơn vị tính": "Tấm",
      "Mã nhóm": "ALU",
      "Tên nhóm": "Tấm Nhôm Nhựa Alu",
      "Mã lô / Quy cách": "1220x2440mm",
      "Vị trí kệ": "Kệ A-01",
      "Tồn đầu kỳ": 50,
      "Tồn an toàn": 10,
      "Đơn giá vốn": 380000,
    },
    {
      "Mã kho": warehouse ? warehouse.code : "KHO-TONG",
      "Tên kho": warehouse ? warehouse.name : "Kho Xưởng Sản Xuất Chính",
      "Mã vật tư": "HOP-DEN-01",
      "Tên vật tư": "Hộp đèn Hiflex khung sắt hoàn thiện",
      "Phân loại": "Thành phẩm",
      "Đơn vị tính": "Bộ",
      "Mã nhóm": "HOPDEN",
      "Tên nhóm": "Biển & Hộp Đèn Quảng Cáo",
      "Mã lô / Quy cách": "Tiêu chuẩn",
      "Vị trí kệ": "Khu Thành Phẩm",
      "Tồn đầu kỳ": 5,
      "Tồn an toàn": 2,
      "Đơn giá vốn": 1250000,
    },
    {
      "Mã kho": warehouse ? warehouse.code : "KHO-TONG",
      "Tên kho": warehouse ? warehouse.name : "Kho Xưởng Sản Xuất Chính",
      "Mã vật tư": "LED-MOD-3M",
      "Tên vật tư": "Led Module 3 bóng trắng ấm Hàn Quốc",
      "Phân loại": "NVL",
      "Đơn vị tính": "Bóng",
      "Mã nhóm": "LED",
      "Tên nhóm": "Vật Tư Led & Nguồn",
      "Mã lô / Quy cách": "Tiêu chuẩn",
      "Vị trí kệ": "Kệ B-04",
      "Tồn đầu kỳ": 1200,
      "Tồn an toàn": 200,
      "Đơn giá vốn": 4200,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateRows);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 38 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Ton_Kho");

  // Hướng dẫn sử dụng
  const guideRows = [
    {
      "CỘT BẮT BUỘC": "Mã kho, Tên vật tư (hoặc Mã vật tư), Đơn vị tính, Tồn đầu kỳ",
      "LƯU Ý NGHIỆP VỤ":
        "1. Nếu Mã vật tư chưa tồn tại: Hệ thống sẽ TỰ ĐỘNG TẠO MỚI vật tư/thành phẩm vào Danh mục hàng hóa với Phân loại và Đơn vị tính tương ứng.",
      "CÁCH NHẬP":
        "2. Cột Phân loại: Nhập 'NVL' (Nguyên vật liệu) hoặc 'Thành phẩm' (Product) hoặc 'Bán thành phẩm'.",
      "KHO NHẬP":
        "3. Nếu bạn đã chọn kho trên giao diện, hệ thống ưu tiên nhập vào kho đó. Nếu trong file có cột 'Mã kho', hệ thống sẽ ghi nhận theo mã kho đó.",
    },
  ];
  const guideWs = XLSX.utils.json_to_sheet(guideRows);
  XLSX.utils.book_append_sheet(wb, guideWs, "Huong_Dan");

  const fileName = `Mau_Nhap_Ton_Kho_ERP_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function getEmptySampleRow(wh?: WarehouseDto) {
  return {
    "Mã kho": wh?.code || "KHO-TONG",
    "Tên kho": wh?.name || "Kho chính",
    "Mã vật tư": "SKU-SAMPLE",
    "Tên vật tư": "Vật tư mẫu",
    "Đơn vị tính": "Cái",
    "Mã lô / Quy cách": "Tiêu chuẩn",
    "Vị trí kệ": "Chưa xếp kệ",
    "Tồn đầu kỳ": 0,
    "Tồn an toàn": 0,
  };
}
