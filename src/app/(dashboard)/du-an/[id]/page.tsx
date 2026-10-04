"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Button,
  Badge,
  Input,
  Modal,
  toast,
} from "@/components/ui";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Printer,
  X,
  Phone,
  Check,
  Search,
  ExternalLink,
  Camera,
  Maximize2,
  AlertCircle,
  Users,
  Edit3,
  Trash2,
  DollarSign,
  Package,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  ProjectDto,
  WbsTaskDto,
  AcceptanceDto,
  ProjectStatus,
  TaskStatus,
  ProjectMemberDto,
  ProjectMaterialDto,
  ProjectFinancialSummaryDto,
  WorkReportDetailDto,
} from "@/services/project.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

// 6 GIAI ĐOẠN CHUẨN DỰ ÁN
const STAGES: { id: ProjectStatus; step: number; label: string }[] = [
  { id: "survey", step: 1, label: "Khảo sát" },
  { id: "planning", step: 2, label: "Thiết kế & BOM" },
  { id: "production", step: 3, label: "Gia công xưởng" },
  { id: "transport", step: 4, label: "Vận chuyển" },
  { id: "installation", step: 5, label: "Lắp dựng" },
  { id: "acceptance", step: 6, label: "Nghiệm thu" },
];

const STAGE_ORDER: ProjectStatus[] = [
  "survey",
  "planning",
  "production",
  "transport",
  "installation",
  "acceptance",
  "completed",
];

