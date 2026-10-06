"use client";

import * as React from "react";
import {
  Modal,
  Button,
  Input,
  Badge,
  toast,
} from "@/components/ui";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Package,
  Plus,
  Trash2,
  TrendingUp,
  Star,
  Layers,
  FileText,
  Lightbulb,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { AiReportParseResult } from "@/app/api/ai/report-parser/route";

export interface AiWorkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  currentProgress?: number;
  onSuccess?: () => void;
}

export function AiWorkReportModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  projectId,
  projectName,
  currentProgress = 0,
  onSuccess,
}: AiWorkReportModalProps) {
  const [rawText, setRawText] = React.useState("");
  const [isParsing, setIsParsing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [workSummary, setWorkSummary] = React.useState("");
  const [tasksCompleted, setTasksCompleted] = React.useState<string[]>([]);
  const [completionPercentage, setCompletionPercentage] = React.useState<number>(currentProgress);
  const [workingHours, setWorkingHours] = React.useState<number>(8);
  const [materialsUsed, setMaterialsUsed] = React.useState<
    Array<{ name: string; quantity: number; unit: string }>
  >([]);
  const [materialsRequested, setMaterialsRequested] = React.useState<
    Array<{ name: string; quantity: number; unit: string; reason: string }>
  >([]);
  const [issuesOrObstacles, setIssuesOrObstacles] = React.useState("");
  const [nextDayPlan, setNextDayPlan] = React.useState("");
  const [evaluation, setEvaluation] = React.useState<AiReportParseResult["performanceEvaluation"] | null>(null);

  const [hasParsed, setHasParsed] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setRawText("");
      setWorkSummary("");
      setTasksCompleted([]);
      setCompletionPercentage(currentProgress);
      setWorkingHours(8);
      setMaterialsUsed([]);
      setMaterialsRequested([]);
      setIssuesOrObstacles("");
      setNextDayPlan("");
      setEvaluation(null);
      setHasParsed(false);
    }
  }, [isOpen, currentProgress]);

  const handleParseAi = async () => {
    if (!rawText.trim()) {
      toast.error("Vui lòng nhập mô tả công việc bằng lời nói hoặc gõ text");
      return;
    }

    try {
      setIsParsing(true);
      const res = await fetch("/api/ai/report-parser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          taskId,
          taskTitle,
          projectId,
          projectName,
          currentProgress,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Không thể phân tích báo cáo");
      }

      const json = await res.json();
      const parsed: AiReportParseResult = json.data;

      setWorkSummary(parsed.workSummary || "");
      setTasksCompleted(parsed.tasksCompleted || []);
      setCompletionPercentage(
        typeof parsed.completionPercentage === "number"
          ? Math.max(currentProgress, Math.min(100, parsed.completionPercentage))
          : Math.max(currentProgress, 100)
      );
      setWorkingHours(parsed.workingHours || 8);
      setMaterialsUsed(parsed.materialsUsed || []);
      setMaterialsRequested(parsed.materialsRequested || []);
      setIssuesOrObstacles(parsed.issuesOrObstacles || "");
      setNextDayPlan(parsed.nextDayPlan || "");
      setEvaluation(parsed.performanceEvaluation || null);
      setHasParsed(true);

      toast.success("AI đã bóc tách báo cáo & đánh giá hiệu suất thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi phân tích AI");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFillSample = () => {
    setRawText(
      `Hôm nay tổ thi công 3 người đã hoàn thành hàn gia cố khung sắt hộp 30x30 cho mặt tiền biển hiệu Highlands Coffee, lắp ráp và đi dây 120 bóng LED NC Korea siêu sáng chống nước. Khối lượng công việc đạt khoảng 85%, thi công trong 7.5 tiếng. Thời tiết buổi chiều mưa nhỏ làm trễ 20 phút nhưng đã xử lý che bạt an toàn. Ngày mai dự kiến ốp tấm Alu và test nguồn 12V ban đêm. Đề xuất xin cấp thêm 2 tuýp keo Titebond dán mép chống thấm.`
    );
  };

  const handleSubmit = async () => {
    if (!workSummary.trim()) {
      toast.error("Vui lòng nhập tóm tắt khối lượng hoàn thành");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/field/work-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          projectId,
          workDate: new Date().toISOString().split("T")[0],
          notes: workSummary,
          speechText: rawText,
          completionPercentage,
          materials: materialsUsed,
          answers: {
            tasks_completed: tasksCompleted,
            working_hours: workingHours,
            materials_requested: materialsRequested,
            obstacles: issuesOrObstacles,
            next_day_plan: nextDayPlan,
            ai_performance_evaluation: evaluation,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể lưu báo cáo");
      }

      toast.success("Báo cáo công việc đã được lưu thành công!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu báo cáo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Báo Cáo Công Việc & Đánh Giá Năng Suất AI"
      maxWidth="3xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {/* Context Badge */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="font-mono text-[11px]">
                {projectName || "Dự án"}
              </Badge>
              <span className="text-xs font-semibold text-slate-900">{taskTitle}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tiến độ hiện tại: <strong className="text-slate-800">{currentProgress}%</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillSample}
            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Nạp mẫu thử giọng nói &rarr;
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              1. Nhập ghi chú / Lời thoại thợ thi công
            </label>
            <span className="text-[11px] text-slate-400">Hỗ trợ tiếng Việt tự nhiên</span>
          </div>
          <textarea
            rows={3}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Nhập hoặc dán lời nói/ghi chú của thợ (VD: Hôm nay tổ đã hàn xong 15m khung sắt, đi 120 led, đạt 85%, mất 7.5 tiếng, trời mưa nhỏ, xin thêm 2 tuýp keo titebond...)"
            className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none leading-relaxed resize-y"
          />

          <Button
            type="button"
            onClick={handleParseAi}
            disabled={isParsing || !rawText.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold py-2.5 shadow-sm flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${isParsing ? "animate-spin" : ""}`} />
            {isParsing ? "AI Đang Phân Tích & Đánh Giá Năng Suất..." : "AI Tự Động Bóc Tách & Đánh Giá"}
          </Button>
        </div>

        {(hasParsed || workSummary) && (
          <div className="space-y-4 pt-4 border-t border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                2. Form Báo Cáo Chuẩn Hóa (Đã Bóc Tách)
              </h4>
              <Badge variant="success">Khớp chuẩn định dạng</Badge>
            </div>

            {evaluation && (
              <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                      <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-indigo-950">
                        Đánh Giá Hiệu Suất AI (Performance Score)
                      </h5>
                      <span className="text-[11px] text-indigo-700">
                        Xếp loại: <strong>{evaluation.rating}</strong> ({evaluation.speedRating})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs">
                    <span className="text-xs text-slate-500">Điểm:</span>
                    <strong className="text-sm font-bold text-indigo-700">
                      {evaluation.score} / 10
                    </strong>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-indigo-50 leading-relaxed">
                  <strong>Nhận xét:</strong> {evaluation.qualityComment}
                </p>

                {evaluation.aiRecommendations && (
                  <div className="flex items-start gap-2 text-xs text-indigo-900 bg-indigo-100/60 p-2.5 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Khuyến nghị Quản lý dự án:</strong> {evaluation.aiRecommendations}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Tóm tắt công việc hoàn thành:
              </label>
              <textarea
                rows={2}
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">% Tiến độ sau báo cáo:</span>
                  <strong className="text-blue-600 text-sm">{completionPercentage}%</strong>
                </div>
                <input
                  type="range"
                  min={currentProgress}
                  max={100}
                  step={5}
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Số giờ công (Giờ):</span>
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={workingHours}
                    onChange={(e) => setWorkingHours(Number(e.target.value))}
                    className="w-20 text-xs px-2 py-1 rounded border border-slate-300 text-right font-bold text-slate-800"
                  />
                </div>
                <span className="text-[11px] text-slate-400">Tính năng suất ca làm</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  Vật tư tiêu hao trong ca:
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setMaterialsUsed((prev) => [...prev, { name: "", quantity: 1, unit: "CAI" }])
                  }
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Thêm vật tư
                </button>
              </div>

              {materialsUsed.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Không có vật tư tiêu hao.</p>
              ) : (
                <div className="space-y-2">
                  {materialsUsed.map((mat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={mat.name}
                        onChange={(e) => {
                          const updated = [...materialsUsed];
                          updated[idx].name = e.target.value;
                          setMaterialsUsed(updated);
                        }}
                        placeholder="Tên vật tư (VD: Sắt hộp, LED 3 mắt, Tấm alu...)"
                        className="text-xs flex-1"
                      />
                      <Input
                        type="number"
                        value={mat.quantity}
                        onChange={(e) => {
                          const updated = [...materialsUsed];
                          updated[idx].quantity = Number(e.target.value);
                          setMaterialsUsed(updated);
                        }}
                        className="text-xs w-20 text-right"
                      />
                      <Input
                        value={mat.unit}
                        onChange={(e) => {
                          const updated = [...materialsUsed];
                          updated[idx].unit = e.target.value;
                          setMaterialsUsed(updated);
                        }}
                        placeholder="ĐVT"
                        className="text-xs w-20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMaterialsUsed((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Khó khăn / vướng mắc:</label>
                <textarea
                  rows={2}
                  value={issuesOrObstacles}
                  onChange={(e) => setIssuesOrObstacles(e.target.value)}
                  placeholder="Thời tiết, điện, mặt bằng..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Kế hoạch ngày mai:</label>
                <textarea
                  rows={2}
                  value={nextDayPlan}
                  onChange={(e) => setNextDayPlan(e.target.value)}
                  placeholder="Công việc dự kiến ca sau..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Hủy Bỏ
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (!hasParsed && !workSummary)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5"
        >
          {isSubmitting ? "Đang Lưu Báo Cáo..." : "Xác Nhận & Gửi Báo Cáo"}
        </Button>
      </div>
    </Modal>
  );
}
