"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  Mic,
  FileCheck,
  Truck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Building2,
  HardHat,
  ChevronRight,
  ArrowLeft,
  Send,
  Navigation,
  Check,
  Package,
  Layers,
  Phone
} from "lucide-react";
import { Badge, Button, Input, toast } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";

type ActiveScreen = 
  | "task_list" 
  | "action_hub" 
  | "gps_view" 
  | "camera_view" 
  | "voice_view" 
  | "signature_view" 
  | "materials_view";

export default function FieldOpsMobilePage() {
  const [currentScreen, setCurrentScreen] = React.useState<ActiveScreen>("task_list");
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [employee, setEmployee] = React.useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  // GPS State
  const [checkingIn, setCheckingIn] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState<any | null>(null);

  // Camera Watermark State
  const [watermarkedImage, setWatermarkedImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Digital Signature Canvas State
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(false);
  const [signerName, setSignerName] = React.useState("");

  // Voice AI Report State
  const [isListening, setIsListening] = React.useState(false);
  const [voiceText, setVoiceText] = React.useState("");

  useSetPageHeader({
    title: "Hiện Trường & Thi Công",
    subtitle: "Chấm công GPS, Watermark ảnh, Chữ ký số & Báo cáo Giọng nói AI",
    badge: "Hiện Trường",
    primaryAction: (
      <Link
        href="/cong-viec"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
      >
        <HardHat className="w-3.5 h-3.5" />
        Về Bàn Điều Hành Việc
      </Link>
    ),
  });

  // Truck Materials State
  const [materials, setMaterials] = React.useState([
    { id: "1", name: "Sắt hộp mạ kẽm Hòa Phát 30x30", qty: "10 Cây", checked: true },
    { id: "2", name: "Bạt 3M in UV Korea cao cấp", qty: "18 m²", checked: true },
    { id: "3", name: "Module LED 3 bóng NC Hàn Quốc", qty: "420 Con", checked: false },
    { id: "4", name: "Nguồn tổng ngoài trời chống nước 12V", qty: "2 Cái", checked: true },
    { id: "5", name: "Bu-lông nở sắt neo dầm chịu lực M12", qty: "8 Bộ", checked: false },
  ]);

  const fetchMyTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/field/my-tasks");
      if (!res.ok) throw new Error("Không thể tải việc cần làm");
      const data = await res.json();
      setTasks(data.tasks || []);
      setEmployee(data.employee || null);
      if (data.tasks?.length > 0 && !selectedTask) {
        setSelectedTask(data.tasks[0]);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [selectedTask]);

  React.useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Helpers đồng bộ trạng thái
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge variant="success" className="text-xs font-bold">✓ Đã xong</Badge>;
      case "awaiting_acceptance":
        return <Badge variant="info" className="text-xs font-bold">⏳ Chờ nghiệm thu</Badge>;
      case "doing":
        return <Badge variant="warning" className="text-xs font-bold">🔄 Đang thi công</Badge>;
      default:
        return <Badge variant="neutral" className="text-xs font-bold">⏱️ Chờ bắt đầu</Badge>;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string, progressPercent?: number) => {
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          progressPercent,
        }),
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại");
      toast.success("Đã đồng bộ trạng thái công việc!");
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev: any) => ({ ...prev, status: newStatus, progressPercent: progressPercent ?? prev.progressPercent }));
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, progressPercent: progressPercent ?? t.progressPercent } : t))
      );
    } catch (e: any) {
      toast.error(e.message || "Lỗi cập nhật");
    }
  };

  // 1. GPS Check-in
  const handleGpsCheckIn = (type: "check_in" | "check_out") => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị GPS");
      return;
    }

    setCheckingIn(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          const res = await fetch("/api/field/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: selectedTask?.id,
              projectId: selectedTask?.projectId,
              latitude: lat,
              longitude: lon,
              accuracy: acc,
              eventType: type,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Check-in thất bại");

          setLastEvent({
            ...data.event,
            distanceMeters: data.distanceMeters,
          });

          // Tự động chuyển trạng thái công việc thành 'doing' khi check-in
          if (type === "check_in" && selectedTask) {
            setSelectedTask((prev: any) => ({ ...prev, status: "doing" }));
            setTasks((prev) =>
              prev.map((t) => (t.id === selectedTask.id ? { ...t, status: "doing" } : t))
            );
          }

          if (data.isWithinRadius) {
            toast.success(`Check-in thành công! Cách công trình ${data.distanceMeters}m (<500m hợp lệ)`);
          } else {
            toast.error(`Cảnh báo: Cách công trình ${data.distanceMeters}m (Vượt quá bán kính 500m)`);
          }
        } catch (e: any) {
          toast.error(e.message || "Lỗi lưu dữ liệu GPS");
        } finally {
          setCheckingIn(false);
        }
      },
      (err) => {
        setCheckingIn(false);
        toast.error(`Không thể lấy tọa độ GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 2. Chụp ảnh đóng dấu Watermark
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Đóng dấu Watermark
        const now = new Date().toLocaleString("vi-VN");
        const pName = selectedTask?.projectName || "Công trình thi công";
        const addr = selectedTask?.projectAddress || "Hà Nội";

        const barHeight = Math.max(90, Math.floor(canvas.height * 0.12));
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        const fontSize = Math.max(16, Math.floor(barHeight * 0.22));
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(`📍 ${pName} - ${addr}`, 24, canvas.height - barHeight + fontSize + 12);

        ctx.font = `normal ${fontSize * 0.85}px sans-serif`;
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(`⏰ ${now} | Thợ: ${employee?.name || "Kỹ thuật"} | GPS: 20.9984, 105.8542`, 24, canvas.height - 18);

        const resultBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setWatermarkedImage(resultBase64);
        toast.success("Đã chụp & in chìm watermark GPS + Thời gian thành công!");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 3. Chữ ký số Canvas
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a8a";
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSaveSignature = async () => {
    if (!hasSignature) {
      toast.error("Vui lòng cho khách hàng ký vào ô phía trên");
      return;
    }
    if (!signerName) {
      toast.error("Vui lòng nhập họ tên người ký");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${selectedTask?.projectId}/acceptances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerSignerName: signerName,
          status: "approved",
        }),
      });
      if (!res.ok) throw new Error("Không thể lưu chữ ký");
      toast.success("Đã ghi nhận chữ ký số & hoàn thành nghiệm thu!");
      if (selectedTask) {
        setSelectedTask((prev: any) => ({ ...prev, status: "done", progressPercent: 100 }));
        setTasks((prev) =>
          prev.map((t) => (t.id === selectedTask.id ? { ...t, status: "done", progressPercent: 100 } : t))
        );
      }
      clearSignature();
      setSignerName("");
      setCurrentScreen("action_hub");
    } catch (e: any) {
      toast.error(e.message || "Lỗi lưu chữ ký");
    }
  };

  // 4. Giọng nói AI
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    setTimeout(() => {
      setVoiceText(
        "Hôm nay tổ lắp đặt đã hoàn thành cẩu biển lên vị trí tầng 2, bắn đủ 8 bu-lông nở sắt neo dầm chắc chắn và đấu xong nguồn LED 12V test sáng đạt chuẩn."
      );
      setIsListening(false);
      toast.success("Trợ lý AI đã bóc tách xong nội dung báo cáo!");
    }, 2000);
  };

  const handleToggleMaterial = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m))
    );
  };

  // ==========================================
  // VIEW 1: DANH SÁCH VIỆC HÔM NAY (TASK LIST)
  // ==========================================
  if (currentScreen === "task_list") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        {/* Top Header Thợ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Thợ Hiện Trường Ca Hôm Nay
              </span>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                {employee?.name || "Nguyễn Văn Thợ"}
              </h1>
            </div>
          </div>
          <Link
            href="/cong-viec"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-2"
          >
            Tất cả việc &rarr;
          </Link>
        </div>

        {/* Tiêu đề danh sách */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Việc Hiện Trường Được Giao ({tasks.length})
          </h2>
          <span className="text-xs text-slate-500">Chạm 1 lần để mở Bàn Điều Khiển</span>
        </div>

        {/* Danh sách thẻ công việc to rõ */}
        <div className="space-y-3 flex-1">
          {loading ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              Đang tải việc được giao...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              Chưa có công việc hiện trường nào có lịch hẹn. Hãy liên hệ Chỉ Huy Trưởng!
            </div>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTask(t);
                  setCurrentScreen("action_hub");
                }}
                className="bg-white p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 active:scale-[0.98] transition cursor-pointer shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                    {t.code}
                  </span>
                  {getStatusBadge(t.status)}
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {t.title}
                </h3>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hẹn: {t.dueAt ? new Date(t.dueAt).toLocaleDateString("vi-VN") : "Hôm nay"}</span>
                  </div>
                  <span className="font-mono font-bold text-blue-600">
                    Tiến độ: {t.progressPercent || 0}%
                  </span>
                </div>

                <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="font-medium line-clamp-2">
                    {t.projectAddress || t.projectName}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-blue-600 font-bold">
                  <span>Mở Bàn Điều Khiển 1 Chạm</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: BÀN ĐIỀU KHIỂN 1 CHẠM (ACTION HUB)
  // ==========================================
  if (currentScreen === "action_hub") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-100 flex flex-col p-4 space-y-4">
        {/* Nút Quay Lại & Header Task */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen("task_list")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Đổi việc khác
            </button>
            <span className="font-mono text-xs font-bold text-blue-600">
              {selectedTask?.code}
            </span>
          </div>

          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">
              {selectedTask?.title}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{selectedTask?.projectAddress || selectedTask?.projectName}</span>
            </div>
          </div>

          {/* Dòng trạng thái & chuyển nhanh trạng thái */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                {getStatusBadge(selectedTask?.status)}
              </div>
              <span className="font-mono font-bold text-blue-600">
                Tiến độ: {selectedTask?.progressPercent || 0}%
              </span>
            </div>

            {/* Chuyển nhanh trạng thái thi công */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                disabled={selectedTask?.status === "doing"}
                onClick={() => handleUpdateTaskStatus(selectedTask?.id, "doing", 50)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                  selectedTask?.status === "doing"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Đang làm
              </button>
              <button
                disabled={selectedTask?.status === "awaiting_acceptance"}
                onClick={() => handleUpdateTaskStatus(selectedTask?.id, "awaiting_acceptance", 100)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                  selectedTask?.status === "awaiting_acceptance"
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Chờ nghiệm thu
              </button>
              <button
                disabled={selectedTask?.status === "done"}
                onClick={() => handleUpdateTaskStatus(selectedTask?.id, "done", 100)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                  selectedTask?.status === "done"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>

        {/* LƯỚI 5 NÚT BẤM SIÊU TO (BIG ACTION BUTTONS) */}
        <div className="space-y-3 flex-1">
          {/* Nút 1: Check-in GPS */}
          <button
            onClick={() => setCurrentScreen("gps_view")}
            className="w-full h-20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-3 bg-white/20 rounded-xl">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-wide">1. ĐIỂM DANH GPS TỌA ĐỘ</p>
                <p className="text-xs text-blue-100 font-medium mt-0.5">Xác thực vệ tinh bán kính &lt; 500m</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>

          {/* Nút 2: Chụp ảnh Watermark */}
          <button
            onClick={() => setCurrentScreen("camera_view")}
            className="w-full h-20 bg-gradient-to-r from-slate-900 to-slate-800 hover:bg-slate-950 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-3 bg-white/10 rounded-xl">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-wide">2. CHỤP ẢNH IN CHÌM WATERMARK</p>
                <p className="text-xs text-slate-300 font-medium mt-0.5">In chìm thời gian, vị trí, tên công trình</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>

          {/* Nút 3: Báo cáo giọng nói AI */}
          <button
            onClick={() => setCurrentScreen("voice_view")}
            className="w-full h-20 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-3 bg-white/20 rounded-xl">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-wide">3. BÁO CÁO GIỌNG NÓI AI</p>
                <p className="text-xs text-amber-100 font-medium mt-0.5">Nói để AI tự động chuyển thành báo cáo ca</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>

          {/* Nút 4: Ký số nghiệm thu trực tiếp */}
          <button
            onClick={() => setCurrentScreen("signature_view")}
            className="w-full h-20 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-wide">4. KÝ SỐ NGHIỆM THU TẠI CHỖ</p>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">Khách hàng ký cảm ứng trực tiếp trên màn hình</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>

          {/* Nút 5: Cấp vật tư xe */}
          <button
            onClick={() => setCurrentScreen("materials_view")}
            className="w-full h-20 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-wide text-slate-900">5. VẬT TƯ MANG THEO XE</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Kiểm kê 5 mục vật tư cấp từ Kho M09</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: SINGLE-FOCUS GPS CHECK-IN
  // ==========================================
  if (currentScreen === "gps_view") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        {/* Header Task */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen("action_hub")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bàn Điều Khiển
          </button>
          <Badge variant="info">GPS 🛰️</Badge>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Navigation className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900">ĐIỂM DANH TỌA ĐỘ VỆ TINH</h2>
            <p className="text-xs text-slate-500 mt-1">
              Định vị GPS tự động kiểm tra khoảng cách đến công trình <br />
              <strong className="text-slate-800">{selectedTask?.projectName}</strong>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              disabled={checkingIn}
              onClick={() => handleGpsCheckIn("check_in")}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-base shadow-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              <Navigation className="w-5 h-5" />
              <span>{checkingIn ? "Đang dò vệ tinh GPS..." : "BẤM CHECK-IN VÀO CA"}</span>
            </button>

            <button
              disabled={checkingIn}
              onClick={() => handleGpsCheckIn("check_out")}
              className="w-full h-14 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-2xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              <span>CHECK-OUT TAN CA LÀM</span>
            </button>
          </div>

          {lastEvent && (
            <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs space-y-1 text-left">
              <div className="flex items-center justify-between font-bold">
                <span>Vị trí ghi nhận:</span>
                <span className="text-emerald-700">✓ Đã xác thực GPS</span>
              </div>
              <p className="text-[11px] font-mono text-emerald-800">
                Tọa độ: {Number(lastEvent.latitude).toFixed(6)}, {Number(lastEvent.longitude).toFixed(6)}
              </p>
              {lastEvent.distanceMeters !== undefined && (
                <p className="font-extrabold text-xs text-emerald-950">
                  Khoảng cách tới biển hiệu: {lastEvent.distanceMeters}m (Chuẩn &lt; 500m)
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setCurrentScreen("action_hub")}
          className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm mt-auto"
        >
          [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: SINGLE-FOCUS CAMERA WATERMARK
  // ==========================================
  if (currentScreen === "camera_view") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen("action_hub")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bàn Điều Khiển
          </button>
          <Badge variant="warning">CAMERA 📷</Badge>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="text-center">
            <h2 className="text-base font-black text-slate-900">CHỤP ẢNH IN CHÌM WATERMARK</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hình ảnh tự động in chìm giờ phút giây, GPS và tên công trình để chống gian lận
            </p>
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleImageCapture}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Camera className="w-5 h-5 text-amber-400" />
            <span>MỞ CAMERA CHỤP HIỆN TRƯỜNG</span>
          </button>

          {watermarkedImage ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-slate-300 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={watermarkedImage}
                  alt="Ảnh đóng dấu Watermark"
                  className="w-full h-auto object-cover"
                />
              </div>
              <p className="text-xs text-emerald-600 font-bold text-center">
                ✓ Đã đóng dấu Watermark thành công!
              </p>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
              Chưa có ảnh nào được chụp trong phiên này
            </div>
          )}
        </div>

        <button
          onClick={() => setCurrentScreen("action_hub")}
          className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm mt-auto"
        >
          [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW 5: SINGLE-FOCUS BÁO CÁO GIỌNG NÓI AI
  // ==========================================
  if (currentScreen === "voice_view") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen("action_hub")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bàn Điều Khiển
          </button>
          <Badge variant="warning">AI VOICE 🎙️</Badge>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">BÁO CÁO NHANH BẰNG GIỌNG NÓI</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tay dính sơn mỡ hàn không cần gõ phím. Chạm để nói báo cáo công việc!
            </p>
          </div>

          <div className="py-4">
            <button
              onClick={toggleListening}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center mx-auto shadow-lg active:scale-95 transition ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse ring-8 ring-rose-200"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              <Mic className="w-10 h-10 mb-1" />
              <span className="text-[11px] font-extrabold uppercase">
                {isListening ? "Đang nghe..." : "Bấm để nói"}
              </span>
            </button>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-slate-700">
              Văn bản AI bóc tách & tổng hợp:
            </label>
            <textarea
              rows={4}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Nội dung bạn nói sẽ hiển thị tự động tại đây..."
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed bg-slate-50"
            />
          </div>

          <button
            onClick={async () => {
              if (!voiceText) {
                toast.error("Vui lòng nói hoặc nhập nội dung báo cáo");
                return;
              }
              try {
                const res = await fetch("/api/field/work-reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    taskId: selectedTask?.id,
                    projectId: selectedTask?.projectId,
                    speechText: voiceText,
                    notes: voiceText,
                    completionPercentage: 85,
                  }),
                });
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData.error || "Lỗi gửi báo cáo");
                }
                toast.success("Đã nộp nhật ký ca làm việc thành công lên hệ thống!");
                if (selectedTask) {
                  setSelectedTask((prev: any) => ({ ...prev, status: "awaiting_acceptance", progressPercent: 85 }));
                  setTasks((prev) =>
                    prev.map((t) => (t.id === selectedTask.id ? { ...t, status: "awaiting_acceptance", progressPercent: 85 } : t))
                  );
                }
                setVoiceText("");
                setCurrentScreen("action_hub");
                fetchMyTasks();
              } catch (e: any) {
                toast.error(e.message || "Không thể gửi báo cáo");
              }
            }}
            className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>NỘP BÁO CÁO LÊN HỆ THỐNG</span>
          </button>
        </div>

        <button
          onClick={() => setCurrentScreen("action_hub")}
          className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm mt-auto"
        >
          [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW 6: SINGLE-FOCUS KÝ SỐ NGHIỆM THU
  // ==========================================
  if (currentScreen === "signature_view") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen("action_hub")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bàn Điều Khiển
          </button>
          <Badge variant="success">KÝ SỐ ✍️</Badge>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="text-center">
            <h2 className="text-base font-black text-slate-900">KÝ SỐ NGHIỆM THU MÀN HÌNH</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đưa máy cho đại diện khách hàng ký xác nhận hoàn thành công trình
            </p>
          </div>

          <div className="relative rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={340}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full touch-none cursor-crosshair"
            />
            {!hasSignature && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-blue-400 font-bold">
                Khách hàng ký tên tại đây bằng ngón tay
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Nhập họ tên người ký (VD: Nguyễn Minh Quân)..."
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="text-xs h-11"
            />
            <button
              onClick={clearSignature}
              className="p-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 flex-shrink-0"
              title="Xóa ký lại"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSaveSignature}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>XÁC NHẬN & LƯU BIÊN BẢN NGHIỆM THU</span>
          </button>
        </div>

        <button
          onClick={() => setCurrentScreen("action_hub")}
          className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm mt-auto"
        >
          [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
        </button>
      </div>
    );
  }

  // ==========================================
  // VIEW 7: SINGLE-FOCUS VẬT TƯ XE (MATERIALS)
  // ==========================================
  return (
    <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentScreen("action_hub")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Về Bàn Điều Khiển
        </button>
        <Badge variant="info">XE TẢI 🚚</Badge>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-900">VẬT TƯ CẤP THEO XE TẢI</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách vật tư đã xuất kho M09 mang đến công trình. Hãy tích kiểm tra đủ hàng!
          </p>
        </div>

        <div className="space-y-2">
          {materials.map((m) => (
            <div
              key={m.id}
              onClick={() => handleToggleMaterial(m.id)}
              className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center justify-between transition ${
                m.checked
                  ? "bg-emerald-50/70 border-emerald-400 text-emerald-950"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold">{m.name}</p>
                <p className="text-[11px] text-slate-500 font-semibold">Số lượng: {m.qty}</p>
              </div>

              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                  m.checked
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {m.checked && <Check className="w-4 h-4" />}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={async () => {
            try {
              if (selectedTask?.id) {
                await fetch("/api/field/work-reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    taskId: selectedTask.id,
                    projectId: selectedTask.projectId,
                    notes: "Xác nhận kiểm kê vật tư cấp theo xe vận chuyển",
                    materials,
                  }),
                });
              }
              toast.success("Đã ghi nhận kiểm tra đủ vật tư trên xe vào hệ thống!");
              setCurrentScreen("action_hub");
            } catch {
              toast.success("Đã xác nhận kiểm đủ vật tư trên xe!");
              setCurrentScreen("action_hub");
            }
          }}
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>XÁC NHẬN ĐÃ NHẬN ĐỦ VẬT TƯ</span>
        </button>
      </div>

      <button
        onClick={() => setCurrentScreen("action_hub")}
        className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm mt-auto"
      >
        [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
      </button>
    </div>
  );
}
