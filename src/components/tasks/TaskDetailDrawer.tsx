"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Drawer,
  Button,
  Badge,
  Input,
  toast,
} from "@/components/ui";
import {
  TaskItemDto,
  TaskStatus,
  TaskChecklistItem,
  TaskSafetyItem,
  TaskPhotoEvidence,
  TaskMaterialQuota,
} from "@/services/project.service";
import {
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  ExternalLink,
  Navigation,
  Sparkles,
  UserPlus,
  Plus,
  Trash2,
  Camera,
  ShieldCheck,
  Package,
  DollarSign,
  FileText,
  Calendar,
  Layers,
  Check,
  X,
  Upload,
  Info,
  ChevronRight,
  HardHat,
  Cpu,
  Zap,
  Printer,
  Hammer,
} from "lucide-react";

// ==========================================
// ĐỊNH NGHĨA CÁC TỔ ĐỘI CHUYÊN NGÀNH SIGNAGE
// ==========================================
export const SIGNAGE_CATEGORIES: {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgBadge: string;
  defaultChecks: string[];
}[] = [
  {
    id: "welding",
    name: "Hàn kết cấu & Khung sắt",
    icon: Wrench,
    color: "text-blue-700",
    bgBadge: "bg-blue-50 text-blue-700 border-blue-200",
    defaultChecks: [
      "Khung sắt hàn đúng kích thước bản vẽ (dài x cao x sâu)",
      "Mối hàn ngấu đều, gõ sạch xỉ hàn",
      "Sơn chống gỉ 2 lớp (lớp lót + lớp phủ)",
      "Gia cố tai treo, bản mã chịu lực neo dầm",
    ],
  },
  {
    id: "cnc",
    name: "Cắt CNC & Phay Alu",
    icon: Cpu,
    color: "text-indigo-700",
    bgBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    defaultChecks: [
      "Cắt phay rãnh alu góc 90° không bị nứt mặt nhôm",
      "Bắn vít hoặc dán keo Titebond/Xbond phẳng mặt",
      "Xử lý giáp mí thẳng hàng, dán băng keo bắn silicon",
    ],
  },
  {
    id: "letters",
    name: "Uốn chữ nổi Inox / Mica",
    icon: Sparkles,
    color: "text-purple-700",
    bgBadge: "bg-purple-50 text-purple-700 border-purple-200",
    defaultChecks: [
      "Chân chữ uốn vuông vức, mối hàn laser chắc chắn",
      "Mặt mica sắc nét, không trầy xước",
      "Độ sâu hông chữ đạt chuẩn tán quang LED",
    ],
  },
  {
    id: "led",
    name: "Đi LED & Đấu nguồn điện",
    icon: Zap,
    color: "text-amber-700",
    bgBadge: "bg-amber-50 text-amber-700 border-amber-200",
    defaultChecks: [
      "Module LED dán đều mật độ, không vệt sáng/tối",
      "Đầu nối bọc ống co nhiệt chống chập cháy",
      "Nguồn tổng 12V ngoài trời đặt nơi thoát nhiệt",
      "Đã cắm test sáng liên tục ít nhất 2 giờ tại xưởng",
    ],
  },
  {
    id: "printing",
    name: "In bạt Hiflex / Decal / UV",
    icon: Printer,
    color: "text-teal-700",
    bgBadge: "bg-teal-50 text-teal-700 border-teal-200",
    defaultChecks: [
      "Màu in chuẩn file thiết kế, không lem nhòe",
      "Căng bạt phẳng đều các góc, không nhăn nhúm",
      "Cán màng bảo vệ bề mặt chống bay màu",
    ],
  },
  {
    id: "installation",
    name: "Lắp dựng & Hiện trường",
    icon: HardHat,
    color: "text-rose-700",
    bgBadge: "bg-rose-50 text-rose-700 border-rose-200",
    defaultChecks: [
      "Đã kiểm tra an toàn lao động và dây đai an toàn",
      "Bu-lông nở sắt neo dầm tường siết chặt đủ lực",
      "Đấu Aptomat chống giật và Timer hẹn giờ",
      "Chụp ảnh nghiệm thu ban ngày và ảnh bật đèn đêm",
    ],
  },
  {
    id: "general",
    name: "Gia công chung",
    icon: Layers,
    color: "text-slate-700",
    bgBadge: "bg-slate-100 text-slate-700 border-slate-200",
    defaultChecks: [
      "Vệ sinh sạch sẽ bề mặt sản phẩm trước khi giao",
      "Bọc màng PE chống xước bề mặt khi vận chuyển",
    ],
  },
];

