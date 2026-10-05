"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Button,
  Badge,
  Drawer,
  Modal,
  Input,
  Checkbox,
  StatBar,
  toast,
  type StatItem,
} from "@/components/ui";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowAction,
  type DataTableFacetFilterConfig,
} from "@/components/shared";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  RotateCw,
  X,
  Eye,
  Building2,
  LayoutGrid,
  Table2,
  Users,
  MapPin,
  Calendar,
  Layers,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  Check,
  Navigation,
  UserCheck,
  UserPlus,
  Sliders,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";
import { TaskStatus } from "@/services/project.service";

// ==========================================
// 1. CẤU HÌNH TRẠNG THÁI & KANBAN (BENCHMARK)
// ==========================================

const TASK_KANBAN_COLUMNS: {
  id: TaskStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
}[] = [
  {
    id: "todo",
    title: "Chờ thực hiện",
    icon: Clock,
    color: "text-slate-700",
    bgColor: "bg-slate-50/70",
    borderColor: "border-slate-200",
    badgeBg: "bg-slate-200 text-slate-700",
  },
  {
    id: "doing",
    title: "Đang thực hiện",
    icon: Wrench,
    color: "text-blue-700",
    bgColor: "bg-blue-50/40",
    borderColor: "border-blue-200",
    badgeBg: "bg-blue-100 text-blue-800",
  },
  {
    id: "awaiting_acceptance",
    title: "Chờ nghiệm thu",
    icon: AlertCircle,
    color: "text-amber-700",
    bgColor: "bg-amber-50/40",
    borderColor: "border-amber-200",
    badgeBg: "bg-amber-100 text-amber-800",
  },
  {
    id: "done",
    title: "Đã hoàn thành",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50/40",
    borderColor: "border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
];

const renderStatusBadge = (status: TaskStatus | string) => {
  switch (status) {
    case "done":
      return <Badge variant="success">Hoàn thành</Badge>;
    case "awaiting_acceptance":
      return (
        <Badge variant="info" className="bg-sky-50 text-sky-700 border-sky-200">
          Chờ nghiệm thu
        </Badge>
      );
    case "doing":
      return <Badge variant="warning">Đang làm</Badge>;
    case "cancelled":
      return <Badge variant="danger">Đã hủy</Badge>;
    default:
      return <Badge variant="neutral">Chờ làm</Badge>;
  }
};

// ==========================================
// 2. TYPES
// ==========================================

interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  phone: string | null;
}

interface TaskAssignee {
  id: string;
  employeeId: string;
  code: string;
  name: string;
  phone: string | null;
}

