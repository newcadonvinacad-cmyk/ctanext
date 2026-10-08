"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Button,
  Badge,
  Input,
  Modal,
  Drawer,
  toast,
  FacetFilter,
  type FacetOption,
} from "@/components/ui";
import {
  ArrowLeft,
  Info,
  Sparkles,
  ArrowUpRight,
  HardHat,
  Activity,
  BarChart3,
  TrendingUp,
  LayoutDashboard,
  PieChart as PieChartIcon,
  ChevronUp,
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
  FileSpreadsheet,
  Upload,
  Compass,
  Zap,
  ShieldAlert,
  Wrench,
  Grid,
  PenTool,
  ChevronsDown,
  ChevronsUp,
  Eye,
  FolderKanban,
  Receipt,
  Wallet,
  CreditCard,
  FileCheck,
  UserPlus,
  Copy,
  Layers,
} from "lucide-react";
import type {
  ProjectDto,
  WbsTaskDto,
  AcceptanceDto,
  ProjectStatus,
  TaskStatus,
  TaskItemDto,
  ProjectMemberDto,
  ProjectMaterialDto,
  ProjectFinancialSummaryDto,
  WorkReportDetailDto,
} from "@/services/project.service";
import {
  SiteSurveyDto,
  DesignProofDto,
  FactoryQcDto,
  ServiceTicketDto,
} from "@/services/signage-phase2.service";
import type { ProjectBomDto } from "@/lib/signage-bom-calculator";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";
import { CreateStockDocModal } from "@/components/inventory/CreateStockDocModal";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { AiWorkReportModal } from "@/components/work-reports/AiWorkReportModal";
import { SUGGESTED_SIGNAGE_STAGES } from "@/constants/project-stages";

// PHÂN QUYỀN VAI TRÒ NỘI BỘ DỰ ÁN
interface ProjectRoleOption {
  key: "pm" | "leader" | "designer" | "worker" | "viewer";
  label: string;
  badgeClass: string;
  description: string;
}

const PROJECT_ROLES: ProjectRoleOption[] = [
  {
    key: "pm",
    label: "Chỉ huy trưởng (PM)",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Quản lý toàn diện dự án, phân công nhân sự, chuyển giai đoạn, duyệt nghiệm thu",
  },
  {
    key: "leader",
    label: "Đội trưởng thi công / Tổ trưởng",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Phụ trách hiện trường / xưởng, tạo việc con, giao việc cho thợ, nghiệm thu nội bộ",
  },
  {
    key: "designer",
    label: "Kỹ thuật & Thiết kế",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Khảo sát, thiết kế bản vẽ 2D/3D, market, bóc tách kỹ thuật vật tư",
  },
  {
    key: "worker",
    label: "Thợ thi công / Kỹ thuật viên",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Thực hiện công việc được giao, báo cáo tiến độ, check-in hiện trường",
  },
  {
    key: "viewer",
    label: "Giám sát viên (Chỉ xem)",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
    description: "Theo dõi tiến độ, xem hồ sơ kỹ thuật, không có quyền chỉnh sửa",
  },
];

function getProjectRoleInfo(duty?: string | null): ProjectRoleOption {
  if (!duty) return PROJECT_ROLES[3]; // worker default
  const lower = duty.toLowerCase();
  if (lower.includes("pm") || lower.includes("chỉ huy") || lower.includes("quản lý")) {
    return PROJECT_ROLES[0];
  }
  if (lower.includes("leader") || lower.includes("đội trưởng") || lower.includes("tổ trưởng")) {
    return PROJECT_ROLES[1];
  }
  if (lower.includes("design") || lower.includes("thiết kế") || lower.includes("kỹ thuật") || lower.includes("market")) {
    return PROJECT_ROLES[2];
  }
  if (lower.includes("view") || lower.includes("giám sát") || lower.includes("khách")) {
    return PROJECT_ROLES[4];
  }
  return PROJECT_ROLES[3];
}

// 8 GIAI ĐOẠN CHUẨN DỰ ÁN
const STAGES: { id: ProjectStatus; step: number; label: string }[] = [
  { id: "survey", step: 1, label: "Khảo sát" },
  { id: "planning", step: 2, label: "Thiết kế & WBS" },
  { id: "production", step: 3, label: "Gia công xưởng" },
  { id: "transport", step: 4, label: "Vận chuyển" },
  { id: "installation", step: 5, label: "Lắp dựng" },
  { id: "acceptance", step: 6, label: "Nghiệm thu" },
  { id: "warranty", step: 7, label: "Bảo hành & Sự cố" },
  { id: "completed", step: 8, label: "Hoàn tất dự án" },
];

const STAGE_ORDER: ProjectStatus[] = [
  "survey",
  "planning",
  "production",
  "transport",
  "installation",
  "acceptance",
  "warranty",
  "completed",
];

const STAGE_MAP: Record<string, { label: string; color: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  survey: { label: "Khảo sát", color: "warning" },
  planning: { label: "Thiết kế & WBS", color: "info" },
  production: { label: "Gia công xưởng", color: "info" },
  transport: { label: "Vận chuyển", color: "info" },
  installation: { label: "Lắp dựng", color: "warning" },
  acceptance: { label: "Chờ nghiệm thu", color: "success" },
  warranty: { label: "Bảo hành & Sự cố", color: "warning" },
  completed: { label: "Hoàn tất", color: "success" },
  cancelled: { label: "Đã hủy", color: "danger" },
};


type ProjectDetailTab =
  | "dashboard"
  | "wbs"
  | "design"
  | "production"
  | "finance"
  | "documents"
  | "members";

const STAGE_DETAILS: Record<
  string,
  {
    step: number;
    title: string;
    desc: string;
    checklist: string[];
    relevantTab: ProjectDetailTab;
  }
> = {
  survey: {
    step: 1,
    title: "Khảo sát mặt bằng & Đo đạc",
    desc: "Khảo sát hiện trạng công trình, đo đạc kích thước thực tế, kiểm tra vị trí dầm chịu lực, đường nguồn điện và lập phương án thi công sơ bộ.",
    checklist: [
      "Đo đạc chính xác kích thước dài x rộng x cao mặt tiền",
      "Chụp ảnh hiện trường trước khi thi công (Stage 1)",
      "Kiểm tra kết cấu chịu lực và phương án neo dầm",
      "Xác định vị trí nguồn điện đấu nối và phụ tải",
    ],
    relevantTab: "design",
  },
  planning: {
    step: 2,
    title: "Thiết kế 2D/3D & Kế hoạch WBS",
    desc: "Lập bản vẽ 2D/3D phối cảnh, duyệt mẫu vật liệu, lập cây công việc WBS và kế hoạch thi công.",
    checklist: [
      "Bản vẽ 2D kỹ thuật và 3D phối cảnh đã duyệt",
      "Lập cây công việc WBS chi tiết cho các tổ đội",
      "Ký kết hợp đồng kinh tế và nhận tạm ứng đợt 1",
    ],
    relevantTab: "wbs",
  },
  production: {
    step: 3,
    title: "Gia công & Sản xuất tại xưởng",
    desc: "Xuất kho vật tư, gia công khung sắt mạ kẽm, cắt phay alu, uốn chân chữ nổi inox/mica, gắn module LED nguồn và kiểm thử độ sáng tại xưởng.",
    checklist: [
      "Tạo phiếu xuất kho vật tư (M09) cho công trình",
      "Hàn khung thép kết cấu và sơn chống gỉ",
      "Gia công mặt chữ, gắn LED và chạy test kiểm tra độ sáng",
      "Nghiệm thu nội bộ tại xưởng trước khi xuất kho",
    ],
    relevantTab: "production",
  },
  transport: {
    step: 4,
    title: "Đóng gói & Vận chuyển",
    desc: "Bọc màng PE chống xước bề mặt, kiểm đếm số lượng phụ kiện, bốc dỡ lên xe tải và điều phối lộ trình giao hàng đến công trình.",
    checklist: [
      "Bọc bảo vệ bề mặt chữ và tấm ốp alu",
      "Kiểm tra đầy đủ bu-lông, phụ kiện và nguồn LED dự phòng",
      "Điều xe tải chuyên dụng và phân công tài xế giao nhận",
      "Giao hàng đến chân công trình an toàn, đúng giờ",
    ],
    relevantTab: "production",
  },
  installation: {
    step: 5,
    title: "Lắp đặt & Thi công hiện trường",
    desc: "Cẩu lắp biển hiệu vào vị trí kết cấu dầm, bắn bu-lông neo vững chắc, đấu nối hệ thống điện an toàn và gửi nhật ký báo cáo hàng ngày.",
    checklist: [
      "Bảo đảm an toàn lao động và dây an toàn khi làm việc trên cao",
      "Cố định chắc chắn vào kết cấu chịu lực",
      "Đấu nối nguồn điện 12V/220V qua aptomat chống giật",
      "Gửi nhật ký hiện trường kèm ảnh minh chứng hàng ngày",
    ],
    relevantTab: "documents",
  },
  acceptance: {
    step: 6,
    title: "Nghiệm thu & Bàn giao",
    desc: "Chụp ảnh hiện trường hoàn thiện, kiểm tra các tiêu chuẩn kỹ thuật với đại diện khách hàng và ký kết biên bản bàn giao chính thức.",
    checklist: [
      "Chụp ảnh toàn cảnh biển hiệu ban ngày và ban đêm khi bật đèn",
      "Vệ sinh sạch sẽ bề mặt biển và mặt bằng thi công",
      "Lập và ký kết Biên bản nghiệm thu & bàn giao",
      "Quyết toán công nợ và kích hoạt bảo hành",
    ],
    relevantTab: "documents",
  },
  warranty: {
    step: 7,
    title: "Bảo hành & Xử lý sự cố",
    desc: "Theo dõi cam kết bảo hành công trình, tiếp nhận phản ánh lỗi kỹ thuật, phân công thợ xử lý và đóng ticket sự cố.",
    checklist: [
      "Kích hoạt sổ bảo hành điện tử theo điều khoản hợp đồng",
      "Tiếp nhận và lập ticket sự cố khi có phản ánh từ khách hàng",
      "Phân công kỹ thuật viên đến hiện trường kiểm tra, thay thế linh kiện",
      "Nghiệm thu sau khắc phục sự cố và cập nhật sổ bảo hành",
    ],
    relevantTab: "documents",
  },
  completed: {
    step: 8,
    title: "Dự án hoàn tất",
    desc: "Công trình đã hoàn thành toàn diện, khách hàng đã thanh toán đầy đủ và chuyển sang giai đoạn bảo hành bảo trì định kỳ.",
    checklist: [
      "Đã thu đủ 100% công nợ theo hợp đồng",
      "Lưu trữ toàn bộ hồ sơ nghiệm thu và nhật ký",
    ],
    relevantTab: "documents",
  },
};


interface ProjectOwnerDashboardProps {
  project: ProjectDto;
  tasks: WbsTaskDto[];
  finance: ProjectFinancialSummaryDto | null;
  materials: ProjectMaterialDto[];
  fieldReports: WorkReportDetailDto[];
  members: ProjectMemberDto[];
  handleTabChange: (tab: any) => void;
  isMounted: boolean;
  onOpenChangeStage?: () => void;
  onOpenEditProject?: () => void;
  canUpdateProject?: boolean;
}