const DEFAULT_SAFETY_ITEMS = [
  "Trang bị đầy đủ mũ bảo hộ & giày mũi thép tại công trình",
  "Đeo dây đai an toàn toàn thân 2 móc khóa khi thi công trên cao",
  "Khóa chốt an toàn giàn giáo / Xe nâng người trước khi trèo",
  "Ngắt nguồn điện Aptomat tổng trước khi đấu nối dây pha",
  "Đặt nón chóp/dây cảnh báo người đi đường phía dưới",
];

interface TaskDetailDrawerProps {
  task: TaskItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onOpenAiReport?: (task: TaskItemDto) => void;
  onOpenAssignModal?: (task: TaskItemDto) => void;
}

export function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  onUpdate,
  onOpenAiReport,
  onOpenAssignModal,
}: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<"checklist" | "evidence" | "materials" | "labor" | "notes">("checklist");
  const [isSaving, setIsSaving] = React.useState(false);

  // Local state edit fields
  const [checklist, setChecklist] = React.useState<TaskChecklistItem[]>([]);
  const [safetyChecklist, setSafetyChecklist] = React.useState<TaskSafetyItem[]>([]);
  const [photoEvidence, setPhotoEvidence] = React.useState<TaskPhotoEvidence[]>([]);
  const [materialsQuota, setMaterialsQuota] = React.useState<TaskMaterialQuota[]>([]);
  const [category, setCategory] = React.useState<string>("general");
  const [pieceRateType, setPieceRateType] = React.useState<string>("hourly");
  const [pieceRateAmount, setPieceRateAmount] = React.useState<number>(0);
  const [pieceRateUnit, setPieceRateUnit] = React.useState<string>("");
  const [estimatedHours, setEstimatedHours] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>("");

  // Input states for adding new items
  const [newCheckText, setNewCheckText] = React.useState("");
  const [newPhotoUrl, setNewPhotoUrl] = React.useState("");
  const [newPhotoStage, setNewPhotoStage] = React.useState<"before" | "during" | "after_night">("during");
  const [newPhotoCaption, setNewPhotoCaption] = React.useState("");
  const [newMatName, setNewMatName] = React.useState("");
  const [newMatQty, setNewMatQty] = React.useState<number>(1);
  const [newMatUnit, setNewMatUnit] = React.useState("");

  // Đồng bộ dữ liệu khi task thay đổi
  React.useEffect(() => {
    if (task) {
      setCategory(task.category || (task.isField ? "installation" : "welding"));
      setChecklist(task.checklist || []);
      setSafetyChecklist(task.safetyChecklist || (task.isField ? DEFAULT_SAFETY_ITEMS.map((text, i) => ({ id: `s-${i}`, text, completed: false })) : []));
      setPhotoEvidence(task.photoEvidence || []);
      setMaterialsQuota(task.materialsQuota || []);
      setPieceRateType(task.pieceRateType || "hourly");
      setPieceRateAmount(task.pieceRateAmount || 0);
      setPieceRateUnit(task.pieceRateUnit || "");
      setEstimatedHours(task.estimatedHours || 0);
      setNotes(task.notes || "");
    }
  }, [task]);

  if (!task) return null;

  const currentCategoryInfo = SIGNAGE_CATEGORIES.find((c) => c.id === category) || SIGNAGE_CATEGORIES[0];
  const CategoryIcon = currentCategoryInfo.icon;

  // Lưu API một trường dữ liệu
  const saveField = async (payload: Record<string, any>) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/projects/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Lỗi lưu dữ liệu");
      }
      onUpdate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle checklist item
  const handleToggleCheck = async (itemId: string) => {
    const next = checklist.map((c) =>
      c.id === itemId ? { ...c, completed: !c.completed } : c
    );
    setChecklist(next);
    await saveField({ checklist: next });
  };

  // Thêm checklist item
  const handleAddCheck = async () => {
    if (!newCheckText.trim()) return;
    const newItem: TaskChecklistItem = {
      id: Date.now().toString(),
      text: newCheckText.trim(),
      completed: false,
    };
    const next = [...checklist, newItem];
    setChecklist(next);
    setNewCheckText("");
    await saveField({ checklist: next });
  };

  // Xóa checklist item
  const handleDeleteCheck = async (itemId: string) => {
    const next = checklist.filter((c) => c.id !== itemId);
    setChecklist(next);
    await saveField({ checklist: next });
  };

  // Nạp checklist mẫu theo tổ đội
  const handleLoadDefaultChecks = async () => {
    const defaults: TaskChecklistItem[] = currentCategoryInfo.defaultChecks.map((text, i) => ({
      id: `${Date.now()}-${i}`,
      text,
      completed: false,
    }));
    const next = [...checklist, ...defaults];
    setChecklist(next);
    await saveField({ checklist: next });
    toast.success(`Đã nạp ${defaults.length} tiêu chuẩn kỹ thuật mẫu cho tổ [${currentCategoryInfo.name}]`);
  };

  // Toggle safety item
  const handleToggleSafety = async (itemId: string) => {
    const next = safetyChecklist.map((s) =>
      s.id === itemId ? { ...s, completed: !s.completed } : s
    );
    setSafetyChecklist(next);
    await saveField({ safetyChecklist: next });
  };

  // Thêm ảnh bằng chứng
  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim()) {
      toast.error("Vui lòng nhập link ảnh hoặc chụp ảnh");
      return;
    }
    const newEvidence: TaskPhotoEvidence = {
      url: newPhotoUrl.trim(),
      stage: newPhotoStage,
      caption: newPhotoCaption.trim() || undefined,
      uploadedAt: new Date().toISOString(),
    };
    const next = [...photoEvidence, newEvidence];
    setPhotoEvidence(next);
    setNewPhotoUrl("");
    setNewPhotoCaption("");
    await saveField({ photoEvidence: next });
    toast.success("Đã lưu ảnh bằng chứng nghiệm thu!");
  };

  // Xóa ảnh
  const handleDeletePhoto = async (index: number) => {
    const next = photoEvidence.filter((_, i) => i !== index);
    setPhotoEvidence(next);
    await saveField({ photoEvidence: next });
  };

  // Thêm định mức vật tư
  const handleAddMaterial = async () => {
    if (!newMatName.trim()) return;
    const next = [
      ...materialsQuota,
      {
        materialName: newMatName.trim(),
        quantity: newMatQty,
        unit: newMatUnit.trim() || "Cái",
        actualQuantity: newMatQty,
      },
    ];
    setMaterialsQuota(next);
    setNewMatName("");
    setNewMatQty(1);
    setNewMatUnit("");
    await saveField({ materialsQuota: next });
  };

  // Xóa định mức vật tư
  const handleDeleteMaterial = async (index: number) => {
    const next = materialsQuota.filter((_, i) => i !== index);
    setMaterialsQuota(next);
    await saveField({ materialsQuota: next });
  };

  // Chuyển trạng thái 1-click
  const handleStatusChange = async (newStatus: TaskStatus) => {
    let progress = task.progressPercent;
    if (newStatus === "done" || newStatus === "awaiting_acceptance") progress = 100;
    if (newStatus === "todo") progress = 0;
    if (newStatus === "doing" && progress === 0) progress = 50;

    await saveField({ status: newStatus, progressPercent: progress });
    toast.success(`Đã cập nhật trạng thái: ${newStatus}`);
  };

  const completedChecksCount = checklist.filter((c) => c.completed).length;
  const completedSafetyCount = safetyChecklist.filter((s) => s.completed).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`[${task.code}] ${task.title}`}
      width="lg"
    >
      <div className="space-y-4 pb-8 text-xs">
        {/* ======================================================== */}
        {/* 1. KHỐI THÔNG TIN DỰ ÁN & TỔ ĐỘI NGHIỆP VỤ               */}
        {/* ======================================================== */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Dự án:</span>
              <strong className="text-slate-800 truncate">{task.projectName}</strong>
              <span className="font-mono text-[10px] text-slate-400">({task.projectCode})</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector Tổ đội chuyên môn */}
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  saveField({ category: e.target.value });
                }}
                className="text-[11px] font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {SIGNAGE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <Badge variant={task.isField ? "warning" : "default"}>
                {task.isField ? "📍 Hiện trường" : "🏭 Xưởng"}
              </Badge>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. CHUYỂN TRẠNG THÁI 1-CLICK & KÍCH HOẠT AI REPORT        */}
        {/* ======================================================== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 text-xs">Trạng thái công việc:</label>
            <span className="font-mono font-bold text-blue-700">
              Tiến độ: {task.progressPercent}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: "todo", label: "Chờ làm (0%)", bg: "hover:bg-slate-100" },
              { id: "doing", label: "Đang làm (50%)", bg: "hover:bg-blue-50 text-blue-700" },
              { id: "awaiting_acceptance", label: "Chờ nghiệm thu", bg: "hover:bg-amber-50 text-amber-700" },
              { id: "done", label: "Đã hoàn thành", bg: "hover:bg-emerald-50 text-emerald-700" },
            ].map((st) => {
              const isCurrent = task.status === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleStatusChange(st.id as TaskStatus)}
                  className={cn(
                    "p-2 rounded-lg border text-center transition font-semibold text-[11px]",
                    isCurrent
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : cn("bg-white border-slate-200 text-slate-700", st.bg)
                  )}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Nút Báo cáo AI */}
          {onOpenAiReport && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-semibold text-indigo-950">
                  Báo cáo tiến độ & Bóc tách giọng nói AI
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => onOpenAiReport(task)}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Báo cáo AI
              </Button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. ĐIỀU HƯỚNG TABS CHI TIẾT NGHIỆP VỤ                      */}
        {/* ======================================================== */}
        <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={cn(
              "px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap -mb-px text-xs",
              activeTab === "checklist"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Checklist KCS</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {completedChecksCount}/{checklist.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evidence")}
            className={cn(
              "px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap -mb-px text-xs",
              activeTab === "evidence"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Bằng chứng ảnh</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {photoEvidence.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={cn(
              "px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap -mb-px text-xs",
              activeTab === "materials"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Định mức vật tư</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {materialsQuota.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("labor")}
            className={cn(
              "px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap -mb-px text-xs",
              activeTab === "labor"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Khoán việc & Thợ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={cn(
              "px-3 py-2 border-b-2 font-bold transition flex items-center gap-1.5 whitespace-nowrap -mb-px text-xs",
              activeTab === "notes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ghi chú</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: CHECKLIST KỸ THUẬT & AN TOÀN LAO ĐỘNG              */}
        {/* ======================================================== */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            {/* Thanh tiến độ Checklist */}
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Tiêu chuẩn kỹ thuật nghiệm thu ({currentCategoryInfo.name}):</span>
              <strong className="text-slate-900 font-mono">
                {completedChecksCount} / {checklist.length} tiêu chí đạt
              </strong>
            </div>

            {/* Danh sách tiêu chí KCS */}
            <div className="space-y-1.5">
              {checklist.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center space-y-2 bg-slate-50/50">
                  <p className="text-slate-500 text-xs">Chưa có tiêu chuẩn kỹ thuật nào cho công việc này.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadDefaultChecks}
                    className="gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nạp {currentCategoryInfo.defaultChecks.length} tiêu chuẩn mẫu của tổ [{currentCategoryInfo.name}]</span>
                  </Button>
                </div>
              ) : (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg border transition",
                      item.completed ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleCheck(item.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span
                      onClick={() => handleToggleCheck(item.id)}
                      className={cn(
                        "flex-1 cursor-pointer leading-tight",
                        item.completed ? "line-through text-slate-400 font-normal" : "text-slate-800 font-medium"
                      )}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCheck(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Thêm tiêu chí KCS mới */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                type="text"
                placeholder="Nhập thêm yêu cầu kiểm tra kỹ thuật..."
                value={newCheckText}
                onChange={(e) => setNewCheckText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCheck()}
                className="text-xs h-8 flex-1"
              />
              <Button size="sm" onClick={handleAddCheck} className="h-8 text-xs shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Thêm
              </Button>
            </div>

            {/* Checklist An toàn lao động (HSE) cho việc hiện trường */}
            {task.isField && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Checklist An Toàn Lao Động Bắt Buộc (HSE)</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-rose-700">
                    {completedSafetyCount} / {safetyChecklist.length}
                  </span>
                </div>

                <div className="space-y-1 bg-rose-50/40 p-2.5 rounded-xl border border-rose-200">
                  {safetyChecklist.map((s) => (
                    <label key={s.id} className="flex items-start gap-2 py-1 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => handleToggleSafety(s.id)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={cn(s.completed ? "text-slate-400 line-through" : "text-rose-950 font-medium")}>
                        {s.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BẰNG CHỨNG ẢNH NGHIỆM THU (PHOTO EVIDENCE)        */}
        {/* ======================================================== */}
        {activeTab === "evidence" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Hồ sơ ảnh nghiệm thu theo 3 giai đoạn:</span>
              <span className="font-mono">{photoEvidence.length} ảnh đã chụp</span>
            </div>

            {/* Form thêm ảnh */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newPhotoStage}
                  onChange={(e: any) => setNewPhotoStage(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded px-2 py-1"
                >
                  <option value="before">1. Ảnh trước thi công</option>
                  <option value="during">2. Ảnh khung / Test LED</option>
                  <option value="after_night">3. Ảnh hoàn thiện bật đèn đêm</option>
                </select>

                <Input
                  type="text"
                  placeholder="URL ảnh hoặc link CDN..."
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="col-span-2 text-xs h-7"
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Ghi chú ảnh (vd: Test nguồn 4 tiếng không nóng)..."
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  className="text-xs h-7 flex-1"
                />
                <Button size="sm" onClick={handleAddPhoto} className="h-7 text-xs">
                  <Upload className="w-3 h-3 mr-1" />
                  Lưu ảnh
                </Button>
              </div>
            </div>

            {/* Lưới hiển thị ảnh */}
            {photoEvidence.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl border-slate-300 text-slate-400 space-y-1">
                <Camera className="w-6 h-6 mx-auto text-slate-300" />
                <p>Chưa có ảnh bằng chứng nào được tải lên.</p>
                <p className="text-[10px]">Chụp ảnh kết cấu và ảnh bật đèn đêm để lưu hồ sơ bàn giao.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {photoEvidence.map((photo, idx) => {
                  const stageLabels: Record<string, string> = {
                    before: "Trước làm",
                    during: "Đang làm / LED",
                    after_night: "Bật đèn đêm",
                    general: "Khác",
                  };
                  return (
                    <div key={idx} className="group relative rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="h-28 bg-slate-100 relative">
                        <img
                          src={photo.url}
                          alt={photo.caption || "Ảnh nghiệm thu"}
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.currentTarget.src = "https://placehold.co/300x200/png?text=Ảnh+Nghiệm+Thu";
                          }}
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900/80 text-white">
                          {stageLabels[photo.stage] || photo.stage}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(idx)}
                          className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow-xs"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] text-slate-700 truncate font-medium">
                          {photo.caption || "Ảnh nghiệm thu"}
                        </p>
                        <span className="text-[9px] text-slate-400 font-mono block">
                          {new Date(photo.uploadedAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ĐỊNH MỨC VẬT TƯ CẤP CHO ĐẦU VIỆC (BOM CON)          */}
        {/* ======================================================== */}
        {activeTab === "materials" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Định mức vật tư cấp cho việc này (Sắt, LED, Nguồn...):</span>
              <span className="font-mono">{materialsQuota.length} loại vật tư</span>
            </div>

            {/* Bảng danh sách vật tư */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <th className="p-2">Tên vật tư</th>
                    <th className="p-2 w-20 text-center">Định mức</th>
                    <th className="p-2 w-20 text-center">Thực dùng</th>
                    <th className="p-2 w-16 text-center">ĐVT</th>
                    <th className="p-2 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materialsQuota.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 text-xs">
                        Chưa cấp định mức vật tư riêng cho đầu việc này.
                      </td>
                    </tr>
                  ) : (
                    materialsQuota.map((mat, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2 font-medium text-slate-800">{mat.materialName}</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-700">{mat.quantity}</td>
                        <td className="p-2 text-center font-mono text-emerald-700 font-bold">{mat.actualQuantity ?? mat.quantity}</td>
                        <td className="p-2 text-center text-slate-500 text-[11px]">{mat.unit}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(i)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Thêm vật tư mới */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                type="text"
                placeholder="Tên vật tư (vd: Sắt hộp 30x30, Nguồn 12V 400W)..."
                value={newMatName}
                onChange={(e) => setNewMatName(e.target.value)}
                className="text-xs h-8 flex-1"
              />
              <Input
                type="number"
                placeholder="SL"
                value={newMatQty}
                onChange={(e) => setNewMatQty(Number(e.target.value))}
                className="text-xs h-8 w-16 text-center"
              />
              <Input
                type="text"
                placeholder="ĐVT"
                value={newMatUnit}
                onChange={(e) => setNewMatUnit(e.target.value)}
                className="text-xs h-8 w-16 text-center"
              />
              <Button size="sm" onClick={handleAddMaterial} className="h-8 text-xs shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Thêm
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: KHOÁN VIỆC, TIỀN CÔNG & PHÂN CÔNG THỢ              */}
        {/* ======================================================== */}
        {activeTab === "labor" && (
          <div className="space-y-4">
            {/* Khối nhân sự phụ trách */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Thợ phụ trách công việc:</span>
                {onOpenAssignModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(task)}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{task.assignees.length > 0 ? "Thay đổi thợ" : "Giao việc"}</span>
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
                {task.assignees.length > 0 ? (
                  task.assignees.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-none">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {a.name.charAt(0)}
                        </div>
                        <strong className="text-slate-900">{a.name}</strong>
                        {a.code && <span className="font-mono text-[10px] text-slate-400">({a.code})</span>}
                      </div>
                      {a.phone && <span className="text-slate-500 font-mono text-[11px]">{a.phone}</span>}
                    </div>
                  ))
                ) : (
                  <div className="text-amber-700 italic text-[11px] py-1">
                    Chưa phân công thợ cho đầu việc này.
                  </div>
                )}
              </div>
            </div>

            {/* Khối hình thức khoán việc & tiền công */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Hình thức trả công / Khoán việc:</span>
                <span className="text-[10px] text-slate-500">Áp dụng tính lương sản phẩm</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Hình thức:</label>
                  <select
                    value={pieceRateType}
                    onChange={(e) => {
                      setPieceRateType(e.target.value);
                      saveField({ pieceRateType: e.target.value });
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1.5"
                  >
                    <option value="hourly">1. Theo ngày công nhật</option>
                    <option value="fixed_piece">2. Khoán đứt trọn gói</option>
                    <option value="unit_rate">3. Khoán theo đơn giá sản lượng</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    {pieceRateType === "hourly" ? "Ước tính giờ công:" : "Tiền khoán (VNĐ):"}
                  </label>
                  {pieceRateType === "hourly" ? (
                    <Input
                      type="number"
                      value={estimatedHours}
                      onChange={(e) => {
                        setEstimatedHours(Number(e.target.value));
                        saveField({ estimatedHours: Number(e.target.value) });
                      }}
                      className="text-xs h-8 font-mono"
                      placeholder="Số giờ (vd: 8)"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={pieceRateAmount}
                        onChange={(e) => {
                          setPieceRateAmount(Number(e.target.value));
                          saveField({ pieceRateAmount: Number(e.target.value) });
                        }}
                        className="text-xs h-8 font-mono flex-1"
                        placeholder="Số tiền"
                      />
                      <Input
                        type="text"
                        value={pieceRateUnit}
                        onChange={(e) => {
                          setPieceRateUnit(e.target.value);
                          saveField({ pieceRateUnit: e.target.value });
                        }}
                        className="text-xs h-8 w-20 text-center"
                        placeholder="ĐVT (m2, bộ)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: GHI CHÚ KỸ THUẬT & TRAO ĐỔI                        */}
        {/* ======================================================== */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <label className="font-bold text-slate-800 text-xs block">
              Ghi chú kỹ thuật & Lưu ý thi công giữa PM và Thợ:
            </label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập yêu cầu đặc biệt của khách hàng, lưu ý an toàn hoặc quy cách sơn, chủng loại vật tư..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  saveField({ notes });
                  toast.success("Đã lưu ghi chú kỹ thuật!");
                }}
                disabled={isSaving}
                className="text-xs"
              >
                Lưu ghi chú
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* FOOTER: LIÊN KẾT NHANH VỀ DỰ ÁN WBS & HIỆN TRƯỜNG        */}
        {/* ======================================================== */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <Link
            href={`/du-an/${task.projectId}?tab=wbs`}
            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            <span>Xem cây WBS dự án</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          {task.isField && (
            <Link
              href="/hien-truong"
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1 shadow-2xs"
            >
              <Navigation className="w-3 h-3" />
              <span>Hiện Trường Mobile</span>
            </Link>
          )}
        </div>
      </div>
    </Drawer>
  );
}