interface TaskItem {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  startAt?: string | null;
  isField: boolean;
  weight: number;
  progressPercent: number;
  projectId: string;
  projectCode: string;
  projectName: string;
  stageId: string | null;
  stageCode: string | null;
  stageName: string | null;
  assignees: TaskAssignee[];
  createdAt: string;
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

export default function CongViecPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can, user } = useAuthorization();

  // Tab chuyển đổi: "table" (Bảng Data Table) | "by_employee" (Xem theo nhân sự) | "kanban" (Kanban tiến độ)
  const [activeTab, setActiveTab] = React.useState<"table" | "by_employee" | "kanban">(() => {
    const tabParam = searchParams.get("view") || searchParams.get("tab");
    if (tabParam === "by_employee" || tabParam === "employee") return "by_employee";
    if (tabParam === "kanban") return "kanban";
    return "table";
  });

  const switchTab = (tab: "table" | "by_employee" | "kanban") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("view", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Dữ liệu
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Bộ lọc cho Tab Data Table
  const [searchQuery, setSearchQuery] = React.useState("");
  const [employeeFilters, setEmployeeFilters] = React.useState<string[]>(() => {
    const empParam = searchParams.get("assignee") || searchParams.get("employee");
    if (empParam === "unassigned") return ["unassigned"];
    if (empParam) return [empParam];
    return [];
  });
  const [statusFilters, setStatusFilters] = React.useState<string[]>(() => {
    const stParam = searchParams.get("status");
    return stParam ? [stParam] : [];
  });
  const [typeFilters, setTypeFilters] = React.useState<string[]>(() => {
    const tParam = searchParams.get("type");
    return tParam ? [tParam] : [];
  });
  const [projectFilters, setProjectFilters] = React.useState<string[]>([]);

  // Drawer xem chi tiết công việc
  const [selectedTask, setSelectedTask] = React.useState<TaskItem | null>(null);

  // Modal đổi trạng thái nhanh
  const [statusModalTask, setStatusModalTask] = React.useState<TaskItem | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<TaskStatus>("doing");
  const [targetProgress, setTargetProgress] = React.useState<number>(50);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Tab "Xem theo nhân sự": Danh sách nhân sự được mở rộng (expanded rows)
  const [expandedEmployeeIds, setExpandedEmployeeIds] = React.useState<Record<string, boolean>>({
    unassigned: true,
  });
  const [employeeSearch, setEmployeeSearch] = React.useState("");

  // Tải dữ liệu
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, empRes] = await Promise.all([
        fetch("/api/projects/tasks"),
        fetch("/api/projects/employees"),
      ]);

      if (!tasksRes.ok) throw new Error("Không thể tải danh sách công việc");
      if (!empRes.ok) throw new Error("Không thể tải danh sách nhân sự");

      const tasksData = await tasksRes.json();
      const empData = await empRes.json();

      setTasks(tasksData.tasks || []);
      setEmployees(empData.employees || []);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cập nhật trạng thái công việc (gọi API PATCH)
  const updateTaskStatus = async (
    taskId: string,
    newStatus: TaskStatus,
    newProgress?: number
  ) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    let progressToSet = newProgress !== undefined ? newProgress : currentTask.progressPercent;
    if (newProgress === undefined) {
      if (newStatus === "done" || newStatus === "awaiting_acceptance") {
        progressToSet = 100;
      } else if (newStatus === "todo") {
        progressToSet = 0;
      } else if (newStatus === "doing" && currentTask.progressPercent === 0) {
        progressToSet = 50;
      }
    }

    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          progressPercent: progressToSet,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Lỗi cập nhật trạng thái");
      }

      // Optimistic state update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, progressPercent: progressToSet }
            : t
        )
      );

      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) =>
          prev ? { ...prev, status: newStatus, progressPercent: progressToSet } : null
        );
      }

      const statusLabels: Record<TaskStatus, string> = {
        todo: "Chờ thực hiện",
        doing: "Đang làm",
        awaiting_acceptance: "Chờ nghiệm thu",
        done: "Hoàn thành",
        cancelled: "Đã hủy",
      };

      toast.success(
        `Đã chuyển [${currentTask.code}] sang: ${statusLabels[newStatus]} (${progressToSet}%)`
      );
      setStatusModalTask(null);
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật công việc");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Modal phân công nhân sự
  const [assignModalTask, setAssignModalTask] = React.useState<TaskItem | null>(null);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = React.useState<string[]>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = React.useState("");
  const [isSavingAssignees, setIsSavingAssignees] = React.useState(false);

  const openAssignModal = (task: TaskItem) => {
    setAssignModalTask(task);
    setSelectedAssigneeIds(task.assignees.map((a) => a.employeeId));
    setAssigneeSearchQuery("");
  };

  const handleSaveAssignees = async () => {
    if (!assignModalTask) return;
    try {
      setIsSavingAssignees(true);
      const res = await fetch(`/api/projects/tasks/${assignModalTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: selectedAssigneeIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không thể phân công nhân sự");
      }

      const newAssignees: TaskAssignee[] = selectedAssigneeIds.map((empId) => {
        const emp = employees.find((e) => e.id === empId);
        return {
          id: empId,
          employeeId: empId,
          code: emp?.code || "",
          name: emp?.name || "Nhân viên",
          phone: emp?.phone || null,
        };
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === assignModalTask.id ? { ...t, assignees: newAssignees } : t
        )
      );

      if (selectedTask?.id === assignModalTask.id) {
        setSelectedTask((prev) => (prev ? { ...prev, assignees: newAssignees } : null));
      }

      toast.success(
        selectedAssigneeIds.length > 0
          ? `Đã phân công ${selectedAssigneeIds.length} nhân sự cho [${assignModalTask.code}] thành công!`
          : `Đã hủy phân công cho [${assignModalTask.code}].`
      );
      setAssignModalTask(null);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi phân công nhân sự");
    } finally {
      setIsSavingAssignees(false);
    }
  };

  // Đồng bộ Header trang chuẩn Benchmark
  useSetPageHeader(
    {
      title: "Việc làm",
      subtitle: "Trung tâm điều phối & phân công nhiệm vụ",
      screenCode: "M10",
      quickViews: [
        { label: "Tất cả công việc", href: "/cong-viec?view=table" },
        { label: "Xem theo nhân sự", href: "/cong-viec?view=by_employee" },
        { label: "Kanban tiến độ", href: "/cong-viec?view=kanban" },
        { label: "Việc hiện trường", href: "/cong-viec?view=table&type=field" },
        { label: "Chờ nghiệm thu", href: "/cong-viec?view=table&status=awaiting_acceptance" },
      ],
      primaryAction: (
        <div className="flex items-center gap-2">
          <Link href="/hien-truong">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
            >
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
              <span>Hiện Trường Mobile</span>
            </Button>
          </Link>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="gap-1 text-xs h-8 px-2.5 border-slate-300 text-slate-600 hover:text-slate-900 bg-white"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      ),
    },
    [loading, tasks.length]
  );

  // ==========================================
  // THỐNG KÊ NHANH (STATBAR)
  // ==========================================
  const stats: StatItem[] = React.useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const doing = tasks.filter((t) => t.status === "doing").length;
    const awaiting = tasks.filter((t) => t.status === "awaiting_acceptance").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const field = tasks.filter((t) => t.isField).length;

    return [
      { label: "Tổng đầu việc", value: total, color: "neutral" },
      { label: "Chờ thực hiện", value: todo, color: "neutral" },
      { label: "Đang làm", value: doing, color: "blue" },
      { label: "Chờ nghiệm thu", value: awaiting, color: "amber" },
      { label: "Đã xong", value: `${done} / ${total}`, color: "emerald" },
      { label: "Việc Hiện trường", value: field, color: "violet" },
    ];
  }, [tasks]);

  // ==========================================
  // BỘ LỌC DỮ LIỆU CLIENT-SIDE CHO DATA TABLE
  // ==========================================
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      // Tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = t.code.toLowerCase().includes(q);
        const matchProject =
          t.projectName.toLowerCase().includes(q) || t.projectCode.toLowerCase().includes(q);
        const matchAssignee = t.assignees.some((a) => a.name.toLowerCase().includes(q));
        if (!matchTitle && !matchCode && !matchProject && !matchAssignee) return false;
      }

      // Lọc nhân sự
      if (employeeFilters.length > 0) {
        const isUnassigned = t.assignees.length === 0;
        const matchesUnassigned = employeeFilters.includes("unassigned") && isUnassigned;
        const matchesEmployee = t.assignees.some((a) => employeeFilters.includes(a.employeeId));
        if (!matchesUnassigned && !matchesEmployee) return false;
      }

      // Lọc trạng thái
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(t.status)) return false;
      }

      // Lọc loại việc (Hiện trường vs Xưởng)
      if (typeFilters.length > 0) {
        const matchesField = typeFilters.includes("field") && t.isField;
        const matchesFactory = typeFilters.includes("factory") && !t.isField;
        if (!matchesField && !matchesFactory) return false;
      }

      // Lọc dự án
      if (projectFilters.length > 0) {
        if (!projectFilters.includes(t.projectId)) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, employeeFilters, statusFilters, typeFilters, projectFilters]);

  // Cấu hình Facet Filters chuẩn Benchmark UI
  const facetFilters: DataTableFacetFilterConfig[] = React.useMemo(() => {
    const unassignedCount = tasks.filter((t) => t.assignees.length === 0).length;

    // Dự án unique
    const uniqueProjects: { id: string; code: string; name: string }[] = [];
    const seenP = new Set<string>();
    tasks.forEach((t) => {
      if (!seenP.has(t.projectId)) {
        seenP.add(t.projectId);
        uniqueProjects.push({ id: t.projectId, code: t.projectCode, name: t.projectName });
      }
    });

    return [
      {
        id: "employee",
        title: "Người phụ trách",
        options: [
          {
            value: "unassigned",
            label: "⚠️ Chưa phân công",
            count: unassignedCount,
          },
          ...employees.map((e) => ({
            value: e.id,
            label: `${e.name} (${e.code})`,
            count: tasks.filter((t) => t.assignees.some((a) => a.employeeId === e.id)).length,
          })),
        ],
        selectedValues: employeeFilters,
        onChange: setEmployeeFilters,
        searchable: true,
      },
      {
        id: "status",
        title: "Trạng thái",
        options: [
          {
            value: "todo",
            label: "Chờ thực hiện",
            count: tasks.filter((t) => t.status === "todo").length,
          },
          {
            value: "doing",
            label: "Đang làm",
            count: tasks.filter((t) => t.status === "doing").length,
          },
          {
            value: "awaiting_acceptance",
            label: "Chờ nghiệm thu",
            count: tasks.filter((t) => t.status === "awaiting_acceptance").length,
          },
          {
            value: "done",
            label: "Đã hoàn thành",
            count: tasks.filter((t) => t.status === "done").length,
          },
        ],
        selectedValues: statusFilters,
        onChange: setStatusFilters,
      },
      {
        id: "type",
        title: "Phân loại việc",
        options: [
          {
            value: "field",
            label: "📍 Việc Hiện trường",
            count: tasks.filter((t) => t.isField).length,
          },
          {
            value: "factory",
            label: "🏭 Việc Xưởng / Nội bộ",
            count: tasks.filter((t) => !t.isField).length,
          },
        ],
        selectedValues: typeFilters,
        onChange: setTypeFilters,
      },
      {
        id: "project",
        title: "Dự án",
        options: uniqueProjects.map((p) => ({
          value: p.id,
          label: `${p.code} - ${p.name}`,
          count: tasks.filter((t) => t.projectId === p.id).length,
        })),
        selectedValues: projectFilters,
        onChange: setProjectFilters,
        searchable: true,
      },
    ];
  }, [tasks, employees, employeeFilters, statusFilters, typeFilters, projectFilters]);

  // Cột cho DataTable mật độ cao
  const columns: DataTableColumn<TaskItem>[] = React.useMemo(() => {
    return [
      {
        id: "code",
        header: "Mã việc",
        width: "110px",
        sortable: true,
        cell: (t) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTask(t);
            }}
            className="font-mono text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline block text-left"
          >
            {t.code}
          </button>
        ),
      },
      {
        id: "title",
        header: "Tên công việc",
        sortable: true,
        cell: (t) => (
          <div className="min-w-0 max-w-[280px]">
            <span
              className="text-xs font-semibold text-slate-900 truncate block hover:text-blue-600 transition"
              title={t.title}
            >
              {t.title}
            </span>
            {t.stageCode && (
              <span className="text-[10px] text-slate-400 font-mono truncate block">
                Thuộc WBS: {t.stageCode}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "project",
        header: "Dự án",
        width: "220px",
        sortable: true,
        cell: (t) => (
          <div className="min-w-0 max-w-[210px]">
            <Link
              href={`/du-an/${t.projectId}?tab=wbs`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-slate-800 hover:text-blue-700 hover:underline truncate block font-medium"
              title={t.projectName}
            >
              {t.projectName}
            </Link>
            <span className="text-[10px] text-slate-400 font-mono block">
              {t.projectCode}
            </span>
          </div>
        ),
      },
      {
        id: "type",
        header: "Phân loại",
        width: "125px",
        cell: (t) => (
          <div>
            {t.isField ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <MapPin className="w-2.5 h-2.5 text-amber-600" />
                <span>Hiện trường</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                <Building2 className="w-2.5 h-2.5 text-slate-400" />
                <span>Xưởng / Nội bộ</span>
              </span>
            )}
          </div>
        ),
      },
      {
        id: "assignees",
        header: "Người phụ trách",
        width: "175px",
        cell: (t) => (
          <div className="truncate">
            {t.assignees.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAssignModal(t);
                }}
                className="group flex items-center justify-between gap-1 w-full text-left hover:bg-slate-100 px-1.5 py-0.5 -mx-1.5 rounded transition"
                title="Bấm để thay đổi phân công nhân sự"
              >
                <span className="text-xs font-medium text-slate-800 truncate" title={t.assignees.map((a) => a.name).join(", ")}>
                  {t.assignees.map((a) => a.name).join(", ")}
                </span>
                <UserCheck className="w-3 h-3 text-slate-300 group-hover:text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAssignModal(t);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 px-2 py-0.5 rounded border border-amber-200 transition"
                title="Bấm để phân công người phụ trách"
              >
                <UserPlus className="w-3 h-3 text-amber-600" />
                <span>+ Phân công</span>
              </button>
            )}
          </div>
        ),
      },
      {
        id: "dueAt",
        header: "Hạn chót",
        width: "115px",
        sortable: true,
        cell: (t) => {
          if (!t.dueAt) {
            return <span className="text-slate-400 text-xs italic">Chưa đặt</span>;
          }
          const dueDate = new Date(t.dueAt);
          const isOverdue = dueDate.getTime() < Date.now() && t.status !== "done";
          return (
            <span
              className={cn(
                "text-xs font-mono block",
                isOverdue ? "text-rose-600 font-bold" : "text-slate-600"
              )}
            >
              {dueDate.toLocaleDateString("vi-VN")}
              {isOverdue && <span className="text-[9px] block text-rose-500 font-sans leading-none">Quá hạn</span>}
            </span>
          );
        },
      },
      {
        id: "progress",
        header: "Tiến độ",
        width: "120px",
        sortable: true,
        cell: (t) => (
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-slate-700">{t.progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  t.progressPercent === 100
                    ? "bg-emerald-500"
                    : t.progressPercent > 50
                    ? "bg-blue-600"
                    : "bg-amber-500"
                )}
                style={{ width: `${t.progressPercent}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        width: "135px",
        sortable: true,
        cell: (t) => renderStatusBadge(t.status),
      },
    ];
  }, []);

  // Row Actions (Ghim phải)
  const rowActions: DataTableRowAction<TaskItem>[] = React.useMemo(() => {
    return [
      {
        icon: <Eye className="w-3.5 h-3.5" />,
        title: "Xem chi tiết công việc",
        onClick: (item) => setSelectedTask(item),
      },
      {
        icon: <UserPlus className="w-3.5 h-3.5" />,
        title: "Phân công nhân sự",
        onClick: (item) => openAssignModal(item),
      },
      {
        icon: <Sliders className="w-3.5 h-3.5" />,
        title: "Đổi trạng thái nhanh",
        onClick: (item) => {
          setStatusModalTask(item);
          setTargetStatus(item.status);
          setTargetProgress(item.progressPercent);
        },
      },
      {
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        title: "Xem trong WBS dự án",
        onClick: (item) => router.push(`/du-an/${item.projectId}?tab=wbs`),
      },
    ];
  }, [router]);

  // ==========================================
  // DỮ LIỆU TỔNG QUAN THEO NHÂN SỰ (TAB 2)
  // ==========================================
  const employeeWorkloadList = React.useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();

    // 1. Mục Chưa phân công
    const unassignedTasks = tasks.filter((t) => t.assignees.length === 0);
    const unassignedItem = {
      id: "unassigned",
      code: "CHUA-GIAO",
      name: "⚠️ Công việc chưa phân công",
      phone: null,
      total: unassignedTasks.length,
      todo: unassignedTasks.filter((t) => t.status === "todo").length,
      doing: unassignedTasks.filter((t) => t.status === "doing").length,
      awaiting: unassignedTasks.filter((t) => t.status === "awaiting_acceptance").length,
      done: unassignedTasks.filter((t) => t.status === "done").length,
      tasks: unassignedTasks,
    };

    // 2. Từng nhân sự
    const empList = employees
      .filter((e) => {
        if (!q) return true;
        return e.name.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q);
      })
      .map((e) => {
        const empTasks = tasks.filter((t) => t.assignees.some((a) => a.employeeId === e.id));
        return {
          id: e.id,
          code: e.code,
          name: e.name,
          phone: e.phone,
          total: empTasks.length,
          todo: empTasks.filter((t) => t.status === "todo").length,
          doing: empTasks.filter((t) => t.status === "doing").length,
          awaiting: empTasks.filter((t) => t.status === "awaiting_acceptance").length,
          done: empTasks.filter((t) => t.status === "done").length,
          tasks: empTasks,
        };
      })
      .sort((a, b) => b.total - a.total);

    return [unassignedItem, ...empList];
  }, [tasks, employees, employeeSearch]);

  const toggleExpandEmployee = (empId: string) => {
    setExpandedEmployeeIds((prev) => ({
      ...prev,
      [empId]: !prev[empId],
    }));
  };

  return (
    <div className="w-full flex flex-col space-y-3 flex-1 pb-10">
      {/* 1. SUB-TABS NGANG CHUẨN ENTERPRISE BENCHMARK (GHIM CỐ ĐỊNH TOP) */}
      <div className="sticky top-14 z-30 bg-[#f8fafc]/95 backdrop-blur-xs pt-1 pb-1 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTab("table")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "table"
                ? "border-slate-900 text-slate-900 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Danh sách công việc</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === "table"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {tasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("by_employee")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "by_employee"
                ? "border-slate-900 text-slate-900 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Xem theo nhân sự</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === "by_employee"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {employees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("kanban")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "kanban"
                ? "border-slate-900 text-slate-900 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban tiến độ</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 hidden sm:inline text-[11px]">
            Đồng bộ thời gian thực: <strong>WBS</strong> ⇄ <strong>Hiện trường</strong> ⇄ <strong>Việc làm</strong>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. NỘI DUNG TAB 1: DANH SÁCH BẢNG CHUẨN (ENTERPRISE DATA TABLE) */}
      {/* ============================================================== */}
      {activeTab === "table" && (
        <DataTable<TaskItem>
          data={filteredTasks}
          columns={columns}
          keyExtractor={(t) => t.id}
          searchable
          searchPlaceholder="Tìm việc, dự án, nhân sự..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={facetFilters}
          onResetFilters={() => {
            setSearchQuery("");
            setEmployeeFilters([]);
            setStatusFilters([]);
            setTypeFilters([]);
            setProjectFilters([]);
          }}
          stats={stats}
          defaultShowStats={false}
          actions={rowActions}
          onRowClick={(item) => setSelectedTask(item)}
          isLoading={loading}
          emptyMessage="Không tìm thấy công việc nào phù hợp với bộ lọc"
          exportFileName="danh-sach-cong-viec-erp"
        />
      )}

      {/* ============================================================== */}
      {/* 3. NỘI DUNG TAB 2: XEM NHANH THEO NHÂN SỰ (WORKLOAD OVERVIEW)  */}
      {/* ============================================================== */}
      {activeTab === "by_employee" && (
        <div className="space-y-3">
          {/* Thanh tìm kiếm & thống kê nhân sự */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm nhân sự theo tên, mã..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  employeeWorkloadList.forEach((e) => (all[e.id] = true));
                  setExpandedEmployeeIds(all);
                }}
                className="h-8 text-xs text-slate-600"
              >
                Mở rộng tất cả
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedEmployeeIds({ unassigned: true })}
                className="h-8 text-xs text-slate-600"
              >
                Thu gọn
              </Button>
            </div>
          </div>

          {/* Bảng phân bổ tải công việc mật độ cao */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs divide-y divide-slate-100">
            {employeeWorkloadList.map((emp) => {
              const isExpanded = expandedEmployeeIds[emp.id] ?? false;
              const isUnassigned = emp.id === "unassigned";

              return (
                <div key={emp.id} className={cn("transition", isUnassigned && "bg-amber-50/30")}>
                  {/* Dòng tổng quan của 1 nhân sự */}
                  <div
                    onClick={() => toggleExpandEmployee(emp.id)}
                    className="flex flex-wrap items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition select-none"
                  >
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                        {isUnassigned ? "⚠️" : emp.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <strong className={cn("text-xs font-semibold", isUnassigned ? "text-amber-900" : "text-slate-900")}>
                            {emp.name}
                          </strong>
                          {emp.code && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ({emp.code})
                            </span>
                          )}
                        </div>
                        {emp.phone && (
                          <span className="text-[10px] text-slate-500 block">SĐT: {emp.phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Số liệu thống kê của nhân sự */}
                    <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
                      <div className="text-center px-2">
                        <span className="text-[10px] text-slate-400 block font-sans">Tổng việc</span>
                        <strong className="text-slate-900">{emp.total}</strong>
                      </div>

                      <div className="text-center px-2">
                        <span className="text-[10px] text-amber-600 block font-sans">Đang làm</span>
                        <strong className="text-amber-700 font-bold">{emp.doing}</strong>
                      </div>

                      <div className="text-center px-2">
                        <span className="text-[10px] text-sky-600 block font-sans">Chờ nghiệm thu</span>
                        <strong className="text-sky-700 font-bold">{emp.awaiting}</strong>
                      </div>

                      <div className="text-center px-2">
                        <span className="text-[10px] text-slate-400 block font-sans">Chờ làm</span>
                        <strong className="text-slate-600">{emp.todo}</strong>
                      </div>

                      <div className="text-center px-2">
                        <span className="text-[10px] text-emerald-600 block font-sans">Đã xong</span>
                        <strong className="text-emerald-700">{emp.done}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmployeeFilters([emp.id]);
                          switchTab("table");
                        }}
                        className="text-[11px] font-sans text-blue-600 hover:underline px-2.5 py-1 rounded bg-blue-50/70 border border-blue-100 hover:bg-blue-100/70 transition"
                      >
                        Lọc trên bảng ➔
                      </button>
                    </div>
                  </div>

                  {/* Danh sách công việc mở rộng của nhân sự */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 px-10 py-3">
                      {emp.tasks.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Nhân sự này hiện chưa có công việc nào được phân công.
                        </p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden divide-y divide-slate-100">
                          {emp.tasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer transition gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono text-[11px] font-bold text-blue-700 shrink-0">
                                  {t.code}
                                </span>
                                <span className="font-medium text-slate-900 truncate" title={t.title}>
                                  {t.title}
                                </span>
                                {t.isField ? (
                                  <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded shrink-0">
                                    📍 Hiện trường
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded shrink-0">
                                    🏭 Xưởng
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-500 truncate shrink-0">
                                  [{t.projectName}]
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {t.dueAt && (
                                  <span className="text-[11px] font-mono text-slate-500">
                                    Hạn: {new Date(t.dueAt).toLocaleDateString("vi-VN")}
                                  </span>
                                )}

                                <span className="font-mono text-xs font-bold w-9 text-right text-slate-700">
                                  {t.progressPercent}%
                                </span>

                                {renderStatusBadge(t.status)}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(t);
                                  }}
                                  className="text-[11px] text-amber-700 font-semibold hover:underline px-2 py-0.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
                                >
                                  <UserPlus className="w-3 h-3 text-amber-600" />
                                  <span>{t.assignees.length === 0 ? "Giao việc" : "Phân công"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusModalTask(t);
                                    setTargetStatus(t.status);
                                    setTargetProgress(t.progressPercent);
                                  }}
                                  className="text-[11px] text-blue-600 hover:underline px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100"
                                >
                                  Đổi trạng thái
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. NỘI DUNG TAB 3: KANBAN TIẾN ĐỘ ĐẦU VIỆC (KANBAN BOARD)        */}
      {/* ============================================================== */}
      {activeTab === "kanban" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {TASK_KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              const ColIcon = col.icon;

              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex flex-col rounded-xl border p-2.5 space-y-2.5 min-h-[500px]",
                    col.bgColor,
                    col.borderColor
                  )}
                >
                  {/* Tiêu đề cột */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <ColIcon className={cn("w-4 h-4", col.color)} />
                      <strong className={cn("text-xs font-bold", col.color)}>
                        {col.title}
                      </strong>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-mono font-bold",
                        col.badgeBg
                      )}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Danh sách thẻ công việc */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-250px)] pr-0.5">
                    {colTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-lg bg-white/40">
                        Chưa có đầu việc
                      </div>
                    ) : (
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              {t.code}
                            </span>
                            {t.isField ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                📍 Hiện trường
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                🏭 Xưởng
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                            {t.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 truncate">
                            DA: {t.projectName}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="truncate max-w-[120px]">
                              {t.assignees[0]?.name || "Chưa giao"}
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {t.progressPercent}%
                            </span>
                          </div>

                          {/* Nút thao tác nhanh chuyển cột kế tiếp */}
                          <div className="flex items-center justify-end gap-1 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusModalTask(t);
                                setTargetStatus(t.status);
                                setTargetProgress(t.progressPercent);
                              }}
                              className="text-[10px] text-blue-600 hover:underline px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition"
                            >
                              Đổi trạng thái
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SLIDE-OVER DRAWER XEM CHI TIẾT CÔNG VIỆC (PROGRESSIVE DISCLOSURE) */}
      {/* ============================================================== */}
      <Drawer
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask ? `Chi Tiết: ${selectedTask.title}` : "Chi Tiết Công Việc"}
        width="lg"
      >
        {selectedTask && (
          <div className="space-y-4 text-xs">
            {/* Header thông tin cốt lõi */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-blue-700">
                  {selectedTask.code}
                </span>
                <div className="flex items-center gap-1.5">
                  {selectedTask.isField ? (
                    <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
                      📍 Việc Hiện trường
                    </Badge>
                  ) : (
                    <Badge variant="neutral">🏭 Việc Xưởng / Nội bộ</Badge>
                  )}
                  {renderStatusBadge(selectedTask.status)}
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{selectedTask.title}</h3>

              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">Dự án:</span>
                  <Link
                    href={`/du-an/${selectedTask.projectId}?tab=wbs`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>{selectedTask.projectName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Mã dự án:</span>
                  <span className="font-mono">{selectedTask.projectCode}</span>
                </div>
              </div>
            </div>

            {/* Chuyển đổi trạng thái 1-click */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800 text-xs">
                Chuyển đổi trạng thái công việc (Đồng bộ tức thì):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["todo", "doing", "awaiting_acceptance", "done"] as TaskStatus[]).map((st) => {
                  const isCurrent = selectedTask.status === st;
                  const labels: Record<TaskStatus, string> = {
                    todo: "Chờ làm (0%)",
                    doing: "Đang làm (50%)",
                    awaiting_acceptance: "Chờ nghiệm thu (100%)",
                    done: "Đã xong (100%)",
                    cancelled: "Đã hủy (0%)",
                  };
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdatingStatus || isCurrent}
                      onClick={() => updateTaskStatus(selectedTask.id, st)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition text-xs font-semibold",
                        isCurrent
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs cursor-default"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <span>{labels[st]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cập nhật tiến độ % */}
            <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs">Tiến độ thực hiện:</label>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {selectedTask.progressPercent}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => {
                      const newSt: TaskStatus =
                        pct === 100
                          ? "awaiting_acceptance"
                          : pct > 0
                          ? "doing"
                          : "todo";
                      updateTaskStatus(selectedTask.id, newSt, pct);
                    }}
                    className={cn(
                      "flex-1 py-1 rounded text-xs font-bold transition",
                      selectedTask.progressPercent === pct
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Thông tin nhân sự & thời gian */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Nhân sự phụ trách:</span>
                  <button
                    type="button"
                    onClick={() => openAssignModal(selectedTask)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{selectedTask.assignees.length > 0 ? "Thay đổi" : "Phân công"}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  {selectedTask.assignees.length > 0 ? (
                    <div className="space-y-1">
                      {selectedTask.assignees.map((a) => (
                        <div key={a.id} className="flex items-center justify-between">
                          <strong className="text-slate-900">{a.name}</strong>
                          {a.phone && <span className="text-slate-400 font-mono text-[10px]">{a.phone}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-0.5 text-amber-700 italic text-[11px]">
                      <span>Chưa phân công nhân sự</span>
                      <button
                        type="button"
                        onClick={() => openAssignModal(selectedTask)}
                        className="not-italic text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Giao việc ngay</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Thời gian thi công:</span>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div>
                    <span className="text-slate-400 text-[10px]">Bắt đầu:</span>{" "}
                    <span className="font-mono text-slate-800">
                      {selectedTask.startAt
                        ? new Date(selectedTask.startAt).toLocaleDateString("vi-VN")
                        : "Chưa ghi nhận"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Hạn chót:</span>{" "}
                    <span className="font-mono font-bold text-slate-800">
                      {selectedTask.dueAt
                        ? new Date(selectedTask.dueAt).toLocaleDateString("vi-VN")
                        : "Chưa đặt hạn"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Liên kết hành động */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/du-an/${selectedTask.projectId}?tab=wbs`}
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium text-xs"
              >
                <span>Xem trên sơ đồ WBS dự án</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              {selectedTask.isField && (
                <Link
                  href="/hien-truong"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Mở Hiện Trường Mobile</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================== */}
      {/* 6. MODAL ĐỔI TRẠNG THÁI NHANH (QUICK STATUS MODAL)               */}
      {/* ============================================================== */}
      <Modal
        isOpen={Boolean(statusModalTask)}
        onClose={() => setStatusModalTask(null)}
        title="Cập Nhật Trạng Thái & Tiến Độ Công Việc"
      >
        {statusModalTask && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateTaskStatus(statusModalTask.id, targetStatus, targetProgress);
            }}
            className="space-y-4 text-xs"
          >
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">Đầu việc:</span>
              <strong className="text-slate-900 text-xs block">{statusModalTask.title}</strong>
              <div className="flex items-center gap-2 pt-0.5 font-mono text-[11px] text-slate-500">
                <span>Mã: {statusModalTask.code}</span>
                <span>•</span>
                <span>Dự án: {statusModalTask.projectName}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Chọn trạng thái mới:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "todo", label: "Chờ thực hiện (todo)", pct: 0, desc: "Chưa tiến hành" },
                  { id: "doing", label: "Đang làm (doing)", pct: 50, desc: "Đang thi công / sản xuất" },
                  { id: "awaiting_acceptance", label: "Chờ nghiệm thu", pct: 100, desc: "Đã xong, chờ ký biên bản" },
                  { id: "done", label: "Đã hoàn thành (done)", pct: 100, desc: "Đạt chuẩn 100%" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTargetStatus(item.id as TaskStatus);
                      setTargetProgress(item.pct);
                    }}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition space-y-0.5",
                      targetStatus === item.id
                        ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-500"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <strong className="text-xs text-slate-900 block">{item.label}</strong>
                    <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-800">Tiến độ hoàn thành (%):</label>
                <span className="font-mono font-bold text-blue-600 text-sm">{targetProgress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={targetProgress}
                onChange={(e) => setTargetProgress(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStatusModalTask(null)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingStatus}
                className="bg-blue-600 text-white text-xs font-semibold"
              >
                {isUpdatingStatus ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* 7. MODAL PHÂN CÔNG NHÂN SỰ CHUYÊN BIỆT (ASSIGN MODAL)          */}
      {/* ============================================================== */}
      <Modal
        isOpen={Boolean(assignModalTask)}
        onClose={() => setAssignModalTask(null)}
        title={
          assignModalTask
            ? `Phân Công Nhân Sự: [${assignModalTask.code}]`
            : "Phân Công Nhân Sự"
        }
      >
        {assignModalTask && (
          <div className="space-y-4 text-xs">
            {/* Header thông tin công việc */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Công việc & Dự án:</span>
                <span className="font-semibold text-slate-900 block truncate max-w-[280px]">
                  {assignModalTask.title}
                </span>
                <span className="text-[11px] text-blue-600 truncate block">
                  {assignModalTask.projectName}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Phân loại:</span>
                {assignModalTask.isField ? (
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    📍 Hiện trường
                  </span>
                ) : (
                  <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    🏭 Xưởng / Nội bộ
                  </span>
                )}
              </div>
            </div>

            {/* Ô tìm kiếm nhân sự */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, mã nhân sự, số điện thoại..."
                value={assigneeSearchQuery}
                onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>

            {/* Danh sách nhân sự kèm số việc đang làm */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {employees
                .filter((emp) => {
                  if (!assigneeSearchQuery.trim()) return true;
                  const q = assigneeSearchQuery.toLowerCase();
                  return (
                    emp.name.toLowerCase().includes(q) ||
                    emp.code?.toLowerCase().includes(q) ||
                    (emp.phone && emp.phone.includes(q))
                  );
                })
                .map((emp) => {
                  const isChecked = selectedAssigneeIds.includes(emp.id);
                  const activeCount = tasks.filter(
                    (t) =>
                      t.status === "doing" &&
                      t.assignees.some((a) => a.employeeId === emp.id)
                  ).length;

                  return (
                    <label
                      key={emp.id}
                      className={cn(
                        "flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 transition select-none",
                        isChecked && "bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isChecked}
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedAssigneeIds((prev) => [...prev, emp.id]);
                            } else {
                              setSelectedAssigneeIds((prev) =>
                                prev.filter((id) => id !== emp.id)
                              );
                            }
                          }}
                        />
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {emp.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {emp.code} {emp.phone ? `• ${emp.phone}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            activeCount > 0
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {activeCount > 0 ? `${activeCount} việc đang làm` : "Đang rảnh"}
                        </span>
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Footer hành động */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Đã chọn: <strong className="text-slate-900">{selectedAssigneeIds.length}</strong> người
                </span>
                {selectedAssigneeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAssigneeIds([])}
                    className="text-rose-600 hover:underline text-[11px] font-medium"
                  >
                    Bỏ chọn hết
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setAssignModalTask(null)}
                  disabled={isSavingAssignees}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleSaveAssignees}
                  disabled={isSavingAssignees}
                  className="text-xs"
                >
                  {isSavingAssignees ? "Đang lưu..." : "Xác nhận phân công"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
