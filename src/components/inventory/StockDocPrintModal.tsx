"use client";

import * as React from "react";
import { Modal, Button } from "@/components/ui";
import { Printer, X } from "lucide-react";
import { StockDocumentDto, StockDocumentLineDto } from "@/services/inventory.service";

export interface CompanyInfo {
  companyName: string;
  companyCode?: string;
  taxCode?: string;
  hotline?: string;
  address?: string;
  email?: string;
  representative?: string;
  bankAccount?: string;
  bankName?: string;
}

export interface StockDocPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: StockDocumentDto | null;
  lines: StockDocumentLineDto[];
}

export function StockDocPrintModal({
  isOpen,
  onClose,
  document,
  lines,
}: StockDocPrintModalProps) {
  const [companyInfo, setCompanyInfo] = React.useState<CompanyInfo>({
    companyName: "CÔNG TY TNHH QUẢNG CÁO & NỘI THẤT SIGNAGE",
    taxCode: "0109887766",
    hotline: "0988.123.456",
    address: "KCN Triều Khúc, Thanh Xuân, Hà Nội",
    email: "contact@signage-erp.vn",
  });

  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/settings/company")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.settings) {
            setCompanyInfo(data.settings);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!document) return null;

  const isReceipt = document.type === "receipt";
  const isIssue = document.type === "issue";
  const isTransfer = document.type === "transfer";

  const title = isReceipt
    ? "PHIẾU NHẬP KHO"
    : isIssue
    ? "PHIẾU XUẤT KHO"
    : isTransfer
    ? "PHIẾU ĐIỀU CHUYỂN KHO"
    : "PHIẾU ĐIỀU CHỈNH KHO";

  const subTitle = isReceipt
    ? "Liên 1: Lưu trữ kế toán / Kho nhận"
    : isIssue
    ? "Liên 1: Thủ kho xuất / Giao nhận công trình"
    : "Liên 1: Điều phối luân chuyển nội bộ";

  const handlePrint = () => {
    const printContent = window.document.getElementById("printable-stock-doc-a4");
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document.code} - ${title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              font-size: 13px;
              line-height: 1.4;
            }
            .header-table {
              width: 100%;
              margin-bottom: 12px;
              border-bottom: 1px solid #333;
              padding-bottom: 8px;
            }
            .title-section {
              text-align: center;
              margin: 16px 0 12px 0;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .subtitle {
              font-size: 11px;
              font-style: italic;
              margin: 3px 0 0 0;
            }
            .meta-grid {
              width: 100%;
              margin-bottom: 14px;
            }
            .meta-grid td {
              padding: 2.5px 0;
              font-size: 13px;
              vertical-align: top;
            }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0 16px 0;
            }
            table.data-table th, table.data-table td {
              border: 1px solid #333;
              padding: 6px 8px;
              font-size: 12px;
            }
            table.data-table th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .signatures-table {
              width: 100%;
              margin-top: 25px;
              page-break-inside: avoid;
            }
            .signatures-table td {
              text-align: center;
              vertical-align: top;
              width: 25%;
              padding: 4px;
            }
            .sig-title {
              font-weight: bold;
              font-size: 12.5px;
            }
            .sig-sub {
              font-size: 11px;
              font-style: italic;
              color: #555;
              margin-top: 2px;
            }
            .sig-space {
              height: 65px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function () { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bản In Phiếu Kho Khổ A4 Chuẩn ERP - [${document.code}]`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* KHUNG A4 HIỂN THỊ CHUẨN */}
        <div
          id="printable-stock-doc-a4"
          className="bg-white border border-slate-300 rounded-lg p-8 shadow-xs text-slate-900 font-serif text-[13px] leading-relaxed"
        >
          {/* HEADER DOANH NGHIỆP TỪ CAI-DAT */}
          <table className="header-table w-full border-b border-slate-400 pb-3 mb-3">
            <tbody>
              <tr>
                <td className="align-top w-2/3">
                  <h3 className="font-bold text-sm uppercase text-slate-900 font-sans tracking-wide">
                    {companyInfo.companyName}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    <strong>Địa chỉ:</strong> {companyInfo.address}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>MST:</strong> {companyInfo.taxCode} &nbsp;|&nbsp; <strong>Hotline:</strong> {companyInfo.hotline}
                  </p>
                </td>
                <td className="align-top text-right w-1/3">
                  <p className="font-mono font-bold text-xs text-blue-800">Mẫu số: 01-VT/Signage</p>
                  <p className="text-[11px] text-slate-500 italic">(Ban hành theo TT 200/2014/TT-BTC)</p>
                  <p className="font-mono text-xs font-semibold text-slate-800 mt-1">Số: {document.code}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TIÊU ĐỀ PHIẾU */}
          <div className="title-section text-center my-4">
            <h1 className="title text-xl font-bold uppercase tracking-wider text-slate-900">
              {title}
            </h1>
            <p className="subtitle text-xs italic text-slate-500 mt-0.5">
              Ngày lập: {new Date(document.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} • {subTitle}
            </p>
          </div>

          {/* THÔNG TIN THAM CHIẾU */}
          <table className="meta-grid w-full my-3 text-xs leading-normal">
            <tbody>
              <tr>
                <td className="w-1/2 py-0.5">
                  <strong>Kho xuất nguồn:</strong> {document.sourceWarehouseName || (isReceipt ? "Nhà cung cấp / Đối tác" : "Kho chính")}
                </td>
                <td className="w-1/2 py-0.5">
                  <strong>Kho nhập đích:</strong> {document.destinationWarehouseName || (isIssue ? "Công trình / Hiện trường" : "Kho chính")}
                </td>
              </tr>
              <tr>
                <td className="py-0.5" colSpan={2}>
                  <strong>Lý do / Mục đích:</strong> {document.purpose || "Xuất nhập vật tư phục vụ sản xuất thi công"}
                  {document.reason && ` (${document.reason})`}
                </td>
              </tr>
              {document.receiverName && (
                <tr>
                  <td className="py-0.5" colSpan={2}>
                    <strong>Người nhận hàng:</strong> {document.receiverName}
                    {document.receiverType && ` (${document.receiverType === "internal" ? "Nội bộ" : "Bên ngoài"})`}
                    {document.receiverPhone && ` • SĐT: ${document.receiverPhone}`}
                    {document.receivedAt && ` • Ngày nhận: ${new Date(document.receivedAt).toLocaleDateString("vi-VN")}`}
                  </td>
                </tr>
              )}
              {document.projectName && (
                <tr>
                  <td className="py-0.5" colSpan={2}>
                    <strong>Công trình / Dự án:</strong> {document.projectName}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* BẢNG DÒNG CHI TIẾT VẬT TƯ */}
          <table className="data-table w-full border-collapse border border-slate-400 my-3 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                <th className="border border-slate-400 p-2 text-center w-10">STT</th>
                <th className="border border-slate-400 p-2 text-center w-28">Mã SKU</th>
                <th className="border border-slate-400 p-2 text-left">Tên vật tư & Quy cách</th>
                <th className="border border-slate-400 p-2 text-center w-16">ĐVT</th>
                <th className="border border-slate-400 p-2 text-center w-24">Vị trí / Lô</th>
                <th className="border border-slate-400 p-2 text-right w-24">Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1.5 text-center text-slate-600">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-mono font-medium text-slate-900 text-center">
                    {l.itemCode}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">
                    {l.itemName}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-700">
                    {l.unitName}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px] text-slate-600">
                    {l.locationName ? `${l.locationName} (${l.lotCode || "Chuẩn"})` : (l.lotCode || "Tiêu chuẩn")}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900">
                    {Number(l.qty).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                <td colSpan={5} className="border border-slate-400 p-2 text-right uppercase text-slate-800">
                  Tổng cộng số lượng:
                </td>
                <td className="border border-slate-400 p-2 text-right font-mono text-sm text-blue-900">
                  {totalQty.toLocaleString("vi-VN")}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4 CHỮ KÝ CHUẨN IN A4 */}
          <table className="signatures-table w-full mt-8 pt-4">
            <tbody>
              <tr>
                <td className="text-center">
                  <p className="sig-title font-bold text-slate-900">Người Lập Phiếu</p>
                  <p className="sig-sub text-[11px] italic text-slate-500">(Ký, họ tên)</p>
                  <div className="sig-space h-16"></div>
                  <p className="font-semibold text-xs text-slate-800">{document.createdByName || "Người lập"}</p>
                </td>
                <td className="text-center">
                  <p className="sig-title font-bold text-slate-900">Người Nhận / Giao</p>
                  <p className="sig-sub text-[11px] italic text-slate-500">(Ký, họ tên)</p>
                  <div className="sig-space h-16"></div>
                  <p className="font-semibold text-xs text-slate-800">
                    {document.receiverName || "............................"}
                  </p>
                  {document.receiverPhone && (
                    <p className="text-[10px] text-slate-500 mt-0.5">SĐT: {document.receiverPhone}</p>
                  )}
                </td>
                <td className="text-center">
                  <p className="sig-title font-bold text-slate-900">Thủ Kho</p>
                  <p className="sig-sub text-[11px] italic text-slate-500">(Ký, họ tên)</p>
                  <div className="sig-space h-16"></div>
                  <p className="font-semibold text-xs text-slate-800">............................</p>
                </td>
                <td className="text-center">
                  <p className="sig-title font-bold text-slate-900">Giám Đốc / Kế Toán</p>
                  <p className="sig-sub text-[11px] italic text-slate-500">(Ký, đóng dấu)</p>
                  <div className="sig-space h-16"></div>
                  <p className="font-semibold text-xs text-slate-800">{companyInfo.representative || "Ban Giám Đốc"}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* NÚT HÀNH ĐỘNG */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In khổ A4 ngay (Ctrl+P / Xuất PDF)</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
