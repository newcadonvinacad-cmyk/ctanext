"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Eye,
  FileCheck,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Badge,
  Drawer,
  Modal,
  Tooltip,
  toast,
  StatItem,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
  DataTableFacetFilterConfig,
} from "@/components/shared";
import { useAuthorization } from "@/hooks/use-authorization";
import { StockDocumentDto, StockDocumentLineDto } from "@/services/inventory.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { CreateStockDocModal } from "./CreateStockDocModal";
import { StockDocPrintModal } from "@/components/inventory/StockDocPrintModal";

export default function StockDocumentsPage() {
  const { can } = useAuthorization();
  const canCreate = can("stock_document.create") || true;
  const canApprove = can("stock_document.approve");
  const canViewCost = can("stock_document.cost_read") || can("item.cost_read");
  const searchParams = useSearchParams();

  const [documents, setDocuments] = React.useState<StockDocumentDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filters
  const [typeFilters, setTypeFilters] = React.useState<string[]>([]);
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);

  // Drawer Document Detail
  const [selectedDoc, setSelectedDoc] = React.useState<StockDocumentDto | null>(null);
  const [docLines, setDocLines] = React.useState<StockDocumentLineDto[]>([]);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Đồng bộ tiêu đề vào TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Phiếu Kho",
      subtitle: "Nhập - Xuất - Chuyển",
      screenCode: "M09",
      quickViews: [
        { label: "Tất cả phiếu kho", href: "/kho/nhap-xuat" },
        { label: "Phiếu nhập kho", href: "/kho/nhap-xuat?tab=nhap" },
        { label: "Phiếu xuất kho", href: "/kho/nhap-xuat?tab=xuat" },
        { label: "Phiếu điều chuyển", href: "/kho/nhap-xuat?tab=chuyen" },
      ],
    },
    []
  );

  // Khôi phục tab từ query
  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "nhap") setTypeFilters(["receipt"]);
    else if (tabParam === "xuat") setTypeFilters(["issue"]);
    else if (tabParam === "chuyen") setTypeFilters(["transfer"]);
  }, [searchParams]);

  // Tự động mở modal nếu query yêu cầu tạo phiếu
  const isCreateRequested =
    searchParams.get("create") === "true" ||
    searchParams.get("action") === "create" ||
    searchParams.get("tao-moi") === "true";

  const rawType = (searchParams.get("type") || searchParams.get("loai") || "").toLowerCase();
  const initialDocType: "receipt" | "issue" | "transfer" =
    rawType === "issue" || rawType === "xuat" || rawType === "outbound"
      ? "issue"
      : rawType === "transfer" || rawType === "chuyen"
      ? "transfer"
      : "receipt";

  const initialProjectId = searchParams.get("du_an") || searchParams.get("projectId") || "";
  const initialPoId = searchParams.get("poId") || "";
  const refOrderParam = searchParams.get("refOrder") || "";
  const initialReason =
    searchParams.get("reason") ||
    (refOrderParam ? `Xuất kho đơn bán ${refOrderParam}` : "");

  React.useEffect(() => {
    if (isCreateRequested) {
      setIsCreateModalOpen(true);
    }
  }, [isCreateRequested]);

  const loadDocuments = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory/documents");
      if (!res.ok) throw new Error("Không thể tải danh sách chứng từ kho");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleOpenDetail = async (d: StockDocumentDto) => {
    setSelectedDoc(d);
    setIsDetailOpen(true);
    try {
      const res = await fetch(`/api/inventory/documents/${d.id}`);
      const data = await res.json();
      if (data.lines) setDocLines(data.lines);
    } catch (err: any) {
      toast.error("Không thể tải dòng chi tiết chứng từ");
    }
  };

  const handleApproveDocument = async (id: string) => {
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/inventory/documents/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi duyệt phiếu");

      toast.success("Phiếu kho đã được duyệt thành công!");
      setIsDetailOpen(false);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteDocument = async (id: string) => {
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/inventory/documents/${id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi ghi sổ kho");

      toast.success("Chứng từ đã được hoàn tất và ghi sổ thành công!");
      setIsDetailOpen(false);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Lọc documents
  const filteredDocs = React.useMemo(() => {
    return documents.filter((d) => {
      if (typeFilters.length > 0) {
        if (!typeFilters.includes(d.type)) return false;
      }
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(d.status)) return false;
      }
      return true;
    });
  }, [documents, typeFilters, statusFilters]);

  // Facet Filters
  const facetFilters: DataTableFacetFilterConfig[] = [
    {
      id: "type",
      title: "Loại phiếu",
      options: [
        { value: "receipt", label: "Phiếu nhập", count: documents.filter((d) => d.type === "receipt").length },
        { value: "issue", label: "Phiếu xuất", count: documents.filter((d) => d.type === "issue").length },
        { value: "transfer", label: "Điều chuyển", count: documents.filter((d) => d.type === "transfer").length },
      ],
      selectedValues: typeFilters,
      onChange: setTypeFilters,
    },
    {
      id: "status",
      title: "Trạng thái",
      options: [
        { value: "submitted", label: "Chờ duyệt", count: documents.filter((d) => d.status === "submitted").length },
        { value: "approved", label: "Đã duyệt", count: documents.filter((d) => d.status === "approved").length },
        { value: "completed", label: "Đã ghi sổ", count: documents.filter((d) => d.status === "completed").length },
        { value: "draft", label: "Bản nháp", count: documents.filter((d) => d.status === "draft").length },
      ],
      selectedValues: statusFilters,
      onChange: setStatusFilters,
    },
  ];

  // Thống kê nhanh
  const stats: StatItem[] = React.useMemo(() => {
    const totalCount = filteredDocs.length;
    const pendingCount = filteredDocs.filter((d) => d.status === "submitted").length;
    const completedCount = filteredDocs.filter((d) => d.status === "completed").length;
    const totalVal = filteredDocs.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    return [
      { label: "Tổng Chứng Từ", value: `${totalCount} phiếu`, color: "blue" },
      {
        label: "Chờ Phê Duyệt",
        value: `${pendingCount} phiếu`,
        color: pendingCount > 0 ? "amber" : "neutral",
        highlight: pendingCount > 0,
      },
      { label: "Đã Ghi Sổ Kho", value: `${completedCount} phiếu`, color: "emerald" },
      {
        label: "Tổng Trị Giá Luân Chuyển",
        value: canViewCost ? `${(totalVal / 1_000_000).toFixed(1)} tr` : "Bảo mật",
        color: "neutral",
      },
    ];
  }, [filteredDocs, canViewCost]);

  // Cột DataTable chuẩn Benchmark UI
  const columns: DataTableColumn<StockDocumentDto>[] = [
    {
      id: "code",
      header: "Mã Phiếu",
      accessorKey: "code",
      sortable: true,
      width: "w-32 min-w-[120px]",
      permanent: true,
      cell: (d) => (
        <span
          onClick={() => handleOpenDetail(d)}
          className="font-mono text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer"
        >
          {d.code}
        </span>
      ),
    },
    {
      id: "type",
      header: "Loại Phiếu",
      accessorKey: "type",
      sortable: true,
      align: "center",
      width: "w-28 min-w-[100px]",
      cell: (d) => {
        if (d.type === "receipt") return <Badge variant="success">Nhập kho</Badge>;
        if (d.type === "issue") return <Badge variant="danger">Xuất kho</Badge>;
        return <Badge variant="info">Điều chuyển</Badge>;
      },
    },
    {
      id: "sourceWarehouseName",
      header: "Kho Nguồn",
      width: "min-w-[160px]",
      cell: (d) => (
        <span className="text-xs text-slate-700 truncate block">
          {d.sourceWarehouseName || "--- (Nhà cung cấp)"}
        </span>
      ),
    },
    {
      id: "destinationWarehouseName",
      header: "Kho Đích",
      width: "min-w-[160px]",
      cell: (d) => (
        <span className="text-xs text-slate-700 truncate block">
          {d.destinationWarehouseName || "--- (Xuất công trình)"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Ngày Lập",
      accessorKey: "createdAt",
      sortable: true,
      align: "center",
      width: "w-28 min-w-[100px]",
      cell: (d) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(d.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      id: "totalAmount",
      header: "Giá Trị Phiếu",
      accessorKey: "totalAmount",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[130px]",
      cell: (d) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          {canViewCost
            ? `${(d.totalAmount || 0).toLocaleString("vi-VN")} đ`
            : "****** đ"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng Thái",
      align: "center",
      width: "w-28 min-w-[100px]",
      cell: (d) => {
        if (d.status === "completed") return <Badge variant="success">Đã ghi sổ</Badge>;
        if (d.status === "approved") return <Badge variant="info">Đã duyệt</Badge>;
        if (d.status === "submitted") return <Badge variant="warning">Chờ duyệt</Badge>;
        return <Badge variant="neutral">Bản nháp</Badge>;
      },
    },
  ];

  const rowActions: DataTableRowAction<StockDocumentDto>[] = [
    {
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      title: "Xem chi tiết chứng từ",
      onClick: (d) => handleOpenDetail(d),
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
      title: "Phê duyệt phiếu kho",
      hidden: (d) => d.status !== "submitted",
      disabled: () => !canApprove,
      onClick: (d) => {
        if (confirm(`Bạn có chắc chắn muốn duyệt phiếu kho ${d.code}?`)) {
          handleApproveDocument(d.id);
        }
      },
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Hoàn tất & Ghi sổ kho",
      hidden: (d) => d.status !== "approved",
      onClick: (d) => {
        if (confirm(`Bạn có chắc chắn muốn xác nhận hoàn tất và ghi sổ kho cho phiếu ${d.code}?`)) {
          handleCompleteDocument(d.id);
        }
      },
    },
    {
      icon: <Printer className="w-3.5 h-3.5 text-slate-600" />,
      title: "In phiếu kho 4 chữ ký",
      onClick: (d) => {
        setSelectedDoc(d);
        handleOpenDetail(d).then(() => setIsPrintModalOpen(true));
      },
    },
  ];

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">
      {/* DataTable Doanh Nghiệp Chuẩn Benchmark UI */}
      <DataTable
        data={filteredDocs}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        searchPlaceholder="Tên / mã phiếu kho, kho nguồn, kho đích..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={facetFilters}
        onResetFilters={() => {
          setTypeFilters([]);
          setStatusFilters([]);
          setSearchTerm("");
        }}
        stats={stats}
        defaultShowStats={false}
        onRefresh={loadDocuments}
        exportFileName="Danh_sach_phieu_kho"
        rowActions={rowActions}
        isLoading={loading}
        onRowClick={handleOpenDetail}
        primaryAction={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo phiếu kho</span>
          </Button>
        }
      />

      {/* DRAWER CHI TIẾT CHỨNG TỪ KHO */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedDoc ? `Chứng Từ Kho: ${selectedDoc.code}` : "Chi Tiết Phiếu Kho"}
        width="lg"
      >
        {selectedDoc && (
          <div className="space-y-6 pb-6 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedDoc.code}
                </span>
                <p className="font-semibold text-slate-900 mt-1">
                  {selectedDoc.type === "receipt"
                    ? "Phiếu Nhập Kho"
                    : selectedDoc.type === "issue"
                    ? "Phiếu Xuất Kho"
                    : "Phiếu Điều Chuyển Kho"}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Kho nguồn: <strong>{selectedDoc.sourceWarehouseName || "Nhà cung cấp"}</strong> &rarr; Kho đích:{" "}
                  <strong>{selectedDoc.destinationWarehouseName || "Công trình"}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Tổng giá trị chứng từ:</span>
                <span className="font-mono text-lg font-bold text-slate-900">
                  {canViewCost ? `${(selectedDoc.totalAmount || 0).toLocaleString("vi-VN")} đ` : "Bảo mật"}
                </span>
                <div className="mt-1">
                  <Badge variant={selectedDoc.status === "completed" ? "success" : "warning"}>
                    {selectedDoc.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Bảng Dòng Vật Tư */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Danh mục vật tư luân chuyển:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {docLines.map((l, idx) => (
                  <div key={l.id || idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-800">{l.itemName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Mã: {l.itemCode} • ĐVT: {l.unitName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 block">
                        {l.qty} {l.unitName}
                      </span>
                      {canViewCost && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {l.lineTotal.toLocaleString("vi-VN")} đ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nút hành động */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                In phiếu A4 (4 Chữ Ký)
              </Button>

              {selectedDoc.status === "submitted" && (
                canApprove ? (
                  <Button
                    size="sm"
                    onClick={() => handleApproveDocument(selectedDoc.id)}
                    disabled={isActionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 h-8 text-xs shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Phê duyệt phiếu kho
                  </Button>
                ) : (
                  <Tooltip content="Chỉ tài khoản có quyền 'stock_document.approve' mới có thể phê duyệt">
                    <Button
                      size="sm"
                      disabled
                      className="bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5 h-8 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      Chờ cấp có thẩm quyền duyệt
                    </Button>
                  </Tooltip>
                )
              )}

              {selectedDoc.status === "approved" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCompleteDocument(selectedDoc.id)}
                  disabled={isActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Hoàn tất & Ghi sổ kho
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL IN PHIẾU KHO A4 4 CHỮ KÝ */}
      {/* BẢN IN PHIẾU KHO CHUẨN A4 KÈM THÔNG TIN DOANH NGHIỆP TỪ CÀI ĐẶT */}
      <StockDocPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        document={selectedDoc}
        lines={docLines}
      />

      {/* POPUP TẠO PHIẾU KHO CHUẨN CHỈNH */}
      <CreateStockDocModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadDocuments}
        canViewCost={canViewCost}
        initialType={initialDocType}
        initialProjectId={initialProjectId}
        initialPoId={initialPoId}
        initialReason={initialReason}
      />
    </div>
  );
}
