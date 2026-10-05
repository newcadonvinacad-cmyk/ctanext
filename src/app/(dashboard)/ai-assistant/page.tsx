"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Plus,
  Trash2,
  ArrowUp,
  Clock,
  RefreshCw,
  Eye,
  X,
  History,
  FileText,
  AlertCircle,
  Database,
  Users,
  Box,
  Truck,
  DollarSign,
  Layers,
  Wrench,
  CheckCircle2,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Pin,
  RotateCcw,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/ui";
import { AiActionProposal, IngestionActionType } from "@/types/ai.types";

interface AiRun {
  id: string;
  agentCode: string;
  status: string;
  model: string;
  inputSnapshot: any;
  outputJson: any;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  dataSources?: Array<{
    sourceType: string;
    title: string;
    summary: string;
    count?: number;
  }>;
  permissionWarnings?: string[];
  actionProposal?: AiActionProposal;
}

// 4 CHỨC NĂNG TỰ ĐỘNG NHẬP LIỆU CHỌN LỌC
const INGESTION_ACTIONS: Array<{
  type: IngestionActionType;
  title: string;
  desc: string;
  icon: any;
  placeholder: string;
  sampleInput: string;
}> = [
  {
    type: "work_report",
    title: "Báo Cáo Nhật Trình Thi Công",
    desc: "Bóc tách tiến độ %, đầu việc thợ & vật tư phát sinh",
    icon: FileText,
    placeholder:
      "Ví dụ: Hôm nay tổ 3 người đã ốp xong 30m2 alu mặt tiền Vincom, tiến độ đạt 85%, dùng hết 2 tuýp keo titebond...",
    sampleInput:
      "Hôm nay tổ thi công ốp xong 30m2 alu mặt tiền Vincom Bà Triệu, tiến độ đạt 85%, dùng hết 2 tuýp keo titebond",
  },
  {
    type: "stock_issue",
    title: "Đề Xuất Xuất Kho Vật Tư",
    desc: "Tạo phiếu xuất cấp vật tư cho công trình từ kho",
    icon: Box,
    placeholder:
      "Ví dụ: Xuất 5 tấm alu alcorest 3mm và 2 cuộn bạt 3M cho công trình Highlands Vincom từ kho xưởng...",
    sampleInput:
      "Xuất 5 tấm alu alcorest và 2 hộp keo dán titebond cho công trình Vincom Bà Triệu từ kho xưởng",
  },
  {
    type: "acceptance",
    title: "Dự Thảo Biên Bản Nghiệm Thu",
    desc: "Khớp công trình & người đại diện ký bàn giao",
    icon: Layers,
    placeholder:
      "Ví dụ: Nghiệm thu giai đoạn ốp alu mặt tiền dự án Vincom, đại diện khách hàng anh Tuấn đã ký duyệt...",
    sampleInput:
      "Nghiệm thu giai đoạn ốp alu mặt tiền dự án Vincom Bà Triệu, đại diện khách hàng anh Nguyễn Văn Tuấn đã ký duyệt bàn giao",
  },
  {
    type: "disbursement",
    title: "Ghi Nhận Phiếu Chi / Phát Sinh",
    desc: "Ghi nhận chi phí phát sinh hiện trường từ quỹ tiền",
    icon: DollarSign,
    placeholder:
      "Ví dụ: Chi tiền mua đinh vít và giàn giáo 450.000đ cho công trình Vincom từ quỹ tiền mặt...",
    sampleInput:
      "Chi 450.000đ tiền mua phụ kiện vít nở và giàn giáo ngoài công trình từ quỹ tiền mặt cho dự án Vincom",
  },
];

