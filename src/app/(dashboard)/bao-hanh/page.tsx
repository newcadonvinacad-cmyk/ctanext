"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Button,
  Badge,
  Modal,
  Drawer,
  Input,
  toast,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
} from "@/components/shared";
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Search,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  RefreshCw,
  Building2,
  DollarSign,
  User,
  ExternalLink,
} from "lucide-react";
import { ServiceTicketDto } from "@/services/signage-phase2.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

export default function WarrantyServicePage() {
  const { can } = useAuthorization();

  useSetPageHeader({
    title: "Sổ Bảo Hành & Ticket Xử Lý Sự Cố Công Trình",
    subtitle: "Quản lý bảo hành, tiếp nhận sự cố kỹ thuật và phân công thợ xử lý",
    screenCode: "M14-BH",
    quickViews: [
      { label: "Dự án thi công", href: "/du-an" },
      { label: "Báo cáo hiện trường", href: "/cong-viec" },
    ],
  });

  const [tickets, setTickets] = React.useState<ServiceTicketDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [selectedTicket, setSelectedTicket] = React.useState<ServiceTicketDto | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  // Danh sách dự án & nhân sự để chọn
  const [projects, setProjects] = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);

  // Form tạo ticket mới
  const [createFormData, setCreateFormData] = React.useState({
    projectId: "",
    customerId: "",
    title: "",
    issueType: "led_power",
    priority: "medium",
    isWarranty: true,
    assignedEmployeeId: "",
  });

  // Form cập nhật ticket
  const [updateFormData, setUpdateFormData] = React.useState({
    status: "in_progress",
    assignedEmployeeId: "",
    resolutionNotes: "",
    costAmount: 0,
  });

  const fetchTickets = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/service-tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Lỗi tải tickets:", err);
      toast.error("Không thể tải danh sách sự cố bảo hành");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInitialData = React.useCallback(async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch("/api/projects?limit=100"),
        fetch("/api/projects/employees"),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData.projects || []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEmployees(eData.employees || eData.items || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh mục:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchTickets();
    fetchInitialData();
  }, [fetchTickets, fetchInitialData]);

  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        (t.projectName && t.projectName.toLowerCase().includes(search.toLowerCase())) ||
        (t.customerName && t.customerName.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.projectId || !createFormData.title.trim()) {
      toast.error("Vui lòng chọn Dự án và nhập Tiêu đề sự cố");
      return;
    }

    const selectedProj = projects.find((p) => p.id === createFormData.projectId);
    const customerId = selectedProj?.customerId || createFormData.customerId;
    if (!customerId) {
      toast.error("Không xác định được khách hàng của dự án này");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/service-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createFormData,
          customerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo ticket");

      toast.success(`Đã tạo phiếu sự cố ${data.ticket.code}!`);
      setIsCreateModalOpen(false);
      setCreateFormData({
        projectId: "",
        customerId: "",
        title: "",
        issueType: "led_power",
        priority: "medium",
        isWarranty: true,
        assignedEmployeeId: "",
      });
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo ticket");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setUpdating(true);
      const res = await fetch(`/api/service-tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật ticket");

      toast.success("Đã cập nhật tiến độ xử lý sự cố!");
      setIsUpdateModalOpen(false);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật ticket");
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (t: ServiceTicketDto) => {
    setSelectedTicket(t);
    setUpdateFormData({
      status: t.status,
      assignedEmployeeId: t.assignedEmployeeId || "",
      resolutionNotes: t.resolutionNotes || "",
      costAmount: t.costAmount || 0,
    });
    setIsUpdateModalOpen(true);
  };

  // Cột hiển thị bảng
  const columns: DataTableColumn<ServiceTicketDto>[] = [
    {
      id: "code",
      header: "Mã sự cố",
      width: "120px",
      cell: (item: ServiceTicketDto) => (
        <div>
          <button
            type="button"
            onClick={() => openUpdateModal(item)}
            className="font-mono font-bold text-blue-600 hover:underline block text-xs"
          >
            {item.code}
          </button>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {item.reportedAt ? new Date(item.reportedAt).toLocaleDateString("vi-VN") : ""}
          </span>
        </div>
      ),
    },
    {
      id: "title",
      header: "Nội dung sự cố & Công trình",
      width: "min-w-[280px] w-full",
      cell: (item: ServiceTicketDto) => (
        <div>
          <strong className="text-slate-900 block font-semibold text-xs">{item.title}</strong>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-xs">{item.projectName}</span>
          </div>
        </div>
      ),
    },
    {
      id: "issueType",
      header: "Loại sự cố",
      width: "140px",
      cell: (item: ServiceTicketDto) => {
        const typeMap: Record<string, string> = {
          led_power: "⚡ Hỏng nguồn / Đèn LED",
          structural: "🏗️ Khung sắt / Dầm lỏng",
          decal_acrylic: "🎨 Bong Decal / Vỡ Mica",
          weather_damage: "⛈️ Giông bão / Tác động ngoại cảnh",
          other: "🔧 Bảo trì định kỳ",
        };
        return (
          <span className="text-xs text-slate-700 font-medium">
            {typeMap[item.issueType] || item.issueType}
          </span>
        );
      },
    },
    {
      id: "priority",
      header: "Mức độ",
      width: "110px",
      cell: (item: ServiceTicketDto) => {
        if (item.priority === "urgent") {
          return (
            <Badge variant="danger" className="text-[10px] animate-pulse">
              🚨 Khẩn cấp
            </Badge>
          );
        }
        if (item.priority === "high") {
          return (
            <Badge variant="warning" className="text-[10px]">
              Ưu tiên cao
            </Badge>
          );
        }
        return (
          <Badge variant="neutral" className="text-[10px]">
            Bình thường
          </Badge>
        );
      },
    },
    {
      id: "technician",
      header: "Kỹ thuật phụ trách",
      cell: (item: ServiceTicketDto) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800 block">
            {item.assignedEmployeeName || "Chưa phân công"}
          </span>
          {item.customerPhone && (
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              Khách: {item.customerPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "costAmount",
      header: "Chi phí xử lý",
      cell: (item: ServiceTicketDto) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-slate-900">
            {item.costAmount.toLocaleString("vi-VN")} đ
          </span>
          <span className="text-[10px] text-slate-400 block">
            {item.isWarranty ? "Bảo hành miễn phí" : "Tính phí"}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      width: "120px",
      cell: (item: ServiceTicketDto) => {
        if (item.status === "resolved") {
          return (
            <Badge variant="success" className="text-[10px]">
              Đã xử lý xong
            </Badge>
          );
        }
        if (item.status === "in_progress") {
          return (
            <Badge variant="info" className="text-[10px]">
              Đang sửa chữa
            </Badge>
          );
        }
        return (
          <Badge variant="warning" className="text-[10px]">
            Mới tiếp nhận
          </Badge>
        );
      },
    },
  ];

  const rowActions: DataTableRowAction<ServiceTicketDto>[] = [
    {
      title: "Cập nhật xử lý",
      icon: <Wrench className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => openUpdateModal(item),
    },
  ];

  const totalTickets = tickets.length;
  const urgentTickets = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;
  const resolvedTickets = tickets.filter((t) => t.status === "resolved").length;
  const totalCost = tickets.reduce((sum, t) => sum + t.costAmount, 0);

  return (
    <div className="space-y-4 w-full">
      {/* 4 THẺ THỐNG KÊ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Tổng số sự cố</span>
            <strong className="text-xl font-bold text-slate-900 mt-0.5 block font-mono">
              {totalTickets}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-800 block font-medium">Sự cố khẩn cấp (Nguy hiểm)</span>
            <strong className="text-xl font-bold text-rose-600 mt-0.5 block font-mono">
              {urgentTickets}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Đã xử lý dứt điểm</span>
            <strong className="text-xl font-bold text-emerald-600 mt-0.5 block font-mono">
              {resolvedTickets}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Chi phí bảo hành lũy kế</span>
            <strong className="text-base font-bold text-slate-900 mt-0.5 block font-mono">
              {totalCost.toLocaleString("vi-VN")} đ
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU ĐỘNG VỚI BỘ LỌC CHUẨN BENCHMARK */}
      <DataTable
        data={filteredTickets}
        columns={columns}
        rowActions={rowActions}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        onRefresh={fetchTickets}
        onRowClick={openUpdateModal}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo mã sự cố, tên lỗi, công trình, khách hàng..."
        emptyMessage="Chưa có phiếu sự cố bảo hành nào phù hợp"
        primaryAction={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="received">Mới tiếp nhận</option>
              <option value="in_progress">Đang sửa chữa</option>
              <option value="resolved">Đã xử lý xong</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="urgent">🚨 Khẩn cấp</option>
              <option value="high">Ưu tiên cao</option>
              <option value="medium">Bình thường</option>
            </select>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="h-8 text-xs gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tiếp Nhận Sự Cố</span>
            </Button>
          </div>
        }
      />

      {/* MODAL TẠO TICKET SỰ CỐ MỚI */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tiếp Nhận Sự Cố & Yêu Cầu Bảo Hành Công Trình"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Dự án công trình *</label>
            <select
              value={createFormData.projectId}
              onChange={(e) => setCreateFormData({ ...createFormData, projectId: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <option value="">-- Chọn công trình cần bảo hành --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mô tả sự cố gặp phải *</label>
            <Input
              placeholder="Ví dụ: Chữ nổi bên trái không sáng LED, nguồn phát tiếng kêu lạ..."
              value={createFormData.title}
              onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phân loại lỗi</label>
              <select
                value={createFormData.issueType}
                onChange={(e) => setCreateFormData({ ...createFormData, issueType: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="led_power">⚡ Hỏng nguồn / Đèn LED</option>
                <option value="structural">🏗️ Khung sắt / Mối hàn dầm</option>
                <option value="decal_acrylic">🎨 Bong tróc Decal / Vỡ Mica</option>
                <option value="weather_damage">⛈️ Giông bão / Mưa ngập</option>
                <option value="other">🔧 Khác / Bảo trì định kỳ</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mức độ ưu tiên</label>
              <select
                value={createFormData.priority}
                onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="urgent">🚨 Khẩn cấp (Nguy hiểm có nguy cơ rơi)</option>
                <option value="high">Ưu tiên cao (Mặt tiền tắt tối)</option>
                <option value="medium">Bình thường</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phân công kỹ thuật viên</label>
              <select
                value={createFormData.assignedEmployeeId}
                onChange={(e) => setCreateFormData({ ...createFormData, assignedEmployeeId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="">-- Chọn kỹ thuật phụ trách --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Chế độ bảo hành</label>
              <select
                value={createFormData.isWarranty ? "true" : "false"}
                onChange={(e) => setCreateFormData({ ...createFormData, isWarranty: e.target.value === "true" })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="true">Bảo hành miễn phí theo hợp đồng</option>
                <option value="false">Bảo trì dịch vụ (Tính phí)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{creating ? "Đang lưu..." : "Tạo Ticket Sự Cố"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRAWER CHI TIẾT & CẬP NHẬT KẾT QUẢ XỬ LÝ SỰ CỐ */}
      {selectedTicket && (
        <Drawer
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          title={`Sự Cố & Bảo Hành: ${selectedTicket.code}`}
          width="lg"
        >
          <form onSubmit={handleUpdateSubmit} className="space-y-5 text-xs text-slate-700">
            {/* Header Thẻ Tổng Quan */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedTicket.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      selectedTicket.status === "resolved"
                        ? "success"
                        : selectedTicket.status === "in_progress"
                        ? "info"
                        : "warning"
                    }
                  >
                    {selectedTicket.status === "resolved"
                      ? "Đã xử lý xong"
                      : selectedTicket.status === "in_progress"
                      ? "Đang sửa chữa"
                      : "Mới tiếp nhận"}
                  </Badge>
                  {selectedTicket.priority === "urgent" ? (
                    <Badge variant="danger" className="text-[10px]">🚨 Khẩn cấp</Badge>
                  ) : selectedTicket.priority === "high" ? (
                    <Badge variant="warning" className="text-[10px]">Ưu tiên cao</Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[10px]">Bình thường</Badge>
                  )}
                </div>
              </div>

              <div>
                <strong className="text-slate-900 block text-sm font-semibold">{selectedTicket.title}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[11px]">Công trình:</span>
                  <div className="flex items-center gap-1 font-medium text-slate-800 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedTicket.projectName}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Khách hàng:</span>
                  <div className="flex items-center gap-1 font-medium text-slate-800 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedTicket.customerName}</span>
                  </div>
                  {selectedTicket.customerPhone && (
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      SĐT: {selectedTicket.customerPhone}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Chế độ:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTicket.isWarranty ? "🛡️ Bảo hành miễn phí theo hợp đồng" : "💰 Bảo trì dịch vụ (Tính phí)"}
                </span>
              </div>
            </div>

            {/* Form Cập Nhật Xử Lý */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Cập Nhật Tiến Độ & Phân Công Xử Lý
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trạng thái xử lý</label>
                  <select
                    value={updateFormData.status}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    <option value="received">Mới tiếp nhận</option>
                    <option value="dispatched">Đã điều thợ đi hiện trường</option>
                    <option value="in_progress">Đang kiểm tra & sửa chữa</option>
                    <option value="resolved">✅ Đã xử lý xong (Nghiệm thu)</option>
                    <option value="cancelled">Hủy ticket</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kỹ thuật viên phụ trách</label>
                  <select
                    value={updateFormData.assignedEmployeeId}
                    onChange={(e) => setUpdateFormData({ ...updateFormData, assignedEmployeeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chi phí phát sinh thực tế (VNĐ)
                </label>
                <Input
                  type="number"
                  value={updateFormData.costAmount}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, costAmount: parseFloat(e.target.value) || 0 })}
                  className="text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Tiền vật tư thay thế (nguồn, led, rơ-le) + tiền thuê xe cẩu/khoán thợ
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Biên bản xử lý / Nguyên nhân & Giải pháp khắc phục
                </label>
                <textarea
                  rows={4}
                  placeholder="Ví dụ: Đã kiểm tra hiện trường, nguồn bị chập do nước mưa rò rỉ. Đã thay nguồn Meanwell 12V mới và bơm kín keo A500 chống nước."
                  value={updateFormData.resolutionNotes}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, resolutionNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-xs"
              >
                Đóng
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updating}
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs gap-1.5 shadow-2xs font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{updating ? "Đang lưu..." : "Lưu Kết Quả Xử Lý"}</span>
              </Button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}
