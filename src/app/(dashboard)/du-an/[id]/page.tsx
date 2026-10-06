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
  FileText,
  FileSpreadsheet,
  Upload,
  Compass,
  Zap,
  ShieldAlert,
  Wrench,
  Grid,
  PenTool,
} from "lucide-react";
import {
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

// 7 GIAI ĐOẠN CHUẨN DỰ ÁN
const STAGES: { id: ProjectStatus; step: number; label: string }[] = [
  { id: "survey", step: 1, label: "Khảo sát" },
  { id: "planning", step: 2, label: "Thiết kế & BOM" },
  { id: "production", step: 3, label: "Gia công xưởng" },
  { id: "transport", step: 4, label: "Vận chuyển" },
  { id: "installation", step: 5, label: "Lắp dựng" },
  { id: "acceptance", step: 6, label: "Nghiệm thu" },
  { id: "completed", step: 7, label: "Hoàn tất dự án" },
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


export type ProjectDetailTab =
  | "dashboard"
  | "wbs"
  | "design"
  | "bom"
  | "production"
  | "qc"
  | "reports"
  | "finance"
  | "acceptance"
  | "warranty"
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
    title: "Thiết kế 2D/3D & Bóc tách BOM",
    desc: "Lập bản vẽ 2D/3D phối cảnh, bóc tách danh mục định mức vật tư (BOM), lập cây công việc WBS và kế hoạch thi công.",
    checklist: [
      "Bản vẽ 2D kỹ thuật và 3D phối cảnh đã duyệt",
      "Lập cây công việc WBS chi tiết cho các tổ đội",
      "Bóc tách vật tư và định mức xuất kho",
      "Ký kết hợp đồng kinh tế và nhận tạm ứng đợt 1",
    ],
    relevantTab: "bom",
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
    relevantTab: "qc",
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
    relevantTab: "reports",
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
    relevantTab: "acceptance",
  },
  completed: {
    step: 7,
    title: "Dự án hoàn tất",
    desc: "Công trình đã hoàn thành toàn diện, khách hàng đã thanh toán đầy đủ và chuyển sang giai đoạn bảo hành bảo trì định kỳ.",
    checklist: [
      "Đã thu đủ 100% công nợ theo hợp đồng",
      "Lưu trữ toàn bộ hồ sơ nghiệm thu và nhật ký",
      "Chuyển sang chế độ bảo hành",
    ],
    relevantTab: "warranty",
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

  // Modal Thêm Đầu việc lớn (Main Task)
  const [isCreateStageOpen, setIsCreateStageOpen] = React.useState(false);
  const [newStageTitle, setNewStageTitle] = React.useState("");
  const [newStageWeight, setNewStageWeight] = React.useState<number>(10);
  const [newStageDueAt, setNewStageDueAt] = React.useState("");
  const [newStageStartAt, setNewStageStartAt] = React.useState("");
  const [newStageIsField, setNewStageIsField] = React.useState(false);
  const [newStageAssigneeIds, setNewStageAssigneeIds] = React.useState<string[]>([]);
  const [newStageAssigneeSearch, setNewStageAssigneeSearch] = React.useState("");
  const [savingStage, setSavingStage] = React.useState(false);

  // Modal Sửa chi tiết Task WBS
  const [editingTask, setEditingTask] = React.useState<WbsTaskDto | null>(null);
  const [editTaskTitle, setEditTaskTitle] = React.useState("");
  const [editTaskWeight, setEditTaskWeight] = React.useState<number>(1);
  const [editTaskDueAt, setEditTaskDueAt] = React.useState("");
  const [editTaskStartAt, setEditTaskStartAt] = React.useState("");
  const [editTaskIsField, setEditTaskIsField] = React.useState(false);
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

  // Modals nghiệp vụ hiện có
  const [isStageModalOpen, setIsStageModalOpen] = React.useState(false);
  const [viewingStage, setViewingStage] = React.useState<ProjectStatus | null>(null);
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
  const [newTaskDueAt, setNewTaskDueAt] = React.useState("");
  const [newTaskStartAt, setNewTaskStartAt] = React.useState("");
  const [newTaskIsField, setNewTaskIsField] = React.useState(false);
  const [newTaskEmployeeId, setNewTaskEmployeeId] = React.useState("");
  const [savingNewTask, setSavingNewTask] = React.useState(false);

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
    if (tabParam && ["dashboard", "wbs", "design", "bom", "production", "qc", "reports", "finance", "acceptance", "warranty", "members"].includes(tabParam)) {
      setActiveTab(tabParam as ProjectDetailTab);
    }
  }, [searchParams]);

  const handleTabChange = (t: ProjectDetailTab) => {
    setActiveTab(t);
    router.replace(`/du-an/${projectId}?tab=${t}`, { scroll: false });
  };

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

  React.useEffect(() => {
    fetchData();
    fetchDesignData();
    fetchQcData();
    fetchWarrantyData();
    fetchBomsData();
    // Tải dữ liệu phụ trợ (nhân sự, khách hàng) ở background sau khi trang đã render
    const timer = setTimeout(() => {
      fetchAuxiliaryData();
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchData, fetchAuxiliaryData, fetchDesignData, fetchQcData, fetchWarrantyData, fetchBomsData]);

  React.useEffect(() => {
    if (activeTab === "dashboard") {
      fetchReports();
      fetchMaterials();
      fetchFinance();
      fetchMembers();
      fetchDesignData();
      fetchQcData();
      fetchWarrantyData();
      fetchBomsData();
    }
    if (activeTab === "design") fetchDesignData();
    if (activeTab === "bom") fetchBomsData();
    if (activeTab === "qc") fetchQcData();
    if (activeTab === "warranty") fetchWarrantyData();
    if (activeTab === "reports") fetchReports();
    if (activeTab === "production") fetchMaterials();
    if (activeTab === "finance") fetchFinance();
    if (activeTab === "members") fetchMembers();
  }, [activeTab, fetchReports, fetchMaterials, fetchFinance, fetchMembers, fetchDesignData, fetchQcData, fetchWarrantyData, fetchBomsData]);

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
    if (!can("task.update") && !can("project.update") && !isAssigned) {
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

  const handleCreateTopLevelStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("task.create") && !can("project.update")) {
      toast.error("Bạn không có quyền tạo đầu việc");
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
          isStage: true,
          weight: newStageWeight,
          startAt: newStageStartAt || null,
          dueAt: newStageDueAt || null,
          isField: newStageIsField,
          assigneeIds: newStageAssigneeIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo đầu việc");
      toast.success("Đã tạo Đầu việc lớn mới!");
      setIsCreateStageOpen(false);
      setNewStageTitle("");
      setNewStageWeight(10);
      setNewStageDueAt("");
      setNewStageStartAt("");
      setNewStageIsField(false);
      setNewStageAssigneeIds([]);
      setNewStageAssigneeSearch("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo đầu việc");
    } finally {
      setSavingStage(false);
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
      setAssigningTask(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi giao việc");
    } finally {
      setSavingAssignee(false);
    }
  };

  const openCreateSubTaskModal = (parent: WbsTaskDto) => {
    setCreateTaskParent(parent);
    setNewTaskTitle("");
    setNewTaskDueAt("");
    setNewTaskStartAt("");
    setNewTaskIsField(Boolean(parent.isField));
    // Nếu người đăng nhập là thợ được giao trong việc lớn này, mặc định tự giao cho mình
    if (user?.employeeId && parent.assignees.some((a) => a.employeeId === user.employeeId)) {
      setNewTaskEmployeeId(user.employeeId);
    } else {
      setNewTaskEmployeeId("");
    }
  };

  const handleCreateSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTaskParent) return;

    const isAssignedToParent = Boolean(
      user?.employeeId && createTaskParent.assignees?.some((a) => a.employeeId === user.employeeId)
    );
    if (!can("task.create") && !can("project.update") && !isAssignedToParent) {
      toast.error("Bạn không có quyền tạo việc nhỏ (cần quyền task.create hoặc được phân công trong đầu việc lớn này)");
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
          employeeId: newTaskEmployeeId || null,
          startAt: newTaskStartAt || null,
          dueAt: newTaskDueAt || null,
          isField: newTaskIsField,
          isStage: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo việc nhỏ");
      toast.success("Đã thêm việc nhỏ mới!");
      setCreateTaskParent(null);
      setNewTaskTitle("");
      setNewTaskEmployeeId("");
      setNewTaskDueAt("");
      setNewTaskStartAt("");
      setNewTaskIsField(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo việc nhỏ");
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
          weight: Number(editTaskWeight) || 1,
          startAt: editTaskStartAt || null,
          dueAt: editTaskDueAt || null,
          isField: editTaskIsField,
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

  // PHASE 2 ACTIONS:
  // 1. Thêm bản vẽ / Market thiết kế
  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofTitle.trim()) {
      toast.error("Vui lòng nhập tên/tiêu đề bản vẽ Market");
      return;
    }
    const finalFileUrl = newProofFileUrl.trim() || "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80";
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

  // 2. Phê duyệt / Từ chối Market
  const handleUpdateProofStatus = async (proofId: string, status: "approved" | "rejected", clientFeedback?: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/design-proofs/${proofId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          feedback: clientFeedback,
          approvedByName: status === "approved" ? (user?.name || "Khách hàng duyệt") : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi cập nhật Market");
      toast.success(status === "approved" ? "Đã phê duyệt Market thiết kế!" : "Đã cập nhật trạng thái Market");
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

  // Tổng hợp tất cả nhiệm vụ WBS (cha + con) để đếm số lượng cho FacetFilter
  const allWbsTasksList = React.useMemo(() => {
    const list: WbsTaskDto[] = [];
    tasks.forEach((parent) => {
      list.push(parent);
      if (parent.children) {
        list.push(...parent.children);
      }
    });
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
    return tasks
      .map((parent) => {
        let children = parent.children || [];
        if (wbsSearch.trim()) {
          const q = wbsSearch.toLowerCase();
          children = children.filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              c.code.toLowerCase().includes(q) ||
              c.assignees?.some((a) => a.name.toLowerCase().includes(q))
          );
        }
        if (wbsEmployeeFilters.length > 0) {
          children = children.filter((c) => {
            const hasNoAssignee = !c.assignees || c.assignees.length === 0;
            const matchesUnassigned = wbsEmployeeFilters.includes("unassigned") && hasNoAssignee;
            const matchesEmployee = c.assignees?.some((a) => wbsEmployeeFilters.includes(a.employeeId));
            return matchesUnassigned || matchesEmployee;
          });
        }
        if (wbsStatusFilters.length > 0) {
          children = children.filter((c) => wbsStatusFilters.includes(c.status));
        }
        if (wbsTypeFilters.length > 0) {
          children = children.filter((c) => {
            const matchesField = wbsTypeFilters.includes("field") && Boolean(c.isField);
            const matchesFactory = wbsTypeFilters.includes("factory") && !c.isField;
            return matchesField || matchesFactory;
          });
        }
        return { ...parent, filteredChildren: children };
      })
      .filter((parent) => {
        const hasActiveFilters =
          Boolean(wbsSearch.trim()) ||
          wbsEmployeeFilters.length > 0 ||
          wbsStatusFilters.length > 0 ||
          wbsTypeFilters.length > 0;
        if (!hasActiveFilters) return true;
        const hasChildren = Boolean(parent.filteredChildren && parent.filteredChildren.length > 0);
        if (hasChildren) return true;

        // Kiểm tra xem chính parent có thỏa mãn bộ lọc không
        let parentMatches = true;
        if (wbsSearch.trim()) {
          const q = wbsSearch.toLowerCase();
          parentMatches =
            parentMatches &&
            (parent.title.toLowerCase().includes(q) ||
              parent.code.toLowerCase().includes(q) ||
              Boolean(parent.assignees?.some((a) => a.name.toLowerCase().includes(q))));
        }
        if (wbsEmployeeFilters.length > 0) {
          const hasNoAssignee = !parent.assignees || parent.assignees.length === 0;
          const matchesUnassigned = wbsEmployeeFilters.includes("unassigned") && hasNoAssignee;
          const matchesEmployee = parent.assignees?.some((a) => wbsEmployeeFilters.includes(a.employeeId));
          parentMatches = parentMatches && Boolean(matchesUnassigned || matchesEmployee);
        }
        if (wbsStatusFilters.length > 0) {
          parentMatches = parentMatches && wbsStatusFilters.includes(parent.status);
        }
        if (wbsTypeFilters.length > 0) {
          const matchesField = wbsTypeFilters.includes("field") && Boolean(parent.isField);
          const matchesFactory = wbsTypeFilters.includes("factory") && !parent.isField;
          parentMatches = parentMatches && (matchesField || matchesFactory);
        }
        return parentMatches;
      });
  }, [tasks, wbsSearch, wbsEmployeeFilters, wbsStatusFilters, wbsTypeFilters]);

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

            {/* NÚT BẬT/TẮT THÔNG TIN DỰ ÁN (ẨN LÀ ẨN HẾT!) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectInfoExpanded((prev) => !prev)}
              className="h-7 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
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
          onClick={() => handleTabChange("bom")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "bom"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <Grid className="w-4 h-4" />
          <span>Định mức BOM</span>
          {projectBoms.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "bom"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {projectBoms.length}
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
          onClick={() => handleTabChange("qc")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "qc"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <Zap className="w-4 h-4" />
          <span>KCS & QC Xuất xưởng</span>
          {qcRecords.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "qc"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {qcRecords.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("reports")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "reports"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Nhật ký hiện trường</span>
          {fieldReports.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "reports"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {fieldReports.length}
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
          <DollarSign className="w-4 h-4" />
          <span>Thu chi & P&L</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("acceptance")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "acceptance"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Hồ sơ nghiệm thu</span>
          {acceptances.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "acceptance"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {acceptances.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("warranty")}
          className={cn(
            "pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap -mb-px",
            activeTab === "warranty"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bảo hành & Sự cố</span>
          {warrantyTickets.length > 0 && (
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "warranty"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {warrantyTickets.length}
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
        />
      )}

      {/* TAB 2: CÂY CÔNG VIỆC WBS (CHỈ CÓ TAB NÀY CÓ TIẾN TRÌNH GIAI ĐOẠN) */}
      {activeTab === "wbs" && (
        <div className="flex flex-col lg:flex-row items-start gap-3">
          {/* CỘT TRÁI: DẢI DỌC TIẾN TRÌNH GIAI ĐOẠN (THU HẸP, GỌN GÀNG) */}
          <div className="w-full lg:w-48 shrink-0 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs space-y-2 lg:sticky lg:top-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tiến trình Giai đoạn</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  6 chặng
                </span>
              </div>

              {/* DẢI DỌC TIẾN TRÌNH */}
              <div className="relative space-y-1 pt-0.5">
                {STAGES.map((stg, idx) => {
                  const thisIdx = STAGE_ORDER.indexOf(stg.id);
                  const isPast = thisIdx < currentStageIdx;
                  const isCurrent = project.status === stg.id;
                  const isLast = idx === STAGES.length - 1;

                  return (
                    <div key={stg.id} className="relative">
                      {!isLast && (
                        <div
                          className={cn(
                            "absolute left-3 top-6 w-0.5 h-4 -ml-px transition-colors",
                            isPast ? "bg-emerald-400" : "bg-slate-200"
                          )}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingStage(stg.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-all relative z-10 cursor-pointer group",
                          isCurrent
                            ? "bg-blue-50/90 border border-blue-200 shadow-2xs"
                            : isPast
                            ? "hover:bg-emerald-50/60"
                            : "hover:bg-slate-50 opacity-80 hover:opacity-100"
                        )}
                        title={`Xem chi tiết & hồ sơ ${stg.label}`}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform group-hover:scale-105",
                            isPast && "bg-emerald-600 text-white shadow-2xs",
                            isCurrent && "bg-blue-600 text-white ring-2 ring-blue-100 shadow-sm",
                            !isPast && !isCurrent && "bg-white border-2 border-slate-300 text-slate-400"
                          )}
                        >
                          {isPast ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <span>{stg.step}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "text-xs truncate block",
                              isCurrent
                                ? "font-bold text-blue-900"
                                : isPast
                                ? "font-semibold text-slate-800"
                                : "font-medium text-slate-500"
                            )}
                          >
                            {stg.label}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] block leading-none mt-0.5",
                              isCurrent
                                ? "text-blue-600 font-bold"
                                : isPast
                                ? "text-emerald-600 font-medium"
                                : "text-slate-400"
                            )}
                          >
                            {isCurrent ? "● Đang làm" : isPast ? "✓ Hoàn thành" : "Chờ tới lượt"}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: CÂY CÔNG VIỆC WBS */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            {/* Thanh lọc chuẩn Benchmark FacetFilter giống trang /cong-viec */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative w-56 sm:w-64">
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
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition shrink-0"
                  >
                    Xóa lọc
                  </button>
                )}
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
                        <strong
                          onClick={() => openTaskDetail(parent)}
                          className="text-xs text-slate-900 truncate cursor-pointer hover:text-blue-600 hover:underline"
                          title="Bấm xem chi tiết: Checklist, KCS, vật tư & khoán việc"
                        >
                          {parent.title}
                        </strong>
                        {parent.isField ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                            📍 Hiện trường
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            🏭 Xưởng
                          </span>
                        )}
                        {parent.dueAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            Hạn: {parent.dueAt.slice(0, 10)}
                          </span>
                        )}
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
                            onClick={() => openCreateSubTaskModal(parent)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50"
                          >
                            + Thêm việc
                          </button>
                        )}

                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => openTaskDetail(parent)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-200"
                            title="Chi tiết kỹ thuật & KCS giai đoạn"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {canManageTasks && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTask(parent);
                                  setEditTaskTitle(parent.title);
                                  setEditTaskWeight(parent.weight || 1);
                                  setEditTaskStartAt(parent.startAt ? parent.startAt.slice(0, 10) : "");
                                  setEditTaskDueAt(parent.dueAt ? parent.dueAt.slice(0, 10) : "");
                                  setEditTaskIsField(Boolean(parent.isField));
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
                            </>
                          )}
                        </div>

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
                            parent.status === "done"
                              ? "success"
                              : parent.status === "awaiting_acceptance"
                              ? "info"
                              : parent.status === "doing"
                              ? "warning"
                              : "neutral"
                          }
                          className={parent.status === "awaiting_acceptance" ? "bg-sky-50 text-sky-700 border-sky-200" : ""}
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
                                <span
                                  onClick={() => openTaskDetail(sub, parent)}
                                  className="text-slate-800 truncate cursor-pointer hover:text-blue-600 hover:underline font-medium"
                                  title="Bấm xem chi tiết: Checklist KCS, HSE, Bằng chứng ảnh, Định mức vật tư, Khoán việc"
                                >
                                  {sub.title}
                                </span>
                                {sub.isField ? (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                    📍 Hiện trường
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                    🏭 Xưởng
                                  </span>
                                )}
                                {sub.dueAt && (
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    Hạn: {sub.dueAt.slice(0, 10)}
                                  </span>
                                )}
                                {sub.weight && sub.weight > 1 && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                                    x{sub.weight}
                                  </span>
                                )}

                                {assignee ? (
                                  canAssign ? (
                                    <button
                                      type="button"
                                      onClick={() => openAssignModal(sub)}
                                      className="text-[11px] text-blue-600 hover:underline shrink-0"
                                    >
                                      [{assignee.name}]
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-600 shrink-0">[{assignee.name}]</span>
                                  )
                                ) : (
                                  canAssign ? (
                                    <button
                                      type="button"
                                      onClick={() => openAssignModal(sub)}
                                      className="text-[10px] text-amber-700 hover:underline shrink-0"
                                    >
                                      [+ Giao việc]
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic shrink-0">[Chưa giao việc]</span>
                                  )
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {[0, 25, 50, 75].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      disabled={!canManageTasks}
                                      onClick={() => handleUpdateTaskProgress(sub, pct)}
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
                                  <button
                                    type="button"
                                    disabled={!canManageTasks}
                                    onClick={() => handleUpdateTaskProgress(sub, 100)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-0.5",
                                      sub.progressPercent === 100
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200",
                                      !canManageTasks && "cursor-default opacity-80"
                                    )}
                                    title="Bấm để xác nhận hoàn thành (nhập ghi chú / ảnh minh chứng)"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>100%</span>
                                  </button>
                                </div>

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
                                  {sub.status === "done"
                                    ? "Hoàn thành"
                                    : sub.status === "awaiting_acceptance"
                                    ? "Chờ nghiệm thu"
                                    : sub.status === "doing"
                                    ? "Đang làm"
                                    : "Chờ làm"}
                                </Badge>

                                <div className="flex items-center ml-1">
                                  <button
                                    type="button"
                                    onClick={() => openTaskDetail(sub, parent)}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                                    title="Chi tiết công việc (Checklist KCS, HSE, Bằng chứng ảnh, Định mức vật tư, Khoán việc)"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  {canManageTasks && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingTask(sub);
                                          setEditTaskTitle(sub.title);
                                          setEditTaskWeight(sub.weight || 1);
                                          setEditTaskStartAt(sub.startAt ? sub.startAt.slice(0, 10) : "");
                                          setEditTaskDueAt(sub.dueAt ? sub.dueAt.slice(0, 10) : "");
                                          setEditTaskIsField(Boolean(sub.isField));
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
                                    </>
                                  )}
                                </div>
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
              {/* BANNER ĐÁNH GIÁ HIỆU QUẢ SỨC KHỎE TÀI CHÍNH */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4",
                finance.profitHealth === "excellent" && "bg-emerald-50/70 border-emerald-200 text-emerald-950",
                finance.profitHealth === "good" && "bg-blue-50/70 border-blue-200 text-blue-950",
                finance.profitHealth === "warning" && "bg-amber-50/70 border-amber-200 text-amber-950",
                finance.profitHealth === "danger" && "bg-rose-50/70 border-rose-200 text-rose-950"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 font-mono shadow-sm",
                    finance.profitHealth === "excellent" && "bg-emerald-600 text-white",
                    finance.profitHealth === "good" && "bg-blue-600 text-white",
                    finance.profitHealth === "warning" && "bg-amber-500 text-white",
                    finance.profitHealth === "danger" && "bg-rose-600 text-white"
                  )}>
                    {finance.grossProfitMargin.toFixed(0)}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        Job Costing & Lợi nhuận: {finance.profitHealthLabel || "Đang tính toán"}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        finance.profitHealth === "excellent" && "bg-emerald-200 text-emerald-800",
                        finance.profitHealth === "good" && "bg-blue-200 text-blue-800",
                        finance.profitHealth === "warning" && "bg-amber-200 text-amber-800",
                        finance.profitHealth === "danger" && "bg-rose-200 text-rose-800"
                      )}>
                        {finance.profitHealth ? finance.profitHealth.toUpperCase() : "STANDARD"}
                      </span>
                    </div>
                    <p className="text-xs opacity-80 mt-0.5">
                      {(finance.costVariance || 0) >= 0 
                        ? `Tiết kiệm chi phí: +${(finance.costVariance || 0).toLocaleString("vi-VN")} đ so với định mức ngân sách dự toán.`
                        : `Vượt chi phí dự toán: ${(finance.costVariance || 0).toLocaleString("vi-VN")} đ. Cần kiểm soát chặt chẽ vật tư & nhân công thi công!`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] opacity-70 block font-medium">Lãi gộp công trình</span>
                    <strong className="text-base font-bold font-mono">
                      {finance.grossProfit.toLocaleString("vi-VN")} đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4 Thẻ KPI Tài chính & Dự toán */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Doanh thu bán hàng (SO)</span>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {finance.contractTotal.toLocaleString("vi-VN")} đ
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Giá trị hợp đồng duyệt</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Dự toán chi phí ban đầu</span>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {(finance.budgetedCost || 0).toLocaleString("vi-VN")} đ
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Biên lãi mục tiêu: {finance.budgetedMargin || 0}%</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Tổng chi phí thực tế (COGS)</span>
                  <div className={cn(
                    "text-base font-bold mt-1 font-mono",
                    (finance.actualTotalCost || 0) > (finance.budgetedCost || 0) ? "text-rose-600" : "text-slate-900"
                  )}>
                    {(finance.actualTotalCost || (finance.materialCost + finance.disbursementsTotal)).toLocaleString("vi-VN")} đ
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium mt-0.5 block",
                    (finance.costVariance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {(finance.costVariance || 0) >= 0 ? "▼ Tiết kiệm: " : "▲ Vượt chi: "}
                    {Math.abs(finance.costVariance || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className={cn(
                  "p-3.5 rounded-xl border",
                  finance.grossProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                )}>
                  <span className={finance.grossProfit >= 0 ? "text-emerald-800 font-medium block text-[11px]" : "text-rose-800 font-medium block text-[11px]"}>
                    Lãi gộp thực tế & Tỷ suất
                  </span>
                  <div className={cn(
                    "text-base font-bold mt-1 font-mono",
                    finance.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {finance.grossProfit.toLocaleString("vi-VN")} đ
                  </div>
                  <span className={finance.grossProfit >= 0 ? "text-[10px] text-emerald-700 font-semibold mt-0.5 block" : "text-[10px] text-rose-700 font-semibold mt-0.5 block"}>
                    Tỷ suất: {finance.grossProfitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* BẢNG ĐỐI CHIẾU JOB COSTING P&L */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Bảng đối chiếu Lãi/Lỗ Job Costing (Dự toán vs Thực tế xuất xưởng & Thi công):
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Đơn vị: VNĐ</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Khoản mục tài chính & Chi phí</th>
                        <th className="px-3.5 py-2.5 text-right">Dự toán (Budgeted)</th>
                        <th className="px-3.5 py-2.5 text-right">Thực tế (Actual)</th>
                        <th className="px-3.5 py-2.5 text-right">Chênh lệch (Variance)</th>
                        <th className="px-3.5 py-2.5 text-center">Tỷ trọng/DT</th>
                        <th className="px-3.5 py-2.5 text-center">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-slate-50/50">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          1. Doanh thu hợp đồng / Bán hàng (SO)
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-800">
                          {finance.contractTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-blue-700">
                          {finance.contractTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-400">
                          0 đ
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono font-medium text-slate-700">
                          100.0%
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-semibold">
                            Hợp đồng duyệt
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3.5 py-2.5">
                          <div className="font-semibold text-slate-800">2. Chi phí vật tư thực xuất (M09)</div>
                          <div className="text-[10px] text-slate-400">Khung sắt, Alu, Module LED, Nguồn 12V, Mica, Decal...</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                          {(finance.budgetedMaterialCost || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {finance.materialCost.toLocaleString("vi-VN")} đ
                        </td>
                        <td className={cn(
                          "px-3.5 py-2.5 text-right font-mono font-medium",
                          (finance.budgetedMaterialCost || 0) - finance.materialCost >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {(finance.budgetedMaterialCost || 0) - finance.materialCost >= 0 ? "+" : ""}
                          {((finance.budgetedMaterialCost || 0) - finance.materialCost).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono text-slate-600">
                          {finance.contractTotal > 0 ? ((finance.materialCost / finance.contractTotal) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {(finance.budgetedMaterialCost || 0) - finance.materialCost >= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-semibold">
                              Tiết kiệm
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-semibold">
                              Vượt mức
                            </span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3.5 py-2.5">
                          <div className="font-semibold text-slate-800">3. Chi phí nhân công, thuê xe & chi phí khác</div>
                          <div className="text-[10px] text-slate-400">Khoán tổ thợ, thuê xe cẩu tự hành, chi phí mua ngoài</div>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                          {((finance.budgetedLaborCost || 0) + (finance.budgetedOtherCost || 0)).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {finance.disbursementsTotal.toLocaleString("vi-VN")} đ
                        </td>
                        <td className={cn(
                          "px-3.5 py-2.5 text-right font-mono font-medium",
                          ((finance.budgetedLaborCost || 0) + (finance.budgetedOtherCost || 0)) - finance.disbursementsTotal >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {((finance.budgetedLaborCost || 0) + (finance.budgetedOtherCost || 0)) - finance.disbursementsTotal >= 0 ? "+" : ""}
                          {(((finance.budgetedLaborCost || 0) + (finance.budgetedOtherCost || 0)) - finance.disbursementsTotal).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono text-slate-600">
                          {finance.contractTotal > 0 ? ((finance.disbursementsTotal / finance.contractTotal) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {((finance.budgetedLaborCost || 0) + (finance.budgetedOtherCost || 0)) - finance.disbursementsTotal >= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-semibold">
                              Trong định mức
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-semibold">
                              Bội chi
                            </span>
                          )}
                        </td>
                      </tr>

                      <tr className="bg-slate-100/60 font-semibold">
                        <td className="px-3.5 py-2.5 text-slate-900">
                          4. TỔNG CHI PHÍ DỰ ÁN (COGS)
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-800">
                          {(finance.budgetedCost || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-900">
                          {(finance.actualTotalCost || (finance.materialCost + finance.disbursementsTotal)).toLocaleString("vi-VN")} đ
                        </td>
                        <td className={cn(
                          "px-3.5 py-2.5 text-right font-mono font-bold",
                          (finance.costVariance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {(finance.costVariance || 0) >= 0 ? "+" : ""}
                          {(finance.costVariance || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-mono text-slate-800">
                          {finance.contractTotal > 0 ? (((finance.actualTotalCost || (finance.materialCost + finance.disbursementsTotal)) / finance.contractTotal) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {(finance.costVariance || 0) >= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-200 text-emerald-800 font-bold">
                              ĐẠT CHỈ TIÊU
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-200 text-rose-800 font-bold">
                              VƯỢT CHI PHÍ
                            </span>
                          )}
                        </td>
                      </tr>

                      <tr className={cn(
                        "font-bold text-sm",
                        finance.grossProfit >= 0 ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950"
                      )}>
                        <td className="px-3.5 py-3">
                          5. LÃI GỘP THỰC TẾ (GROSS PROFIT)
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-slate-700">
                          {(finance.contractTotal - (finance.budgetedCost || 0)).toLocaleString("vi-VN")} đ
                        </td>
                        <td className={cn(
                          "px-3.5 py-3 text-right font-mono font-extrabold",
                          finance.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}>
                          {finance.grossProfit.toLocaleString("vi-VN")} đ
                        </td>
                        <td className={cn(
                          "px-3.5 py-3 text-right font-mono",
                          (finance.costVariance || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}>
                          {(finance.costVariance || 0) >= 0 ? "+" : ""}
                          {(finance.costVariance || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono font-extrabold text-blue-700">
                          {finance.grossProfitMargin.toFixed(1)}%
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            finance.profitHealth === "excellent" && "bg-emerald-600 text-white",
                            finance.profitHealth === "good" && "bg-blue-600 text-white",
                            finance.profitHealth === "warning" && "bg-amber-500 text-white",
                            finance.profitHealth === "danger" && "bg-rose-600 text-white"
                          )}>
                            {finance.profitHealthLabel || "ĐẠT"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phân tích Dòng tiền & Công nợ */}
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">Thực tế dòng tiền & Công nợ khách hàng:</span>
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
                      onClick={() => setSignatureModalAcceptance(a)}
                      className={`h-7 text-xs ${
                        a.signatureData
                          ? "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                          : "text-blue-700 border-blue-300 hover:bg-blue-50"
                      }`}
                      title="Ký xác nhận trực tiếp bằng ngón tay hoặc bút trên điện thoại/máy tính bảng"
                    >
                      <PenTool className="w-3.5 h-3.5 mr-1" />
                      {a.signatureData ? "Đã ký số (Ký lại)" : "✍️ Ký số cảm ứng"}
                    </Button>
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

      {/* 9. TAB 7: KHẢO SÁT & MARKET THIẾT KẾ 2D/3D */}
      {activeTab === "design" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-6 text-xs">
          {/* PHẦN 1: THÔNG TIN KHẢO SÁT MẶT BẰNG HIỆN TRƯỜNG */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Dữ liệu đo đạc & Khảo sát hiện trường</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kích thước thực tế, kết cấu dầm chịu lực và phương án thi công lắp đặt
                </p>
              </div>
              <Link
                href={`/khao-sat`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Quản lý khảo sát hiện trường
              </Link>
            </div>

            {projectSurveys.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">Chưa liên kết phiếu khảo sát hiện trường</span>
                    <p className="text-[11px] text-slate-500">Hãy tạo phiếu đo đạc mặt bằng để tự động tính diện tích m² và lập dự toán vật tư chính xác.</p>
                  </div>
                </div>
                <Link
                  href="/khao-sat"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0 flex items-center gap-1 text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo phiếu đo đạc
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectSurveys.map((sv) => {
                  const areaM2 = ((sv.widthMeters || 0) * (sv.heightMeters || 0)).toFixed(2);
                  return (
                    <div key={sv.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-600">{sv.code}</span>
                        <Badge variant={sv.status === "converted" ? "success" : "neutral"} className="text-[10px]">
                          {sv.status === "converted" ? "Đã thành dự toán" : sv.status === "completed" ? "Đã đo đạc" : "Bản nháp"}
                        </Badge>
                      </div>
                      <div className="font-semibold text-slate-900 truncate">{sv.title}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <div>
                          <span className="text-slate-400 block text-[10px]">KÍCH THƯỚC (D x C x S)</span>
                          <span className="font-mono font-bold text-slate-800">
                            {sv.widthMeters}m × {sv.heightMeters}m × {sv.depthMeters}m
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">DIỆN TÍCH BỀ MẶT</span>
                          <span className="font-mono font-bold text-emerald-600">{areaM2} m²</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">DẦM & ĐỘ CAO</span>
                          <span className="text-slate-700">{sv.structureType || "Dầm bê tông"} ({sv.elevationMeters || 0}m)</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">NGUỒN ĐIỆN BIỂN</span>
                          <span className="text-slate-700">{sv.powerSource || "220V riêng"} (cách {sv.powerDistanceMeters || 5}m)</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>Phương án: <strong>{sv.installationMethod || "Giàn giáo"}</strong></span>
                        <span className="text-slate-400">{new Date(sv.surveyDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PHẦN 2: QUẢN LÝ PHIÊN BẢN MARKET THIẾT KẾ 2D/3D */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Market Thiết kế 2D/3D & Phê duyệt vật liệu ({designProofs.length})</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quản lý các version Market phối cảnh, quy cách vật tư và trạng thái khách hàng chốt duyệt
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsUploadProofOpen(true)}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tải lên Market mới
              </Button>
            </div>

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
                          ? "✓ ĐÃ PHÊ DUYỆT"
                          : proof.status === "rejected"
                          ? "✕ CẦN SỬA LẠI"
                          : "⏳ CHỜ KHÁCH CHỐT"}
                      </Badge>
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

                    {/* Nút thao tác duyệt */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      {proof.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateProofStatus(proof.id, "approved")}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Phê duyệt Market (Chốt)
                        </Button>
                      )}
                      {proof.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const feedback = prompt("Nhập ý kiến yêu cầu chỉnh sửa từ khách hàng:");
                            if (feedback) handleUpdateProofStatus(proof.id, "rejected", feedback);
                          }}
                          className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Yêu cầu sửa Market
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9B. TAB ĐỊNH MỨC & BÓC TÁCH VẬT TƯ SIGNAGE BOM */}
      {activeTab === "bom" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-5 text-xs">
          {/* Header & Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-blue-600" />
                <span>Định mức Bóc tách Vật tư Signage BOM ({projectBoms.length})</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tự động tính toán theo quy cách biển: số tấm Alu Alcorest/EV, sắt hộp nan lưới hàn khung, bóng LED và bộ nguồn Meanwell 12V
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchBomsData}
                disabled={bomsLoading}
                className="h-8 text-xs border-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${bomsLoading ? "animate-spin" : ""}`} />
                Tải lại
              </Button>
              <Link href={`/dinh-muc-bom?projectId=${project?.id || ""}`}>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Bóc tách BOM mới & Tối ưu Nesting
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-blue-800 block text-[11px] font-medium">Tổng tấm Alu cần dùng</span>
              <div className="text-lg font-bold text-blue-900 mt-1 font-mono">
                {projectBoms.reduce((acc, b) => acc + (b.calculatedAluSheets || 0), 0)} <span className="text-xs font-normal text-blue-700">tấm (1.22x2.44m)</span>
              </div>
              <span className="text-[10px] text-blue-600 mt-0.5 block">Đã bao gồm viền & hao hụt</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 block text-[11px] font-medium">Tổng sắt hộp nan khung</span>
              <div className="text-lg font-bold text-amber-900 mt-1 font-mono">
                {projectBoms.reduce((acc, b) => acc + (b.calculatedSteelBars || 0), 0)} <span className="text-xs font-normal text-amber-700">cây 6.0m</span>
              </div>
              <span className="text-[10px] text-amber-600 mt-0.5 block">
                Tổng {(projectBoms.reduce((acc, b) => acc + (b.calculatedSteelMeters || 0), 0)).toFixed(1)}m sắt hộp
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 block text-[11px] font-medium">Nguồn LED & Tải an toàn</span>
              <div className="text-lg font-bold text-emerald-900 mt-1 font-mono">
                {projectBoms.reduce((acc, b) => acc + (b.calculatedPowerUnits || 0), 0)} <span className="text-xs font-normal text-emerald-700">bộ nguồn</span>
              </div>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                Tổng {projectBoms.reduce((acc, b) => acc + (b.calculatedLedCount || 0), 0)} bóng LED
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-purple-800 block text-[11px] font-medium">Tổng dự toán vật tư</span>
              <div className="text-lg font-bold text-purple-900 mt-1 font-mono">
                {projectBoms.reduce((acc, b) => acc + (b.estimatedMaterialCost || 0), 0).toLocaleString("vi-VN")} đ
              </div>
              <span className="text-[10px] text-purple-600 mt-0.5 block">Ước tính theo định mức</span>
            </div>
          </div>

          {/* Danh sách BOMs */}
          {bomsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span>Đang tải danh mục định mức BOM...</span>
            </div>
          ) : projectBoms.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                <Grid className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Chưa có bản bóc tách BOM nào cho dự án này</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Sử dụng công cụ Signage BOM & Nesting để nhập kích thước mặt biển, hệ thống sẽ tự động tính số tấm Alu, sắt hàn khung nan, bóng LED và bộ nguồn chống quá tải.
                </p>
              </div>
              <Link href={`/dinh-muc-bom?projectId=${project?.id || ""}`}>
                <Button className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Bóc tách định mức ngay
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projectBoms.map((bom) => {
                const signTypeLabels: Record<string, string> = {
                  alu_letters: "Biển mặt Alu chữ nổi",
                  lightbox_3m: "Biển hộp đèn 3M / Hút nổi",
                  led_matrix: "Biển LED ma trận / Màn hình",
                  pylon_sign: "Cột Pylon / Biển đứng lớn",
                  neon_sign: "Biển Neon Sign LED",
                  canvas_hiflex: "Biển bạt Hiflex khung sắt",
                  other: "Biển hiệu quảng cáo",
                };

                return (
                  <div
                    key={bom.id}
                    className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                          {bom.code}
                        </span>
                        <strong className="text-slate-900 text-sm">{bom.title}</strong>
                        <Badge variant="neutral" className="text-[10px]">
                          {signTypeLabels[bom.signageType] || bom.signageType}
                        </Badge>
                        <Badge
                          variant={bom.status === "applied" || bom.status === "stock_issued" ? "success" : bom.status === "approved" ? "info" : "neutral"}
                          className="text-[10px]"
                        >
                          {bom.status === "applied" || bom.status === "stock_issued" ? "Đã xuất vật tư" : bom.status === "approved" ? "Đã duyệt" : "Bản nháp"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-800">
                          {(bom.estimatedMaterialCost || 0).toLocaleString("vi-VN")} đ
                        </span>
                        <Link href={`/dinh-muc-bom?projectId=${project?.id || ""}&bomId=${bom.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                            Chi tiết & Nesting
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Kích thước & thông số */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kích thước mặt biển</span>
                        <span className="font-mono font-medium text-slate-800">
                          {bom.widthMeters}m × {bom.heightMeters}m {bom.depthMeters ? `× ${bom.depthMeters}m` : ""}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Diện tích: {bom.areaSqm} m²
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tấm Alu Alcorest/EV</span>
                        <span className="font-mono font-medium text-blue-700">
                          {bom.calculatedAluSheets} tấm
                        </span>
                        <span className="text-[10px] text-slate-500 block">Quy cách: {bom.aluSheetSize || "1.22x2.44m"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Sắt hộp hàn khung</span>
                        <span className="font-mono font-medium text-amber-700">
                          {bom.calculatedSteelBars} cây 6m ({bom.calculatedSteelMeters.toFixed(1)}m)
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {bom.ironBoxType} (nan {bom.gridSpacingCm}cm)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nguồn & Bóng LED</span>
                        <span className="font-mono font-medium text-emerald-700">
                          {bom.calculatedPowerUnits} nguồn {bom.powerUnitWatts}W • {bom.calculatedLedCount} bóng
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Loại LED: {bom.ledType} ({bom.calculatedTotalWatts}W)
                        </span>
                      </div>
                    </div>

                    {/* Phụ liệu */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 px-1">
                      <span>• Keo Titebond: <strong>{bom.calculatedTitebondTubes} chai</strong></span>
                      <span>• Keo Silicon: <strong>{bom.calculatedSiliconeTubes} chai</strong></span>
                      <span>• Đinh rút: <strong>{bom.calculatedRivetsCount} con</strong></span>
                      <span>• Vít tự khoan: <strong>{bom.calculatedScrewsCount} con</strong></span>
                      {bom.notes && <span className="text-slate-500 italic">| Ghi chú: {bom.notes}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 10. TAB 8: KCS KIỂM THỬ XUẤT XƯỞNG & AGING TEST ĐÈN LED */}
      {activeTab === "qc" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-5 text-xs">
          {/* Header & KPI KCS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Biên bản Kiểm định KCS Xuất xưởng & Aging Test Đèn LED ({qcRecords.length})</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kiểm tra sụt áp nguồn 12V, kiểm thử sáng đèn liên tục 4h - 8h và chuẩn chống nước IP65/IP67 trước khi xuất xưởng
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateQcOpen(true)}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Lập biên bản KCS xuất xưởng
            </Button>
          </div>

          {/* 3 Thẻ thống kê chất lượng xưởng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Tổng số biên bản KCS</span>
              <div className="text-lg font-bold text-slate-900 mt-1 font-mono">{qcRecords.length} biên bản</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Được ghi nhận tại xưởng sản xuất</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 block text-[11px] font-medium">Đạt chuẩn xuất xưởng</span>
              <div className="text-lg font-bold text-emerald-700 mt-1 font-mono">
                {qcRecords.filter((q) => q.status === "passed").length} lần ĐẠT
              </div>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">Đủ điều kiện chuyển sang vận chuyển & lắp đặt</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 block text-[11px] font-medium">Quy chuẩn Aging Test LED</span>
              <div className="text-lg font-bold text-amber-700 mt-1 font-mono">4.0h - 8.0h</div>
              <span className="text-[10px] text-amber-600 mt-0.5 block">Chạy thử tải liên tục test nhiệt độ nguồn & sụt áp</span>
            </div>
          </div>

          {/* Danh sách Biên bản KCS */}
          {qcLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              Đang tải danh sách biên bản KCS xuất xưởng...
            </div>
          ) : qcRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Chưa có biên bản KCS xuất xưởng nào. Bấm nút "Lập biên bản KCS xuất xưởng" sau khi hoàn thiện gia công tại xưởng.
            </div>
          ) : (
            <div className="space-y-3">
              {qcRecords.map((qc) => (
                <div
                  key={qc.id}
                  className={cn(
                    "p-4 rounded-xl border text-xs space-y-3 bg-white transition-all",
                    qc.status === "passed" ? "border-emerald-300" : "border-rose-300"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600">{qc.code}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-semibold text-slate-800">{qc.inspectorName || "KCS Xưởng sản xuất"}</span>
                      <span className="text-slate-400">({new Date(qc.qcDate).toLocaleDateString("vi-VN")})</span>
                    </div>
                    <Badge variant={qc.status === "passed" ? "success" : "danger"} className="text-[10px] self-start sm:self-auto">
                      {qc.status === "passed" ? "✓ ĐẠT CHUẨN XUẤT XƯỞNG" : "✕ CHƯA ĐẠT - TRẢ VỀ XƯỞNG"}
                    </Badge>
                  </div>

                  {/* 4 Tiêu chí kiểm định cốt lõi */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Aging Test LED</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 block">{qc.agingTestHours} giờ</span>
                      <span className="text-[10px] text-emerald-600">Sáng liên tục ổn định</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Đo sụt áp 12V</span>
                      </div>
                      <span className={cn("font-bold block", qc.voltageDropCheck ? "text-emerald-600" : "text-rose-600")}>
                        {qc.voltageDropCheck ? "Đạt (<0.5V)" : "Lỗi sụt áp"}
                      </span>
                      <span className="text-[10px] text-slate-400">Nhiệt độ nguồn &lt; 65°C</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Keo chống nước</span>
                      </div>
                      <span className={cn("font-bold block", qc.waterproofCheck ? "text-emerald-600" : "text-rose-600")}>
                        {qc.waterproofCheck ? "Đạt chuẩn IP65/67" : "Hở keo/gioăng"}
                      </span>
                      <span className="text-[10px] text-slate-400">Ron cao su & silicon kín</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
                        <HardHat className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Mối hàn khung</span>
                      </div>
                      <span className={cn("font-bold block", qc.frameWeldCheck ? "text-emerald-600" : "text-rose-600")}>
                        {qc.frameWeldCheck ? "Đạt ngấu chắc" : "Lỗi bọt xỉ/cháy mối"}
                      </span>
                      <span className="text-[10px] text-slate-400">Sơn mạ kẽm chống rỉ</span>
                    </div>
                  </div>

                  {/* Checklist phụ kiện */}
                  {qc.accessoriesChecklist && qc.accessoriesChecklist.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200 text-[11px] space-y-1">
                      <span className="font-semibold text-slate-700 block">Kiểm tra phụ kiện & bàn giao xuất xưởng:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {qc.accessoriesChecklist.map((acc, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{acc.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qc.defectNotes && (
                    <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900 text-[11px]">
                      <strong>Ghi chú lỗi KCS & Xử lý:</strong> {qc.defectNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 11. TAB 9: SỔ BẢO HÀNH & TICKET SỰ CỐ SAU BÁN HÀNG */}
      {activeTab === "warranty" && (
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-4 space-y-5 text-xs">
          {/* BANNER SỔ BẢO HÀNH ĐIỆN TỬ */}
          <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-blue-950">
                    Sổ Bảo Hành Điện Tử Công Trình ({warrantyInfo?.warrantyMonths || 12} Tháng)
                  </span>
                  <Badge
                    variant={warrantyInfo?.isUnderWarranty ? "success" : "neutral"}
                    className="text-[10px]"
                  >
                    {warrantyInfo?.isUnderWarranty ? "● ĐANG HIỆU LỰC BẢO HÀNH" : "HẾT THỜI HẠN BẢO HÀNH"}
                  </Badge>
                </div>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  Thời hạn bảo hành: đến ngày{" "}
                  <strong>
                    {warrantyInfo?.warrantyUntil
                      ? new Date(warrantyInfo.warrantyUntil).toLocaleDateString("vi-VN")
                      : "Theo mốc 12 tháng từ ngày nghiệm thu"}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cam kết dịch vụ: Tiếp nhận và cử kỹ thuật xử lý sự cố nguồn/LED trong vòng 2h - 4h tại hiện trường.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateTicketOpen(true)}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tiếp nhận sự cố mới
            </Button>
          </div>

          {/* DANH SÁCH TICKET SỰ CỐ SAU BÁN HÀNG */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-xs">
                  Nhật ký xử lý sự cố & Bảo hành ({warrantyTickets.length})
                </span>
                <p className="text-[11px] text-slate-500">
                  Lịch sử tiếp nhận lỗi kỹ thuật, cử thợ điều phối và giải quyết sau bàn giao
                </p>
              </div>
            </div>

            {warrantyLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                Đang tải danh sách sự cố bảo hành...
              </div>
            ) : warrantyTickets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Chưa có sự cố hoặc yêu cầu bảo hành nào phát sinh. Biển quảng cáo đang hoạt động ổn định!
              </div>
            ) : (
              <div className="space-y-3">
                {warrantyTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600">{t.code}</span>
                        <Badge
                          variant={
                            t.priority === "urgent"
                              ? "danger"
                              : t.priority === "high"
                              ? "warning"
                              : "neutral"
                          }
                          className="text-[10px]"
                        >
                          {t.priority === "urgent"
                            ? "Khẩn cấp"
                            : t.priority === "high"
                            ? "Ưu tiên cao"
                            : "Bình thường"}
                        </Badge>
                        <Badge
                          variant={
                            t.status === "resolved"
                              ? "success"
                              : t.status === "in_progress"
                              ? "info"
                              : "neutral"
                          }
                          className="text-[10px]"
                        >
                          {t.status === "resolved"
                            ? "Đã khắc phục"
                            : t.status === "in_progress"
                            ? "Đang xử lý"
                            : "Mới tiếp nhận"}
                        </Badge>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        Ngày tiếp nhận: {new Date(t.reportedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900 text-xs">{t.title}</div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        Phân loại: <strong>{t.issueType === "led_power" ? "Hỏng nguồn/cháy LED" : t.issueType === "structural" ? "Kết cấu dầm/khung" : "Bong tróc chữ/decal"}</strong>
                      </div>
                      <div>
                        Kỹ thuật phụ trách: <strong>{t.assignedEmployeeName || "Chưa phân công"}</strong>
                      </div>
                      {t.costAmount > 0 && (
                        <div>
                          Chi phí khắc phục: <strong className="text-rose-600 font-mono">{t.costAmount.toLocaleString("vi-VN")} đ</strong>
                        </div>
                      )}
                    </div>

                    {t.resolutionNotes && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100">
                        <strong>Kết quả xử lý:</strong> {t.resolutionNotes}
                      </div>
                    )}

                    {/* Thao tác chuyển trạng thái ticket */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      {t.status === "received" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateTicketStatus(t.id, "in_progress")}
                          className="h-7 text-xs bg-blue-600 text-white"
                        >
                          <Wrench className="w-3.5 h-3.5 mr-1" />
                          Bắt đầu xử lý
                        </Button>
                      )}
                      {t.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const notes = prompt("Nhập nội dung biên bản xử lý khắc phục:");
                            if (notes) handleUpdateTicketStatus(t.id, "resolved", notes);
                          }}
                          className="h-7 text-xs bg-emerald-600 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Hoàn thành khắc phục
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* DRAWER XEM LẠI LỊCH SỬ & CHI TIẾT GIAI ĐOẠN */}
      <Drawer
        isOpen={Boolean(viewingStage)}
        onClose={() => setViewingStage(null)}
        title={viewingStage ? `Giai Đoạn: ${STAGE_MAP[viewingStage]?.label || viewingStage}` : ""}
        width="lg"
      >
        {viewingStage && (() => {
          const detail = STAGE_DETAILS[viewingStage] || {
            step: 0,
            title: STAGE_MAP[viewingStage]?.label || viewingStage,
            desc: "Thông tin chi tiết giai đoạn dự án.",
            checklist: [],
            relevantTab: "wbs",
          };
          const stageIdx = STAGE_ORDER.indexOf(viewingStage);
          const isPast = stageIdx < currentStageIdx;
          const isCurrent = project.status === viewingStage;

          // Dữ liệu chứng minh thực tế theo từng giai đoạn
          const stagePhotos = photos.filter((p) =>
            viewingStage === "survey"
              ? p.stage.toLowerCase().includes("khảo sát")
              : viewingStage === "production"
              ? p.stage.toLowerCase().includes("khung") || p.stage.toLowerCase().includes("xưởng")
              : viewingStage === "installation"
              ? p.stage.toLowerCase().includes("hoàn thiện") || p.stage.toLowerCase().includes("lắp")
              : true
          );

          return (
            <div className="space-y-4 text-xs">
              {/* Thẻ trạng thái hiện tại của giai đoạn */}
              <div
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between",
                  isPast
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : isCurrent
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                      isPast
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-slate-300 text-slate-700"
                    )}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : detail.step}
                  </div>
                  <div>
                    <strong className="text-xs block">{detail.title}</strong>
                    <span className="text-[11px] opacity-80">
                      {isPast
                        ? "Giai đoạn đã hoàn thành xuất sắc"
                        : isCurrent
                        ? "Dự án đang triển khai ở giai đoạn này"
                        : "Giai đoạn chuẩn bị thực hiện"}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={isPast ? "success" : isCurrent ? "info" : "neutral"}
                  className="text-xs"
                >
                  {isPast ? "✓ Hoàn thành" : isCurrent ? "● Đang làm" : "Chưa tới"}
                </Badge>
              </div>

              {/* Mô tả mục tiêu giai đoạn */}
              <div>
                <span className="font-semibold text-slate-800 block mb-1">Mục tiêu & Yêu cầu giai đoạn:</span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {detail.desc}
                </p>
              </div>

              {/* Checklist tiêu chuẩn nghiệm thu chặng */}
              {detail.checklist && detail.checklist.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-800 block mb-1.5">
                    Tiêu chuẩn kiểm tra hoàn thành chặng:
                  </span>
                  <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200">
                    {detail.checklist.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-700">
                        <CheckCircle2
                          className={cn(
                            "w-3.5 h-3.5 mt-0.5 shrink-0",
                            isPast ? "text-emerald-600" : "text-slate-400"
                          )}
                        />
                        <span className={cn(isPast && "text-slate-800")}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dữ liệu / Hồ sơ thực tế trong dự án của giai đoạn này */}
              <div>
                <span className="font-semibold text-slate-800 block mb-1.5">
                  Hồ sơ & Dữ liệu thực tế của dự án:
                </span>
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tổng đầu việc WBS:</span>
                    <strong className="text-slate-900 font-mono">{tasks.length} đầu việc</strong>
                  </div>
                  {viewingStage === "production" && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Vật tư xuất kho cho dự án:</span>
                      <strong className="text-blue-600 font-mono">{materials.length} loại vật tư</strong>
                    </div>
                  )}
                  {viewingStage === "installation" && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Nhật ký hiện trường đã nộp:</span>
                      <strong className="text-indigo-600 font-mono">{fieldReports.length} báo cáo</strong>
                    </div>
                  )}
                  {viewingStage === "acceptance" && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Biên bản nghiệm thu khách hàng:</span>
                      <strong className="text-emerald-600 font-mono">{acceptances.length} biên bản</strong>
                    </div>
                  )}
                  {stagePhotos.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 block mb-1.5">Ảnh lưu vết giai đoạn:</span>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {stagePhotos.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setLightboxPhoto(p);
                            }}
                            className="w-20 h-14 rounded border border-slate-200 overflow-hidden shrink-0 cursor-pointer hover:border-blue-500"
                            title={p.desc}
                          >
                            <img src={p.url} alt={p.stage} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Nút điều hướng nhanh đến Tab liên quan */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleTabChange(detail.relevantTab);
                    setViewingStage(null);
                  }}
                  className="text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>
                    Chuyển đến Tab {
                      detail.relevantTab === "wbs" ? "Cây công việc (WBS)" :
                      detail.relevantTab === "production" ? "Bóc tách & Xuất kho" :
                      detail.relevantTab === "reports" ? "Nhật ký hiện trường" :
                      detail.relevantTab === "finance" ? "Thu chi & P&L" :
                      detail.relevantTab === "acceptance" ? "Hồ sơ nghiệm thu" : "Đội ngũ"
                    }
                  </span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setViewingStage(null)}
                    className="text-xs"
                  >
                    Đóng
                  </Button>
                  {can("project.update") && !isCurrent && (
                    <Button
                      type="button"
                      onClick={() => {
                        confirmUpdateStatus(viewingStage);
                        setViewingStage(null);
                      }}
                      className={cn(
                        "text-xs gap-1",
                        isPast
                          ? "bg-slate-800 hover:bg-slate-900 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      )}
                    >
                      <span>{isPast ? "Quay lại giai đoạn này" : "Chuyển tới giai đoạn này"}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* MODAL ĐỔI GIAI ĐOẠN DỰ ÁN (KÈM KIỂM SOÁT ĐIỀU KIỆN STAGE GATE RULES) */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => {
          setIsStageModalOpen(false);
          setStageGateConfirmed(false);
        }}
        title="Chuyển Giai Đoạn Dự Án (Stage Gate Control)"
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
          const isBlocked = warnings.length > 0 && !stageGateConfirmed;

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

      {/* MODAL THÊM VIỆC NHỎ (SUBTASK) */}
      <Modal
        isOpen={Boolean(createTaskParent)}
        onClose={() => setCreateTaskParent(null)}
        title="Thêm Việc Nhỏ Vào Đầu Việc Lớn"
      >
        {createTaskParent && (
          <form onSubmit={handleCreateSubTask} className="space-y-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Đầu việc lớn cha:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <strong className="text-slate-900 text-xs font-semibold">{createTaskParent.title}</strong>
                {createTaskParent.isField && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                    📍 Hiện trường
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span>
                  Phụ trách:{" "}
                  {createTaskParent.assignees.length > 0
                    ? createTaskParent.assignees.map((a) => a.name).join(", ")
                    : "Chưa giao ai"}
                </span>
              </div>
            </div>

            {user?.employeeId && createTaskParent.assignees?.some((a) => a.employeeId === user.employeeId) && (
              <div className="p-2 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Bạn đang phụ trách đầu việc này và có quyền tự tạo việc nhỏ cho mình hoặc đồng đội.</span>
              </div>
            )}

            <div>
              <label className="block font-semibold">Tên việc nhỏ *</label>
              <Input
                required
                placeholder="VD: Cắt phay alu theo bản vẽ, Khoan lỗ bắt vít, Hàn khung..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            {/* Checkbox Phân loại Hiện trường */}
            <label className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={newTaskIsField}
                onChange={(e) => setNewTaskIsField(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <div className="text-xs">
                <strong className="text-amber-900 font-semibold block">📍 Việc Thi Công / Khảo Sát Hiện Trường</strong>
                <span className="text-[11px] text-amber-700 leading-snug block mt-0.5">
                  Đánh dấu nếu công việc thực hiện tại công trình. Việc hiện trường có hẹn thời gian sẽ xuất hiện trực tiếp trên màn hình <strong>Hiện Trường</strong> để thợ GPS Check-in và báo cáo.
                </span>
              </div>
            </label>

            <div>
              <label className="block font-semibold">Giao người thực hiện</label>
              <select
                value={newTaskEmployeeId}
                onChange={(e) => setNewTaskEmployeeId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
              >
                <option value="">-- Chưa giao ai --</option>
                {createTaskParent.assignees.length > 0 && (
                  <optgroup label="🌟 Đội ngũ phụ trách đầu việc này">
                    {createTaskParent.assignees.map((a) => (
                      <option key={a.id} value={a.employeeId}>
                        {a.name} (Phụ trách chính)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Toàn bộ nhân sự khác">
                  {employees
                    .filter((emp) => !createTaskParent.assignees.some((a) => a.employeeId === emp.id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.code || "NV"})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={newTaskStartAt}
                  onChange={(e) => setNewTaskStartAt(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold">
                  Hạn hoàn thành {newTaskIsField && <span className="text-amber-600">* (Bắt buộc)</span>}
                </label>
                <Input
                  type="date"
                  required={newTaskIsField}
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
                {savingNewTask ? "Đang lưu..." : "Tạo việc nhỏ"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL THÊM ĐẦU VIỆC LỚN (HẠNG MỤC CHÍNH) */}
      <Modal
        isOpen={isCreateStageOpen}
        onClose={() => setIsCreateStageOpen(false)}
        title="Thêm Đầu Việc Lớn (Hạng Mục Chính)"
      >
        <form onSubmit={handleCreateTopLevelStage} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold">Tên đầu việc lớn *</label>
            <Input
              required
              placeholder="VD: Khảo sát hiện trạng, Gia công khung thép, Lắp đặt biển hiệu..."
              value={newStageTitle}
              onChange={(e) => setNewStageTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {/* Checkbox Phân loại Hiện trường */}
          <label className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={newStageIsField}
              onChange={(e) => setNewStageIsField(e.target.checked)}
              className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 mt-0.5"
            />
            <div className="text-xs">
              <strong className="text-amber-900 font-semibold block">📍 Hạng Mục Hiện Trường (Công Trình / Lắp Đặt)</strong>
              <span className="text-[11px] text-amber-700 leading-snug block mt-0.5">
                Đánh dấu nếu toàn bộ giai đoạn này diễn ra ngoài hiện trường (các việc con bên trong sẽ tự động kế thừa). Bắt buộc chọn Hạn hoàn thành.
              </span>
            </div>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold">Trọng số WBS (%)</label>
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
              <label className="block font-semibold">Ngày bắt đầu</label>
              <Input
                type="date"
                value={newStageStartAt}
                onChange={(e) => setNewStageStartAt(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold">
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

            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
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
            <p className="text-[11px] text-slate-500 mt-1">
              💡 Những người được giao đầu việc này sẽ có quyền tự tạo và quản lý các việc con bên dưới.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreateStageOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button type="submit" disabled={savingStage} className="bg-blue-600 text-white text-xs">
              {savingStage ? "Đang tạo..." : "Tạo đầu việc lớn"}
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

            {/* Checkbox Phân loại Hiện trường */}
            <label className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={editTaskIsField}
                onChange={(e) => setEditTaskIsField(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <div className="text-xs">
                <strong className="text-amber-900 font-semibold block">📍 Việc Hiện Trường (Thi công / Lắp dựng / Khảo sát)</strong>
                <span className="text-[11px] text-amber-700 leading-snug block mt-0.5">
                  Việc hiện trường có thời hạn sẽ hiển thị đồng bộ trên ứng dụng Hiện Trường mobile cho thợ tác nghiệp và check-in GPS.
                </span>
              </div>
            </label>

            <div className="grid grid-cols-3 gap-2">
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
                <label className="block font-semibold">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={editTaskStartAt}
                  onChange={(e) => setEditTaskStartAt(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold">
                  Hạn hoàn thành {editTaskIsField && <span className="text-amber-600">*</span>}
                </label>
                <Input
                  type="date"
                  required={editTaskIsField}
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

              <div className="grid grid-cols-2 gap-8 pt-6 text-center border-t border-slate-100">
                <div>
                  <div className="font-bold text-slate-900 mb-1">ĐẠI DIỆN THI CÔNG</div>
                  <div className="h-16 flex items-center justify-center italic text-blue-600 font-medium">
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
                        className="h-6 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <PenTool className="w-3 h-3 mr-1" />
                        Ký cảm ứng ngay
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
            if (activeTab === "reports") fetchReports();
          }}
        />
      )}

      {/* MODAL TẢI LÊN MARKET THIẾT KẾ MỚI */}
      <Modal
        isOpen={isUploadProofOpen}
        onClose={() => setIsUploadProofOpen(false)}
        title="Tải Lên Phiên Bản Market Thiết Kế Mới"
      >
        <form onSubmit={handleCreateProof} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-800">Tên / Tiêu đề Market phối cảnh *</label>
            <Input
              required
              placeholder="VD: Phối cảnh Market 3D ban ngày & đêm (Highlands Coffee)"
              value={newProofTitle}
              onChange={(e) => setNewProofTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800">Đường dẫn ảnh Market (URL phối cảnh 2D/3D)</label>
            <Input
              placeholder="VD: https://... hoặc để trống để sử dụng hình ảnh mẫu phối cảnh"
              value={newProofFileUrl}
              onChange={(e) => setNewProofFileUrl(e.target.value)}
              className="mt-1 text-xs"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Hỗ trợ ảnh render 3ds Max, Photoshop hoặc SketchUp</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 block text-xs">Quy cách kỹ thuật & Vật tư phối cảnh:</span>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block">Vật liệu nền biển:</label>
                <Input
                  value={newProofBg}
                  onChange={(e) => setNewProofBg(e.target.value)}
                  className="mt-0.5 text-xs h-7"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Quy cách bộ chữ & logo:</label>
                <Input
                  value={newProofLetter}
                  onChange={(e) => setNewProofLetter(e.target.value)}
                  className="mt-0.5 text-xs h-7"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block">Quy cách đèn LED:</label>
                <Input
                  value={newProofLed}
                  onChange={(e) => setNewProofLed(e.target.value)}
                  className="mt-0.5 text-xs h-7"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block">Bộ nguồn ngoài trời:</label>
                <Input
                  value={newProofPower}
                  onChange={(e) => setNewProofPower(e.target.value)}
                  className="mt-0.5 text-xs h-7"
                />
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

      {/* MODAL LẬP BIÊN BẢN KCS XUẤT XƯỞNG & AGING TEST */}
      <Modal
        isOpen={isCreateQcOpen}
        onClose={() => setIsCreateQcOpen(false)}
        title="Lập Biên Bản KCS Xuất Xưởng & Aging Test Đèn LED"
      >
        <form onSubmit={handleCreateQcRecord} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800">Thời gian chạy thử sáng đèn liên tục (Giờ) *</label>
              <Input
                type="number"
                step="0.5"
                min="1"
                max="24"
                required
                value={newQcAgingHours}
                onChange={(e) => setNewQcAgingHours(parseFloat(e.target.value) || 4.0)}
                className="mt-1 text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Tiêu chuẩn xuất xưởng tối thiểu: 4.0 giờ</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-800">Kỹ thuật viên KCS kiểm thử</label>
              <select
                value={newQcInspectorId}
                onChange={(e) => setNewQcInspectorId(e.target.value)}
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
          </div>

          {/* Checklist 5 tiêu chuẩn xuất xưởng */}
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2">
            <span className="font-bold block text-xs">Cam kết tiêu chuẩn chất lượng KCS:</span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Kiểm tra sụt áp nguồn 12V: Sụt áp &lt; 0.5V, nhiệt độ nguồn &lt; 65°C sau {newQcAgingHours}h tải.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Keo chống nước & gioăng cao su: Đạt tiêu chuẩn kháng nước ngoài trời IP65/IP67.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mối hàn khung sắt mạ kẽm: Hàn ngấu chắc, vệ sinh xỉ hàn và quét sơn chống rỉ 2 lớp.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Độ đồng đều ánh sáng LED: Ánh sáng tỏa đều qua mica, không có đốm chết hoặc lệch màu.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Checklist phụ kiện bàn giao: Bu-lông neo dầm, guzong, dây nguồn và tem kiểm định xuất xưởng.</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800">Ghi chú khắc phục / Lưu ý khi chuyển giao (Tùy chọn)</label>
            <textarea
              rows={2}
              value={newQcDefectNotes}
              onChange={(e) => setNewQcDefectNotes(e.target.value)}
              placeholder="VD: Đã dán keo silicon cẩn thận tại các mối ghim, phụ kiện bu-lông đóng gói riêng kèm túi..."
              className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
            />
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
    </div>
  );
}
