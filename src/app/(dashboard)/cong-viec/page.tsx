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
  AlertTriangle,
  Sparkles,
  FileText,
  Star,
  TrendingUp,
  Package,
  Plus,
} from "lucide-react";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";
import { TaskStatus, TaskItemDto } from "@/services/project.service";
import { AiWorkReportModal } from "@/components/work-reports/AiWorkReportModal";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";

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

type TaskAssignee = TaskItemDto["assignees"][number];
type TaskItem = TaskItemDto;

interface WorkReportItem {
  id: string;
  workDate: string | null;
  answers: {
    work_summary?: string;
    tasks_completed?: string[];
    completion_percentage?: number;
    working_hours?: number;
    materials_checklist?: Array<{ name: string; quantity: number; unit: string }>;
    materials_requested?: Array<{ name: string; quantity: number; unit: string; reason: string }>;
    obstacles?: string;
    next_day_plan?: string;
    ai_performance_evaluation?: {
      score: number;
      rating: "excellent" | "good" | "average" | "needs_improvement";
      completionSpeed: string;
      qualityScore: number;
      comments: string;
      recommendations: string[];
    };
    reported_at?: string;
  };
  status: string;
  submittedAt: string | null;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  authorEmployeeId: string | null;
  authorName: string;
  authorCode: string;
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

export default function CongViecPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can, user } = useAuthorization();

  // Tab chuyển đổi: "table" (Bảng Data Table) | "by_employee" (Xem theo nhân sự) | "kanban" (Kanban tiến độ) | "reports" (Báo cáo & Đánh giá AI)
  const [activeTab, setActiveTab] = React.useState<"table" | "by_employee" | "kanban" | "reports">(() => {
    const tabParam = searchParams.get("view") || searchParams.get("tab");
    if (tabParam === "by_employee" || tabParam === "employee") return "by_employee";
    if (tabParam === "kanban") return "kanban";
    if (tabParam === "reports" || tabParam === "ai_reports") return "reports";
    return "table";
  });

  const switchTab = (tab: "table" | "by_employee" | "kanban" | "reports") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("view", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Dữ liệu
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [reports, setReports] = React.useState<WorkReportItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reportsLoading, setReportsLoading] = React.useState(false);

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

  // Modal AI Work Report
  const [aiReportTask, setAiReportTask] = React.useState<TaskItem | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);

  // Tab "Xem theo nhân sự": Danh sách nhân sự được mở rộng (expanded rows)
  const [expandedEmployeeIds, setExpandedEmployeeIds] = React.useState<Record<string, boolean>>({
    unassigned: true,
  });
  const [employeeSearch, setEmployeeSearch] = React.useState("");

  // Tab "Báo cáo & Đánh giá AI": Lọc báo cáo
  const [reportSearch, setReportSearch] = React.useState("");

  // Tải dữ liệu Tasks & Employees
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

  // Tải dữ liệu Báo cáo công việc (Work Reports)
  const fetchReports = React.useCallback(async () => {
    try {
      setReportsLoading(true);
      const res = await fetch("/api/field/work-reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Lỗi tải báo cáo công việc", err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    fetchReports();
  }, [fetchData, fetchReports]);

  // Mở modal AI Report cho 1 nhiệm vụ
  const openAiReportModal = (task?: TaskItem | null) => {
    const target = task || tasks[0] || null;
    if (!target) {
      toast.error("Chưa có đầu việc nào trong hệ thống để tạo báo cáo");
      return;
    }
    setAiReportTask(target);
    setIsAiModalOpen(true);
  };

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
      title: "Điều phối Công việc",
      subtitle: "Phân công nhiệm vụ & Báo cáo tiến độ AI",
      screenCode: "M10",
      quickViews: [
        { label: "Tất cả công việc", href: "/cong-viec?view=table" },
        { label: "Xem theo nhân sự", href: "/cong-viec?view=by_employee" },
        { label: "Kanban tiến độ", href: "/cong-viec?view=kanban" },
        { label: "Báo cáo & Đánh giá AI", href: "/cong-viec?view=reports" },
      ],
      primaryAction: (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => openAiReportModal(null)}
            size="sm"
            className="gap-1.5 text-xs h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Báo Cáo Tiến Độ (AI)</span>
          </Button>

          <Link href="/hien-truong">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hidden sm:flex"
            >
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
              <span>Hiện Trường Mobile</span>
            </Button>
          </Link>

          <Button
            onClick={() => {
              fetchData();
              fetchReports();
            }}
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
    [loading, tasks.length, reports.length]
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

  // Cấu hình Facet Filters
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

  // Row Actions
  const rowActions: DataTableRowAction<TaskItem>[] = React.useMemo(() => {
    return [
      {
        icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
        title: "Báo cáo tiến độ (AI)",
        onClick: (item) => openAiReportModal(item),
      },
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

  // ==========================================
  // DỮ LIỆU TAB BÁO CÁO & ĐÁNH GIÁ AI (TAB 4)
  // ==========================================
  const filteredReports = React.useMemo(() => {
    return reports.filter((r) => {
      if (!reportSearch.trim()) return true;
      const q = reportSearch.toLowerCase();
      const matchAuthor = r.authorName.toLowerCase().includes(q);
      const matchTask = r.taskTitle.toLowerCase().includes(q) || r.taskCode.toLowerCase().includes(q);
      const matchProj = r.projectName.toLowerCase().includes(q) || r.projectCode.toLowerCase().includes(q);
      const matchSummary = (r.answers?.work_summary || "").toLowerCase().includes(q);
      return matchAuthor || matchTask || matchProj || matchSummary;
    });
  }, [reports, reportSearch]);

  const reportStats: StatItem[] = React.useMemo(() => {
    const totalReports = reports.length;
    const scores = reports
      .map((r) => r.answers?.ai_performance_evaluation?.score)
      .filter((s): s is number => typeof s === "number");
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "N/A";
    const excellentCount = reports.filter(
      (r) => r.answers?.ai_performance_evaluation?.rating === "excellent"
    ).length;

    return [
      { label: "Tổng báo cáo đã gửi", value: totalReports, color: "neutral" },
      { label: "Điểm AI trung bình", value: `${avgScore} / 10`, color: "blue" },
      { label: "Đánh giá Xuất sắc", value: excellentCount, color: "emerald" },
      { label: "Nhiệm vụ liên quan", value: tasks.length, color: "violet" },
    ];
  }, [reports, tasks]);

  return (
    <div className="w-full flex flex-col space-y-3 flex-1 pb-10">
      {/* 1. SUB-TABS NGANG CHUẨN ENTERPRISE BENCHMARK (GHIM CỐ ĐỊNH TOP) */}
      <div className="sticky top-14 z-30 bg-[#f8fafc]/95 backdrop-blur-xs pt-1 pb-1 flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
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

          <button
            type="button"
            onClick={() => switchTab("reports")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "reports"
                ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Báo cáo & Đánh giá AI</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              {reports.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Button
            onClick={() => openAiReportModal(null)}
            size="sm"
            className="gap-1.5 text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo Báo Cáo AI</span>
          </Button>
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
                                    openAiReportModal(t);
                                  }}
                                  className="text-[11px] text-indigo-700 font-semibold hover:underline px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-indigo-600" />
                                  <span>Báo cáo AI</span>
                                </button>

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

                          {/* Nút thao tác nhanh */}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAiReportModal(t);
                              }}
                              className="text-[10px] text-indigo-600 hover:underline px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 transition flex items-center gap-1 font-semibold"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Báo cáo AI</span>
                            </button>

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
      {/* 5. NỘI DUNG TAB 4: BÁO CÁO CÔNG VIỆC & ĐÁNH GIÁ PERFORMANCE AI */}
      {/* ============================================================== */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {/* Thống kê báo cáo AI */}
          <StatBar items={reportStats} />

          {/* Thanh tìm kiếm & lọc báo cáo */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm theo người báo cáo, đầu việc, dự án..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => openAiReportModal(null)}
                size="sm"
                className="gap-1.5 text-xs h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo Báo Cáo & Đánh Giá AI Mới</span>
              </Button>

              <button
                type="button"
                onClick={fetchReports}
                className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 transition shadow-2xs"
                title="Làm mới báo cáo"
              >
                <RotateCw className={cn("w-3.5 h-3.5", reportsLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Danh sách thẻ Báo cáo & Đánh giá AI */}
          {reportsLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <RotateCw className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Đang tải danh sách báo cáo tiến độ...</span>
              </div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-slate-200 bg-white space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <div className="text-xs text-slate-500">
                Chưa có báo cáo tiến độ nào được gửi hoặc không khớp với tìm kiếm.
              </div>
              <Button
                onClick={() => openAiReportModal(null)}
                size="sm"
                className="text-xs bg-indigo-600 text-white"
              >
                Tạo Báo Cáo Đầu Tiên Bằng AI
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredReports.map((report) => {
                const evalData = report.answers?.ai_performance_evaluation;
                const score = evalData?.score ?? 8.5;
                const isExcellent = score >= 9;
                const isGood = score >= 7.5 && score < 9;

                return (
                  <div
                    key={report.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition space-y-3"
                  >
                    {/* Header Report Card */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs font-bold text-slate-900">
                            {report.authorName}
                          </strong>
                          {report.authorCode && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ({report.authorCode})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Ngày làm: {report.workDate || "Hôm nay"} • Gửi lúc:{" "}
                          {report.submittedAt ? new Date(report.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong"}
                        </span>
                      </div>

                      {/* AI Performance Score Badge */}
                      <div
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-center shrink-0",
                          isExcellent
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : isGood
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        )}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <Star className="w-3 h-3 fill-current text-amber-500" />
                          <span>{score} / 10</span>
                        </div>
                        <span className="text-[9px] block uppercase tracking-wider font-semibold">
                          {evalData?.rating === "excellent"
                            ? "Xuất sắc"
                            : evalData?.rating === "good"
                            ? "Tốt"
                            : "Đạt yêu cầu"}
                        </span>
                      </div>
                    </div>

                    {/* Nhiệm vụ & Dự án */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-700">
                          {report.taskCode}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          Tiến độ: {report.answers?.completion_percentage ?? 100}%
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 line-clamp-1">
                        {report.taskTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        DA: {report.projectName} ({report.projectCode})
                      </p>
                    </div>

                    {/* Nội dung tóm tắt công việc */}
                    <div className="text-xs text-slate-700 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Khối lượng hoàn thành:
                      </span>
                      <p className="line-clamp-3 text-[11px] bg-indigo-50/30 p-2 rounded border border-indigo-100/50 text-slate-800 leading-relaxed">
                        {report.answers?.work_summary || "Không có tóm tắt"}
                      </p>
                    </div>

                    {/* Đánh giá & Nhận xét của AI */}
                    {evalData?.comments && (
                      <div className="text-xs bg-amber-50/50 p-2 rounded-lg border border-amber-200/60 space-y-1">
                        <div className="flex items-center gap-1 text-amber-800 font-semibold text-[10px]">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Đánh giá AI:</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed italic">
                          "{evalData.comments}"
                        </p>
                        {evalData.recommendations && evalData.recommendations.length > 0 && (
                          <div className="pt-1 text-[10px] text-slate-600 space-y-0.5">
                            <span className="font-semibold text-amber-900">Gợi ý cải tiến:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                              {evalData.recommendations.slice(0, 2).map((rec, idx) => (
                                <li key={idx} className="truncate">
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SLIDE-OVER DRAWER XEM CHI TIẾT CÔNG VIỆC                     */}
      {/* ============================================================== */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdate={() => {
          fetchData();
          fetchReports();
        }}
        onOpenAiReport={(t) => openAiReportModal(t)}
        onOpenAssignModal={(t) => openAssignModal(t)}
      />

      {/* ============================================================== */}
      {/* 7. MODAL ĐỔI TRẠNG THÁI NHANH                                   */}
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
      {/* 8. MODAL PHÂN CÔNG NHÂN SỰ CHUYÊN BIỆT (ASSIGN MODAL)          */}
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

      {/* ============================================================== */}
      {/* 9. MODAL AI WORK REPORT & PERFORMANCE EVALUATION                 */}
      {/* ============================================================== */}
      {aiReportTask && (
        <AiWorkReportModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          taskId={aiReportTask.id}
          taskTitle={aiReportTask.title}
          projectId={aiReportTask.projectId}
          projectName={aiReportTask.projectName}
          currentProgress={aiReportTask.progressPercent}
          onSuccess={() => {
            fetchData();
            fetchReports();
          }}
        />
      )}
    </div>
  );
}