// CHUYÊN MỤC TRA CỨU ĐIỀU HÀNH
const QUERY_TOPICS = [
  {
    id: "tasks",
    label: "Điều độ & Phân công thợ",
    icon: Users,
    prompt: "Tuần này có ai làm gì không?",
  },
  {
    id: "employees",
    label: "Danh sách nhân sự công ty",
    icon: Users,
    prompt: "Danh sách nhân sự công ty",
  },
  {
    id: "inventory",
    label: "Tồn kho & Tấm lẻ alu dở",
    icon: Box,
    prompt: "Báo cáo tồn kho vật tư trọng yếu và danh sách tấm lẻ dở",
  },
  {
    id: "debt",
    label: "Công nợ phải thu & phải trả",
    icon: DollarSign,
    prompt: "Báo cáo công nợ phải thu và phải trả",
  },
  {
    id: "projects",
    label: "Tiến độ dự án thi công",
    icon: Layers,
    prompt: "Tình hình triển khai các dự án đang thi công",
  },
  {
    id: "logistics",
    label: "Đội xe & Chuyến hàng",
    icon: Truck,
    prompt: "Hôm nay có chuyến xe nào giao hàng ra công trình không?",
  },
  {
    id: "technical",
    label: "Kỹ thuật hộp đèn 3M",
    icon: Wrench,
    prompt: "Định mức vật tư làm biển bạt hộp đèn 3M kích thước 8x2.5m",
  },
];

