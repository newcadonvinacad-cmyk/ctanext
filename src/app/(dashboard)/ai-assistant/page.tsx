"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  RefreshCw,
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
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Pin,
  RotateCcw,
  Search,
  Pencil,
  Check,
  MessageSquare,
  Zap,
  Terminal,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/ui";
import { AiActionProposal, AiAgentStepTrace, IngestionActionType } from "@/types/ai.types";

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
  steps?: AiAgentStepTrace[];
}

interface ChatSession {
  id: string;
  title: string;
  mode: "query" | "ingest";
  pinned: boolean;
  messageCount: number;
  lastMessageAt?: string | null;
  updatedAt: string;
  createdAt: string;
}

const AI_MODELS = [
  { id: "gemini", name: "Gemini 2.5 Flash", tag: "Mặc định" },
  { id: "astra", name: "Gemini 2.5 Pro", tag: "Nâng cao" },
] as const;

type AiModelId = (typeof AI_MODELS)[number]["id"];

// 4 năng lực của AI Agent
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
    title: "Nhật trình thi công",
    desc: "Bóc tách tiến độ %, vật tư phát sinh",
    icon: FileText,
    placeholder: "Mô tả việc hôm nay, ví dụ: ốp xong 30m2 alu mặt tiền, tiến độ 85%...",
    sampleInput:
      "Hôm nay tổ thi công ốp xong 30m2 alu mặt tiền Vincom Bà Triệu, tiến độ đạt 85%, dùng hết 2 tuýp keo titebond",
  },
  {
    type: "stock_issue",
    title: "Xuất kho vật tư",
    desc: "Lập phiếu cấp vật tư cho công trình",
    icon: Box,
    placeholder: "Cần xuất gì, cho công trình nào, từ kho nào...",
    sampleInput:
      "Xuất 5 tấm alu alcorest và 2 hộp keo dán titebond cho công trình Vincom Bà Triệu từ kho xưởng",
  },
  {
    type: "acceptance",
    title: "Biên bản nghiệm thu",
    desc: "Soạn biên bản bàn giao, ký duyệt",
    icon: Layers,
    placeholder: "Nghiệm thu hạng mục nào, ai ký duyệt...",
    sampleInput:
      "Nghiệm thu giai đoạn ốp alu mặt tiền dự án Vincom Bà Triệu, đại diện khách hàng anh Nguyễn Văn Tuấn đã ký duyệt bàn giao",
  },
  {
    type: "disbursement",
    title: "Phiếu chi phát sinh",
    desc: "Ghi nhận chi phí hiện trường",
    icon: DollarSign,
    placeholder: "Chi bao nhiêu, mua gì, từ quỹ nào...",
    sampleInput:
      "Chi 450.000đ tiền mua phụ kiện vít nở và giàn giáo ngoài công trình từ quỹ tiền mặt cho dự án Vincom",
  },
];

const QUERY_TOPICS = [
  { id: "tasks", label: "Phân công thợ", icon: Users, prompt: "Tuần này có ai làm gì không?" },
  { id: "employees", label: "Nhân sự", icon: Users, prompt: "Danh sách nhân sự công ty" },
  { id: "inventory", label: "Tồn kho & tấm lẻ", icon: Box, prompt: "Báo cáo tồn kho vật tư trọng yếu và danh sách tấm lẻ dở" },
  { id: "debt", label: "Công nợ", icon: DollarSign, prompt: "Báo cáo công nợ phải thu và phải trả" },
  { id: "projects", label: "Tiến độ dự án", icon: Layers, prompt: "Tình hình triển khai các dự án đang thi công" },
  { id: "logistics", label: "Đội xe", icon: Truck, prompt: "Hôm nay có chuyến xe nào giao hàng ra công trình không?" },
  { id: "technical", label: "Định mức 3M", icon: Wrench, prompt: "Định mức vật tư làm biển bạt hộp đèn 3M kích thước 8x2.5m" },
  { id: "finance", label: "Dòng tiền", icon: Zap, prompt: "Tình hình quỹ tiền mặt và số dư ngân hàng hiện tại" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function SLogo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className="shrink-0"
      style={{ filter: "drop-shadow(0 2px 6px rgba(15,23,42,.35))" }}
    >
      <defs>
        <linearGradient id="slogo-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#slogo-bg)" />
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.5" fill="none" stroke="#fff" strokeOpacity="0.16" />
      <polygon points="8,7 24,7 24,10.5 8,10.5" fill="#8b5cf6" />
      <polygon points="8,10.5 11.5,10.5 14,14 10.5,14" fill="#e879f9" />
      <polygon points="10.5,14 24,14 24,17.5 10.5,17.5" fill="#38bdf8" />
      <polygon points="19,17.5 22.5,17.5 21,21 17.5,21" fill="#34d399" />
      <polygon points="8,21 21,21 21,24.5 8,24.5" fill="#fbbf24" />
      <polygon points="24.5,6 27,6 25,9.5 23.5,9.5" fill="#38bdf8" />
      <polygon points="5,22.5 7.5,22.5 6,25.5 4.5,25" fill="#e879f9" />
    </svg>
  );
}

function toChatMessage(row: any): ChatMessage {
  const toolsUsed = Array.isArray(row.toolsUsed)
    ? row.toolsUsed
    : Array.isArray(row.tools_used)
      ? row.tools_used
      : [];
  const dataSources = Array.isArray(row.dataSources)
    ? row.dataSources
    : Array.isArray(row.data_sources)
      ? row.data_sources
      : [];
  const permissionWarnings = Array.isArray(row.permissionWarnings)
    ? row.permissionWarnings
    : Array.isArray(row.permission_warnings)
      ? row.permission_warnings
      : [];
  const proposal = row.actionProposal ?? row.action_proposal ?? undefined;
  const steps = Array.isArray(row.steps) ? row.steps : undefined;
  const createdAt = row.createdAt || row.created_at;
  return {
    id: String(row.id),
    role: row.role,
    content: String(row.content || ""),
    timestamp: createdAt ? new Date(createdAt).toLocaleTimeString("vi-VN") : "",
    toolsUsed,
    dataSources,
    permissionWarnings,
    actionProposal: proposal || undefined,
    steps,
  };
}

