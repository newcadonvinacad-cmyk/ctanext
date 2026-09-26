"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
  HardHat,
  Wrench,
  Truck,
  FileCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  FileText,
  DollarSign,
  Camera,
  Image as ImageIcon,
  Check,
  Sparkles,
} from "lucide-react";
import {
  ProjectDto,
  WbsTaskDto,
  AcceptanceDto,
  ProjectStatus,
  TaskStatus,
} from "@/services/project.service";

function ProjectDetail360Content() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = React.useState<ProjectDto | null>(null);
  const [tasks, setTasks] = React.useState<WbsTaskDto[]>([]);
  const [acceptances, setAcceptances] = React.useState<AcceptanceDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<
    "wbs" | "reports" | "production" | "finance" | "acceptance"
  >("wbs");

  React.useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["wbs", "reports", "production", "finance", "acceptance"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const handleTabChange = (t: "wbs" | "reports" | "production" | "finance" | "acceptance") => {
    setActiveTab(t);
    router.replace(`/du-an/${projectId}?tab=${t}`, { scroll: false });
  };

  // State mở rộng/thu gọn cây WBS
  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({});

  // State Modal tạo nghiệm thu
  const [isAcceptanceOpen, setIsAcceptanceOpen] = React.useState(false);
  const [signerName, setSignerName] = React.useState("");
  const [creatingAcceptance, setCreatingAcceptance] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, tRes, aRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/acceptances`),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setProject(pData.project);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData.tasks || []);
        // Mặc định mở rộng các task cha
        const initialExpanded: Record<string, boolean> = {};
        tData.tasks?.forEach((t: WbsTaskDto) => {
          initialExpanded[t.id] = true;
        });
        setExpandedTasks(initialExpanded);
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
  }, [fetchData]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleUpdateTaskProgress = async (
    taskId: string,
    percent: number,
    status?: TaskStatus
  ) => {
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent: percent, status }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật tiến độ");
      toast.success(`Đã cập nhật tiến độ: ${percent}%`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật tiến độ");
    }
  };

  const handleUpdateProjectStatus = async (newStatus: ProjectStatus) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
      toast.success("Đã chuyển mốc trạng thái dự án");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật trạng thái");
    }
  };

  const handleCreateAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName) {
      toast.error("Vui lòng nhập tên người đại diện khách hàng ký");
      return;
    }
    try {
      setCreatingAcceptance(true);
      const res = await fetch(`/api/projects/${projectId}/acceptances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerSignerName: signerName,
          status: "approved",
        }),
      });
      if (!res.ok) throw new Error("Không thể lưu biên bản nghiệm thu");
      toast.success("Đã lập biên bản nghiệm thu thành công!");
      setIsAcceptanceOpen(false);
      setSignerName("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo biên bản");
    } finally {
      setCreatingAcceptance(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-neutral-500">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          <span>Đang tải thông tin điều độ dự án 360°...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-neutral-800">Không tìm thấy dự án</h2>
        <Link href="/du-an">
          <Button className="mt-4" variant="outline">
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER CỐ ĐỊNH CHI TIẾT DỰ ÁN 360° */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                href="/du-an"
                className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-primary-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Danh sách dự án
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                {project.code}
              </span>
              <span className="rounded bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-800 dark:bg-primary-950 dark:text-primary-300">
                M12 - 360°
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {project.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-4 w-4 text-neutral-400" />
                <span>{project.customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span>{project.address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <span>Hạn: {project.dueDate || "Chưa đặt"}</span>
              </div>
            </div>
          </div>

          {/* CỤC TIẾN ĐỘ & TRẠNG THÁI */}
          <div className="flex flex-wrap items-center gap-4 lg:flex-col lg:items-end">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-medium text-neutral-500">Tiến độ tổng thể</div>
                <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
                  {project.progressPercent}%
                </div>
              </div>
              <div className="h-12 w-12 rounded-full border-4 border-neutral-100 dark:border-neutral-800 flex items-center justify-center relative">
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent"
                  style={{ transform: `rotate(${(project.progressPercent / 100) * 360}deg)` }}
                />
                <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                  WBS
                </span>
              </div>
            </div>

            {/* Quick change status dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Giai đoạn:</span>
              <select
                value={project.status}
                onChange={(e) => handleUpdateProjectStatus(e.target.value as ProjectStatus)}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold shadow-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="survey">1. Khảo sát</option>
                <option value="production">2. Gia công xưởng</option>
                <option value="transport">3. Vận chuyển</option>
                <option value="installation">4. Lắp dựng hiện trường</option>
                <option value="acceptance">5. Chờ nghiệm thu</option>
                <option value="completed">6. Hoàn tất công trình</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5 SUB-TABS CHUYÊN SÂU */}
        <div className="mt-6 flex border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("wbs")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "wbs"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <HardHat className="h-4 w-4" />
            1. Cây Công Việc WBS ({tasks.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("reports")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "reports"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <FileText className="h-4 w-4" />
            2. Nhật Ký Báo Cáo Ngày
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("production")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "production"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <Wrench className="h-4 w-4" />
            3. Sản Xuất & Vật Tư Cấp
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("finance")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "finance"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            4. Thu Chi & Lãi Lỗ Dự Án
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("acceptance")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "acceptance"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"
            }`}
          >
            <FileCheck className="h-4 w-4" />
            5. Bằng Chứng & Ký Nghiệm Thu ({acceptances.length})
          </button>
        </div>
      </div>

      {/* NỘI DUNG TỪNG SUB-TAB */}

      {/* ================= TAB 1: CÂY CÔNG VIỆC WBS ================= */}
      {activeTab === "wbs" && (
        <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">
                Phân Rã Cây Công Việc WBS (Work Breakdown Structure)
              </CardTitle>
              <CardDescription className="text-xs">
                Hỗ trợ báo cáo tiến độ độc lập tại Task Cha hoặc tự động tính theo tỷ trọng các Task Con.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3" />
                Làm mới
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Chưa có công việc nào trong dự án này
                </div>
              ) : (
                tasks.map((parent) => {
                  const isExpanded = expandedTasks[parent.id] ?? true;
                  const hasChildren = parent.children && parent.children.length > 0;

                  return (
                    <div key={parent.id} className="bg-white dark:bg-neutral-900">
                      {/* DÒNG TASK CHA */}
                      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/70 hover:bg-neutral-100/70 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/70 transition-colors">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(parent.id)}
                              className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6" />
                          )}

                          <span className="font-mono text-xs font-bold text-neutral-500">
                            {parent.code}
                          </span>

                          <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm truncate">
                            {parent.title}
                          </span>

                          {parent.progressMode === "children" && (
                            <span className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                              Auto theo con
                            </span>
                          )}
                        </div>

                        {/* Thanh tiến độ & Thao tác Task Cha */}
                        <div className="flex items-center gap-4">
                          <div className="w-28 flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div
                                className={`h-full rounded-full ${
                                  parent.progressPercent === 100
                                    ? "bg-emerald-500"
                                    : "bg-primary-600"
                                }`}
                                style={{ width: `${parent.progressPercent}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                              {parent.progressPercent}%
                            </span>
                          </div>

                          <Badge
                            variant={
                              parent.status === "done"
                                ? "success"
                                : parent.status === "doing"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {parent.status === "done"
                              ? "Hoàn tất"
                              : parent.status === "doing"
                              ? "Đang làm"
                              : "Chờ làm"}
                          </Badge>
                        </div>
                      </div>

                      {/* DANH SÁCH TASK CON (SUB-TASKS) */}
                      {isExpanded && hasChildren && (
                        <div className="divide-y divide-neutral-100 border-l-2 border-primary-500 ml-6 pl-2 dark:divide-neutral-800">
                          {parent.children!.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono text-[11px] text-neutral-400">
                                  {sub.code}
                                </span>
                                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                  {sub.title}
                                </span>
                                {sub.assignees.length > 0 && (
                                  <div className="flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded">
                                    <User className="h-3 w-3" />
                                    <span>{sub.assignees[0].name}</span>
                                  </div>
                                )}
                              </div>

                              {/* Điều chỉnh tiến độ nhanh của thợ */}
                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <div className="flex items-center gap-1">
                                  {[0, 25, 50, 75, 100].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateTaskProgress(
                                          sub.id,
                                          pct,
                                          pct === 100 ? "done" : pct > 0 ? "doing" : "todo"
                                        )
                                      }
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-all ${
                                        sub.progressPercent === pct
                                          ? "bg-primary-600 text-white shadow-sm"
                                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                                      }`}
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>

                                <Badge
                                  variant={
                                    sub.status === "done"
                                      ? "success"
                                      : sub.status === "doing"
                                      ? "warning"
                                      : "neutral"
                                  }
                                >
                                  {sub.status === "done" ? "Xong" : sub.status === "doing" ? "Đang làm" : "Chờ"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= TAB 2: NHẬT KÝ BÁO CÁO NGÀY ================= */}
      {activeTab === "reports" && (
        <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Nhật Ký Thi Công & Báo Cáo Hiện Trường Hàng Ngày
            </CardTitle>
            <CardDescription className="text-xs">
              Tổng hợp báo cáo tiến độ thợ nộp qua giao diện di động hoặc giọng nói AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                    VT
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Vũ Đình Trọng (Đội Trưởng Lắp Đặt)
                    </div>
                    <div className="text-[11px] text-neutral-400">Hôm nay, lúc 14:30 • Chấm công GPS hợp lệ (15m)</div>
                  </div>
                </div>
                <Badge variant="success">Đã duyệt</Badge>
              </div>

              <div className="mt-3 text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-md">
                <p>
                  <strong>Nội dung:</strong> Đã cẩu đưa biển hộp đèn lên vị trí tầng 2 mặt tiền Vincom Bà Triệu. Bắt xong 8 bu-lông nở sắt M12 neo dầm bê tông chắc chắn, chịu lực gió tốt.
                </p>
                <p>
                  <strong>Vật tư tiêu hao:</strong> 8 bu-lông nở sắt M12, 1 cuộn băng dính điện 3M, 1 tuýp keo dán silicone A500.
                </p>
                <p>
                  <strong>Kế hoạch ngày mai:</strong> Đi dây nguồn 12V 400W và đấu tủ điện Timer ngắt tự động, sau đó test sáng ban đêm.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= TAB 3: SẢN XUẤT & VẬT TƯ ================= */}
      {activeTab === "production" && (
        <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">
                  Lệnh Sản Xuất & Bóc Tách Vật Tư Cấp Công Trình
                </CardTitle>
                <Badge variant="warning">LSX-{project?.code || "DA-2026-001"}</Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Theo dõi vật tư định mức kế hoạch vs thực xuất kho (M09), giám sát hao hụt & tiến độ gia công
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/kho/nhap-xuat/tao-moi?loai=xuat&du_an=${project?.id || ""}&ma_du_an=${project?.code || ""}&ten_du_an=${encodeURIComponent(project?.name || "")}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo Phiếu Xuất Kho Cấp Cho Dự Án (M09)
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 uppercase text-neutral-500 font-semibold dark:border-neutral-800 dark:bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2.5">Mã SKU</th>
                    <th className="px-3 py-2.5">Tên Vật Tư</th>
                    <th className="px-3 py-2.5">Đơn Vị</th>
                    <th className="px-3 py-2.5 text-right">Định Mức Kế Hoạch</th>
                    <th className="px-3 py-2.5 text-right">Thực Xuất Kho (M09)</th>
                    <th className="px-3 py-2.5 text-right">Chênh Lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-neutral-500">VT-SAT-30</td>
                    <td className="px-3 py-2.5 font-medium">Sắt hộp mạ kẽm Hòa Phát 30x30 dày 1.4mm</td>
                    <td className="px-3 py-2.5">Cây (6m)</td>
                    <td className="px-3 py-2.5 text-right font-medium">10</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary-600">10</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold">0</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-neutral-500">VT-BAT-3M</td>
                    <td className="px-3 py-2.5 font-medium">Bạt không gân 3M Korea cao cấp in UV</td>
                    <td className="px-3 py-2.5">m²</td>
                    <td className="px-3 py-2.5 text-right font-medium">18</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary-600">18</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold">0</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-neutral-500">VT-LED-MOD3</td>
                    <td className="px-3 py-2.5 font-medium">LED Module 3 bóng mắt lồi NC Hàn Quốc 1.2W</td>
                    <td className="px-3 py-2.5">Bóng</td>
                    <td className="px-3 py-2.5 text-right font-medium">400</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary-600">420</td>
                    <td className="px-3 py-2.5 text-right text-amber-600 font-semibold">+20</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-neutral-500">VT-NGUON-12V</td>
                    <td className="px-3 py-2.5 font-medium">Nguồn tổng ngoài trời chống nước 12V 400W</td>
                    <td className="px-3 py-2.5">Cái</td>
                    <td className="px-3 py-2.5 text-right font-medium">2</td>
                    <td className="px-3 py-2.5 text-right font-bold text-primary-600">2</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= TAB 4: THU CHI & LÃI LỖ DỰ ÁN ================= */}
      {activeTab === "finance" && (
        <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Báo Cáo Thu Chi & Tỷ Suất Lãi Gộp Công Trình (P&L)
            </CardTitle>
            <CardDescription className="text-xs">
              Đối soát giữa Giá trị Hợp đồng vs Tổng chi phí vật tư, tiền công và xe cẩu phát sinh.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/50">
                <span className="text-xs text-neutral-500">Doanh thu bán hàng</span>
                <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  48.000.000 đ
                </div>
                <span className="text-[11px] text-neutral-400">Theo Đơn bán SO-001</span>
              </div>

              <div className="rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/50">
                <span className="text-xs text-neutral-500">Chi phí vật tư thực tế</span>
                <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  23.400.000 đ
                </div>
                <span className="text-[11px] text-neutral-400">Xuất kho vật tư chính</span>
              </div>

              <div className="rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/50">
                <span className="text-xs text-neutral-500">Tiền công thợ & Xe cẩu</span>
                <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  6.200.000 đ
                </div>
                <span className="text-[11px] text-neutral-400">Thợ lắp đặt + Xe tải cẩu</span>
              </div>

              <div className="rounded-lg bg-emerald-50 p-3.5 dark:bg-emerald-950/30">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Lãi gộp ước tính
                </span>
                <div className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-400">
                  18.400.000 đ
                </div>
                <span className="text-[11px] font-bold text-emerald-600">
                  Tỷ suất GM: 38.3%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= TAB 5: BẰNG CHỨNG & NGHIỆM THU ================= */}
      {activeTab === "acceptance" && (
        <div className="space-y-6">
          {/* Album ảnh 4 giai đoạn */}
          <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Album Ảnh Hiện Trường 4 Giai Đoạn Chuẩn Ngành
              </CardTitle>
              <CardDescription className="text-xs">
                Lưu trữ bằng chứng phục vụ hồ sơ thanh quyết toán và bàn giao nghiệm thu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="text-center p-2">
                      <Camera className="mx-auto h-6 w-6 text-neutral-400" />
                      <span className="mt-1 block text-xs font-semibold">1. Ảnh Khảo Sát</span>
                      <span className="text-[10px] text-neutral-400">Mặt bằng trước thi công</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="text-center p-2">
                      <Wrench className="mx-auto h-6 w-6 text-neutral-400" />
                      <span className="mt-1 block text-xs font-semibold">2. Ảnh Khung Sắt</span>
                      <span className="text-[10px] text-neutral-400">Kết cấu bên trong & LED</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="text-center p-2">
                      <ImageIcon className="mx-auto h-6 w-6 text-neutral-400" />
                      <span className="mt-1 block text-xs font-semibold">3. Ảnh Ban Ngày</span>
                      <span className="text-[10px] text-neutral-400">Biển hoàn thiện tổng thể</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="text-center p-2">
                      <Sparkles className="mx-auto h-6 w-6 text-neutral-400" />
                      <span className="mt-1 block text-xs font-semibold">4. Ảnh Sáng Đèn Đêm</span>
                      <span className="text-[10px] text-neutral-400">Độ sáng & màu sắc LED</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danh sách Biên bản nghiệm thu */}
          <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">
                  Biên Bản Nghiệm Thu & Ký Số Khách Hàng
                </CardTitle>
                <CardDescription className="text-xs">
                  Biên bản hoàn thành công trình có xác nhận chữ ký của đại diện chủ đầu tư.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsAcceptanceOpen(true)}
                size="sm"
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Lập Biên Bản Bàn Giao
              </Button>
            </CardHeader>

            <CardContent>
              {acceptances.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Chưa có biên bản nghiệm thu nào
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {acceptances.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 px-2 rounded-md transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                            {a.code}
                          </span>
                          <Badge variant={a.status === "approved" ? "success" : "neutral"}>
                            {a.status === "approved" ? "Đã Ký Bàn Giao" : "Bản Nháp"}
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-300">
                          Người ký đại diện: <strong>{a.customerSignerName || "Chưa ký"}</strong>
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Ngày tạo: {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <FileText className="h-3.5 w-3.5 text-neutral-500" />
                          Xem Biên Bản In
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL LẬP BIÊN BẢN NGHIỆM THU */}
      <Modal
        isOpen={isAcceptanceOpen}
        onClose={() => setIsAcceptanceOpen(false)}
        title="Lập Biên Bản Nghiệm Thu & Bàn Giao Công Trình"
      >
        <form onSubmit={handleCreateAcceptance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Công Trình Nghiệm Thu
            </label>
            <div className="mt-1 font-bold text-sm text-neutral-900 dark:text-neutral-100">
              {project.name}
            </div>
            <div className="text-xs text-neutral-500">{project.address}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Họ Tên Người Đại Diện Khách Hàng Ký Bàn Giao *
            </label>
            <Input
              required
              placeholder="VD: Trần Anh Quân (Trưởng phòng Giám sát Thi công)"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800">
            <strong>Nội dung nghiệm thu:</strong> Toàn bộ biển hiệu đã được thi công đúng kích thước, kết cấu chịu lực an toàn, hệ thống đèn chiếu sáng ban đêm hoạt động ổn định và mặt bằng thi công đã được dọn dẹp sạch sẽ.
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAcceptanceOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={creatingAcceptance}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {creatingAcceptance ? "Đang lưu..." : "Xác Nhận & Ký Nghiệm Thu"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ProjectDetail360Page() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải thông tin dự án 360...</div>}>
      <ProjectDetail360Content />
    </React.Suspense>
  );
}