export default function AiAssistantPage() {
  // Chế độ hoạt động: 1 (query: Tra cứu & Điều hành) hoặc 2 (ingest: Tự động nhập liệu)
  const [activeMode, setActiveMode] = useState<"query" | "ingest">("query");
  const [selectedIngestType, setSelectedIngestType] = useState<IngestionActionType>("work_report");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `## 👋 Xin chào! Tôi là Trợ Lý Kỹ Thuật & Điều Hành Signage ERP

Hệ thống được chia thành 2 nhóm tính năng chính:

1. **Tra Cứu & Điều Hành Thời Gian Thực:** Tra cứu tồn kho, tiến độ dự án, điều độ phân công thợ, công nợ và kỹ thuật biển bảng.
2. **AI Tự Động Nhập Liệu (Có Preview & Xác Nhận):** Tự động bóc tách nhật trình thi công, đề xuất xuất kho, biên bản nghiệm thu và phiếu chi phát sinh.

Bạn có thể chọn chế độ ở cột bên trái hoặc nhập nội dung để bắt đầu.`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [sending, setSending] = useState(false);

  // Expanded tool accordion state per message index
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // Loading state when confirming a proposal
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // AI Runs history state
  const [aiRuns, setAiRuns] = useState<AiRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AiRun | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const fetchAiRuns = async () => {
    try {
      setLoadingRuns(true);
      const res = await fetch("/api/ai/assistant");
      if (res.ok) {
        const data = await res.json();
        setAiRuns(data.runs || []);
      }
    } catch (err) {
      console.error("Không thể tải lịch sử AI runs:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchAiRuns();
  }, []);

  // Bắt đầu đoạn chat mới: Đưa về mặc định Tra cứu & Điều hành, xóa sạch trạng thái cũ
  const handleNewChat = () => {
    setActiveMode("query");
    setSelectedIngestType("work_report");
    setInputPrompt("");
    setExpandedTools({});
    setConfirmingId(null);
    setMessages([
      {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: `## 👋 Phiên làm việc mới đã bắt đầu!

Hệ thống đã tự động đưa về **Chế độ 1: Tra Cứu & Điều Hành Thời Gian Thực**.
Bạn có thể đặt câu hỏi về nhân sự, phân công thợ, công việc của bạn, tồn kho, tiến độ dự án, hoặc chọn tác vụ nhập liệu ở cột bên trái.`,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      },
    ]);
  };

  // Xóa sạch toàn bộ tin nhắn trong khung chat
  const handleClearChat = () => {
    setActiveMode("query");
    setInputPrompt("");
    setExpandedTools({});
    setConfirmingId(null);
    setMessages([
      {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: "Đoạn hội thoại đã được xóa sạch. Hãy nhập câu hỏi để bắt đầu phiên mới.",
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      },
    ]);
  };

  // Dọn dẹp nhanh lịch sử tác vụ AI Runs
  const [clearingHistory, setClearingHistory] = useState(false);
  const handleClearHistory = async () => {
    if (!confirm("Bạn có chắc chắn muốn dọn dẹp sạch toàn bộ lịch sử tác vụ AI không?")) return;
    try {
      setClearingHistory(true);
      const res = await fetch("/api/ai/assistant", { method: "DELETE" });
      if (res.ok) {
        setAiRuns([]);
        setSelectedRun(null);
      }
    } catch (err: any) {
      console.error("Lỗi khi dọn dẹp lịch sử:", err);
    } finally {
      setClearingHistory(false);
    }
  };

  const toggleToolDetails = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentActionMeta = INGESTION_ACTIONS.find((a) => a.type === selectedIngestType);

  const handleSendMessage = async (promptToSend?: string, overrideMode?: "query" | "ingest") => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || sending) return;

    const mode = overrideMode || activeMode;
    const userMsgId = "user-" + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          actionType: mode === "ingest" ? selectedIngestType : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Lỗi kết nối Trợ lý AI");
      }

      const data = await res.json();
      const botMsgId = "bot-" + Date.now();
      const botMsg: ChatMessage = {
        id: botMsgId,
        role: "assistant",
        content: data.answer || "Không có phản hồi từ mô hình AI.",
        timestamp: new Date().toLocaleTimeString("vi-VN"),
        toolsUsed: data.toolsUsed,
        dataSources: data.dataSources,
        permissionWarnings: data.permissionWarnings,
        actionProposal: data.proposal || data.actionProposal || undefined,
      };
      if (!data.isActionProposal && mode === "ingest") {
        setActiveMode("query");
      }
      setMessages((prev) => [...prev, botMsg]);
      fetchAiRuns();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `⚠️ Có lỗi xảy ra trong quá trình xử lý: ${err.message}`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Xác nhận lưu Action Proposal vào DB
  const handleConfirmAction = async (msgId: string, proposal: AiActionProposal) => {
    setConfirmingId(msgId);
    try {
      const res = await fetch("/api/ai/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: proposal.actionType,
          draftPayload: proposal.draftPayload,
          aiRunId: proposal.aiRunId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể xác nhận lưu vào database");
      }

      // Cập nhật trạng thái proposal trong message
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.actionProposal) {
            return {
              ...m,
              actionProposal: {
                ...m.actionProposal,
                status: "confirmed",
                createdRecordCode: data.recordCode,
                createdRecordUrl: data.recordUrl,
              },
            };
          }
          return m;
        })
      );
      fetchAiRuns();
    } catch (err: any) {
      alert("Lỗi khi xác nhận lưu: " + err.message);
    } finally {
      setConfirmingId(null);
    }
  };

  // Hủy Action Proposal
  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actionProposal) {
          return {
            ...m,
            actionProposal: {
              ...m.actionProposal,
              status: "cancelled",
            },
          };
        }
        return m;
      })
    );
  };

  return (
    <div className="flex-1 flex flex-row h-full w-full bg-white overflow-hidden">
      {/* 1. CỘT TRÁI ĐƯỢC GHIM CHẶT CỐ ĐỊNH (PERMANENTLY PINNED SIDEBAR - FULL VIEWPORT HEIGHT) */}
      <aside className="w-72 sm:w-80 h-full border-r border-slate-200 bg-slate-50/90 flex flex-col shrink-0 select-none z-10">
        {/* Header cột trái */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900">Signage AI Assistant</h2>
              <span className="text-[10px] text-slate-500 font-mono">Gemini 3.5 Flash</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-200/80 border border-slate-300 px-1.5 py-0.5 rounded shadow-2xs"
              title="Cột trái đã được ghim cố định"
            >
              <Pin className="w-2.5 h-2.5 text-slate-700" />
              <span>Đã ghim</span>
            </span>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition shadow-2xs"
              title="Bắt đầu phiên trò chuyện mới (Reset về Tra cứu)"
            >
              <Plus className="w-3 h-3" />
              <span>Mới</span>
            </button>
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-red-600 px-1.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-red-50 transition shadow-2xs"
              title="Xóa sạch nội dung đoạn chat"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* BỘ CHUYỂN ĐỔI 2 CHẾ ĐỘ CHÍNH */}
        <div className="p-2 border-b border-slate-200 bg-slate-100/60">
          <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveMode("query")}
              className={`py-1.5 px-2 rounded-md transition text-center flex items-center justify-center gap-1.5 ${
                activeMode === "query"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>1. Tra cứu</span>
            </button>
            <button
              onClick={() => setActiveMode("ingest")}
              className={`py-1.5 px-2 rounded-md transition text-center flex items-center justify-center gap-1.5 ${
                activeMode === "ingest"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>2. Nhập liệu AI</span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG THEO 2 CHẾ ĐỘ */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* CHẾ ĐỘ 1: TRA CỨU & ĐIỀU HÀNH */}
          {activeMode === "query" && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                Chuyên mục điều hành (Hỏi đáp)
              </div>
              {QUERY_TOPICS.map((topic) => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleSendMessage(topic.prompt, "query")}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-200/60 transition text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{topic.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* CHẾ ĐỘ 2: TỰ ĐỘNG NHẬP LIỆU (4 CHỨC NĂNG CHỌN LỌC) */}
          {activeMode === "ingest" && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">
                4 Chức năng tự động nhập liệu
              </div>
              <div className="space-y-1.5">
                {INGESTION_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isSelected = selectedIngestType === action.type;
                  return (
                    <button
                      key={action.type}
                      onClick={() => setSelectedIngestType(action.type)}
                      className={`w-full text-left p-2.5 rounded-xl border transition space-y-1 block ${
                        isSelected
                          ? "bg-white border-slate-900 shadow-2xs text-slate-900"
                          : "bg-white/60 border-slate-200 hover:border-slate-400 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-slate-600" />
                          {action.title}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{action.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Hộp gợi ý câu lệnh mẫu cho chức năng đang chọn */}
              {currentActionMeta && (
                <div className="p-2.5 rounded-lg bg-slate-200/50 border border-slate-200 text-xs space-y-1.5 mt-3">
                  <span className="font-semibold text-slate-700 text-[11px] block">
                    Ví dụ nhập liệu mẫu:
                  </span>
                  <p className="text-[11px] text-slate-600 italic leading-relaxed">
                    "{currentActionMeta.sampleInput}"
                  </p>
                  <button
                    onClick={() => handleSendMessage(currentActionMeta.sampleInput, "ingest")}
                    className="text-[11px] font-medium text-slate-900 underline hover:text-slate-700"
                  >
                    Thử câu này ngay →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NHẬT KÝ AI RUNS GẦN ĐÂY */}
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Nhật ký gần đây
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearHistory}
                  disabled={clearingHistory || aiRuns.length === 0}
                  title="Dọn dẹp nhanh toàn bộ lịch sử tác vụ AI"
                  className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-0.5 rounded transition"
                >
                  <RotateCcw className={`w-3 h-3 ${clearingHistory ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={fetchAiRuns}
                  title="Làm mới lịch sử"
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRuns ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {loadingRuns && aiRuns.length === 0 ? (
              <div className="text-xs text-slate-400 px-2 py-2">Đang tải...</div>
            ) : aiRuns.length === 0 ? (
              <div className="text-xs text-slate-400 px-2 py-2">Chưa có phiên tác vụ</div>
            ) : (
              aiRuns.slice(0, 6).map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded text-[11px] text-slate-600 hover:bg-slate-200/60 transition text-left truncate"
                >
                  <span className="truncate">
                    {run.inputSnapshot?.prompt || run.inputSnapshot?.text || run.agentCode}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                    {run.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer Sidebar: Nút mở modal kiểm toán chi tiết */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setShowAuditModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>Kiểm toán AI Runs ({aiRuns.length})</span>
          </button>
        </div>
      </aside>

      {/* 2. KHÔNG GIAN HỘI THOẠI CHÍNH */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white overflow-hidden">
        {/* Header thanh mảnh */}
        <header className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">
              {activeMode === "query" ? "Trợ Lý Tra Cứu Điều Hành" : "AI Tự Động Nhập Liệu"}
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded">
              {activeMode === "query"
                ? "Dữ liệu thời gian thực"
                : currentActionMeta?.title || "Bản nháp & Preview"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-md hover:bg-red-50 border border-slate-200 bg-white transition shadow-2xs font-medium"
              title="Xóa sạch nội dung đoạn chat hiện tại"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Xóa chat</span>
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 border border-slate-200 bg-white transition shadow-2xs font-medium"
              title="Mở đoạn chat mới và chuyển về Chế độ Tra cứu"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Đoạn chat mới</span>
            </button>
          </div>
        </header>

        {/* Banner thông báo chế độ nhập liệu nếu đang chọn */}
        {activeMode === "ingest" && currentActionMeta && (
          <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>
                Đang ở chế độ nhập: <strong>{currentActionMeta.title}</strong>. Nhập nội dung bên dưới,
                AI sẽ so khớp hệ thống và hiện <strong>Preview</strong> để bạn kiểm tra trước khi ghi vào DB.
              </span>
            </div>
            <button
              onClick={() => setActiveMode("query")}
              className="text-slate-500 hover:text-slate-800 text-[11px] underline"
            >
              Chuyển về hỏi đáp
            </button>
          </div>
        )}

        {/* Feed tin nhắn */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[90%] text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-100 text-slate-900 rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-2xs"
                      : "space-y-3 text-slate-800 flex-1"
                  }`}
                >
                  {/* Tool bar collapsible (khi tra cứu) */}
                  {m.role === "assistant" && m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="border border-slate-200 rounded-lg bg-slate-50/60 overflow-hidden text-xs">
                      <button
                        onClick={() => toggleToolDetails(m.id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 transition"
                      >
                        <div className="flex items-center gap-1.5 font-medium text-[11px]">
                          <Database className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            Đã đối soát {m.toolsUsed.length} nguồn dữ liệu: {m.toolsUsed.join(", ")}
                          </span>
                        </div>
                        {expandedTools[m.id] ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      {expandedTools[m.id] && m.dataSources && m.dataSources.length > 0 && (
                        <div className="px-3 py-2 border-t border-slate-200 bg-white space-y-1 text-[11px]">
                          {m.dataSources.map((ds, dsIdx) => (
                            <div key={dsIdx} className="flex justify-between text-slate-600">
                              <span className="font-medium text-slate-800">{ds.title}</span>
                              <span className="text-slate-400">{ds.summary}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cảnh báo quyền nếu có */}
                  {m.permissionWarnings && m.permissionWarnings.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50/70 text-amber-900 text-xs p-2.5 rounded-lg space-y-1">
                      {m.permissionWarnings.map((warn, wIdx) => (
                        <div key={wIdx} className="flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nội dung phản hồi text / markdown */}
                  {m.role === "assistant" ? (
                    <div className="overflow-x-auto">
                      <MarkdownRenderer content={m.content} />
                    </div>
                  ) : (
                    <div>{m.content}</div>
                  )}

                  {/* BẢN XEM TRƯỚC HÀNH ĐỘNG (INTERACTIVE ACTION PREVIEW CARD) */}
                  {m.actionProposal && (
                    <div className="mt-3 border border-slate-300 rounded-xl bg-slate-50/80 p-4 space-y-3 shadow-2xs">
                      {/* Tiêu đề card */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-slate-700" />
                            {m.actionProposal.actionTitle}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            m.actionProposal.status === "confirmed"
                              ? "bg-slate-900 text-white"
                              : m.actionProposal.status === "cancelled"
                              ? "bg-slate-200 text-slate-500"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {m.actionProposal.status === "confirmed"
                            ? "✓ ĐÃ LƯU DATABASE"
                            : m.actionProposal.status === "cancelled"
                            ? "ĐÃ HỦY"
                            : "CHỜ XÁC NHẬN"}
                        </span>
                      </div>

                      {/* Chi tiết dữ liệu đã so khớp (Preview fields) */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                        <div className="text-[11px] text-slate-500 font-medium">
                          {m.actionProposal.summary}
                        </div>

                        {/* Thông tin thực thể so khớp */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                          {m.actionProposal.matchedEntities.project && (
                            <div>
                              <span className="text-slate-400 text-[11px] block">Dự án khớp:</span>
                              <strong className="text-slate-900">
                                {m.actionProposal.matchedEntities.project.name} (
                                {m.actionProposal.matchedEntities.project.code})
                              </strong>
                            </div>
                          )}

                          {m.actionProposal.matchedEntities.task && (
                            <div>
                              <span className="text-slate-400 text-[11px] block">Công việc / Hạng mục:</span>
                              <strong className="text-slate-900">
                                {m.actionProposal.matchedEntities.task.title}
                              </strong>
                            </div>
                          )}

                          {m.actionProposal.matchedEntities.warehouse && (
                            <div>
                              <span className="text-slate-400 text-[11px] block">Kho xuất nguồn:</span>
                              <strong className="text-slate-900">
                                {m.actionProposal.matchedEntities.warehouse.name}
                              </strong>
                            </div>
                          )}

                          {m.actionProposal.matchedEntities.cashAccount && (
                            <div>
                              <span className="text-slate-400 text-[11px] block">Quỹ thanh toán:</span>
                              <strong className="text-slate-900">
                                {m.actionProposal.matchedEntities.cashAccount.name}
                              </strong>
                            </div>
                          )}
                        </div>

                        {/* Danh sách vật tư nếu có trong phiếu xuất */}
                        {m.actionProposal.matchedEntities.items &&
                          m.actionProposal.matchedEntities.items.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-slate-400 text-[11px] block mb-1">
                                Danh mục vật tư cấp phát:
                              </span>
                              <div className="space-y-1">
                                {m.actionProposal.matchedEntities.items.map((item, iIdx) => (
                                  <div
                                    key={iIdx}
                                    className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded text-[11px]"
                                  >
                                    <span className="text-slate-800">
                                      <strong>{item.code}</strong> - {item.name}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {item.qty} {item.unitName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Tiến độ và ghi chú nếu là Work Report */}
                        {m.actionProposal.draftPayload.completionPercentage !== undefined && (
                          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400 text-[11px]">Tiến độ cập nhật:</span>{" "}
                              <strong className="text-slate-900">
                                {m.actionProposal.draftPayload.completionPercentage}%
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[11px]">Ngày thực hiện:</span>{" "}
                              <span className="text-slate-700">
                                {m.actionProposal.draftPayload.workDate}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Số tiền nếu là Phiếu chi */}
                        {m.actionProposal.draftPayload.amount && (
                          <div className="pt-1 border-t border-slate-100">
                            <span className="text-slate-400 text-[11px]">Số tiền đề nghị chi:</span>{" "}
                            <strong className="text-slate-900 text-sm">
                              {Number(m.actionProposal.draftPayload.amount).toLocaleString("vi-VN")} VNĐ
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Nút bấm Xác nhận hoặc Hủy */}
                      {m.actionProposal.status === "pending_confirmation" && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleConfirmAction(m.id, m.actionProposal!)}
                            disabled={confirmingId === m.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                          >
                            {confirmingId === m.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang ghi vào DB...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Xác nhận lưu vào DB</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleCancelAction(m.id)}
                            disabled={confirmingId === m.id}
                            className="py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition"
                          >
                            Hủy bỏ
                          </button>
                        </div>
                      )}

                      {/* Trạng thái sau khi đã lưu thành công */}
                      {m.actionProposal.status === "confirmed" && (
                        <div className="p-2.5 bg-slate-900 text-white rounded-lg text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Đã lưu thành công vào cơ sở dữ liệu hệ thống!</span>
                          </span>
                          {m.actionProposal.createdRecordUrl && (
                            <a
                              href={m.actionProposal.createdRecordUrl}
                              className="text-[11px] underline hover:text-slate-200 flex items-center gap-1"
                            >
                              <span>Xem chứng từ</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 text-right">{m.timestamp}</div>
                </div>
              </div>
            ))}

            {/* Trạng thái đang tải */}
            {sending && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>
                  {activeMode === "ingest"
                    ? "Đang so khớp thực thể và tạo bản xem trước (preview)..."
                    : "Đang truy xuất dữ liệu ERP và tổng hợp phân tích..."}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Khung nhập liệu ở đáy */}
        <div className="p-3 md:p-4 border-t border-slate-200 bg-white shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end border border-slate-300 focus-within:border-slate-600 rounded-2xl bg-white shadow-2xs transition px-3.5 py-2.5"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  activeMode === "ingest"
                    ? currentActionMeta?.placeholder || "Nhập nội dung dữ liệu để tạo bản nháp..."
                    : "Nhập câu hỏi (Ví dụ: Tuần này có ai làm gì không, Tồn kho alu, Công nợ...)"
                }
                disabled={sending}
                className="flex-1 max-h-32 resize-none text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent leading-relaxed"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || sending}
                className="ml-2 w-8 h-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center transition shrink-0"
                title="Gửi câu hỏi (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Enter để gửi, Shift+Enter xuống dòng</span>
              <span>
                {activeMode === "ingest"
                  ? "Tạo bản nháp preview → Kiểm tra → Xác nhận lưu DB"
                  : "Tra cứu trực tiếp dữ liệu thời gian thực Signage ERP"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL KIỂM TOÁN TÁC VỤ AI (AI RUNS AUDIT LOG) */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Nhật Ký Kiểm Toán Tác Vụ AI (ai_runs)
                </h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-3 py-2">Mã phiên</th>
                    <th className="px-3 py-2">Tác nhân</th>
                    <th className="px-3 py-2">Mô hình</th>
                    <th className="px-3 py-2 text-center">Trạng thái</th>
                    <th className="px-3 py-2">Thời điểm</th>
                    <th className="px-3 py-2 text-center">Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aiRuns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                        Chưa có phiên chạy AI nào được ghi nhận
                      </td>
                    </tr>
                  ) : (
                    aiRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 font-mono text-slate-500">{run.id.slice(0, 8)}...</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{run.agentCode}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono">{run.model}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              run.status === "confirmed"
                                ? "bg-slate-900 text-white"
                                : run.status === "completed"
                                ? "bg-slate-100 text-slate-800"
                                : run.status === "failed"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {new Date(run.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setSelectedRun(run)}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium underline"
                          >
                            <Eye className="w-3 h-3" /> Xem
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT SNAPSHOT JSON */}
      {selectedRun && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Chi Tiết Snapshot: {selectedRun.id.slice(0, 8)}...
                </h3>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div>
                <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Input Snapshot (Prompt)
                </p>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto font-mono text-[11px]">
                  {typeof selectedRun.inputSnapshot === "string"
                    ? selectedRun.inputSnapshot
                    : JSON.stringify(selectedRun.inputSnapshot, null, 2)}
                </pre>
              </div>

              <div>
                <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Output JSON (Answer / Proposal)
                </p>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto font-mono text-[11px] max-h-72">
                  {typeof selectedRun.outputJson === "string"
                    ? selectedRun.outputJson
                    : JSON.stringify(selectedRun.outputJson, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
