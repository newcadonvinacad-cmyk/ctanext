"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Badge,
  Modal,
  Drawer,
  Tooltip,
  toast,
  StatItem,
} from "@/components/ui";
import {
  ClipboardCheck,
  Plus,
  Search,
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  PackageCheck,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  ImageIcon,
  ExternalLink,
  Package,
} from "lucide-react";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
  DataTableFacetFilterConfig,
} from "@/components/shared";
import { PurchaseOrderDto } from "@/services/procurement.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";
import { CreateInboundReceiptModal } from "./CreateInboundReceiptModal";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { can } = useAuthorization();
  const canApprovePo = can("purchase_order.approve");

  const [orders, setOrders] = React.useState<PurchaseOrderDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filters
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);

  // Drawer PO detail state
  const [selectedOrder, setSelectedOrder] = React.useState<PurchaseOrderDto | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [approving, setApproving] = React.useState(false);

  // Đồng bộ tiêu đề vào TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Mua hàng (PO)",
      subtitle: "Danh sách",
      screenCode: "M06",
      quickViews: [
        { label: "Tất cả đơn mua (PO)", href: "/mua-hang" },
        { label: "Đang chờ nhận hàng", href: "/mua-hang?status=approved" },
        { label: "Đã nhận hàng", href: "/mua-hang?status=completed" },
      ],
    },
    []
  );

  // Modal Đề xuất nhập kho trực tiếp từ PO
  const [receiptOrderId, setReceiptOrderId] = React.useState<string | null>(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/procurement/orders");
      if (!res.ok) throw new Error("Không thể tải danh sách đơn mua");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetail = async (o: PurchaseOrderDto) => {
    setSelectedOrder(o);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/procurement/orders/${o.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setSelectedOrder(data.order);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      setApproving(true);
      const res = await fetch(`/api/procurement/orders/${orderId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi phê duyệt đơn hàng");

      toast.success(data.message || "Đã duyệt đơn mua hàng thành công!");
      fetchOrders();
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApproving(false);
    }
  };

  // Khởi tạo đề xuất nhập kho M09 trực tiếp qua Modal (không chuyển trang)
  const handleCreateStockInbound = (po: PurchaseOrderDto) => {
    setReceiptOrderId(po.id);
  };

  // Lọc orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(o.status)) return false;
      }
      return true;
    });
  }, [orders, statusFilters]);

  // Facet Filters
  const facetFilters: DataTableFacetFilterConfig[] = [
    {
      id: "status",
      title: "Trạng thái",
      options: [
        { value: "approved", label: "Đã duyệt / Chờ nhận", count: orders.filter((o) => o.status === "approved").length },
        { value: "completed", label: "Đã nhận hàng", count: orders.filter((o) => o.status === "completed").length },
        ...(orders.some((o) => o.status === "submitted")
          ? [{ value: "submitted", label: "Chờ duyệt (cũ)", count: orders.filter((o) => o.status === "submitted").length }]
          : []),
      ],
      selectedValues: statusFilters,
      onChange: setStatusFilters,
    },
  ];

  // Thống kê nhanh
  const stats: StatItem[] = React.useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const approvedCount = filteredOrders.filter((o) => o.status === "approved").length;
    const completedCount = filteredOrders.filter((o) => o.status === "completed").length;

    return [
      { label: "Tổng Đơn Mua PO", value: `${totalOrders} đơn`, color: "blue" },
      {
        label: "Tổng Giá Trị Đặt Hàng",
        value: `${(totalAmount / 1_000_000).toFixed(1)} tr`,
        color: "emerald",
      },
      {
        label: "Chờ Nhận Hàng",
        value: `${approvedCount} đơn`,
        color: approvedCount > 0 ? "blue" : "neutral",
      },
      { label: "Đã Nhập Kho Hoàn Tất", value: `${completedCount} đơn`, color: "neutral" },
    ];
  }, [filteredOrders]);

  // Cấu hình Cột DataTable chuẩn Benchmark UI
  const columns: DataTableColumn<PurchaseOrderDto>[] = [
    {
      id: "code",
      header: "Mã Đơn PO",
      accessorKey: "code",
      sortable: true,
      width: "w-36 min-w-[130px]",
      permanent: true,
      cell: (o) => (
        <div className="flex items-center gap-1.5">
          <span
            onClick={() => handleOpenDetail(o)}
            className="font-mono text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer"
          >
            {o.code}
          </span>
          {o.invoiceImage && (
            <span
              title="Có hóa đơn / ảnh chứng từ lưu kèm"
              className="text-indigo-600 cursor-pointer hover:text-indigo-800 transition-colors"
              onClick={() => handleOpenDetail(o)}
            >
              <ImageIcon className="w-3.5 h-3.5 inline" />
            </span>
          )}
        </div>
      ),
    },
    {
      id: "supplierName",
      header: "Nhà Cung Cấp",
      accessorKey: "supplierName",
      sortable: true,
      width: "min-w-[240px]",
      cell: (o) => {
        const firstLetter = (o.supplierName || "N").trim().charAt(0).toUpperCase();
        return (
          <div
            onClick={() => handleOpenDetail(o)}
            className="flex items-center gap-2 cursor-pointer group py-0.5"
            title={o.supplierName}
          >
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {firstLetter}
            </span>
            <span className="font-semibold text-slate-900 truncate max-w-[230px] group-hover:text-blue-600 transition-colors">
              {o.supplierName || "---"}
            </span>
          </div>
        );
      },
    },
    {
      id: "createdAt",
      header: "Ngày Đặt",
      accessorKey: "createdAt",
      sortable: true,
      width: "w-28 min-w-[100px]",
      cell: (o) => (
        <span className="text-slate-600 text-xs">
          {new Date(o.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      id: "expectedDate",
      header: "Dự kiến giao",
      accessorKey: "expectedDate",
      sortable: true,
      width: "w-28 min-w-[100px]",
      cell: (o) => (
        <span className="text-slate-600 text-xs">
          {o.expectedDate ? new Date(o.expectedDate).toLocaleDateString("vi-VN") : "---"}
        </span>
      ),
    },
    {
      id: "total",
      header: "Tổng tiền PO",
      accessorKey: "total",
      sortable: true,
      align: "right",
      width: "w-36 min-w-[140px]",
      cell: (o) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          {(o.total || 0).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      align: "center",
      width: "w-32 min-w-[110px]",
      cell: (o) => {
        if (o.status === "approved") {
          return <Badge variant="success">Đã duyệt</Badge>;
        }
        if (o.status === "submitted") {
          return <Badge variant="warning">Chờ duyệt</Badge>;
        }
        if (o.status === "completed") {
          return <Badge variant="info">Đã nhận hàng</Badge>;
        }
        return <Badge variant="neutral">{o.status}</Badge>;
      },
    },
  ];

  const rowActions: DataTableRowAction<PurchaseOrderDto>[] = [
    {
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      title: "Xem chi tiết đơn",
      onClick: (o) => handleOpenDetail(o),
    },
    {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
      title: "Phê duyệt đơn mua (PO)",
      hidden: (o) => o.status !== "submitted",
      disabled: () => !canApprovePo,
      onClick: (o) => {
        if (confirm(`Bạn có chắc chắn muốn duyệt đơn mua hàng ${o.code}?`)) {
          handleApprove(o.id);
        }
      },
    },
    {
      icon: <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Tạo phiếu đề xuất nhập kho",
      onClick: (o) => handleCreateStockInbound(o),
    },
  ];

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">
      {/* DataTable Doanh Nghiệp Chuẩn Benchmark UI */}
      <DataTable
        data={filteredOrders}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        searchPlaceholder="Tên / mã PO, NCC, dự án..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={facetFilters}
        onResetFilters={() => {
          setStatusFilters([]);
          setSearchTerm("");
        }}
        stats={stats}
        defaultShowStats={false}
        onRefresh={fetchOrders}
        exportFileName="Danh_sach_don_mua_hang"
        rowActions={rowActions}
        isLoading={loading}
        onRowClick={handleOpenDetail}
        primaryAction={
          <Link href="/mua-hang/tao-moi">
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đơn mua</span>
            </Button>
          </Link>
        }
      />

      {/* DRAWER CHI TIẾT PO & HẠN MỨC DUYỆT */}
      <Drawer
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Chi Tiết Đơn PO: ${selectedOrder.code}` : "Chi tiết đơn mua hàng"}
        width="lg"
      >
        {selectedOrder && (
          <div className="space-y-5 pb-6 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {selectedOrder.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{selectedOrder.supplierName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Tổng giá trị đơn:</span>
                  <span className="font-mono text-lg font-bold text-slate-900">
                    {(selectedOrder.total || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng Dòng Vật Tư / Sản Phẩm */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>Danh mục sản phẩm / vật tư trong đơn:</span>
                </h4>
                {selectedOrder.lines && selectedOrder.lines.length > 0 && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({selectedOrder.lines.length} sản phẩm)
                  </span>
                )}
              </div>

              {detailLoading ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-slate-500" />
                  <span>Đang tải danh mục sản phẩm...</span>
                </div>
              ) : selectedOrder.lines && selectedOrder.lines.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center">STT</th>
                        <th className="py-2 px-3">Tên sản phẩm / Quy cách</th>
                        <th className="py-2 px-2.5 w-16 text-center">ĐVT</th>
                        <th className="py-2 px-3 w-16 text-right">SL</th>
                        <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                        <th className="py-2 px-3 w-28 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.lines.map((l, idx) => (
                        <tr key={l.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-slate-900">{l.itemName || l.description}</div>
                            {l.itemCode && (
                              <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
                                {l.itemCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-600">
                            {l.unitName || "Cái"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {l.qty}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {l.unitPrice.toLocaleString("vi-VN")} đ
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {l.lineTotal.toLocaleString("vi-VN")} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-800">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right text-slate-500">
                          Tổng cộng ({selectedOrder.lines.reduce((s, l) => s + l.qty, 0)} sản phẩm):
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {selectedOrder.lines.reduce((s, l) => s + l.qty, 0)}
                        </td>
                        <td colSpan={2} className="py-2 px-3 text-right font-mono text-sm font-bold text-blue-700">
                          {(selectedOrder.total || 0).toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-xs bg-slate-50/50">
                  Đơn hàng này chưa có danh mục sản phẩm chi tiết
                </div>
              )}
            </div>

            {/* Ảnh chứng từ / Hóa đơn đính kèm lưu chung với PO */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ảnh hóa đơn / Chứng từ đính kèm:</span>
                </h4>
                {selectedOrder.invoiceImage && (
                  <a
                    href={selectedOrder.invoiceImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Xem ảnh gốc</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {selectedOrder.invoiceImage ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2.5 space-y-2">
                  <a
                    href={selectedOrder.invoiceImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Click để mở ảnh kích thước gốc"
                    className="block group"
                  >
                    <img
                      src={selectedOrder.invoiceImage}
                      alt="Hóa đơn chứng từ PO"
                      className="w-full max-h-80 object-contain rounded-lg border border-slate-200 bg-white group-hover:opacity-90 transition-opacity shadow-2xs"
                    />
                  </a>
                  <p className="text-[10px] text-slate-400 text-center italic">
                    (Ảnh chụp/scan hóa đơn được lưu trữ đồng bộ cùng hồ sơ đơn PO)
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-xs bg-slate-50/50">
                  Đơn hàng này không có ảnh chứng từ hóa đơn đính kèm
                </div>
              )}
            </div>

            {/* Nút hành động */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Button
                  size="sm"
                  onClick={() => handleCreateStockInbound(selectedOrder)}
                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm h-8"
                >
                  <PackageCheck className="w-4 h-4" />
                  Tạo Đề Xuất Nhập Kho
                </Button>

                {selectedOrder.status === "submitted" && (
                  canApprovePo ? (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(selectedOrder.id)}
                      disabled={approving}
                      className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {approving ? "Đang xử lý..." : "Duyệt Đơn Mua Hàng"}
                    </Button>
                  ) : (
                    <Tooltip content="Chỉ tài khoản có quyền 'purchase_order.approve' mới có thể duyệt đơn">
                      <Button
                        size="sm"
                        disabled
                        className="flex-1 gap-1.5 bg-slate-100 text-slate-400 text-xs h-8 border border-slate-200 cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                        Chờ Cấp Có Quyền Duyệt
                      </Button>
                    </Tooltip>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* POPUP TẠO PHIẾU ĐỀ XUẤT NHẬP KHO TRỰC TIẾP TỪ ĐƠN PO */}
      <CreateInboundReceiptModal
        isOpen={!!receiptOrderId}
        onClose={() => setReceiptOrderId(null)}
        orderId={receiptOrderId}
        onSuccess={() => {
          fetchOrders();
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
