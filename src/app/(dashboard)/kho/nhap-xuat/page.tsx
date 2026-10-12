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
  Send,
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
import { useConfirm } from "@/contexts/confirm-dialog-context";
import { StockDocumentDto, StockDocumentLineDto } from "@/services/inventory.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { CreateStockDocModal } from "./CreateStockDocModal";
import { StockDocPrintModal } from "@/components/inventory/StockDocPrintModal";

export default function StockDocumentsPage() {
  const confirm = useConfirm();
  const { can } = useAuthorization();
  const canCreate = can("stock_document.create");
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
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const formatCleanPurpose = React.useCallback((text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(/\s+PO\s+null/gi, "")
      .replace(/\s+theo đơn mua PO\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
      .trim();
  }, []);

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

  React.useEffect(()=>{const id=searchParams.get("documentId");const doc=documents.find(d=>d.id===id);if(doc)void handleOpenDetail(doc);},[documents,searchParams]);

  const handleApproveDocument = async (id: string) => {
    let toastId: any;
    try {
      setProcessingId(id);
      setIsActionLoading(true);
      toastId = toast.info("Đang xử lý duyệt phiếu kho...", "Vui lòng chờ trong giây lát");
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
      if (toastId) toast.dismiss(toastId);
      setIsActionLoading(false);
      setProcessingId(null);
    }
  };

  const handleSubmitDocument = async (id: string) => {
    let toastId: any;
    try {
      setProcessingId(id);
      setIsActionLoading(true);
      toastId = toast.info("Đang gửi duyệt phiếu kho...", "Vui lòng chờ trong giây lát");
      const res = await fetch(`/api/inventory/documents/${id}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi gửi duyệt phiếu");

      toast.success("Đã gửi duyệt phiếu kho thành công!");
      setIsDetailOpen(false);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      if (toastId) toast.dismiss(toastId);
      setIsActionLoading(false);
      setProcessingId(null);
    }
  };

  const handleCompleteDocument = async (id: string) => {
    let toastId: any;
    try {
      setProcessingId(id);
      setIsActionLoading(true);
      toastId = toast.info("Đang xử lý ghi sổ kho...", "Vui lòng chờ trong giây lát");
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
      if (toastId) toast.dismiss(toastId);
      setIsActionLoading(false);
      setProcessingId(null);
    }
  };

  // Lọc documents
  const filteredDocs = React.useMemo(() => {
    return documents.filter((d) => {
      if (typeFilters.length > 0 && !typeFilters.includes(d.type)) return false;
      if (statusFilters.length > 0 && !statusFilters.includes(d.status)) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = d.code?.toLowerCase().includes(term);
        const matchPurpose = d.purpose?.toLowerCase().includes(term);
        const matchReason = d.reason?.toLowerCase().includes(term);
        const matchProject = d.projectName?.toLowerCase().includes(term) || d.projectCode?.toLowerCase().includes(term);
        const matchSource = d.sourceWarehouseName?.toLowerCase().includes(term);
        const matchDest = d.destinationWarehouseName?.toLowerCase().includes(term);
        const matchCreator = d.createdByName?.toLowerCase().includes(term);
        if (!matchCode && !matchPurpose && !matchReason && !matchProject && !matchSource && !matchDest && !matchCreator) {
          return false;
        }
      }
      return true;
    });
  }, [documents, typeFilters, statusFilters, searchTerm]);

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

  // Cột DataTable chuẩn Benchmark UI - Rõ ràng, đầy đủ thông tin
  const columns: DataTableColumn<StockDocumentDto>[] = [
    {
      id: "code",
      header: "Mã & Loại Phiếu",
      accessorKey: "code",
      sortable: true,
      width: "w-36 min-w-[140px]",
      permanent: true,
      cell: (d) => (
        <div className="flex flex-col gap-1">
          <span
            onClick={() => handleOpenDetail(d)}
            className="font-mono text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            {d.code}
          </span>
          <div>
            {d.type === "receipt" ? (
              <Badge variant="success" className="text-[10px] py-0 px-1.5 font-medium">Nhập kho</Badge>
            ) : d.type === "issue" ? (
              <Badge variant="danger" className="text-[10px] py-0 px-1.5 font-medium">Xuất kho</Badge>
            ) : (
              <Badge variant="info" className="text-[10px] py-0 px-1.5 font-medium">Điều chuyển</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "purpose",
      header: "Mục Đích / Diễn Giải",
      accessorKey: "purpose",
      width: "min-w-[200px]",
      cell: (d) => {
        const cleanPurpose = formatCleanPurpose(d.purpose || d.reason);
        const cleanReason = formatCleanPurpose(d.reason);
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800 line-clamp-2 block leading-relaxed" title={cleanPurpose || ""}>
              {cleanPurpose || <span className="text-slate-400 italic font-normal">Phiếu kho chuẩn</span>}
            </span>
            {cleanReason && cleanPurpose && cleanReason !== cleanPurpose && (
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                Lý do: {cleanReason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "projectName",
      header: "Dự Án / Công Trình",
      accessorKey: "projectName",
      width: "min-w-[160px]",
      cell: (d) => (
        <div>
          {d.projectName ? (
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 text-xs truncate block max-w-[180px]" title={d.projectName}>
                {d.projectName}
              </span>
              {d.projectCode && (
                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 inline-block">
                  {d.projectCode}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">Kho nội bộ</span>
          )}
        </div>
      ),
    },
    {
      id: "route",
      header: "Lộ Trình Điều Chuyển",
      width: "min-w-[220px]",
      cell: (d) => {
        const src = d.sourceWarehouseName || (d.type === "receipt" ? "Nhà cung cấp" : "Kho xuất");
        const dst = d.destinationWarehouseName || (d.type === "issue" ? "Xuất công trình" : "Kho nhận");
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-700 font-medium truncate max-w-[105px]" title={src}>
              {src}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-900 font-bold truncate max-w-[105px]" title={dst}>
              {dst}
            </span>
          </div>
        );
      },
    },
    {
      id: "totalAmount",
      header: "Mặt Hàng & Giá Trị",
      accessorKey: "totalAmount",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[130px]",
      cell: (d) => (
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-slate-900 block">
            {canViewCost
              ? `${(d.totalAmount || 0).toLocaleString("vi-VN")} đ`
              : "****** đ"}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {d.totalLines || 0} mặt hàng
          </span>
        </div>
      ),
    },
    {
      id: "createdAt",
      header: "Người Lập & Ngày Giờ",
      accessorKey: "createdAt",
      sortable: true,
      width: "w-40 min-w-[140px]",
      cell: (d) => (
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-slate-800 block truncate" title={d.createdByName}>
            {d.createdByName || "Hệ thống"}
          </span>
          <span className="text-[11px] text-slate-500 font-mono block">
            {new Date(d.createdAt).toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>
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
      disabled: (d) => !canApprove || processingId === d.id,
      onClick: async (d) => {
        const ok = await confirm({
          title: "Phê duyệt phiếu kho",
          message: `Bạn có chắc chắn muốn duyệt phiếu kho ${d.code}?`,
          variant: "primary",
          confirmText: "Duyệt phiếu",
        });
        if (ok) {
          handleApproveDocument(d.id);
        }
      },
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Hoàn tất & Ghi sổ kho",
      hidden: (d) => d.status !== "approved",
      disabled: (d) => processingId === d.id,
      onClick: async (d) => {
        const ok = await confirm({
          title: "Xác nhận ghi sổ kho",
          message: `Bạn có chắc chắn muốn xác nhận hoàn tất và ghi sổ kho cho phiếu ${d.code}?`,
          variant: "success",
          confirmText: "Xác nhận ghi sổ",
        });
        if (ok) {
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
          canCreate ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 shadow-2xs font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo phiếu kho</span>
            </Button>
          ) : undefined
        }
      />

      {/* DRAWER CHI TIẾT CHỨNG TỪ KHO */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={
          selectedDoc
            ? selectedDoc.type === "receipt"
              ? "Phiếu Nhập Kho"
              : selectedDoc.type === "issue"
              ? "Phiếu Xuất Kho"
              : "Phiếu Điều Chuyển Kho"
            : "Chi Tiết Phiếu Kho"
        }
        badge={selectedDoc?.code}
        avatar={
          selectedDoc ? (
            <div className="w-12 h-12 rounded-2xl bg-[#0b0c3f] text-white flex items-center justify-center font-black shadow-md border border-[#0b0c3f]/20">
              {selectedDoc.type === "receipt" ? (
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              ) : selectedDoc.type === "issue" ? (
                <TrendingUp className="w-6 h-6 text-amber-400" />
              ) : (
                <ArrowLeftRight className="w-6 h-6 text-sky-400" />
              )}
            </div>
          ) : undefined
        }
        width="lg"
      >
        {selectedDoc && (
          <div className="space-y-5 pb-6 text-xs">
            {/* 3 THẺ KPI TỔNG QUAN */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tổng giá trị</span>
                <span className="font-mono text-base font-extrabold text-slate-900 block mt-1 tracking-tight truncate">
                  {canViewCost ? `${(selectedDoc.totalAmount || 0).toLocaleString("vi-VN")} đ` : "Bảo mật"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Đã gồm thuế/chi phí</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Vật tư luân chuyển</span>
                <span className="font-mono text-base font-extrabold text-[#0b0c3f] block mt-1 tracking-tight">
                  {docLines.length} <span className="text-xs font-normal text-slate-500">danh mục</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Tổng SL: {docLines.reduce((acc, cur) => acc + (cur.qty || 0), 0).toLocaleString("vi-VN")}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Trạng thái</span>
                <div className="mt-1">
                  <Badge
                    variant={
                      selectedDoc.status === "completed"
                        ? "success"
                        : selectedDoc.status === "approved"
                        ? "info"
                        : selectedDoc.status === "submitted"
                        ? "warning"
                        : "neutral"
                    }
                    className="font-bold text-[11px]"
                  >
                    {selectedDoc.status === "completed"
                      ? "Đã ghi sổ"
                      : selectedDoc.status === "approved"
                      ? "Đã phê duyệt"
                      : selectedDoc.status === "submitted"
                      ? "Chờ duyệt"
                      : "Bản nháp"}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {selectedDoc.createdAt ? new Date(selectedDoc.createdAt).toLocaleDateString("vi-VN") : "Hôm nay"}
                </span>
              </div>
            </div>

            {/* THÔNG TIN KHO & LỘ TRÌNH ĐIỀU CHUYỂN */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hành trình kho</span>
                <span className="font-mono text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  Mã: {selectedDoc.code}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Kho xuất / Nguồn</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                    {selectedDoc.sourceWarehouseName || (selectedDoc.type === "receipt" ? "Nhà cung cấp (Nhập ngoài)" : "Kho chính")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Kho nhận / Đích</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                    {selectedDoc.destinationWarehouseName || (selectedDoc.type === "issue" ? "Xuất công trình / Thi công" : "Kho nhận")}
                  </p>
                </div>
              </div>
              {selectedDoc.reason && (
                <p className="text-[11px] text-slate-600 italic bg-white/70 p-2.5 rounded-xl border border-slate-200/60 mt-1">
                  Lý do / Ghi chú: {formatCleanPurpose(selectedDoc.reason) || selectedDoc.reason}
                </p>
              )}
            </div>

            {/* BẢNG DÒNG VẬT TƯ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 text-xs tracking-tight">Danh mục vật tư luân chuyển ({docLines.length})</h4>
                <span className="text-[10px] text-slate-400 font-medium">Chi tiết theo từng quy cách</span>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                {docLines.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">Không có dòng vật tư nào</div>
                ) : (
                  docLines.map((l, idx) => (
                    <div key={l.id || idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{l.itemName}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Mã: <span className="text-slate-600 font-semibold">{l.itemCode}</span> • ĐVT: {l.unitName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-slate-900 block text-xs">
                          {l.qty.toLocaleString("vi-VN")} {l.unitName}
                        </span>
                        {canViewCost && (
                          <span className="text-[11px] text-slate-500 font-mono block mt-0.5 font-medium">
                            {l.lineTotal.toLocaleString("vi-VN")} đ
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NÚT HÀNH ĐỘNG CHÂN TRANG */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border-slate-300 font-bold text-slate-700 hover:bg-slate-50 h-9"
              >
                <Printer className="w-3.5 h-3.5" />
                In phiếu A4 (4 Chữ Ký)
              </Button>

              <div className="flex items-center gap-2">
                {selectedDoc.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => handleSubmitDocument(selectedDoc.id)}
                    disabled={isActionLoading}
                    className="bg-[#0b0c3f] hover:bg-[#15175e] text-white font-bold flex items-center gap-1.5 h-9 text-xs rounded-xl shadow-md transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi duyệt phiếu kho
                  </Button>
                )}

                {(selectedDoc.status === "submitted" || (selectedDoc.status === "draft" && canApprove)) && (
                  canApprove ? (
                    <Button
                      size="sm"
                      onClick={() => handleApproveDocument(selectedDoc.id)}
                      disabled={isActionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 h-9 text-xs rounded-xl shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Phê duyệt phiếu kho
                    </Button>
                  ) : (
                    <Tooltip content="Chỉ tài khoản có quyền 'stock_document.approve' mới có thể phê duyệt">
                      <Button
                        size="sm"
                        disabled
                        className="bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center gap-1.5 h-9 text-xs rounded-xl"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 h-9 text-xs rounded-xl shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Hoàn tất & Ghi sổ kho
                  </Button>
                )}
              </div>
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