function ProjectOwnerDashboard({
  project,
  tasks,
  finance,
  materials,
  fieldReports,
  members,
  handleTabChange,
  isMounted,
  onOpenChangeStage,
  onOpenEditProject,
  canUpdateProject,
}: ProjectOwnerDashboardProps) {
  // 1. Phân rã toàn bộ cây WBS
  const allTasks = React.useMemo(() => {
    const list: WbsTaskDto[] = [];
    tasks.forEach((parent) => {
      list.push(parent);
      if (parent.children) {
        list.push(...parent.children);
      }
    });
    return list;
  }, [tasks]);

  const tasksDone = allTasks.filter((t) => t.status === "done").length;
  const tasksDoing = allTasks.filter((t) => t.status === "doing").length;
  const tasksTodo = allTasks.filter((t) => t.status === "todo").length;
  const totalTasksCount = allTasks.length || 1;
  const taskCompletionRate = Math.round((tasksDone / totalTasksCount) * 100);

  // 2. Tính số ngày đến hạn bàn giao
  const daysLeft = project.dueDate
    ? Math.ceil((new Date(project.dueDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 3600 * 24))
    : null;

  // 3. Công việc quá hạn
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = allTasks.filter(
    (t) => t.status !== "done" && t.dueAt && t.dueAt < todayStr
  );

  // 4. Dữ liệu biểu đồ trạng thái (Donut Chart)
  const taskDistributionData = [
    { name: "Hoàn thành", value: tasksDone, color: "#10B981" },
    { name: "Đang làm", value: tasksDoing, color: "#3B82F6" },
    { name: "Chờ làm", value: tasksTodo, color: "#94A3B8" },
  ].filter((d) => d.value > 0);

  // 5. Dữ liệu tiến độ từng đầu việc lớn (BarChart)
  const stageProgressData = tasks.map((t) => ({
    name: t.title.length > 16 ? t.title.slice(0, 15) + "…" : t.title,
    fullName: t.title,
    progress: t.progressPercent,
    status: t.status,
    subTaskCount: t.children?.length || 0,
  }));

  // 6. Dữ liệu cân đối tài chính
  const financialData = [
    { name: "Hợp đồng", amount: finance?.contractTotal || 0, fill: "#3B82F6" },
    { name: "Đã thu", amount: finance?.receiptsTotal || 0, fill: "#10B981" },
    { name: "Chi phí", amount: (finance?.materialCost || 0) + (finance?.disbursementsTotal || 0), fill: "#F43F5E" },
    { name: "Lãi gộp", amount: Math.max(0, finance?.grossProfit || 0), fill: "#8B5CF6" },
  ];

  const totalMaterialIssued = materials.reduce((s, m) => s + (m.issuedQty || 0), 0);

  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);
  };

  const formatCompactVnd = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
    return `${value}`;
  };

  return (
    <div className="space-y-4">
      {/* THANH ĐIỀU HÀNH DỰ ÁN TRÊN DASHBOARD: ĐỔI TRẠNG THÁI & SỬA DỰ ÁN */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase">Trạng thái dự án:</span>
            {onOpenChangeStage ? (
              <button
                type="button"
                onClick={onOpenChangeStage}
                disabled={!canUpdateProject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition shadow-2xs"
                title="Bấm để chuyển giai đoạn dự án"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>{STAGE_MAP[project.status]?.label || project.status}</span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-700" />
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                {STAGE_MAP[project.status]?.label || project.status}
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Tiến độ WBS:</span>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
            <strong className="font-mono text-slate-900">{project.progressPercent}%</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdateProject && onOpenEditProject && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenEditProject}
              className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Sửa thông tin dự án</span>
            </Button>
          )}
        </div>
      </div>

      {/* HÀNG 1: 4 CARDS CHỈ SỐ TỔNG HỢP ĐIỀU HÀNH DỰ ÁN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tiến độ & Chặng hiện tại */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tiến độ WBS
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {project.progressPercent}%
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {STAGE_MAP[project.status]?.label || project.status}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2 border border-slate-200">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>Hạn bàn giao:</span>
              {daysLeft == null ? (
                <span className="font-medium text-slate-600">Chưa đặt</span>
              ) : daysLeft < 0 ? (
                <span className="font-bold text-rose-600">Quá hạn {Math.abs(daysLeft)} ngày</span>
              ) : daysLeft === 0 ? (
                <span className="font-bold text-amber-600">Hôm nay là hạn chót</span>
              ) : daysLeft <= 3 ? (
                <span className="font-semibold text-amber-600">Còn {daysLeft} ngày</span>
              ) : (
                <span className="font-semibold text-emerald-600">Còn {daysLeft} ngày</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Khối lượng công việc WBS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Khối lượng WBS
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {tasksDone}/{allTasks.length}
              </span>
              <span className="text-xs text-slate-500">việc đã xong</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2 border border-slate-200">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2">
              <span className="text-blue-600 font-semibold">{tasksDoing} đang làm</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">{tasksTodo} chờ làm</span>
              {overdueTasks.length > 0 && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-rose-600 font-bold">! {overdueTasks.length} trễ</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Tài chính & Lợi nhuận P&L */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lãi gộp ước tính
            </span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-xl sm:text-2xl font-bold font-mono",
                (finance?.grossProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {finance ? formatCurrency(finance.grossProfit) : "0 ₫"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Hợp đồng:</span>
              <strong className="text-slate-900 font-mono">
                {finance ? formatCurrency(finance.contractTotal) : "0 ₫"}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100">
              <span className="text-slate-500">Đã thu:</span>
              <span className="font-mono font-semibold text-emerald-600">
                {finance ? formatCurrency(finance.receiptsTotal) : "0 ₫"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Nguồn lực & Hiện trường */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Nguồn lực & Thi công
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <HardHat className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {members.length}
              </span>
              <span className="text-xs text-slate-500">nhân sự tham gia</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Vật tư xuất kho:</span>
              <strong className="text-blue-700 font-mono">
                {materials.length} loại ({totalMaterialIssued.toLocaleString("vi-VN")} đv)
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100">
              <span className="text-slate-500">Nhật ký hiện trường:</span>
              <span className="font-mono font-semibold text-slate-800">
                {fieldReports.length} báo cáo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HÀNG 2: 2 BIỂU ĐỒ RECHARTS (TIẾN ĐỘ ĐẦU VIỆC LỚN + CƠ CẤU TRẠNG THÁI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Biểu đồ 1: Tiến độ các đầu việc lớn (8 cols) */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Tiến độ thực hiện theo từng Đầu việc chính (WBS)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Theo dõi % hoàn thành của từng chặng đầu việc lớn để phát hiện điểm nghẽn
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange("wbs")}
              className="h-7 text-[11px] gap-1 text-slate-600"
            >
              <span>Xem chi tiết WBS</span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="h-64 w-full">
            {!isMounted ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Đang chuẩn bị biểu đồ...
              </div>
            ) : stageProgressData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed rounded-lg">
                Chưa có đầu việc WBS nào
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageProgressData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    angle={-15}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                            <strong className="block font-semibold">{data.fullName}</strong>
                            <div className="flex items-center gap-2">
                              <span>Tiến độ:</span>
                              <strong className="text-emerald-400 font-mono">{data.progress}%</strong>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Gồm {data.subTaskCount} việc nhỏ
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                    {stageProgressData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.progress === 100
                            ? "#10B981"
                            : entry.progress > 0
                            ? "#3B82F6"
                            : "#CBD5E1"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Biểu đồ 2: Cơ cấu trạng thái công việc Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              <span>Phân bổ trạng thái công việc</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tỷ lệ hoàn thành so với tổng số {allTasks.length} đầu việc
            </p>
          </div>

          <div className="h-64 w-full relative">
            {!isMounted ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Đang chuẩn bị biểu đồ...
              </div>
            ) : taskDistributionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed rounded-lg">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskDistributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {taskDistributionData.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded text-xs shadow-md">
                            <span>{data.name}: </span>
                            <strong className="font-mono">{data.value} việc</strong>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Label trung tâm Donut */}
            {isMounted && taskDistributionData.length > 0 && (
              <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-slate-800 block leading-tight">
                  {taskCompletionRate}%
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Đã xong
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HÀNG 3: BIỂU ĐỒ TÀI CHÍNH + DANH SÁCH VIỆC ĐANG LÀM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Biểu đồ Cân đối Tài chính Dự án (6 cols) */}
        <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Cân đối Tài chính Dự án (Thu - Chi - Lãi)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                So sánh giá trị hợp đồng, số tiền thực thu, giá vốn và lợi nhuận gộp
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange("finance")}
              className="h-7 text-[11px] gap-1 text-slate-600"
            >
              <span>Xem sổ quỹ</span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="h-56 w-full">
            {!isMounted ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Đang chuẩn bị biểu đồ...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={formatCompactVnd}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), "Số tiền"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {financialData.map((entry, index) => (
                      <Cell key={`fin-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Danh sách việc đang làm (6 cols) */}
        <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Việc đang triển khai ({tasksDoing})</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Các đầu việc các đội thợ đang trực tiếp thi công
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange("wbs")}
              className="h-7 text-[11px] gap-1 text-slate-600"
            >
              <span>Xem WBS</span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {allTasks.filter((t) => t.status === "doing").length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                Hiện không có công việc nào ở trạng thái &quot;Đang làm&quot;
              </div>
            ) : (
              allTasks
                .filter((t) => t.status === "doing")
                .slice(0, 5)
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 rounded">
                          {t.code}
                        </span>
                        <strong className="text-slate-800 truncate block">{t.title}</strong>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span>
                          Phụ trách:{" "}
                          <strong className="text-slate-700">
                            {t.assignees?.map((a) => a.name).join(", ") || "Chưa giao"}
                          </strong>
                        </span>
                        {t.dueAt && <span>• Hạn: {t.dueAt}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-blue-600 block">{t.progressPercent}%</span>
                      <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${t.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { can, user, roles } = useAuthorization();

  // Dữ liệu cốt lõi
  const [project, setProject] = React.useState<ProjectDto | null>(null);
  const [tasks, setTasks] = React.useState<WbsTaskDto[]>([]);
  const [employees, setEmployees] = React.useState<{ id: string; code: string; name: string; phone: string | null; membershipId?: string | null }[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [acceptances, setAcceptances] = React.useState<AcceptanceDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Tabs điều hướng (Hỗ trợ 10 Tabs chuyên sâu theo vòng đời công trình)
  const [activeTab, setActiveTab] = React.useState<ProjectDetailTab>("dashboard");

  // Lọc WBS theo chuẩn FacetFilter như trang /cong-viec
  const [wbsSearch, setWbsSearch] = React.useState("");
  const [wbsEmployeeFilters, setWbsEmployeeFilters] = React.useState<string[]>([]);
  const [wbsStatusFilters, setWbsStatusFilters] = React.useState<string[]>([]);
  const [wbsTypeFilters, setWbsTypeFilters] = React.useState<string[]>([]);
  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({});
  const [isProjectInfoExpanded, setIsProjectInfoExpanded] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Phase 2: Khảo sát hiện trường & Market 2D/3D
  const [projectSurveys, setProjectSurveys] = React.useState<SiteSurveyDto[]>([]);
  const [isCreateSurveyOpen, setIsCreateSurveyOpen] = React.useState(false);
  const [creatingSurvey, setCreatingSurvey] = React.useState(false);
  const [surveyFormData, setSurveyFormData] = React.useState({
    title: "",
    address: "",
    surveyDate: new Date().toISOString().split("T")[0],
    surveyorEmployeeId: "",
    widthMeters: 8.0,
    heightMeters: 2.0,
    depthMeters: 0.3,
    floorLevel: "Tầng 1 mặt tiền",
    elevationMeters: 3.5,
    structureType: "Dầm bê tông chịu lực",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 10,
    installationMethod: "Giàn giáo 2 tầng",
    obstacles: "",
    notes: "",
    // Các trường phân loại & chi tiết chuẩn Nippon Paint:
    regionKV: "MIỀN TÂY" as "HCM" | "MIỀN TÂY" | "MIỀN ĐÔNG" | "MIỀN TRUNG" | string,
    workType: "BẢNG HIỆU" as "BẢNG HIỆU" | "SỬA CHỮA MIỀN TÂY" | "KHẢO SÁT" | "THÙNG RỖNG" | string,
    dealerName: "",
    dealerPhone: "",
    dealerAddress: "",
    signMaterial: "Bảng alu ngoài trời",
    hasMicaLogo65: true,
    hasSideTrim: true,
    hasColorStrip: true,
    subAccessories: "Thay mica logo 65x65, lườn, thay dải màu",
    displayShelves: "",
    furniture: "",
    otherPosm: "",
    repairScope: "",
    surveyScope: "ks bảng",
    executionStatus: "đang chốt",
    deliverySchedule: "",
    siteNotes: "",
  });
  const [designProofs, setDesignProofs] = React.useState<DesignProofDto[]>([]);
  const [proofsLoading, setProofsLoading] = React.useState(false);
  const [isUploadProofOpen, setIsUploadProofOpen] = React.useState(false);
  const [newProofTitle, setNewProofTitle] = React.useState("");
  const [newProofFileUrl, setNewProofFileUrl] = React.useState("");
  const [newProofBg, setNewProofBg] = React.useState("Alu Alcorest 3mm EV2002");
  const [newProofLetter, setNewProofLetter] = React.useState("Inox vàng gương 304 uốn nổi lọng mica");
  const [newProofLed, setNewProofLed] = React.useState("Module LED 3 mắt Hàn Quốc 12V 3000K");
  const [newProofPower, setNewProofPower] = React.useState("Nguồn Meanwell ngoài trời 12V 350W IP67");
  const [savingProof, setSavingProof] = React.useState(false);
  const [editingSurveyId, setEditingSurveyId] = React.useState<string | null>(null);
  const [editingProof, setEditingProof] = React.useState<DesignProofDto | null>(null);
  const [isEditProofOpen, setIsEditProofOpen] = React.useState(false);
  const [editProofTitle, setEditProofTitle] = React.useState("");
  const [editProofVersionNo, setEditProofVersionNo] = React.useState(1);
  const [editProofBg, setEditProofBg] = React.useState("");
  const [editProofLetter, setEditProofLetter] = React.useState("");
  const [editProofLed, setEditProofLed] = React.useState("");
  const [editProofPower, setEditProofPower] = React.useState("");
  const [editProofStatus, setEditProofStatus] = React.useState("pending");
  const [editProofFeedback, setEditProofFeedback] = React.useState("");
  const [savingEditProof, setSavingEditProof] = React.useState(false);

  // Phase 2: KCS & QC Xuất xưởng (Aging test sáng đèn)
  const [qcRecords, setQcRecords] = React.useState<FactoryQcDto[]>([]);
  const [qcLoading, setQcLoading] = React.useState(false);
  const [isCreateQcOpen, setIsCreateQcOpen] = React.useState(false);
  const [newQcAgingHours, setNewQcAgingHours] = React.useState(4.0);
  const [newQcInspectorId, setNewQcInspectorId] = React.useState("");
  const [newQcDefectNotes, setNewQcDefectNotes] = React.useState("");
  const [savingQc, setSavingQc] = React.useState(false);

  // Phase 2: Sổ bảo hành & Ticket sự cố
  const [warrantyInfo, setWarrantyInfo] = React.useState<{
    warrantyMonths: number;
    warrantyUntil: string | null;
    maintenanceNotes: string | null;
    isUnderWarranty: boolean;
    ticketsCount: number;
  } | null>(null);
  const [warrantyTickets, setWarrantyTickets] = React.useState<ServiceTicketDto[]>([]);
  const [warrantyLoading, setWarrantyLoading] = React.useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = React.useState(false);
  const [newTicketTitle, setNewTicketTitle] = React.useState("");
  const [newTicketType, setNewTicketType] = React.useState<"led_power" | "structural" | "decal_acrylic" | "weather_damage" | "other">("led_power");
  const [newTicketPriority, setNewTicketPriority] = React.useState<"urgent" | "high" | "medium" | "low">("medium");
  const [savingTicket, setSavingTicket] = React.useState(false);

  // Phase 3: Bóc tách BOM & Ký số cảm ứng
  const [projectBoms, setProjectBoms] = React.useState<ProjectBomDto[]>([]);
  const [bomsLoading, setBomsLoading] = React.useState(false);
  const [signatureModalAcceptance, setSignatureModalAcceptance] = React.useState<AcceptanceDto | null>(null);

  // Quản lý chỉnh sửa & cập nhật định mức BOM
  const [editingBom, setEditingBom] = React.useState<ProjectBomDto | null>(null);
  const [isEditBomModalOpen, setIsEditBomModalOpen] = React.useState(false);
  const [savingBom, setSavingBom] = React.useState(false);
  const [editBomData, setEditBomData] = React.useState<{
    title: string;
    notes: string;
    items: Array<{
      category: string;
      itemCode: string;
      itemName: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      note?: string;
    }>;
  }>({
    title: "",
    notes: "",
    items: [],
  });

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
  const [isCreateStockDocOpen, setIsCreateStockDocOpen] = React.useState(false);

  // Tab 4: Tài chính & Thu chi P&L THẬT
  const [finance, setFinance] = React.useState<ProjectFinancialSummaryDto | null>(null);
  const [financeLoading, setFinanceLoading] = React.useState(false);

  // Tab 6: Thành viên dự án (Team)
  const [members, setMembers] = React.useState<ProjectMemberDto[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false);
  const [newMemberMembershipId, setNewMemberMembershipId] = React.useState("");
  const [newMemberRole, setNewMemberRole] = React.useState(PROJECT_ROLES[3].label);
  const [savingMember, setSavingMember] = React.useState(false);
  const [expandedMembers, setExpandedMembers] = React.useState<Record<string, boolean>>({});
  const [memberRoleFilter, setMemberRoleFilter] = React.useState<string>("all");
  const [memberSearch, setMemberSearch] = React.useState<string>("");

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

  // Modal Thêm Giai đoạn (Stage)
  const [isCreateStageOpen, setIsCreateStageOpen] = React.useState(false);
  const [selectedStandardStage, setSelectedStandardStage] = React.useState<string>("");
  const [newStageTitle, setNewStageTitle] = React.useState("");
  const [newStageDesc, setNewStageDesc] = React.useState("");
  const [newStageWeight, setNewStageWeight] = React.useState<number>(10);
  const [newStageDueAt, setNewStageDueAt] = React.useState("");
  const [newStageStartAt, setNewStageStartAt] = React.useState("");
  const [newStageIsField, setNewStageIsField] = React.useState(false);
  const [newStageAssigneeIds, setNewStageAssigneeIds] = React.useState<string[]>([]);
  const [newStageAssigneeSearch, setNewStageAssigneeSearch] = React.useState("");
  const [savingStage, setSavingStage] = React.useState(false);

  // Modal Thêm Thành viên dự án
  const [newMemberEmployeeId, setNewMemberEmployeeId] = React.useState("");

  // Modal Sửa chi tiết Task WBS
  const [editingTask, setEditingTask] = React.useState<WbsTaskDto | null>(null);
  const [editTaskTitle, setEditTaskTitle] = React.useState("");
  const [editTaskDesc, setEditTaskDesc] = React.useState("");
  const [editTaskWeight, setEditTaskWeight] = React.useState<number>(1);
  const [editTaskDueAt, setEditTaskDueAt] = React.useState("");
  const [editTaskStartAt, setEditTaskStartAt] = React.useState("");
  const [editTaskIsField, setEditTaskIsField] = React.useState(false);
  const [editTaskAssigneeIds, setEditTaskAssigneeIds] = React.useState<string[]>([]);
  const [editTaskAssigneeSearch, setEditTaskAssigneeSearch] = React.useState("");
  const [savingEditTask, setSavingEditTask] = React.useState(false);

  // Modal Xác nhận xóa Task WBS
  const [deletingTask, setDeletingTask] = React.useState<WbsTaskDto | null>(null);
  const [deletingTaskLoading, setDeletingTaskLoading] = React.useState(false);

  // Drawer chi tiết công việc WBS & Đánh giá AI
  const [selectedDetailTask, setSelectedDetailTask] = React.useState<TaskItemDto | null>(null);
  const [aiReportTask, setAiReportTask] = React.useState<TaskItemDto | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);

  const openTaskDetail = React.useCallback(
    (task: WbsTaskDto, parentTask?: WbsTaskDto) => {
      if (!project) return;
      const dto: TaskItemDto = {
        ...task,
        isField: Boolean(task.isField),
        projectCode: project.code,
        projectName: project.name,
        stageId: parentTask?.id || task.parentId || null,
        stageCode: parentTask?.code || null,
        stageName: parentTask?.title || null,
        createdAt: task.startAt || new Date().toISOString(),
      };
      setSelectedDetailTask(dto);
    },
    [project]
  );

  // Quản lý giai đoạn WBS
  const [selectedStageId, setSelectedStageId] = React.useState<string | "all">("all");
  const [isStageModalOpen, setIsStageModalOpen] = React.useState(false);
  const [selectedStageToChange, setSelectedStageToChange] = React.useState<ProjectStatus | null>(null);
  const [updatingStage, setUpdatingStage] = React.useState(false);
  const [stageGateConfirmed, setStageGateConfirmed] = React.useState(false);

  const [isAcceptanceOpen, setIsAcceptanceOpen] = React.useState(false);
  const [signerName, setSignerName] = React.useState("");
  const [creatingAcceptance, setCreatingAcceptance] = React.useState(false);

  const [assigningTask, setAssigningTask] = React.useState<WbsTaskDto | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = React.useState("");
  const [savingAssignee, setSavingAssignee] = React.useState(false);

  const [createTaskParent, setCreateTaskParent] = React.useState<WbsTaskDto | null>(null);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskDesc, setNewTaskDesc] = React.useState("");
  const [newTaskWeight, setNewTaskWeight] = React.useState<number>(1);
  const [newTaskDueAt, setNewTaskDueAt] = React.useState("");
  const [newTaskStartAt, setNewTaskStartAt] = React.useState("");
  const [newTaskIsField, setNewTaskIsField] = React.useState(false);
  const [newTaskEmployeeIds, setNewTaskEmployeeIds] = React.useState<string[]>([]);
  const [newTaskAssigneeSearch, setNewTaskAssigneeSearch] = React.useState("");
  const [savingNewTask, setSavingNewTask] = React.useState(false);

  // Xác định vai trò nội bộ của người dùng hiện tại trong dự án
  const currentUserProjectMember = React.useMemo(() => {
    if (!user) return null;
    return members.find(
      (m) =>
        (user.employeeId && m.employeeId === user.employeeId) ||
        (user.membershipId && m.membershipId === user.membershipId) ||
        (m.userName && user.name && m.userName.toLowerCase() === user.name.toLowerCase())
    );
  }, [user, members]);

  const userProjectRole = React.useMemo(() => {
    if (project?.managerMembershipId && user?.membershipId && project.managerMembershipId === user.membershipId) {
      return "pm";
    }
    if (currentUserProjectMember) {
      return getProjectRoleInfo(currentUserProjectMember.duty).key;
    }
    return null;
  }, [project, user, currentUserProjectMember]);

  const isSuperAdmin = Boolean(
    roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CEO"].includes(r.code.toUpperCase())
    ) ||
    (user as any)?.role === "admin" ||
    (user as any)?.role === "owner" ||
    user?.email?.toLowerCase().includes("admin")
  );

  const isProjectPM = isSuperAdmin || userProjectRole === "pm" || can("project.update");
  const isProjectLeader = userProjectRole === "leader" || isProjectPM;
  const isProjectDesigner = userProjectRole === "designer" || isProjectPM;
  const isProjectWorker = userProjectRole === "worker" || isProjectLeader || isProjectDesigner;
  const isProjectViewer = userProjectRole === "viewer" && !isProjectPM && !isProjectLeader;

  const canManageTasks = isSuperAdmin || ((can("task.update") || isProjectPM || isProjectLeader) && !isProjectViewer);
  const canCreateTasks = isSuperAdmin || ((can("task.create") || isProjectPM || isProjectLeader || isProjectDesigner) && !isProjectViewer);
  const canAssignTeam = isSuperAdmin || ((can("task.assign") || can("project.assign") || isProjectPM || isProjectLeader) && !isProjectViewer);

  // Modal Xác nhận Hoàn thành Task (Nghiệm thu hoàn thành)
  const [completingTask, setCompletingTask] = React.useState<WbsTaskDto | null>(null);
  const [completionTargetStatus, setCompletionTargetStatus] = React.useState<"awaiting_acceptance" | "done">("awaiting_acceptance");
  const [completionNotes, setCompletionNotes] = React.useState("");
  const [completionPhotoUrl, setCompletionPhotoUrl] = React.useState("");
  const [completionPhotoName, setCompletionPhotoName] = React.useState("");
  const [completionPhotoSize, setCompletionPhotoSize] = React.useState<number | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [isDragOverPhoto, setIsDragOverPhoto] = React.useState(false);
  const [savingCompletion, setSavingCompletion] = React.useState(false);
  const taskFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Ảnh 4 giai đoạn & Lightbox (Lấy từ dữ liệu thực tế của dự án)
  const [photos, setPhotos] = React.useState<Array<{
    id: string;
    stage: string;
    url: string;
    date: string;
    desc?: string;
  }>>([]);
  const [lightboxPhoto, setLightboxPhoto] = React.useState<any | null>(null);

  // Mẫu in A4
  const [previewAcceptance, setPreviewAcceptance] = React.useState<AcceptanceDto | null>(null);

  // Sync tab with URL khi mới mount
  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["dashboard", "wbs", "design", "production", "reports", "finance", "acceptance", "documents", "members"].includes(tabParam)) {
      const target = (tabParam === "reports" || tabParam === "acceptance" || tabParam === "qc") ? "documents" : tabParam;
      setActiveTab(target as ProjectDetailTab);
    }
  }, [searchParams]);

  // Chuyển tab siêu tốc (Zero-delay) dùng window.history.replaceState, không kích hoạt Next.js router cycle
  const handleTabChange = (t: string) => {
    const target = (t === "reports" || t === "acceptance" || t === "qc" || t === "warranty") ? "documents" : (t as ProjectDetailTab);
    setActiveTab(target);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", target);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // ==========================================
  // THU CHI DỰ ÁN & SỔ QUỸ (TỐI GIẢN MỞ RỘNG)
  // ==========================================
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = React.useState(false);
  const [paymentDirection, setPaymentDirection] = React.useState<"receipt" | "disbursement">("receipt");
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentPurpose, setPaymentPurpose] = React.useState("");
  const [paymentAccountId, setPaymentAccountId] = React.useState("");
  const [cashAccounts, setCashAccounts] = React.useState<Array<{ id: string; code: string; name: string; kind: string; balance?: number }>>([]);
  const [cashAccountsLoading, setCashAccountsLoading] = React.useState(false);
  const [savingPayment, setSavingPayment] = React.useState(false);

  const handleOpenCreatePayment = async (dir: "receipt" | "disbursement" = "receipt") => {
    setPaymentDirection(dir);
    setPaymentAmount("");
    setPaymentPurpose(dir === "receipt" ? "Thu tiền thanh toán công trình" : "Chi mua vật tư / Khoán thợ hiện trường");
    setIsCreatePaymentOpen(true);
    if (cashAccounts.length === 0) {
      try {
        setCashAccountsLoading(true);
        const res = await fetch("/api/finance/accounts");
        if (res.ok) {
          const data = await res.json();
          const accs = data.accounts || [];
          setCashAccounts(accs);
          if (accs.length > 0) {
            setPaymentAccountId(accs[0].id);
          }
        }
      } catch (e) {
        console.error("Lỗi tải danh sách sổ quỹ:", e);
      } finally {
        setCashAccountsLoading(false);
      }
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount.replace(/[^0-9]/g, ""));
    if (!amt || amt <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (!paymentAccountId) {
      toast.error("Vui lòng chọn tài khoản / quỹ tiền thanh toán");
      return;
    }
    if (!paymentPurpose.trim()) {
      toast.error("Vui lòng nhập lý do / nội dung thu chi");
      return;
    }
    try {
      setSavingPayment(true);
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: paymentDirection,
          amount: amt,
          purpose: paymentPurpose.trim(),
          cashAccountId: paymentAccountId,
          projectId: projectId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Lỗi ghi sổ quỹ");
      }
      toast.success(paymentDirection === "receipt" ? "Đã ghi nhận Phiếu Thu vào sổ quỹ" : "Đã ghi nhận Phiếu Chi vào sổ quỹ");
      setIsCreatePaymentOpen(false);
      fetchFinance();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  // ==========================================
  // TÀI LIỆU, NHẬT KÝ & HỒ SƠ NGHIỆM THU
  // ==========================================
  const [docSubFilter, setDocSubFilter] = React.useState<"all" | "photos" | "acceptance" | "invoices_contracts" | "reports">("all");
  const [isUploadDocOpen, setIsUploadDocOpen] = React.useState(false);
  const [newDocType, setNewDocType] = React.useState<"field_photo" | "acceptance" | "invoice" | "contract" | "other">("field_photo");
  const [newDocTitle, setNewDocTitle] = React.useState("");
  const [newDocFileUrl, setNewDocFileUrl] = React.useState("");
  const [newDocNotes, setNewDocNotes] = React.useState("");
  const [customDocuments, setCustomDocuments] = React.useState<Array<{
    id: string;
    type: "field_photo" | "acceptance" | "invoice" | "contract" | "other";
    title: string;
    url: string;
    notes?: string;
    uploadedAt: string;
    uploaderName?: string;
  }>>([]);

  const handleSaveCustomDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      toast.error("Vui lòng nhập tên tài liệu");
      return;
    }
    if (!newDocFileUrl.trim()) {
      toast.error("Vui lòng tải lên hoặc nhập đường dẫn tài liệu");
      return;
    }
    const finalUrl = newDocFileUrl.trim();
    const docItem = {
      id: `doc-${Date.now()}`,
      type: newDocType,
      title: newDocTitle.trim(),
      url: finalUrl,
      notes: newDocNotes.trim(),
      uploadedAt: new Date().toISOString(),
      uploaderName: user?.name || "Người dùng",
    };
    setCustomDocuments((prev) => [docItem, ...prev]);
    toast.success("Đã thêm tài liệu mới vào hồ sơ công trình");
    setIsUploadDocOpen(false);
    setNewDocTitle("");
    setNewDocFileUrl("");
    setNewDocNotes("");
  };

  // Gom toàn bộ ảnh hiện trường từ cây công việc WBS
  const wbsFieldPhotos = React.useMemo(() => {
    const list: Array<{
      id: string;
      url: string;
      caption: string;
      stage: string;
      date: string;
      taskTitle: string;
      taskCode: string;
      assigneeName: string;
    }> = [];

    tasks.forEach((parent) => {
      if (parent.photoEvidence && parent.photoEvidence.length > 0) {
        parent.photoEvidence.forEach((pe, idx) => {
          list.push({
            id: `${parent.id}-pe-${idx}`,
            url: pe.url,
            caption: pe.caption || parent.title,
            stage: pe.stage === "before" ? "Khảo sát" : pe.stage === "during" ? "Thi công" : "Sáng đèn đêm",
            date: pe.uploadedAt ? new Date(pe.uploadedAt).toLocaleDateString("vi-VN") : "Hiện trường",
            taskTitle: parent.title,
            taskCode: parent.code,
            assigneeName: parent.assignees?.[0]?.name || "Đội thợ thi công",
          });
        });
      }
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach((child) => {
          if (child.photoEvidence && child.photoEvidence.length > 0) {
            child.photoEvidence.forEach((pe, idx) => {
              list.push({
                id: `${child.id}-pe-${idx}`,
                url: pe.url,
                caption: pe.caption || child.title,
                stage: pe.stage === "before" ? "Khảo sát" : pe.stage === "during" ? "Thi công" : "Sáng đèn đêm",
                date: pe.uploadedAt ? new Date(pe.uploadedAt).toLocaleDateString("vi-VN") : "Hiện trường",
                taskTitle: child.title,
                taskCode: child.code,
                assigneeName: child.assignees?.[0]?.name || "Đội thợ thi công",
              });
            });
          }
        });
      }
    });

    return list;
  }, [tasks]);

  const fetchBomsData = React.useCallback(async () => {
    try {
      setBomsLoading(true);
      const res = await fetch(`/api/bom?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectBoms(data.boms || []);
      }
    } catch (err) {
      console.error("Lỗi tải định mức BOM:", err);
    } finally {
      setBomsLoading(false);
    }
  }, [projectId]);

  const fetchDesignData = React.useCallback(async () => {
    try {
      setProofsLoading(true);
      const [dRes, sRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/design-proofs`),
        fetch(`/api/surveys?projectId=${projectId}`),
      ]);
      if (dRes.ok) {
        const dData = await dRes.json();
        setDesignProofs(dData.proofs || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setProjectSurveys(sData.surveys || []);
      }
    } catch (err) {
      console.error("Lỗi tải bản vẽ market & khảo sát:", err);
    } finally {
      setProofsLoading(false);
    }
  }, [projectId]);

  const fetchQcData = React.useCallback(async () => {
    try {
      setQcLoading(true);
      const res = await fetch(`/api/projects/${projectId}/qc-records`);
      if (res.ok) {
        const data = await res.json();
        setQcRecords(data.records || []);
      }
    } catch (err) {
      console.error("Lỗi tải KCS xưởng:", err);
    } finally {
      setQcLoading(false);
    }
  }, [projectId]);

  const fetchWarrantyData = React.useCallback(async () => {
    try {
      setWarrantyLoading(true);
      const res = await fetch(`/api/projects/${projectId}/warranty`);
      if (res.ok) {
        const data = await res.json();
        setWarrantyInfo(data.warranty || null);
        setWarrantyTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Lỗi tải bảo hành:", err);
    } finally {
      setWarrantyLoading(false);
    }
  }, [projectId]);

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

  const fetchAuxiliaryData = React.useCallback(async () => {
    try {
      const [eRes, cRes] = await Promise.all([
        fetch(`/api/projects/employees`),
        fetch(`/api/crm/customers`),
      ]);
      if (eRes.ok) {
        const eData = await eRes.json();
        setEmployees(eData.employees || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCustomers(cData.customers || []);
      }
    } catch (err) {
      console.warn("Lỗi tải nhân sự & khách hàng phụ trợ:", err);
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      // Chỉ tải song song 3 dữ liệu cốt lõi để hiển thị ngay tức thì
      const [pRes, tRes, aRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/acceptances`),
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
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải thông tin dự án");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Bộ nhớ đệm theo dõi các tab đã được nạp dữ liệu (Lazy loading tránh nghẽn mạng & delay)
  const loadedTabsRef = React.useRef<Record<string, boolean>>({});

  // Chỉ nạp dữ liệu cốt lõi khi mới vào trang (Project, WBS Tasks, Acceptances)
  React.useEffect(() => {
    fetchData();
    // Tải dữ liệu phụ trợ (danh sách nhân sự, khách hàng) ở background sau khi trang đã render
    const timer = setTimeout(() => {
      fetchAuxiliaryData();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchData, fetchAuxiliaryData]);

  // Nạp dữ liệu theo nhu cầu thực tế của từng tab (Lazy load: chỉ nạp 1 lần khi người dùng chuyển sang tab đó)
  React.useEffect(() => {
    if (activeTab === "dashboard") {
      if (!loadedTabsRef.current["dashboard"]) {
        loadedTabsRef.current["dashboard"] = true;
        fetchReports();
        fetchMaterials();
        fetchFinance();
        fetchMembers();
        fetchDesignData();
      }
    } else if (activeTab === "design") {
      if (!loadedTabsRef.current["design"]) {
        loadedTabsRef.current["design"] = true;
        fetchDesignData();
      }
    } else if (activeTab === "production") {
      if (!loadedTabsRef.current["production"]) {
        loadedTabsRef.current["production"] = true;
        fetchMaterials();
        fetchBomsData();
      }
    } else if (activeTab === "finance") {
      if (!loadedTabsRef.current["finance"]) {
        loadedTabsRef.current["finance"] = true;
        fetchFinance();
      }
    } else if (activeTab === "members") {
      if (!loadedTabsRef.current["members"]) {
        loadedTabsRef.current["members"] = true;
        fetchMembers();
      }
    } else if (activeTab === "documents") {
      if (!loadedTabsRef.current["documents"]) {
        loadedTabsRef.current["documents"] = true;
        fetchReports();
      }
    }
  }, [activeTab, fetchReports, fetchMaterials, fetchFinance, fetchMembers, fetchDesignData, fetchBomsData]);

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
            loadedTabsRef.current = {};
            fetchData();
            if (activeTab === "design") fetchDesignData();
            if (activeTab === "production") {
              fetchMaterials();
              fetchBomsData();
            }
            if (activeTab === "finance") fetchFinance();
            if (activeTab === "members") fetchMembers();
            if (activeTab === "documents") fetchReports();
          }}
          className="h-8 text-xs gap-1.5 border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Làm mới</span>
        </Button>
      ),
    },
    [project, fetchData, activeTab, fetchReports, fetchMaterials, fetchFinance, fetchMembers, fetchDesignData, fetchBomsData]
  );

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const openCompleteModal = (task: WbsTaskDto) => {
    setCompletingTask(task);
    setCompletionTargetStatus("awaiting_acceptance");
    setCompletionNotes("");
    setCompletionPhotoUrl("");
    setCompletionPhotoName("");
    setCompletionPhotoSize(null);
    setIsUploadingPhoto(false);
    setIsDragOverPhoto(false);
  };

  const handlePhotoFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp định dạng hình ảnh (JPG, PNG, WEBP,...)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dung lượng ảnh tối đa 10MB");
      return;
    }

    setCompletionPhotoName(file.name);
    setCompletionPhotoSize(file.size);

    // 1. Tạo preview ảnh tức thì qua FileReader
    const reader = new FileReader();
    reader.onload = () => {
      setCompletionPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 2. Tải lên server qua /api/upload
    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("folder", "evidence");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Lỗi tải ảnh lên");
      }

      const data = await res.json();
      if (data.url) {
        setCompletionPhotoUrl(data.url);
        toast.success("Đã tải ảnh minh chứng lên thành công!");
      }
    } catch (uploadErr: any) {
      console.warn("Lỗi upload ảnh:", uploadErr);
      toast.info("Đã lưu ảnh xem trước nội bộ để gửi kèm báo cáo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateTaskProgress = async (task: WbsTaskDto, percent: number) => {
    const isAssigned = Boolean(
      user?.employeeId && (
        task.assignees?.some((a) => a.employeeId === user.employeeId) ||
        (task.parentId && tasks.find((t) => t.id === task.parentId)?.assignees?.some((a) => a.employeeId === user.employeeId))
      )
    );
    if (!isSuperAdmin && !isProjectPM && !canManageTasks && !can("task.update") && !can("project.update") && !isAssigned) {
      toast.error("Bạn không có quyền cập nhật tiến độ công việc này");
      return;
    }

    // Nếu người dùng chọn 100% -> Yêu cầu mở modal xác nhận có ghi chú / ảnh
    if (percent === 100) {
      openCompleteModal(task);
      return;
    }

    try {
      const res = await fetch(`/api/projects/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercent: percent,
          status: percent > 0 ? "doing" : "todo",
        }),
      });
      if (!res.ok) throw new Error("Lỗi cập nhật tiến độ");
      toast.success(`Cập nhật tiến độ: ${percent}%`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    }
  };

  const handleConfirmCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    try {
      setSavingCompletion(true);
      // 1. Cập nhật tiến độ task = 100% và status = completionTargetStatus
      const res = await fetch(`/api/projects/tasks/${completingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercent: 100,
          status: completionTargetStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật hoàn thành");

      // 2. Nếu có ghi chú hoặc ảnh, tự động gửi báo cáo hiện trường để lưu minh chứng
      if (completionNotes.trim() || completionPhotoUrl.trim()) {
        try {
          await fetch(`/api/projects/${projectId}/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workDate: new Date().toISOString().slice(0, 10),
              workSummary: `[${completionTargetStatus === "awaiting_acceptance" ? "Nộp nghiệm thu" : "Hoàn thành"}: ${completingTask.title}]\n${completionNotes.trim()}`,
              taskId: completingTask.id,
              photos: completionPhotoUrl.trim() ? [{ url: completionPhotoUrl.trim(), desc: "Ảnh nghiệm thu hoàn thành" }] : [],
            }),
          });
        } catch (repErr) {
          console.warn("Không thể tự động gửi báo cáo hiện trường:", repErr);
        }
      }

      toast.success(
        completionTargetStatus === "awaiting_acceptance"
          ? `Đã chuyển công việc "${completingTask.title}" sang Chờ nghiệm thu!`
          : `Đã hoàn thành công việc: ${completingTask.title}!`
      );
      setCompletingTask(null);
      setCompletionNotes("");
      setCompletionPhotoUrl("");
      fetchData();
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xác nhận hoàn thành");
    } finally {
      setSavingCompletion(false);
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

  const openAssignModal = (task: WbsTaskDto) => {
    setAssigningTask(task);
    setSelectedEmployeeIds(task.assignees.map((a) => a.employeeId));
    setAssigneeSearchQuery("");
  };

  const availableStandardStages = React.useMemo(() => {
    return SUGGESTED_SIGNAGE_STAGES.filter((suggested) => {
      const coreName = suggested.replace(/^Giai đoạn \d+:\s*/i, "").trim().toLowerCase();
      return !tasks.some((t) => {
        const tTitle = t.title.toLowerCase();
        return tTitle.includes(coreName) || coreName.includes(tTitle);
      });
    });
  }, [tasks]);

  const handleCreateTopLevelStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("task.create") && !can("project.update")) {
      toast.error("Bạn không có quyền tạo giai đoạn");
      return;
    }
    if (!newStageTitle.trim()) return;

    if (newStageIsField && !newStageDueAt) {
      toast.error("Công việc hiện trường bắt buộc chọn Hạn hoàn thành để hiển thị trên ứng dụng Hiện Trường!");
      return;
    }

    try {
      setSavingStage(true);
      const res = await fetch(`/api/projects/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: newStageTitle.trim(),
          description: newStageDesc.trim(),
          isStage: true,
          weight: newStageWeight,
          startAt: newStageStartAt || null,
          dueAt: newStageDueAt || null,
          isField: newStageIsField,
          assigneeIds: newStageAssigneeIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo giai đoạn");
      toast.success("Đã tạo Giai đoạn mới!");
      setIsCreateStageOpen(false);
      setSelectedStandardStage("");
      setNewStageTitle("");
      setNewStageDesc("");
      setNewStageWeight(10);
      setNewStageDueAt("");
      setNewStageStartAt("");
      setNewStageIsField(false);
      setNewStageAssigneeIds([]);
      setNewStageAssigneeSearch("");
      fetchData();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo giai đoạn");
    } finally {
      setSavingStage(false);
    }
  };

  const handleReorderStage = async (stageId: string, direction: "up" | "down") => {
    if (!can("task.update") && !can("project.update")) {
      toast.error("Bạn không có quyền sắp xếp giai đoạn");
      return;
    }
    const index = tasks.findIndex((t) => t.id === stageId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIndex];
    newTasks[targetIndex] = temp;
    setTasks(newTasks);

    try {
      const res = await fetch(`/api/projects/${projectId}/reorder-stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageIds: newTasks.map((t) => t.id) }),
      });
      if (!res.ok) throw new Error("Lỗi khi lưu thứ tự giai đoạn");
      toast.success("Đã cập nhật thứ tự giai đoạn!");
    } catch (err: any) {
      toast.error(err.message || "Không thể đổi thứ tự giai đoạn");
      fetchData();
    }
  };

  const handleDeleteStage = async (stage: WbsTaskDto) => {
    if (!can("task.update") && !can("project.update")) {
      toast.error("Bạn không có quyền xóa giai đoạn");
      return;
    }
    const count = stage.children?.length || 0;
    if (!confirm(`Bạn có chắc chắn muốn xóa giai đoạn "${stage.title}"${count > 0 ? ` cùng toàn bộ ${count} công việc bên trong` : ""}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/tasks/${stage.id}?isStage=true`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi xóa giai đoạn");
      }
      toast.success(`Đã xóa giai đoạn "${stage.title}"`);
      if (selectedStageId === stage.id) {
        setSelectedStageId("all");
      }
      fetchData();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa giai đoạn");
    }
  };

  const handleSaveAssignee = async () => {
    if (!assigningTask) return;
    if (!can("task.assign") && !can("project.assign") && !can("project.update")) {
      toast.error("Bạn không có quyền phân công");
      return;
    }
    try {
      setSavingAssignee(true);
      const res = await fetch(`/api/projects/tasks/${assigningTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: selectedEmployeeIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật phân công");
      toast.success("Đã lưu phân công người phụ trách!");

      // Đồng bộ ngay lập tức vào TaskDetailDrawer nếu đang mở task này
      if (selectedDetailTask && selectedDetailTask.id === assigningTask.id) {
        const updatedAssignees = employees
          .filter((emp) => selectedEmployeeIds.includes(emp.id))
          .map((emp) => ({
            id: emp.id,
            employeeId: emp.id,
            code: emp.code || "",
            name: emp.name,
            phone: emp.phone || null,
          }));
        setSelectedDetailTask({
          ...selectedDetailTask,
          assignees: updatedAssignees,
        });
      }

      setAssigningTask(null);
      fetchData();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi giao việc");
    } finally {
      setSavingAssignee(false);
    }
  };

  const openCreateSubTaskModal = (parent: WbsTaskDto) => {
    setCreateTaskParent(parent);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskWeight(1);
    setNewTaskDueAt("");
    setNewTaskStartAt("");
    setNewTaskIsField(Boolean(parent.isField));
    // Mặc định chọn người tạo hoặc người đang được giao trong việc cha
    if (user?.employeeId && parent.assignees?.some((a) => a.employeeId === user.employeeId)) {
      setNewTaskEmployeeIds([user.employeeId]);
    } else if (parent.assignees && parent.assignees.length > 0) {
      setNewTaskEmployeeIds(parent.assignees.map((a) => a.employeeId || a.id));
    } else {
      setNewTaskEmployeeIds([]);
    }
    setNewTaskAssigneeSearch("");
  };

  const handleCreateSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskParent) return;

    const isAssignedToParent = Boolean(
      user?.employeeId && createTaskParent.assignees?.some((a) => a.employeeId === user.employeeId)
    );
    if (!canCreateTasks && !isAssignedToParent) {
      toast.error("Bạn không có quyền tạo công việc trong dự án này");
      return;
    }
    if (!newTaskTitle.trim()) return;

    if (newTaskIsField && !newTaskDueAt) {
      toast.error("Công việc hiện trường bắt buộc chọn Hạn hoàn thành để đồng bộ lên ứng dụng Hiện Trường!");
      return;
    }

    try {
      setSavingNewTask(true);
      const res = await fetch(`/api/projects/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          parentId: createTaskParent.id,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          weight: Number(newTaskWeight) || 1,
          employeeId: newTaskEmployeeIds[0] || null,
          assigneeIds: newTaskEmployeeIds,
          startAt: newTaskStartAt || null,
          dueAt: newTaskDueAt || null,
          isField: newTaskIsField,
          isStage: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo công việc mới");
      toast.success("Đã thêm công việc mới!");
      setCreateTaskParent(null);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskWeight(1);
      setNewTaskEmployeeIds([]);
      setNewTaskAssigneeSearch("");
      setNewTaskDueAt("");
      setNewTaskStartAt("");
      setNewTaskIsField(false);
      fetchData();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo công việc");
    } finally {
      setSavingNewTask(false);
    }
  };

  const handleQuickToggleTask = async (task: WbsTaskDto) => {
    const isDone = task.status === "done" || task.progressPercent === 100;
    const nextStatus = isDone ? "todo" : "done";
    const nextPercent = isDone ? 0 : 100;
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          progressPercent: nextPercent,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi cập nhật trạng thái");
      }
      toast.success(isDone ? `Đã hoàn tác: ${task.title}` : `Đã hoàn thành: ${task.title}`);
      fetchData();
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Lỗi cập nhật");
    }
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!canManageTasks) {
      toast.error("Bạn không có quyền chỉnh sửa công việc");
      return;
    }

    if (editTaskIsField && !editTaskDueAt) {
      toast.error("Công việc hiện trường bắt buộc chọn Hạn hoàn thành để hiển thị trên ứng dụng Hiện Trường!");
      return;
    }

    try {
      setSavingEditTask(true);
      const res = await fetch(`/api/projects/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim(),
          weight: Number(editTaskWeight) || 1,
          startAt: editTaskStartAt || null,
          dueAt: editTaskDueAt || null,
          isField: editTaskIsField,
          assigneeIds: editTaskAssigneeIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật công việc");
      toast.success("Đã cập nhật công việc!");
      setEditingTask(null);
      fetchData();
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật công việc");
    } finally {
      setSavingEditTask(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;
    if (!isSuperAdmin && !isProjectPM && !canManageTasks && !can("task.update") && !can("project.update")) {
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

  const handleUpdateMemberRole = async (memberId: string, newDuty: string) => {
    if (!canAssignTeam && !isProjectPM) {
      toast.error("Chỉ Quản lý dự án / Chỉ huy trưởng mới có quyền thay đổi vai trò thành viên");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, duty: newDuty }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Lỗi cập nhật vai trò");
      }
      toast.success("Đã cập nhật vai trò thành viên!");
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Lỗi cập nhật vai trò");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmployeeId && !newMemberMembershipId) {
      toast.error("Vui lòng chọn nhân sự");
      return;
    }
    if (!canAssignTeam && !isProjectPM) {
      toast.error("Bạn không có quyền thêm thành viên vào dự án");
      return;
    }
    try {
      setSavingMember(true);
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: newMemberEmployeeId || undefined,
          membershipId: newMemberMembershipId || undefined,
          duty: newMemberRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi thêm thành viên");
      toast.success("Đã thêm thành viên vào dự án!");
      setIsAddMemberOpen(false);
      setNewMemberEmployeeId("");
      setNewMemberMembershipId("");
      setNewMemberRole("Thợ thi công / Kỹ thuật viên");
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

  // PHASE 2 ACTIONS:
  // 0. Tạo / Sửa / Xóa phiếu khảo sát hiện trường cho dự án
  const handleOpenCreateSurvey = React.useCallback(() => {
    setEditingSurveyId(null);
    setSurveyFormData({
      title: project ? `Khảo sát mặt bằng - ${project.name}` : "Khảo sát mặt bằng công trình",
      address: (project as any)?.address || (project as any)?.siteAddress || "",
      surveyDate: new Date().toISOString().split("T")[0],
      surveyorEmployeeId: (project?.managerMembershipId as any) || "",
      widthMeters: 8.0,
      heightMeters: 2.0,
      depthMeters: 0.3,
      floorLevel: "Tầng 1 mặt tiền",
      elevationMeters: 3.5,
      structureType: "Dầm bê tông chịu lực",
      powerSource: "220V 1 pha",
      powerDistanceMeters: 10,
      installationMethod: "Giàn giáo 2 tầng",
      obstacles: "",
      notes: "",
      regionKV: "MIỀN TÂY",
      workType: "BẢNG HIỆU",
      dealerName: project?.name || "",
      dealerPhone: (project as any)?.customerPhone || "",
      dealerAddress: (project as any)?.address || (project as any)?.siteAddress || "",
      signMaterial: "Bảng alu ngoài trời",
      hasMicaLogo65: true,
      hasSideTrim: true,
      hasColorStrip: true,
      subAccessories: "Thay mica logo 65x65, lườn, thay dải màu",
      displayShelves: "",
      furniture: "",
      otherPosm: "",
      repairScope: "",
      surveyScope: "ks bảng",
      executionStatus: "đang chốt",
      deliverySchedule: "",
      siteNotes: "",
    });
    setIsCreateSurveyOpen(true);
  }, [project]);

  const handleOpenEditSurvey = (sv: SiteSurveyDto) => {
    setEditingSurveyId(sv.id);
    const meta = sv.metadata || {};
    setSurveyFormData({
      title: sv.title || "",
      address: sv.address || "",
      surveyDate: sv.surveyDate ? new Date(sv.surveyDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      surveyorEmployeeId: sv.surveyorEmployeeId || "",
      widthMeters: sv.widthMeters || 8.0,
      heightMeters: sv.heightMeters || 2.0,
      depthMeters: sv.depthMeters || 0.3,
      floorLevel: sv.floorLevel || "Tầng 1 mặt tiền",
      elevationMeters: sv.elevationMeters || 3.5,
      structureType: sv.structureType || "Dầm bê tông chịu lực",
      powerSource: sv.powerSource || "220V 1 pha",
      powerDistanceMeters: sv.powerDistanceMeters || 10,
      installationMethod: sv.installationMethod || "Giàn giáo 2 tầng",
      obstacles: sv.obstacles || "",
      notes: sv.notes || "",
      regionKV: meta.regionKV || "MIỀN TÂY",
      workType: meta.workType || "BẢNG HIỆU",
      dealerName: meta.dealerName || sv.title || "",
      dealerPhone: meta.dealerPhone || sv.customerPhone || "",
      dealerAddress: meta.dealerAddress || sv.address || "",
      signMaterial: meta.signMaterial || "Bảng alu ngoài trời",
      hasMicaLogo65: meta.hasMicaLogo65 ?? true,
      hasSideTrim: meta.hasSideTrim ?? true,
      hasColorStrip: meta.hasColorStrip ?? true,
      subAccessories: meta.subAccessories || "Thay mica logo 65x65, lườn, thay dải màu",
      displayShelves: meta.displayShelves || "",
      furniture: meta.furniture || "",
      otherPosm: meta.otherPosm || "",
      repairScope: meta.repairScope || "",
      surveyScope: meta.surveyScope || "ks bảng",
      executionStatus: meta.executionStatus || "đang chốt",
      deliverySchedule: meta.deliverySchedule || "",
      siteNotes: meta.siteNotes || "",
    });
    setIsCreateSurveyOpen(true);
  };

  const handleDuplicateSurvey = (sv: SiteSurveyDto) => {
    setEditingSurveyId(null);
    const meta = sv.metadata || {};
    setSurveyFormData({
      title: `${sv.title || "Khảo sát"} (Bản sao)`,
      address: sv.address || "",
      surveyDate: new Date().toISOString().split("T")[0],
      surveyorEmployeeId: sv.surveyorEmployeeId || "",
      widthMeters: sv.widthMeters || 8.0,
      heightMeters: sv.heightMeters || 2.0,
      depthMeters: sv.depthMeters || 0.3,
      floorLevel: sv.floorLevel || "Tầng 1 mặt tiền",
      elevationMeters: sv.elevationMeters || 3.5,
      structureType: sv.structureType || "Dầm bê tông chịu lực",
      powerSource: sv.powerSource || "220V 1 pha",
      powerDistanceMeters: sv.powerDistanceMeters || 10,
      installationMethod: sv.installationMethod || "Giàn giáo 2 tầng",
      obstacles: sv.obstacles || "",
      notes: sv.notes || "",
      regionKV: meta.regionKV || "MIỀN TÂY",
      workType: meta.workType || "BẢNG HIỆU",
      dealerName: `${meta.dealerName || sv.title || ""} (Bản sao)`,
      dealerPhone: meta.dealerPhone || sv.customerPhone || "",
      dealerAddress: meta.dealerAddress || sv.address || "",
      signMaterial: meta.signMaterial || "Bảng alu ngoài trời",
      hasMicaLogo65: meta.hasMicaLogo65 ?? true,
      hasSideTrim: meta.hasSideTrim ?? true,
      hasColorStrip: meta.hasColorStrip ?? true,
      subAccessories: meta.subAccessories || "Thay mica logo 65x65, lườn, thay dải màu",
      displayShelves: meta.displayShelves || "",
      furniture: meta.furniture || "",
      otherPosm: meta.otherPosm || "",
      repairScope: meta.repairScope || "",
      surveyScope: meta.surveyScope || "ks bảng",
      executionStatus: "đang chốt",
      deliverySchedule: meta.deliverySchedule || "",
      siteNotes: meta.siteNotes || "",
    });
    setIsCreateSurveyOpen(true);
    toast.info("Đã nạp bản sao khảo sát! Bạn có thể tinh chỉnh và lưu thành phiếu mới.");
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu khảo sát này khỏi dự án?")) return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi xóa khảo sát");
      }
      toast.success("Đã xóa phiếu khảo sát thành công!");
      fetchDesignData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa phiếu khảo sát");
    }
  };

  const handleCreateSurveySubmit = async (e?: React.FormEvent, redirectToDesign: boolean = false) => {
    if (e) e.preventDefault();
    const resolvedTitle = surveyFormData.dealerName?.trim()
      ? `${surveyFormData.workType}: ${surveyFormData.dealerName.trim()}`
      : surveyFormData.title.trim();
    const resolvedAddress = surveyFormData.dealerAddress?.trim() || surveyFormData.address.trim();

    if (!resolvedTitle || !resolvedAddress) {
      toast.error("Vui lòng nhập tên đại lý/công trình và địa chỉ khảo sát!");
      return;
    }

    try {
      setCreatingSurvey(true);
      const url = editingSurveyId ? `/api/surveys/${editingSurveyId}` : "/api/surveys";
      const method = editingSurveyId ? "PUT" : "POST";

      const metadata = {
        regionKV: surveyFormData.regionKV,
        workType: surveyFormData.workType,
        dealerName: surveyFormData.dealerName || resolvedTitle,
        dealerPhone: surveyFormData.dealerPhone,
        dealerAddress: surveyFormData.dealerAddress || resolvedAddress,
        signMaterial: surveyFormData.signMaterial,
        hasMicaLogo65: surveyFormData.hasMicaLogo65,
        hasSideTrim: surveyFormData.hasSideTrim,
        hasColorStrip: surveyFormData.hasColorStrip,
        subAccessories: surveyFormData.subAccessories,
        displayShelves: surveyFormData.displayShelves,
        furniture: surveyFormData.furniture,
        otherPosm: surveyFormData.otherPosm,
        repairScope: surveyFormData.repairScope,
        surveyScope: surveyFormData.surveyScope,
        executionStatus: surveyFormData.executionStatus,
        deliverySchedule: surveyFormData.deliverySchedule,
        siteNotes: surveyFormData.siteNotes,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...surveyFormData,
          title: resolvedTitle,
          address: resolvedAddress,
          projectId,
          customerId: project?.customerId || null,
          metadata,
          widthMeters: Number(surveyFormData.widthMeters) || 0,
          heightMeters: Number(surveyFormData.heightMeters) || 0,
          depthMeters: Number(surveyFormData.depthMeters) || 0,
          elevationMeters: Number(surveyFormData.elevationMeters) || 0,
          powerDistanceMeters: Number(surveyFormData.powerDistanceMeters) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu phiếu khảo sát");

      toast.success(editingSurveyId ? "Đã cập nhật thông tin khảo sát!" : `Đã tạo phiếu khảo sát ${data.survey?.code || ""} thành công!`);
      setIsCreateSurveyOpen(false);
      const savedSurvey = data.survey || surveyFormData;
      const targetSurveyId = editingSurveyId || savedSurvey.id;
      setEditingSurveyId(null);
      fetchDesignData();

      if (redirectToDesign) {
        const dealerParam = encodeURIComponent(metadata.dealerName || resolvedTitle);
        const addrParam = encodeURIComponent(metadata.dealerAddress || resolvedAddress);
        router.push(
          `/du-an/${projectId}/thiet-ke-quy-chuan?surveyId=${targetSurveyId}&w=${savedSurvey.widthMeters}&h=${savedSurvey.heightMeters}&d=${savedSurvey.depthMeters}&title=${dealerParam}&addr=${addrParam}`
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu phiếu khảo sát");
    } finally {
      setCreatingSurvey(false);
    }
  };

  // Tạo bảng bóc tách BOM kỹ thuật tự động từ phiếu khảo sát
  const handleCreateBomFromSurvey = async (survey?: SiteSurveyDto) => {
    const targetSurvey = survey || projectSurveys[0];
    if (!targetSurvey) {
      toast.error("Dự án chưa có phiếu khảo sát nào để lập BOM bóc tách!");
      return;
    }
    try {
      setBomsLoading(true);
      const meta = targetSurvey.metadata || {};
      const dealerLabel = meta.dealerName || targetSurvey.title;
      const title = `BOM Bóc Tách ${targetSurvey.code} - ${dealerLabel}`;
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title,
          signageType: "alu_letters",
          widthMeters: targetSurvey.widthMeters || 1.0,
          heightMeters: targetSurvey.heightMeters || 1.0,
          depthMeters: targetSurvey.depthMeters || 0.1,
          signMaterial: meta.signMaterial || "Bảng alu ngoài trời",
          hasMicaLogo65: meta.hasMicaLogo65 ?? true,
          hasSideTrim: meta.hasSideTrim ?? true,
          hasColorStrip: meta.hasColorStrip ?? true,
          subAccessories: meta.subAccessories || "",
          displayShelves: meta.displayShelves || "",
          furniture: meta.furniture || "",
          otherPosm: meta.otherPosm || "",
          repairScope: meta.repairScope || "",
          notes: `Tự động bóc tách kỹ thuật từ khảo sát ${targetSurvey.code} (${meta.regionKV || "KV"} - ${meta.workType || "BẢNG HIỆU"})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lập BOM dự án");
      toast.success(`Đã lập thành công BOM bóc tách ${data.bom?.code || ""} cho dự án!`);
      await fetchBomsData();
      setActiveTab("production");
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo bảng BOM dự án");
    } finally {
      setBomsLoading(false);
    }
  };

  // Mở modal chỉnh sửa chi tiết BOM & danh mục vật tư
  const handleOpenEditBom = (bom: ProjectBomDto) => {
    setEditingBom(bom);
    const clonedItems = (bom.itemsJson || []).map((it: any) => ({
      category: it.category || "Vật tư phụ & Keo",
      itemCode: it.itemCode || "",
      itemName: it.itemName || "",
      unit: it.unit || "cái",
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      amount: Number(it.amount) || Math.round((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)),
      note: it.note || "",
    }));
    setEditBomData({
      title: bom.title || "",
      notes: bom.notes || "",
      items: clonedItems,
    });
    setIsEditBomModalOpen(true);
  };

  // Thêm dòng vật tư mới vào BOM
  const handleAddItemRow = () => {
    setEditBomData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          category: "Khung sắt",
          itemCode: `SKU-${Date.now().toString().slice(-4)}`,
          itemName: "",
          unit: "cây",
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          note: "",
        },
      ],
    }));
  };

  // Xóa dòng vật tư khỏi BOM
  const handleRemoveItemRow = (idx: number) => {
    setEditBomData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  // Thay đổi giá trị trường trong dòng vật tư & tự động tính thành tiền
  const handleItemFieldChange = (idx: number, field: string, val: any) => {
    setEditBomData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[idx], [field]: val };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(val) || 0 : Number(item.quantity) || 0;
        const price = field === "unitPrice" ? Number(val) || 0 : Number(item.unitPrice) || 0;
        item.amount = Math.round(qty * price);
      }
      newItems[idx] = item;
      return { ...prev, items: newItems };
    });
  };

  // Lưu cập nhật bảng BOM
  const handleSaveEditBom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingBom) return;
    if (!editBomData.title.trim()) {
      toast.error("Vui lòng nhập tên/tiêu đề bảng BOM!");
      return;
    }

    try {
      setSavingBom(true);
      const totalAmount = editBomData.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      const res = await fetch(`/api/bom/${editingBom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editBomData.title.trim(),
          notes: editBomData.notes.trim(),
          itemsJson: editBomData.items,
          estimatedMaterialCost: totalAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu cập nhật BOM");

      toast.success("Đã cập nhật bảng BOM bóc tách thành công!");
      setIsEditBomModalOpen(false);
      setEditingBom(null);
      await fetchBomsData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu bảng BOM");
    } finally {
      setSavingBom(false);
    }
  };

  // Xóa bảng BOM khỏi dự án
  const handleDeleteBom = async (bom: ProjectBomDto) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bảng bóc tách ${bom.code} - "${bom.title}"?`)) return;
    try {
      setBomsLoading(true);
      const res = await fetch(`/api/bom/${bom.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi xóa bảng BOM");
      toast.success(`Đã xóa bảng BOM ${bom.code} thành công!`);
      await fetchBomsData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa BOM");
    } finally {
      setBomsLoading(false);
    }
  };

  // Nhân bản bảng BOM
  const handleDuplicateBom = async (bom: ProjectBomDto) => {
    try {
      setBomsLoading(true);
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: `${bom.title} (Bản sao)`,
          signageType: bom.signageType || "alu_letters",
          widthMeters: bom.widthMeters || 1.0,
          heightMeters: bom.heightMeters || 1.0,
          depthMeters: bom.depthMeters || 0.1,
          ironBoxType: bom.ironBoxType || "25x25",
          aluMarginCm: bom.aluMarginCm || 5,
          aluScrapRate: bom.aluScrapRate || 10,
          ledType: bom.ledType || "Module 3 mắt 1.2W",
          powerUnitType: bom.powerUnitType || "Nguồn ngoài trời 12V",
          powerUnitWatts: bom.powerUnitWatts || 350,
          signMaterial: (bom as any).signMaterial || "Bảng alu",
          notes: `Bản sao từ ${bom.code} - ${bom.notes || ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi nhân bản BOM");

      if (data.bom?.id && bom.itemsJson && bom.itemsJson.length > 0) {
        await fetch(`/api/bom/${data.bom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemsJson: bom.itemsJson,
            estimatedMaterialCost: bom.estimatedMaterialCost,
          }),
        });
      }

      toast.success(`Đã nhân bản thành công bảng BOM ${data.bom?.code || ""}!`);
      await fetchBomsData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi nhân bản BOM");
    } finally {
      setBomsLoading(false);
    }
  };

  // 1. Thêm bản vẽ / Market thiết kế
  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofTitle.trim()) {
      toast.error("Vui lòng nhập tên/tiêu đề bản vẽ Market");
      return;
    }
    if (!newProofFileUrl.trim()) {
      toast.error("Vui lòng tải lên tệp Market hoặc nhập đường dẫn file");
      return;
    }
    const finalFileUrl = newProofFileUrl.trim();
    try {
      setSavingProof(true);
      const res = await fetch(`/api/projects/${projectId}/design-proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProofTitle.trim(),
          fileUrl: finalFileUrl,
          backgroundMaterial: newProofBg,
          letterMaterial: newProofLetter,
          ledSpec: newProofLed,
          powerSpec: newProofPower,
          status: "approved",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải lên bản vẽ");
      toast.success("Đã thêm phiên bản Market thiết kế mới!");
      setIsUploadProofOpen(false);
      setNewProofTitle("");
      setNewProofFileUrl("");
      fetchDesignData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải lên bản vẽ");
    } finally {
      setSavingProof(false);
    }
  };

  // 1b. Sửa thông tin Market thiết kế
  const handleOpenEditProof = (proof: DesignProofDto) => {
    setEditingProof(proof);
    setEditProofTitle(proof.title);
    setEditProofVersionNo(proof.versionNo || 1);
    setEditProofBg(proof.backgroundMaterial || "Alu Alcorest 3mm");
    setEditProofLetter(proof.letterMaterial || "Inox uốn nổi lọng mica");
    setEditProofLed(proof.ledSpec || "LED Hàn Quốc 12V 3000K");
    setEditProofPower(proof.powerSpec || "Nguồn Meanwell ngoài trời IP67");
    setEditProofStatus(proof.status || "pending");
    setEditProofFeedback(proof.clientFeedback || "");
    setIsEditProofOpen(true);
  };

  const handleUpdateProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProof) return;
    try {
      setSavingEditProof(true);
      const res = await fetch(`/api/design-proofs/${editingProof.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editProofTitle.trim(),
          versionNo: Number(editProofVersionNo) || 1,
          backgroundMaterial: editProofBg.trim(),
          letterMaterial: editProofLetter.trim(),
          ledSpec: editProofLed.trim(),
          powerSpec: editProofPower.trim(),
          status: editProofStatus,
          clientFeedback: editProofFeedback.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật Market");
      toast.success("Đã cập nhật thông tin Market thiết kế!");
      setIsEditProofOpen(false);
      setEditingProof(null);
      fetchDesignData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật Market");
    } finally {
      setSavingEditProof(false);
    }
  };

  // 1c. Xóa Market thiết kế
  const handleDeleteProof = async (proofId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản vẽ Market thiết kế này khỏi dự án?")) return;
    try {
      const res = await fetch(`/api/design-proofs/${proofId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi xóa bản vẽ");
      }
      toast.success("Đã xóa bản vẽ Market thành công!");
      fetchDesignData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa bản vẽ Market");
    }
  };

  // 1d. Nhân bản tạo phương án thiết kế mới (Clone / Duplicate Proposal)
  const handleDuplicateProof = async (proof: DesignProofDto) => {
    try {
      const nextVersion = (proof.versionNo || 1) + 1;
      const res = await fetch("/api/design-proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: `${proof.title.replace(/\s*\(Phương án \d+\)/, "")} (Phương án ${nextVersion})`,
          versionNo: nextVersion,
          fileUrl: proof.fileUrl,
          thumbnailUrl: proof.thumbnailUrl || proof.fileUrl,
          backgroundMaterial: proof.backgroundMaterial,
          letterMaterial: proof.letterMaterial,
          ledSpec: proof.ledSpec,
          powerSpec: proof.powerSpec,
          clientFeedback: proof.clientFeedback,
          status: proof.status || "approved",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi nhân bản bản vẽ");
      toast.success(`Đã nhân bản tạo phương án v${nextVersion}.0 thành công!`);
      fetchDesignData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi nhân bản bản vẽ");
    }
  };

  // 2. Phê duyệt / Từ chối / Chuyển trạng thái Market (Admin toàn quyền điều phối)
  const handleUpdateProofStatus = async (proofId: string, status: "approved" | "rejected" | "pending", clientFeedback?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/design-proofs/${proofId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          feedback: clientFeedback,
          approvedByName: status === "approved" ? (user?.name || "Quản trị viên duyệt") : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật Market");
      toast.success(
        status === "approved"
          ? "Đã phê duyệt Market thiết kế (Chốt)!"
          : status === "pending"
          ? "Đã chuyển về trạng thái Chờ duyệt"
          : "Đã ghi nhận yêu cầu chỉnh sửa Market"
      );
      fetchDesignData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật Market");
    }
  };

  // 3. Tạo Biên bản KCS & QC Xuất xưởng
  const handleCreateQcRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingQc(true);
      const res = await fetch(`/api/projects/${projectId}/qc-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agingTestHours: Number(newQcAgingHours) || 4.0,
          inspectorEmployeeId: newQcInspectorId || undefined,
          defectNotes: newQcDefectNotes.trim() || undefined,
          status: "passed",
          voltageDropCheck: true,
          waterproofCheck: true,
          frameWeldCheck: true,
          lightUniformityCheck: true,
          accessoriesChecklist: [
            { item: "Bu-lông neo dầm và guzong", checked: true },
            { item: "Bộ nguồn Meanwell dự phòng", checked: true },
            { item: "Dây cáp nguồn chịu nhiệt chống nước", checked: true },
            { item: "Tem kiểm định & bảo hành dán trên module", checked: true }
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi ghi nhận KCS");
      toast.success("Đã ghi nhận Biên bản KCS & Aging Test xuất xưởng!");
      setIsCreateQcOpen(false);
      setNewQcDefectNotes("");
      fetchQcData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi ghi nhận KCS");
    } finally {
      setSavingQc(false);
    }
  };

  // 4. Tạo Ticket sự cố / bảo hành
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim()) {
      toast.error("Vui lòng nhập mô tả sự cố");
      return;
    }
    if (!project?.customerId) {
      toast.error("Dự án chưa liên kết với khách hàng!");
      return;
    }
    try {
      setSavingTicket(true);
      const res = await fetch("/api/service-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          customerId: project.customerId,
          title: newTicketTitle.trim(),
          issueType: newTicketType,
          priority: newTicketPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo ticket bảo hành");
      toast.success("Đã tiếp nhận yêu cầu bảo hành / sự cố!");
      setIsCreateTicketOpen(false);
      setNewTicketTitle("");
      fetchWarrantyData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo ticket");
    } finally {
      setSavingTicket(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: "in_progress" | "resolved" | "cancelled", resolutionNotes?: string) => {
    try {
      const res = await fetch(`/api/service-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật ticket");
      toast.success("Đã cập nhật trạng thái sự cố!");
      fetchWarrantyData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật ticket");
    }
  };

  // 5. Lưu chữ ký số cảm ứng nghiệm thu (E-Signature)
  const handleSaveSignature = async (signatureDataUrl: string, signerName: string) => {
    if (!signatureModalAcceptance) return;
    try {
      const res = await fetch(`/api/acceptances/${signatureModalAcceptance.id}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData: signatureDataUrl,
          signerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu chữ ký");
      toast.success("Đã xác nhận ký số biên bản nghiệm thu thành công!");
      setSignatureModalAcceptance(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu chữ ký");
    }
  };

  // Tổng hợp tất cả nhiệm vụ WBS (cha + con + cháu) để đếm số lượng cho FacetFilter
  const allWbsTasksList = React.useMemo(() => {
    const list: WbsTaskDto[] = [];
    const flatten = (items: WbsTaskDto[]) => {
      for (const item of items) {
        list.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    };
    flatten(tasks);
    return list;
  }, [tasks]);

  const wbsEmployeeFacetOptions: FacetOption[] = React.useMemo(() => {
    const unassignedCount = allWbsTasksList.filter((t) => !t.assignees || t.assignees.length === 0).length;
    return [
      {
        value: "unassigned",
        label: "⚠️ Chưa phân công",
        count: unassignedCount,
      },
      ...employees.map((e) => ({
        value: e.id,
        label: `${e.name} (${e.code})`,
        count: allWbsTasksList.filter((t) => t.assignees?.some((a) => a.employeeId === e.id)).length,
      })),
    ];
  }, [allWbsTasksList, employees]);

  const wbsStatusFacetOptions: FacetOption[] = React.useMemo(() => {
    return [
      {
        value: "todo",
        label: "Chờ thực hiện",
        count: allWbsTasksList.filter((t) => t.status === "todo").length,
      },
      {
        value: "doing",
        label: "Đang làm",
        count: allWbsTasksList.filter((t) => t.status === "doing").length,
      },
      {
        value: "awaiting_acceptance",
        label: "Chờ nghiệm thu",
        count: allWbsTasksList.filter((t) => t.status === "awaiting_acceptance").length,
      },
      {
        value: "done",
        label: "Đã hoàn thành",
        count: allWbsTasksList.filter((t) => t.status === "done").length,
      },
    ];
  }, [allWbsTasksList]);

  const wbsTypeFacetOptions: FacetOption[] = React.useMemo(() => {
    return [
      {
        value: "field",
        label: "📍 Việc Hiện trường",
        count: allWbsTasksList.filter((t) => Boolean(t.isField)).length,
      },
      {
        value: "factory",
        label: "🏭 Việc Xưởng / Nội bộ",
        count: allWbsTasksList.filter((t) => !t.isField).length,
      },
    ];
  }, [allWbsTasksList]);

  const filteredTasks = React.useMemo(() => {
    let list = tasks;
    if (selectedStageId !== "all") {
      list = list.filter((p) => p.id === selectedStageId);
    }
    const q = wbsSearch.trim().toLowerCase();
    const hasEmployeeFilter = wbsEmployeeFilters.length > 0;
    const hasStatusFilter = wbsStatusFilters.length > 0;
    const hasTypeFilter = wbsTypeFilters.length > 0;
    const hasActiveFilters = Boolean(q) || hasEmployeeFilter || hasStatusFilter || hasTypeFilter;

    const taskMatchesFilters = (t: WbsTaskDto): boolean => {
      if (q) {
        const matchesQ =
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          Boolean(t.assignees?.some((a) => a.name.toLowerCase().includes(q)));
        if (!matchesQ) return false;
      }
      if (hasEmployeeFilter) {
        const hasNoAssignee = !t.assignees || t.assignees.length === 0;
        const matchesUnassigned = wbsEmployeeFilters.includes("unassigned") && hasNoAssignee;
        const matchesEmployee = t.assignees?.some((a) => wbsEmployeeFilters.includes(a.employeeId));
        if (!matchesUnassigned && !matchesEmployee) return false;
      }
      if (hasStatusFilter) {
        if (!wbsStatusFilters.includes(t.status)) return false;
      }
      if (hasTypeFilter) {
        const matchesField = wbsTypeFilters.includes("field") && Boolean(t.isField);
        const matchesFactory = wbsTypeFilters.includes("factory") && !t.isField;
        if (!matchesField && !matchesFactory) return false;
      }
      return true;
    };

    return list
      .map((parent) => {
        const children = (parent.children || [])
          .map((mainTask) => {
            const subtasks = mainTask.children || [];
            if (!hasActiveFilters) {
              return { ...mainTask, filteredSubtasks: subtasks };
            }
            const filteredSubtasks = subtasks.filter(taskMatchesFilters);
            return {
              ...mainTask,
              filteredSubtasks,
            };
          })
          .filter((mainTask) => {
            if (!hasActiveFilters) return true;
            const selfMatches = taskMatchesFilters(mainTask);
            const hasMatchingSubtasks = Boolean(
              mainTask.filteredSubtasks && mainTask.filteredSubtasks.length > 0
            );
            return selfMatches || hasMatchingSubtasks;
          });

        return { ...parent, filteredChildren: children };
      })
      .filter((parent) => {
        if (!hasActiveFilters) return true;
        const hasMatchingChildren = Boolean(
          parent.filteredChildren && parent.filteredChildren.length > 0
        );
        if (hasMatchingChildren) return true;
        return taskMatchesFilters(parent);
      });
  }, [tasks, selectedStageId, wbsSearch, wbsEmployeeFilters, wbsStatusFilters, wbsTypeFilters]);

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
      {/* 1. HEADER BAR CHÍNH (GỌN GÀNG, SANG TRỌNG) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
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
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            {/* NÚT BẬT/TẮT THÔNG TIN DỰ ÁN */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectInfoExpanded((prev) => !prev)}
              className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>{isProjectInfoExpanded ? "Đóng chi tiết" : "Chi tiết dự án"}</span>
              {isProjectInfoExpanded ? (
                <ChevronUp className="w-3 h-3 text-slate-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-500" />
              )}
            </Button>
          </div>
        </div>

        {/* ẨN LÀ ẨN HẾT: CHỈ HIỂN THỊ KHI isProjectInfoExpanded === true */}
        {isProjectInfoExpanded && (
          <div className="pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
                Hồ sơ thông tin dự án
              </span>
              <button
                type="button"
                onClick={() => setIsProjectInfoExpanded(false)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-0.5 rounded hover:bg-slate-100"
              >
                <span>Thu gọn</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-700">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Khách hàng & Liên hệ</span>
                <strong className="text-slate-900 block truncate">{project.customerName}</strong>
                {project.customerPhone && (
                  <a href={`tel:${project.customerPhone}`} className="text-blue-600 hover:underline font-mono text-[11px] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{project.customerPhone}</span>
                  </a>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Địa chỉ thi công</span>
                <div className="text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{project.address || "Chưa có địa chỉ"}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Thời hạn & Tiến độ</span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500">Khởi công: </span>
                    <strong className="text-slate-800">{project.startDate || "Chưa đặt"}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Bàn giao: </span>
                    <strong className="text-slate-900">{project.dueDate || "Chưa đặt"}</strong>
                  </div>
                </div>
                {Boolean(project.warrantyMonths) && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Bảo hành:</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                      {project.warrantyMonths} tháng{project.warrantyUntil ? ` (đến ${new Date(project.warrantyUntil).toLocaleDateString("vi-VN")})` : ""}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Điều hành & Phân công</span>
                <strong className="text-slate-900 block truncate">{project.managerName || "Chưa chỉ định PM"}</strong>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Đầu việc: <strong className="font-mono text-slate-800">{project.completedTasks}</strong> / {project.totalTasks} việc xong
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG TABS (CHUẨN DESIGN SYSTEM: UNDERLINE TABS GIỐNG CÁC TRANG KHÁC) */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange("dashboard")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "dashboard"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("wbs")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "wbs"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <span>Cây công việc (WBS)</span>
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
              activeTab === "wbs"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {tasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("design")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "design"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <Compass className="w-4 h-4" />
          <span>Khảo sát & Market 2D/3D</span>
          {designProofs.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "design"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {designProofs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("production")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "production"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <Package className="w-4 h-4" />
          <span>Bóc tách & Xuất kho</span>
          {materials.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "production"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {materials.length}
            </span>
          )}
        </button>


        <button
          type="button"
          onClick={() => handleTabChange("finance")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "finance"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <Wallet className="w-4 h-4" />
          <span>Sổ quỹ & Thu chi</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("documents")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "documents"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Tài liệu & Hồ sơ</span>
          {(wbsFieldPhotos.length + acceptances.length + fieldReports.length + customDocuments.length) > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "documents"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {wbsFieldPhotos.length + acceptances.length + fieldReports.length + customDocuments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("members")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "members"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Đội ngũ dự án</span>
          {members.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "members"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {members.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. NỘI DUNG TỪNG TAB */}
      {/* TAB 1: DASHBOARD CHO CHỦ DỰ ÁN (FULL-WIDTH) */}
      {activeTab === "dashboard" && (
        <ProjectOwnerDashboard
          project={project}
          tasks={tasks}
          finance={finance}
          materials={materials}
          fieldReports={fieldReports}
          members={members}
          handleTabChange={handleTabChange}
          isMounted={isMounted}
          onOpenChangeStage={() => {
            if (!can("project.update")) {
              toast.error("Bạn không có quyền chuyển giai đoạn dự án");
              return;
            }
            setSelectedStageToChange(project.status);
            setIsStageModalOpen(true);
          }}
          onOpenEditProject={() => setIsEditProjectOpen(true)}
          canUpdateProject={can("project.update")}
        />
      )}

      {/* TAB 2: CÂY CÔNG VIỆC WBS (CHIA RÕ GIAI ĐOẠN & ĐẦU MỤC CÔNG VIỆC) */}
      {activeTab === "wbs" && (
        <div className="flex flex-col lg:flex-row items-start gap-3.5">
          {/* CỘT TRÁI: DANH SÁCH GIAI ĐOẠN THỰC TẾ (CỐ ĐỊNH KHI CUỘN CỘT PHẢI) */}
          <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-16 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5 max-h-[calc(100vh-5rem)] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Giai đoạn dự án</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                  {tasks.length} giai đoạn
                </span>
              </div>

              {/* NÚT XEM TẤT CẢ GIAI ĐOẠN */}
              <button
                type="button"
                onClick={() => setSelectedStageId("all")}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition font-medium border shrink-0",
                  selectedStageId === "all"
                    ? "bg-blue-50/90 border-blue-300 text-blue-900 font-bold shadow-2xs"
                    : "border-transparent text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tất cả giai đoạn</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {allWbsTasksList.length - tasks.length} việc
                </span>
              </button>

              {/* DANH SÁCH GIAI ĐOẠN ĐỘNG (CUỘN ĐỘC LẬP) */}
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5 min-h-[140px]">
                {tasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Chưa có giai đoạn nào.
                  </div>
                ) : (
                  tasks.map((stg, idx) => {
                    const isSelected = selectedStageId === stg.id;
                    const childCount = stg.children?.length || 0;
                    const doneChildCount = stg.children?.filter((c) => c.status === "done").length || 0;
                    const canManage = can("task.update") || can("project.update");

                    return (
                      <div
                        key={stg.id}
                        className={cn(
                          "group rounded-lg border transition-all p-2 text-xs",
                          isSelected
                            ? "bg-blue-50/90 border-blue-300 shadow-2xs ring-1 ring-blue-200"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStageId(stg.id)}
                            className="flex items-start gap-2 flex-1 text-left min-w-0"
                          >
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                                stg.status === "done"
                                  ? "bg-emerald-600 text-white"
                                  : isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              )}
                            >
                              {stg.status === "done" ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "truncate block leading-tight",
                                  isSelected ? "font-bold text-blue-900" : "font-semibold text-slate-800"
                                )}
                              >
                                {stg.title}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                <span>{doneChildCount}/{childCount} việc</span>
                                <span>•</span>
                                <span className={cn("font-mono font-semibold", stg.progressPercent === 100 ? "text-emerald-600" : "text-blue-600")}>
                                  {stg.progressPercent}%
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* Nút di chuyển thứ tự giai đoạn Lên/Xuống */}
                          {canManage && (
                            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderStage(stg.id, "up");
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 disabled:opacity-20 disabled:pointer-events-none"
                                title="Chuyển giai đoạn lên trên"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === tasks.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderStage(stg.id, "down");
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 disabled:opacity-20 disabled:pointer-events-none"
                                title="Chuyển giai đoạn xuống dưới"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Mini Progress Bar */}
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={cn(
                              "h-full transition-all",
                              stg.progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                            )}
                            style={{ width: `${stg.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* NÚT THÊM GIAI ĐOẠN */}
              {(can("task.create") || can("project.update")) && (
                <div className="pt-2 border-t border-slate-100 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (availableStandardStages.length > 0) {
                        setSelectedStandardStage(availableStandardStages[0]);
                        setNewStageTitle(availableStandardStages[0]);
                        const isF = /khảo sát|thi công|lắp dựng|nghiệm thu|bảo hành/i.test(availableStandardStages[0]);
                        setNewStageIsField(isF);
                        setNewStageWeight(15);
                      } else {
                        setSelectedStandardStage("custom");
                        setNewStageTitle("");
                        setNewStageIsField(false);
                        setNewStageWeight(10);
                      }
                      setNewStageDesc("");
                      setNewStageDueAt("");
                      setNewStageStartAt("");
                      setNewStageAssigneeIds([]);
                      setIsCreateStageOpen(true);
                    }}
                    className="w-full text-xs h-8 gap-1.5 border-dashed border-slate-300 text-slate-700 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm giai đoạn mới</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHÔNG GIAN LÀM VIỆC WBS CHÍNH */}
          <div className="flex-1 min-w-0 space-y-3.5 w-full">
            {/* 1. THANH TÌM KIẾM & BỘ LỌC CHUẨN */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <div className="relative w-44 sm:w-56 shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Tìm việc, người phụ trách..."
                      value={wbsSearch}
                      onChange={(e) => setWbsSearch(e.target.value)}
                      className="pl-8 pr-7 text-xs h-8 bg-slate-50/50 border-slate-200 focus:bg-white"
                    />
                    {wbsSearch && (
                      <button
                        type="button"
                        onClick={() => setWbsSearch("")}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <FacetFilter
                      title="Người phụ trách"
                      options={wbsEmployeeFacetOptions}
                      selectedValues={wbsEmployeeFilters}
                      onChange={setWbsEmployeeFilters}
                      searchable
                    />

                    <FacetFilter
                      title="Trạng thái"
                      options={wbsStatusFacetOptions}
                      selectedValues={wbsStatusFilters}
                      onChange={setWbsStatusFilters}
                    />

                    <FacetFilter
                      title="Phân loại việc"
                      options={wbsTypeFacetOptions}
                      selectedValues={wbsTypeFilters}
                      onChange={setWbsTypeFilters}
                    />

                    {(Boolean(wbsSearch) ||
                      wbsEmployeeFilters.length > 0 ||
                      wbsStatusFilters.length > 0 ||
                      wbsTypeFilters.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setWbsSearch("");
                          setWbsEmployeeFilters([]);
                          setWbsStatusFilters([]);
                          setWbsTypeFilters([]);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition shrink-0 whitespace-nowrap"
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(can("task.create") || can("project.update")) && (
                    <Button
                      size="sm"
                      onClick={() => setIsCreateStageOpen(true)}
                      className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1 shrink-0 whitespace-nowrap px-2.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Giai đoạn</span>
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      tasks.forEach((t) => (all[t.id] = true));
                      setExpandedTasks(all);
                    }}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shrink-0 shadow-2xs"
                    title="Mở rộng tất cả"
                  >
                    <ChevronsDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedTasks({})}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shrink-0 shadow-2xs"
                    title="Thu gọn tất cả"
                  >
                    <ChevronsUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* DANH SÁCH CÔNG VIỆC THEO TỪNG GIAI ĐOẠN TÁCH BIỆT */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 space-y-2">
                  <p>Không có công việc nào phù hợp với bộ lọc hiện tại.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setWbsSearch("");
                      setWbsEmployeeFilters([]);
                      setWbsStatusFilters([]);
                      setWbsTypeFilters([]);
                      setSelectedStageId("all");
                    }}
                    className="text-xs h-7 mt-2"
                  >
                    Đặt lại bộ lọc
                  </Button>
                </div>
              ) : (
                filteredTasks.map((parent) => {
                  const isExpanded = expandedTasks[parent.id] ?? true;
                  const hasChildren = parent.filteredChildren && parent.filteredChildren.length > 0;
                  const canManageTasks = can("task.update") || can("project.update");
                  const canCreateTasks = can("task.create") || can("project.update");
                  const stageIndex = tasks.findIndex((t) => t.id === parent.id);

                  return (
                    <div
                      key={parent.id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                    >
                      {/* HEADER GIAI ĐOẠN (TASK CHA) */}
                      <div className="flex items-center justify-between px-3.5 py-3 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-100 transition-colors">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(parent.id)}
                              className="p-1 text-slate-500 hover:bg-slate-200 rounded transition shrink-0"
                              title={isExpanded ? "Thu gọn việc con" : "Mở rộng việc con"}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}

                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                            {stageIndex >= 0 ? `GĐ ${stageIndex + 1}` : parent.code}
                          </span>

                          <div className="min-w-0 flex-1">
                            <strong
                              onClick={() => openTaskDetail(parent)}
                              className="text-xs font-bold text-slate-900 truncate block cursor-pointer hover:text-blue-600 hover:underline"
                              title="Bấm xem chi tiết giai đoạn"
                            >
                              {parent.title}
                            </strong>
                            {parent.description && (
                              <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5" title={parent.description}>
                                {parent.description}
                              </p>
                            )}
                          </div>

                          {parent.isField ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                              <MapPin className="w-3 h-3 text-amber-600" />
                              <span>Hiện trường</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 border border-slate-200/80">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span>Xưởng</span>
                            </span>
                          )}

                          {parent.dueAt && (
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              Hạn: {parent.dueAt.slice(0, 10)}
                            </span>
                          )}
                          {parent.weight && parent.weight > 1 && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded font-mono font-semibold shrink-0">
                              x{parent.weight}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canCreateTasks && (
                            <button
                              type="button"
                              onClick={() => openCreateSubTaskModal(parent)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition"
                            >
                              + Thêm việc
                            </button>
                          )}

                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => openTaskDetail(parent)}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-200 transition-colors"
                              title="Xem chi tiết giai đoạn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canManageTasks && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(parent);
                                    setEditTaskTitle(parent.title);
                                    setEditTaskDesc(parent.description || "");
                                    setEditTaskWeight(parent.weight || 1);
                                    setEditTaskStartAt(parent.startAt ? parent.startAt.slice(0, 10) : "");
                                    setEditTaskDueAt(parent.dueAt ? parent.dueAt.slice(0, 10) : "");
                                    setEditTaskIsField(Boolean(parent.isField));
                                    setEditTaskAssigneeIds(parent.assignees ? parent.assignees.map((a) => a.employeeId || a.id) : []);
                                    setEditTaskAssigneeSearch("");
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-200 transition-colors"
                                  title="Sửa giai đoạn"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStage(parent)}
                                  className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                  title="Xóa giai đoạn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>

                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all",
                                parent.progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                              )}
                              style={{ width: `${parent.progressPercent}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono text-xs font-bold text-slate-700">
                            {parent.progressPercent}%
                          </span>

                          <Badge
                            variant={
                              parent.status === "done"
                                ? "success"
                                : parent.status === "awaiting_acceptance"
                                ? "info"
                                : parent.status === "doing"
                                ? "warning"
                                : "neutral"
                            }
                            className={cn(
                              "text-xs",
                              parent.status === "awaiting_acceptance" && "bg-sky-50 text-sky-700 border-sky-200"
                            )}
                          >
                            {parent.status === "done"
                              ? "Hoàn thành"
                              : parent.status === "awaiting_acceptance"
                              ? "Chờ nghiệm thu"
                              : parent.status === "doing"
                              ? "Đang làm"
                              : "Chờ làm"}
                          </Badge>
                        </div>
                      </div>

                      {/* DANH SÁCH ĐẦU VIỆC CHÍNH TRỰC THUỘC GIAI ĐOẠN NÀY (LEVEL 2) */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {!hasChildren ? (
                            <div className="py-5 text-center text-xs text-slate-400">
                              Chưa có đầu việc nào trong giai đoạn này.{" "}
                              {canCreateTasks && (
                                <button
                                  type="button"
                                  onClick={() => openCreateSubTaskModal(parent)}
                                  className="text-blue-600 font-semibold hover:underline ml-1"
                                >
                                  + Thêm việc ngay
                                </button>
                              )}
                            </div>
                          ) : (
                            parent.filteredChildren!.map((sub) => {
                              const isSubExpanded = expandedTasks[sub.id] ?? true;
                              const subtasks = sub.filteredSubtasks || sub.children || [];
                              const hasSubtasks = subtasks.length > 0;
                              const doneSubtasksCount = subtasks.filter((c) => c.status === "done").length;
                              const isSubDone = sub.status === "done" || sub.progressPercent === 100;

                              return (
                                <div key={sub.id} className="transition-colors">
                                  {/* HÀNG ĐẦU VIỆC LỚN (LEVEL 2) */}
                                  {/* HÀNG ĐẦU VIỆC LỚN (LEVEL 2) */}
                                  <div className="flex items-center justify-between py-2.5 px-4 text-xs hover:bg-slate-50/70 gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {/* Checkbox tích nhanh đầu việc chính */}
                                      <input
                                        type="checkbox"
                                        checked={isSubDone}
                                        onChange={() => handleQuickToggleTask(sub)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                                        title={isSubDone ? "Hoàn tác chưa xong (0%)" : "Đánh dấu hoàn thành (100%)"}
                                      />

                                      {hasSubtasks ? (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpand(sub.id)}
                                          className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition shrink-0"
                                          title={isSubExpanded ? "Thu gọn việc con" : "Mở rộng việc con"}
                                        >
                                          {isSubExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      ) : (
                                        <div className="w-4 shrink-0" />
                                      )}

                                      <span className="font-mono text-[11px] text-slate-400 shrink-0">{sub.code}</span>
                                      
                                      <div className="min-w-[140px] flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span
                                            onClick={() => openTaskDetail(sub, parent)}
                                            className={cn(
                                              "font-medium cursor-pointer hover:text-blue-600 hover:underline",
                                              isSubDone ? "line-through text-slate-400" : "text-slate-800"
                                            )}
                                            title="Bấm xem chi tiết công việc"
                                          >
                                            {sub.title}
                                          </span>

                                          {sub.isField ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                                              <MapPin className="w-3 h-3 text-amber-600" />
                                              <span>Hiện trường</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0 border border-slate-200/80">
                                              <Building2 className="w-3 h-3 text-slate-500" />
                                              <span>Xưởng</span>
                                            </span>
                                          )}
                                          {sub.dueAt && (
                                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                              Hạn: {sub.dueAt.slice(0, 10)}
                                            </span>
                                          )}
                                          {sub.weight && sub.weight > 1 && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono shrink-0">
                                              x{sub.weight}
                                            </span>
                                          )}
                                        </div>
                                        {sub.description && (
                                          <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5" title={sub.description}>
                                            {sub.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* PHÍA PHẢI: PHÂN CÔNG NHÂN SỰ + TRẠNG THÁI + THAO TÁC */}
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      {/* Phân công nhân sự gọn gàng */}
                                      <div className="flex items-center gap-1">
                                        {sub.assignees && sub.assignees.length > 0 ? (
                                          sub.assignees.length === 1 ? (
                                            <span
                                              className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-full font-medium max-w-[130px]"
                                              title={sub.assignees[0].name}
                                            >
                                              <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[9px] flex items-center justify-center font-bold shrink-0">
                                                {sub.assignees[0].name.trim().charAt(0).toUpperCase()}
                                              </span>
                                              <span className="truncate">{sub.assignees[0].name.split("(")[0].trim()}</span>
                                            </span>
                                          ) : (
                                            <div
                                              className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 cursor-pointer"
                                              onClick={() => openAssignModal(sub)}
                                              title={`Đã phân công ${sub.assignees.length} người: ${sub.assignees.map(a => a.name).join(", ")}`}
                                            >
                                              <div className="flex items-center -space-x-1.5">
                                                {sub.assignees.slice(0, 3).map((a) => (
                                                  <div
                                                    key={a.id}
                                                    className="w-5 h-5 rounded-full bg-blue-100 border-2 border-white text-blue-800 text-[9px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                                    title={a.name}
                                                  >
                                                    {a.name.trim().charAt(0).toUpperCase()}
                                                  </div>
                                                ))}
                                                {sub.assignees.length > 3 && (
                                                  <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white text-slate-700 text-[8px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                                                    +{sub.assignees.length - 3}
                                                  </div>
                                                )}
                                              </div>
                                              <span className="text-[10px] font-medium text-slate-600 pr-0.5">
                                                {sub.assignees.length} người
                                              </span>
                                            </div>
                                          )
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => openAssignModal(sub)}
                                            className="text-[10px] text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-dashed border-slate-200 px-1.5 py-0.5 rounded italic flex items-center gap-1 transition"
                                            title="Bấm để giao việc"
                                          >
                                            <UserPlus className="w-3 h-3 text-slate-400" />
                                            <span>Chưa giao</span>
                                          </button>
                                        )}
                                        {canManageTasks && sub.assignees && sub.assignees.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => openAssignModal(sub)}
                                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                                            title="Thêm / đổi người phân công"
                                          >
                                            <UserPlus className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {hasSubtasks ? (
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {doneSubtasksCount}/{subtasks.length} việc con
                                        </span>
                                      ) : null}

                                      <Badge
                                        variant={
                                          sub.status === "done"
                                            ? "success"
                                            : sub.status === "awaiting_acceptance"
                                            ? "info"
                                            : sub.status === "doing"
                                            ? "warning"
                                            : "neutral"
                                        }
                                        className={cn(
                                          "text-[10px]",
                                          sub.status === "awaiting_acceptance" && "bg-sky-50 text-sky-700 border-sky-200"
                                        )}
                                      >
                                        {sub.progressPercent}% • {
                                          sub.status === "done"
                                            ? "Hoàn thành"
                                            : sub.status === "awaiting_acceptance"
                                            ? "Chờ nghiệm thu"
                                            : sub.status === "doing"
                                            ? "Đang làm"
                                            : "Chờ làm"
                                        }
                                      </Badge>

                                      <div className="flex items-center ml-0.5">
                                        {/* NÚT THÊM VIỆC CON VÀO ĐẦU VIỆC LỚN NÀY (LEVEL 3) */}
                                        {canCreateTasks && (
                                          <button
                                            type="button"
                                            onClick={() => openCreateSubTaskModal(sub)}
                                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-1.5 py-0.5 rounded hover:bg-blue-50 mr-1"
                                            title="Thêm việc con vào đầu việc này"
                                          >
                                            + Việc con
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => openTaskDetail(sub, parent)}
                                          className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                                          title="Xem chi tiết & thao tác công việc"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        {canManageTasks && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingTask(sub);
                                                setEditTaskTitle(sub.title);
                                                setEditTaskDesc(sub.description || "");
                                                setEditTaskWeight(sub.weight || 1);
                                                setEditTaskStartAt(sub.startAt ? sub.startAt.slice(0, 10) : "");
                                                setEditTaskDueAt(sub.dueAt ? sub.dueAt.slice(0, 10) : "");
                                                setEditTaskIsField(Boolean(sub.isField));
                                                setEditTaskAssigneeIds(sub.assignees ? sub.assignees.map((a) => a.employeeId || a.id) : []);
                                                setEditTaskAssigneeSearch("");
                                              }}
                                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                                              title="Sửa công việc"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDeletingTask(sub)}
                                              className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                              title="Xóa công việc"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* KHU VỰC ĐẦU VIỆC CON TRỰC THUỘC (LEVEL 3) */}
                                  {isSubExpanded && hasSubtasks && (
                                    <div className="bg-slate-50/70 border-t border-slate-100/80 pl-9 pr-4 py-1.5 space-y-1">
                                      {subtasks.map((child) => {
                                        const isDone = child.status === "done";

                                        return (
                                          <div
                                            key={child.id}
                                            className="flex items-center justify-between py-1.5 px-2.5 rounded bg-white border border-slate-200/70 text-xs hover:border-slate-300 transition-all"
                                          >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={isDone}
                                                onChange={() => handleQuickToggleTask(child)}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                                                title={isDone ? "Bấm để hoàn tác chưa xong" : "Bấm để đánh dấu hoàn thành"}
                                              />
                                              <span className="font-mono text-[10px] text-slate-400 shrink-0">{child.code}</span>
                                              <span
                                                onClick={() => openTaskDetail(child, sub)}
                                                className={cn(
                                                  "truncate font-medium cursor-pointer hover:text-blue-600 hover:underline min-w-[90px]",
                                                  isDone ? "line-through text-slate-400" : "text-slate-800"
                                                )}
                                                title="Bấm xem chi tiết việc con"
                                              >
                                                {child.title}
                                              </span>
                                              {child.description && (
                                                <span className="text-[10px] text-slate-400 truncate max-w-xs" title={child.description}>
                                                  ({child.description})
                                                </span>
                                              )}
                                              {child.dueAt && (
                                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                  Hạn: {child.dueAt.slice(0, 10)}
                                                </span>
                                              )}
                                            </div>

                                            {/* PHÍA PHẢI: PHÂN CÔNG NHÂN SỰ + TRẠNG THÁI + THAO TÁC */}
                                            <div className="flex items-center gap-2 shrink-0">
                                              {/* Phân công nhân sự việc con gọn gàng */}
                                              <div className="flex items-center gap-1">
                                                {child.assignees && child.assignees.length > 0 ? (
                                                  child.assignees.length === 1 ? (
                                                    <span
                                                      className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50/80 border border-blue-200/60 px-1.5 py-0.2 rounded-full font-medium max-w-[110px]"
                                                      title={child.assignees[0].name}
                                                    >
                                                      <span className="w-3.5 h-3.5 rounded-full bg-blue-200 text-blue-800 text-[8px] flex items-center justify-center font-bold shrink-0">
                                                        {child.assignees[0].name.trim().charAt(0).toUpperCase()}
                                                      </span>
                                                      <span className="truncate">{child.assignees[0].name.split("(")[0].trim()}</span>
                                                    </span>
                                                  ) : (
                                                    <div
                                                      className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-1.5 py-0.2 rounded-full border border-slate-200 cursor-pointer"
                                                      onClick={() => openAssignModal(child)}
                                                      title={`Đã phân công ${child.assignees.length} người: ${child.assignees.map(a => a.name).join(", ")}`}
                                                    >
                                                      <div className="flex items-center -space-x-1">
                                                        {child.assignees.slice(0, 2).map((a) => (
                                                          <div
                                                            key={a.id}
                                                            className="w-4 h-4 rounded-full bg-blue-100 border border-white text-blue-800 text-[8px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                                            title={a.name}
                                                          >
                                                            {a.name.trim().charAt(0).toUpperCase()}
                                                          </div>
                                                        ))}
                                                        {child.assignees.length > 2 && (
                                                          <div className="w-4 h-4 rounded-full bg-slate-200 border border-white text-slate-700 text-[7px] font-bold flex items-center justify-center shrink-0">
                                                            +{child.assignees.length - 2}
                                                          </div>
                                                        )}
                                                      </div>
                                                      <span className="text-[9px] font-medium text-slate-600">
                                                        {child.assignees.length}
                                                      </span>
                                                    </div>
                                                  )
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => openAssignModal(child)}
                                                    className="text-[9px] text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-dashed border-slate-200 px-1.5 py-0.2 rounded italic flex items-center gap-0.5 transition"
                                                    title="Bấm để giao việc"
                                                  >
                                                    <UserPlus className="w-2.5 h-2.5 text-slate-400" />
                                                    <span>Chưa giao</span>
                                                  </button>
                                                )}
                                                {canManageTasks && child.assignees && child.assignees.length > 0 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => openAssignModal(child)}
                                                    className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                                                    title="Thêm / đổi người phân công"
                                                  >
                                                    <UserPlus className="w-2.5 h-2.5" />
                                                  </button>
                                                )}
                                              </div>

                                              <Badge
                                                variant={isDone ? "success" : "neutral"}
                                                className="text-[9px] px-1.5 py-0"
                                              >
                                                {isDone ? "Xong" : "Chờ"}
                                              </Badge>
                                              <button
                                                type="button"
                                                onClick={() => openTaskDetail(child, sub)}
                                                className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                title="Xem chi tiết việc con"
                                              >
                                                <Eye className="w-3 h-3" />
                                              </button>
                                              {canManageTasks && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditingTask(child);
                                                      setEditTaskTitle(child.title);
                                                      setEditTaskDesc(child.description || "");
                                                      setEditTaskWeight(child.weight || 1);
                                                      setEditTaskStartAt(child.startAt ? child.startAt.slice(0, 10) : "");
                                                      setEditTaskDueAt(child.dueAt ? child.dueAt.slice(0, 10) : "");
                                                      setEditTaskIsField(Boolean(child.isField));
                                                      setEditTaskAssigneeIds(child.assignees ? child.assignees.map((a) => a.employeeId || a.id) : []);
                                                      setEditTaskAssigneeSearch("");
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                    title="Sửa việc con"
                                                  >
                                                    <Edit3 className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setDeletingTask(child)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                    title="Xóa việc con"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </>
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
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: NHẬT KÝ BÁO CÁO NGÀY */}

      {activeTab === "production" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4 text-xs">
          {/* PHẦN 1: BẢNG BÓC TÁCH VẬT TƯ & ĐỊNH MỨC KỸ THUẬT (BOM) DỰ ÁN */}
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>Bóc tách vật tư (BOM)</span>
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {projectBoms.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Tổng dự toán vật tư:{" "}
                  <span className="font-semibold text-slate-800">
                    {projectBoms.reduce((s, b) => s + Number(b.estimatedMaterialCost || 0), 0).toLocaleString("vi-VN")} đ
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleCreateBomFromSurvey()}
                  disabled={bomsLoading}
                  className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Lập BOM từ khảo sát</span>
                </Button>
                <Link
                  href={`/kho/nhap-xuat/tao-moi?loai=xuat&du_an=${project.id}&ma_du_an=${project.code}`}
                  className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo phiếu xuất kho</span>
                </Link>
                <Link
                  href={`/du-an/${projectId}/thiet-ke-quy-chuan`}
                  className="h-8 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Studio Maket</span>
                </Link>
              </div>
            </div>

            {bomsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Đang tải dữ liệu BOM bóc tách dự án...
              </div>
            ) : projectBoms.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-800 text-xs">Chưa có bảng BOM bóc tách cho dự án này</h5>
                    <p className="text-[11px] text-slate-500">
                      Lập BOM tự động từ số liệu đo đạc hiện trường của phiếu khảo sát.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCreateBomFromSurvey()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Lập BOM ngay</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projectBoms.map((bom) => {
                  const itemsList = bom.itemsJson || [];
                  return (
                    <div key={bom.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                      {/* HEADER BOM */}
                      <div className="bg-slate-50/80 p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                            {bom.code}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block truncate">{bom.title}</span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {bom.widthMeters}m × {bom.heightMeters}m × {bom.depthMeters}m (DT: <strong>{bom.areaSqm} m²</strong>) • {new Date(bom.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap self-end md:self-auto shrink-0">
                          <span className="font-mono font-bold text-[13px] text-slate-900 mr-1 tabular-nums">
                            {Number(bom.estimatedMaterialCost || 0).toLocaleString("vi-VN")} đ
                          </span>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditBom(bom)}
                            className="h-7 px-2 text-[11px]"
                            title="Chỉnh sửa chi tiết định mức BOM & Vật tư"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateBom(bom)}
                            className="h-7 px-2 text-[11px]"
                            title="Nhân bản tạo bảng BOM mới"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Nhân bản</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBom(bom)}
                            className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
                            title="Xóa bảng BOM này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          <Link
                            href={`/kho/nhap-xuat/tao-moi?loai=xuat&du_an=${project.id}&ma_du_an=${project.code}&bom_code=${bom.code}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Xuất kho</span>
                          </Link>
                        </div>
                      </div>

                      {/* TỔNG KẾT THÔNG SỐ KỸ THUẬT */}
                      <div className="p-3 bg-slate-50/40 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                          <span className="text-slate-400 block text-[10px]">Khung sắt ({bom.ironBoxType || "25x25"})</span>
                          <span className="font-bold text-slate-800 tabular-nums">{bom.calculatedSteelMeters} m ({bom.calculatedSteelBars} cây 6m)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                          <span className="text-slate-400 block text-[10px]">Mặt dựng ({bom.aluSheetSize || "Alu/Bạt"})</span>
                          <span className="font-bold text-slate-800 tabular-nums">{bom.calculatedAluSheets} tấm (hao hụt {bom.aluScrapRate}%)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                          <span className="text-slate-400 block text-[10px]">Chiếu sáng LED</span>
                          <span className="font-bold text-slate-800 tabular-nums">{bom.calculatedLedCount} bóng ({bom.calculatedTotalWatts}W)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                          <span className="text-slate-400 block text-[10px]">Nguồn 12V ngoài trời</span>
                          <span className="font-bold text-slate-800 tabular-nums">{bom.calculatedPowerUnits} bộ ({bom.powerUnitWatts}W)</span>
                        </div>
                      </div>

                      {/* BẢNG CHI TIẾT DANH MỤC VẬT TƯ */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                            <tr>
                              <th className="px-3 py-2 w-10 text-center">STT</th>
                              <th className="px-3 py-2 w-32">Phân loại</th>
                              <th className="px-3 py-2 w-28">Mã SKU</th>
                              <th className="px-3 py-2">Tên vật tư & Quy cách</th>
                              <th className="px-3 py-2 w-16 text-center">ĐVT</th>
                              <th className="px-3 py-2 w-20 text-right">Định mức</th>
                              <th className="px-3 py-2 w-24 text-right">Đơn giá (đ)</th>
                              <th className="px-3 py-2 w-28 text-right">Thành tiền (đ)</th>
                              <th className="px-3 py-2 w-48">Ghi chú kỹ thuật</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {itemsList.map((it: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium">
                                  <Badge
                                    variant={
                                      it.category === "Logo & Nhận diện"
                                        ? "warning"
                                        : it.category === "Nội thất & POSM"
                                        ? "info"
                                        : it.category === "Khung sắt"
                                        ? "neutral"
                                        : "success"
                                    }
                                    className="text-[10px]"
                                  >
                                    {it.category}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-600">{it.itemCode}</td>
                                <td className="px-3 py-2 font-medium text-slate-900">{it.itemName}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{it.unit}</td>
                                <td className="px-3 py-2 text-right font-bold text-blue-700 font-mono">
                                  {Number(it.quantity).toLocaleString("vi-VN")}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-600 font-mono">
                                  {Number(it.unitPrice).toLocaleString("vi-VN")}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono">
                                  {Number(it.amount).toLocaleString("vi-VN")}
                                </td>
                                <td className="px-3 py-2 text-slate-500 truncate max-w-xs">{it.note || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PHẦN 2: VẬT TƯ ĐÃ XUẤT & PHIẾU KHO LIÊN QUAN */}
          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Vật tư đã xuất & phiếu kho
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-500">{project.code}</span>
            </div>

            {materialsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Đang tải dữ liệu vật tư và phiếu kho...
              </div>
            ) : (
              <div className="p-3 space-y-4">
                {/* Bảng 1: Vật tư đã xuất kho */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Vật tư đã thực xuất ({materials.length})
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
                              <td className="px-3 py-2 text-right font-bold text-slate-800 font-mono tabular-nums">
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
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Phiếu xuất / nhập kho ({stockDocuments.length})
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
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{doc.code}</td>
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
                              <td className="px-3 py-2 text-slate-600 tabular-nums">
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
              </div>
            )}
          </section>
        </div>
      )}

      {/* 6. TAB: THU CHI & SỔ QUỸ DỰ ÁN (TỐI GIẢN MỞ RỘNG) */}
      {activeTab === "finance" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4 text-xs">
          {!can("project_finance.read") ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bạn không có quyền truy cập dữ liệu tài chính của dự án này (yêu cầu quyền: project_finance.read).</span>
            </div>
          ) : financeLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Đang tải sổ quỹ & thu chi công trình...
            </div>
          ) : !finance ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Không tìm thấy dữ liệu tài chính cho dự án này.
            </div>
          ) : (
            <>
              {/* Header Tab Tài chính: Tiêu đề + thống kê inline & Nút Tạo Thu / Chi */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>Sổ quỹ & Thu chi</span>
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {finance.payments?.length || 0}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    Đã thu <span className="font-semibold text-emerald-700">{finance.receiptsTotal.toLocaleString("vi-VN")} đ</span>
                    <span className="text-slate-300 mx-1.5">•</span>
                    Đã chi <span className="font-semibold text-rose-700">{(finance.actualTotalCost || (finance.materialCost + finance.disbursementsTotal)).toLocaleString("vi-VN")} đ</span>
                    <span className="text-slate-300 mx-1.5">•</span>
                    Số dư <span className="font-semibold text-slate-800">{(finance.receiptsTotal - (finance.materialCost + finance.disbursementsTotal)).toLocaleString("vi-VN")} đ</span>
                    <span className="text-slate-300 mx-1.5">•</span>
                    Còn phải thu <span className="font-semibold text-amber-700">{finance.receivablesTotal.toLocaleString("vi-VN")} đ</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleOpenCreatePayment("receipt")}
                    className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-2xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo phiếu thu</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenCreatePayment("disbursement")}
                    className="h-8 text-xs gap-1.5 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo phiếu chi</span>
                  </Button>
                </div>
              </div>

              {/* Lịch sử sổ quỹ chi tiết */}
              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Lịch sử thu chi ({finance.payments?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400">Đồng bộ sổ quỹ doanh nghiệp</span>
                </div>

                {!finance.payments || finance.payments.length === 0 ? (
                  <div className="m-3 py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <p>Chưa có khoản thu chi nào được ghi nhận cho dự án này.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenCreatePayment("receipt")}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Tạo khoản thu chi đầu tiên
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Mã phiếu</th>
                          <th className="px-3 py-2">Thời gian</th>
                          <th className="px-3 py-2">Loại</th>
                          <th className="px-3 py-2">Tài khoản / Sổ quỹ</th>
                          <th className="px-3 py-2">Lý do / Nội dung thu chi</th>
                          <th className="px-3 py-2 text-right">Số tiền (VNĐ)</th>
                          <th className="px-3 py-2 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finance.payments.map((p) => {
                          const isReceipt = p.direction === "receipt";
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                                {p.code}
                              </td>
                              <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[11px] tabular-nums">
                                {p.paidAt ? new Date(p.paidAt).toLocaleString("vi-VN") : "Gần đây"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Badge variant={isReceipt ? "success" : "danger"} className="text-[10px]">
                                  {isReceipt ? "Thu" : "Chi"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-700 whitespace-nowrap font-medium">
                                {p.accountName || "Quỹ tiền mặt"}
                              </td>
                              <td className="px-3 py-2 text-slate-800 font-medium max-w-xs truncate" title={p.purpose}>
                                {p.purpose}
                              </td>
                              <td className={cn(
                                "px-3 py-2 text-right font-mono font-bold whitespace-nowrap tabular-nums",
                                isReceipt ? "text-emerald-700" : "text-rose-700"
                              )}>
                                {isReceipt ? "+" : "-"}{p.amount.toLocaleString("vi-VN")} đ
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <Badge variant={p.status === "posted" ? "success" : "neutral"} className="text-[10px]">
                                  {p.status === "posted" ? "Đã ghi sổ" : p.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* 7. TAB TÀI LIỆU & HỒ SƠ DỰ ÁN (Gộp ảnh hiện trường WBS, Nghiệm thu ký số, Hóa đơn chứng từ hợp đồng) */}
      {activeTab === "documents" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4 text-xs">
          {/* Thanh lọc loại tài liệu & Nút tác vụ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-slate-100">
            {/* Bộ lọc sub-categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "all", label: "Tất cả", count: wbsFieldPhotos.length + photos.length + customDocuments.length + acceptances.length },
                { id: "photos", label: "Ảnh hiện trường", count: wbsFieldPhotos.length + photos.length + customDocuments.filter(d => d.type === "field_photo").length },
                { id: "acceptance", label: "Nghiệm thu", count: acceptances.length },
                { id: "invoices_contracts", label: "Hóa đơn & Hợp đồng", count: customDocuments.filter(d => d.type === "invoice" || d.type === "contract").length },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setDocSubFilter(sub.id as any)}
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition border tabular-nums",
                    docSubFilter === sub.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                  )}
                >
                  {sub.label} ({sub.count})
                </button>
              ))}
            </div>

            {/* Cụm nút hành động */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsUploadDocOpen(true)}
                className="h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tải tài liệu
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAcceptanceOpen(true)}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1" />
                Lập biên bản nghiệm thu
              </Button>
            </div>
          </div>

          {/* KHU VỰC 1: ẢNH HIỆN TRƯỜNG & THI CÔNG */}
          {(docSubFilter === "all" || docSubFilter === "photos") && (
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Ảnh hiện trường ({wbsFieldPhotos.length + photos.length + customDocuments.filter(d => d.type === "field_photo").length})
                </span>
                <span className="text-[10px] text-slate-400">Tự động đồng bộ từ WBS</span>
              </div>
              <div className="p-3">

              {/* Grid ảnh */}
              {wbsFieldPhotos.length === 0 && photos.length === 0 && customDocuments.filter(d => d.type === "field_photo").length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-medium text-slate-500">Chưa có ảnh hiện trường nào</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ảnh chụp bằng chứng khi thợ cập nhật tiến độ ở đầu việc WBS sẽ tự động xuất hiện tại đây
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {/* Ảnh lấy tự động từ các đầu việc WBS */}
                  {wbsFieldPhotos.map((wp) => (
                    <div
                      key={wp.id}
                      onClick={() => setLightboxPhoto({ id: wp.id, url: wp.url, stage: wp.taskTitle, desc: `Công việc WBS • Cập nhật: ${wp.date}`, date: wp.date })}
                      className="group border border-slate-200 rounded-lg overflow-hidden bg-slate-50 cursor-pointer hover:border-slate-400 hover:shadow-sm transition-all"
                    >
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img src={wp.url} alt={wp.taskTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-medium">
                          WBS
                        </span>
                      </div>
                      <div className="p-2 space-y-0.5">
                        <strong className="text-slate-900 block truncate" title={wp.taskTitle}>{wp.taskTitle}</strong>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate">{wp.assigneeName}</span>
                          <span>{wp.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Ảnh chụp giai đoạn dự án */}
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setLightboxPhoto(p)}
                      className="group border border-slate-200 rounded-lg overflow-hidden bg-slate-50 cursor-pointer hover:border-slate-400 hover:shadow-sm transition-all"
                    >
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img src={p.url} alt={p.stage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-medium">
                          Giai đoạn
                        </span>
                      </div>
                      <div className="p-2 space-y-0.5">
                        <strong className="text-slate-900 block truncate">{p.stage}</strong>
                        <p className="text-[11px] text-slate-500 truncate">{p.desc}</p>
                        <span className="text-[10px] text-slate-400 block">{p.date}</span>
                      </div>
                    </div>
                  ))}

                  {/* Ảnh tải lên thủ công */}
                  {customDocuments.filter(d => d.type === "field_photo").map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setLightboxPhoto({ id: d.id, url: d.url, stage: d.title, desc: d.notes || "Ảnh tải lên bổ sung", date: new Date(d.uploadedAt).toLocaleDateString("vi-VN") })}
                      className="group border border-slate-200 rounded-lg overflow-hidden bg-slate-50 cursor-pointer hover:border-slate-400 hover:shadow-sm transition-all"
                    >
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img src={d.url} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-medium">
                          Tải lên
                        </span>
                      </div>
                      <div className="p-2 space-y-0.5">
                        <strong className="text-slate-900 block truncate">{d.title}</strong>
                        <p className="text-[11px] text-slate-500 truncate">{d.notes || d.uploaderName}</p>
                        <span className="text-[10px] text-slate-400 block">{new Date(d.uploadedAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </section>
          )}

          {/* KHU VỰC 2: BIÊN BẢN NGHIỆM THU */}
          {(docSubFilter === "all" || docSubFilter === "acceptance") && (
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Biên bản nghiệm thu ({acceptances.length})
                </span>
                <span className="text-[10px] text-slate-400">Ký số trực tiếp</span>
              </div>
              <div className="p-3">

              {acceptances.length === 0 ? (
                <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  Chưa có biên bản nghiệm thu nào được tạo.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg bg-white">
                  {acceptances.map((a) => (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 gap-3 hover:bg-slate-50/60 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-bold text-slate-900">{a.code}</span>
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
                        <div className="text-slate-600 mt-1 flex items-center gap-3">
                          <span>Người ký: <strong className="text-slate-800">{a.customerSignerName || "Chưa ký"}</strong></span>
                          <span>•</span>
                          <span>Ngày lập: {new Date(a.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {a.status === "submitted" && (can("acceptance.approve") || can("project.update")) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateAcceptanceStatus(a.id, "approved")}
                              className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white"
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
                          onClick={() => setSignatureModalAcceptance(a)}
                          className={cn(
                            "h-7 text-xs",
                            a.signatureData
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "text-slate-600"
                          )}
                          title="Ký xác nhận trực tiếp trên điện thoại/máy tính bảng"
                        >
                          <PenTool className="w-3.5 h-3.5 mr-1" />
                          {a.signatureData ? "Đã ký số (Ký lại)" : "Ký số"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewAcceptance(a)}
                          className="h-7 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
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
            </section>
          )}

          {/* KHU VỰC 3: HÓA ĐƠN & HỢP ĐỒNG */}
          {(docSubFilter === "all" || docSubFilter === "invoices_contracts") && (
            <section className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Hóa đơn & hợp đồng ({customDocuments.filter(d => d.type !== "field_photo").length})
                </span>
              </div>
              <div className="p-3">

              {customDocuments.filter(d => docSubFilter === "all" ? d.type !== "field_photo" : (d.type === "invoice" || d.type === "contract" || d.type === "other")).length === 0 ? (
                <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-medium text-slate-500">Chưa có hóa đơn hoặc chứng từ nào được lưu trữ</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bấm "Tải lên tài liệu / Hóa đơn" ở trên để đính kèm tệp PDF, scan hóa đơn hoặc ảnh chụp chứng từ
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg bg-white">
                  {customDocuments
                    .filter(d => docSubFilter === "all" ? d.type !== "field_photo" : (d.type === "invoice" || d.type === "contract" || d.type === "other"))
                    .map((doc) => (
                      <div key={doc.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 text-slate-600">
                            {doc.type === "invoice" ? <Receipt className="w-4 h-4" /> : <FolderKanban className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs">{doc.title}</span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="capitalize font-medium text-slate-600">
                                {doc.type === "invoice" ? "Hóa đơn / Chứng từ" : doc.type === "contract" ? "Hợp đồng / Pháp lý" : "Khác"}
                              </span>
                              <span>•</span>
                              <span>Tải bởi {doc.uploaderName || "Người dùng"}</span>
                              <span>•</span>
                              <span>{new Date(doc.uploadedAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                            {doc.notes && <p className="text-[11px] text-slate-600 mt-1 italic">{doc.notes}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem tệp
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* 8. TAB 6: ĐỘI NGŨ DỰ ÁN & TIẾN ĐỘ TỪNG NHÂN SỰ */}
      {activeTab === "members" && (() => {
        // Thu thập toàn bộ công việc thực thi (Level 2 Đầu việc lớn & Level 3 Đầu việc con)
        const executableTasks: WbsTaskDto[] = [];
        tasks.forEach((stage) => {
          if (stage.children && stage.children.length > 0) {
            stage.children.forEach((l2) => {
              executableTasks.push(l2);
              if (l2.children && l2.children.length > 0) {
                executableTasks.push(...l2.children);
              }
            });
          }
        });

        const today = new Date().toISOString().slice(0, 10);

        // Thống kê chi tiết theo từng thành viên (hỗ trợ việc giao cho nhiều người)
        const membersWithStats = members.map((m) => {
          const assignedTasks = executableTasks.filter((t) =>
            t.assignees && t.assignees.some((a) =>
              (m.employeeId && (a.id === m.employeeId || a.employeeId === m.employeeId)) ||
              (m.id && a.id === m.id) ||
              (m.employeeName && a.name.toLowerCase() === m.employeeName.toLowerCase())
            )
          );

          const totalAssigned = assignedTasks.length;
          const doneCount = assignedTasks.filter((t) => t.status === "done" || t.progressPercent === 100).length;
          const doingCount = assignedTasks.filter((t) => (t.status === "doing" || (t.progressPercent > 0 && t.progressPercent < 100)) && t.status !== "done").length;
          const todoCount = assignedTasks.filter((t) => (t.status === "todo" || !t.status) && (t.progressPercent === 0 || !t.progressPercent)).length;
          const overdueCount = assignedTasks.filter((t) => t.status !== "done" && (t.progressPercent || 0) < 100 && t.dueAt && t.dueAt < today).length;
          const completionPct = totalAssigned > 0
            ? Math.round(assignedTasks.reduce((acc, t) => acc + (t.progressPercent || 0), 0) / totalAssigned)
            : 0;
          const roleInfo = getProjectRoleInfo(m.duty);

          return {
            member: m,
            assignedTasks,
            totalAssigned,
            doneCount,
            doingCount,
            todoCount,
            overdueCount,
            completionPct,
            roleInfo,
          };
        });

        // Tìm công việc chưa phân công trong các đầu việc cần làm
        const unassignedTasks = executableTasks.filter(
          (t) => !t.assignees || t.assignees.length === 0
        );

        const totalTasksInProject = executableTasks.length;
        const totalDoneInProject = executableTasks.filter((t) => t.status === "done" || t.progressPercent === 100).length;
        const totalOverdueInProject = executableTasks.filter((t) => t.status !== "done" && (t.progressPercent || 0) < 100 && t.dueAt && t.dueAt < today).length;

        const memberQuery = memberSearch.trim().toLowerCase();
        const filteredMembers = membersWithStats
          .filter((item) => memberRoleFilter === "all" || item.roleInfo.key === memberRoleFilter)
          .filter(
            (item) =>
              !memberQuery ||
              (item.member.employeeName || item.member.userName || "").toLowerCase().includes(memberQuery) ||
              (item.member.employeeCode || "").toLowerCase().includes(memberQuery) ||
              (item.member.employeePhone || "").toLowerCase().includes(memberQuery)
          );

        return (
          <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-5 text-xs">
            {/* Header gọn: tiêu đề + thống kê inline + tìm kiếm + tác vụ */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>Thành viên</span>
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {members.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {totalTasksInProject - unassignedTasks.length}/{totalTasksInProject} việc đã giao
                  <span className="text-slate-300 mx-1.5">•</span>
                  <span className="text-emerald-700 font-medium">{totalDoneInProject} xong</span>
                  {totalOverdueInProject > 0 && (
                    <>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span className="text-rose-600 font-medium">{totalOverdueInProject} trễ hạn</span>
                    </>
                  )}
                  {unassignedTasks.length > 0 && (
                    <>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span className="text-amber-700 font-medium">{unassignedTasks.length} chưa giao</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm tên, mã, SĐT..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-8 pr-7 text-xs h-8 w-44 sm:w-52 bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                  {memberSearch && (
                    <button
                      type="button"
                      onClick={() => setMemberSearch("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchMembers}
                  disabled={membersLoading}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shrink-0"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", membersLoading && "animate-spin")} />
                </button>
                {(can("project.assign") || can("project.update") || isSuperAdmin || isProjectPM || canAssignTeam) && (
                  <Button
                    size="sm"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-2xs whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Thêm thành viên
                  </Button>
                )}
              </div>
            </div>

            {/* Lọc vai trò: 1 hàng pill duy nhất */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setMemberRoleFilter("all")}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition border",
                  memberRoleFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                )}
              >
                Tất cả ({members.length})
              </button>
              {PROJECT_ROLES.map((role) => {
                const countInRole = membersWithStats.filter((m) => m.roleInfo.key === role.key).length;
                const isSelected = memberRoleFilter === role.key;
                const shortLabel = role.label.split("/")[0].split("(")[0].trim();
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setMemberRoleFilter(isSelected ? "all" : role.key)}
                    title={role.description}
                    className={cn(
                      "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition border tabular-nums",
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900"
                        : countInRole === 0
                        ? "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                        : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                    )}
                  >
                    {shortLabel} ({countInRole})
                  </button>
                );
              })}
            </div>

            {/* Danh sách thành viên */}
            {membersLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Đang tải dữ liệu tiến độ nhân sự...
              </div>
            ) : members.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
                <p>Chưa có thành viên nào được phân công vào dự án.</p>
                <Button size="sm" onClick={() => setIsAddMemberOpen(true)} className="h-7 text-xs bg-slate-900 text-white">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Thêm thành viên đầu tiên
                </Button>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Không tìm thấy thành viên phù hợp bộ lọc.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers
                  .map(({ member: m, assignedTasks, totalAssigned, doneCount, doingCount, todoCount, overdueCount, completionPct, roleInfo }) => {
                  const isExpanded = expandedMembers[m.id] ?? (totalAssigned > 0);
                  const toggleExpand = () => {
                    setExpandedMembers((prev) => ({ ...prev, [m.id]: !isExpanded }));
                  };

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors overflow-hidden"
                    >
                      {/* Hàng tổng quan: bấm để xổ/thu việc */}
                      <div
                        onClick={toggleExpand}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {(m.employeeName || m.userName || "NV").charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-[13px] truncate">
                              {m.employeeName || m.userName || "Chưa có tên"}
                            </span>
                            {m.employeeCode && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-px rounded border border-slate-200 shrink-0">
                                {m.employeeCode}
                              </span>
                            )}
                            {(isProjectPM || canAssignTeam) ? (
                              <span onClick={(e) => e.stopPropagation()} className="inline-flex shrink-0">
                                <select
                                  value={roleInfo.key}
                                  onChange={(e) => {
                                    const selected = PROJECT_ROLES.find((r) => r.key === e.target.value);
                                    if (selected) {
                                      handleUpdateMemberRole(m.id, selected.label);
                                    }
                                  }}
                                  className={cn(
                                    "text-[10px] font-semibold px-1 py-0.5 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white",
                                    roleInfo.badgeClass
                                  )}
                                  title="Đổi vai trò trong dự án"
                                >
                                  {PROJECT_ROLES.map((role) => (
                                    <option key={role.key} value={role.key}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </span>
                            ) : (
                              <span className={cn("text-[10px] font-semibold px-1.5 py-px rounded-md border shrink-0", roleInfo.badgeClass)}>
                                {roleInfo.label}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums truncate">
                            {totalAssigned} việc
                            <span className="text-slate-300 mx-1">•</span>
                            <span className="text-emerald-700 font-medium">{doneCount} xong</span>
                            {doingCount > 0 && (
                              <>
                                <span className="text-slate-300 mx-1">•</span>
                                <span>{doingCount} đang làm</span>
                              </>
                            )}
                            {overdueCount > 0 && (
                              <>
                                <span className="text-slate-300 mx-1">•</span>
                                <span className="text-rose-600 font-medium">{overdueCount} trễ</span>
                              </>
                            )}
                            {m.employeePhone && (
                              <>
                                <span className="text-slate-300 mx-1">•</span>
                                <a
                                  href={`tel:${m.employeePhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:text-blue-600 font-mono"
                                >
                                  {m.employeePhone}
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-32">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", completionPct === 100 ? "bg-emerald-500" : "bg-slate-700")}
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold font-mono text-slate-700 w-9 text-right">
                            {completionPct}%
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(can("project.assign") || can("project.update") || isSuperAdmin || isProjectPM || canAssignTeam) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Gỡ khỏi dự án"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={toggleExpand}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title={isExpanded ? "Thu gọn danh sách việc" : "Mở rộng danh sách việc"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Danh sách công việc chi tiết của nhân sự (Collapsible) */}
                      {isExpanded && (
                        <div className="p-3 bg-white space-y-2">
                          {assignedTasks.length === 0 ? (
                            <div className="py-4 text-center text-slate-400 text-[11px] italic">
                              Chưa có đầu việc nào được phân công cho nhân sự này.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                              {assignedTasks.map((t) => {
                                const isOverdue = t.status !== "done" && t.dueAt && t.dueAt < today;
                                const isCompleted = t.status === "done" || t.progressPercent === 100;
                                const otherAssignees = (t.assignees || []).filter(
                                  (a) =>
                                    (m.employeeId ? (a.employeeId !== m.employeeId && a.id !== m.employeeId) : a.name.toLowerCase() !== (m.employeeName || "").toLowerCase())
                                );

                                return (
                                  <div
                                    key={t.id}
                                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition text-xs"
                                  >
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => handleQuickToggleTask(t)}
                                          className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition shrink-0",
                                            isCompleted
                                              ? "bg-emerald-600 border-emerald-600 text-white"
                                              : "border-slate-300 hover:border-emerald-500 bg-white"
                                          )}
                                          title={isCompleted ? "Bấm để hoàn tác chưa xong" : "Bấm để đánh dấu hoàn thành (100%)"}
                                        >
                                          {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                                        </button>

                                        <span className="font-mono text-[11px] text-slate-400 shrink-0">{t.code}</span>
                                        <span
                                          onClick={() => openTaskDetail(t)}
                                          className={cn(
                                            "font-medium truncate hover:text-blue-600 hover:underline cursor-pointer",
                                            isCompleted ? "line-through text-slate-400" : "text-slate-900"
                                          )}
                                          title="Bấm để xem chi tiết & cập nhật tiến độ"
                                        >
                                          {t.title}
                                        </span>

                                        {/* Icon đơn sắc Hiện trường / Xưởng */}
                                        {t.isField ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                            <MapPin className="w-3 h-3 text-slate-500" />
                                            <span>Hiện trường</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 border border-slate-200/80">
                                            <Building2 className="w-3 h-3 text-slate-500" />
                                            <span>Xưởng</span>
                                          </span>
                                        )}

                                        {t.dueAt && (
                                          <span className={cn("text-[10px] shrink-0 font-mono", isOverdue ? "text-rose-600 font-bold" : "text-slate-400")}>
                                            Hạn: {t.dueAt.slice(0, 10)} {isOverdue && "(Trễ hạn)"}
                                          </span>
                                        )}
                                      </div>

                                      {/* Hiển thị đồng đội cùng thực hiện (nếu giao nhiều người) */}
                                      {otherAssignees.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 pl-6 flex-wrap">
                                          <span className="text-slate-400">👥 Cùng làm với:</span>
                                          <div className="flex items-center gap-1 flex-wrap">
                                            {otherAssignees.map((a) => (
                                              <span
                                                key={a.id}
                                                className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium border border-slate-200"
                                              >
                                                {a.name}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Progress Bar mini */}
                                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 hidden sm:block">
                                        <div
                                          className={cn("h-full", t.progressPercent === 100 ? "bg-emerald-600" : "bg-blue-600")}
                                          style={{ width: `${t.progressPercent}%` }}
                                        />
                                      </div>

                                      <Badge
                                        variant={
                                          t.status === "done"
                                            ? "success"
                                            : t.status === "awaiting_acceptance"
                                            ? "info"
                                            : t.status === "doing"
                                            ? "warning"
                                            : "neutral"
                                        }
                                        className="text-[10px]"
                                      >
                                        {t.progressPercent}% • {t.status === "done"
                                          ? "Hoàn thành"
                                          : t.status === "awaiting_acceptance"
                                          ? "Chờ nghiệm thu"
                                          : t.status === "doing"
                                          ? "Đang làm"
                                          : "Chờ làm"}
                                      </Badge>

                                      <button
                                        type="button"
                                        onClick={() => openTaskDetail(t)}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition"
                                        title="Xem chi tiết & thao tác đầu việc"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Khối công việc chưa phân công (nếu có) */}
            {unassignedTasks.length > 0 && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-amber-950 text-xs">
                      Công việc chưa phân công nhân sự ({unassignedTasks.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-700">
                    Bấm vào từng việc để mở chi tiết và giao việc
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {unassignedTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openTaskDetail(t)}
                      className="p-2.5 rounded-lg bg-white border border-amber-200 hover:border-blue-400 transition cursor-pointer space-y-1 shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-400">{t.code}</span>
                        <Badge variant="neutral" className="text-[9px]">
                          {t.progressPercent}%
                        </Badge>
                      </div>
                      <div className="font-medium text-slate-800 text-[11px] truncate group-hover:text-blue-600">
                        {t.title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>{t.isField ? "Hiện trường" : "Tại xưởng"}</span>
                        <span className="text-blue-600 font-semibold group-hover:underline">Giao việc ngay →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 9. TAB 7: KHẢO SÁT & MARKET THIẾT KẾ 2D/3D */}
      {activeTab === "design" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-4 text-xs">
          {/* PHẦN 1: KHẢO SÁT HIỆN TRƯỜNG */}
          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Khảo sát hiện trường ({projectSurveys.length})
                </span>
                {projectSurveys.length > 0 && (
                  <span className="block text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    Tổng diện tích:{" "}
                    <span className="font-semibold text-slate-800">
                      {projectSurveys.reduce((s, sv) => s + (sv.widthMeters || 0) * (sv.heightMeters || 0), 0).toFixed(2)} m²
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={handleOpenCreateSurvey}
                  className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo khảo sát</span>
                </Button>
                <Link
                  href={`/khao-sat`}
                  className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Quản lý khảo sát
                </Link>
              </div>
            </div>

            <div className="p-3">
            {projectSurveys.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">Chưa liên kết phiếu khảo sát hiện trường</span>
                    <p className="text-[11px] text-slate-500">Tạo phiếu đo đạc để tự động tính diện tích và lập dự toán vật tư.</p>
                  </div>
                </div>
                <Button
                  onClick={handleOpenCreateSurvey}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium shrink-0 flex items-center gap-1.5 text-xs shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo phiếu đo đạc</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectSurveys.map((sv) => {
                  const areaM2 = ((sv.widthMeters || 0) * (sv.heightMeters || 0)).toFixed(2);
                  const meta = sv.metadata || {};
                  const dealerName = meta.dealerName || sv.title;
                  const dealerPhone = meta.dealerPhone || sv.customerPhone;
                  const dealerAddress = meta.dealerAddress || sv.address;
                  const surveyStatus = meta.executionStatus || (sv.status === "converted" ? "Đã thành dự toán" : sv.status === "completed" ? "Đã đo đạc" : "Đang chốt");
                  const surveyStatusTone = /đã thành|đã đo|hoàn thành/i.test(surveyStatus)
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : /chốt|chờ|đang/i.test(surveyStatus)
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-600 border-slate-200";

                  return (
                    <div key={sv.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-3 shadow-2xs">
                      {/* HEADER THẺ KHẢO SÁT */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[11px] text-slate-700 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                            {sv.code}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {meta.regionKV || "MIỀN TÂY"}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {meta.workType || "BẢNG HIỆU"}
                          </span>
                          <span className={cn("px-1.5 py-0.5 text-[10px] font-semibold rounded-md border", surveyStatusTone)}>
                            {surveyStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditSurvey(sv)}
                            title="Sửa phiếu khảo sát"
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateSurvey(sv)}
                            title="Nhân bản phiếu khảo sát"
                            className="p-1 hover:bg-blue-100 rounded text-slate-500 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSurvey(sv.id)}
                            title="Xóa phiếu khảo sát"
                            className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* TÊN ĐẠI LÝ & ĐỊA ĐIỂM */}
                      <div>
                        <div className="font-bold text-slate-900 text-xs truncate flex items-center justify-between">
                          <span className="truncate">{dealerName}</span>
                          {dealerPhone && (
                            <span className="font-mono text-[11px] text-blue-600 shrink-0 ml-2">ĐT: {dealerPhone}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5" title={dealerAddress}>
                          {dealerAddress}
                        </div>
                      </div>

                      {/* THÔNG SỐ KỸ THUẬT & QUY CÁCH BẢNG */}
                      <div className="space-y-1.5 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Kích thước (D x C x S):</span>
                          <span className="font-mono font-bold text-slate-800">
                            {sv.widthMeters}m × {sv.heightMeters}m × {sv.depthMeters}m (<span className="text-emerald-600">{areaM2} m²</span>)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Chất liệu bảng:</span>
                          <span className="font-semibold text-slate-700">{meta.signMaterial || "Bảng alu ngoài trời"}</span>
                        </div>
                        {(meta.hasMicaLogo65 || meta.hasSideTrim || meta.hasColorStrip || meta.subAccessories) && (
                          <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-600">
                            <span className="font-semibold text-purple-700">Phụ kiện: </span>
                            {meta.hasMicaLogo65 && <span className="bg-purple-50 text-purple-700 px-1 py-0.2 rounded mr-1">Mica 65×65</span>}
                            {meta.hasSideTrim && <span className="bg-blue-50 text-blue-700 px-1 py-0.2 rounded mr-1">Nẹp lườn</span>}
                            {meta.hasColorStrip && <span className="bg-rose-50 text-rose-700 px-1 py-0.2 rounded mr-1">Dải 3 màu</span>}
                            {meta.subAccessories && <span>{meta.subAccessories}</span>}
                          </div>
                        )}
                        {(meta.displayShelves || meta.furniture || meta.otherPosm) && (
                          <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-600 truncate">
                            <span className="font-semibold text-blue-700">Nội thất: </span>
                            <span>{[meta.displayShelves, meta.furniture, meta.otherPosm].filter(Boolean).join(" • ")}</span>
                          </div>
                        )}
                        {(meta.repairScope || meta.deliverySchedule) && (
                          <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-600 truncate">
                            {meta.repairScope && <span className="text-amber-700 font-semibold">Sửa chữa: {meta.repairScope} • </span>}
                            {meta.deliverySchedule && <span className="text-slate-500">Lịch: {meta.deliverySchedule}</span>}
                          </div>
                        )}
                      </div>

                      {/* CHÂN THẺ: NÚT LẬP BOM & VẼ MAKET */}
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateBomFromSurvey(sv)}
                          className="h-7 px-2.5 text-[11px] font-semibold rounded-md inline-flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Lập BOM</span>
                        </Button>
                        <Link
                          href={`/du-an/${projectId}/thiet-ke-quy-chuan?surveyId=${sv.id}&w=${sv.widthMeters}&h=${sv.heightMeters}&d=${sv.depthMeters || 0.2}&title=${encodeURIComponent(dealerName)}&addr=${encodeURIComponent(dealerAddress)}`}
                          className="font-medium text-[11px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 hover:underline"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Vẽ Maket chuẩn</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </section>

          {/* PHẦN 2: MARKET THIẾT KẾ 2D/3D */}
          <section className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Market 2D/3D ({designProofs.length})
                </span>
                {designProofs.length > 0 && (
                  <span className="block text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    <span className="font-semibold text-emerald-700">
                      {designProofs.filter((d) => d.status === "approved").length} đã duyệt
                    </span>
                    <span className="text-slate-300 mx-1.5">•</span>
                    {designProofs.filter((d) => d.status !== "approved").length} chờ/sửa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => setIsUploadProofOpen(true)}
                  className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tải Market mới
                </Button>
                <Link
                  href={`/du-an/${projectId}/thiet-ke-quy-chuan`}
                  className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 inline-flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo Maket chuẩn</span>
                </Link>
              </div>
            </div>

            <div className="p-3">

            {proofsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Đang tải danh sách Market thiết kế...
              </div>
            ) : designProofs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Chưa có bản vẽ Market thiết kế nào được tải lên cho dự án này. Bấm "Tải lên Market mới" để thêm phối cảnh.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {designProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className={cn(
                      "rounded-xl border p-4 space-y-3 transition-shadow bg-white hover:shadow-xs",
                      proof.status === "approved"
                        ? "border-emerald-300 ring-1 ring-emerald-400/30"
                        : proof.status === "rejected"
                        ? "border-rose-300"
                        : "border-slate-200"
                    )}
                  >
                    {/* Header Market Card */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600">{proof.code}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          v{proof.versionNo}.0
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            proof.status === "approved"
                              ? "success"
                              : proof.status === "rejected"
                              ? "danger"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {proof.status === "approved"
                            ? "Đã phê duyệt"
                            : proof.status === "rejected"
                            ? "Cần sửa lại"
                            : "Chờ khách chốt"}
                        </Badge>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            onClick={() => handleOpenEditProof(proof)}
                            title="Sửa thông tin & quy cách Market"
                            className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProof(proof)}
                            title="Nhân bản tạo phương án thiết kế mới"
                            className="p-1 hover:bg-white rounded text-slate-600 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProof(proof.id)}
                            title="Xóa bản vẽ Market"
                            className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="font-semibold text-slate-900 text-sm">{proof.title}</div>

                    {/* Preview ảnh Market phối cảnh */}
                    <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-950 relative group">
                      <img
                        src={proof.fileUrl}
                        alt={proof.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                        <span className="text-[10px] text-white/90 font-medium">
                          Ngày tạo: {new Date(proof.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* Bảng quy cách vật liệu Market */}
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                      <div className="flex items-start justify-between">
                        <span className="text-slate-500">Nền biển:</span>
                        <strong className="text-slate-800 text-right max-w-[65%]">{proof.backgroundMaterial || "Alu Alcorest 3mm"}</strong>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-slate-500">Bộ chữ & Logo:</span>
                        <strong className="text-slate-800 text-right max-w-[65%]">{proof.letterMaterial || "Inox uốn nổi lọng mica"}</strong>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-slate-500">Module LED:</span>
                        <strong className="text-slate-800 text-right max-w-[65%]">{proof.ledSpec || "LED Hàn Quốc 12V 3000K"}</strong>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-slate-500">Bộ nguồn:</span>
                        <strong className="text-slate-800 text-right max-w-[65%]">{proof.powerSpec || "Nguồn Meanwell ngoài trời IP67"}</strong>
                      </div>
                    </div>

                    {/* Phản hồi từ khách */}
                    {proof.clientFeedback && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                        <strong>Ý kiến khách hàng:</strong> {proof.clientFeedback}
                      </div>
                    )}

                    {proof.approvedByName && (
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Người phê duyệt: {proof.approvedByName} ({proof.approvedAt ? new Date(proof.approvedAt).toLocaleDateString("vi-VN") : ""})</span>
                      </div>
                    )}

                    {/* Nút thao tác Admin & Studio link */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/du-an/${projectId}/thiet-ke-quy-chuan?proofId=${proof.id}`}
                        className="h-7 px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 transition border border-slate-200"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mở trong Studio</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateProofStatus(proof.id, "approved")}
                          className={cn(
                            "h-7 text-[11px] font-semibold px-2",
                            proof.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "text-slate-600"
                          )}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Duyệt chốt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateProofStatus(proof.id, "pending")}
                          className={cn(
                            "h-7 text-[11px] font-semibold px-2",
                            proof.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              : "text-slate-600"
                          )}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Chờ duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const feedback = prompt("Nhập ý kiến / yêu cầu chỉnh sửa từ khách hàng:", proof.clientFeedback || "");
                            if (feedback !== null) handleUpdateProofStatus(proof.id, "rejected", feedback);
                          }}
                          className={cn(
                            "h-7 text-[11px] font-semibold px-2",
                            proof.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              : "text-slate-600"
                          )}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cần sửa
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </section>
        </div>
      )}

      {/* MODAL ĐỔI GIAI ĐOẠN DỰ ÁN (KÈM KIỂM SOÁT ĐIỀU KIỆN STAGE GATE RULES) */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => {
          setIsStageModalOpen(false);
          setStageGateConfirmed(false);
        }}
        title="Chuyển Giai Đoạn Dự Án (Stage Gate Control)"
        maxWidth="3xl"
      >
        {(() => {
          const warnings: string[] = [];
          if (selectedStageToChange) {
            if (selectedStageToChange === "production") {
              if (tasks.length === 0) {
                warnings.push("Chưa có cây công việc WBS hoặc nhiệm vụ nào được lập cho dự án.");
              }
              const hasApprovedProof = designProofs.some((d) => d.status === "approved");
              if (designProofs.length > 0 && !hasApprovedProof) {
                warnings.push("Bản vẽ thiết kế / Market 2D-3D chưa được khách hàng phê duyệt chính thức (Tab Market & Thiết kế).");
              }
            }
            if (
              selectedStageToChange === "transport" || selectedStageToChange === "installation"
            ) {
              const hasPassedQc = qcRecords.some((q) => q.status === "passed");
              if (qcRecords.length > 0 && !hasPassedQc) {
                warnings.push("Biên bản kiểm tra xuất xưởng KCS / Aging Test LED chưa ĐẠT tiêu chuẩn (Tab QC & Xuất xưởng).");
              }
              if (materials.length === 0) {
                warnings.push("Chưa ghi nhận phiếu xuất kho vật tư nào trong Tab Kho & Vật tư. Cần kiểm tra trước khi chuyển sang giai đoạn vận chuyển/lắp đặt.");
              }
            }
            if (selectedStageToChange === "acceptance" && project && project.progressPercent < 60) {
              warnings.push(`Tiến độ công việc WBS hiện tại mới đạt ${project.progressPercent}%, chưa đạt mốc hoàn thành cơ bản (tối thiểu 60%) để nghiệm thu.`);
            }
            if (selectedStageToChange === "completed") {
              const hasApprovedAcceptance = acceptances.some(
                (a) => a.status === "approved" || a.status === "completed"
              );
              if (!hasApprovedAcceptance) {
                warnings.push("Chưa có Biên bản nghiệm thu nào được Phê duyệt/Khách hàng ký nhận (Tab Nghiệm thu). Dự án không nên đóng khi chưa có xác nhận bàn giao.");
              }
              if (finance && finance.receivablesTotal > 0) {
                warnings.push(`Còn công nợ khách hàng chưa thanh toán: ${finance.receivablesTotal.toLocaleString("vi-VN")} đ.`);
              }
            }
          }

          const targetStageDetail = selectedStageToChange ? STAGE_DETAILS[selectedStageToChange] : null;
          // Admin và Chỉ huy trưởng (PM) có toàn quyền chuyển giai đoạn mà không bị chặn cứng
          const isBlocked = (isSuperAdmin || isProjectPM) ? false : (warnings.length > 0 && !stageGateConfirmed);

          return (
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-slate-600 mb-2">Chọn giai đoạn tiếp theo cho dự án:</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStageToChange(s.id);
                        setStageGateConfirmed(false);
                      }}
                      className={cn(
                        "p-2.5 rounded-lg border text-left font-medium transition-colors",
                        selectedStageToChange === s.id
                          ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="font-semibold">{s.step}. {s.label}</div>
                      {project?.status === s.id && (
                        <span className="text-[10px] text-blue-600 font-normal">● Hiện tại</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* THÔNG TIN & CHECKLIST ĐIỀU KIỆN CHUYỂN GIAI ĐOẠN (STAGE GATE) */}
              {targetStageDetail && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Quy trình chuẩn: {targetStageDetail.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Bước {targetStageDetail.step}/7
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {targetStageDetail.desc}
                  </p>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Checklist kiểm tra chất lượng & an toàn:
                    </span>
                    <ul className="space-y-1">
                      {targetStageDetail.checklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-slate-600 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* CẢNH BÁO / ĐÁNH GIÁ ĐIỀU KIỆN TIÊN QUYẾT */}
              {selectedStageToChange && (
                warnings.length > 0 ? (
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/80 space-y-2 text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Ràng buộc kiểm soát chất lượng (Stage Gate Rules):</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800">
                      {warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-amber-200 flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="stageGateBypass"
                        checked={stageGateConfirmed}
                        onChange={(e) => setStageGateConfirmed(e.target.checked)}
                        className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="stageGateBypass" className="text-[11px] text-amber-900 font-medium cursor-pointer">
                        Tôi là Chỉ huy trưởng / Quản trị viên và xác nhận dự án đã đủ điều kiện kỹ thuật & an toàn để chuyển giai đoạn.
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-[11px]">
                      Đủ điều kiện: Các yêu cầu kỹ thuật và hồ sơ tiên quyết đã sẵn sàng.
                    </span>
                  </div>
                )
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsStageModalOpen(false);
                    setStageGateConfirmed(false);
                  }}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => selectedStageToChange && confirmUpdateStatus(selectedStageToChange)}
                  disabled={updatingStage || !selectedStageToChange || isBlocked}
                  className={cn(
                    "text-white text-xs",
                    isBlocked
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {updatingStage ? "Đang lưu..." : "Xác nhận chuyển giai đoạn"}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL GIAO VIỆC NHIỀU NGƯỜI (MULTI-ASSIGNEE) */}
      <Modal
        isOpen={Boolean(assigningTask)}
        onClose={() => setAssigningTask(null)}
        title="Phân Công Phụ Trách Đầu Việc"
        maxWidth="2xl"
        zIndex="z-[80]"
      >
        {assigningTask && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Đầu việc:</span>
              <strong className="text-slate-900 text-xs font-semibold">{assigningTask.title}</strong>
              <span className="inline-block mt-1 font-mono text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                Mã: {assigningTask.code}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800">
                  Chọn nhân sự phụ trách ({selectedEmployeeIds.length} người đã chọn):
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = employees.filter((emp) =>
                        emp.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) ||
                        emp.code?.toLowerCase().includes(assigneeSearchQuery.toLowerCase())
                      );
                      const combined = Array.from(new Set([...selectedEmployeeIds, ...filtered.map((e) => e.id)]));
                      setSelectedEmployeeIds(combined);
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeIds([])}
                    className="text-slate-500 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Ô tìm kiếm nhân viên */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Tìm nhân sự theo tên hoặc mã NV..."
                  value={assigneeSearchQuery}
                  onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8 bg-slate-50"
                />
              </div>

              {/* Danh sách checkbox cuộn */}
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
                {employees
                  .filter((emp) =>
                    emp.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) ||
                    emp.code?.toLowerCase().includes(assigneeSearchQuery.toLowerCase())
                  )
                  .map((emp) => {
                    const isChecked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors",
                          isChecked && "bg-blue-50/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                              } else {
                                setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <div>
                            <span className="font-medium text-slate-900">{emp.name}</span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              {emp.code && <span className="font-mono">{emp.code}</span>}
                              {emp.phone && <span>• {emp.phone}</span>}
                            </div>
                          </div>
                        </div>
                        {isChecked && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                            Phụ trách
                          </span>
                        )}
                      </label>
                    );
                  })}
                {employees.filter((emp) =>
                  emp.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()) ||
                  emp.code?.toLowerCase().includes(assigneeSearchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Không tìm thấy nhân sự phù hợp
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setAssigningTask(null)} className="text-xs">
                Hủy
              </Button>
              <Button onClick={handleSaveAssignee} disabled={savingAssignee} className="bg-blue-600 text-white text-xs">
                {savingAssignee ? "Đang lưu..." : `Lưu phân công (${selectedEmployeeIds.length})`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL THÊM CÔNG VIỆC WBS (CẤP 2 HOẶC CẤP 3) */}
      <Modal
        isOpen={Boolean(createTaskParent)}
        onClose={() => setCreateTaskParent(null)}
        title={createTaskParent?.parentId ? "Thêm Việc Con (Cấp 3)" : "Thêm Đầu Việc (Cấp 2)"}
        maxWidth="4xl"
      >
        {createTaskParent && (
          <form onSubmit={handleCreateSubTask} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CỘT 1: THÔNG TIN CÔNG VIỆC WBS & THỜI HẠN */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">
                    {createTaskParent.parentId ? "Thuộc đầu việc chính:" : "Thuộc giai đoạn:"}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong className="text-slate-900 text-xs font-semibold">{createTaskParent.title}</strong>
                    {createTaskParent.code && (
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {createTaskParent.code}
                      </span>
                    )}
                    {createTaskParent.isField && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                        📍 Hiện trường
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    {createTaskParent.parentId ? "Tên việc con *" : "Tên đầu việc *"}
                  </label>
                  <Input
                    required
                    placeholder={
                      createTaskParent.parentId
                        ? "VD: Cắt phay alu theo dưỡng, Khoan lỗ vít, Hàn dưỡng khung..."
                        : "VD: Gia công khung sắt, Cắt chữ mica nổi, Lắp module LED..."
                    }
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Mô tả chi tiết / Tiêu chuẩn kỹ thuật</label>
                  <textarea
                    rows={3}
                    placeholder="Yêu cầu kỹ thuật, quy cách vật tư, dung sai hoặc tiêu chuẩn nghiệm thu..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Trọng số WBS</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={newTaskWeight}
                      onChange={(e) => setNewTaskWeight(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                    <Input
                      type="date"
                      value={newTaskStartAt}
                      onChange={(e) => setNewTaskStartAt(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hạn hoàn thành {newTaskIsField && <span className="text-amber-600">*</span>}
                    </label>
                    <Input
                      type="date"
                      required={newTaskIsField}
                      value={newTaskDueAt}
                      onChange={(e) => setNewTaskDueAt(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Checkbox Phân loại Hiện trường */}
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTaskIsField}
                    onChange={(e) => setNewTaskIsField(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    📍 Công việc hiện trường (cần thợ check-in GPS và gửi báo cáo tại công trình)
                  </span>
                </label>
              </div>

              {/* CỘT 2: PHÂN CÔNG NHÂN SỰ PHỤ TRÁCH */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Phân công người thực hiện ({newTaskEmployeeIds.length} đã chọn):
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = employees.filter((emp) =>
                          emp.name.toLowerCase().includes(newTaskAssigneeSearch.toLowerCase()) ||
                          emp.code?.toLowerCase().includes(newTaskAssigneeSearch.toLowerCase())
                        );
                        const combined = Array.from(new Set([...newTaskEmployeeIds, ...filtered.map((e) => e.id)]));
                        setNewTaskEmployeeIds(combined);
                      }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setNewTaskEmployeeIds([])}
                      className="text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Ô tìm kiếm nhân viên */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm nhân sự theo tên hoặc mã NV..."
                    value={newTaskAssigneeSearch}
                    onChange={(e) => setNewTaskAssigneeSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-slate-50"
                  />
                </div>

                {/* Danh sách checkbox cuộn */}
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {employees
                    .filter((emp) =>
                      emp.name.toLowerCase().includes(newTaskAssigneeSearch.toLowerCase()) ||
                      emp.code?.toLowerCase().includes(newTaskAssigneeSearch.toLowerCase())
                    )
                    .map((emp) => {
                      const isChecked = newTaskEmployeeIds.includes(emp.id);
                      const isParentAssignee = createTaskParent.assignees?.some((a) => a.employeeId === emp.id);
                      const isProjectMember = members.some((m) => m.employeeId === emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors text-xs",
                            isChecked && "bg-blue-50/60"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTaskEmployeeIds([...newTaskEmployeeIds, emp.id]);
                                } else {
                                  setNewTaskEmployeeIds(newTaskEmployeeIds.filter((id) => id !== emp.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <div>
                              <span className="font-medium text-slate-900">{emp.name}</span>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                {emp.code && <span className="font-mono">{emp.code}</span>}
                                {emp.phone && <span>• {emp.phone}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isParentAssignee && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                Phụ trách việc lớn
                              </span>
                            )}
                            {isProjectMember && !isParentAssignee && (
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                Thành viên DA
                              </span>
                            )}
                            {isChecked && (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  {employees.filter((emp) =>
                    emp.name.toLowerCase().includes(newTaskAssigneeSearch.toLowerCase()) ||
                    emp.code?.toLowerCase().includes(newTaskAssigneeSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Không tìm thấy nhân sự phù hợp
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCreateTaskParent(null)} className="text-xs">
                Hủy
              </Button>
              <Button type="submit" disabled={savingNewTask} className="bg-blue-600 text-white text-xs">
                {savingNewTask ? "Đang lưu..." : createTaskParent.parentId ? "Tạo việc con" : "Tạo đầu việc"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL THÊM GIAI ĐOẠN / HẠNG MỤC DỰ ÁN */}
      <Modal
        isOpen={isCreateStageOpen}
        onClose={() => setIsCreateStageOpen(false)}
        title="Thêm Giai Đoạn Dự Án"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateTopLevelStage} className="space-y-3.5 text-xs">
          {availableStandardStages.length > 0 ? (
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Chọn giai đoạn tiêu chuẩn ngành biển hiệu:
              </label>
              <select
                value={selectedStandardStage}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedStandardStage(val);
                  if (val && val !== "__custom__") {
                    setNewStageTitle(val);
                    const isFieldStage = /khảo sát|thi công|lắp dựng|nghiệm thu|bảo trì|bảo hành/i.test(val);
                    setNewStageIsField(isFieldStage);
                    setNewStageWeight(15);
                  } else if (val === "__custom__") {
                    setNewStageTitle("");
                  }
                }}
                className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Chọn giai đoạn tiêu chuẩn còn thiếu --</option>
                {availableStandardStages.map((stageName) => (
                  <option key={stageName} value={stageName}>
                    {stageName}
                  </option>
                ))}
                <option value="__custom__">➕ Tùy chỉnh khác (Nhập tên riêng)...</option>
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[11px]">
              Dự án đã có đủ các giai đoạn tiêu chuẩn ngành biển hiệu. Bạn có thể nhập tên giai đoạn tùy chỉnh bên dưới nếu muốn bổ sung thêm.
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800">Tên giai đoạn *</label>
            <Input
              required
              placeholder="VD: Khảo sát hiện trạng & Đo đạc, Gia công chữ mica inox..."
              value={newStageTitle}
              onChange={(e) => setNewStageTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800">Mô tả giai đoạn / Tiêu chuẩn nghiệm thu</label>
            <textarea
              rows={2}
              placeholder="Mục tiêu cốt lõi của giai đoạn, tiêu chí kỹ thuật bàn giao hoặc lưu ý thi công..."
              value={newStageDesc}
              onChange={(e) => setNewStageDesc(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700">Trọng số WBS (%)</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newStageWeight}
                onChange={(e) => setNewStageWeight(Number(e.target.value))}
                className="mt-1 text-xs"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">Ngày bắt đầu</label>
              <Input
                type="date"
                value={newStageStartAt}
                onChange={(e) => setNewStageStartAt(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700">
                Hạn hoàn thành {newStageIsField && <span className="text-amber-600">*</span>}
              </label>
              <Input
                type="date"
                required={newStageIsField}
                value={newStageDueAt}
                onChange={(e) => setNewStageDueAt(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Checkbox Phân loại Hiện trường */}
          <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={newStageIsField}
              onChange={(e) => setNewStageIsField(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span className="text-xs text-slate-700 font-medium">
              📍 Giai đoạn hiện trường (Khảo sát / Lắp dựng / Nghiệm thu - yêu cầu báo cáo tại công trình)
            </span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800">
                Phân công người phụ trách ({newStageAssigneeIds.length} người):
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const filtered = employees.filter((emp) =>
                      emp.name.toLowerCase().includes(newStageAssigneeSearch.toLowerCase()) ||
                      emp.code?.toLowerCase().includes(newStageAssigneeSearch.toLowerCase())
                    );
                    const combined = Array.from(new Set([...newStageAssigneeIds, ...filtered.map((e) => e.id)]));
                    setNewStageAssigneeIds(combined);
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setNewStageAssigneeIds([])}
                  className="text-slate-500 hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm nhân viên phụ trách..."
                value={newStageAssigneeSearch}
                onChange={(e) => setNewStageAssigneeSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50"
              />
            </div>

            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
              {employees
                .filter((emp) =>
                  emp.name.toLowerCase().includes(newStageAssigneeSearch.toLowerCase()) ||
                  emp.code?.toLowerCase().includes(newStageAssigneeSearch.toLowerCase())
                )
                .map((emp) => {
                  const isChecked = newStageAssigneeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors",
                        isChecked && "bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewStageAssigneeIds([...newStageAssigneeIds, emp.id]);
                            } else {
                              setNewStageAssigneeIds(newStageAssigneeIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span className="font-medium text-slate-900">{emp.name}</span>
                        {emp.code && <span className="text-[10px] text-slate-400 font-mono">({emp.code})</span>}
                      </div>
                      {isChecked && (
                        <span className="text-[9px] font-semibold text-blue-700 bg-blue-100/70 px-1 py-0.2 rounded">
                          Đã chọn
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>
          </div>

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
        maxWidth="4xl"
      >
        {editingTask && (
          <form onSubmit={handleSaveEditTask} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CỘT 1: THÔNG TIN CÔNG VIỆC WBS & THỜI HẠN */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Tên công việc / Giai đoạn *</label>
                  <Input
                    required
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Mô tả chi tiết / Tiêu chuẩn kỹ thuật</label>
                  <textarea
                    rows={3}
                    value={editTaskDesc}
                    onChange={(e) => setEditTaskDesc(e.target.value)}
                    placeholder="Ghi chú quy cách, vật liệu hoặc tiêu chuẩn hoàn thành..."
                    className="w-full rounded-md border border-slate-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Trọng số WBS</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editTaskWeight}
                      onChange={(e) => setEditTaskWeight(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                    <Input
                      type="date"
                      value={editTaskStartAt}
                      onChange={(e) => setEditTaskStartAt(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hạn hoàn thành {editTaskIsField && <span className="text-amber-600">*</span>}
                    </label>
                    <Input
                      type="date"
                      required={editTaskIsField}
                      value={editTaskDueAt}
                      onChange={(e) => setEditTaskDueAt(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Checkbox Phân loại Hiện trường */}
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTaskIsField}
                    onChange={(e) => setEditTaskIsField(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    📍 Việc hiện trường (cần thợ check-in GPS và gửi báo cáo tại công trình)
                  </span>
                </label>
              </div>

              {/* CỘT 2: PHÂN CÔNG NHÂN SỰ PHỤ TRÁCH */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Phân công người thực hiện ({editTaskAssigneeIds.length} đã chọn):
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = employees.filter((emp) =>
                          emp.name.toLowerCase().includes(editTaskAssigneeSearch.toLowerCase()) ||
                          emp.code?.toLowerCase().includes(editTaskAssigneeSearch.toLowerCase())
                        );
                        const combined = Array.from(new Set([...editTaskAssigneeIds, ...filtered.map((e) => e.id)]));
                        setEditTaskAssigneeIds(combined);
                      }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditTaskAssigneeIds([])}
                      className="text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Ô tìm kiếm nhân viên */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm nhân sự theo tên hoặc mã NV..."
                    value={editTaskAssigneeSearch}
                    onChange={(e) => setEditTaskAssigneeSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-slate-50"
                  />
                </div>

                {/* Danh sách checkbox cuộn */}
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {employees
                    .filter((emp) =>
                      emp.name.toLowerCase().includes(editTaskAssigneeSearch.toLowerCase()) ||
                      emp.code?.toLowerCase().includes(editTaskAssigneeSearch.toLowerCase())
                    )
                    .map((emp) => {
                      const isChecked = editTaskAssigneeIds.includes(emp.id);
                      const isProjectMember = members.some((m) => m.employeeId === emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors text-xs",
                            isChecked && "bg-blue-50/60"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditTaskAssigneeIds([...editTaskAssigneeIds, emp.id]);
                                } else {
                                  setEditTaskAssigneeIds(editTaskAssigneeIds.filter((id) => id !== emp.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <div>
                              <span className="font-medium text-slate-900">{emp.name}</span>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                {emp.code && <span className="font-mono">{emp.code}</span>}
                                {emp.phone && <span>• {emp.phone}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isProjectMember && (
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                Thành viên DA
                              </span>
                            )}
                            {isChecked && (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  {employees.filter((emp) =>
                    emp.name.toLowerCase().includes(editTaskAssigneeSearch.toLowerCase()) ||
                    emp.code?.toLowerCase().includes(editTaskAssigneeSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Không tìm thấy nhân sự phù hợp
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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

      {/* MODAL XÁC NHẬN HOÀN THÀNH CÔNG VIỆC */}
      <Modal
        isOpen={Boolean(completingTask)}
        onClose={() => setCompletingTask(null)}
        title="Xác Nhận Tiến Độ Hoàn Thành (100%)"
      >
        {completingTask && (
          <form onSubmit={handleConfirmCompleteTask} className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">Công việc hoàn thành:</span>
              <strong className="text-slate-900 text-xs font-semibold block">{completingTask.title}</strong>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="font-mono text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                  Mã: {completingTask.code}
                </span>
                <span className="text-[10px] text-slate-500">
                  Trọng số: {completingTask.weight}%
                </span>
                {completingTask.isField ? (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                    📍 Hiện trường
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                    🏭 Xưởng
                  </span>
                )}
              </div>
            </div>

            {/* LỰA CHỌN TRẠNG THÁI: CHỜ NGHIỆM THU VS HOÀN THÀNH LUÔN */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Chọn trạng thái cập nhật:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCompletionTargetStatus("awaiting_acceptance")}
                  className={cn(
                    "flex flex-col text-left p-2.5 rounded-lg border transition-all",
                    completionTargetStatus === "awaiting_acceptance"
                      ? "border-sky-500 bg-sky-50/70 ring-1 ring-sky-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <strong className="text-xs text-sky-950">Chờ nghiệm thu</strong>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Đã xong thực tế, chờ giám sát / khách hàng nghiệm thu hoặc ký biên bản (Khuyến nghị)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompletionTargetStatus("done")}
                  className={cn(
                    "flex flex-col text-left p-2.5 rounded-lg border transition-all",
                    completionTargetStatus === "done"
                      ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <strong className="text-xs text-emerald-950">Hoàn thành luôn</strong>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Đã nghiệm thu xong hoặc công việc nội bộ kết thúc trọn vẹn 100%
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Ghi chú nghiệm thu nội bộ / Báo cáo kết quả
              </label>
              <textarea
                rows={3}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="VD: Đã hoàn thiện xong, kiểm tra kết cấu vững chắc, bề mặt đạt tiêu chuẩn nghiệm thu..."
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* VÙNG UPLOAD FILE / ẢNH MINH CHỨNG HIỆN TRƯỜNG */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-800">
                  Ảnh minh chứng hiện trường (Tùy chọn)
                </label>
                {completionPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompletionPhotoUrl("");
                      setCompletionPhotoName("");
                      setCompletionPhotoSize(null);
                    }}
                    className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa ảnh</span>
                  </button>
                )}
              </div>

              {/* Input file ẩn */}
              <input
                ref={taskFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoFileChange(f);
                }}
                className="hidden"
              />

              {!completionPhotoUrl ? (
                /* Khung Dropzone chọn / kéo thả file */
                <div
                  onClick={() => taskFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverPhoto(true);
                  }}
                  onDragLeave={() => setIsDragOverPhoto(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverPhoto(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handlePhotoFileChange(f);
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                    isDragOverPhoto
                      ? "border-blue-500 bg-blue-50/70"
                      : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">
                      Tải lên ảnh nghiệm thu / hiện trường
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Bấm để chọn file từ máy tính / điện thoại hoặc kéo thả ảnh vào đây
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Hỗ trợ JPG, PNG, WEBP tối đa 10MB
                  </span>
                </div>
              ) : (
                /* Khung Preview ảnh đã chọn / đã tải lên */
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 space-y-2 p-2">
                  <div className="aspect-video max-h-48 rounded-lg overflow-hidden border border-slate-200 bg-black flex items-center justify-center relative">
                    <img
                      src={completionPhotoUrl}
                      alt="Minh chứng"
                      className="w-full h-full object-contain"
                    />
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                        <span>Đang tải lên hệ thống...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <div className="flex items-center gap-1.5 truncate text-slate-600 max-w-[70%]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate font-medium">
                        {completionPhotoName || "Ảnh minh chứng hiện trường"}
                      </span>
                      {completionPhotoSize && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({(completionPhotoSize / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => taskFileInputRef.current?.click()}
                      className="h-6 text-[10px] gap-1 px-2 text-slate-700"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Thay ảnh</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setCompletingTask(null)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={savingCompletion || isUploadingPhoto}
                className={cn(
                  "text-white text-xs gap-1.5",
                  completionTargetStatus === "awaiting_acceptance"
                    ? "bg-sky-600 hover:bg-sky-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {savingCompletion
                    ? "Đang lưu..."
                    : isUploadingPhoto
                    ? "Đang tải ảnh..."
                    : completionTargetStatus === "awaiting_acceptance"
                    ? "Xác nhận chuyển Chờ nghiệm thu (100%)"
                    : "Xác nhận Đã hoàn thành (100%)"}
                </span>
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL SỬA THÔNG TIN DỰ ÁN */}
      <Modal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        title="Chỉnh Sửa Thông Tin Dự Án"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Tên công trình / Dự án *</label>
                <Input
                  required
                  value={editProjectData.name}
                  onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Khách hàng *</label>
                <select
                  required
                  value={editProjectData.customerId}
                  onChange={(e) => setEditProjectData({ ...editProjectData, customerId: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white"
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
                <label className="block font-semibold mb-1">Chỉ huy trưởng (PM)</label>
                <select
                  value={editProjectData.managerMembershipId}
                  onChange={(e) => setEditProjectData({ ...editProjectData, managerMembershipId: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white"
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

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Địa chỉ thi công</label>
                <Input
                  value={editProjectData.address}
                  onChange={(e) => setEditProjectData({ ...editProjectData, address: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Ngày khởi công</label>
                  <Input
                    type="date"
                    value={editProjectData.startDate}
                    onChange={(e) => setEditProjectData({ ...editProjectData, startDate: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hạn bàn giao</label>
                  <Input
                    type="date"
                    value={editProjectData.dueDate}
                    onChange={(e) => setEditProjectData({ ...editProjectData, dueDate: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
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
        maxWidth="lg"
      >
        <form onSubmit={handleAddMember} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Chọn nhân sự *</label>
            <select
              required
              value={newMemberEmployeeId}
              onChange={(e) => {
                const empId = e.target.value;
                setNewMemberEmployeeId(empId);
                const emp = employees.find((x) => x.id === empId);
                if (emp?.membershipId) {
                  setNewMemberMembershipId(emp.membershipId);
                } else {
                  setNewMemberMembershipId("");
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs bg-white"
            >
              <option value="">-- Chọn nhân sự --</option>
              {employees.map((emp) => {
                const isAlreadyIn = members.some((m) => m.employeeId === emp.id || (emp.membershipId && m.membershipId === emp.membershipId));
                return (
                  <option key={emp.id} value={emp.id} disabled={isAlreadyIn}>
                    {emp.name} ({emp.code || "NV"}) {isAlreadyIn ? "(Đã tham gia)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block font-semibold">Vai trò trong dự án *</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs bg-white"
            >
              {PROJECT_ROLES.map((role) => (
                <option key={role.key} value={role.label}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {PROJECT_ROLES.find((r) => r.label === newMemberRole)?.description || ""}
            </p>
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
        title="Lập biên bản nghiệm thu"
        maxWidth="lg"
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
            <Button type="submit" disabled={creatingAcceptance} className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
              {creatingAcceptance ? "Đang lưu..." : "Lưu biên bản"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL THÊM BÁO CÁO HIỆN TRƯỜNG */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Thêm Báo Cáo Hiện Trường"
        maxWidth="xl"
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
        title={lightboxPhoto?.stage || "Xem ảnh"}
      >
        {lightboxPhoto && (
          <div className="space-y-2.5 text-xs">
            <div className="rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center">
              <img src={lightboxPhoto.url} alt={lightboxPhoto.stage} className="max-h-[60vh] object-contain" />
            </div>
            <p className="text-slate-700">{lightboxPhoto.desc}</p>
            <span className="text-slate-400 tabular-nums block">{lightboxPhoto.date}</span>
            <div className="flex justify-end pt-1">
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
        title="Biên bản nghiệm thu (bản in A4)"
      >
        {previewAcceptance && (
          <div className="space-y-4 text-xs font-sans">
            <div className="border border-slate-300 p-6 rounded bg-white space-y-3">
              <div className="text-center pb-2 border-b border-slate-200">
                <div className="font-bold text-[10px] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold text-[10px] underline">Độc lập - Tự do - Hạnh phúc</div>
                <h3 className="font-bold text-sm uppercase mt-2">BIÊN BẢN BÀN GIAO & NGHIỆM THU</h3>
                <span className="tabular-nums text-slate-500 text-[10px]">{previewAcceptance.code}</span>
              </div>
              <p><strong>Công trình:</strong> {project.name}</p>
              <p><strong>Khách hàng:</strong> {project.customerName}</p>
              <p><strong>Địa chỉ:</strong> {project.address}</p>
              <p><strong>Người đại diện ký:</strong> {previewAcceptance.customerSignerName}</p>

              <div className="grid grid-cols-2 gap-8 pt-6 text-center border-t border-slate-100">
                <div>
                  <div className="font-bold text-slate-900 mb-1">ĐẠI DIỆN THI CÔNG</div>
                  <div className="h-16 flex items-center justify-center font-medium text-emerald-700">
                    Đã ký duyệt bàn giao
                  </div>
                  <div className="text-[10px] text-slate-500">{project.managerName || "Chỉ huy trưởng công trình"}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-1">ĐẠI DIỆN KHÁCH HÀNG</div>
                  {previewAcceptance.signatureData ? (
                    <div className="h-16 flex flex-col items-center justify-center">
                      <img
                        src={previewAcceptance.signatureData}
                        alt="Chữ ký điện tử"
                        className="max-h-12 object-contain"
                      />
                      <span className="text-[10px] text-slate-700 font-semibold">{previewAcceptance.customerSignerName}</span>
                    </div>
                  ) : (
                    <div className="h-16 flex flex-col items-center justify-center gap-1">
                      <div className="italic text-slate-400 text-[11px]">(Chưa ký điện tử)</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const acc = previewAcceptance;
                          setPreviewAcceptance(null);
                          setSignatureModalAcceptance(acc);
                        }}
                        className="h-6 text-[10px]"
                      >
                        <PenTool className="w-3 h-3 mr-1" />
                        Ký ngay
                      </Button>
                    </div>
                  )}
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

      {/* MODAL TẠO PHIẾU XUẤT KHO DỰ ÁN */}
      {project && (
        <CreateStockDocModal
          isOpen={isCreateStockDocOpen}
          onClose={() => setIsCreateStockDocOpen(false)}
          onSuccess={() => {
            fetchMaterials();
            fetchData();
          }}
          initialType="issue"
          initialProjectId={project.id}
          initialReason={`Xuất kho vật tư thi công dự án ${project.code} - ${project.name}`}
        />
      )}

      {/* DRAWER CHI TIẾT CÔNG VIỆC WBS & CHUYÊN NGÀNH SIGNAGE */}
      <TaskDetailDrawer
        task={selectedDetailTask}
        isOpen={Boolean(selectedDetailTask)}
        onClose={() => setSelectedDetailTask(null)}
        onUpdate={() => {
          fetchData();
        }}
        onOpenAiReport={(taskDto) => {
          setAiReportTask(taskDto);
          setIsAiModalOpen(true);
        }}
        onOpenAssignModal={(taskDto) => {
          const targetWbs: WbsTaskDto = {
            ...taskDto,
            progressMode: "manual",
            parentId: taskDto.stageId,
          };
          openAssignModal(targetWbs);
        }}
      />

      {/* MODAL AI WORK REPORT & ĐÁNH GIÁ TIẾN ĐỘ */}
      {aiReportTask && project && (
        <AiWorkReportModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          taskId={aiReportTask.id}
          taskTitle={aiReportTask.title}
          projectId={project.id}
          projectName={project.name}
          currentProgress={aiReportTask.progressPercent}
          onSuccess={() => {
            fetchData();
            if (activeTab === "documents") fetchReports();
          }}
        />
      )}

      {/* MODAL TẢI LÊN MARKET THIẾT KẾ MỚI */}
      <Modal
        isOpen={isUploadProofOpen}
        onClose={() => setIsUploadProofOpen(false)}
        title="Tải Lên Phiên Bản Market Thiết Kế Mới"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateProof} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Tên / Tiêu đề Market phối cảnh *</label>
                <Input
                  required
                  placeholder="VD: Phối cảnh Market 3D ban ngày & đêm (Highlands Coffee)"
                  value={newProofTitle}
                  onChange={(e) => setNewProofTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Đường dẫn ảnh Market (URL phối cảnh 2D/3D)</label>
                <Input
                  placeholder="VD: https://... hoặc để trống để sử dụng hình ảnh mẫu phối cảnh"
                  value={newProofFileUrl}
                  onChange={(e) => setNewProofFileUrl(e.target.value)}
                  className="text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Hỗ trợ ảnh render 3ds Max, Photoshop hoặc SketchUp</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 block text-xs">Quy cách kỹ thuật & Vật tư phối cảnh:</span>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">Vật liệu nền biển:</label>
                  <Input
                    value={newProofBg}
                    onChange={(e) => setNewProofBg(e.target.value)}
                    className="text-xs h-7"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">Quy cách bộ chữ & logo:</label>
                  <Input
                    value={newProofLetter}
                    onChange={(e) => setNewProofLetter(e.target.value)}
                    className="text-xs h-7"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">Quy cách đèn LED:</label>
                  <Input
                    value={newProofLed}
                    onChange={(e) => setNewProofLed(e.target.value)}
                    className="text-xs h-7"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-0.5">Bộ nguồn ngoài trời:</label>
                  <Input
                    value={newProofPower}
                    onChange={(e) => setNewProofPower(e.target.value)}
                    className="text-xs h-7"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsUploadProofOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingProof} className="bg-slate-900 text-white text-xs">
              {savingProof ? "Đang tải lên..." : "Lưu phiên bản Market"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL CHỈNH SỬA THÔNG TIN & QUY CÁCH MARKET */}
      <Modal
        isOpen={isEditProofOpen}
        onClose={() => {
          setIsEditProofOpen(false);
          setEditingProof(null);
        }}
        title="Chỉnh Sửa Thông Tin & Quy Cách Bản Vẽ Market"
        maxWidth="3xl"
      >
        <form onSubmit={handleUpdateProofSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Tên / Tiêu đề Market *</label>
                <Input
                  required
                  value={editProofTitle}
                  onChange={(e) => setEditProofTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Phiên bản (Version)</label>
                  <Input
                    type="number"
                    min={1}
                    value={editProofVersionNo}
                    onChange={(e) => setEditProofVersionNo(parseInt(e.target.value) || 1)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Trạng thái duyệt</label>
                  <select
                    value={editProofStatus}
                    onChange={(e) => setEditProofStatus(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="pending">⏳ Chờ duyệt</option>
                    <option value="approved">✓ Đã duyệt (Chốt)</option>
                    <option value="rejected">✕ Cần sửa lại</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Ý kiến phản hồi / Ghi chú</label>
                <textarea
                  rows={3}
                  value={editProofFeedback}
                  onChange={(e) => setEditProofFeedback(e.target.value)}
                  placeholder="Ghi chú yêu cầu chỉnh sửa từ khách hàng hoặc giám sát..."
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 block text-xs">Quy cách kỹ thuật & Vật tư phối cảnh:</span>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Vật liệu nền biển:</label>
                <Input
                  value={editProofBg}
                  onChange={(e) => setEditProofBg(e.target.value)}
                  className="text-xs h-7"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Quy cách bộ chữ & logo:</label>
                <Input
                  value={editProofLetter}
                  onChange={(e) => setEditProofLetter(e.target.value)}
                  className="text-xs h-7"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Quy cách đèn LED:</label>
                <Input
                  value={editProofLed}
                  onChange={(e) => setEditProofLed(e.target.value)}
                  className="text-xs h-7"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Bộ nguồn ngoài trời:</label>
                <Input
                  value={editProofPower}
                  onChange={(e) => setEditProofPower(e.target.value)}
                  className="text-xs h-7"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsEditProofOpen(false);
                setEditingProof(null);
              }}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button type="submit" disabled={savingEditProof} className="bg-slate-900 text-white text-xs cursor-pointer">
              {savingEditProof ? "Đang lưu..." : "Cập Nhật Thông Tin Market"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL LẬP BIÊN BẢN KCS XUẤT XƯỞNG & AGING TEST */}
      <Modal
        isOpen={isCreateQcOpen}
        onClose={() => setIsCreateQcOpen(false)}
        title="Lập Biên Bản KCS Xuất Xưởng & Aging Test Đèn LED"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateQcRecord} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Thời gian chạy thử sáng đèn liên tục (Giờ) *</label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  required
                  value={newQcAgingHours}
                  onChange={(e) => setNewQcAgingHours(parseFloat(e.target.value) || 4.0)}
                  className="text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Tiêu chuẩn xuất xưởng tối thiểu: 4.0 giờ</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Kỹ thuật viên KCS kiểm thử</label>
                <select
                  value={newQcInspectorId}
                  onChange={(e) => setNewQcInspectorId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white"
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
                <label className="block font-semibold text-slate-800 mb-1">Ghi chú khắc phục / Lưu ý</label>
                <textarea
                  rows={2}
                  value={newQcDefectNotes}
                  onChange={(e) => setNewQcDefectNotes(e.target.value)}
                  placeholder="VD: Đã dán keo silicon cẩn thận tại các mối ghim, phụ kiện bu-lông đóng gói riêng..."
                  className="w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>

            {/* Checklist 5 tiêu chuẩn xuất xưởng */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2.5">
              <span className="font-bold block text-xs">Cam kết tiêu chuẩn chất lượng KCS:</span>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Kiểm tra sụt áp nguồn 12V: Sụt áp &lt; 0.5V, nhiệt độ nguồn &lt; 65°C sau {newQcAgingHours}h tải.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Keo chống nước & gioăng cao su: Đạt tiêu chuẩn kháng nước ngoài trời IP65/IP67.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mối hàn khung sắt mạ kẽm: Hàn ngấu chắc, vệ sinh xỉ hàn và quét sơn chống rỉ 2 lớp.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Độ đồng đều ánh sáng LED: Ánh sáng tỏa đều qua mica, không có đốm chết hoặc lệch màu.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Checklist phụ kiện bàn giao: Bu-lông neo dầm, guzong, dây nguồn và tem kiểm định xuất xưởng.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateQcOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingQc} className="bg-emerald-600 text-white text-xs">
              {savingQc ? "Đang lưu..." : "Xác nhận Đạt chuẩn xuất xưởng"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL TIẾP NHẬN SỰ CỐ & BẢO HÀNH */}
      <Modal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        title="Tiếp Nhận Yêu Cầu Sự Cố / Bảo Hành Công Trình"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-800">Tiêu đề sự cố / Hiện tượng hư hỏng *</label>
            <Input
              required
              placeholder="VD: Đèn LED góc phải nhấp nháy, nguồn 12V kêu rè khi trời mưa..."
              value={newTicketTitle}
              onChange={(e) => setNewTicketTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800">Phân loại sự cố *</label>
              <select
                value={newTicketType}
                onChange={(e) => setNewTicketType(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="led_power">Hỏng nguồn / Chập cháy đèn LED</option>
                <option value="structural">Rung lắc kết cấu / Hỏng dầm bu-lông</option>
                <option value="weather_damage">Ảnh hưởng do mưa bão / Gió lốc</option>
                <option value="decal_acrylic">Bong tróc chữ nổi mica / Decal</option>
                <option value="other">Vấn đề kỹ thuật khác</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800">Mức độ ưu tiên *</label>
              <select
                value={newTicketPriority}
                onChange={(e) => setNewTicketPriority(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="urgent">Khẩn cấp (Xử lý ngay trong 2h)</option>
                <option value="high">Ưu tiên cao (Trong ngày)</option>
                <option value="medium">Bình thường (1 - 2 ngày)</option>
                <option value="low">Thấp (Bảo trì theo đợt)</option>
              </select>
            </div>
          </div>

          <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
            Sự cố phát sinh trong thời hạn bảo hành của công trình sẽ được kiểm tra và thay thế linh kiện miễn phí theo hợp đồng.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateTicketOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingTicket} className="bg-blue-600 text-white text-xs">
              {savingTicket ? "Đang tạo..." : "Tiếp nhận ticket sự cố"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL KÝ SỐ CẢM ỨNG HIỆN TRƯỜNG */}
      <SignaturePadModal
        isOpen={Boolean(signatureModalAcceptance)}
        onClose={() => setSignatureModalAcceptance(null)}
        onSave={handleSaveSignature}
        defaultSignerName={signatureModalAcceptance?.customerSignerName || "Khách hàng nghiệm thu"}
        title={`Ký số cảm ứng: ${signatureModalAcceptance?.code || "Biên bản nghiệm thu"}`}
      />

      {/* MODAL TẠO PHIẾU THU / PHIẾU CHI DỰ ÁN */}
      <Modal
        isOpen={isCreatePaymentOpen}
        onClose={() => setIsCreatePaymentOpen(false)}
        maxWidth="2xl"
        title={paymentDirection === "receipt" ? "Tạo Phiếu Thu Công Trình" : "Tạo Phiếu Chi Công Trình"}
      >
        <div className="space-y-4 text-xs">
          {/* Chuyển đổi Thu / Chi */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPaymentDirection("receipt")}
              className={cn(
                "py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5",
                paymentDirection === "receipt"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Phiếu Thu (Tiền vào)
            </button>
            <button
              type="button"
              onClick={() => setPaymentDirection("disbursement")}
              className={cn(
                "py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5",
                paymentDirection === "disbursement"
                  ? "bg-white text-rose-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Phiếu Chi (Tiền ra)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Chọn Sổ Quỹ */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Chọn Quỹ Tiền / Tài Khoản Thanh Toán *
              </label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {cashAccounts.length === 0 ? (
                  <option value="">(Đang tải danh sách quỹ...)</option>
                ) : (
                  cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code}) - {acc.kind === "cash" ? "Tiền mặt" : "Ngân hàng"}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ghi trực tiếp vào lịch sử và số dư sổ quỹ
              </p>
            </div>

            {/* Nhập Số tiền */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Số tiền (VNĐ) *
              </label>
              <Input
                type="text"
                placeholder="VD: 5000000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="text-xs font-mono font-bold"
              />
              {(() => {
                const numVal = Number(paymentAmount.replace(/[^0-9]/g, ""));
                return numVal > 0 ? (
                  <p className="text-[11px] font-mono font-semibold text-slate-600 mt-1">
                    = {numVal.toLocaleString("vi-VN")} VNĐ
                  </p>
                ) : null;
              })()}
            </div>
          </div>

          {/* Nội dung / Lý do */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Nội dung thu / chi *
            </label>
            <Input
              placeholder={paymentDirection === "receipt" ? "VD: Khách hàng tạm ứng đợt 1 thi công biển hiệu..." : "VD: Thanh toán tiền vật tư sắt V, mua LED nguồn..."}
              value={paymentPurpose}
              onChange={(e) => setPaymentPurpose(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreatePaymentOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={savingPayment || !paymentAmount.trim()}
              onClick={handleSavePayment}
              className={cn(
                "text-xs text-white",
                paymentDirection === "receipt" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {savingPayment ? "Đang ghi sổ..." : (paymentDirection === "receipt" ? "Xác nhận Thu tiền" : "Xác nhận Chi tiền")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL TẢI LÊN TÀI LIỆU / HÓA ĐƠN / CHỨNG TỪ */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        maxWidth="2xl"
        title="Tải tài liệu lên hồ sơ"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Loại tài liệu */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Phân loại tài liệu *
              </label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value as any)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="field_photo">Ảnh hiện trường / Bằng chứng thi công</option>
                <option value="invoice">Hóa đơn VAT / Chứng từ mua vật tư</option>
                <option value="contract">Hợp đồng thi công / Phụ lục hợp đồng</option>
                <option value="other">Biên bản / Tài liệu kỹ thuật khác</option>
              </select>
            </div>

            {/* Tiêu đề tài liệu */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Tên tài liệu / Tiêu đề chứng từ *
              </label>
              <Input
                placeholder="VD: Hóa đơn sắt hộp Hoa Sen, Hợp đồng thi công..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Đường dẫn tệp / ảnh */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Đường dẫn tệp / URL hình ảnh / Tệp scan
              </label>
              <Input
                placeholder="https://... hoặc /uploads/... (hoặc để trống)"
                value={newDocFileUrl}
                onChange={(e) => setNewDocFileUrl(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Link Drive, cloud hoặc chứng từ lưu kho.
              </p>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Ghi chú thêm
              </label>
              <Input
                placeholder="VD: Đã đối chiếu với thủ kho..."
                value={newDocNotes}
                onChange={(e) => setNewDocNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsUploadDocOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!newDocTitle.trim()}
              onClick={handleSaveCustomDoc}
              className="text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              Lưu vào hồ sơ dự án
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL TẠO / SỬA PHIẾU KHẢO SÁT HIỆN TRƯỜNG DỰ ÁN CHUẨN NIPPON PAINT */}
      <Modal
        isOpen={isCreateSurveyOpen}
        onClose={() => {
          setIsCreateSurveyOpen(false);
          setEditingSurveyId(null);
        }}
        maxWidth="5xl"
        title={editingSurveyId ? "Chỉnh Sửa Phiếu Đo Đạc & Khảo Sát Hiện Trường Nippon Paint" : "Lập Phiếu Khảo Sát Hiện Trường Chuẩn Nippon Paint"}
      >
        <form onSubmit={(e) => handleCreateSurveySubmit(e, false)} className="space-y-4 text-xs">
          {/* KHỐI 1: PHÂN LOẠI & VÙNG QUẢN LÝ */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-blue-200/60">
              <Compass className="w-4 h-4 text-blue-600" />
              1. Phân vùng khu vực & Phân loại công việc
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  KV: Phân vùng khu vực *
                </label>
                <select
                  value={surveyFormData.regionKV}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, regionKV: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white font-semibold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="MIỀN TÂY">MIỀN TÂY</option>
                  <option value="HCM">HCM</option>
                  <option value="MIỀN ĐÔNG">MIỀN ĐÔNG</option>
                  <option value="MIỀN TRUNG">MIỀN TRUNG</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Phân loại theo dõi thi công *
                </label>
                <select
                  value={surveyFormData.workType}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, workType: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white font-semibold text-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-600"
                >
                  <option value="BẢNG HIỆU">BẢNG HIỆU (Thi công bảng mới)</option>
                  <option value="SỬA CHỮA MIỀN TÂY">SỬA CHỮA MIỀN TÂY (Bảo trì/Sửa)</option>
                  <option value="KHẢO SÁT">KHẢO SÁT (Đo đạc hiện trạng)</option>
                  <option value="THÙNG RỖNG">THÙNG RỖNG (Giao nhận POSM/thùng mẫu)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Trạng thái thực địa
                </label>
                <select
                  value={surveyFormData.executionStatus}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, executionStatus: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white font-semibold text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-600"
                >
                  <option value="đang chốt">Đang chốt</option>
                  <option value="đã chốt">Đã chốt duyệt</option>
                  <option value="đang gia công">Đang gia công xưởng</option>
                  <option value="đang thi công">Đang thi công thực địa</option>
                  <option value="đã hoàn thành">Đã hoàn thành</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Hạng mục khảo sát
                </label>
                <select
                  value={surveyFormData.surveyScope}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, surveyScope: e.target.value })}
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ks bảng">ks bảng (Khảo sát biển bảng)</option>
                  <option value="ks SR">ks SR (Khảo sát Showroom)</option>
                  <option value="ks toàn diện">ks toàn diện (Bảng + Nội thất)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CỘT TRÁI: ĐẠI LÝ & QUY CÁCH BẢNG HIỆU */}
            <div className="space-y-3.5">
              {/* THÔNG TIN ĐẠI LÝ */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  2. Thông tin đại lý & Địa điểm thực địa
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tên đại lý / Đơn vị *
                    </label>
                    <Input
                      value={surveyFormData.dealerName}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, dealerName: e.target.value, title: e.target.value })}
                      placeholder="VD: Cửa hàng Sơn Thanh Bình..."
                      className="text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số điện thoại (ĐT) *
                    </label>
                    <Input
                      value={surveyFormData.dealerPhone}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, dealerPhone: e.target.value })}
                      placeholder="VD: 0903 456 789..."
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Địa chỉ chi tiết (Số nhà, đường, ấp/khu phố, xã, huyện, tỉnh) *
                  </label>
                  <Input
                    value={surveyFormData.dealerAddress}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, dealerAddress: e.target.value, address: e.target.value })}
                    placeholder="Số nhà, tên đường, ấp/khu phố, phường/xã, quận/huyện, tỉnh/TP..."
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ngày đo đạc khảo sát *
                    </label>
                    <Input
                      type="date"
                      value={surveyFormData.surveyDate}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, surveyDate: e.target.value })}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Thời gian thi công / giao nhận
                    </label>
                    <Input
                      value={surveyFormData.deliverySchedule}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, deliverySchedule: e.target.value })}
                      placeholder="VD: TC ngày 12-10, giao tháng 3, giao 2 bộ..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* QUY CÁCH BẢNG HIỆU & KÍCH THƯỚC */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Grid className="w-4 h-4 text-blue-600" />
                  3. Quy cách bảng hiệu & Kích thước
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chất liệu bảng hiệu *
                  </label>
                  <select
                    value={surveyFormData.signMaterial}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, signMaterial: e.target.value })}
                    className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                  >
                    <option value="Bảng alu ngoài trời">Bảng alu ngoài trời (Alcorest 3mm EV2002)</option>
                    <option value="Bảng bạt UV hiflex">Bảng bạt UV hiflex xuyên sáng</option>
                    <option value="Bảng fomex 10li + decal">Bảng fomex 10li + decal ngoài trời</option>
                    <option value="Bảng khung sắt căng bạt thường">Bảng khung sắt căng bạt thường</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <span className="block text-[11px] font-semibold text-blue-700 mb-1">
                      Chiều Dài X (m) *
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={surveyFormData.widthMeters}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, widthMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs font-mono font-bold bg-white"
                      required
                    />
                  </div>
                  <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                    <span className="block text-[11px] font-semibold text-indigo-700 mb-1">
                      Chiều Cao Y (m) *
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={surveyFormData.heightMeters}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, heightMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs font-mono font-bold bg-white"
                      required
                    />
                  </div>
                  <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                    <span className="block text-[11px] font-semibold text-emerald-700 mb-1">
                      Độ Dày Z (m)
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={surveyFormData.depthMeters}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, depthMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                {/* TỰ TÍNH DIỆN TÍCH */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-around text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">DIỆN TÍCH MẶT</span>
                    <span className="text-xs font-bold font-mono text-blue-700">
                      {((surveyFormData.widthMeters || 0) * (surveyFormData.heightMeters || 0)).toFixed(2)} m²
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">CHU VI VIỀN SẮT</span>
                    <span className="text-xs font-bold font-mono text-indigo-700">
                      {(2 * ((surveyFormData.widthMeters || 0) + (surveyFormData.heightMeters || 0))).toFixed(2)} m
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">ĐỘ DÀY HỘP</span>
                    <span className="text-xs font-bold font-mono text-emerald-700">
                      {((surveyFormData.depthMeters || 0) * 100).toFixed(0)} cm
                    </span>
                  </div>
                </div>

                {/* PHỤ KIỆN BẢNG HIỆU */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Chi tiết phụ kiện nhận diện quy chuẩn:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={surveyFormData.hasMicaLogo65}
                        onChange={(e) => setSurveyFormData({ ...surveyFormData, hasMicaLogo65: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[11px] font-medium text-slate-800">Thay mica logo 65×65</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={surveyFormData.hasSideTrim}
                        onChange={(e) => setSurveyFormData({ ...surveyFormData, hasSideTrim: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[11px] font-medium text-slate-800">Nẹp lườn viền nhôm</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={surveyFormData.hasColorStrip}
                        onChange={(e) => setSurveyFormData({ ...surveyFormData, hasColorStrip: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-[11px] font-medium text-slate-800">Thay dải 3 màu Nippon</span>
                    </label>
                  </div>
                  <Input
                    value={surveyFormData.subAccessories}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, subAccessories: e.target.value })}
                    placeholder="Ghi chú chi tiết phụ kiện khác (nếu có)..."
                    className="text-xs mt-2"
                  />
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: NỘI THẤT POSM & SỬA CHỮA & ĐIỀU KIỆN KỸ THUẬT */}
            <div className="space-y-3.5">
              {/* NỘI THẤT & POSM */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Package className="w-4 h-4 text-purple-600" />
                  4. Hạng mục nội thất & POSM (nếu có)
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kệ trưng bày & Kích thước
                  </label>
                  <Input
                    value={surveyFormData.displayShelves}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, displayShelves: e.target.value })}
                    placeholder="VD: Kệ màu, kệ thông tin SP, kệ hình ảnh, kệ sắt..."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bàn ghế POSM
                  </label>
                  <Input
                    value={surveyFormData.furniture}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, furniture: e.target.value })}
                    placeholder="VD: Bàn lễ tân, hộp bàn lễ tân, ghế làm việc..."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vật phẩm nhận diện khác
                  </label>
                  <Input
                    value={surveyFormData.otherPosm}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, otherPosm: e.target.value })}
                    placeholder="VD: HĐ ngôi nhà, dán decal kệ sắt cũ..."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* CÔNG VIỆC SỬA CHỮA & GHI CHÚ MẶT BẰNG */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  5. Nội dung sửa chữa & Lưu ý tại mặt bằng
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mô tả công việc sửa chữa / bảo trì
                  </label>
                  <Input
                    value={surveyFormData.repairScope}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, repairScope: e.target.value })}
                    placeholder="VD: Sửa địa chỉ, sửa bảng, sửa tay nắm kệ gỗ, bắn lại trần alu cũ bị bung..."
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lưu ý tại mặt bằng thi công
                  </label>
                  <textarea
                    rows={2}
                    value={surveyFormData.siteNotes}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, siteNotes: e.target.value, notes: e.target.value })}
                    placeholder="VD: Dọn kệ cho đại lý không có người, hỗ trợ làm sớm, mặt bằng hẹp..."
                    className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                  />
                </div>

                {/* THÔNG SỐ KỸ THUẬT LẮP ĐẶT NHẸ NHÀNG */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kết cấu dầm neo</label>
                    <select
                      value={surveyFormData.structureType}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, structureType: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-1.5 text-[11px] bg-white"
                    >
                      <option value="Dầm bê tông chịu lực">Dầm bê tông chịu lực</option>
                      <option value="Tường gạch đặc xây dày">Tường gạch đặc xây dày</option>
                      <option value="Khung kèo thép tiền chế">Khung kèo thép tiền chế</option>
                      <option value="Mái tôn sóng tôn lạnh">Mái tôn sóng tôn lạnh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Phương án tiếp cận</label>
                    <select
                      value={surveyFormData.installationMethod}
                      onChange={(e) => setSurveyFormData({ ...surveyFormData, installationMethod: e.target.value })}
                      className="w-full rounded-md border border-slate-300 p-1.5 text-[11px] bg-white"
                    >
                      <option value="Giàn giáo 2 tầng">Giàn giáo 2 tầng</option>
                      <option value="Giàn giáo 3-4 tầng">Giàn giáo 3-4 tầng</option>
                      <option value="Xe cẩu tự hành 3.5 tấn">Xe cẩu tự hành</option>
                      <option value="Thang nhôm rút">Thang nhôm rút</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHÂN MODAL & NÚT HÀNH ĐỘNG */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="text-[11px] text-slate-500">
              * Thông số đo đạc & phân loại sẽ được tự động đồng bộ sang <strong>BOM Bóc tách</strong> và <strong>Studio Maket</strong>
            </div>

            <div className="flex items-center gap-2 self-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsCreateSurveyOpen(false);
                  setEditingSurveyId(null);
                }}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={creatingSurvey}
                onClick={(e) => handleCreateSurveySubmit(e, false)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
              >
                {creatingSurvey ? "Đang lưu..." : editingSurveyId ? "Cập Nhật Khảo Sát" : "Lưu Phiếu Khảo Sát"}
              </Button>
              <Button
                type="button"
                disabled={creatingSurvey}
                onClick={(e) => handleCreateSurveySubmit(e, true)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{creatingSurvey ? "Đang xử lý..." : "Lưu & Sang Studio Maket Chuẩn →"}</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL CHỈNH SỬA CHI TIẾT BẢNG BÓC TÁCH KỸ THUẬT & ĐỊNH MỨC VẬT TƯ (BOM) */}
      <Modal
        isOpen={isEditBomModalOpen}
        onClose={() => {
          setIsEditBomModalOpen(false);
          setEditingBom(null);
        }}
        maxWidth="6xl"
        title={editingBom?.code ? `Chỉnh Sửa Bảng Bóc Tách Kỹ Thuật (BOM) • ${editingBom.code}` : "Chỉnh Sửa Bảng Bóc Tách Kỹ Thuật (BOM)"}
      >
        <div className="space-y-4 text-xs">
          {/* KHỐI 1: THÔNG TIN CHUNG BẢNG BOM */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-800 mb-1">
                  Tiêu đề / Tên bảng bóc tách BOM *
                </label>
                <input
                  type="text"
                  value={editBomData.title}
                  onChange={(e) => setEditBomData({ ...editBomData, title: e.target.value })}
                  placeholder="VD: BOM Bóc Tách KS-202610-001 - ĐẠI LÝ SƠN THÀNH PHÁT"
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Ghi chú tổng quan
                </label>
                <input
                  type="text"
                  value={editBomData.notes}
                  onChange={(e) => setEditBomData({ ...editBomData, notes: e.target.value })}
                  placeholder="Ghi chú thi công, xưởng gia công..."
                  className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>

            {editingBom && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                <span>
                  Quy cách: <strong>{editingBom.signageType || "alu_letters"}</strong>
                </span>
                <span>•</span>
                <span>
                  Kích thước: <strong>{editingBom.widthMeters}m × {editingBom.heightMeters}m × {editingBom.depthMeters}m</strong> (DT: <strong>{editingBom.areaSqm} m²</strong>)
                </span>
                <span>•</span>
                <span>
                  Hộp sắt: <strong>{editingBom.ironBoxType || "25x25"}</strong>
                </span>
                <span>•</span>
                <span>
                  Vật liệu mặt: <strong>{(editingBom as any).signMaterial || "Bảng alu"}</strong>
                </span>
              </div>
            )}
          </div>

          {/* KHỐI 2: BẢNG DANH MỤC VẬT TƯ & ĐỊNH MỨC CHI TIẾT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Danh sách định mức vật tư ({editBomData.items.length} hạng mục)</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleAddItemRow}
                className="h-7 px-2.5 text-xs text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-200 rounded-md inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng vật tư</span>
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="px-2.5 py-2 w-10 text-center">STT</th>
                    <th className="px-2.5 py-2 w-36">Phân loại</th>
                    <th className="px-2.5 py-2 w-28">Mã SKU</th>
                    <th className="px-2.5 py-2">Tên vật tư & Quy cách</th>
                    <th className="px-2.5 py-2 w-16 text-center">ĐVT</th>
                    <th className="px-2.5 py-2 w-20 text-right">Định mức</th>
                    <th className="px-2.5 py-2 w-28 text-right">Đơn giá (đ)</th>
                    <th className="px-2.5 py-2 w-28 text-right">Thành tiền (đ)</th>
                    <th className="px-2.5 py-2 w-36">Ghi chú</th>
                    <th className="px-2.5 py-2 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {editBomData.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Chưa có dòng vật tư nào. Bấm &quot;Thêm dòng vật tư&quot; để bổ sung định mức.
                      </td>
                    </tr>
                  ) : (
                    editBomData.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-2.5 py-1.5 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <select
                            value={it.category}
                            onChange={(e) => handleItemFieldChange(idx, "category", e.target.value)}
                            className="w-full rounded border border-slate-200 p-1 text-[11px] bg-white text-slate-800"
                          >
                            <option value="Khung sắt">Khung sắt</option>
                            <option value="Mặt dựng">Mặt dựng</option>
                            <option value="Logo & Nhận diện">Logo & Nhận diện</option>
                            <option value="Hệ thống LED">Hệ thống LED</option>
                            <option value="Nguồn điện">Nguồn điện</option>
                            <option value="Nội thất & POSM">Nội thất & POSM</option>
                            <option value="Vật tư phụ & Keo">Vật tư phụ & Keo</option>
                            <option value="Khác">Khác</option>
                          </select>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="text"
                            value={it.itemCode}
                            onChange={(e) => handleItemFieldChange(idx, "itemCode", e.target.value)}
                            placeholder="SKU..."
                            className="w-full rounded border border-slate-200 p-1 text-[11px] font-mono bg-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="text"
                            value={it.itemName}
                            onChange={(e) => handleItemFieldChange(idx, "itemName", e.target.value)}
                            placeholder="Tên vật tư, quy cách..."
                            className="w-full rounded border border-slate-200 p-1 text-[11px] font-medium bg-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <input
                            type="text"
                            value={it.unit}
                            onChange={(e) => handleItemFieldChange(idx, "unit", e.target.value)}
                            placeholder="ĐVT"
                            className="w-full rounded border border-slate-200 p-1 text-[11px] text-center bg-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={it.quantity}
                            onChange={(e) => handleItemFieldChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-slate-200 p-1 text-[11px] text-right font-mono font-bold text-blue-700 bg-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            value={it.unitPrice}
                            onChange={(e) => handleItemFieldChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-slate-200 p-1 text-[11px] text-right font-mono bg-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-700">
                          {Number(it.amount || 0).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input
                            type="text"
                            value={it.note || ""}
                            onChange={(e) => handleItemFieldChange(idx, "note", e.target.value)}
                            placeholder="Ghi chú..."
                            className="w-full rounded border border-slate-200 p-1 text-[11px] text-slate-500 bg-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* TỔNG KẾT KINH PHÍ DỰ TOÁN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">
                Tổng cộng: <strong>{editBomData.items.length}</strong> dòng vật tư định mức
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                  Tổng dự toán vật tư:
                </span>
                <span className="font-mono font-bold text-base text-emerald-600">
                  {editBomData.items
                    .reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
                    .toLocaleString("vi-VN")}{" "}
                  đ
                </span>
              </div>
            </div>
          </div>

          {/* CHÂN MODAL & NÚT HÀNH ĐỘNG */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsEditBomModalOpen(false);
                setEditingBom(null);
              }}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={savingBom}
              onClick={() => handleSaveEditBom()}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingBom ? "Đang lưu..." : "Lưu Cập Nhật BOM"}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
