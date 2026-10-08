"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Button,
  Badge,
  Modal,
  Input,
  Pagination,
  FacetFilter,
  FacetOption,
  StatBar,
  toast,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
  DataTableFacetFilterConfig,
  StatItem,
} from "@/components/shared";
import {
  Plus,
  Search,
  Layers,
  ChevronRight,
  Clock,
  Calendar,
  UserCheck,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Wrench,
  RotateCw,
  X,
  GripVertical,
  Eye,
  Building2,
  LayoutGrid,
  BarChart2,
  Truck,
  HardHat,
  FileCheck,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Users,
  DollarSign,
  FolderKanban,
  Table2,
  Sparkles,
  ArrowRight,
  Filter,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import type { ProjectDto, ProjectStatus, TaskStatus, TaskItemDto, ProjectTemplateStage } from "@/services/project.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

// ==========================================
// 1. CẤU HÌNH KANBAN DỰ ÁN (6 GIAI ĐOẠN THI CÔNG BIỂN HIỆU)
// ==========================================
const PROJECT_KANBAN_COLUMNS: {
  id: ProjectStatus;
  title: string;
  stageName: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  progressRange: string;
}[] = [
  {
    id: "survey",
    title: "Khảo sát hiện trường",
    stageName: "1. Khảo sát & đo đạc",
    icon: MapPin,
    color: "text-amber-700",
    bgColor: "bg-amber-50/40",
    borderColor: "border-amber-200",
    badgeBg: "bg-amber-100 text-amber-800",
    progressRange: "10 - 25%",
  },
  {
    id: "production",
    title: "Gia công tại xưởng",
    stageName: "2. Hàn khung, CNC & LED",
    icon: Wrench,
    color: "text-blue-700",
    bgColor: "bg-blue-50/40",
    borderColor: "border-blue-200",
    badgeBg: "bg-blue-100 text-blue-800",
    progressRange: "25 - 50%",
  },
  {
    id: "transport",
    title: "Vận chuyển",
    stageName: "3. Đội xe & cấp vật tư",
    icon: Truck,
    color: "text-sky-700",
    bgColor: "bg-sky-50/40",
    borderColor: "border-sky-200",
    badgeBg: "bg-sky-100 text-sky-800",
    progressRange: "50 - 65%",
  },
  {
    id: "installation",
    title: "Lắp dựng công trình",
    stageName: "4. Lắp đặt & đấu nối điện",
    icon: HardHat,
    color: "text-indigo-700",
    bgColor: "bg-indigo-50/40",
    borderColor: "border-indigo-200",
    badgeBg: "bg-indigo-100 text-indigo-800",
    progressRange: "65 - 85%",
  },
  {
    id: "acceptance",
    title: "Chờ nghiệm thu",
    stageName: "5. Biên bản & chữ ký",
    icon: FileCheck,
    color: "text-orange-700",
    bgColor: "bg-orange-50/40",
    borderColor: "border-orange-200",
    badgeBg: "bg-orange-100 text-orange-800",
    progressRange: "85 - 99%",
  },
  {
    id: "warranty",
    title: "Bảo hành & Sự cố",
    stageName: "6. Bảo hành & xử lý sự cố",
    icon: ShieldAlert,
    color: "text-rose-700",
    bgColor: "bg-rose-50/40",
    borderColor: "border-rose-200",
    badgeBg: "bg-rose-100 text-rose-800",
    progressRange: "100%",
  },
  {
    id: "completed",
    title: "Hoàn tất",
    stageName: "7. Quyết toán lưu hồ sơ",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50/40",
    borderColor: "border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800",
    progressRange: "100%",
  },
];

// ==========================================
// 2. CÁC CỘT TIẾN ĐỘ ĐẦU VIỆC (TASK KANBAN 4 CỘT)
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

const PROJECT_STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  planning: { label: "Kế hoạch", variant: "neutral" },
  survey: { label: "Khảo sát", variant: "warning" },
  production: { label: "Gia công xưởng", variant: "info" },
  transport: { label: "Vận chuyển", variant: "info" },
  installation: { label: "Lắp dựng", variant: "warning" },
  acceptance: { label: "Chờ nghiệm thu", variant: "warning" },
  warranty: { label: "Bảo hành & Sự cố", variant: "warning" },
  completed: { label: "Hoàn tất", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "danger" },
};

type ViewMode = "projects" | "project_kanban" | "tasks";

function ProjectsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can, user, roles } = useAuthorization();

  // Tab chuyển đổi: "projects" (Bảng Dự Án) | "project_kanban" (Kanban Dự Án) | "tasks" (Kanban Đầu Việc)
  const [activeTab, setActiveTab] = React.useState<ViewMode>(() => {
    const tabParam = searchParams.get("view") || searchParams.get("tab");
    if (tabParam === "project_kanban" || tabParam === "pipeline") return "project_kanban";
    if (tabParam === "tasks" || tabParam === "kanban") return "tasks";
    return "projects";
  });

  const switchTab = (tab: ViewMode) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("view", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Dữ liệu
  const [projects, setProjects] = React.useState<ProjectDto[]>([]);
  const [tasks, setTasks] = React.useState<TaskItemDto[]>([]);
  const [employees, setEmployees] = React.useState<
    { id: string; code: string; name: string; phone: string | null; membershipId?: string | null }[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [tasksLoading, setTasksLoading] = React.useState(false);

  // Lọc cho Tab Bảng & Kanban Dự Án
  const [projectSearch, setProjectSearch] = React.useState("");
  const [projectStatusFilter, setProjectStatusFilter] = React.useState<string[]>([]);
  const [projectManagerFilter, setProjectManagerFilter] = React.useState<string[]>([]);
  const [projectCustomerFilter, setProjectCustomerFilter] = React.useState<string[]>([]);
  const [onlyMyProjects, setOnlyMyProjects] = React.useState(false);

  // Lọc cho Tab Kanban Đầu Việc
  const [taskSearch, setTaskSearch] = React.useState("");
  const [selectedProjectFilters, setSelectedProjectFilters] = React.useState<string[]>([]);
  const [selectedEmployeeFilters, setSelectedEmployeeFilters] = React.useState<string[]>([]);
  const [showKanbanStats, setShowKanbanStats] = React.useState(false);

  // Phân trang Kanban đầu việc
  const [kanbanPage, setKanbanPage] = React.useState(1);
  const [kanbanPageSize, setKanbanPageSize] = React.useState(20);

  // Drag and Drop State cho Tasks
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = React.useState<TaskStatus | null>(null);

  // Drag and Drop State cho Project Kanban Pipeline
  const [draggedProjectId, setDraggedProjectId] = React.useState<string | null>(null);
  const [dragOverProjectColId, setDragOverProjectColId] = React.useState<ProjectStatus | null>(null);

  // Modal tạo dự án
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [workflowOption, setWorkflowOption] = React.useState<"template" | "custom">("template");
  const [createStages, setCreateStages] = React.useState<ProjectTemplateStage[]>([]);
  const [formData, setFormData] = React.useState({
    name: "",
    customerId: "",
    address: "",
    managerMembershipId: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    templateVersionId: "",
  });

  const DEFAULT_CREATE_STAGES: ProjectTemplateStage[] = [
    {
      name: "Giai đoạn 1: Khảo sát hiện trường & Đo đạc",
      tasks: [
        { title: "Đo đạc kích thước thực tế & kiểm tra mặt bằng", weight: 5, mode: "manual" },
        { title: "Kiểm tra kết cấu chịu lực & nguồn điện", weight: 5, mode: "manual" },
      ],
    },
    {
      name: "Giai đoạn 2: Gia công sản xuất tại xưởng",
      tasks: [
        { title: "Hàn kết cấu khung sắt hộp mạ kẽm", weight: 15, mode: "manual" },
        { title: "Cắt CNC tấm Alu & uốn chân chữ nổi", weight: 15, mode: "manual" },
        { title: "Đấu nối module LED 12V & chạy test sáng", weight: 10, mode: "manual" },
      ],
    },
    {
      name: "Giai đoạn 3: Vận chuyển & Điều xe",
      tasks: [
        { title: "Bốc xếp biển hiệu & vật tư lên xe", weight: 5, mode: "manual" },
        { title: "Vận chuyển đến công trình", weight: 5, mode: "manual" },
      ],
    },
    {
      name: "Giai đoạn 4: Thi công lắp dựng hiện trường",
      tasks: [
        { title: "Dựng giàn giáo, neo dầm bu-lông an toàn", weight: 15, mode: "manual" },
        { title: "Ốp tấm Alu, gắn chữ nổi & đấu nối tủ điện", weight: 15, mode: "manual" },
      ],
    },
    {
      name: "Giai đoạn 5: Nghiệm thu & Bàn giao",
      tasks: [
        { title: "Test sáng toàn bộ hệ thống ngày & đêm", weight: 5, mode: "manual" },
        { title: "Ký biên bản nghiệm thu hoàn thành công trình", weight: 5, mode: "manual" },
      ],
    },
  ];

  // Modal giao việc
  const [assigningTask, setAssigningTask] = React.useState<TaskItemDto | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("");
  const [savingAssignee, setSavingAssignee] = React.useState(false);

  // Header hệ thống
  useSetPageHeader(
    {
      title: "Dự án",
      subtitle: "Quản lý tiến độ công trình, đường găng & đầu việc WBS",
      screenCode: "M11",
      quickViews: [
        { label: "Bảng dự án", href: "/du-an?view=projects" },
        { label: "Kanban tiến độ dự án", href: "/du-an?view=project_kanban" },
        { label: "Kanban đầu việc (WBS)", href: "/du-an?view=tasks" },
        { label: "Mẫu quy trình (M13)", href: "/du-an/templates" },
      ],
    },
    []
  );

  // Load Projects & Employees
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, eRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/projects/employees"),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData.projects || []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEmployees(eData.employees || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu dự án");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Tasks cho Kanban
  const fetchTasks = React.useCallback(async () => {
    try {
      setTasksLoading(true);
      const res = await fetch("/api/projects/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err: any) {
      console.error("Lỗi tải đầu việc", err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    fetchTasks();
  }, [fetchData, fetchTasks]);

  // Load Customers và Templates cho form tạo
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
        const tList = tData.templates || [];
        setTemplates(tList);
        if (tList.length > 0) {
          const firstTpl = tList[0];
          setFormData((prev) => ({ ...prev, templateVersionId: firstTpl.versionId }));
          if (firstTpl.definition?.stages && firstTpl.definition.stages.length > 0) {
            setCreateStages(
              firstTpl.definition.stages.map((s: any) => ({
                name: s.name,
                tasks: (s.tasks || []).map((t: any) => ({ ...t })),
              }))
            );
          }
        } else {
          setCreateStages(DEFAULT_CREATE_STAGES);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = () => {
    if (!can("project.create")) {
      toast.error("Bạn không có quyền khởi tạo dự án");
      return;
    }
    loadFormData();
    setIsCreateOpen(true);
  };

  const handleSelectTemplate = (versionId: string) => {
    setFormData((prev) => ({ ...prev, templateVersionId: versionId }));
    const tpl = templates.find((t) => t.versionId === versionId);
    if (tpl?.definition?.stages && tpl.definition.stages.length > 0) {
      setCreateStages(
        tpl.definition.stages.map((s: any) => ({
          name: s.name,
          tasks: (s.tasks || []).map((t: any) => ({ ...t })),
        }))
      );
    }
  };

  const handleAddStageToCreate = () => {
    setCreateStages((prev) => [
      ...prev,
      {
        name: `Giai đoạn ${prev.length + 1}: Giai đoạn mới`,
        tasks: [{ title: "Công việc thực hiện", weight: 10, mode: "manual" }],
      },
    ]);
  };

  const handleDeleteStageFromCreate = (idx: number) => {
    if (createStages.length <= 1) {
      toast.warning("Dự án cần có ít nhất 1 giai đoạn");
      return;
    }
    setCreateStages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateStageNameInCreate = (idx: number, name: string) => {
    setCreateStages((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
  };

  const handleMoveStageInCreate = (idx: number, dir: "up" | "down") => {
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === createStages.length - 1) return;
    setCreateStages((prev) => {
      const next = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleAddTaskToCreateStage = (stageIdx: number) => {
    setCreateStages((prev) => {
      const next = [...prev];
      next[stageIdx] = {
        ...next[stageIdx],
        tasks: [...next[stageIdx].tasks, { title: "", weight: 10, mode: "manual" }],
      };
      return next;
    });
  };

  const handleUpdateTaskInCreateStage = (stageIdx: number, taskIdx: number, title: string, weight: number) => {
    setCreateStages((prev) => {
      const next = [...prev];
      const tasks = [...next[stageIdx].tasks];
      tasks[taskIdx] = { ...tasks[taskIdx], title, weight };
      next[stageIdx] = { ...next[stageIdx], tasks };
      return next;
    });
  };

  const handleDeleteTaskFromCreateStage = (stageIdx: number, taskIdx: number) => {
    setCreateStages((prev) => {
      const next = [...prev];
      next[stageIdx] = {
        ...next[stageIdx],
        tasks: next[stageIdx].tasks.filter((_, i) => i !== taskIdx),
      };
      return next;
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("project.create")) {
      toast.error("Bạn không có quyền khởi tạo dự án");
      return;
    }
    if (!formData.name.trim() || !formData.customerId || !formData.address.trim()) {
      toast.error("Vui lòng điền đầy đủ Tên công trình, Khách hàng và Địa chỉ");
      return;
    }
    if (createStages.length === 0) {
      toast.error("Vui lòng cấu hình ít nhất 1 giai đoạn cho dự án");
      return;
    }
    try {
      setCreating(true);
      const payload: any = {
        name: formData.name.trim(),
        customerId: formData.customerId,
        address: formData.address.trim(),
        managerMembershipId: formData.managerMembershipId || undefined,
        startDate: formData.startDate || undefined,
        dueDate: formData.dueDate || undefined,
        customStages: createStages,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo dự án");

      toast.success("Khởi tạo dự án thành công!");
      setIsCreateOpen(false);
      setWorkflowOption("template");
      setFormData({
        name: "",
        customerId: customers[0]?.id || "",
        address: "",
        managerMembershipId: "",
        startDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        templateVersionId: templates[0]?.versionId || "",
      });
      fetchData();
      fetchTasks();
      if (data.projectId) {
        router.push(`/du-an/${data.projectId}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo dự án");
    } finally {
      setCreating(false);
    }
  };

  // Cập nhật trạng thái Giai đoạn Dự Án (Kanban Pipeline Dự Án)
  const handleUpdateProjectStatus = async (projectId: string, newStatus: ProjectStatus) => {
    if (!can("project.update") && !can("project.close")) {
      toast.error("Bạn không có quyền cập nhật trạng thái dự án");
      return;
    }
    const proj = projects.find((p) => p.id === projectId);
    if (!proj || proj.status === newStatus) return;

    // Optimistic UI Update
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Không thể cập nhật giai đoạn");
      }
      const stageTitle =
        PROJECT_KANBAN_COLUMNS.find((c) => c.id === newStatus)?.title || newStatus;
      toast.success(`Đã chuyển công trình [${proj.code}] sang giai đoạn: ${stageTitle}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật giai đoạn");
      fetchData();
    }
  };

  // Cập nhật trạng thái đầu việc (Kéo thả hoặc chọn trực tiếp)
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!can("task.update")) {
      toast.error("Bạn không có quyền cập nhật tiến độ công việc");
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    let progressPercent = task.progressPercent;
    if (newStatus === "done") progressPercent = 100;
    else if (newStatus === "awaiting_acceptance") progressPercent = Math.max(progressPercent, 85);
    else if (newStatus === "doing") progressPercent = progressPercent === 0 ? 50 : progressPercent;
    else if (newStatus === "todo") progressPercent = 0;

    // Cập nhật giao diện tức thì (Optimistic UI)
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, progressPercent } : t))
    );

    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, progressPercent }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
      const colTitle = TASK_KANBAN_COLUMNS.find((c) => c.id === newStatus)?.title || newStatus;
      toast.success(`Đã chuyển việc sang: ${colTitle}`);
      fetchData(); // Cập nhật lại % tổng thể dự án
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
      fetchTasks();
    }
  };

  // Mở modal giao việc
  const handleOpenAssign = (task: TaskItemDto) => {
    if (!can("task.assign") && !can("project.assign") && !can("project.update")) {
      toast.error("Bạn không có quyền phân công nhân sự");
      return;
    }
    setAssigningTask(task);
    setSelectedEmployeeId(task.assignees[0]?.employeeId || "");
  };

  // Lưu giao việc cho thành viên
  const handleSaveAssignee = async () => {
    if (!assigningTask) return;
    if (!can("task.assign") && !can("project.assign") && !can("project.update")) {
      toast.error("Bạn không có quyền phân công nhân sự");
      return;
    }
    try {
      setSavingAssignee(true);
      const res = await fetch(`/api/projects/tasks/${assigningTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployeeId || null }),
      });
      if (!res.ok) throw new Error("Không thể phân công công việc");
      toast.success("Đã phân công nhân sự phụ trách");
      setAssigningTask(null);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Lỗi phân công");
    } finally {
      setSavingAssignee(false);
    }
  };

  // ==========================================
  // LỌC DỰ ÁN THEO ROLE LENS & TÌM KIẾM
  // ==========================================
  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      // Lọc theo tìm kiếm
      if (projectSearch) {
        const q = projectSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchCust = p.customerName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCust) return false;
      }
      // Lọc trạng thái
      if (projectStatusFilter.length > 0) {
        if (!projectStatusFilter.includes(p.status)) return false;
      }
      // Lọc Chỉ huy trưởng (PM)
      if (projectManagerFilter.length > 0) {
        if (!p.managerMembershipId || !projectManagerFilter.includes(p.managerMembershipId)) return false;
      }
      // Lọc Khách hàng
      if (projectCustomerFilter.length > 0) {
        if (!p.customerId || !projectCustomerFilter.includes(p.customerId)) return false;
      }
      // Lọc "Dự án tôi tham gia / phụ trách"
      if (onlyMyProjects && user) {
        const isManager = p.managerMembershipId === user.membershipId;
        const hasMyTask = tasks.some(
          (t) => t.projectId === p.id && t.assignees.some((a) => a.employeeId === user.employeeId)
        );
        if (!isManager && !hasMyTask) return false;
      }
      return true;
    });
  }, [projects, projectSearch, projectStatusFilter, projectManagerFilter, projectCustomerFilter, onlyMyProjects, user, tasks]);

  // Bộ lọc cấu hình Facet cho Data Table
  const projectStatusFilterConfig: DataTableFacetFilterConfig = {
    id: "status",
    title: "Giai đoạn",
    selectedValues: projectStatusFilter,
    onChange: setProjectStatusFilter,
    options: [
      { value: "survey", label: "Khảo sát", count: projects.filter((p) => p.status === "survey").length },
      { value: "production", label: "Gia công xưởng", count: projects.filter((p) => p.status === "production").length },
      { value: "transport", label: "Vận chuyển", count: projects.filter((p) => p.status === "transport").length },
      { value: "installation", label: "Lắp dựng", count: projects.filter((p) => p.status === "installation").length },
      { value: "acceptance", label: "Chờ nghiệm thu", count: projects.filter((p) => p.status === "acceptance").length },
      { value: "completed", label: "Hoàn tất", count: projects.filter((p) => p.status === "completed").length },
    ],
  };

  const projectManagerFilterConfig: DataTableFacetFilterConfig = {
    id: "manager",
    title: "Chỉ huy trưởng (PM)",
    selectedValues: projectManagerFilter,
    onChange: setProjectManagerFilter,
    options: employees
      .filter((e) => e.membershipId)
      .map((emp) => ({
        value: emp.membershipId!,
        label: emp.name,
        count: projects.filter((p) => p.managerMembershipId === emp.membershipId).length,
      }))
      .filter((opt) => opt.count > 0),
  };

  const projectCustomerFilterConfig: DataTableFacetFilterConfig = {
    id: "customer",
    title: "Khách hàng",
    selectedValues: projectCustomerFilter,
    onChange: setProjectCustomerFilter,
    options: customers
      .map((cust) => ({
        value: cust.id,
        label: cust.name,
        count: projects.filter((p) => p.customerId === cust.id).length,
      }))
      .filter((opt) => opt.count > 0),
  };

  const projectStats: StatItem[] = React.useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) =>
      ["survey", "production", "transport", "installation"].includes(p.status)
    ).length;
    const awaiting = projects.filter((p) => p.status === "acceptance").length;
    const completed = projects.filter((p) => p.status === "completed").length;

    return [
      { label: "Tổng công trình", value: total, color: "neutral" },
      { label: "Đang thi công / xưởng", value: inProgress, color: "blue" },
      { label: "Chờ nghiệm thu & ký BB", value: awaiting, color: "amber" },
      { label: "Hoàn tất & bàn giao", value: `${completed} / ${total}`, color: "emerald" },
    ];
  }, [projects]);

  const projectColumns: DataTableColumn<ProjectDto>[] = [
    {
      id: "code",
      header: "Mã DA",
      accessorKey: "code",
      sortable: true,
      width: "120px",
      cell: (p) => (
        <span className="font-mono text-xs font-bold text-blue-600">
          {p.code}
        </span>
      ),
    },
    {
      id: "name",
      header: "Tên công trình",
      accessorKey: "name",
      sortable: true,
      cell: (p) => (
        <div className="flex flex-col">
          <Link
            href={`/du-an/${p.id}`}
            className="font-medium text-slate-900 hover:text-blue-600 hover:underline text-xs"
          >
            {p.name}
          </Link>
          {p.templateName && (
            <span className="text-[11px] text-slate-400">
              Mẫu: {p.templateName}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "customerName",
      header: "Khách hàng",
      accessorKey: "customerName",
      sortable: true,
      cell: (p) => (
        <div className="text-xs text-slate-700">
          <div className="font-medium">{p.customerName}</div>
          {p.customerPhone && (
            <span className="text-[11px] text-slate-400 font-mono">{p.customerPhone}</span>
          )}
        </div>
      ),
    },
    {
      id: "address",
      header: "Địa chỉ thi công",
      accessorKey: "address",
      cell: (p) => (
        <span className="text-xs text-slate-600 max-w-xs truncate block" title={p.address}>
          {p.address}
        </span>
      ),
    },
    {
      id: "progressPercent",
      header: "Tiến độ WBS",
      accessorKey: "progressPercent",
      sortable: true,
      width: "140px",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                p.progressPercent === 100
                  ? "bg-emerald-500"
                  : p.progressPercent > 50
                  ? "bg-blue-600"
                  : "bg-amber-500"
              )}
              style={{ width: `${p.progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700">
            {p.progressPercent}%
          </span>
        </div>
      ),
    },
    {
      id: "tasks",
      header: "Số đầu việc",
      width: "110px",
      cell: (p) => (
        <span className="text-xs text-slate-600">
          <strong className="text-slate-900">{p.completedTasks}</strong> / {p.totalTasks}
        </span>
      ),
    },
    {
      id: "managerName",
      header: "Chỉ huy trưởng",
      accessorKey: "managerName",
      width: "130px",
      cell: (p) => (
        <span className="text-xs font-medium text-slate-700">
          {p.managerName || <span className="text-slate-400 italic">Chưa giao</span>}
        </span>
      ),
    },
    {
      id: "status",
      header: "Giai đoạn",
      accessorKey: "status",
      sortable: true,
      width: "140px",
      cell: (p) => {
        const item = PROJECT_STATUS_MAP[p.status] || {
          label: p.status,
          variant: "neutral",
        };
        return <Badge variant={item.variant as any}>{item.label}</Badge>;
      },
    },
    {
      id: "dueDate",
      header: "Hạn bàn giao",
      accessorKey: "dueDate",
      sortable: true,
      width: "110px",
      cell: (p) => {
        const isOverdue = p.dueDate && new Date(p.dueDate).getTime() < Date.now() && p.status !== "completed";
        return (
          <span className={cn("text-xs font-mono", isOverdue ? "text-rose-600 font-bold" : "text-slate-600")}>
            {p.dueDate || "Chưa đặt"}
            {isOverdue && <span className="text-[9px] block text-rose-500 font-sans">Trễ hạn</span>}
          </span>
        );
      },
    },
  ];

  const projectRowActions: DataTableRowAction<ProjectDto>[] = [
    {
      icon: <Eye className="w-3.5 h-3.5 text-blue-600" />,
      title: "Điều độ 360° & WBS",
      onClick: (p) => router.push(`/du-an/${p.id}`),
    },
  ];

  // ==========================================
  // DỮ LIỆU TAB KANBAN ĐẦU VIỆC WBS
  // ==========================================
  const kanbanStats: StatItem[] = React.useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const doing = tasks.filter((t) => t.status === "doing").length;
    const awaiting = tasks.filter((t) => t.status === "awaiting_acceptance").length;
    const done = tasks.filter((t) => t.status === "done").length;

    return [
      { label: "Tổng đầu việc", value: total, color: "neutral" },
      { label: "Chờ thực hiện", value: todo, color: "neutral" },
      { label: "Đang thực hiện", value: doing, color: "blue" },
      { label: "Chờ nghiệm thu", value: awaiting, color: "amber" },
      { label: "Đã hoàn thành", value: `${done} / ${total}`, color: "emerald" },
    ];
  }, [tasks]);

  const projectFilterOptions: FacetOption[] = React.useMemo(() => {
    return projects.map((p) => ({
      value: p.id,
      label: `${p.code} - ${p.name}`,
      count: tasks.filter((t) => t.projectId === p.id).length,
    }));
  }, [projects, tasks]);

  const employeeFilterOptions: FacetOption[] = React.useMemo(() => {
    const unassignedCount = tasks.filter((t) => t.assignees.length === 0).length;
    return [
      {
        value: "unassigned",
        label: "Chưa giao việc",
        count: unassignedCount,
      },
      ...employees.map((e) => ({
        value: e.id,
        label: `${e.name} (${e.code})`,
        count: tasks.filter((t) => t.assignees.some((a) => a.employeeId === e.id)).length,
      })),
    ];
  }, [employees, tasks]);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (taskSearch) {
        const q = taskSearch.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = t.code.toLowerCase().includes(q);
        const matchProject = t.projectName.toLowerCase().includes(q) || t.projectCode.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchProject) return false;
      }

      if (selectedProjectFilters.length > 0) {
        if (!selectedProjectFilters.includes(t.projectId)) return false;
      }

      if (selectedEmployeeFilters.length > 0) {
        const isUnassigned = t.assignees.length === 0;
        const matchesUnassigned = selectedEmployeeFilters.includes("unassigned") && isUnassigned;
        const matchesEmployee = t.assignees.some((a) => selectedEmployeeFilters.includes(a.employeeId));
        if (!matchesUnassigned && !matchesEmployee) return false;
      }

      return true;
    });
  }, [tasks, taskSearch, selectedProjectFilters, selectedEmployeeFilters]);

  const paginatedTasks = React.useMemo(() => {
    const start = (kanbanPage - 1) * kanbanPageSize;
    return filteredTasks.slice(start, start + kanbanPageSize);
  }, [filteredTasks, kanbanPage, kanbanPageSize]);

  React.useEffect(() => {
    setKanbanPage(1);
  }, [taskSearch, selectedProjectFilters, selectedEmployeeFilters]);

  const hasActiveKanbanFilters =
    Boolean(taskSearch) ||
    selectedProjectFilters.length > 0 ||
    selectedEmployeeFilters.length > 0;

  return (
    <div className="w-full flex flex-col space-y-3 flex-1 pb-10">
      {/* 1. THANH ĐIỀU HƯỚNG TAB & GÓC NHÌN THEO ROLE (ROLE-ADAPTIVE PERSPECTIVE) */}
      <div className="sticky top-14 z-30 bg-[#f8fafc]/95 backdrop-blur-xs pt-1 pb-1 flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
        {/* Cụm 3 Tabs chính */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTab("projects")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "projects"
                ? "border-slate-900 text-slate-900 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Bảng danh sách</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === "projects"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("project_kanban")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "project_kanban"
                ? "border-blue-600 text-blue-700 bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
            <span>Kanban tiến độ dự án</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              6 giai đoạn
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("tasks")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 -mb-px",
              activeTab === "tasks"
                ? "border-slate-900 text-slate-900 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban đầu việc WBS</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === "tasks"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {tasks.length}
            </span>
          </button>
        </div>

        {/* Cụm Phải: Nút điều hướng Mẫu quy trình & Tạo dự án */}
        <div className="flex items-center gap-2">
          <Link href="/du-an/templates">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 text-slate-700 hover:text-slate-900 border-slate-300 bg-white"
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Mẫu quy trình</span>
            </Button>
          </Link>

          {can("project.create") && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo dự án mới</span>
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. NỘI DUNG TAB 1: BẢNG DANH SÁCH DỰ ÁN (ENTERPRISE DATATABLE) */}
      {/* ============================================================== */}
      {activeTab === "projects" && (
        <DataTable<ProjectDto>
          data={filteredProjects}
          columns={projectColumns}
          keyExtractor={(p) => p.id}
          searchable
          searchPlaceholder="Tìm mã DA, tên công trình, khách hàng..."
          searchValue={projectSearch}
          onSearchChange={setProjectSearch}
          filters={[projectStatusFilterConfig, projectManagerFilterConfig, projectCustomerFilterConfig]}
          onResetFilters={() => {
            setProjectSearch("");
            setProjectStatusFilter([]);
            setProjectManagerFilter([]);
            setProjectCustomerFilter([]);
          }}
          stats={projectStats}
          defaultShowStats={false}
          stickyToolbarTop="top-[102px]"
          onRefresh={() => {
            fetchData();
            fetchTasks();
          }}
          exportFileName="Danh_sach_du_an"
          rowActions={projectRowActions}
          onRowClick={(p) => router.push(`/du-an/${p.id}`)}
          isLoading={loading}
          emptyMessage="Không có công trình nào phù hợp"
        />
      )}

      {/* ============================================================== */}
      {/* 4. NỘI DUNG TAB 2: KANBAN TIẾN ĐỘ DỰ ÁN (6 GIAI ĐOẠN PIPELINE)   */}
      {/* ============================================================== */}
      {activeTab === "project_kanban" && (
        <div className="space-y-3">
          {/* Thanh lọc nhanh cho Kanban Dự Án */}
          <div className="sticky top-[102px] z-20 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xs p-2 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-56 sm:w-64 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Tìm công trình, khách hàng, mã DA..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pl-8 pr-7 text-xs h-8 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                {projectSearch && (
                  <button
                    type="button"
                    onClick={() => setProjectSearch("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <FacetFilter
                title="Giai đoạn"
                options={projectStatusFilterConfig.options}
                selectedValues={projectStatusFilter}
                onChange={setProjectStatusFilter}
              />

              <FacetFilter
                title="Chỉ huy trưởng (PM)"
                options={projectManagerFilterConfig.options}
                selectedValues={projectManagerFilter}
                onChange={setProjectManagerFilter}
              />

              <FacetFilter
                title="Khách hàng"
                options={projectCustomerFilterConfig.options}
                selectedValues={projectCustomerFilter}
                onChange={setProjectCustomerFilter}
              />

              <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100 select-none">
                <input
                  type="checkbox"
                  checked={onlyMyProjects}
                  onChange={(e) => setOnlyMyProjects(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="font-medium">Chỉ dự án tôi phụ trách</span>
              </label>

              {(projectSearch || onlyMyProjects || projectStatusFilter.length > 0 || projectManagerFilter.length > 0 || projectCustomerFilter.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setProjectSearch("");
                    setOnlyMyProjects(false);
                    setProjectStatusFilter([]);
                    setProjectManagerFilter([]);
                    setProjectCustomerFilter([]);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition shrink-0"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  fetchData();
                  fetchTasks();
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 transition shadow-2xs"
                title="Làm mới dữ liệu"
              >
                <RotateCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* 6 CỘT KANBAN GIAI ĐOẠN DỰ ÁN */}
          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <RotateCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Đang tải tiến độ công trình...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start overflow-x-auto pb-4">
              {PROJECT_KANBAN_COLUMNS.map((col) => {
                const ColIcon = col.icon;
                const colProjects = filteredProjects.filter((p) => p.status === col.id);
                const isDragOver = dragOverProjectColId === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      if (!can("project.update")) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverProjectColId !== col.id) setDragOverProjectColId(col.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverProjectColId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (!can("project.update")) return;
                      e.preventDefault();
                      setDragOverProjectColId(null);
                      const pId = e.dataTransfer.getData("text/plain") || draggedProjectId;
                      if (pId) handleUpdateProjectStatus(pId, col.id);
                    }}
                    className={cn(
                      "flex flex-col rounded-xl border p-2.5 min-h-[550px] shadow-2xs transition-all",
                      col.borderColor,
                      col.bgColor,
                      isDragOver && "ring-2 ring-blue-500 bg-blue-50/80 border-blue-400"
                    )}
                  >
                    {/* Header Cột Giai đoạn */}
                    <div className={cn("pb-2 mb-2.5 border-b", col.borderColor)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ColIcon className={cn("h-4 w-4", col.color)} />
                          <span className="text-xs font-bold text-slate-900 leading-tight">
                            {col.title}
                          </span>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border", col.badgeBg)}>
                          {colProjects.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span>{col.stageName}</span>
                        <span className="font-mono font-medium">{col.progressRange}</span>
                      </div>
                    </div>

                    {/* Vùng gợi ý thả khi kéo */}
                    {isDragOver && (
                      <div className="mb-2 p-2 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/60 text-blue-700 text-center text-xs font-semibold animate-pulse">
                        Thả để chuyển sang {col.title}
                      </div>
                    )}

                    {/* Danh sách thẻ Dự Án */}
                    <div className="flex-1 space-y-2.5">
                      {colProjects.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 italic">
                          Chưa có công trình
                        </div>
                      ) : (
                        colProjects.map((proj) => {
                          const isBeingDragged = draggedProjectId === proj.id;
                          const isOverdue =
                            proj.dueDate &&
                            new Date(proj.dueDate).getTime() < Date.now() &&
                            proj.status !== "completed";

                          return (
                            <div
                              key={proj.id}
                              draggable={can("project.update")}
                              onDragStart={(e) => {
                                if (!can("project.update")) return;
                                e.dataTransfer.setData("text/plain", proj.id);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggedProjectId(proj.id);
                              }}
                              onDragEnd={() => {
                                setDraggedProjectId(null);
                                setDragOverProjectColId(null);
                              }}
                              className={cn(
                                "group relative rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all space-y-2.5",
                                can("project.update") ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                                isBeingDragged && "opacity-40 ring-2 ring-blue-500 scale-[0.98]"
                              )}
                            >
                              {/* Header Card: Mã DA & Kéo thả handle */}
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <div className="flex items-center gap-1 min-w-0">
                                  {can("project.update") && (
                                    <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                                  )}
                                  <span className="font-mono font-bold text-blue-600 truncate">
                                    {proj.code}
                                  </span>
                                </div>
                                {isOverdue && (
                                  <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-bold shrink-0">
                                    Trễ hạn
                                  </span>
                                )}
                              </div>

                              {/* Tên Dự án & Khách hàng */}
                              <div>
                                <Link
                                  href={`/du-an/${proj.id}`}
                                  className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline leading-snug line-clamp-2 block"
                                  title={proj.name}
                                >
                                  {proj.name}
                                </Link>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  KH: <strong className="text-slate-700">{proj.customerName}</strong>
                                </div>
                              </div>

                              {/* Thanh Tiến độ WBS */}
                              <div>
                                <div className="flex items-center justify-between text-[10px] mb-1">
                                  <span className="text-slate-400">Tiến độ WBS:</span>
                                  <span className="font-bold text-slate-700">{proj.progressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      proj.progressPercent === 100
                                        ? "bg-emerald-500"
                                        : proj.progressPercent > 50
                                        ? "bg-blue-600"
                                        : "bg-amber-500"
                                    )}
                                    style={{ width: `${proj.progressPercent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                  <span>
                                    Việc xong: <strong>{proj.completedTasks}</strong>/{proj.totalTasks}
                                  </span>
                                  {proj.dueDate && (
                                    <span className="font-mono">Hạn: {proj.dueDate}</span>
                                  )}
                                </div>
                              </div>

                              {/* Footer Card: Chỉ huy trưởng & Đổi giai đoạn */}
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                                <div className="flex items-center gap-1 text-slate-600 truncate max-w-[110px]" title={proj.managerName || "Chưa giao PM"}>
                                  <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate text-[10px]">
                                    {proj.managerName || "Chưa giao PM"}
                                  </span>
                                </div>

                                <select
                                  value={proj.status}
                                  disabled={!can("project.update")}
                                  onChange={(e) =>
                                    handleUpdateProjectStatus(proj.id, e.target.value as ProjectStatus)
                                  }
                                  className={cn(
                                    "text-[10px] rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-medium text-slate-700 hover:bg-white focus:outline-none",
                                    !can("project.update") && "opacity-70 cursor-not-allowed"
                                  )}
                                >
                                  {PROJECT_KANBAN_COLUMNS.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. NỘI DUNG TAB 3: KANBAN TIẾN ĐỘ ĐẦU VIỆC WBS (4 CỘT)            */}
      {/* ============================================================== */}
      {activeTab === "tasks" && (
        <div className="space-y-3">
          {/* STATBAR KANBAN */}
          {showKanbanStats && <StatBar items={kanbanStats} />}

          {/* THANH CÔNG CỤ 1 HÀNG DUY NHẤT CHUẨN BENCHMARK CHO KANBAN (GHIM CỐ ĐỊNH TOP) */}
          <div className="sticky top-[102px] z-20 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xs p-2 shadow-xs">
            {/* Cụm trái: Tìm kiếm & FacetFilter */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-56 sm:w-64 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Tìm đầu việc, mã việc, dự án..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="pl-8 pr-7 text-xs h-8 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                {taskSearch && (
                  <button
                    type="button"
                    onClick={() => setTaskSearch("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <FacetFilter
                title="Dự án"
                options={projectFilterOptions}
                selectedValues={selectedProjectFilters}
                onChange={setSelectedProjectFilters}
              />

              <FacetFilter
                title="Người phụ trách"
                options={employeeFilterOptions}
                selectedValues={selectedEmployeeFilters}
                onChange={setSelectedEmployeeFilters}
              />

              {hasActiveKanbanFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setTaskSearch("");
                    setSelectedProjectFilters([]);
                    setSelectedEmployeeFilters([]);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition shrink-0"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Cụm phải: Thống kê nhanh & Làm mới */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowKanbanStats((prev) => !prev)}
                className={cn(
                  "p-1.5 rounded-lg border text-xs transition shadow-2xs",
                  showKanbanStats
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900"
                )}
                title="Bật/Tắt thống kê đầu việc"
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchData();
                  fetchTasks();
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 transition shadow-2xs"
                title="Làm mới dữ liệu"
              >
                <RotateCw className={cn("w-3.5 h-3.5", tasksLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* 4 CỘT KANBAN TIẾN ĐỘ ĐẦU VIỆC */}
          {tasksLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <RotateCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Đang tải đầu việc...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
              {TASK_KANBAN_COLUMNS.map((col) => {
                const Icon = col.icon;
                const colTasks = paginatedTasks.filter((t) => t.status === col.id);
                const totalColTasks = filteredTasks.filter((t) => t.status === col.id).length;
                const isDragOver = dragOverColId === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      if (!can("task.update")) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverColId !== col.id) setDragOverColId(col.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverColId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (!can("task.update")) return;
                      e.preventDefault();
                      setDragOverColId(null);
                      const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
                      if (taskId) handleUpdateTaskStatus(taskId, col.id);
                    }}
                    className={cn(
                      "flex flex-col rounded-xl border p-2.5 min-h-[500px] shadow-2xs transition-all",
                      col.borderColor,
                      col.bgColor,
                      isDragOver && "ring-2 ring-blue-500 bg-blue-50/70 border-blue-400"
                    )}
                  >
                    {/* Header Cột */}
                    <div className={`flex items-center justify-between pb-2 mb-2.5 border-b ${col.borderColor}`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${col.color}`} />
                        <span className="text-xs font-bold text-slate-800">
                          {col.title}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${col.badgeBg}`}>
                        {filteredTasks.length > kanbanPageSize ? `${colTasks.length}/${totalColTasks}` : totalColTasks}
                      </span>
                    </div>

                    {/* Vùng gợi ý thả khi kéo */}
                    {isDragOver && (
                      <div className="mb-2 p-2 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/50 text-blue-700 text-center text-xs font-semibold animate-pulse">
                        Thả vào đây để chuyển sang {col.title}
                      </div>
                    )}

                    {/* Danh sách thẻ Đầu Việc */}
                    <div className="flex-1 space-y-2.5">
                      {colTasks.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          Không có đầu việc nào
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const hasAssignee = task.assignees.length > 0;
                          const assignee = task.assignees[0];
                          const isBeingDragged = draggedTaskId === task.id;
                          const canAssign = can("task.assign") || can("project.assign") || can("project.update");

                          return (
                            <div
                              key={task.id}
                              draggable={can("task.update")}
                              onDragStart={(e) => {
                                if (!can("task.update")) return;
                                e.dataTransfer.setData("text/plain", task.id);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggedTaskId(task.id);
                              }}
                              onDragEnd={() => {
                                setDraggedTaskId(null);
                                setDragOverColId(null);
                              }}
                              className={cn(
                                "group relative rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all space-y-2",
                                can("task.update") ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                                isBeingDragged && "opacity-40 ring-2 ring-blue-500 scale-[0.98]"
                              )}
                            >
                              {/* Dòng 1: Mã dự án & Giai đoạn + Grip handle */}
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {can("task.update") && (
                                    <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                                  )}
                                  <Link
                                    href={`/du-an/${task.projectId}`}
                                    className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1 truncate"
                                    title={task.projectName}
                                  >
                                    <span className="truncate max-w-[110px]">{task.projectCode}</span>
                                  </Link>
                                </div>

                                {task.stageName && (
                                  <span className="truncate max-w-[130px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium shrink-0">
                                    {task.stageName}
                                  </span>
                                )}
                              </div>

                              {/* Dòng 2: Tên công việc & Mã việc */}
                              <div>
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {task.code}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                  {task.title}
                                </h4>
                                <span className="text-[11px] text-slate-500 line-clamp-1">
                                  {task.projectName}
                                </span>
                              </div>

                              {/* Dòng 3: Tiến độ WBS */}
                              <div>
                                <div className="flex items-center justify-between text-[10px] mb-1">
                                  <span className="text-slate-400">Tiến độ:</span>
                                  <span className="font-bold text-slate-700">{task.progressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      task.progressPercent === 100
                                        ? "bg-emerald-500"
                                        : task.progressPercent > 50
                                        ? "bg-blue-600"
                                        : "bg-amber-500"
                                    )}
                                    style={{ width: `${task.progressPercent}%` }}
                                  />
                                </div>
                              </div>

                              {/* Dòng 4: Thành viên phụ trách & Hạn chót */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                                {hasAssignee ? (
                                  canAssign ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAssign(task);
                                      }}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors"
                                      title="Bấm để đổi người phụ trách"
                                    >
                                      <UserCheck className="w-3 h-3 text-blue-600" />
                                      <span className="truncate max-w-[100px]">{assignee.name}</span>
                                    </button>
                                  ) : (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                                      <UserCheck className="w-3 h-3 text-slate-500" />
                                      <span className="truncate max-w-[100px]">{assignee.name}</span>
                                    </span>
                                  )
                                ) : (
                                  canAssign ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAssign(task);
                                      }}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[10px] font-medium transition-colors"
                                      title="Bấm để giao việc"
                                    >
                                      <UserPlus className="w-3 h-3 text-amber-600" />
                                      <span>+ Giao việc</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Chưa giao việc</span>
                                  )
                                )}

                                {task.dueAt && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>{task.dueAt}</span>
                                  </div>
                                )}
                              </div>

                              {/* Dòng 5: Chuyển mốc trạng thái nhanh */}
                              <div className="flex items-center justify-between pt-1 text-[11px]">
                                <select
                                  value={task.status}
                                  disabled={!can("task.update")}
                                  onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                                  className={cn(
                                    "text-[10px] rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-700 hover:bg-white focus:outline-none",
                                    !can("task.update") && "opacity-70 cursor-not-allowed"
                                  )}
                                >
                                  <option value="todo">Chờ làm</option>
                                  <option value="doing">Đang làm</option>
                                  <option value="awaiting_acceptance">Chờ nghiệm thu</option>
                                  <option value="done">Hoàn thành</option>
                                </select>

                                <Link
                                  href={`/du-an/${task.projectId}?tab=wbs`}
                                  className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5"
                                >
                                  <span>Chi tiết</span>
                                  <ChevronRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PHÂN TRANG GHIM ĐÁY */}
          <div className="sticky bottom-0 z-20 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xs shadow-[0_-4px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <Pagination
              page={kanbanPage}
              pageSize={kanbanPageSize}
              totalItems={filteredTasks.length}
              onPageChange={setKanbanPage}
              onPageSizeChange={(newSize) => {
                setKanbanPageSize(newSize);
                setKanbanPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              sticky={true}
            />
          </div>
        </div>
      )}

      {/* MODAL GIAO VIỆC CHO THÀNH VIÊN */}
      <Modal
        isOpen={Boolean(assigningTask)}
        onClose={() => setAssigningTask(null)}
        title="Giao Việc Cho Thành Viên"
      >
        {assigningTask && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
              <div>
                <span className="text-slate-500">Công trình:</span>{" "}
                <strong className="text-slate-900">{assigningTask.projectName}</strong> ({assigningTask.projectCode})
              </div>
              {assigningTask.stageName && (
                <div>
                  <span className="text-slate-500">Giai đoạn:</span>{" "}
                  <span className="text-slate-700">{assigningTask.stageName}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500">Đầu việc:</span>{" "}
                <strong className="text-blue-700">{assigningTask.title}</strong> ({assigningTask.code})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chọn nhân sự / thợ phụ trách:
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Chưa giao ai (Để trống) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code}){emp.phone ? ` - ${emp.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssigningTask(null)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleSaveAssignee}
                disabled={savingAssignee}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                {savingAssignee ? "Đang lưu..." : "Xác nhận giao việc"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL KHỞI TẠO DỰ ÁN MỚI (CHO PHÉP TÙY BIẾN GIAI ĐOẠN LINH HOẠT) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Khởi Tạo Dự Án & Thiết Lập Quy Trình Thi Công"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên Công Trình / Dự Án *
              </label>
              <Input
                required
                placeholder="VD: Thi công Hộp đèn 3M - Highlands Coffee"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Khách Hàng Chủ Đầu Tư *
              </label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Địa Chỉ Thi Công Công Trình *
              </label>
              <Input
                required
                placeholder="VD: Gian hàng T01, TTTM Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chỉ huy trưởng (PM)
              </label>
              <select
                value={formData.managerMembershipId}
                onChange={(e) => setFormData({ ...formData, managerMembershipId: e.target.value })}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Mặc định (Tự động gán) --</option>
                {employees
                  .filter((emp) => emp.membershipId)
                  .map((emp) => (
                    <option key={emp.membershipId!} value={emp.membershipId!}>
                      {emp.name} ({emp.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ngày Khởi Công
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hạn Bàn Giao
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {/* CẤU HÌNH CÁC GIAI ĐOẠN THI CÔNG (CHO PHÉP THÊM / BỚT / ĐỔI TÊN / ĐỔI THỨ TỰ) */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Cấu trúc Giai đoạn Thi công & Đầu việc WBS ({createStages.length} giai đoạn)
                </span>
                <span className="text-[11px] text-slate-500">
                  Bạn có thể chọn mẫu có sẵn hoặc tùy chỉnh thêm/bớt/đổi thứ tự các giai đoạn của dự án này
                </span>
              </div>

              {templates.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-slate-500 font-medium">Nạp mẫu:</span>
                  <select
                    value={formData.templateVersionId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none"
                  >
                    <option value="">-- Mẫu mặc định --</option>
                    {templates.map((t) => (
                      <option key={t.versionId} value={t.versionId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* NÚT THÊM GIAI ĐOẠN */}
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddStageToCreate}
                className="h-6 text-[11px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm giai đoạn mới</span>
              </Button>
            </div>

            {/* DANH SÁCH GIAI ĐOẠN ĐANG CẤU HÌNH */}
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {createStages.map((stage, sIdx) => (
                <div key={sIdx} className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between bg-slate-100/70 px-3 py-1.5 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                        {sIdx + 1}
                      </span>
                      <Input
                        value={stage.name}
                        onChange={(e) => handleUpdateStageNameInCreate(sIdx, e.target.value)}
                        placeholder={`Tên giai đoạn ${sIdx + 1}...`}
                        className="text-xs h-6 font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={sIdx === 0}
                        onClick={() => handleMoveStageInCreate(sIdx, "up")}
                        className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={sIdx === createStages.length - 1}
                        onClick={() => handleMoveStageInCreate(sIdx, "down")}
                        className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddTaskToCreateStage(sIdx)}
                        className="p-1 rounded text-blue-600 hover:bg-blue-50 text-[11px] font-semibold flex items-center gap-0.5 ml-1"
                        title="Thêm công việc vào giai đoạn này"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm việc</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStageFromCreate(sIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded ml-1"
                        title="Xóa giai đoạn"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* CÁC ĐẦU VIỆC TRONG GIAI ĐOẠN NÀY */}
                  <div className="p-2 space-y-1.5">
                    {stage.tasks.length === 0 ? (
                      <div className="text-slate-400 italic text-[11px] text-center py-1">
                        Chưa có đầu việc nào. Bấm "Thêm việc" để bổ sung.
                      </div>
                    ) : (
                      stage.tasks.map((task, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[10px] w-4 text-right shrink-0">
                            {tIdx + 1}.
                          </span>
                          <Input
                            required
                            placeholder="Tiêu đề đầu việc..."
                            value={task.title}
                            onChange={(e) =>
                              handleUpdateTaskInCreateStage(sIdx, tIdx, e.target.value, task.weight)
                            }
                            className="text-xs h-6 flex-1"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400">Trọng số:</span>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={task.weight}
                              onChange={(e) =>
                                handleUpdateTaskInCreateStage(
                                  sIdx,
                                  tIdx,
                                  task.title,
                                  Number(e.target.value) || 1
                                )
                              }
                              className="text-xs h-6 w-12 font-mono text-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTaskFromCreateStage(sIdx, tIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                            title="Xóa việc này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{creating ? "Đang khởi tạo..." : "Khởi Tạo Dự Án"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách dự án...</div>}>
      <ProjectsPageContent />
    </React.Suspense>
  );
}
