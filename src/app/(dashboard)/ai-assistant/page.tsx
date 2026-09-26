"use client";

import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Sparkles, 
  Send, 
  History, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  Boxes, 
  Layers, 
  HelpCircle,
  Eye,
  X
} from "lucide-react";
import { Badge } from "@/components/ui";

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
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AiAssistantPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là Trợ Lý Kỹ Thuật & Điều Hành Signage ERP. Tôi có thể giúp bạn tính toán định mức kết cấu biển bảng (hộp đèn 3M, pano tấm lớn, chữ nổi alu/mica), tra cứu tồn kho vật tư, hoặc phân tích tiến độ dự án. Bạn cần tôi hỗ trợ gì hôm nay?",
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [sending, setSending] = useState(false);

  const [aiRuns, setAiRuns] = useState<AiRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AiRun | null>(null);

  const fetchAiRuns = async () => {
    try {
      setLoadingRuns(true);
      const res = await fetch("/api/ai/assistant");
      if (res.ok) {
        const data = await res.json();
        setAiRuns(data.runs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchAiRuns();
    }
  }, [activeTab]);

  const handleSendMessage = async (promptToSend?: string) => {
    const prompt = promptToSend || inputPrompt;
    if (!prompt.trim() || sending) return;

    const userMsg: ChatMessage = {
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
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Lỗi kết nối Trợ lý AI");
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        role: "assistant",
        content: data.answer || "Không có phản hồi từ mô hình AI.",
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Có lỗi xảy ra: ${err.message}`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Trợ Lý Kỹ Thuật & Điều Hành
            </h1>
            <Badge variant="default">Trợ Lý Kỹ Thuật</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Hỗ trợ tính toán định mức kết cấu biển quảng cáo, tra cứu kho và kiểm toán tác vụ AI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1.5 py-1 px-3 bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Gemini 3.5 Flash Lite
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
              activeTab === "chat"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Bot className="w-4 h-4 text-slate-500" />
            1. Hỏi Đáp Trợ Lý AI Signage
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            2. Lịch Sử Tác Vụ & Nhật Ký AI
          </button>
        </nav>
      </div>

      {/* TAB 1: CHAT AI */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Cửa sổ chat chính */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
            {/* Header chat */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Signage AI Engineer</h3>
                  <p className="text-xs text-slate-500">Trực tiếp kết nối cơ sở dữ liệu định mức vật tư</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setMessages([
                    {
                      role: "assistant",
                      content: "Hộp thoại đã được đặt lại. Bạn muốn tra cứu vấn đề gì tiếp theo?",
                      timestamp: new Date().toLocaleTimeString("vi-VN"),
                    },
                  ])
                }
                className="text-xs text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 transition"
              >
                Xóa đoạn chat
              </button>
            </div>

            {/* Danh sách tin nhắn */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>
                    <div
                      className={`text-[10px] mt-2 text-right ${
                        m.role === "user" ? "text-blue-200" : "text-slate-400"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3 items-center text-slate-400 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <span>Trợ lý AI đang tra cứu cơ sở dữ liệu & tính toán...</span>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Nhập câu hỏi (Ví dụ: Định mức vật tư hộp đèn 3M, Tồn kho bạt 3M...)"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || sending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Gửi
                </button>
              </form>
            </div>
          </div>

          {/* Cột gợi ý tác vụ mẫu */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Câu Hỏi Mẫu Nhanh
              </h4>
              <p className="text-xs text-slate-500">
                Nhấp vào câu hỏi gợi ý để Trợ lý AI giải đáp ngay:
              </p>

              <div className="space-y-2">
                <button
                  onClick={() =>
                    handleSendMessage("Định mức vật tư làm biển bạt hộp đèn 3M kích thước 8x2.5m")
                  }
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs text-slate-700 transition space-y-1 block"
                >
                  <span className="font-semibold text-blue-600 block">📐 Định mức hộp đèn 3M</span>
                  <span className="text-slate-500">Sắt hộp, bóng LED NC, bạt 3M Korea</span>
                </button>

                <button
                  onClick={() => handleSendMessage("Báo cáo tồn kho vật tư trọng yếu xưởng")}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs text-slate-700 transition space-y-1 block"
                >
                  <span className="font-semibold text-blue-600 block">📦 Kiểm tra tồn kho</span>
                  <span className="text-slate-500">Sắt, alu alcorest, mica, led</span>
                </button>

                <button
                  onClick={() =>
                    handleSendMessage(
                      "Tư vấn giải pháp gia cố giàn khung biển nóc nhà cao tầng chịu bão cấp 12"
                    )
                  }
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs text-slate-700 transition space-y-1 block"
                >
                  <span className="font-semibold text-blue-600 block">🌪️ Kết cấu chịu gió bão</span>
                  <span className="text-slate-500">Tăng đơ cáp giằng, thép V mạ kẽm</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <span className="font-bold flex items-center gap-1.5 text-slate-900">
                <Sparkles className="w-4 h-4 text-amber-500" /> Kiểm Toán & Minh Bạch
              </span>
              <p className="text-slate-600 leading-relaxed">
                Mọi phiên làm việc với AI được tự động ghi nhận vào nhật ký kiểm toán hệ thống để phục vụ đối soát chi phí vật tư và hiệu suất công việc.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ PHIÊN AI RUNS */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Nhật Ký Tác Vụ AI & Nhận Diện Hóa Đơn
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bao gồm các lần nhận diện hóa đơn mua hàng, bóc tách báo cáo hiện trường và tư vấn kỹ thuật
              </p>
            </div>
            <button
              onClick={fetchAiRuns}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
              title="Làm mới lịch sử"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRuns ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                <tr>
                  <th className="px-4 py-3">Mã phiên</th>
                  <th className="px-4 py-3">Tác nhân / Module</th>
                  <th className="px-4 py-3">Mô hình AI</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3">Thời điểm tạo</th>
                  <th className="px-4 py-3 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRuns ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Đang tải lịch sử phiên chạy AI...
                    </td>
                  </tr>
                ) : aiRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Chưa có phiên chạy AI nào được ghi nhận
                    </td>
                  </tr>
                ) : (
                  aiRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {run.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          {run.agentCode === "INVOICE_OCR" ? (
                            <FileText className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Bot className="w-4 h-4 text-slate-600" />
                          )}
                          {run.agentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <code className="bg-slate-100 px-2 py-0.5 rounded font-mono">{run.model}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            run.status === "completed"
                              ? "success"
                              : run.status === "failed"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {run.status === "completed"
                            ? "Thành công"
                            : run.status === "failed"
                            ? "Thất bại"
                            : run.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(run.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedRun(run)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem Snapshot
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết Snapshot JSON */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Chi Tiết Phiên AI: {selectedRun.agentCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  1. Input Snapshot (Dữ liệu đầu vào):
                </p>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs overflow-x-auto font-mono">
                  {JSON.stringify(selectedRun.inputSnapshot, null, 2)}
                </pre>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  2. Output JSON (Kết quả AI phân tích & trích xuất):
                </p>
                <pre className="p-3 bg-slate-900 text-blue-300 rounded-xl text-xs overflow-x-auto font-mono">
                  {JSON.stringify(selectedRun.outputJson, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
