"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Badge,
  Modal,
  toast,
} from "@/components/ui";
import {
  HardHat,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Layers,
  ChevronRight,
  Clock,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  FileCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import { ProjectDto, ProjectStatus } from "@/services/project.service";
import { useSetPageHeader } from "@/contexts/page-header-context";

const KANBAN_COLUMNS: {
  id: ProjectStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    id: "survey",
    title: "1. Khảo sát & Đo đạc",
    icon: HardHat,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "production",
    title: "2. Gia công xưởng",
    icon: Wrench,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "transport",
    title: "3. Vận chuyển",
    icon: Truck,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50/50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "installation",
    title: "4. Lắp dựng hiện trường",
    icon: HardHat,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50/50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  {
    id: "acceptance",
    title: "5. Nghiệm thu & Bàn giao",
    icon: FileCheck,
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
];

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "neutral" | "success" | "warning" | "danger" | "info" }> = {
  planning: { label: "Lập kế hoạch", variant: "neutral" },
  survey: { label: "Đang khảo sát", variant: "warning" },
  production: { label: "Gia công xưởng", variant: "info" },
  transport: { label: "Vận chuyển", variant: "info" },
  installation: { label: "Đang thi công", variant: "warning" },
  acceptance: { label: "Chờ nghiệm thu", variant: "success" },
  completed: { label: "Hoàn tất", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "danger" },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = React.useState<ProjectDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // State cho Modal tạo mới
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    customerId: "",
    address: "",
    latitude: "21.011667",
    longitude: "105.849444",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    templateVersionId: "",
  });

  const fetchProjects = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Không thể tải danh sách dự án");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Load Customers và Templates cho Modal
  const loadFormData = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/crm/customers"),
        fetch("/api/projects/templates"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setCustomers(cData.customers || []);
        if (cData.customers?.length > 0 && !formData.customerId) {
          setFormData((prev) => ({ ...prev, customerId: cData.customers[0].id }));
        }
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTemplates(tData.templates || []);
        if (tData.templates?.length > 0 && !formData.templateVersionId) {
          setFormData((prev) => ({ ...prev, templateVersionId: tData.templates[0].versionId }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = () => {
    loadFormData();
    setIsCreateOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.customerId || !formData.address) {
      toast.error("Vui lòng điền đầy đủ Tên dự án, Khách hàng và Địa chỉ");
      return;
    }
    try {
      setCreating(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          customerId: formData.customerId,
          address: formData.address,
          latitude: Number(formData.latitude) || undefined,
          longitude: Number(formData.longitude) || undefined,
          startDate: formData.startDate || undefined,
          dueDate: formData.dueDate || undefined,
          templateVersionId: formData.templateVersionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo dự án");

      toast.success("Khởi tạo dự án & nhân bản cây công việc WBS thành công!");
      setIsCreateOpen(false);
      setFormData({
        name: "",
        customerId: customers[0]?.id || "",
        address: "",
        latitude: "21.011667",
        longitude: "105.849444",
        startDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        templateVersionId: templates[0]?.versionId || "",
      });
      fetchProjects();
      if (data.projectId) {
        router.push(`/du-an/${data.projectId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo dự án");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (projectId: string, nextStatus: ProjectStatus) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật tiến độ");
      toast.success("Đã chuyển mốc tiến độ dự án");
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI thống kê
  const totalCount = projects.length;
  const inProgressCount = projects.filter((p) => p.status === "installation").length;
  const inProductionCount = projects.filter((p) => p.status === "production").length;
  const acceptanceCount = projects.filter(
    (p) => p.status === "acceptance" || p.status === "completed"
  ).length;

  // Đồng bộ tiêu đề vào TopBar
  useSetPageHeader(
    {
      title: "Dự án",
      subtitle: "Công trình thi công",
      screenCode: "M11",
      quickViews: [
        { label: "Dạng bảng", href: "/du-an?view=table" },
        { label: "Dạng Kanban", href: "/du-an?view=kanban" },
        { label: "Đang thi công", href: "/du-an?status=installation" },
      ],
    },
    []
  );

  return (
    <div className="w-full flex flex-col space-y-2 flex-1">

      {/* STATBAR 1 DÒNG THU GỌN THEO QUY CHUẨN UI/UX */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 px-2">
          <Building2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Tổng Công Trình:</span>{" "}
            <strong className="text-slate-900 font-bold">{totalCount} dự án</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <Wrench className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Gia Công Xưởng:</span>{" "}
            <strong className="text-blue-700 font-bold">{inProductionCount}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <HardHat className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Lắp Dựng Hiện Trường:</span>{" "}
            <strong className="text-amber-700 font-bold">{inProgressCount}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-l border-slate-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="truncate">
            <span className="text-slate-500">Bàn Giao & Nghiệm Thu:</span>{" "}
            <strong className="text-emerald-700 font-bold">{acceptanceCount}</strong>
          </div>
        </div>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM & CHUYỂN VIEW */}
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên biển, mã DA, khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <option value="all">Tất cả giai đoạn</option>
            <option value="survey">1. Khảo sát</option>
            <option value="production">2. Gia công xưởng</option>
            <option value="transport">3. Vận chuyển</option>
            <option value="installation">4. Lắp dựng</option>
            <option value="acceptance">5. Nghiệm thu</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchProjects} className="gap-1 text-neutral-500">
            <RefreshCw className="h-3.5 w-3.5" />
            Tải lại
          </Button>
        </div>

        {/* ACTIONS & SWITCH BẢNG / KANBAN */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-primary-700 shadow-sm dark:bg-neutral-900 dark:text-primary-400"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban 5 Cột
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-primary-700 shadow-sm dark:bg-neutral-900 dark:text-primary-400"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Chế độ Bảng
            </button>
          </div>
          <Link href="/du-an/templates">
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
              <Layers className="h-3.5 w-3.5" />
              <span>Mẫu (M13)</span>
            </Button>
          </Link>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo dự án</span>
          </Button>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH: KANBAN HOẶC BẢNG */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-neutral-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Đang tải danh sách công trình...</span>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        /* ================= KANBAN 5 CỘT MỐC ================= */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {KANBAN_COLUMNS.map((col) => {
            const Icon = col.icon;
            const colProjects = filteredProjects.filter((p) => {
              if (col.id === "acceptance") {
                return p.status === "acceptance" || p.status === "completed";
              }
              return p.status === col.id;
            });

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-xl border ${col.borderColor} ${col.bgColor} p-3 min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-700/80 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${col.color}`} />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {col.title}
                    </span>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-300">
                    {colProjects.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3">
                  {colProjects.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      Không có công trình nào
                    </div>
                  ) : (
                    colProjects.map((p) => (
                      <div
                        key={p.id}
                        className="group relative rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        {/* Header card */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-mono text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                            {p.code}
                          </span>
                          <span className="text-[10px] font-medium text-neutral-400">
                            {p.totalTasks} đầu việc
                          </span>
                        </div>

                        {/* Title */}
                        <Link
                          href={`/du-an/${p.id}`}
                          className="mt-1 block font-semibold text-neutral-900 line-clamp-2 hover:text-primary-600 dark:text-neutral-100"
                        >
                          {p.name}
                        </Link>

                        {/* Customer */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          <span className="truncate font-medium">{p.customerName}</span>
                        </div>

                        {/* Address */}
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-neutral-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400 mt-0.5" />
                          <span className="line-clamp-1">{p.address}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-neutral-500">Tiến độ WBS</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-200">
                              {p.progressPercent}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div
                              className={`h-full rounded-full transition-all ${
                                p.progressPercent === 100
                                  ? "bg-emerald-500"
                                  : p.progressPercent > 50
                                  ? "bg-primary-600"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer: Due date & Next step button */}
                        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-500 dark:border-neutral-800">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-neutral-400" />
                            <span>{p.dueDate || "Chưa đặt hạn"}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Chuyển mốc tiếp theo nếu chưa hoàn thành */}
                            {col.id === "survey" && (
                              <button
                                type="button"
                                title="Chuyển sang Gia công xưởng"
                                onClick={() => handleUpdateStatus(p.id, "production")}
                                className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {col.id === "production" && (
                              <button
                                type="button"
                                title="Chuyển sang Vận chuyển"
                                onClick={() => handleUpdateStatus(p.id, "transport")}
                                className="rounded p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {col.id === "transport" && (
                              <button
                                type="button"
                                title="Chuyển sang Lắp dựng"
                                onClick={() => handleUpdateStatus(p.id, "installation")}
                                className="rounded p-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {col.id === "installation" && (
                              <button
                                type="button"
                                title="Chuyển sang Nghiệm thu"
                                onClick={() => handleUpdateStatus(p.id, "acceptance")}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <Link
                              href={`/du-an/${p.id}`}
                              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= CHẾ ĐỘ BẢNG DOANH NGHIỆP ================= */
        <Card className="overflow-hidden border-neutral-200/80 shadow-sm dark:border-neutral-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50/75 text-xs font-semibold text-neutral-600 uppercase tracking-wider dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Mã Dự Án</th>
                  <th className="px-4 py-3">Tên Công Trình</th>
                  <th className="px-4 py-3">Khách Hàng</th>
                  <th className="px-4 py-3">Địa Chỉ Thi Công</th>
                  <th className="px-4 py-3">Tiến Độ WBS</th>
                  <th className="px-4 py-3">Giai Đoạn</th>
                  <th className="px-4 py-3">Hạn Bàn Giao</th>
                  <th className="px-4 py-3 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-400">
                      Không tìm thấy công trình nào
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const badge = STATUS_BADGES[p.status] || {
                      label: p.status,
                      variant: "secondary",
                    };
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                          {p.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                          <Link href={`/du-an/${p.id}`} className="hover:underline">
                            {p.name}
                          </Link>
                          {p.templateName && (
                            <span className="block text-[11px] text-neutral-400">
                              Mẫu: {p.templateName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                          {p.customerName}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500 max-w-xs truncate">
                          {p.address}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div
                                className="h-full bg-primary-600 rounded-full"
                                style={{ width: `${p.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              {p.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant as any}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                          {p.dueDate || "Chưa đặt"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/du-an/${p.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1 text-primary-600">
                              Điều độ 360°
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL KHỞI TẠO DỰ ÁN MỚI */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Khởi Tạo Dự Án Mới & Nhân Bản Quy Trình WBS"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Tên Công Trình / Biển Hiệu Quảng Cáo *
            </label>
            <Input
              required
              placeholder="VD: Thi công Hộp đèn 3M - Highlands Coffee Times City"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Khách Hàng Chủ Đầu Tư *
              </label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nhân Bản Từ Mẫu Quy Trình (Template)
              </label>
              <select
                value={formData.templateVersionId}
                onChange={(e) => setFormData({ ...formData, templateVersionId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">-- Tạo trống không dùng mẫu --</option>
                {templates.map((t) => (
                  <option key={t.versionId} value={t.versionId}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-neutral-500">
                Hệ thống tự động sinh 5 giai đoạn và toàn bộ cây công việc con.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Địa Chỉ Thi Công Công Trình *
            </label>
            <Input
              required
              placeholder="VD: Gian hàng T01, TTTM Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Tọa Độ Vĩ Độ GPS (Latitude)
              </label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Tọa Độ Kinh Độ GPS (Longitude)
              </label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Ngày Khởi Công
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Hạn Bàn Giao
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Hủy Bỏ
            </Button>
            <Button type="submit" disabled={creating} className="bg-primary-600 text-white">
              {creating ? "Đang khởi tạo..." : "Khởi Tạo Dự Án"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