export default function AiAssistantPage() {
  const [activeMode, setActiveMode] = useState<"query" | "ingest">("query");
  const [selectedIngestType, setSelectedIngestType] = useState<IngestionActionType>("work_report");
  const [selectedModel, setSelectedModel] = useState<AiModelId>("gemini");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [persistenceReady, setPersistenceReady] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const model = AI_MODELS.find((m) => m.id === selectedModel) ?? AI_MODELS[0];
  const showHero = messages.length === 0 && !loadingMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, loadingMessages]);

  // Auto-resize ô nhập, tối đa 128px rồi cuộn trong
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [inputPrompt]);

  useEffect(() => {
    try {
      const draft = localStorage.getItem("ai-assistant-draft") || "";
      if (draft) setInputPrompt(draft);
      const lastSession = localStorage.getItem("ai-assistant-last-session");
      if (lastSession) setActiveSessionId(lastSession);
      const savedModel = localStorage.getItem("ai-assistant-model");
      if (savedModel === "gemini" || savedModel === "astra") setSelectedModel(savedModel);
      if (localStorage.getItem("ai-assistant-sidebar") === "closed") setSidebarOpen(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-assistant-draft", inputPrompt);
    } catch {}
  }, [inputPrompt]);

  useEffect(() => {
    try {
      if (activeSessionId) localStorage.setItem("ai-assistant-last-session", activeSessionId);
    } catch {}
  }, [activeSessionId]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch("/api/ai/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setPersistenceReady(true);
        return data.sessions || [];
      }
      if (res.status === 503) setPersistenceReady(false);
    } catch {
      // im lặng, vẫn chat được
    } finally {
      setLoadingSessions(false);
    }
    return [];
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true);
      setActiveSessionId(sessionId);
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const rows = data.messages || [];
        setMessages(rows.map(toChatMessage));
        if (data.session?.mode) setActiveMode(data.session.mode);
        setExpandedTools({});
      }
    } catch {
      // giữ nguyên khung chat
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchSessions().then((list: ChatSession[]) => {
      try {
        const last = localStorage.getItem("ai-assistant-last-session");
        if (last && list.some((s) => s.id === last)) {
          loadSessionMessages(last);
          return;
        }
      } catch {}
      if (list.length > 0) loadSessionMessages(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = async () => {
    setActiveMode("query");
    setSelectedIngestType("work_report");
    setInputPrompt("");
    setExpandedTools({});
    setConfirmingId(null);
    setMessages([]);
    try {
      const res = await fetch("/api/ai/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Đoạn chat mới", mode: "query" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setActiveSessionId(data.session.id);
          setSessions((prev) => [data.session, ...prev]);
          return;
        }
      }
      if (res.status === 503) setPersistenceReady(false);
      setActiveSessionId(null);
    } catch {
      setActiveSessionId(null);
    }
    textareaRef.current?.focus();
  };

  const handleClearChat = () => {
    setInputPrompt("");
    setExpandedTools({});
    setConfirmingId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const handleSelectSession = (id: string) => {
    if (id === activeSessionId || sending) return;
    loadSessionMessages(id);
  };

  const handleRenameSession = async (id: string) => {
    const title = editTitle.trim();
    setEditingSessionId(null);
    if (!title) return;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: title.slice(0, 120) } : s)));
    try {
      await fetch(`/api/ai/chat/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch {}
  };

  const handlePinSession = async (id: string, pinned: boolean) => {
    setSessions((prev) =>
      [...prev.map((s) => (s.id === id ? { ...s, pinned } : s))].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt)
      )
    );
    try {
      await fetch(`/api/ai/chat/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
    } catch {}
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Xóa phiên chat này?")) return;
    const backup = sessions;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    try {
      const res = await fetch(`/api/ai/chat/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) setSessions(backup);
    } catch {
      setSessions(backup);
    }
  };

  const toggleToolDetails = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStepDetails = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentActionMeta = INGESTION_ACTIONS.find((a) => a.type === selectedIngestType);

  const handleSendMessage = async (promptToSend?: string, overrideMode?: "query" | "ingest") => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || sending) return;

    const mode = overrideMode || activeMode;
    let sessionId = activeSessionId;
    if (!sessionId && persistenceReady) {
      try {
        const res = await fetch("/api/ai/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: prompt.slice(0, 60), mode }),
        });
        if (res.ok) {
          const data = await res.json();
          sessionId = data.session.id;
          setActiveSessionId(sessionId);
          setSessions((prev) => [data.session, ...prev]);
        }
      } catch {}
    }

    setMessages((prev) => [
      ...prev,
      { id: "user-" + Date.now(), role: "user", content: prompt, timestamp: "" },
    ]);
    setInputPrompt("");
    try {
      localStorage.setItem("ai-assistant-draft", "");
    } catch {}
    setSending(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          actionType: mode === "ingest" ? selectedIngestType : undefined,
          sessionId,
        }),
      });
      if (!res.ok) throw new Error("Lỗi kết nối AI Assistant");

      const data = await res.json();
      if (data.sessionId && data.sessionId !== sessionId) {
        setActiveSessionId(data.sessionId);
        sessionId = data.sessionId;
      }
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        setPersistenceReady(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          role: "assistant",
          content: data.answer || "Không có phản hồi từ mô hình.",
          timestamp: "",
          toolsUsed: data.toolsUsed,
          dataSources: data.dataSources,
          permissionWarnings: data.permissionWarnings,
          actionProposal: data.proposal || data.actionProposal || undefined,
          steps: data.steps,
        },
      ]);
      if (!data.isActionProposal && mode === "ingest") setActiveMode("query");
      fetchSessions();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: "err-" + Date.now(), role: "assistant", content: `Có lỗi xảy ra: ${err.message}`, timestamp: "" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) handleSendMessage(lastUser.content);
  };

  const handleConfirmAction = async (msgId: string, proposal: AiActionProposal) => {
    setConfirmingId(msgId);

    // 1. Chuyển ngay trạng thái sang 'confirming' để UI thông báo AI đang tự chủ đối soát & thực thi
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.actionProposal
          ? {
              ...m,
              actionProposal: {
                ...m.actionProposal,
                status: "confirming",
              },
            }
          : m
      )
    );

    try {
      const isDbId = UUID_RE.test(msgId);
      const res = await fetch("/api/ai/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: proposal.actionType,
          draftPayload: proposal.draftPayload,
          aiRunId: proposal.aiRunId,
          chatSessionId: activeSessionId || undefined,
          chatMessageId: isDbId ? msgId : undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === msgId && m.actionProposal
              ? {
                  ...m,
                  actionProposal: {
                    ...m.actionProposal,
                    status: "confirmed" as const,
                    createdRecordCode: data.recordCode,
                    createdRecordUrl: data.recordUrl,
                    autoFixed: Boolean(data.autoFixed),
                    fixExplanation: data.fixExplanation,
                  },
                }
              : m
          );

          if (data.autoFixed) {
            updated.push({
              id: "bot-fixed-" + Date.now(),
              role: "assistant",
              content: `✨ **AI đã tự động chuẩn hóa dữ liệu & lưu thành công chứng từ:**\n- **Mã chứng từ:** [${data.recordCode}](${data.recordUrl})\n- **Chi tiết xử lý:** ${data.fixExplanation || "Đã tự động liên kết với thực thể hợp lệ trong hệ thống."}`,
              timestamp: new Date().toLocaleTimeString("vi-VN"),
            });
          }
          return updated;
        });
      } else {
        // AI Remediation phát hiện ràng buộc nghiệp vụ cần người dùng quyết định
        const explanation =
          data.explanation || data.error || "AI phát hiện ràng buộc nghiệp vụ chưa khớp để ghi nhận.";

        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === msgId && m.actionProposal
              ? {
                  ...m,
                  actionProposal: {
                    ...m.actionProposal,
                    status: "needs_adjustment" as const,
                    errorMessage: explanation,
                  },
                }
              : m
          ),
          {
            id: "bot-clarify-" + Date.now(),
            role: "assistant",
            content: `⚠️ **AI cần thêm thông tin để hoàn tất chứng từ:**\n${explanation}\n\n*Bạn có thể trả lời trực tiếp trong ô chat bên dưới để AI tự động cập nhật lại bản nháp.*`,
            timestamp: new Date().toLocaleTimeString("vi-VN"),
          },
        ]);
      }
    } catch (err: any) {
      // Gián đoạn mạng hoặc ngoại lệ: Báo êm trong chat, tuyệt đối không dùng alert thô thiển
      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === msgId && m.actionProposal
            ? {
                ...m,
                actionProposal: {
                  ...m.actionProposal,
                  status: "needs_adjustment" as const,
                  errorMessage: err.message,
                },
              }
            : m
        ),
        {
          id: "bot-err-" + Date.now(),
          role: "assistant",
          content: `⚠️ Quá trình xác nhận gặp gián đoạn kết nối: "${err.message}". Bạn có thể nhấn 'Thử lưu lại' hoặc nhắn tiếp để AI điều chỉnh.`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      ]);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelAction = async (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.actionProposal
          ? { ...m, actionProposal: { ...m.actionProposal, status: "cancelled" } }
          : m
      )
    );
    try {
      if (activeSessionId && UUID_RE.test(msgId)) {
        await fetch(`/api/ai/chat/sessions/${activeSessionId}/messages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msgId, status: "cancelled" }),
        });
      }
    } catch {}
  };

  const filteredSessions = sessions.filter((s) =>
    sessionSearch.trim() ? s.title.toLowerCase().includes(sessionSearch.trim().toLowerCase()) : true
  );

  const switchMode = (mode: "query" | "ingest") => {
    setActiveMode(mode);
    textareaRef.current?.focus();
  };

  // Dòng gõ chữ chạy năng lực ở màn chào
  const [typedLine, setTypedLine] = useState("");
  useEffect(() => {
    if (!showHero) return;
    const lines =
      activeMode === "ingest"
        ? [
            "Bóc tách nhật trình thi công...",
            "Lập phiếu xuất kho trong một câu...",
            "Soạn biên bản nghiệm thu...",
            "Ghi phiếu chi phát sinh...",
          ]
        : [
            "Tồn kho còn bao nhiêu?",
            "Tuần này thợ nào làm gì?",
            "Công nợ phải thu bao nhiêu?",
          ];
    let li = 0;
    let ci = 0;
    let del = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const line = lines[li];
      if (!del) {
        ci++;
        if (ci >= line.length + 16) del = true;
      } else {
        ci--;
        if (ci <= 0) {
          del = false;
          li = (li + 1) % lines.length;
        }
      }
      setTypedLine(lines[li].slice(0, Math.max(0, Math.min(ci, lines[li].length))));
      timer = setTimeout(tick, del ? 26 : 52);
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHero, activeMode]);

  const toggleSidebar = () => {
    setSidebarOpen((v) => {
      try { localStorage.setItem("ai-assistant-sidebar", v ? "closed" : "open"); } catch {}
      return !v;
    });
  };

  // Gợi ý chỉ điền sẵn vào ô nhập để người dùng viết tiếp, không gửi luôn
  const applyPrompt = (text: string) => {
    const withSpace = text.endsWith(" ") ? text : text + " ";
    setInputPrompt(withSpace);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-row h-full w-full bg-white overflow-hidden">
      <style>{`
        @keyframes astraRise { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes astraSlide { 0% { transform: translateX(-110%); } 100% { transform: translateX(320%); } }
        @keyframes astraBlink { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }
        @keyframes astraPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .astra-rise { opacity: 0; animation: astraRise .55s cubic-bezier(.22,1,.36,1) forwards; }
        .astra-thinkbar { position: relative; overflow: hidden; height: 4px; border-radius: 999px; background: #e2e8f0; }
        .astra-thinkbar > div { position: absolute; top: 0; bottom: 0; width: 36%; border-radius: 999px;
          background: #0f172a; animation: astraSlide 1.1s ease-in-out infinite; }
        .astra-dot { animation: astraBlink 1.2s infinite; }
        .astra-dot:nth-child(2) { animation-delay: .2s; }
        .astra-dot:nth-child(3) { animation-delay: .4s; }
        .astra-live { animation: astraPulse 1.6s ease-in-out infinite; }
        @keyframes agentSpin { to { transform: rotate(360deg); } }
        @keyframes agentSpinRev { to { transform: rotate(-360deg); } }
        .agent-orbit { position: absolute; inset: 0; border-radius: 9999px;
          border: 1px dashed rgba(15,23,42,.25); animation: agentSpin 16s linear infinite; }
        .agent-orbit-rev { position: absolute; inset: 14px; animation: agentSpinRev 10s linear infinite; }
        .agent-orbit-rev > i { position: absolute; width: 7px; height: 7px; border-radius: 9999px; }
        @keyframes agentPing { 0% { transform: scale(.55); opacity: .7; } 100% { transform: scale(1.3); opacity: 0; } }
        .agent-ping { position: absolute; inset: 0; border-radius: 9999px;
          border: 2px solid rgba(15,23,42,.18); animation: agentPing 2.8s ease-out infinite; }
        @keyframes agentCoreSpin { to { transform: rotate(360deg); } }
        .agent-core-ring { position: absolute; inset: 2px; border-radius: 9999px;
          background: conic-gradient(from 0deg, transparent 0deg, rgba(16,185,129,.6) 55deg, rgba(14,165,233,.6) 115deg, transparent 175deg, transparent 360deg);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
          animation: agentCoreSpin 6s linear infinite; }
        .agent-core-badge { border-radius: 20px; padding: 3px;
          background: linear-gradient(135deg, #0f172a, #334155);
          box-shadow: 0 10px 34px rgba(15,23,42,.28), 0 0 0 1px rgba(255,255,255,.65); }
        @keyframes agentFlow { to { background-position-x: 16px; } }
        .agent-link { width: 26px; height: 2px; flex-shrink: 0;
          background: repeating-linear-gradient(90deg, #94a3b8 0 4px, transparent 4px 8px);
          animation: agentFlow .8s linear infinite; }
        @keyframes agentSweep { to { transform: translateX(380%) skewX(-12deg); } }
        .agent-card { position: relative; overflow: hidden; }
        .agent-sweep { position: absolute; top: 0; bottom: 0; left: 0; width: 35%; pointer-events: none;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.75), transparent);
          transform: translateX(-160%) skewX(-12deg); animation: agentSweep 1s ease forwards; }
        @keyframes caretBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .agent-caret { display: inline-block; width: 2px; height: 1em; vertical-align: -2px; margin-left: 2px;
          background: currentColor; animation: caretBlink 1s infinite; }
        @keyframes universeDrift {
          from { background-position: 0% 0%, 100% 0%, 50% 100%; }
          to { background-position: 30% 12%, 70% 10%, 50% 88%; }
        }
        .universe-query { background:
          radial-gradient(900px 500px at 15% 0%, rgba(191,219,254,.85), transparent 62%),
          radial-gradient(820px 500px at 85% 12%, rgba(186,230,253,.8), transparent 62%),
          radial-gradient(1000px 620px at 50% 112%, rgba(221,214,254,.85), transparent 62%),
          #f6f9ff;
          background-size: 180% 180%, 180% 180%, 180% 180%, auto;
          animation: universeDrift 60s ease-in-out infinite alternate; }
        .universe-agent { background:
          radial-gradient(900px 500px at 12% 4%, rgba(221,214,254,.9), transparent 62%),
          radial-gradient(820px 500px at 88% 10%, rgba(249,168,212,.55), transparent 62%),
          radial-gradient(1000px 620px at 50% 112%, rgba(186,230,253,.85), transparent 62%),
          #faf8ff;
          background-size: 180% 180%, 180% 180%, 180% 180%, auto;
          animation: universeDrift 60s ease-in-out infinite alternate; }
        .starfield { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .stars { position: absolute; inset: 0; }
        .stars-a { background-image:
          radial-gradient(1px 1px at 12% 22%, rgba(71,85,105,.5), transparent),
          radial-gradient(1.5px 1.5px at 68% 8%, rgba(124,58,237,.45), transparent),
          radial-gradient(1px 1px at 42% 65%, rgba(14,165,233,.5), transparent),
          radial-gradient(1px 1px at 82% 42%, rgba(71,85,105,.45), transparent),
          radial-gradient(1.5px 1.5px at 28% 82%, rgba(124,58,237,.4), transparent),
          radial-gradient(1px 1px at 55% 30%, rgba(217,70,239,.45), transparent),
          radial-gradient(1px 1px at 5% 55%, rgba(71,85,105,.4), transparent),
          radial-gradient(1px 1px at 92% 75%, rgba(14,165,233,.45), transparent);
          background-size: 340px 340px;
          animation: starTwinkle 2.2s ease-in-out infinite alternate, starDrift 45s ease-in-out infinite alternate; }
        .stars-b { background-image:
          radial-gradient(1px 1px at 22% 12%, rgba(71,85,105,.45), transparent),
          radial-gradient(1px 1px at 74% 58%, rgba(14,165,233,.45), transparent),
          radial-gradient(2px 2px at 48% 88%, rgba(124,58,237,.4), transparent),
          radial-gradient(1px 1px at 88% 22%, rgba(71,85,105,.4), transparent),
          radial-gradient(1px 1px at 8% 78%, rgba(217,70,239,.4), transparent),
          radial-gradient(1.5px 1.5px at 60% 40%, rgba(71,85,105,.45), transparent);
          background-size: 460px 460px;
          animation: starTwinkle 3s ease-in-out infinite alternate-reverse, starDrift 65s ease-in-out infinite alternate-reverse; }
        .stars-c { background-image:
          radial-gradient(2px 2px at 30% 40%, rgba(124,58,237,.35), transparent),
          radial-gradient(1px 1px at 70% 75%, rgba(71,85,105,.4), transparent),
          radial-gradient(2px 2px at 85% 15%, rgba(14,165,233,.4), transparent),
          radial-gradient(1px 1px at 15% 85%, rgba(71,85,105,.35), transparent);
          background-size: 560px 560px;
          animation: starTwinkle 3.8s ease-in-out infinite alternate, starDrift 85s ease-in-out infinite alternate; }
        @keyframes starTwinkle { from { opacity: .25; } to { opacity: 1; } }
        @keyframes starDrift { from { transform: translate3d(0,0,0); } to { transform: translate3d(-110px,64px,0); } }
        @keyframes agentDrift {
          from { background-position: 0% 0%, 100% 0%, 90% 100%, 0% 100%; }
          to { background-position: 30% 12%, 70% 10%, 70% 88%, 20% 88%; }
        }
        .agent-canvas {
          background-color: #fafaff;
          background-image:
            radial-gradient(760px 360px at 10% 4%, rgba(124,58,237,.28), transparent 65%),
            radial-gradient(780px 360px at 90% 12%, rgba(217,70,239,.24), transparent 65%),
            radial-gradient(620px 320px at 82% 88%, rgba(14,165,233,.26), transparent 65%),
            radial-gradient(680px 340px at 8% 92%, rgba(52,211,153,.20), transparent 65%);
          background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%;
          animation: agentDrift 55s ease-in-out infinite alternate;
        }
        @keyframes astraOrbit {
          0% { transform: rotate(0deg); animation-timing-function: cubic-bezier(.45,0,.55,1); }
          30% { transform: rotate(160deg); animation-timing-function: cubic-bezier(.3,.7,.4,1); }
          55% { transform: rotate(205deg); animation-timing-function: cubic-bezier(.6,.05,.3,1); }
          80% { transform: rotate(320deg); animation-timing-function: cubic-bezier(.4,0,.6,1); }
          100% { transform: rotate(360deg); }
        }
        @keyframes astraOrbitRev {
          0% { transform: rotate(360deg); animation-timing-function: cubic-bezier(.4,0,.6,1); }
          35% { transform: rotate(200deg); animation-timing-function: cubic-bezier(.6,.05,.3,1); }
          65% { transform: rotate(150deg); animation-timing-function: cubic-bezier(.3,.7,.4,1); }
          100% { transform: rotate(0deg); }
        }
        @keyframes astraHue { to { filter: hue-rotate(360deg); } }
        .astra-frame { position: relative; border-radius: 30px; padding: 2px; overflow: hidden;
          background: linear-gradient(135deg, #ede9fe, #fae8ff, #e0f2fe); }
        .astra-frame::before { content: ""; position: absolute; inset: -70%;
          background: conic-gradient(from 0deg,
            transparent 0deg, #c4b5fd 22deg, #f0abfc 38deg, transparent 66deg,
            transparent 170deg, #bae6fd 196deg, #a5f3fc 212deg, transparent 242deg,
            transparent 360deg);
          animation: astraOrbit 5.5s infinite, astraHue 14s linear infinite; }
        .astra-frame::after { content: ""; position: absolute; inset: -70%;
          background: conic-gradient(from 180deg,
            transparent 0deg, transparent 310deg, rgba(196,181,253,.8) 335deg, transparent 360deg);
          animation: astraOrbitRev 8.5s infinite, astraHue 18s linear infinite reverse; }
        .astra-frame > form { position: relative; z-index: 1; border-radius: 28px; }
      `}</style>

      {/* ===== SIDEBAR ===== */}
      <aside className={`${sidebarOpen ? "w-72 sm:w-80 border-r" : "w-0 border-r-0"} h-full border-slate-200 bg-slate-50/80 flex flex-col shrink-0 z-10 overflow-hidden transition-[width] duration-300`}>
        <div className="w-72 sm:w-80 flex flex-col h-full shrink-0">
        <div className="p-3 flex items-center gap-1.5">
          <button
            onClick={toggleSidebar}
            title="Thu gọn thanh bên"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <SLogo size={30} />
          <span className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Signage AI Assistant</span>
          <div className="flex-1" />
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mới</span>
          </button>
          <button
            onClick={handleClearChat}
            title="Xóa màn hình"
            className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 pb-2">
          <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-2xl text-[13px] font-semibold">
            <button
              onClick={() => switchMode("query")}
              className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeMode === "query" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Tra cứu</span>
            </button>
            <button
              onClick={() => switchMode("ingest")}
              className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeMode === "ingest" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Agent</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4" key={activeMode}>
          {/* Phiên chat */}
          <div>
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Tìm đoạn chat"
                className="w-full text-[13px] pl-9 pr-8 py-2 border-0 rounded-full bg-slate-200/60 outline-none focus:bg-white focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400 transition"
              />
              <button
                onClick={fetchSessions}
                title="Làm mới"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? "animate-spin" : ""}`} />
              </button>
            </div>
            {loadingSessions && sessions.length === 0 ? (
              <div className="text-[13px] text-slate-400 px-2 py-2">Đang tải...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-[13px] text-slate-400 px-2 py-2">
                {sessions.length === 0 ? "Chưa có đoạn chat nào." : "Không tìm thấy."}
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const isEditing = editingSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`group w-full flex items-center gap-1 px-2.5 py-2 rounded-2xl text-[13px] transition ${
                      isActive ? "bg-slate-900 text-white shadow" : "text-slate-700 hover:bg-slate-200/70"
                    }`}
                  >
                    <button onClick={() => handleSelectSession(s.id)} className="flex-1 flex items-center gap-2 min-w-0 text-left">
                      {s.pinned ? (
                        <Pin className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      ) : (
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      )}
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSession(s.id);
                            if (e.key === "Escape") setEditingSessionId(null);
                          }}
                          onBlur={() => handleRenameSession(s.id)}
                          className="flex-1 min-w-0 text-[13px] px-1.5 py-0.5 rounded-lg border border-slate-400 text-slate-900 outline-none"
                        />
                      ) : (
                        <span className="truncate flex-1">{s.title}</span>
                      )}
                    </button>
                    {isEditing ? (
                      <button onClick={() => handleRenameSession(s.id)} className="p-1 rounded-full hover:bg-white/20" title="Lưu">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className={`flex items-center shrink-0 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"} ${isActive ? "text-white" : "text-slate-500"}`}>
                        <button
                          onClick={() => { setEditingSessionId(s.id); setEditTitle(s.title); }}
                          className="p-1.5 rounded-full hover:bg-black/10"
                          title="Đổi tên"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePinSession(s.id, !s.pinned)}
                          className="p-1.5 rounded-full hover:bg-black/10"
                          title={s.pinned ? "Bỏ ghim" : "Ghim"}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-1.5 rounded-full hover:bg-red-500/20 hover:text-red-500"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Tiện ích theo chế độ */}
          {activeMode === "query" ? (
            <div className="grid grid-cols-2 gap-1.5">
              {QUERY_TOPICS.map((topic) => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.id}
                    onClick={() => applyPrompt(topic.prompt)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 hover:shadow transition text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="truncate">{topic.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {INGESTION_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isSelected = selectedIngestType === action.type;
                return (
                  <button
                    key={action.type}
                    onClick={() => { setSelectedIngestType(action.type); textareaRef.current?.focus(); }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition ${
                      isSelected
                        ? "bg-white border-slate-900 shadow ring-1 ring-slate-200"
                        : "bg-white/70 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-900 truncate">{action.title}</span>
                      <span className="block text-xs text-slate-500 truncate">{action.desc}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-slate-900 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </aside>

      {/* ===== KHUNG CHAT ===== */}
      <div className={`relative flex-1 flex flex-col h-full min-w-0 overflow-hidden transition-colors duration-500 ${showHero ? (activeMode === "ingest" ? "universe-agent" : "universe-query") : activeMode === "ingest" ? "agent-canvas" : "bg-white"}`}>
        {showHero && (
          <div className="starfield" aria-hidden="true">
            <div className="stars stars-a" />
            <div className="stars stars-b" />
            <div className="stars stars-c" />
          </div>
        )}
        {sidebarOpen && (
        <header className={`relative min-h-14 border-b px-4 py-2 flex items-center gap-2 shrink-0 ${activeMode === "ingest" ? "border-transparent bg-white/60 backdrop-blur" : "border-slate-100 bg-white/90 backdrop-blur"}`}>
          <SLogo size={26} />
          <span className="font-semibold text-slate-900 text-sm truncate">
            {activeMode === "query" ? "Trợ Lý Tra Cứu Điều Hành" : "AI Agent"}
          </span>

          <div className="flex-1 min-w-0 text-center">
            <span className="text-[13px] text-slate-500 truncate inline-block max-w-full">
              {sessions.find((s) => s.id === activeSessionId)?.title || ""}
            </span>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={sending || !messages.some((m) => m.role === "user")}
            title="Gửi lại câu hỏi cuối"
            className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-30"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleNewChat}
            title="Đoạn chat mới"
            className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </header>
        )}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            title="Mở thanh bên"
            className="astra-rise absolute top-3 left-3 z-20 p-2 rounded-full bg-white/85 backdrop-blur border border-slate-200 shadow text-slate-500 hover:text-slate-900 transition"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}

        {/* Feed */}
        <div className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {loadingMessages ? (
              <div className="flex items-center gap-3">
                <SLogo size={30} />
                <div className="flex-1 max-w-xs">
                  <div className="text-slate-900 text-sm font-semibold mb-2">Đang mở lại đoạn chat</div>
                  <div className="astra-thinkbar"><div /></div>
                </div>
              </div>
            ) : showHero ? (
              <div className="pt-6 pb-2 text-center" key={activeMode}>
                {activeMode === "ingest" ? (
                  <div className="relative mx-auto mb-4" style={{ width: 132, height: 132 }}>
                    <div className="agent-ping" />
                    <div className="agent-core-ring" />
                    <div className="agent-orbit-rev">
                      <i style={{ top: 2, left: "50%", background: "#10b981" }} />
                      <i style={{ bottom: 12, left: 10, background: "#0ea5e9" }} />
                      <i style={{ bottom: 12, right: 10, background: "#d946ef" }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="agent-core-badge">
                        <SLogo size={52} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center mb-5">
                    <SLogo size={60} />
                  </div>
                )}
                <h1 className="astra-rise text-3xl md:text-4xl font-bold tracking-tight text-slate-900" style={{ animationDelay: "60ms" }}>
                  {activeMode === "ingest" ? "AI Agent" : "Xin chào"}
                </h1>
                {activeMode === "ingest" && (
                  <div className="astra-rise flex justify-center mt-3" style={{ animationDelay: "100ms" }}>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <span className="astra-live w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      AGENT MODE
                    </span>
                  </div>
                )}
                <p className="astra-rise text-slate-500 text-[15px] mt-2" style={{ animationDelay: "130ms" }}>
                  {activeMode === "query"
                    ? "Trợ lý Signage ERP — hỏi về tồn kho, tiến độ, công nợ, nhân sự."
                    : "Mô tả việc cần làm — Agent tự đọc ERP và soạn bản nháp."}
                </p>
                <div className="astra-rise font-mono text-sm text-slate-700 mt-2 mb-5 min-h-6" style={{ animationDelay: "170ms" }}>
                  <span className="text-slate-500 mr-1.5">›</span>
                  {typedLine}
                  <span className="agent-caret" />
                </div>
                {activeMode === "query" && (
                  <div className="grid grid-cols-2 gap-2.5 text-left">
                    {QUERY_TOPICS.map((topic, i) => {
                      const Icon = topic.icon;
                      return (
                        <button
                          key={topic.id}
                          style={{ animationDelay: `${180 + i * 55}ms` }}
                          onClick={() => applyPrompt(topic.prompt)}
                          className="astra-rise flex items-center gap-2.5 p-3.5 rounded-3xl bg-white/70 hover:bg-white border border-white/60 hover:border-slate-300 hover:shadow transition text-left group backdrop-blur"
                        >
                          <span className="w-9 h-9 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                            <Icon className="w-4 h-4 text-white" />
                          </span>
                          <span className="text-sm font-medium text-slate-700">{topic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && <SLogo size={28} />}

                  <div
                    className={`max-w-[92%] text-[15px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-slate-100 text-slate-900 rounded-3xl rounded-br-lg px-4 py-2.5"
                        : "flex-1 text-slate-800 space-y-3 min-w-0"
                    }`}
                  >
                    {m.role === "assistant" && m.steps && m.steps.length > 0 && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-2.5 space-y-2 text-xs">
                        <button
                          onClick={() => toggleStepDetails(m.id)}
                          className="w-full flex items-center justify-between text-indigo-900 hover:text-indigo-700 transition font-medium text-left"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">Tiến trình ReAct Agent ({m.steps.length} bước tự chủ)</span>
                          </span>
                          {expandedSteps[m.id] ? (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          )}
                        </button>

                        {expandedSteps[m.id] && (
                          <div className="space-y-2 pt-1 border-t border-indigo-100/80">
                            {m.steps.map((st) => (
                              <div
                                key={st.step}
                                className="rounded-xl bg-white border border-indigo-100 p-2.5 space-y-1.5 shadow-sm"
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                  <span className="flex items-center gap-1.5 text-indigo-700">
                                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[10px]">
                                      {st.step}
                                    </span>
                                    <span>Bước {st.step}</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {st.toolCalls && st.toolCalls.length > 0
                                      ? `${st.toolCalls.length} công cụ`
                                      : "Lập luận & Tổng hợp"}
                                  </span>
                                </div>

                                {st.thought && (
                                  <div className="text-slate-700 italic bg-slate-50 rounded-lg p-2 border-l-2 border-indigo-400 text-[12px] leading-relaxed">
                                    💭 {st.thought}
                                  </div>
                                )}

                                {st.toolCalls && st.toolCalls.length > 0 && (
                                  <div className="space-y-1">
                                    {st.toolCalls.map((tc, tcIdx) => (
                                      <div
                                        key={tcIdx}
                                        className="font-mono text-[11px] bg-slate-900 text-slate-200 rounded-lg p-2"
                                      >
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                                          <Terminal className="w-3 h-3 shrink-0" />
                                          <span>{tc.name}</span>
                                        </div>
                                        {tc.args && Object.keys(tc.args).length > 0 && (
                                          <pre className="text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(tc.args, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {st.toolResults && st.toolResults.length > 0 && (
                                  <div className="space-y-1">
                                    {st.toolResults.map((tr, trIdx) => (
                                      <div
                                        key={trIdx}
                                        className="text-[11px] bg-slate-100 text-slate-700 rounded-lg p-2 font-mono"
                                      >
                                        <span className="font-bold text-slate-800">
                                          Kết quả [{tr.name}]:
                                        </span>{" "}
                                        {tr.error ? (
                                          <span className="text-rose-600 font-semibold">{tr.error}</span>
                                        ) : (
                                          <span className="text-slate-600">
                                            {typeof tr.response === "object"
                                              ? JSON.stringify(tr.response).slice(0, 300) +
                                                (JSON.stringify(tr.response).length > 300 ? "..." : "")
                                              : String(tr.response)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {m.role === "assistant" && m.toolsUsed && m.toolsUsed.length > 0 && (
                      <button
                        onClick={() => toggleToolDetails(m.id)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{m.toolsUsed.length} nguồn dữ liệu</span>
                        {expandedTools[m.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    )}
                    {expandedTools[m.id] && m.dataSources && m.dataSources.length > 0 && (
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 space-y-1 text-xs">
                        {m.dataSources.map((ds, dsIdx) => (
                          <div key={dsIdx} className="flex justify-between gap-2 text-slate-600">
                            <span className="font-medium text-slate-800">{ds.title}</span>
                            <span className="text-slate-400 text-right">{ds.summary}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.permissionWarnings && m.permissionWarnings.length > 0 && (
                      <div className="rounded-2xl bg-amber-50 text-amber-900 text-[13px] p-3 space-y-1">
                        {m.permissionWarnings.map((warn, wIdx) => (
                          <div key={wIdx} className="flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.role === "assistant" ? (
                      <div className="overflow-x-auto">
                        <MarkdownRenderer content={m.content} />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}

                    {m.actionProposal && (
                      <div className="mt-2 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                            <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                            <span className="truncate">{m.actionProposal.actionTitle}</span>
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              m.actionProposal.status === "confirmed"
                                ? "bg-slate-900 text-white"
                                : m.actionProposal.status === "confirming"
                                ? "bg-indigo-600 text-white animate-pulse"
                                : m.actionProposal.status === "needs_adjustment"
                                ? "bg-amber-100 text-amber-900"
                                : m.actionProposal.status === "cancelled"
                                ? "bg-slate-200 text-slate-500"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {m.actionProposal.status === "confirmed"
                              ? "ĐÃ LƯU"
                              : m.actionProposal.status === "confirming"
                              ? "AI ĐANG TỰ LƯU"
                              : m.actionProposal.status === "needs_adjustment"
                              ? "CẦN ĐIỀU CHỈNH"
                              : m.actionProposal.status === "cancelled"
                              ? "ĐÃ HỦY"
                              : "CHỜ DUYỆT"}
                          </span>
                        </div>

                        <div className="text-[13px] text-slate-500">{m.actionProposal.summary}</div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                          {m.actionProposal.matchedEntities.project && (
                            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
                              <div className="text-xs text-slate-400">Dự án</div>
                              <div className="font-semibold text-slate-900">
                                {m.actionProposal.matchedEntities.project.name}
                              </div>
                            </div>
                          )}
                          {m.actionProposal.matchedEntities.task && (
                            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
                              <div className="text-xs text-slate-400">Hạng mục</div>
                              <div className="font-semibold text-slate-900">
                                {m.actionProposal.matchedEntities.task.title}
                              </div>
                            </div>
                          )}
                          {m.actionProposal.matchedEntities.warehouse && (
                            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
                              <div className="text-xs text-slate-400">Kho xuất</div>
                              <div className="font-semibold text-slate-900">
                                {m.actionProposal.matchedEntities.warehouse.name}
                              </div>
                            </div>
                          )}
                          {m.actionProposal.matchedEntities.cashAccount && (
                            <div className="rounded-2xl bg-white border border-slate-100 px-3 py-2">
                              <div className="text-xs text-slate-400">Quỹ</div>
                              <div className="font-semibold text-slate-900">
                                {m.actionProposal.matchedEntities.cashAccount.name}
                              </div>
                            </div>
                          )}
                        </div>

                        {m.actionProposal.matchedEntities.items && m.actionProposal.matchedEntities.items.length > 0 && (
                          <div className="space-y-1">
                            {m.actionProposal.matchedEntities.items.map((item, iIdx) => (
                              <div key={iIdx} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-1.5 rounded-2xl text-[13px]">
                                <span className="text-slate-700 truncate">
                                  <strong>{item.code}</strong> · {item.name}
                                </span>
                                <span className="font-semibold text-slate-900 shrink-0 ml-2">
                                  {item.qty} {item.unitName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.actionProposal.matchedEntities.tasks && m.actionProposal.matchedEntities.tasks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                              <span>Danh sách hạng mục công việc ({m.actionProposal.matchedEntities.tasks.length} task):</span>
                              <span className="text-[11px] text-blue-600 font-mono">Đồng bộ lên {m.actionProposal.draftPayload.completionPercentage}%</span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                              {m.actionProposal.matchedEntities.tasks.map((t, tIdx) => (
                                <div key={tIdx} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-1.5 rounded-xl text-xs">
                                  <span className="text-slate-700 truncate mr-2">
                                    <strong className="text-slate-900">{t.code}</strong> · {t.title}
                                  </span>
                                  <span className="font-semibold text-slate-500 shrink-0 font-mono text-[11px]">
                                    {t.currentProgress}% ➔ <strong className="text-emerald-600">{t.newProgress}%</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.actionProposal.draftPayload.completionPercentage !== undefined && (
                          <div className="flex items-center gap-4 text-[13px]">
                            <span className="text-slate-500">
                              Tiến độ <strong className="text-slate-900">{m.actionProposal.draftPayload.completionPercentage}%</strong>
                            </span>
                            {m.actionProposal.draftPayload.workDate && (
                              <span className="text-slate-500">
                                Ngày <span className="text-slate-800">{m.actionProposal.draftPayload.workDate}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {m.actionProposal.draftPayload.amount && (
                          <div className="text-sm">
                            <strong className="text-slate-900 text-base">
                              {Number(m.actionProposal.draftPayload.amount).toLocaleString("vi-VN")} VNĐ
                            </strong>
                          </div>
                        )}

                        {m.actionProposal.status === "pending_confirmation" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmAction(m.id, m.actionProposal!)}
                              disabled={confirmingId === m.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-700 text-white rounded-full text-sm font-semibold transition disabled:opacity-60"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Xác nhận lưu</span>
                            </button>
                            <button
                              onClick={() => handleCancelAction(m.id)}
                              disabled={confirmingId === m.id}
                              className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium transition"
                            >
                              Hủy
                            </button>
                          </div>
                        )}

                        {m.actionProposal.status === "confirming" && (
                          <div className="rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 p-3 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-xs">
                              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                              <span>AI đang tự chủ thực thi & đối soát ghi nhận vào ERP...</span>
                            </div>
                            <div className="text-[11px] text-indigo-700">
                              Đang kiểm tra tính toàn vẹn dữ liệu, các ràng buộc hệ thống và hoàn tất chứng từ.
                            </div>
                            <div className="astra-thinkbar"><div /></div>
                          </div>
                        )}

                        {m.actionProposal.status === "needs_adjustment" && (
                          <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 space-y-2 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-rose-700">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Lưu thất bại - Cần kiểm tra lại dữ liệu</span>
                            </div>
                            <div className="text-rose-800 leading-relaxed text-[11px] bg-white/70 p-2 rounded-lg border border-rose-100">
                              {m.actionProposal.errorMessage || "Không thể lưu vào cơ sở dữ liệu. Vui lòng kiểm tra lại kết nối hoặc thông số dữ liệu."}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleConfirmAction(m.id, m.actionProposal!)}
                                disabled={confirmingId === m.id}
                                className="flex-1 py-1.5 px-3 bg-rose-700 text-white rounded-full text-xs font-semibold hover:bg-rose-800 transition"
                              >
                                Thử lưu lại
                              </button>
                              <button
                                onClick={() => handleCancelAction(m.id)}
                                className="py-1.5 px-3 border border-rose-300 rounded-full text-xs text-rose-800 hover:bg-rose-100 transition"
                              >
                                Hủy bản nháp
                              </button>
                            </div>
                          </div>
                        )}

                        {m.actionProposal.status === "confirmed" && (
                          <div className="space-y-2">
                            {m.actionProposal.autoFixed && (
                              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 text-xs flex items-center gap-1.5 font-medium">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{m.actionProposal.fixExplanation || "AI đã tự động chuẩn hóa dữ liệu & ghi nhận thành công."}</span>
                              </div>
                            )}
                            <div className="rounded-2xl bg-slate-900 text-white text-[13px] px-3.5 py-2.5 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Đã lưu vào hệ thống</span>
                              </span>
                              {m.actionProposal.createdRecordUrl && (
                                <a href={m.actionProposal.createdRecordUrl} className="text-xs underline flex items-center gap-1 shrink-0">
                                  <span>Xem chứng từ</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex gap-3 items-start astra-rise">
                <SLogo size={28} />
                <div className="flex-1 max-w-md pt-0.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-slate-800 animate-spin shrink-0" />
                    <span className="text-sm font-semibold text-slate-900">
                      {activeMode === "ingest"
                        ? "AI Agent đang tự chủ điều phối tác vụ"
                        : "AI Assistant đang phân tích & truy vấn ERP"}
                      <span className="astra-dot">.</span>
                      <span className="astra-dot">.</span>
                      <span className="astra-dot">.</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Chu kỳ ReAct: Khám phá Schema ➔ Truy vấn dữ liệu ➔ Đối soát quyền & nghiệp vụ</span>
                  </div>
                  <div className="astra-thinkbar"><div /></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Ô nhập kiểu Gemini */}
        <div className={`relative px-4 md:px-8 pb-4 pt-1 shrink-0 ${activeMode === "ingest" ? "bg-transparent" : "bg-white"}`}>
          <div className="max-w-3xl mx-auto">
            {activeMode === "ingest" && currentActionMeta && !showHero && (
              <div className="flex justify-center mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200 pl-2 pr-2.5 py-1 rounded-full backdrop-blur">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentActionMeta.title}
                </span>
              </div>
            )}
            <div className={selectedModel === "astra" ? "astra-frame" : undefined}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-end gap-2 rounded-[28px] bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-300 focus-within:shadow-lg transition pl-5 pr-2 py-2"
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
                    ? currentActionMeta?.placeholder
                    : `Hỏi ${model.name} bất cứ điều gì...`
                }
                disabled={sending}
                className="flex-1 bg-transparent resize-none outline-none text-[15px] leading-6 text-slate-800 placeholder:text-slate-400 max-h-32 overflow-y-auto py-1.5"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || sending}
                title="Gửi"
                className="w-9 h-9 rounded-full text-white flex items-center justify-center transition shrink-0 mb-0.5 disabled:opacity-40"
                style={
                  inputPrompt.trim() && !sending
                    ? { background: "#0f172a" }
                    : { background: "#cbd5e1" }
                }
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    try { localStorage.setItem("ai-assistant-model", m.id); } catch {}
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                    m.id === selectedModel
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white/70 text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-800"
                  }`}
                >
                  {m.id === selectedModel && <Check className="w-3 h-3" />}
                  {m.name}
                  <span className={`text-[10px] font-bold px-1.5 py-px rounded-full ${
                    m.id === selectedModel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {m.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

