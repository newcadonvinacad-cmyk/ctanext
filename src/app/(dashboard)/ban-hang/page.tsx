"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
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
  PackageCheck,
  CreditCard,
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
import { SalesOrderDto } from "@/services/crm.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { CreateStockDocModal } from "@/components/inventory/CreateStockDocModal";

export default function BanHangPage() {
  const router = useRouter();
  const { can } = useAuthorization();
  const canCreate = can("sales_order.create");
  const [productionEnabled,setProductionEnabled]=React.useState(false);
  React.useEffect(()=>{fetch("/api/production-orders/readiness").then(r=>r.json()).then(d=>setProductionEnabled(Boolean(d.ready))).catch(()=>{});},[]);

  // Dữ liệu
  const [orders, setOrders] = React.useState<SalesOrderDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState("");

  // Filters
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);

  // Chi tiết đơn hàng được chọn
  const [selectedOrder, setSelectedOrder] = React.useState<SalesOrderDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [isStockDocModalOpen, setIsStockDocModalOpen] = React.useState(false);
  const [selectedOrderForStock, setSelectedOrderForStock] = React.useState<SalesOrderDto | null>(null);

  // Đồng bộ tiêu đề vào TopBar (không để nút thêm ở TopBar)
  useSetPageHeader(
    {
      title: "Bán hàng",
      subtitle: "Danh sách",
      screenCode: "M04",
      quickViews: [
        { label: "Tất cả đơn bán", href: "/ban-hang" },
        { label: "Đã xác nhận", href: "/ban-hang?status=confirmed" },
        { label: "Hoàn thành", href: "/ban-hang?status=completed" },
      ],
    },
    []
  );

  // Tải danh sách đơn bán hàng
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/crm/orders");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (err: any) {
      toast.error("Lỗi tải danh sách đơn bán hàng: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Tạo phiếu xuất kho M09 trực tiếp qua Modal hiện đại
  const handleCreateStockOutbound = (order: SalesOrderDto) => {
    if(order.productionWorkflow){router.push(`/ban-hang/theo-san-xuat?orderId=${order.id}`);return;}
    setSelectedOrderForStock(order);
    setIsStockDocModalOpen(true);
  };

  // Điều hướng thu tiền đơn hàng M16
  const handleCollectPayment = (order: SalesOrderDto) => {
    router.push(`/tai-chinh?tab=so-quy&action=receipt&customer=${encodeURIComponent(order.customerName || "")}&amount=${order.total || 0}&refDoc=${order.code}`);
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
        { value: "approved", label: "Đã phê duyệt", count: orders.filter((o) => o.status === "approved").length },
        { value: "completed", label: "Hoàn thành", count: orders.filter((o) => o.status === "completed").length },
        { value: "submitted", label: "Chờ duyệt", count: orders.filter((o) => o.status === "submitted").length },
        { value: "draft", label: "Bản nháp", count: orders.filter((o) => o.status === "draft").length },
      ],
      selectedValues: statusFilters,
      onChange: setStatusFilters,
    },
  ];

  // Thống kê nhanh
  const stats: StatItem[] = React.useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const approvedCount = filteredOrders.filter((o) => o.status === "approved" || o.status === "completed").length;

    return [
      { label: "Tổng Đơn Bán", value: `${totalCount} đơn`, color: "blue" },
      {
        label: "Tổng Doanh Thu Bán",
        value: `${(totalRevenue / 1_000_000).toFixed(1)} tr`,
        color: "emerald",
      },
      { label: "Đơn Đã Phê Duyệt", value: `${approvedCount} đơn`, color: "amber" },
      { label: "Mô Hình ERP", value: "Cách ly kho & quỹ chuẩn", color: "neutral" },
    ];
  }, [filteredOrders]);

  // Cấu hình Cột DataTable chuẩn Benchmark UI
  const columns: DataTableColumn<SalesOrderDto>[] = [
    {
      id: "code",
      header: "Mã Đơn SO",
      accessorKey: "code",
      sortable: true,
      width: "w-32 min-w-[120px]",
      permanent: true,
      cell: (o) => (
        <span
          onClick={() => {
            setSelectedOrder(o);
            setIsDetailOpen(true);
          }}
          className="font-mono text-xs font-semibold text-slate-800 hover:text-blue-600 cursor-pointer"
        >
          {o.code}
        </span>
      ),
    },
    {
      id: "customerName",
      header: "Khách Hàng / Đối Tác",
      accessorKey: "customerName",
      sortable: true,
      width: "min-w-[240px]",
      cell: (o) => {
        const firstLetter = (o.customerName || "K").trim().charAt(0).toUpperCase();
        return (
          <div
            onClick={() => {
              setSelectedOrder(o);
              setIsDetailOpen(true);
            }}
            className="flex items-center gap-2 cursor-pointer group py-0.5"
            title={o.customerName}
          >
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {firstLetter}
            </span>
            <span className="font-semibold text-slate-900 truncate max-w-[230px] group-hover:text-blue-600 transition-colors">
              {o.customerName || "Khách lẻ tại quầy"}
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
      id: "total",
      header: "Tổng thanh toán",
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
        if (o.status === "approved" || o.status === "completed") {
          return <Badge variant="success">{o.status === "completed" ? "Hoàn thành" : "Đã duyệt"}</Badge>;
        }
        return <Badge variant="warning">{o.status || "Chờ xử lý"}</Badge>;
      },
    },
  ];

  const rowActions: DataTableRowAction<SalesOrderDto>[] = [
    {
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      title: "Xem chi tiết đơn",
      onClick: (o) => {
        setSelectedOrder(o);
        setIsDetailOpen(true);
      },
    },
    {
      icon: <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />,
      title: "Tạo phiếu xuất kho M09",
      onClick: (o) => handleCreateStockOutbound(o),
    },
    {
      icon: <CreditCard className="w-3.5 h-3.5 text-amber-600" />,
      title: "Thu tiền đơn hàng M16",
      onClick: (o) => handleCollectPayment(o),
    },
    {
      icon: <Printer className="w-3.5 h-3.5 text-slate-600" />,
      title: "In hóa đơn bán hàng",
      onClick: (o) => {
        setSelectedOrder(o);
        setIsPrintModalOpen(true);
      },
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
        searchPlaceholder="Tên / mã SO, khách hàng..."
        searchValue={keyword}
        onSearchChange={setKeyword}
        filters={facetFilters}
        onResetFilters={() => {
          setStatusFilters([]);
          setKeyword("");
        }}
        stats={stats}
        defaultShowStats={false}
        onRefresh={loadData}
        exportFileName="Danh_sach_don_ban_hang"
        rowActions={rowActions}
        isLoading={isLoading}
        onRowClick={(order) => {
          setSelectedOrder(order);
          setIsDetailOpen(true);
        }}
        primaryAction={
          <div className="flex gap-2">{productionEnabled && <Link href="/ban-hang/theo-san-xuat"><Button size="sm" variant="secondary">Bán theo lô sản xuất</Button></Link>}<Link href="/ban-hang/tao-moi">
            <Button
              variant="primary"
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đơn bán</span>
            </Button>
          </Link></div>
        }
      />

      {/* DRAWER CHI TIẾT ĐƠN HÀNG */}
      <Drawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedOrder ? `Đơn Bán Hàng: ${selectedOrder.code}` : "Chi Tiết Đơn Hàng"}
        width="lg"
      >
        {selectedOrder && (
          <div className="space-y-6 pb-6 text-xs">
            {selectedOrder.productionWorkflow && <Link className="text-blue-600" href={`/ban-hang/theo-san-xuat?orderId=${selectedOrder.id}`}>Duyệt đơn / Xem phiếu xuất theo lô sản xuất</Link>}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedOrder.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{selectedOrder.customerName}</h3>
                <p className="text-xs text-slate-500">Ngày đặt: {new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN")}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Tổng thanh toán:</span>
                <span className="font-mono text-lg font-bold text-slate-900">
                  {(selectedOrder.total || 0).toLocaleString("vi-VN")} đ
                </span>
                <div className="mt-1">
                  <Badge variant="success">{selectedOrder.status}</Badge>
                </div>
              </div>
            </div>

            {/* Bảng Dòng Mặt Hàng */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Danh sách mặt hàng xuất bán:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {(selectedOrder.lines || []).map((l: any, idx: number) => (
                  <div key={l.id || idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">{l.description || l.itemName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Số lượng: <strong>{l.qty}</strong> {l.unitName || "Cái"} • Đơn giá: {l.unitPrice?.toLocaleString("vi-VN")} đ
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {l.lineTotal?.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hành động liên kết luồng nghiệp vụ */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateStockOutbound(selectedOrder)}
                  className="flex-1 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                >
                  <PackageCheck className="w-4 h-4" />
                  Tạo Phiếu Xuất Kho (M09)
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleCollectPayment(selectedOrder)}
                  className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <CreditCard className="w-4 h-4" />
                  Lập Phiếu Thu Tiền (M16)
                </Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL IN HÓA ĐƠN BÁN HÀNG A4 */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="In Hóa Đơn Bán Hàng"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">XƯỞNG BIỂN QUẢNG CÁO SIGNAGE ERP</h3>
                  <p className="text-[11px] text-slate-500">Hóa đơn bán hàng thương mại / Bán lẻ</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700">{selectedOrder.code}</span>
                  <p className="text-[11px] text-slate-400">{new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>

              <div>
                <p><strong>Khách hàng:</strong> {selectedOrder.customerName}</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-xs text-slate-600">Tổng thanh toán:</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {(selectedOrder.total || 0).toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>
                Đóng
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                In hóa đơn A4
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TẠO PHIẾU XUẤT KHO TRỰC TIẾP */}
      <CreateStockDocModal
        isOpen={isStockDocModalOpen}
        onClose={() => {
          setIsStockDocModalOpen(false);
          setSelectedOrderForStock(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        initialType="issue"
        initialReason={
          selectedOrderForStock
            ? `Xuất kho giao hàng theo đơn bán ${selectedOrderForStock.code} - ${selectedOrderForStock.customerName || ""}`
            : "Xuất kho bán hàng"
        }
      />
    </div>
  );
}
