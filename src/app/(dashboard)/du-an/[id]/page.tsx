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
  toast,
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
import { CreateStockDocModal } from "@/components/inventory/CreateStockDocModal";

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


const STAGE_DETAILS: Record<
  string,
  {
    step: number;
    title: string;
    desc: string;
    checklist: string[];
    relevantTab: "dashboard" | "wbs" | "production" | "reports" | "finance" | "acceptance" | "members";
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
    relevantTab: "acceptance",
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
    relevantTab: "wbs",
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
    relevantTab: "finance",
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

  // Tabs điều hướng (Thêm Tab 'members')
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "wbs" | "reports" | "production" | "finance" | "acceptance" | "members">("dashboard");

  // Lọc WBS
  const [wbsSearch, setWbsSearch] = React.useState("");
  const [wbsEmployeeFilter, setWbsEmployeeFilter] = React.useState<string>("all");
  const [wbsStatusFilter, setWbsStatusFilter] = React.useState<string>("all");
  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({});
  const [isProjectInfoExpanded, setIsProjectInfoExpanded] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [newStageAssigneeIds, setNewStageAssigneeIds] = React.useState<string[]>([]);
  const [newStageAssigneeSearch, setNewStageAssigneeSearch] = React.useState("");
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
  const [viewingStage, setViewingStage] = React.useState<ProjectStatus | null>(null);
  const [selectedStageToChange, setSelectedStageToChange] = React.useState<ProjectStatus | null>(null);
  const [updatingStage, setUpdatingStage] = React.useState(false);

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
  const [newTaskEmployeeId, setNewTaskEmployeeId] = React.useState("");
  const [savingNewTask, setSavingNewTask] = React.useState(false);

  // Modal Xác nhận Hoàn thành Task (Nghiệm thu hoàn thành)
  const [completingTask, setCompletingTask] = React.useState<WbsTaskDto | null>(null);
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
    if (tabParam && ["dashboard", "wbs", "reports", "production", "finance", "acceptance", "members"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const handleTabChange = (t: "dashboard" | "wbs" | "reports" | "production" | "finance" | "acceptance" | "members") => {
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
    if (activeTab === "dashboard") {
      fetchReports();
      fetchMaterials();
      fetchFinance();
      fetchMembers();
    }
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

  const openCompleteModal = (task: WbsTaskDto) => {
    setCompletingTask(task);
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
      // 1. Cập nhật tiến độ task = 100% và status = 'done'
      const res = await fetch(`/api/projects/tasks/${completingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent: 100, status: "done" }),
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
              workSummary: `[Hoàn thành công việc: ${completingTask.title}]\n${completionNotes.trim()}`,
              taskId: completingTask.id,
              photos: completionPhotoUrl.trim() ? [{ url: completionPhotoUrl.trim(), desc: "Ảnh nghiệm thu hoàn thành" }] : [],
            }),
          });
        } catch (repErr) {
          console.warn("Không thể tự động gửi báo cáo hiện trường:", repErr);
        }
      }

      toast.success(`Đã xác nhận hoàn thành công việc: ${completingTask.title}!`);
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
          dueAt: newStageDueAt || null,
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
      if (!res.ok) throw new Error(data.error || "Lỗi tạo việc nhỏ");
      toast.success("Đã thêm việc nhỏ mới!");
      setCreateTaskParent(null);
      setNewTaskTitle("");
      setNewTaskEmployeeId("");
      setNewTaskDueAt("");
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
                          {parent.status === "done" ? "Hoàn thành" : parent.status === "doing" ? "Đang làm" : "Chờ làm"}
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
                                      onClick={() => openAssignModal(sub)}
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
                                      onClick={() => openAssignModal(sub)}
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
                                    sub.status === "done" ? "success" : sub.status === "doing" ? "warning" : "neutral"
                                  }
                                  className="text-[10px]"
                                >
                                  {sub.status === "done" ? "Hoàn thành" : sub.status === "doing" ? "Đang làm" : "Chờ làm"}
                                </Badge>

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
{/* MODAL XEM LẠI LỊCH SỬ & CHI TIẾT GIAI ĐOẠN */}
      <Modal
        isOpen={Boolean(viewingStage)}
        onClose={() => setViewingStage(null)}
        title={viewingStage ? `Giai Đoạn: ${STAGE_MAP[viewingStage]?.label || viewingStage}` : ""}
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
      </Modal>

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
              <strong className="text-slate-900 text-xs font-semibold">{createTaskParent.title}</strong>
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
                placeholder="VD: Cắt phay alu theo bản vẽ, Khoan lỗ bắt vít..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
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

          <div className="grid grid-cols-2 gap-2">
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
              <label className="block font-semibold">Hạn hoàn thành</label>
              <Input
                type="date"
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

      {/* MODAL XÁC NHẬN HOÀN THÀNH CÔNG VIỆC */}
      <Modal
        isOpen={Boolean(completingTask)}
        onClose={() => setCompletingTask(null)}
        title="Xác Nhận Hoàn Thành Công Việc"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {savingCompletion ? "Đang lưu..." : isUploadingPhoto ? "Đang tải ảnh..." : "Xác nhận hoàn thành (100%)"}
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
    </div>
  );
}
