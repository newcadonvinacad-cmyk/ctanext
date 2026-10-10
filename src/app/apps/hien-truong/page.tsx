"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  Trash2,
  Volume2,
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
  Phone,
  Compass,
  ExternalLink,
  RefreshCw,
  Crosshair,
  Download,
  Share2,
  SwitchCamera,
  FolderOpen,
  Image as ImageIcon,
  CheckCheck,
  Edit3,
  Globe,
  Sliders,
  Search,
  Users,
  Bell,
} from "lucide-react";
import { Badge, Button, Input, Modal, toast } from "@/components/ui";
import { TimeAttendanceWidget } from "@/components/dashboard/TimeAttendanceWidget";
import { EmployeeSelfServiceModals } from "@/components/dashboard/EmployeeSelfServiceModals";

type ActiveScreen =
  | "task_list"
  | "action_hub"
  | "gps_view"
  | "camera_view"
  | "signature_view";

interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Công thức Haversine tính khoảng cách theo mét
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // bán kính Trái Đất (mét)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function formatDistance(meters?: number | null): string {
  if (meters === undefined || meters === null || isNaN(meters)) return "-";
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function FieldOpsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlScreen = (searchParams.get("screen") as ActiveScreen) || "task_list";
  const urlTaskId = searchParams.get("taskId");

  const [currentScreen, setCurrentScreenState] = React.useState<ActiveScreen>(urlScreen);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [employee, setEmployee] = React.useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  // Sync screen state with URL search param
  React.useEffect(() => {
    if (urlScreen && urlScreen !== currentScreen) {
      setCurrentScreenState(urlScreen);
    }
  }, [urlScreen, currentScreen]);

  const setCurrentScreen = React.useCallback(
    (newScreen: ActiveScreen, task?: any) => {
      setCurrentScreenState(newScreen);
      const activeTaskId = task?.id || selectedTask?.id || urlTaskId;
      const targetQuery = new URLSearchParams();
      if (newScreen !== "task_list") {
        targetQuery.set("screen", newScreen);
      }
      if (activeTaskId && newScreen !== "task_list") {
        targetQuery.set("taskId", activeTaskId);
      }
      const queryString = targetQuery.toString();
      router.replace(`/apps/hien-truong${queryString ? `?${queryString}` : ""}`);
    },
    [router, selectedTask?.id, urlTaskId]
  );

  // Search & Filter State for Task List
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "doing" | "awaiting_acceptance" | "done">("all");

  // Live GPS Tracking State
  const [userCoords, setUserCoords] = React.useState<UserCoordinates | null>(null);
  const [locatingUser, setLocatingUser] = React.useState(false);
  const [checkingIn, setCheckingIn] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState<any | null>(null);

  // Live WebRTC Camera Stream State
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = React.useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Digital Signature Canvas State
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(false);
  const [signerName, setSignerName] = React.useState("");

  // Voice AI Report State (Web Speech API)
  const [isListening, setIsListening] = React.useState(false);
  const [voiceText, setVoiceText] = React.useState("");
  const [interimVoiceText, setInterimVoiceText] = React.useState("");
  const [isSpeechSupported, setIsSpeechSupported] = React.useState(true);
  const [submittingVoiceReport, setSubmittingVoiceReport] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  // Truck Materials State
  const [materials, setMaterials] = React.useState([
    { id: "1", name: "Sắt hộp mạ kẽm Hòa Phát 30x30", qty: "10 Cây", checked: true },
    { id: "2", name: "Bạt 3M in UV Korea cao cấp", qty: "18 m²", checked: true },
    { id: "3", name: "Module LED 3 bóng NC Hàn Quốc", qty: "420 Con", checked: false },
    { id: "4", name: "Nguồn tổng ngoài trời chống nước 12V", qty: "2 Cái", checked: true },
    { id: "5", name: "Bu-lông nở sắt neo dầm chịu lực M12", qty: "8 Bộ", checked: false },
  ]);

  // Computed Filtered Tasks & Stats for Dashboard
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus = statusFilter === "all" ? true : t.status === statusFilter;
      const matchSearch = searchKeyword.trim()
        ? (
            (t.title || "").toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (t.code || "").toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (t.projectName || "").toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (t.projectAddress || "").toLowerCase().includes(searchKeyword.toLowerCase())
          )
        : true;
      return matchStatus && matchSearch;
    });
  }, [tasks, statusFilter, searchKeyword]);

  const taskStats = React.useMemo(() => {
    return {
      total: tasks.length,
      doing: tasks.filter((t) => t.status === "doing").length,
      awaiting: tasks.filter((t) => t.status === "awaiting_acceptance").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  // Lấy vị trí GPS hiện tại của thợ (Live GPS)
  const refreshUserLocation = React.useCallback((silent: boolean = false): Promise<UserCoordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        if (!silent) toast.error("Trình duyệt hoặc thiết bị không hỗ trợ định vị GPS");
        resolve(null);
        return;
      }

      setLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: UserCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10),
            timestamp: Date.now(),
          };
          setUserCoords(coords);
          setLocatingUser(false);
          if (!silent) {
            toast.success(`Đã cập nhật GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (±${coords.accuracy}m)`);
          }
          resolve(coords);
        },
        (err) => {
          setLocatingUser(false);
          if (!silent) {
            toast.error(`Không thể lấy vị trí GPS: ${err.message}`);
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }, []);

  // Tải danh sách công việc - Khắc phục hoàn toàn lỗi nháy màn hình (flickering)
  const fetchMyTasks = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/field/my-tasks");
      if (!res.ok) throw new Error("Không thể tải việc cần làm");
      const data = await res.json();
      const fetchedTasks = data.tasks || [];
      setTasks(fetchedTasks);
      setEmployee(data.employee || null);
      setSelectedTask((prev: any) => {
        if (urlTaskId) {
          const fromUrl = fetchedTasks.find((t: any) => t.id === urlTaskId);
          if (fromUrl) return fromUrl;
        }
        if (prev) {
          const match = fetchedTasks.find((t: any) => t.id === prev.id);
          return match || fetchedTasks[0] || null;
        }
        return fetchedTasks[0] || null;
      });
    } catch (err: any) {
      toast.error(err.message || "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, [urlTaskId]);

  React.useEffect(() => {
    fetchMyTasks();
    refreshUserLocation(true);
  }, [fetchMyTasks, refreshUserLocation]);

  // Khởi động Camera WebRTC trực tiếp trên trình duyệt
  const startCamera = React.useCallback(async (facing: "environment" | "user" = facingMode) => {
    try {
      setCameraError(null);
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ trực tiếp WebRTC Camera. Bạn có thể dùng nút Chọn ảnh/File!");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setMediaStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraActive(false);
      setCameraError(err.message || "Không thể truy cập camera. Vui lòng cấp quyền máy ảnh trên trình duyệt!");
    }
  }, [facingMode, mediaStream]);

  const stopCamera = React.useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    setCameraActive(false);
  }, [mediaStream]);

  // Tự động bật/tắt camera khi vào/rời màn hình camera_view
  React.useEffect(() => {
    if (currentScreen === "camera_view" && !watermarkedImage) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [currentScreen, watermarkedImage, facingMode]);

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

  // Mở Google Maps chỉ đường
  const handleOpenNavigation = (task: any) => {
    const lat = task?.projectLat;
    const lon = task?.projectLon;
    const address = task?.projectAddress || task?.projectName;

    let targetUrl = "";
    if (lat && lon) {
      targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    } else if (address) {
      targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    } else {
      toast.error("Công trình chưa có địa chỉ hoặc tọa độ để dẫn đường");
      return;
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  // 1. GPS Check-in / Check-out
  const handleGpsCheckIn = async (type: "check_in" | "check_out") => {
    setCheckingIn(true);
    try {
      let pos = userCoords;
      if (!pos || Date.now() - pos.timestamp > 30000) {
        pos = await refreshUserLocation(false);
      }
      if (!pos) {
        throw new Error("Không thể lấy tọa độ GPS để chấm công. Vui lòng bật vị trí!");
      }

      const res = await fetch("/api/field/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask?.id,
          projectId: selectedTask?.projectId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracyM: pos.accuracy,
          type: type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Check-in thất bại");

      const returnedEvent = data.event || {};
      const dist = returnedEvent.distanceMeters !== undefined ? returnedEvent.distanceMeters : data.distanceMeters;
      const withinRadius = returnedEvent.isWithinRange !== undefined ? returnedEvent.isWithinRange : (dist !== undefined ? dist <= 500 : true);

      setLastEvent({
        ...returnedEvent,
        distanceMeters: dist,
        isWithinRadius: withinRadius,
      });

      // Tự động chuyển trạng thái công việc thành 'doing' khi check-in
      if (type === "check_in" && selectedTask) {
        setSelectedTask((prev: any) => ({ ...prev, status: "doing" }));
        setTasks((prev) =>
          prev.map((t) => (t.id === selectedTask.id ? { ...t, status: "doing" } : t))
        );
      }

      if (dist !== undefined) {
        if (withinRadius) {
          toast.success(`Chấm công GPS thành công! Cách công trình ${dist}m (<500m hợp lệ)`);
        } else {
          toast.warning(`Cảnh báo: Cách công trình ${dist}m (Vượt quá bán kính 500m)`);
        }
      } else {
        toast.success(`Chấm công GPS thành công! Tọa độ: ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi lưu dữ liệu GPS");
    } finally {
      setCheckingIn(false);
    }
  };

  // 2. Chụp ảnh trực tiếp từ Live Camera Stream với Watermark GPS
  const handleSnapLiveCamera = async () => {
    const video = videoRef.current;
    if (!video) {
      toast.error("Không tìm thấy luồng camera trực tiếp");
      return;
    }

    // Lấy GPS realtime
    let currentGps = userCoords;
    if (!currentGps) {
      currentGps = await refreshUserLocation(true);
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Vẽ hình ảnh từ video stream
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Đóng dấu Watermark
    const now = new Date().toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const pName = selectedTask?.projectName || "Công trình thi công";
    const addr = selectedTask?.projectAddress || "Tại hiện trường";
    const workerName = employee?.name || "Kỹ thuật viên";

    const gpsText = currentGps
      ? `GPS: ${currentGps.latitude.toFixed(6)}, ${currentGps.longitude.toFixed(6)} (±${currentGps.accuracy}m)`
      : selectedTask?.projectLat && selectedTask?.projectLon
      ? `GPS: ${Number(selectedTask.projectLat).toFixed(6)}, ${Number(selectedTask.projectLon).toFixed(6)}`
      : "GPS: Vị trí thực địa";

    const barHeight = Math.max(100, Math.floor(canvas.height * 0.14));
    ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    const fontSize = Math.max(16, Math.floor(barHeight * 0.22));

    // Dòng 1: Tên & Địa chỉ
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillText(`📍 ${pName} - ${addr}`, 24, canvas.height - barHeight + fontSize + 12);

    // Dòng 2: Thời gian, Thợ & GPS thực tế
    ctx.font = `normal ${fontSize * 0.85}px sans-serif`;
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`⏰ ${now} | Thợ: ${workerName} | 🛰️ ${gpsText}`, 24, canvas.height - 18);

    const resultBase64 = canvas.toDataURL("image/jpeg", 0.9);
    setWatermarkedImage(resultBase64);
    stopCamera();
    toast.success("Đã chụp & in chìm watermark GPS + Thời gian thực tế thành công!");
  };

  // 2b. Chụp hoặc chọn file từ bộ nhớ (Fallback)
  const handleFileCaptureFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let currentGps = userCoords;
    if (!currentGps) {
      currentGps = await refreshUserLocation(true);
    }

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

        const now = new Date().toLocaleString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const pName = selectedTask?.projectName || "Công trình thi công";
        const addr = selectedTask?.projectAddress || "Tại hiện trường";
        const workerName = employee?.name || "Kỹ thuật viên";

        const gpsText = currentGps
          ? `GPS: ${currentGps.latitude.toFixed(6)}, ${currentGps.longitude.toFixed(6)} (±${currentGps.accuracy}m)`
          : selectedTask?.projectLat && selectedTask?.projectLon
          ? `GPS: ${Number(selectedTask.projectLat).toFixed(6)}, ${Number(selectedTask.projectLon).toFixed(6)}`
          : "GPS: Vị trí thực địa";

        const barHeight = Math.max(100, Math.floor(canvas.height * 0.14));
        ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        const fontSize = Math.max(16, Math.floor(barHeight * 0.22));

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(`📍 ${pName} - ${addr}`, 24, canvas.height - barHeight + fontSize + 12);

        ctx.font = `normal ${fontSize * 0.85}px sans-serif`;
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(`⏰ ${now} | Thợ: ${workerName} | 🛰️ ${gpsText}`, 24, canvas.height - 18);

        const resultBase64 = canvas.toDataURL("image/jpeg", 0.88);
        setWatermarkedImage(resultBase64);
        toast.success("Đã in chìm watermark GPS + Thời gian thành công!");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 3. Chữ ký số Canvas (Hỗ trợ chuột, bút cảm ứng & cảm ứng tay trên mọi màn hình)
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e3a8a";
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

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

  // 4. Giọng nói AI - Web Speech API (Tiếng Việt vi-VN Realtime)
  const stopListening = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }
    setIsListening(false);
    setInterimVoiceText("");
  }, []);

  const startListening = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSpeechSupported(false);
      toast.error(
        "Trình duyệt này không hỗ trợ nhận diện giọng nói Web Speech API. Khuyên dùng Google Chrome hoặc Edge trên điện thoại / máy tính!"
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = "vi-VN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimVoiceText("");
        toast.success("Đang lắng nghe... Hãy nói nội dung báo cáo!");
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            finalChunk += transcript;
          } else {
            interimChunk += transcript;
          }
        }

        if (finalChunk) {
          setVoiceText((prev) => {
            const trimmed = prev.trim();
            const chunk = finalChunk.trim();
            if (!trimmed) return chunk;
            return `${trimmed} ${chunk}`;
          });
          setInterimVoiceText("");
        } else if (interimChunk) {
          setInterimVoiceText(interimChunk);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          toast.error(
            "Microphone bị chặn! Vui lòng chạm vào biểu tượng ổ khóa cạnh tên miền để Cho phép quyền Micro."
          );
        } else if (event.error === "audio-capture") {
          toast.error("Không tìm thấy Microphone trên thiết bị");
        } else if (event.error === "network") {
          toast.error("Lỗi kết nối mạng khi xử lý giọng nói");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          toast.error(`Lỗi microphone: ${event.error}`);
        }
        setIsListening(false);
        setInterimVoiceText("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimVoiceText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Start speech recognition failed:", err);
      toast.error(`Không thể kích hoạt Micro: ${err.message || "Lỗi thiết bị"}`);
      setIsListening(false);
      setInterimVoiceText("");
    }
  }, []);

  const toggleListening = React.useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Dừng micro khi rời khỏi màn hình camera_view
  React.useEffect(() => {
    if (currentScreen !== "camera_view" && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      setIsListening(false);
      setInterimVoiceText("");
    }
  }, [currentScreen]);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Gợi ý câu mẫu nhanh cho thợ thi công
  const quickVoiceTemplates = [
    "Đã lắp đặt hoàn thiện khung biển, neo bu-lông chắc chắn.",
    "Đã đấu nguồn LED 12V test sáng đạt chuẩn ổn định.",
    "Đã vệ sinh sạch sẽ mặt biển alu mica và bàn giao mặt bằng.",
    "Đang chờ chủ nhà duyệt vị trí đấu nối điện nguồn.",
    "Công trình đã hoàn thành 100%, sẵn sàng nghiệm thu.",
  ];

  const handleAppendVoiceTemplate = (templateText: string) => {
    setVoiceText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return templateText;
      return `${trimmed}. ${templateText}`;
    });
    toast.success("Đã thêm mẫu câu vào báo cáo!");
  };

  const handleToggleMaterial = (id: string) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m))
    );
  };

  // ==========================================
  // VIEW 1: DANH SÁCH VIỆC HÔM NAY (TASK LIST) - RESPONSIVE DASHBOARD
  // ==========================================
  if (currentScreen === "task_list") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-3 sm:py-6 px-2 sm:px-6 lg:px-8 text-slate-100">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
          {/* Top Header Thợ & GPS Live Bar */}
          <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  <HardHat className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider bg-blue-950/70 px-2 py-0.5 rounded-md border border-blue-800">
                      Thợ Hiện Trường Ca Hôm Nay
                    </span>
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                      • {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight mt-0.5">
                    {employee?.name || "Nguyễn Văn Thợ"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center flex-wrap">
                <Link
                  href="/apps/hrm"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 shadow-2xs"
                  title="Mở ứng dụng HRM mở rộng"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>App HRM mở rộng</span>
                </Link>

                <Link
                  href="/cong-viec"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Bàn điều hành việc &rarr;</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    fetchMyTasks();
                    refreshUserLocation(false);
                  }}
                  disabled={loading || locatingUser}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition active:scale-95"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading || locatingUser ? "animate-spin text-blue-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Vị trí GPS hiện tại của thợ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full ${userCoords ? "bg-emerald-400 animate-pulse ring-4 ring-emerald-950" : "bg-amber-400"} shrink-0`} />
                <div className="truncate">
                  {userCoords ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-300">Tọa độ thiết bị:</span>
                      <span className="font-mono text-[11px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        📍 {userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)}
                      </span>
                      <span className="text-slate-400 text-[11px] font-medium">
                        (Độ chính xác: ±{userCoords.accuracy}m)
                      </span>
                    </div>
                  ) : locatingUser ? (
                    <span className="text-slate-400 italic">Đang quét sóng vệ tinh GPS...</span>
                  ) : (
                    <span className="text-amber-400 font-medium">Chưa kết nối GPS vệ tinh</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => refreshUserLocation(false)}
                disabled={locatingUser}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 rounded-lg text-xs transition shrink-0 active:scale-95 shadow-2xs"
                title="Làm mới tọa độ GPS"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${locatingUser ? "animate-spin text-blue-400" : "text-slate-400"}`} />
                <span>{locatingUser ? "Đang quét..." : "Làm mới GPS"}</span>
              </button>
            </div>
          </div>

          {/* 1. Thanh Chấm Công 1-Chạm Hiện Trường & Live Working Timer */}
          <TimeAttendanceWidget theme="dark" />

          {/* 2. Bộ 3 Tiện Ích Hành Chính: Xin Nghỉ Phép, Làm Thêm (OT), Giải Trình Chấm Công */}
          <EmployeeSelfServiceModals theme="dark" />

          {/* Metric KPI Summary Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition active:scale-[0.99] ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-[#0f172a] text-slate-200 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === "all" ? "text-blue-100" : "text-slate-400"}`}>
                  Tất cả việc
                </span>
                <Layers className={`w-4 h-4 ${statusFilter === "all" ? "text-blue-200" : "text-slate-500"}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{taskStats.total}</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("doing")}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition active:scale-[0.99] ${
                statusFilter === "doing"
                  ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30"
                  : "bg-[#0f172a] text-slate-200 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === "doing" ? "text-amber-100" : "text-amber-400"}`}>
                  Đang làm
                </span>
                <Clock className={`w-4 h-4 ${statusFilter === "doing" ? "text-amber-200" : "text-amber-400"}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{taskStats.doing}</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("awaiting_acceptance")}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition active:scale-[0.99] ${
                statusFilter === "awaiting_acceptance"
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30"
                  : "bg-[#0f172a] text-slate-200 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === "awaiting_acceptance" ? "text-indigo-100" : "text-indigo-400"}`}>
                  Chờ nghiệm thu
                </span>
                <FileCheck className={`w-4 h-4 ${statusFilter === "awaiting_acceptance" ? "text-indigo-200" : "text-indigo-400"}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{taskStats.awaiting}</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("done")}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition active:scale-[0.99] ${
                statusFilter === "done"
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30"
                  : "bg-[#0f172a] text-slate-200 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === "done" ? "text-emerald-100" : "text-emerald-400"}`}>
                  Hoàn thành
                </span>
                <CheckCircle2 className={`w-4 h-4 ${statusFilter === "done" ? "text-emerald-200" : "text-emerald-400"}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-1">{taskStats.done}</p>
            </button>
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="bg-[#0f172a] p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Tìm việc theo tên, mã việc, dự án hoặc địa chỉ..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9 pr-8 text-xs bg-slate-900/90 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-900 h-10 rounded-xl"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Tất cả ({taskStats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("doing")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === "doing"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Đang làm ({taskStats.doing})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("awaiting_acceptance")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === "awaiting_acceptance"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Chờ nghiệm thu ({taskStats.awaiting})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("done")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === "done"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-850 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Hoàn thành ({taskStats.done})
              </button>
            </div>
          </div>

          {/* Grid Danh sách thẻ công việc */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xs animate-pulse space-y-3">
                    <div className="h-4 bg-slate-800 rounded w-1/3" />
                    <div className="h-6 bg-slate-800 rounded w-3/4" />
                    <div className="h-12 bg-slate-900 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">
                  {tasks.length === 0
                    ? "Chưa có công việc hiện trường nào được giao hôm nay."
                    : "Không tìm thấy công việc nào khớp với bộ lọc."}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {tasks.length === 0
                    ? "Hãy liên hệ Chỉ Huy Trưởng hoặc người điều phối để nhận việc thi công."
                    : "Thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác."}
                </p>
                {searchKeyword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchKeyword("");
                      setStatusFilter("all");
                    }}
                  >
                    Xóa bộ lọc tìm kiếm
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                {filteredTasks.map((t) => {
                  const hasGps = Boolean(t.projectLat && t.projectLon);
                  const distanceMeters =
                    userCoords && hasGps
                      ? calculateDistanceMeters(
                          userCoords.latitude,
                          userCoords.longitude,
                          t.projectLat,
                          t.projectLon
                        )
                      : null;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setCurrentScreen("action_hub", t);
                      }}
                      className="group bg-[#0f172a] p-4 sm:p-5 rounded-2xl border-2 border-slate-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3.5 active:scale-[0.99]"
                    >
                      {/* Card Header: Code & Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {t.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {hasGps ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                              <Navigation className="w-2.5 h-2.5" /> Có GPS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-800">
                              <MapPin className="w-2.5 h-2.5" /> Chưa ghim GPS
                            </span>
                          )}
                          {getStatusBadge(t.status)}
                        </div>
                      </div>

                      {/* Card Body: Title & Project */}
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-white text-base group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {t.title}
                        </h3>
                        {t.projectName && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{t.projectName}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar & Schedule */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Hẹn: {t.dueAt ? new Date(t.dueAt).toLocaleDateString("vi-VN") : "Hôm nay"}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-400 text-[11px]">
                            Tiến độ: {t.progressPercent || 0}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (t.progressPercent || 0) >= 100
                                ? "bg-emerald-500"
                                : (t.progressPercent || 0) >= 50
                                ? "bg-blue-600"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, t.progressPercent || 0))}%` }}
                          />
                        </div>
                      </div>

                      {/* Project Address & Distance Pill */}
                      <div className="flex items-start justify-between gap-2 text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span className="font-medium line-clamp-2 text-slate-200">
                            {t.projectAddress || t.projectName || "Chưa có địa chỉ công trình"}
                          </span>
                        </div>
                        {distanceMeters !== null && (
                          <span className={`shrink-0 font-bold font-mono text-[11px] px-2 py-1 rounded-md ${
                            distanceMeters <= 500 ? "text-emerald-300 bg-emerald-950 border border-emerald-800" : "text-amber-300 bg-amber-950 border border-amber-800"
                          }`}>
                            Cách {formatDistance(distanceMeters)}
                          </span>
                        )}
                      </div>

                      {/* Card Footer: Quick Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNavigation(t);
                          }}
                          className="inline-flex items-center gap-1.5 font-bold text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-900 px-3 py-1.5 rounded-xl transition shrink-0 border border-indigo-800"
                          title="Mở Google Maps chỉ đường"
                        >
                          <Compass className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Dẫn đường</span>
                        </button>

                        <div className="inline-flex items-center gap-1 text-blue-400 font-extrabold group-hover:translate-x-0.5 transition-transform">
                          <span>Bàn Điều Khiển</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: BÀN ĐIỀU KHIỂN 1 CHẠM (ACTION HUB) - RESPONSIVE WORKSPACE
  // ==========================================
  if (currentScreen === "action_hub") {
    const hasProjectGps = Boolean(selectedTask?.projectLat && selectedTask?.projectLon);
    const distanceMeters =
      userCoords && hasProjectGps
        ? calculateDistanceMeters(
            userCoords.latitude,
            userCoords.longitude,
            Number(selectedTask.projectLat),
            Number(selectedTask.projectLon)
          )
        : null;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-3 sm:py-6 px-2 sm:px-6 lg:px-8 text-slate-100">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
          {/* Top Bar Navigation & Header */}
          <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen("task_list")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl active:scale-95 transition shrink-0 border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Danh sách việc</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-800">
                  {selectedTask?.code}
                </span>
                {getStatusBadge(selectedTask?.status)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Bàn Điều Khiển Thi Công Hiện Trường</span>
            </div>
          </div>

          {/* 2-Column Split Layout on Desktop / Laptop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* CỘT TRÁI: THÔNG TIN DỰ ÁN & TỌA ĐỘ VỆ TINH */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
              {/* Thẻ Chi tiết Công trình & Tiến độ */}
              <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider bg-blue-950/70 px-2 py-0.5 rounded border border-blue-800">
                    Công việc hiện tại
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                    {selectedTask?.title}
                  </h2>
                  {selectedTask?.projectName && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{selectedTask.projectName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-200 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">
                    {selectedTask?.projectAddress || selectedTask?.projectName || "Chưa có địa chỉ công trình"}
                  </span>
                </div>

                {/* Khối Tiến độ & Đổi trạng thái */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Tiến độ thi công:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {selectedTask?.progressPercent || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (selectedTask?.progressPercent || 0) >= 100
                          ? "bg-emerald-500"
                          : (selectedTask?.progressPercent || 0) >= 50
                          ? "bg-blue-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, selectedTask?.progressPercent || 0))}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5">
                    <button
                      type="button"
                      disabled={selectedTask?.status === "doing"}
                      onClick={() => handleUpdateTaskStatus(selectedTask?.id, "doing", 50)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border active:scale-95 ${
                        selectedTask?.status === "doing"
                          ? "bg-amber-600 text-white border-amber-500 shadow-xs"
                          : "bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800"
                      }`}
                    >
                      Đang làm
                    </button>
                    <button
                      type="button"
                      disabled={selectedTask?.status === "awaiting_acceptance"}
                      onClick={() => handleUpdateTaskStatus(selectedTask?.id, "awaiting_acceptance", 100)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border active:scale-95 ${
                        selectedTask?.status === "awaiting_acceptance"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : "bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800"
                      }`}
                    >
                      Chờ nghiệm thu
                    </button>
                    <button
                      type="button"
                      disabled={selectedTask?.status === "done"}
                      onClick={() => handleUpdateTaskStatus(selectedTask?.id, "done", 100)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition border active:scale-95 ${
                        selectedTask?.status === "done"
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                          : "bg-slate-900 text-slate-300 border-slate-750 hover:bg-slate-800"
                      }`}
                    >
                      Hoàn thành
                    </button>
                  </div>
                </div>
              </div>

              {/* Thẻ Vị trí GPS & Radar Dẫn đường */}
              <div className="bg-gradient-to-br from-[#0c1322] to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-300">
                      Tọa độ công trình
                    </span>
                  </div>
                  {hasProjectGps ? (
                    <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      {Number(selectedTask.projectLat).toFixed(5)}, {Number(selectedTask.projectLon).toFixed(5)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-medium bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800">
                      Chưa ghim tọa độ
                    </span>
                  )}
                </div>

                {distanceMeters !== null && (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    distanceMeters <= 500
                      ? "bg-emerald-950/50 border-emerald-700 text-emerald-300"
                      : "bg-amber-950/50 border-amber-700 text-amber-300"
                  }`}>
                    <span>Khoảng cách đến vị trí:</span>
                    <span>
                      {formatDistance(distanceMeters)} {distanceMeters <= 500 ? "(Ở tại công trình ✓)" : "(Đang trên đường)"}
                    </span>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenNavigation(selectedTask)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs active:scale-95 transition"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Dẫn đường Google Maps</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: LƯỚI 5 NÚT BẤM SIÊU TO 1 CHẠM */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    5 Tác Vụ Thi Công 1 Chạm Tại Hiện Trường
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thao tác nhanh chóng, tối ưu cho thợ tay dính găng/dầu mỡ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {/* Nút 1: Check-in GPS */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen("gps_view")}
                  className="bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between active:scale-[0.98] transition min-h-[140px] sm:min-h-[150px] text-left group border border-blue-400/20"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Navigation className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-white/20 px-2.5 py-0.5 rounded-full text-white/90">
                      Bước 1
                    </span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-black tracking-tight">1. ĐIỂM DANH GPS</p>
                    <p className="text-xs text-blue-100 font-medium mt-0.5">
                      {distanceMeters !== null
                        ? `Khoảng cách: ${formatDistance(distanceMeters)} · Bán kính < 500m`
                        : "Xác thực vệ tinh bán kính < 500m"}
                    </p>
                  </div>
                </button>

                {/* Nút 2: Chụp ảnh Watermark & Báo cáo Giọng nói AI */}
                <button
                  type="button"
                  onClick={() => {
                    setWatermarkedImage(null);
                    setCurrentScreen("camera_view");
                  }}
                  className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between active:scale-[0.98] transition min-h-[140px] sm:min-h-[150px] text-left group border border-purple-400/20"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-white" />
                      <span className="text-white/60">+</span>
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-white/20 px-2.5 py-0.5 rounded-full text-white/90">
                      Bước 2
                    </span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-black tracking-tight">2. ẢNH GPS & BÁO CÁO AI</p>
                    <p className="text-xs text-purple-100 font-medium mt-0.5">
                      Chụp ảnh in chìm GPS + Giọng nói AI tiếng Việt
                    </p>
                  </div>
                </button>

                {/* Nút 3: Ký số nghiệm thu */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen("signature_view")}
                  className="bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between active:scale-[0.98] transition min-h-[140px] sm:min-h-[150px] text-left group border border-emerald-400/20"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <FileCheck className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-white/20 px-2.5 py-0.5 rounded-full text-white/90">
                      Bước 3
                    </span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-black tracking-tight">3. KÝ SỐ NGHIỆM THU</p>
                    <p className="text-xs text-emerald-100 font-medium mt-0.5">
                      Khách hàng ký cảm ứng trực tiếp tại chỗ
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: SINGLE-FOCUS GPS CHECK-IN & RADAR - RESPONSIVE VIEW
  // ==========================================
  if (currentScreen === "gps_view") {
    const hasProjectGps = Boolean(selectedTask?.projectLat && selectedTask?.projectLon);
    const distanceMeters =
      userCoords && hasProjectGps
        ? calculateDistanceMeters(
            userCoords.latitude,
            userCoords.longitude,
            Number(selectedTask.projectLat),
            Number(selectedTask.projectLon)
          )
        : null;

    const isWithinRadius = distanceMeters !== null ? distanceMeters <= 500 : null;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-3 sm:py-6 px-2 sm:px-6 lg:px-8 text-slate-100">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header Navigation */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentScreen("action_hub")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl active:scale-95 transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Bàn Điều Khiển</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-800">
                {selectedTask?.code}
              </span>
              <Badge variant="info">GPS 🛰️</Badge>
            </div>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Cột Trái: Visual Radar Card & Dẫn đường */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0c1322] to-slate-900 text-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-extrabold tracking-wide uppercase text-[11px] text-slate-300">
                      Radar Vệ Tinh Trực Tuyến
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {userCoords ? `±${userCoords.accuracy}m` : "Dò sóng"}
                  </span>
                </div>

                <div className="flex items-center justify-around py-3 border-y border-slate-800 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Vị trí của bạn</p>
                    <p className="font-mono text-xs font-bold text-emerald-400 mt-1">
                      {userCoords ? `${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}` : "Chưa có"}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-slate-800" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Công trình</p>
                    <p className="font-mono text-xs font-bold text-blue-400 mt-1">
                      {hasProjectGps ? `${Number(selectedTask.projectLat).toFixed(4)}, ${Number(selectedTask.projectLon).toFixed(4)}` : "Chưa lưu"}
                    </p>
                  </div>
                </div>

                {/* Trạng thái Khoảng cách thực tế */}
                {distanceMeters !== null && (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isWithinRadius
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                        : "bg-amber-950/60 text-amber-300 border-amber-700"
                    }`}
                  >
                    <span>Khoảng cách:</span>
                    <span>
                      {formatDistance(distanceMeters)} {isWithinRadius ? "(Hợp lệ < 500m ✓)" : "(Vượt bán kính > 500m ⚠️)"}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenNavigation(selectedTask)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                >
                  <Compass className="w-4 h-4" />
                  <span>Mở Bản Đồ Dẫn Đường Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>

              {/* Cảnh báo nếu ngoài bán kính */}
              {distanceMeters !== null && distanceMeters > 500 && (
                <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl text-xs space-y-1.5 text-amber-200 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cảnh báo khoảng cách điểm danh</p>
                      <p className="text-[11px] text-amber-300/90 leading-relaxed mt-0.5">
                        Bạn đang cách công trình {formatDistance(distanceMeters)} (vượt quá bán kính 500m hợp lệ). Vui lòng di chuyển đến công trình để điểm danh hoặc liên hệ quản lý nếu tọa độ công trình cần hiệu chỉnh.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cột Phải: Bảng Tọa độ chi tiết & Nút Check-in / Check-out */}
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-black text-white">ĐIỂM DANH TỌA ĐỘ VỆ TINH</h2>
                <p className="text-xs text-slate-400">
                  Xác thực vị trí làm việc tại công trình: <strong className="text-slate-200">{selectedTask?.projectName || selectedTask?.title}</strong>
                </p>
              </div>

              {/* Chi tiết Tọa độ Thợ & Công trình */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">Vị trí của bạn:</span>
                    {userCoords ? (
                      <span className="font-mono font-bold text-white block">
                        {userCoords.latitude.toFixed(6)}, {userCoords.longitude.toFixed(6)}
                      </span>
                    ) : locatingUser ? (
                      <span className="text-slate-500 italic">Đang bắt tín hiệu vệ tinh...</span>
                    ) : (
                      <span className="text-rose-400 font-medium">Chưa có tín hiệu GPS</span>
                    )}
                    {userCoords && (
                      <span className="text-[11px] text-slate-500 block">Độ chính xác: ±{userCoords.accuracy}m</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshUserLocation(false)}
                    disabled={locatingUser}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 rounded-lg text-xs active:scale-95 transition shadow-2xs shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${locatingUser ? "animate-spin text-blue-400" : ""}`} />
                    <span>Dò lại</span>
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-2.5">
                  <div className="min-w-0">
                    <span className="text-slate-400 block font-medium">Tọa độ công trình:</span>
                    {hasProjectGps ? (
                      <span className="font-mono font-bold text-blue-400 block">
                        {Number(selectedTask.projectLat).toFixed(6)}, {Number(selectedTask.projectLon).toFixed(6)}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold block">Chưa ghim tọa độ dự án (liên hệ quản lý)</span>
                    )}
                    <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                      {selectedTask?.projectAddress || selectedTask?.projectName}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 Nút Điểm danh Check-in & Check-out */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={checkingIn}
                  onClick={() => handleGpsCheckIn("check_in")}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                >
                  <Navigation className="w-5 h-5" />
                  <span>{checkingIn ? "Đang gửi tọa độ GPS..." : "BẤM CHECK-IN VÀO CA"}</span>
                </button>

                <button
                  type="button"
                  disabled={checkingIn}
                  onClick={() => handleGpsCheckIn("check_out")}
                  className="w-full h-12 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>CHECK-OUT TAN CA LÀM</span>
                </button>
              </div>

              {/* Thẻ Lịch sử Điểm danh gần nhất */}
              {lastEvent && (
                <div className="p-3.5 bg-emerald-950/60 text-emerald-200 border border-emerald-800 rounded-xl text-xs space-y-1 text-left">
                  <div className="flex items-center justify-between font-bold">
                    <span>Điểm danh gần nhất:</span>
                    <span className="text-emerald-400">✓ Đã xác thực vệ tinh</span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-300">
                    Tọa độ: {Number(lastEvent.latitude).toFixed(6)}, {Number(lastEvent.longitude).toFixed(6)}
                  </p>
                  {lastEvent.distanceMeters !== undefined && (
                    <p className="font-extrabold text-xs text-emerald-100">
                      Khoảng cách: {formatDistance(lastEvent.distanceMeters)}{" "}
                      {lastEvent.isWithinRadius ? "(Chuẩn < 500m)" : "(Ngoài bán kính)"}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setCurrentScreen("action_hub")}
                className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-sm transition border border-slate-700"
              >
                [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: SINGLE-FOCUS CAMERA & WATERMARK (LIVE VIEWFINDER) - RESPONSIVE VIEW
  // ==========================================
  // VIEW: MÁY ẢNH WATERMARK GPS & BÁO CÁO GIỌNG NÓI AI (TỔNG HỢP)
  // ==========================================
  if (currentScreen === "camera_view") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-3 sm:py-6 px-2 sm:px-6 lg:px-8 text-white">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header Navigation */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                stopListening();
                setCurrentScreen("action_hub");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-xl active:scale-95 shadow-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Bàn Điều Khiển</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800">
                {selectedTask?.code}
              </span>
              <Badge variant="warning">MÁY ẢNH & BÁO CÁO AI 📷🎙️</Badge>
            </div>
          </div>

          {/* 2-Column Responsive Grid: Cột 1 = Camera Watermark, Cột 2 = Báo cáo Giọng nói AI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* CỘT TRÁI (lg:col-span-6): CHỤP ẢNH IN CHÌM WATERMARK GPS */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <Camera className="w-5 h-5 text-rose-400" />
                      1. Máy Ảnh Watermark GPS
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tự động in chìm GPS, ngày giờ & tên công trình
                    </p>
                  </div>
                  {watermarkedImage && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" /> Đã có ảnh
                    </span>
                  )}
                </div>

                {!watermarkedImage ? (
                  <div className="space-y-3">
                    {/* Live Camera Video Viewfinder */}
                    <div className="relative w-full aspect-4/3 max-h-[360px] min-h-[260px] bg-black rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* HUD Overlay */}
                      <div className="pointer-events-none absolute inset-2.5 border border-white/20 rounded-xl flex flex-col justify-between p-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/90">
                          <span className="bg-rose-600/90 text-white font-bold px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            LIVE
                          </span>
                          <span className="bg-black/60 text-emerald-300 font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                            {userCoords ? `📍 GPS: ${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}` : "Đang dò GPS"}
                          </span>
                        </div>

                        <div className="text-center text-[11px] text-amber-300 font-bold bg-black/60 py-1 px-3 rounded-lg mx-auto backdrop-blur-md border border-white/10 max-w-[95%] truncate">
                          {selectedTask?.projectName || selectedTask?.title || "Công trình"}
                        </div>
                      </div>

                      {/* Camera error */}
                      {cameraError && (
                        <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center space-y-2 z-10">
                          <AlertCircle className="w-8 h-8 text-amber-400" />
                          <p className="text-[11px] text-slate-300 font-medium max-w-xs">{cameraError}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => startCamera(facingMode)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                            >
                              Thử lại
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700"
                            >
                              Chọn ảnh từ máy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Camera Control Buttons */}
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextMode = facingMode === "environment" ? "user" : "environment";
                          setFacingMode(nextMode);
                          startCamera(nextMode);
                        }}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 active:scale-95 transition shadow-sm"
                        title="Đổi camera trước/sau"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleSnapLiveCamera}
                        className="w-16 h-16 rounded-full bg-white text-slate-900 border-4 border-slate-400 flex items-center justify-center shadow-xl active:scale-90 transition hover:bg-slate-100"
                        title="Bấm chụp ảnh"
                      >
                        <div className="w-11 h-11 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-inner">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 active:scale-95 transition shadow-sm"
                        title="Chọn ảnh từ tệp tin"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileCaptureFallback}
                      className="hidden"
                    />
                  </div>
                ) : (
                  /* Preview watermarked image */
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border border-slate-800 max-h-[320px] flex items-center justify-center bg-black/90 p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={watermarkedImage}
                        alt="Ảnh đóng dấu Watermark"
                        className="w-full h-auto max-h-[300px] object-contain rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={watermarkedImage}
                        download={`watermark_${selectedTask?.code || "hien_truong"}_${Date.now()}.jpg`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải ảnh</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setWatermarkedImage(null);
                          startCamera(facingMode);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Chụp lại</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI (lg:col-span-6): BÁO CÁO GIỌNG NÓI AI & SUBMIT TỔNG HỢP */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <Mic className="w-5 h-5 text-amber-400" />
                      2. Báo Cáo Giọng Nói AI
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Nói tự nhiên tiếng Việt · Tự chuyển thành văn bản báo cáo
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                    vi-VN
                  </span>
                </div>

                {/* Big One-Touch Mic Button */}
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {isListening && (
                        <div className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping" />
                      )}
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md shrink-0 ${
                          isListening
                            ? "bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-950"
                            : "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 text-white"
                        }`}
                      >
                        {isListening ? (
                          <MicOff className="w-6 h-6 animate-bounce" />
                        ) : (
                          <Mic className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {isListening ? "Đang lắng nghe tiếng Việt..." : "Bấm Micro để nói báo cáo"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isListening ? "Chạm lần nữa để dừng thu âm" : "Nói nội dung công việc đã hoàn thành"}
                      </span>
                    </div>
                  </div>

                  {isListening && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-1 h-3 bg-rose-500 rounded-full animate-pulse" />
                      <span className="w-1 h-5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-4 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>

                {/* Interim Live Transcript */}
                {interimVoiceText && (
                  <div className="p-2.5 bg-amber-950/60 border border-amber-800 rounded-xl text-xs text-amber-200 animate-pulse flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[10px] text-amber-300 block">Đang ghi nhận:</span>
                      <span className="italic">&quot;{interimVoiceText}&quot;</span>
                    </div>
                  </div>
                )}

                {/* Editable Report Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      Nội dung báo cáo công việc:
                    </label>
                    {voiceText && (
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceText("");
                          setInterimVoiceText("");
                          toast.success("Đã xóa trắng");
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Xóa làm lại
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    placeholder="Nội dung nói hoặc nhập tay sẽ hiển thị ở đây..."
                    className="w-full p-3 text-xs border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Quick Voice Chips */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Mẫu câu nhanh:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {quickVoiceTemplates.slice(0, 4).map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAppendVoiceTemplate(template)}
                        className="text-[10px] bg-slate-850 hover:bg-amber-950/60 hover:border-amber-700 hover:text-amber-200 text-slate-300 px-2 py-1 rounded-lg border border-slate-750 transition text-left active:scale-95"
                      >
                        + {template}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NÚT NỘP BÁO CÁO CÔNG VIỆC TỔNG HỢP */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={submittingVoiceReport || (!voiceText.trim() && !interimVoiceText.trim() && !watermarkedImage)}
                    onClick={async () => {
                      const textToSubmit = (voiceText || interimVoiceText || (watermarkedImage ? "Đã chụp ảnh hoàn thành thi công tại hiện trường" : "")).trim();
                      if (!textToSubmit) {
                        toast.error("Vui lòng chụp ảnh hoặc nói/nhập nội dung báo cáo");
                        return;
                      }
                      try {
                        setSubmittingVoiceReport(true);
                        stopListening();
                        stopCamera();

                        const res = await fetch("/api/field/work-reports", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            taskId: selectedTask?.id,
                            projectId: selectedTask?.projectId,
                            speechText: textToSubmit,
                            notes: textToSubmit + (watermarkedImage ? " [Kèm ảnh Watermark GPS]" : ""),
                            completionPercentage: 85,
                          }),
                        });

                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || "Lỗi gửi báo cáo");
                        }

                        toast.success("Đã nộp báo cáo ảnh & nhật ký công việc lên hệ thống thành công!");
                        if (selectedTask) {
                          setSelectedTask((prev: any) => ({
                            ...prev,
                            status: "awaiting_acceptance",
                            progressPercent: 85,
                          }));
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === selectedTask.id
                                ? { ...t, status: "awaiting_acceptance", progressPercent: 85 }
                                : t
                            )
                          );
                        }

                        setVoiceText("");
                        setInterimVoiceText("");
                        setCurrentScreen("action_hub");
                        fetchMyTasks();
                      } catch (e: any) {
                        toast.error(e.message || "Không thể gửi báo cáo");
                      } finally {
                        setSubmittingVoiceReport(false);
                      }
                    }}
                    className="w-full h-13 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                  >
                    <Send className={`w-4 h-4 ${submittingVoiceReport ? "animate-spin" : ""}`} />
                    <span>{submittingVoiceReport ? "ĐANG NỘP BÁO CÁO..." : "NỘP BÁO CÁO (KÈM ẢNH & GIỌNG NÓI)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      stopListening();
                      setCurrentScreen("action_hub");
                    }}
                    className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-semibold text-xs transition border border-slate-700"
                  >
                    Về Bàn Điều Khiển
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: KÝ SỐ NGHIỆM THU - RESPONSIVE VIEW
  // ==========================================
  if (currentScreen === "signature_view") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-3 sm:py-6 px-2 sm:px-6 lg:px-8 text-slate-100">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Header Navigation */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentScreen("action_hub")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl active:scale-95 transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Bàn Điều Khiển</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-emerald-400 bg-emerald-950/70 px-2.5 py-1 rounded-md border border-emerald-800">
                {selectedTask?.code}
              </span>
              <Badge variant="success">KÝ SỐ ✍️</Badge>
            </div>
          </div>

          <div className="bg-[#0f172a] p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-base sm:text-lg font-black text-white">
                KÝ SỐ NGHIỆM THU TRỰC TIẾP TRÊN MÀN HÌNH
              </h2>
              <p className="text-xs text-slate-400">
                Đưa thiết bị cho đại diện khách hàng hoặc quản lý ký xác nhận hoàn thành công trình
              </p>
            </div>

            {/* Khung Canvas Chữ ký số */}
            <div className="relative rounded-2xl border-2 border-dashed border-blue-500/50 bg-slate-900/90 overflow-hidden w-full h-[220px] sm:h-[260px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={260}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full touch-none cursor-crosshair"
              />
              {!hasSignature && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-blue-400 font-bold">
                  ✍️ Khách hàng ký tên tại đây (bằng ngón tay, bút cảm ứng hoặc chuột)
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Input
                placeholder="Nhập họ và tên người ký nghiệm thu (VD: Nguyễn Minh Quân)..."
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="text-xs h-11 flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-900 rounded-xl"
              />
              <button
                type="button"
                onClick={clearSignature}
                className="p-3 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl flex-shrink-0 transition active:scale-95 shadow-2xs"
                title="Xóa ký lại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveSignature}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>XÁC NHẬN & LƯU BIÊN BẢN NGHIỆM THU</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen("action_hub")}
              className="w-full h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-sm transition border border-slate-700"
            >
              [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function FieldOpsAppPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-semibold">
          Đang tải không gian tác nghiệp Hiện Trường...
        </div>
      }
    >
      <FieldOpsContent />
    </React.Suspense>
  );
}