const STAGE_MAP: Record<string, { label: string; color: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  survey: { label: "Khảo sát", color: "warning" },
  planning: { label: "Thiết kế & BOM", color: "info" },
  production: { label: "Gia công xưởng", color: "info" },
  transport: { label: "Vận chuyển", color: "info" },
  installation: { label: "Lắp dựng", color: "warning" },
  acceptance: { label: "Chờ nghiệm thu", color: "success" },
  completed: { label: "Hoàn tất", color: "success" },
  cancelled: { label: "Đã hủy", color: "danger" },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const searchParams = useSearchParams();
  const { can, user } = useAuthorization();

  // Dữ liệu cốt lõi
  const [project, setProject] = React.useState<ProjectDto | null>(null);
  const [tasks, setTasks] = React.useState<WbsTaskDto[]>([]);
  const [employees, setEmployees] = React.useState<{ id: string; code: string; name: string; phone: string | null; membershipId?: string | null }[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [acceptances, setAcceptances] = React.useState<AcceptanceDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Tabs điều hướng (Thêm Tab 'members')
  const [activeTab, setActiveTab] = React.useState<"wbs" | "reports" | "production" | "finance" | "acceptance" | "members">("wbs");

  // Lọc WBS
  const [wbsSearch, setWbsSearch] = React.useState("");
  const [wbsEmployeeFilter, setWbsEmployeeFilter] = React.useState<string>("all");
  const [wbsStatusFilter, setWbsStatusFilter] = React.useState<string>("all");
  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({});

  // Tab 2: Nhật ký hiện trường THẬT
  const [fieldReports, setFieldReports] = React.useState<WorkReportDetailDto[]>([]);
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [newReportText, setNewReportText] = React.useState("");
  const [newReportMaterials, setNewReportMaterials] = React.useState("");
  const [newReportEmployeeId, setNewReportEmployeeId] = React.useState("");
  const [savingReport, setSavingReport] = React.useState(false);

  // Tab 3: Sản xuất & Vật tư THẬT
  const [materials, setMaterials] = React.useState<ProjectMaterialDto[]>([]);
  const [stockDocuments, setStockDocuments] = React.useState<any[]>([]);
  const [materialsLoading, setMaterialsLoading] = React.useState(false);

  // Tab 4: Tài chính & Thu chi P&L THẬT
  const [finance, setFinance] = React.useState<ProjectFinancialSummaryDto | null>(null);
  const [financeLoading, setFinanceLoading] = React.useState(false);

  // Tab 6: Thành viên dự án (Team)
  const [members, setMembers] = React.useState<ProjectMemberDto[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false);
  const [newMemberMembershipId, setNewMemberMembershipId] = React.useState("");
  const [newMemberRole, setNewMemberRole] = React.useState("Kỹ thuật hiện trường");
  const [savingMember, setSavingMember] = React.useState(false);

  // Modal Sửa thông tin dự án
  const [isEditProjectOpen, setIsEditProjectOpen] = React.useState(false);
  const [editProjectData, setEditProjectData] = React.useState({
    name: "",
    address: "",
    customerId: "",
    managerMembershipId: "",
    startDate: "",
    dueDate: "",
  });
  const [savingProject, setSavingProject] = React.useState(false);

  // Modal Thêm Giai đoạn lớn WBS (Phase/Milestone)
  const [isCreateStageOpen, setIsCreateStageOpen] = React.useState(false);
  const [newStageTitle, setNewStageTitle] = React.useState("");
  const [savingStage, setSavingStage] = React.useState(false);

  // Modal Sửa chi tiết Task WBS
  const [editingTask, setEditingTask] = React.useState<WbsTaskDto | null>(null);
  const [editTaskTitle, setEditTaskTitle] = React.useState("");
  const [editTaskWeight, setEditTaskWeight] = React.useState<number>(1);
  const [editTaskDueAt, setEditTaskDueAt] = React.useState("");
  const [savingEditTask, setSavingEditTask] = React.useState(false);

  // Modal Xác nhận xóa Task WBS
  const [deletingTask, setDeletingTask] = React.useState<WbsTaskDto | null>(null);
  const [deletingTaskLoading, setDeletingTaskLoading] = React.useState(false);

  // Modals nghiệp vụ hiện có
  const [isStageModalOpen, setIsStageModalOpen] = React.useState(false);
  const [selectedStageToChange, setSelectedStageToChange] = React.useState<ProjectStatus | null>(null);
  const [updatingStage, setUpdatingStage] = React.useState(false);

  const [isAcceptanceOpen, setIsAcceptanceOpen] = React.useState(false);
  const [signerName, setSignerName] = React.useState("");
  const [creatingAcceptance, setCreatingAcceptance] = React.useState(false);

  const [assigningTask, setAssigningTask] = React.useState<WbsTaskDto | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("");
  const [savingAssignee, setSavingAssignee] = React.useState(false);

  const [createTaskParent, setCreateTaskParent] = React.useState<WbsTaskDto | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDueAt, setNewTaskDueAt] = React.useState("");
  const [newTaskEmployeeId, setNewTaskEmployeeId] = React.useState("");
  const [savingNewTask, setSavingNewTask] = React.useState(false);

  // Ảnh 4 giai đoạn & Lightbox
  const [photos, setPhotos] = React.useState([
    {
      id: "p1",
      stage: "1. Khảo sát mặt bằng",
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
      date: "10/09/2026",
      desc: "Mặt tiền 8.4m x 2.6m, dầm bê tông chịu lực tốt",
    },
    {
      id: "p2",
      stage: "2. Khung sắt & LED trong",
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      date: "18/09/2026",
      desc: "Sắt mạ kẽm 30x30 dày 1.4mm hàn kín chống gỉ",
    },
    {
      id: "p3",
      stage: "3. Hoàn thiện ban ngày",
      url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
      date: "24/09/2026",
      desc: "Mặt alu phẳng, chữ inox sáng chân sắc nét",
    },
    {
      id: "p4",
      stage: "4. Sáng đèn đêm",
      url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
      date: "25/09/2026",
      desc: "Ánh sáng vàng ấm 3000K đồng đều, rõ từ 150m",
    },
  ]);
  const [lightboxPhoto, setLightboxPhoto] = React.useState<any | null>(null);

  // Mẫu in A4
  const [previewAcceptance, setPreviewAcceptance] = React.useState<AcceptanceDto | null>(null);

  // Sync tab with URL
  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["wbs", "reports", "production", "finance", "acceptance", "members"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const handleTabChange = (t: "wbs" | "reports" | "production" | "finance" | "acceptance" | "members") => {
    setActiveTab(t);
    router.replace(`/du-an/${projectId}?tab=${t}`, { scroll: false });
  };

  const fetchReports = React.useCallback(async () => {
    try {
      setReportsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/reports`);
      if (res.ok) {
        const data = await res.json();
        setFieldReports(data.reports || []);
      }
    } catch (err) {
      console.error("Lỗi tải nhật ký hiện trường", err);
    } finally {
      setReportsLoading(false);
    }
  }, [projectId]);

  const fetchMaterials = React.useCallback(async () => {
    try {
      setMaterialsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/materials`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
        setStockDocuments(data.stockDocuments || []);
      }
    } catch (err) {
      console.error("Lỗi tải vật tư xuất kho", err);
    } finally {
      setMaterialsLoading(false);
    }
  }, [projectId]);

  const fetchFinance = React.useCallback(async () => {
    if (!can("project_finance.read")) return;
    try {
      setFinanceLoading(true);
      const res = await fetch(`/api/projects/${projectId}/finance`);
      if (res.ok) {
        const data = await res.json();
        setFinance(data.finance || null);
      }
    } catch (err) {
      console.error("Lỗi tải tài chính dự án", err);
    } finally {
      setFinanceLoading(false);
    }
  }, [projectId, can]);

  const fetchMembers = React.useCallback(async () => {
    try {
      setMembersLoading(true);
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error("Lỗi tải thành viên dự án", err);
    } finally {
      setMembersLoading(false);
    }
  }, [projectId]);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, tRes, aRes, eRes, cRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/acceptances`),
        fetch(`/api/projects/employees`),
        fetch(`/api/crm/customers`),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setProject(pData.project);
        setEditProjectData({
          name: pData.project?.name || "",
          address: pData.project?.address || "",
          customerId: pData.project?.customerId || "",
          managerMembershipId: pData.project?.managerMembershipId || "",
          startDate: pData.project?.startDate || "",
          dueDate: pData.project?.dueDate || "",
        });
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData.tasks || []);
        const initExpanded: Record<string, boolean> = {};
        tData.tasks?.forEach((t: WbsTaskDto) => {
          initExpanded[t.id] = true;
        });
        setExpandedTasks(initExpanded);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAcceptances(aData.acceptances || []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEmployees(eData.employees || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCustomers(cData.customers || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải thông tin dự án");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (activeTab === "reports") fetchReports();
    if (activeTab === "production") fetchMaterials();
    if (activeTab === "finance") fetchFinance();
    if (activeTab === "members") fetchMembers();
  }, [activeTab, fetchReports, fetchMaterials, fetchFinance, fetchMembers]);

  // Cài đặt tiêu đề tối giản ở top AppShell
  useSetPageHeader(
    {
      title: project ? `${project.code} - ${project.name}` : "Chi tiết dự án",
      subtitle: project ? `${project.customerName} • ${project.address}` : "",
      screenCode: "M12",
      quickViews: [
        { label: "Danh sách dự án", href: "/du-an" },
        { label: "Mẫu quy trình", href: "/du-an/templates" },
      ],
      primaryAction: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchData();
            if (activeTab === "reports") fetchReports();
            if (activeTab === "production") fetchMaterials();
            if (activeTab === "finance") fetchFinance();
            if (activeTab === "members") fetchMembers();
          }}
          className="h-8 text-xs gap-1.5 border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Làm mới</span>
        </Button>
      ),
    },
    [project, fetchData, activeTab, fetchReports, fetchMaterials, fetchFinance, fetchMembers]
  );

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleUpdateTaskProgress = async (taskId: string, percent: number, status?: TaskStatus) => {
    if (!can("task.update") && !can("project.update")) {
      toast.error("Bạn không có quyền cập nhật tiến độ");
      return;
    }
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent: percent, status }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật tiến độ");
      toast.success(`Tiến độ: ${percent}%`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    }
  };

  const confirmUpdateStatus = async (newStatus: ProjectStatus) => {
    if (!can("project.update")) {
      toast.error("Bạn không có quyền chuyển giai đoạn dự án");
      return;
    }
    try {
      setUpdatingStage(true);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Lỗi đổi giai đoạn");
      toast.success("Đã cập nhật giai đoạn dự án");
      setIsStageModalOpen(false);
      setSelectedStageToChange(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi đổi giai đoạn");
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("project.update")) {
      toast.error("Bạn không có quyền chỉnh sửa dự án");
      return;
    }
    try {
      setSavingProject(true);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProjectData.name,
          address: editProjectData.address,
          customerId: editProjectData.customerId,
          managerMembershipId: editProjectData.managerMembershipId || null,
          startDate: editProjectData.startDate || null,
          dueDate: editProjectData.dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật dự án");
      toast.success("Đã lưu thông tin dự án!");
      setIsEditProjectOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật dự án");
    } finally {
      setSavingProject(false);
    }
  };

  const handleCreateTopLevelStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("task.create") && !can("project.update")) {
      toast.error("Bạn không có quyền tạo giai đoạn");
      return;
    }
    if (!newStageTitle.trim()) return;
    try {
      setSavingStage(true);
      const res = await fetch(`/api/projects/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: newStageTitle.trim(),
          isStage: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo giai đoạn");
      toast.success("Đã tạo Giai đoạn lớn mới!");
      setIsCreateStageOpen(false);
      setNewStageTitle("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo giai đoạn");
    } finally {
      setSavingStage(false);
    }
  };

  const handleSaveAssignee = async () => {
    if (!assigningTask) return;
    if (!can("task.assign") && !can("project.update")) {
      toast.error("Bạn không có quyền giao việc");
      return;
    }
    try {
      setSavingAssignee(true);
      const res = await fetch(`/api/projects/tasks/${assigningTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployeeId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi giao việc");
      toast.success("Đã cập nhật người phụ trách!");
      setAssigningTask(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi giao việc");
    } finally {
      setSavingAssignee(false);
    }
  };

  const handleCreateSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskParent) return;
    if (!can("task.create") && !can("project.update")) {
      toast.error("Bạn không có quyền tạo công việc");
      return;
    }
    if (!newTaskTitle.trim()) return;
    try {
      setSavingNewTask(true);
      const res = await fetch(`/api/projects/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          parentId: createTaskParent.id,
          title: newTaskTitle.trim(),
          employeeId: newTaskEmployeeId || null,
          dueAt: newTaskDueAt || null,
          isStage: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo công việc");
      toast.success("Đã thêm công việc mới!");
      setCreateTaskParent(null);
      setNewTaskTitle("");
      setNewTaskEmployeeId("");
      setNewTaskDueAt("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo công việc");
    } finally {
      setSavingNewTask(false);
    }
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!can("task.update") && !can("project.update")) {
      toast.error("Bạn không có quyền chỉnh sửa công việc");
      return;
    }
    try {
      setSavingEditTask(true);
      const res = await fetch(`/api/projects/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          weight: Number(editTaskWeight) || 1,
          dueAt: editTaskDueAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật công việc");
      toast.success("Đã cập nhật công việc!");
      setEditingTask(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật công việc");
    } finally {
      setSavingEditTask(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;
    if (!can("task.update") && !can("project.update")) {
      toast.error("Bạn không có quyền xóa công việc");
      return;
    }
    try {
      setDeletingTaskLoading(true);
      const res = await fetch(`/api/projects/tasks/${deletingTask.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa công việc");
      toast.success("Đã xóa công việc!");
      setDeletingTask(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa công việc");
    } finally {
      setDeletingTaskLoading(false);
    }
  };

  const handleCreateAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) return;
    try {
      setCreatingAcceptance(true);
      const res = await fetch(`/api/projects/${projectId}/acceptances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerSignerName: signerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo biên bản");
      toast.success("Đã tạo biên bản nghiệm thu!");
      setIsAcceptanceOpen(false);
      setSignerName("");
      const aRes = await fetch(`/api/projects/${projectId}/acceptances`);
      if (aRes.ok) {
        const aData = await aRes.json();
        setAcceptances(aData.acceptances || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo biên bản");
    } finally {
      setCreatingAcceptance(false);
    }
  };

  const handleUpdateAcceptanceStatus = async (accId: string, status: "approved" | "rejected") => {
    if (!can("acceptance.approve") && !can("project.update")) {
      toast.error("Bạn không có quyền phê duyệt nghiệm thu");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/acceptances/${accId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi duyệt biên bản");
      toast.success(status === "approved" ? "Đã phê duyệt nghiệm thu!" : "Đã từ chối nghiệm thu");
      const aRes = await fetch(`/api/projects/${projectId}/acceptances`);
      if (aRes.ok) {
        const aData = await aRes.json();
        setAcceptances(aData.acceptances || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý biên bản");
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText.trim()) return;
    try {
      setSavingReport(true);
      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newReportText.trim(),
          materialsUsed: newReportMaterials.trim() || undefined,
          employeeId: newReportEmployeeId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi gửi báo cáo");
      toast.success("Đã gửi báo cáo hiện trường!");
      setIsReportModalOpen(false);
      setNewReportText("");
      setNewReportMaterials("");
      setNewReportEmployeeId("");
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi báo cáo");
    } finally {
      setSavingReport(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberMembershipId) {
      toast.error("Vui lòng chọn nhân sự");
      return;
    }
    if (!can("project.assign") && !can("project.update")) {
      toast.error("Bạn không có quyền thêm thành viên");
      return;
    }
    try {
      setSavingMember(true);
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: newMemberMembershipId,
          role: newMemberRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi thêm thành viên");
      toast.success("Đã thêm thành viên vào dự án!");
      setIsAddMemberOpen(false);
      setNewMemberMembershipId("");
      setNewMemberRole("Kỹ thuật hiện trường");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi thêm thành viên");
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!can("project.assign") && !can("project.update")) {
      toast.error("Bạn không có quyền xóa thành viên");
      return;
    }
    if (!confirm("Bạn có chắc muốn gỡ thành viên này khỏi dự án?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi gỡ thành viên");
      toast.success("Đã gỡ thành viên khỏi dự án");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi gỡ thành viên");
    }
  };

  const filteredTasks = React.useMemo(() => {
    return tasks.map((parent) => {
      let children = parent.children || [];
      if (wbsSearch) {
        const q = wbsSearch.toLowerCase();
        children = children.filter((c) => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
      }
      if (wbsEmployeeFilter !== "all") {
        if (wbsEmployeeFilter === "unassigned") {
          children = children.filter((c) => c.assignees.length === 0);
        } else {
          children = children.filter((c) => c.assignees.some((a) => a.employeeId === wbsEmployeeFilter));
        }
      }
      if (wbsStatusFilter !== "all") {
        children = children.filter((c) => c.status === wbsStatusFilter);
      }
      return { ...parent, filteredChildren: children };
    });
  }, [tasks, wbsSearch, wbsEmployeeFilter, wbsStatusFilter]);

  if (loading && !project) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin text-slate-400 mr-2" />
        Đang tải dữ liệu dự án...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 max-w-md mx-auto mt-8">
        <p className="text-sm font-semibold text-slate-800">Không tìm thấy dự án</p>
        <Link href="/du-an">
          <Button variant="outline" size="sm" className="mt-3 text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Về danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const currentStageIdx = STAGE_ORDER.indexOf(project.status);

  return (
    <div className="space-y-3 pb-8">
      {/* 1. COMPACT HEADER BAR (TỐI GIẢN, GỌN GÀNG, KHÔNG RƯỜM RÀ) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        {/* Hàng 1: Tiêu đề + Mã + Trạng thái + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/du-an"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {project.code}
            </span>

            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {project.name}
            </h1>

            <button
              type="button"
              onClick={() => {
                if (!can("project.update")) {
                  toast.error("Bạn không có quyền chuyển giai đoạn dự án");
                  return;
                }
                setSelectedStageToChange(project.status);
                setIsStageModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
              title="Bấm để đổi giai đoạn"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>{STAGE_MAP[project.status]?.label || project.status}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {can("project.update") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditProjectOpen(true)}
                className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Edit3 className="w-3 h-3 text-slate-500" />
                <span>Sửa dự án</span>
              </Button>
            )}
          </div>

          {/* Quick Metrics góc phải */}
          <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Tiến độ WBS:</span>
              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>
              <span className="font-bold text-slate-900 font-mono">
                {project.progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Hàng 2: Metadata Strip (1 dòng gọn gàng, loại bỏ card to đùng) */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div>
            <span className="text-slate-400">Khách hàng:</span>{" "}
            <strong className="text-slate-900">{project.customerName}</strong>
            {project.customerPhone && (
              <a href={`tel:${project.customerPhone}`} className="ml-1 text-blue-600 hover:underline font-mono">
                ({project.customerPhone})
              </a>
            )}
          </div>

          <div>
            <span className="text-slate-400">Địa chỉ:</span>{" "}
            <span className="text-slate-700">{project.address}</span>
          </div>

          <div>
            <span className="text-slate-400">Hạn bàn giao:</span>{" "}
            <strong className="text-slate-900">{project.dueDate || "Chưa đặt"}</strong>
          </div>

          <div>
            <span className="text-slate-400">Chỉ huy trưởng (PM):</span>{" "}
            <strong className="text-slate-900">{project.managerName || "Chưa chỉ định"}</strong>
          </div>

          <div>
            <span className="text-slate-400">Đầu việc:</span>{" "}
            <span className="font-mono text-slate-700">
              <strong>{project.completedTasks}</strong> / {project.totalTasks} việc xong
            </span>
          </div>
        </div>

        {/* Hàng 3: Minimalist Stepper (Dòng tiến trình 6 chặng phẳng, không tốn diện tích) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {STAGES.map((stg) => {
              const thisIdx = STAGE_ORDER.indexOf(stg.id);
              const isPast = thisIdx < currentStageIdx;
              const isCurrent = project.status === stg.id;

              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => {
                    if (!can("project.update")) {
                      toast.error("Bạn không có quyền chuyển giai đoạn dự án");
                      return;
                    }
                    setSelectedStageToChange(stg.id);
                    setIsStageModalOpen(true);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-center",
                    isCurrent && "bg-white text-blue-700 font-bold shadow-2xs border border-blue-200",
                    isPast && "text-emerald-700 hover:bg-slate-100",
                    !isCurrent && !isPast && "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {isPast ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">{stg.step}.</span>
                  )}
                  <span className="truncate">{stg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS PHẲNG (KHÔNG CUỘN, KHÔNG BADGE MÀU MÈ) */}
      <div className="flex border-b border-slate-200 bg-white px-3 rounded-t-xl gap-1 text-xs">
        <button
          type="button"
          onClick={() => handleTabChange("wbs")}
          className={cn(
            "px-4 py-2.5 font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
            activeTab === "wbs"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>Công việc (WBS)</span>
          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
            {tasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("reports")}
          className={cn(
            "px-4 py-2.5 font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
            activeTab === "reports"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>Nhật ký hiện trường</span>
          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
            {fieldReports.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("production")}
          className={cn(
            "px-4 py-2.5 font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
            activeTab === "production"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>Sản xuất & Vật tư</span>
          {materials.length > 0 && (
            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
              {materials.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("finance")}
          className={cn(
            "px-4 py-2.5 font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
            activeTab === "finance"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>Thu chi (P&L)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("acceptance")}
          className={cn(
            "px-4 py-2.5 font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
            activeTab === "acceptance"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>Ảnh & Nghiệm thu</span>
          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
            {acceptances.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("members")}
          className={cn(
            "px-4 py-2.5 font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5",
            activeTab === "members"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Thành viên</span>
          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
            {members.length}
          </span>
        </button>
      </div>

      {/* 3. TAB 1: CÂY CÔNG VIỆC WBS (THIẾT KẾ DATA-FIRST, KHÔNG RƯỜM RÀ) */}
      {activeTab === "wbs" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-3">
          {/* Thanh lọc gọn gàng 1 dòng duy nhất */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Tìm đầu việc..."
                  value={wbsSearch}
                  onChange={(e) => setWbsSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-slate-50"
                />
              </div>

              <select
                value={wbsEmployeeFilter}
                onChange={(e) => setWbsEmployeeFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700"
              >
                <option value="all">Tất cả nhân sự</option>
                <option value="unassigned">Chưa giao việc</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>

              <select
                value={wbsStatusFilter}
                onChange={(e) => setWbsStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="todo">Chờ thực hiện</option>
                <option value="doing">Đang làm</option>
                <option value="done">Hoàn thành</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {(can("task.create") || can("project.update")) && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateStageOpen(true)}
                  className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Giai đoạn lớn</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  tasks.forEach((t) => (all[t.id] = true));
                  setExpandedTasks(all);
                }}
                className="h-8 text-xs text-slate-600"
              >
                Mở hết
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedTasks({})}
                className="h-8 text-xs text-slate-600"
              >
                Thu gọn
              </Button>
            </div>
          </div>

          {/* Danh sách công việc */}
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có công việc nào trong dự án này.
              </div>
            ) : (
              filteredTasks.map((parent) => {
                const isExpanded = expandedTasks[parent.id] ?? true;
                const hasChildren = parent.filteredChildren && parent.filteredChildren.length > 0;
                const canManageTasks = can("task.update") || can("project.update");
                const canCreateTasks = can("task.create") || can("project.update");

                return (
                  <div key={parent.id} className="bg-white">
                    {/* Dòng Giai Đoạn (Task Cha) */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(parent.id)}
                            className="p-0.5 text-slate-500 hover:bg-slate-200 rounded"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : (
                          <div className="w-5" />
                        )}

                        <span className="font-mono text-xs text-slate-500">{parent.code}</span>
                        <strong className="text-xs text-slate-900 truncate">{parent.title}</strong>
                        {parent.weight && parent.weight > 1 && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded font-mono">
                            x{parent.weight}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {canCreateTasks && (
                          <button
                            type="button"
                            onClick={() => setCreateTaskParent(parent)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50"
                          >
                            + Thêm việc
                          </button>
                        )}

                        {canManageTasks && (
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTask(parent);
                                setEditTaskTitle(parent.title);
                                setEditTaskWeight(parent.weight || 1);
                                setEditTaskDueAt(parent.dueAt || "");
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-200"
                              title="Sửa giai đoạn"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTask(parent)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Xóa giai đoạn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full", parent.progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600")}
                            style={{ width: `${parent.progressPercent}%` }}
                          />
                        </div>
                        <span className="w-7 text-right font-mono text-xs font-bold text-slate-700">
                          {parent.progressPercent}%
                        </span>

                        <Badge
                          variant={
                            parent.status === "done" ? "success" : parent.status === "doing" ? "warning" : "neutral"
                          }
                        >
                          {parent.status === "done" ? "Xong" : parent.status === "doing" ? "Đang làm" : "Chờ"}
                        </Badge>
                      </div>
                    </div>

                    {/* Dòng việc con */}
                    {isExpanded && hasChildren && (
                      <div className="divide-y divide-slate-100 pl-8 pr-3 bg-white">
                        {parent.filteredChildren!.map((sub) => {
                          const assignee = sub.assignees[0];
                          const canAssign = can("task.assign") || can("project.assign") || can("project.update");

                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between py-2 text-xs hover:bg-slate-50/60"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono text-[11px] text-slate-400">{sub.code}</span>
                                <span className="text-slate-800 truncate">{sub.title}</span>
                                {sub.weight && sub.weight > 1 && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                                    x{sub.weight}
                                  </span>
                                )}

                                {assignee ? (
                                  canAssign ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssigningTask(sub);
                                        setSelectedEmployeeId(assignee.employeeId);
                                      }}
                                      className="text-[11px] text-blue-600 hover:underline"
                                    >
                                      [{assignee.name}]
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-600">[{assignee.name}]</span>
                                  )
                                ) : (
                                  canAssign ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssigningTask(sub);
                                        setSelectedEmployeeId("");
                                      }}
                                      className="text-[10px] text-amber-700 hover:underline"
                                    >
                                      [+ Giao việc]
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">[Chưa giao việc]</span>
                                  )
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {[0, 50, 100].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      disabled={!canManageTasks}
                                      onClick={() =>
                                        handleUpdateTaskProgress(
                                          sub.id,
                                          pct,
                                          pct === 100 ? "done" : pct > 0 ? "doing" : "todo"
                                        )
                                      }
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold transition",
                                        sub.progressPercent === pct
                                          ? "bg-slate-900 text-white"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                                        !canManageTasks && "cursor-default opacity-80"
                                      )}
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>

                                <span className="w-12 text-center text-[11px] text-slate-500 font-mono">
                                  {sub.status === "done" ? "Xong" : sub.status === "doing" ? "Đang làm" : "Chờ"}
                                </span>

                                {canManageTasks && (
                                  <div className="flex items-center ml-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTask(sub);
                                        setEditTaskTitle(sub.title);
                                        setEditTaskWeight(sub.weight || 1);
                                        setEditTaskDueAt(sub.dueAt || "");
                                      }}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                                      title="Sửa công việc"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingTask(sub)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                      title="Xóa công việc"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: NHẬT KÝ BÁO CÁO NGÀY */}
      {activeTab === "reports" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800">Nhật ký hiện trường ({fieldReports.length})</span>
              <p className="text-[11px] text-slate-500">Báo cáo thi công, đo đạc và tiến độ thực địa</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
              className="h-7 text-xs bg-slate-900 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Gửi báo cáo mới
            </Button>
          </div>

          {reportsLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Đang tải nhật ký...
            </div>
          ) : fieldReports.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Chưa có báo cáo hiện trường nào. Bấm nút "Gửi báo cáo mới" để thêm báo cáo đầu tiên.
            </div>
          ) : (
            <div className="space-y-3">
              {fieldReports.map((r) => (
                <div key={r.id} className="p-3.5 rounded-lg border border-slate-200 text-xs space-y-2 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{r.authorName || "Kỹ thuật hiện trường"}</span>
                      <span>•</span>
                      <span>{r.submittedAt ? new Date(r.submittedAt).toLocaleString("vi-VN") : r.workDate}</span>
                    </div>
                    <Badge variant={r.status === "approved" ? "success" : "neutral"} className="text-[10px]">
                      {r.status === "approved" ? "Đã xác nhận" : "Báo cáo mới"}
                    </Badge>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap">{r.workSummary}</p>
                  {r.materialsList && r.materialsList.length > 0 && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-start gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <strong>Vật tư tiêu hao / phát sinh:</strong>{" "}
                        {r.materialsList.map((m) => `${m.name} (${m.qty})`).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: SẢN XUẤT & BÓC TÁCH VẬT TƯ */}
      {activeTab === "production" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Vật tư & Phiếu kho dự án:</span>
              <span className="font-mono text-blue-600 font-bold">{project.code}</span>
            </div>
            <Link
              href={`/kho/nhap-xuat/tao-moi?loai=xuat&du_an=${project.id}&ma_du_an=${project.code}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo phiếu xuất kho (M09)
            </Link>
          </div>

          {materialsLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Đang tải dữ liệu vật tư và phiếu kho...
            </div>
          ) : (
            <>
              {/* Bảng 1: Vật tư đã xuất kho */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Tổng hợp vật tư đã thực xuất cho công trình ({materials.length})</span>
                </div>
                {materials.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Chưa có vật tư nào được xuất kho cho dự án này.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Mã SKU</th>
                          <th className="px-3 py-2">Tên vật tư</th>
                          <th className="px-3 py-2">ĐVT</th>
                          <th className="px-3 py-2 text-right">Tổng thực xuất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {materials.map((m) => (
                          <tr key={m.itemId} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono text-slate-600">{m.itemCode}</td>
                            <td className="px-3 py-2 font-medium text-slate-900">{m.itemName}</td>
                            <td className="px-3 py-2 text-slate-500">{m.unitName || m.unitCode}</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-600 font-mono">
                              {m.issuedQty.toLocaleString("vi-VN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bảng 2: Danh sách Phiếu xuất / nhập kho */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Phiếu xuất / nhập kho liên quan ({stockDocuments.length})</span>
                </div>
                {stockDocuments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Chưa phát sinh phiếu kho liên quan.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Số phiếu</th>
                          <th className="px-3 py-2">Loại</th>
                          <th className="px-3 py-2">Trạng thái</th>
                          <th className="px-3 py-2">Ngày lập</th>
                          <th className="px-3 py-2">Diễn giải</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stockDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-blue-600">{doc.code}</td>
                            <td className="px-3 py-2">
                              <Badge variant={doc.type === "export" ? "info" : "neutral"} className="text-[10px]">
                                {doc.type === "export" ? "Xuất kho" : "Nhập kho"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={doc.status === "posted" ? "success" : "neutral"} className="text-[10px]">
                                {doc.status === "posted" ? "Đã ghi sổ" : "Bản nháp"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                            </td>
                            <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{doc.description || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 6. TAB 4: THU CHI & LÃI LỖ (P&L) */}
      {activeTab === "finance" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4">
          {!can("project_finance.read") ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bạn không có quyền truy cập dữ liệu tài chính của dự án này (yêu cầu quyền: project_finance.read).</span>
            </div>
          ) : financeLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Đang tổng hợp dữ liệu tài chính P&L...
            </div>
          ) : !finance ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Không tìm thấy dữ liệu tài chính cho dự án này.
            </div>
          ) : (
            <>
              {/* 4 Thẻ KPI Tài chính */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Doanh thu bán hàng</span>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {finance.contractTotal.toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Chi phí vật tư xuất kho</span>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {finance.materialCost.toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Chi phí tiền mặt / chi khác</span>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {finance.disbursementsTotal.toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border",
                  finance.grossProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                )}>
                  <span className={finance.grossProfit >= 0 ? "text-emerald-800 font-medium" : "text-rose-800 font-medium"}>
                    Lãi gộp ước tính
                  </span>
                  <div className={cn(
                    "text-base font-bold mt-1 font-mono",
                    finance.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {finance.grossProfit.toLocaleString("vi-VN")} đ ({finance.grossProfitMargin.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Phân tích Dòng tiền & Công nợ */}
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">Thực tế dòng tiền & Công nợ:</span>
                <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Hạng mục</th>
                        <th className="px-3 py-2 text-right">Số tiền</th>
                        <th className="px-3 py-2 text-center">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-3 py-2 font-medium">Tiền đã thu vào từ khách hàng</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600 font-mono">
                          {finance.receiptsTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3 py-2 text-center text-slate-400">Phiếu thu thanh toán</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium">Tổng tiền đã chi ra trực tiếp</td>
                        <td className="px-3 py-2 text-right font-bold text-rose-600 font-mono">
                          {finance.disbursementsTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3 py-2 text-center text-slate-400">Phiếu chi tiền mặt/CK</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="px-3 py-2 font-bold text-slate-900">Dòng tiền ròng thực nhận (Net Cash)</td>
                        <td className={cn(
                          "px-3 py-2 text-right font-bold font-mono",
                          finance.receiptsTotal - finance.disbursementsTotal >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}>
                          {(finance.receiptsTotal - finance.disbursementsTotal).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500 font-medium">Thu vào - Chi ra</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium text-amber-700">Công nợ khách hàng còn phải trả</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-600 font-mono">
                          {finance.receivablesTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3 py-2 text-center text-amber-600 font-medium">Chờ thanh toán</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 7. TAB 5: ẢNH HIỆN TRƯỜNG & NGHIỆM THU */}
      {activeTab === "acceptance" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4 text-xs">
          <div>
            <span className="font-bold text-slate-900 block mb-2">Ảnh hiện trường 4 giai đoạn:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setLightboxPhoto(p)}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 cursor-pointer hover:border-slate-400 transition-colors"
                >
                  <div className="aspect-video relative">
                    <img src={p.url} alt={p.stage} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2 space-y-0.5">
                    <strong className="text-slate-900 block truncate">{p.stage}</strong>
                    <p className="text-[11px] text-slate-500 truncate">{p.desc}</p>
                    <span className="text-[10px] text-slate-400 block">{p.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Biên bản nghiệm thu & bàn giao ({acceptances.length})</span>
              <p className="text-[11px] text-slate-500">Ký kết xác nhận hoàn thành công trình với khách hàng</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAcceptanceOpen(true)}
              className="h-7 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Lập biên bản mới
            </Button>
          </div>

          {acceptances.length === 0 ? (
            <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Chưa có biên bản nào được tạo.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {acceptances.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600">{a.code}</span>
                      <Badge
                        variant={
                          a.status === "approved"
                            ? "success"
                            : a.status === "rejected"
                            ? "danger"
                            : "warning"
                        }
                        className="text-[10px]"
                      >
                        {a.status === "approved"
                          ? "Đã phê duyệt"
                          : a.status === "rejected"
                          ? "Đã từ chối"
                          : "Chờ phê duyệt"}
                      </Badge>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      Người ký: <strong>{a.customerSignerName || "Chưa ký"}</strong> • Ngày:{" "}
                      {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {a.status === "submitted" && (can("acceptance.approve") || can("project.update")) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateAcceptanceStatus(a.id, "approved")}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Phê duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateAcceptanceStatus(a.id, "rejected")}
                          className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Từ chối
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewAcceptance(a)}
                      className="h-7 text-xs border-slate-300"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" />
                      In A4
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. TAB 6: THÀNH VIÊN DỰ ÁN */}
      {activeTab === "members" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-900">Đội ngũ tham gia dự án ({members.length})</span>
              <p className="text-[11px] text-slate-500">Phân công nhân sự chịu trách nhiệm và triển khai công trình</p>
            </div>
            {(can("project.assign") || can("project.update")) && (
              <Button
                size="sm"
                onClick={() => setIsAddMemberOpen(true)}
                className="h-7 text-xs bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Thêm thành viên
              </Button>
            )}
          </div>

          {membersLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Đang tải danh sách thành viên...
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Chưa có thành viên nào được phân công vào dự án. Bấm nút "Thêm thành viên" để phân công nhân sự.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-3 py-2">Thành viên</th>
                    <th className="px-3 py-2">Mã NV</th>
                    <th className="px-3 py-2">Điện thoại</th>
                    <th className="px-3 py-2">Vai trò trong dự án</th>
                    <th className="px-3 py-2">Ngày tham gia</th>
                    {(can("project.assign") || can("project.update")) && (
                      <th className="px-3 py-2 text-right">Thao tác</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {m.employeeName || m.userName || "Chưa có tên"}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {m.employeeCode || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {m.employeePhone || "-"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-blue-700">
                        {m.duty || "Thành viên"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {m.validFrom ? new Date(m.validFrom).toLocaleDateString("vi-VN") : "-"}
                      </td>
                      {(can("project.assign") || can("project.update")) && (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Gỡ khỏi dự án"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL ĐỔI GIAI ĐOẠN DỰ ÁN */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title="Chuyển Giai Đoạn Dự Án"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">Chọn giai đoạn tiếp theo cho dự án:</p>
          <div className="grid grid-cols-2 gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStageToChange(s.id)}
                className={cn(
                  "p-2.5 rounded-lg border text-left font-medium transition-colors",
                  selectedStageToChange === s.id
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                )}
              >
                {s.step}. {s.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStageModalOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              onClick={() => selectedStageToChange && confirmUpdateStatus(selectedStageToChange)}
              disabled={updatingStage || !selectedStageToChange}
              className="bg-blue-600 text-white text-xs"
            >
              {updatingStage ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL GIAO VIỆC */}
      <Modal
        isOpen={Boolean(assigningTask)}
        onClose={() => setAssigningTask(null)}
        title="Giao Việc Cho Nhân Sự"
      >
        {assigningTask && (
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500">Đầu việc:</span>{" "}
              <strong className="text-slate-900">{assigningTask.title}</strong>
            </div>

            <div>
              <label className="block font-semibold mb-1">Chọn nhân sự:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="">-- Chưa giao ai --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setAssigningTask(null)} className="text-xs">
                Hủy
              </Button>
              <Button onClick={handleSaveAssignee} disabled={savingAssignee} className="bg-blue-600 text-white text-xs">
                {savingAssignee ? "Đang lưu..." : "Lưu phân công"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL THÊM ĐẦU VIỆC VÀO GIAI ĐOẠN */}
      <Modal
        isOpen={Boolean(createTaskParent)}
        onClose={() => setCreateTaskParent(null)}
        title={`Thêm việc vào: ${createTaskParent?.title || ""}`}
      >
        <form onSubmit={handleCreateSubTask} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Tên đầu việc *</label>
            <Input
              required
              placeholder="VD: Cắt phay alu theo bản vẽ"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold">Giao nhân sự</label>
              <select
                value={newTaskEmployeeId}
                onChange={(e) => setNewTaskEmployeeId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="">-- Chưa giao ai --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Hạn hoàn thành</label>
              <Input
                type="date"
                value={newTaskDueAt}
                onChange={(e) => setNewTaskDueAt(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCreateTaskParent(null)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingNewTask} className="bg-blue-600 text-white text-xs">
              {savingNewTask ? "Đang lưu..." : "Tạo việc"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL THÊM GIAI ĐOẠN LỚN WBS */}
      <Modal
        isOpen={isCreateStageOpen}
        onClose={() => setIsCreateStageOpen(false)}
        title="Thêm Giai Đoạn Lớn WBS (Milestone)"
      >
        <form onSubmit={handleCreateTopLevelStage} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Tên giai đoạn lớn *</label>
            <Input
              required
              placeholder="VD: Giai đoạn 1: Khảo sát & Đo đạc hiện trạng"
              value={newStageTitle}
              onChange={(e) => setNewStageTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Giai đoạn lớn dùng để gom nhóm các công việc con và tự động tính tiến độ lũy kế theo trọng số.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreateStageOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingStage} className="bg-blue-600 text-white text-xs">
              {savingStage ? "Đang tạo..." : "Tạo giai đoạn"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL SỬA CÔNG VIỆC WBS */}
      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Chỉnh Sửa Công Việc WBS"
      >
        {editingTask && (
          <form onSubmit={handleSaveEditTask} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold">Tên công việc / Giai đoạn *</label>
              <Input
                required
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold">Trọng số WBS</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editTaskWeight}
                  onChange={(e) => setEditTaskWeight(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold">Hạn hoàn thành</label>
                <Input
                  type="date"
                  value={editTaskDueAt}
                  onChange={(e) => setEditTaskDueAt(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditingTask(null)} className="text-xs">
                Hủy
              </Button>
              <Button type="submit" disabled={savingEditTask} className="bg-blue-600 text-white text-xs">
                {savingEditTask ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL XÓA CÔNG VIỆC WBS */}
      <Modal
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        title="Xác Nhận Xóa Công Việc"
      >
        {deletingTask && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Bạn có chắc chắn muốn xóa công việc <strong className="text-slate-900">{deletingTask.title}</strong>?
            </p>
            <p className="text-rose-600 font-medium">
              Lưu ý: Nếu đây là giai đoạn lớn, toàn bộ các công việc con bên trong cũng sẽ bị xóa. Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDeletingTask(null)} className="text-xs">
                Hủy
              </Button>
              <Button
                onClick={handleConfirmDeleteTask}
                disabled={deletingTaskLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                {deletingTaskLoading ? "Đang xóa..." : "Xác nhận xóa"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL SỬA THÔNG TIN DỰ ÁN */}
      <Modal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        title="Chỉnh Sửa Thông Tin Dự Án"
      >
        <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Tên công trình / Dự án *</label>
            <Input
              required
              value={editProjectData.name}
              onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold">Khách hàng *</label>
              <select
                required
                value={editProjectData.customerId}
                onChange={(e) => setEditProjectData({ ...editProjectData, customerId: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold">Chỉ huy trưởng (PM)</label>
              <select
                value={editProjectData.managerMembershipId}
                onChange={(e) => setEditProjectData({ ...editProjectData, managerMembershipId: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="">-- Chưa chỉ định --</option>
                {employees
                  .filter((emp) => emp.membershipId)
                  .map((emp) => (
                    <option key={emp.id} value={emp.membershipId!}>
                      {emp.name} ({emp.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold">Địa chỉ thi công</label>
            <Input
              value={editProjectData.address}
              onChange={(e) => setEditProjectData({ ...editProjectData, address: e.target.value })}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold">Ngày khởi công</label>
              <Input
                type="date"
                value={editProjectData.startDate}
                onChange={(e) => setEditProjectData({ ...editProjectData, startDate: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold">Hạn bàn giao</label>
              <Input
                type="date"
                value={editProjectData.dueDate}
                onChange={(e) => setEditProjectData({ ...editProjectData, dueDate: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditProjectOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingProject} className="bg-blue-600 text-white text-xs">
              {savingProject ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL THÊM THÀNH VIÊN VÀO DỰ ÁN */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Thêm Thành Viên Vào Dự Án"
      >
        <form onSubmit={handleAddMember} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Chọn nhân sự *</label>
            <select
              required
              value={newMemberMembershipId}
              onChange={(e) => setNewMemberMembershipId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
            >
              <option value="">-- Chọn nhân sự --</option>
              {employees
                .filter((emp) => emp.membershipId)
                .map((emp) => (
                  <option key={emp.id} value={emp.membershipId!}>
                    {emp.name} ({emp.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold">Vai trò trong dự án *</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
            >
              <option value="Chỉ huy trưởng">Chỉ huy trưởng (PM)</option>
              <option value="Kỹ thuật xưởng">Kỹ thuật xưởng gia công</option>
              <option value="Kỹ thuật hiện trường">Kỹ thuật hiện trường</option>
              <option value="Thợ lắp dựng">Thợ lắp dựng</option>
              <option value="Giám sát an toàn">Giám sát an toàn</option>
              <option value="Thiết kế">Thiết kế 2D/3D</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingMember} className="bg-blue-600 text-white text-xs">
              {savingMember ? "Đang thêm..." : "Thêm vào dự án"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL LẬP BIÊN BẢN NGHIỆM THU */}
      <Modal
        isOpen={isAcceptanceOpen}
        onClose={() => setIsAcceptanceOpen(false)}
        title="Lập Biên Bản Nghiệm Thu & Bàn Giao"
      >
        <form onSubmit={handleCreateAcceptance} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Họ tên người đại diện khách hàng ký *</label>
            <Input
              required
              placeholder="VD: Trần Anh Quân"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
            Xác nhận nghiệm thu: Công trình thi công đúng kích thước, hoàn thiện đạt chuẩn chất lượng và đã dọn dẹp sạch sẽ mặt bằng bàn giao.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsAcceptanceOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={creatingAcceptance} className="bg-emerald-600 text-white text-xs">
              {creatingAcceptance ? "Đang lưu..." : "Ký nghiệm thu"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL THÊM BÁO CÁO HIỆN TRƯỜNG */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Thêm Báo Cáo Hiện Trường"
      >
        <form onSubmit={handleCreateReport} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Nhân sự báo cáo</label>
            <select
              value={newReportEmployeeId}
              onChange={(e) => setNewReportEmployeeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
            >
              <option value="">-- Mặc định (Tài khoản hiện tại) --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold">Nội dung ca làm việc *</label>
            <textarea
              required
              rows={3}
              value={newReportText}
              onChange={(e) => setNewReportText(e.target.value)}
              placeholder="VD: Đã lắp dựng hoàn tất khung xương alu mặt tiền..."
              className="mt-1 w-full rounded border border-slate-300 p-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold">Vật tư tiêu hao / phát sinh</label>
            <Input
              value={newReportMaterials}
              onChange={(e) => setNewReportMaterials(e.target.value)}
              placeholder="VD: 15 bu-lông mạ kẽm, 2 tuýp keo Apollo..."
              className="mt-1 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsReportModalOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingReport} className="bg-slate-900 text-white text-xs">
              {savingReport ? "Đang gửi..." : "Gửi báo cáo"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL LIGHTBOX ẢNH */}
      <Modal
        isOpen={Boolean(lightboxPhoto)}
        onClose={() => setLightboxPhoto(null)}
        title={lightboxPhoto?.stage || "Chi tiết ảnh"}
      >
        {lightboxPhoto && (
          <div className="space-y-3 text-xs">
            <div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
              <img src={lightboxPhoto.url} alt={lightboxPhoto.stage} className="max-h-[60vh] object-contain" />
            </div>
            <p className="text-slate-700">{lightboxPhoto.desc}</p>
            <span className="text-slate-400 block">{lightboxPhoto.date}</span>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setLightboxPhoto(null)} className="text-xs">
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL IN BIÊN BẢN A4 */}
      <Modal
        isOpen={Boolean(previewAcceptance)}
        onClose={() => setPreviewAcceptance(null)}
        title="Biên Bản Nghiệm Thu A4"
      >
        {previewAcceptance && (
          <div className="space-y-4 text-xs font-sans">
            <div className="border border-slate-300 p-6 rounded bg-white space-y-3">
              <div className="text-center pb-2 border-b border-slate-200">
                <div className="font-bold text-[10px] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold text-[10px] underline">Độc lập - Tự do - Hạnh phúc</div>
                <h3 className="font-bold text-sm uppercase mt-2">BIÊN BẢN BÀN GIAO & NGHIỆM THU</h3>
                <span className="font-mono text-slate-500 text-[10px]">{previewAcceptance.code}</span>
              </div>
              <p><strong>Công trình:</strong> {project.name}</p>
              <p><strong>Khách hàng:</strong> {project.customerName}</p>
              <p><strong>Địa chỉ:</strong> {project.address}</p>
              <p><strong>Người đại diện ký:</strong> {previewAcceptance.customerSignerName}</p>

              <div className="grid grid-cols-2 gap-8 pt-6 text-center">
                <div>
                  <div className="font-bold">ĐẠI DIỆN THI CÔNG</div>
                  <div className="h-10 flex items-center justify-center italic text-blue-600">Đã ký</div>
                </div>
                <div>
                  <div className="font-bold">ĐẠI DIỆN KHÁCH HÀNG</div>
                  <div className="h-10 flex items-center justify-center italic text-emerald-600">
                    {previewAcceptance.customerSignerName}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewAcceptance(null)} className="text-xs">
                Đóng
              </Button>
              <Button onClick={() => window.print()} className="bg-slate-900 text-white text-xs">
                <Printer className="w-3.5 h-3.5 mr-1" />
                In biên bản
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
