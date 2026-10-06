"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  Layers,
  Wrench,
  Truck,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  FileCheck,
  Calculator,
  HardHat,
  Sparkles,
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
import {
  QuotationDto,
  QuotationLineDto,
  CustomerDto,
} from "@/services/crm.service";
import { useSetPageHeader } from "@/contexts/page-header-context";

export default function BaoGiaPage() {
  const router = useRouter();
  const { can } = useAuthorization();
  const canCreate = can("quotation.create");
  const canApprove = can("quotation.approve") || can("quotation.update");
  const canConvert = can("sales_order.create") || can("quotation.update");

  // Dữ liệu
  const [quotations, setQuotations] = React.useState<QuotationDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState("");

  // Filters
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);
  const [marginFilters, setMarginFilters] = React.useState<string[]>([]);

  // Chi tiết báo giá được chọn
  const [selectedQuote, setSelectedQuote] = React.useState<QuotationDto | null>(null);
  const [quoteLines, setQuoteLines] = React.useState<QuotationLineDto[]>([]);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Đồng bộ tiêu đề vào TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Báo giá & Dự toán",
      subtitle: "Danh sách",
      screenCode: "M03",
      quickViews: [
        { label: "Tất cả báo giá", href: "/bao-gia" },
        { label: "Chờ phản hồi", href: "/bao-gia?status=submitted" },
        { label: "Khách đã chốt", href: "/bao-gia?status=approved" },
        { label: "Đã lên đơn SO", href: "/bao-gia?status=completed" },
      ],
    },
    []
  );

  // Tải danh sách báo giá
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/crm/quotations");
      const data = await res.json();
      if (data.quotations) setQuotations(data.quotations);
    } catch (err: any) {
      toast.error("Lỗi tải danh sách báo giá: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Mở Drawer chi tiết báo giá
  const handleOpenDetail = async (q: QuotationDto) => {
    setSelectedQuote(q);
    setIsDetailOpen(true);
    try {
      const res = await fetch(`/api/crm/quotations/${q.id}`);
      const data = await res.json();
      if (data.lines) setQuoteLines(data.lines);
    } catch (err: any) {
      toast.error("Lỗi tải chi tiết dòng báo giá");
    }
  };

  // Duyệt báo giá
  const handleApproveQuote = async (id: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/crm/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Không thể duyệt báo giá");

      toast.success("Báo giá đã được phê duyệt thành công!");
      loadData();
      setIsDetailOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Chuyển đổi báo giá thành Đơn bán hàng (SO)
  const handleConvertToOrder = async (id: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/crm/quotations/${id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể chuyển thành đơn bán hàng");

      toast.success(`Đã tạo thành công đơn bán hàng: ${data.order?.code || "SO Mới"}`);
      loadData();
      setIsDetailOpen(false);
      router.push("/ban-hang");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Modal Khởi tạo Dự án từ Báo giá
  const [projectModalQuote, setProjectModalQuote] = React.useState<QuotationDto | null>(null);
  const [projectForm, setProjectForm] = React.useState({
    projectName: "",
    address: "",
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
  });
  const [isConvertingProject, setIsConvertingProject] = React.useState(false);

  const handleOpenProjectModal = (q: QuotationDto) => {
    setProjectModalQuote(q);
    setProjectForm({
      projectName: `Thi công biển hiệu ${q.customerName || ""} (${q.code})`,
      address: "",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
    });
  };

  const handleConvertQuoteToProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectModalQuote) return;
    setIsConvertingProject(true);
    try {
      const res = await fetch(`/api/crm/quotations/${projectModalQuote.id}/convert-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể khởi tạo dự án");

      toast.success(data.message || `Đã khởi tạo thành công Dự án ${data.projectCode}!`);
      setProjectModalQuote(null);
      setIsDetailOpen(false);
      loadData();
      if (data.projectId) {
        router.push(`/du-an/${data.projectId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khởi tạo dự án");
    } finally {
      setIsConvertingProject(false);
    }
  };

  // Lọc quotations
  const filteredQuotations = React.useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(q.status)) return false;
      }
      if (marginFilters.length > 0) {
        const margin = q.grossMarginPct || 0;
        const matchMargin = marginFilters.some((m) => {
          if (m === "high") return margin >= 35;
          if (m === "medium") return margin >= 20 && margin < 35;
          if (m === "low") return margin < 20;
          return true;
        });
        if (!matchMargin) return false;
      }
      return true;
    });
  }, [quotations, statusFilters, marginFilters]);

  // Facet Filters
  const facetFilters: DataTableFacetFilterConfig[] = [
    {
      id: "status",
      title: "Trạng thái",
      options: [
        { value: "draft", label: "Bản nháp", count: quotations.filter((q) => q.status === "draft").length },
        { value: "submitted", label: "Chờ phản hồi", count: quotations.filter((q) => q.status === "submitted").length },
        { value: "approved", label: "Khách đã chốt", count: quotations.filter((q) => q.status === "approved").length },
        { value: "completed", label: "Đã lên đơn SO", count: quotations.filter((q) => q.status === "completed").length },
        { value: "rejected", label: "Từ chối", count: quotations.filter((q) => q.status === "rejected").length },
      ],
      selectedValues: statusFilters,
      onChange: setStatusFilters,
    },
    {
      id: "margin",
      title: "Biên lợi nhuận",
      options: [
        { value: "high", label: "Lãi cao (≥ 35%)" },
        { value: "medium", label: "Tiêu chuẩn (20% - 35%)" },
        { value: "low", label: "Biên mỏng (< 20%)" },
      ],
      selectedValues: marginFilters,
      onChange: setMarginFilters,
    },
  ];

  // Thống kê nhanh
  const stats: StatItem[] = React.useMemo(() => {
    const totalCount = filteredQuotations.length;
    const totalAmount = filteredQuotations.reduce((sum, q) => sum + (q.total || 0), 0);
    const approvedCount = filteredQuotations.filter((q) => q.status === "approved" || q.status === "completed").length;
    const avgMargin =
      totalCount > 0
        ? Math.round(filteredQuotations.reduce((sum, q) => sum + (q.grossMarginPct || 0), 0) / totalCount)
        : 0;

    return [
      { label: "Tổng Báo Giá", value: `${totalCount} bản`, color: "blue" },
      {
        label: "Tổng Giá Trị Chào",
        value: `${(totalAmount / 1_000_000).toFixed(1)} tr`,
        color: "emerald",
      },
      { label: "Đã Chốt Hợp Đồng", value: `${approvedCount} báo giá`, color: "amber" },
      {
        label: "Biên Lãi Gộp TB",
        value: `${avgMargin}%`,
        color: avgMargin >= 30 ? "emerald" : "neutral",
      },
    ];
  }, [filteredQuotations]);

  // Cấu hình Cột DataTable chuẩn Benchmark UI
  const columns: DataTableColumn<QuotationDto>[] = [
    {
      id: "code",
      header: "Mã Báo Giá",
      accessorKey: "code",
      sortable: true,
      width: "w-32 min-w-[120px]",
      permanent: true,
      cell: (q) => (
        <span
          onClick={() => handleOpenDetail(q)}
          className="font-mono text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer"
        >
          {q.code}
        </span>
      ),
    },
    {
      id: "customerName",
      header: "Khách Hàng / Công Trình",
      accessorKey: "customerName",
      sortable: true,
      width: "min-w-[220px]",
      cell: (q) => {
        const firstLetter = (q.customerName || "K").trim().charAt(0).toUpperCase();
        return (
          <div
            onClick={() => handleOpenDetail(q)}
            className="flex items-center gap-2 cursor-pointer group py-0.5"
            title={q.customerName}
          >
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {firstLetter}
            </span>
            <span className="font-semibold text-slate-900 truncate max-w-[210px] group-hover:text-blue-600 transition-colors">
              {q.customerName || "Khách lẻ"}
            </span>
          </div>
        );
      },
    },
    {
      id: "createdAt",
      header: "Ngày Lập",
      accessorKey: "createdAt",
      sortable: true,
      width: "w-28 min-w-[100px]",
      cell: (q) => (
        <span className="text-slate-600 text-xs">
          {new Date(q.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      id: "estimatedCost",
      header: "Giá vốn dự toán",
      accessorKey: "estimatedCost",
      sortable: true,
      align: "right",
      width: "w-32 min-w-[120px]",
      cell: (q) => (
        <span className="font-mono text-xs text-slate-500">
          {(q.estimatedCost || 0).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "total",
      header: "Tổng giá chào",
      accessorKey: "total",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[130px]",
      cell: (q) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          {(q.total || 0).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "grossMarginPct",
      header: "Lãi gộp %",
      accessorKey: "grossMarginPct",
      sortable: true,
      align: "center",
      width: "w-28 min-w-[100px]",
      cell: (q) => (
        <span
          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
            (q.grossMarginPct || 0) >= 35
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : (q.grossMarginPct || 0) >= 20
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {q.grossMarginPct || 0}%
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      align: "center",
      width: "w-32 min-w-[110px]",
      cell: (q) => {
        if (q.status === "approved") {
          return <Badge variant="success">Khách đã chốt</Badge>;
        }
        if (q.status === "completed") {
          return <Badge variant="info">Đã lên đơn SO</Badge>;
        }
        if (q.status === "rejected") {
          return <Badge variant="danger">Từ chối</Badge>;
        }
        return <Badge variant="warning">Chờ phản hồi</Badge>;
      },
    },
  ];

  const rowActions: DataTableRowAction<QuotationDto>[] = [
    {
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      title: "Xem chi tiết bóc tách",
      onClick: (q) => handleOpenDetail(q),
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Phê duyệt báo giá (Khách đã chốt)",
      hidden: (q) => q.status === "approved" || q.status === "completed" || q.status === "rejected",
      disabled: () => !canApprove,
      onClick: (q) => {
        if (confirm(`Bạn có chắc chắn muốn duyệt báo giá ${q.code}?`)) {
          handleApproveQuote(q.id);
        }
      },
    },
    {
      icon: <Printer className="w-3.5 h-3.5 text-slate-600" />,
      title: "In báo giá A4 gửi khách",
      onClick: (q) => {
        setSelectedQuote(q);
        handleOpenDetail(q).then(() => setIsPrintModalOpen(true));
      },
    },
    {
      icon: <HardHat className="w-3.5 h-3.5 text-blue-600" />,
      title: "⚡ Khởi tạo Dự án thi công & WBS",
      hidden: (q) => q.status !== "approved",
      onClick: (q) => handleOpenProjectModal(q),
    },
  ];

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">
      {/* DataTable Doanh Nghiệp Chuẩn Benchmark UI */}
      <DataTable
        data={filteredQuotations}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        searchPlaceholder="Tên / mã báo giá, khách hàng..."
        searchValue={keyword}
        onSearchChange={setKeyword}
        filters={facetFilters}
        onResetFilters={() => {
          setStatusFilters([]);
          setMarginFilters([]);
          setKeyword("");
        }}
        stats={stats}
        defaultShowStats={false}
        onRefresh={loadData}
        exportFileName="Danh_sach_bao_gia"
        rowActions={rowActions}
        isLoading={isLoading}
        onRowClick={(quote) => {
          setSelectedQuote(quote);
          setIsDetailOpen(true);
        }}
        primaryAction={
          <Link href="/bao-gia/tao-moi">
            <Button
              variant="primary"
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo báo giá</span>
            </Button>
          </Link>
        }
      />

      {/* DRAWER CHI TIẾT BÁO GIÁ */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedQuote ? `Dự Toán Báo Giá: ${selectedQuote.code}` : "Chi Tiết Báo Giá"}
        width="lg"
      >
        {selectedQuote && (
          <div className="space-y-6 pb-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {selectedQuote.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedQuote.customerName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Tổng giá chào khách:</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {(selectedQuote.total || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng con: Danh sách bóc tách 4 thành phần */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Bóc Tách Hạng Mục Dự Toán & Định Mức
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {quoteLines.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">Đang tải dòng bóc tách...</div>
                ) : (
                  quoteLines.map((line, idx) => (
                    <div key={line.id || idx} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="font-bold text-slate-900 block truncate">{line.description}</span>
                        <span className="text-slate-400 text-[11px]">
                          SL: {line.qty} {line.unitName || line.unitCode} • Đơn giá: {line.unitPrice.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {line.lineTotal.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                In bản A4
              </Button>

              {canApprove && selectedQuote.status !== "approved" && selectedQuote.status !== "completed" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApproveQuote(selectedQuote.id)}
                  disabled={isActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Duyệt báo giá
                </Button>
              )}

              {canConvert && selectedQuote.status === "approved" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConvertToOrder(selectedQuote.id)}
                    disabled={isActionLoading}
                    className="border-slate-300 text-slate-700 flex items-center gap-1 text-xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Bán hàng (SO)
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenProjectModal(selectedQuote)}
                    disabled={isActionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 text-xs font-semibold shadow-xs"
                  >
                    <HardHat className="w-3.5 h-3.5" />
                    ⚡ Khởi tạo Dự án & WBS
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL IN BẢN A4 GỬI KHÁCH HÀNG */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Xem Trước & Xuất Bản Báo Giá A4"
      >
        {selectedQuote && (
          <div className="space-y-4 text-xs">
            <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4 font-sans">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">CÔNG TY QUẢNG CÁO SIGNAGE ERP</h3>
                  <p className="text-slate-500 text-[11px]">Đ/c: Số 123 Đường Cầu Giấy, Hà Nội • Hotline: 0988.123.456</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-sm text-blue-700">BẢNG DỰ TOÁN BÁO GIÁ</h4>
                  <p className="font-mono text-slate-500 text-[11px]">{selectedQuote.code}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-700">
                  <strong className="text-slate-900">Khách hàng:</strong> {selectedQuote.customerName}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Ngày báo giá: {new Date(selectedQuote.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-700">
                    <tr>
                      <th className="p-2">STT</th>
                      <th className="p-2">Hạng mục công việc / Quy cách</th>
                      <th className="p-2 text-center">ĐVT</th>
                      <th className="p-2 text-right">SL</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {quoteLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-medium text-slate-800">{line.description}</td>
                        <td className="p-2 text-center text-slate-500">{line.unitName || line.unitCode}</td>
                        <td className="p-2 text-right font-mono">{line.qty}</td>
                        <td className="p-2 text-right font-mono">{line.unitPrice.toLocaleString("vi-VN")} đ</td>
                        <td className="p-2 text-right font-mono font-bold">{line.lineTotal.toLocaleString("vi-VN")} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <div className="text-right space-y-1">
                  <p className="text-xs text-slate-500">
                    Tổng cộng thanh toán (chưa VAT):{" "}
                    <strong className="text-sm font-bold text-slate-900 font-mono">
                      {(selectedQuote.total || 0).toLocaleString("vi-VN")} đ
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                In ngay ra máy in A4
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL KHỞI TẠO DỰ ÁN TỪ BÁO GIÁ */}
      <Modal
        isOpen={!!projectModalQuote}
        onClose={() => {
          if (!isConvertingProject) setProjectModalQuote(null);
        }}
        title="⚡ Khởi Tạo Dự Án Sản Xuất & Thi Công"
        maxWidth="lg"
      >
        {projectModalQuote && (
          <form onSubmit={handleConvertQuoteToProject} className="space-y-4 text-xs">
            {/* Tóm tắt Báo giá */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-blue-700">{projectModalQuote.code}</span>
                  <span className="text-slate-500 ml-2">· {projectModalQuote.customerName}</span>
                </div>
                <Badge variant="success">Khách đã chốt</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">Giá trị hợp đồng:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {(projectModalQuote.total || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Biên lãi gộp dự toán:</span>
                  <span className="font-semibold text-emerald-700">
                    {projectModalQuote.grossMarginPct || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Thông tin Dự án mới */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên công trình / Dự án <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectForm.projectName}
                onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                placeholder="VD: Thi công biển hiệu chuỗi Highlands Coffee..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa chỉ lắp đặt / Mặt bằng thi công <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectForm.address}
                onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
                placeholder="VD: 123 Nguyễn Trãi, Thanh Xuân, Hà Nội..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày hẹn bàn giao</label>
                <input
                  type="date"
                  value={projectForm.dueDate}
                  onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Thông báo tự động sinh WBS */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-1">
              <span className="font-bold text-blue-900 block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Hệ thống tự động thiết lập cho Dự án:
              </span>
              <p className="text-slate-600 text-[11px]">
                • Tự động tạo Đơn hàng bán (SO) liên kết hợp đồng để theo dõi doanh thu và công nợ.
              </p>
              <p className="text-slate-600 text-[11px]">
                • Tự động sinh cây công việc WBS 7 giai đoạn chuẩn (Khảo sát, Thiết kế market, Xưởng cơ khí, Test LED, Xe tải, Lắp dựng, Nghiệm thu).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isConvertingProject}
                onClick={() => setProjectModalQuote(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isConvertingProject}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-semibold"
              >
                <HardHat className="w-3.5 h-3.5" />
                Xác nhận tạo Dự án & Chuyển trang
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
