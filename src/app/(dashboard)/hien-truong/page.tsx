"use client";

import * as React from "react";
import Link from "next/link";
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
  Search
} from "lucide-react";
import { Badge, Button, Input, Modal, toast } from "@/components/ui";
import { useSetPageHeader } from "@/contexts/page-header-context";

type ActiveScreen = 
  | "task_list" 
  | "action_hub" 
  | "gps_view" 
  | "camera_view" 
  | "voice_view" 
  | "signature_view" 
  | "materials_view";

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

export default function FieldOpsMobilePage() {
  const [currentScreen, setCurrentScreen] = React.useState<ActiveScreen>("task_list");
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [employee, setEmployee] = React.useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  // Live GPS Tracking State
  const [userCoords, setUserCoords] = React.useState<UserCoordinates | null>(null);
  const [locatingUser, setLocatingUser] = React.useState(false);
  const [checkingIn, setCheckingIn] = React.useState(false);
  const [lastEvent, setLastEvent] = React.useState<any | null>(null);
  const [isUpdatingProjectLocation, setIsUpdatingProjectLocation] = React.useState(false);

  // Manual GPS Edit Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [manualAddress, setManualAddress] = React.useState("");
  const [manualLat, setManualLat] = React.useState("");
  const [manualLon, setManualLon] = React.useState("");
  const [mapsLinkInput, setMapsLinkInput] = React.useState("");
  const [resolvingMapsUrl, setResolvingMapsUrl] = React.useState(false);
  const [geocodingAddress, setGeocodingAddress] = React.useState(false);

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

  useSetPageHeader({
    title: "Hiện Trường & Thi Công",
    subtitle: "Chấm công GPS, Dẫn đường, Camera Watermark, Chữ ký số & AI Voice",
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
  }, []);

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

  // Mở Modal Chỉnh sửa Tọa độ thủ công
  const handleOpenEditLocationModal = (task: any) => {
    setManualAddress(task?.projectAddress || "");
    setManualLat(task?.projectLat ? String(task.projectLat) : userCoords ? String(userCoords.latitude) : "");
    setManualLon(task?.projectLon ? String(task.projectLon) : userCoords ? String(userCoords.longitude) : "");
    setMapsLinkInput("");
    setIsLocationModalOpen(true);
  };

  // Dò tìm tên & địa chỉ từ Tọa độ GPS (Reverse Geocoding)
  const handleReverseGeocode = async (latStr?: string, lonStr?: string, silent: boolean = false) => {
    const lat = Number(latStr || manualLat);
    const lon = Number(lonStr || manualLon);
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      if (!silent) toast.error("Vui lòng nhập hoặc chọn tọa độ hợp lệ trước");
      return;
    }

    try {
      setGeocodingAddress(true);
      const res = await fetch("/api/field/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      const data = await res.json();

      if (data.address) {
        setManualAddress(data.address);
        if (!silent) {
          toast.success(`Đã tự động tìm thấy địa chỉ: ${data.address}`);
        }
      } else if (!silent) {
        toast.info("Chưa tìm thấy tên địa chỉ tự động, bạn có thể gõ trực tiếp vào ô");
      }
    } catch {
      if (!silent) {
        toast.info("Không thể kết nối dịch vụ bản đồ, bạn có thể tự nhập địa chỉ");
      }
    } finally {
      setGeocodingAddress(false);
    }
  };

  // Bóc tách nhanh chuỗi tọa độ hoặc link Google Maps
  const handleParseMapsInput = (input: string) => {
    setMapsLinkInput(input);
    if (!input.trim()) return;

    // Trường hợp 1: Dạng chuỗi số "10.846090, 106.792672" hoặc "10.846090 106.792672"
    const plainCoordMatch = input.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
    if (plainCoordMatch) {
      setManualLat(plainCoordMatch[1]);
      setManualLon(plainCoordMatch[2]);
      toast.success(`Đã nhận diện tọa độ: ${plainCoordMatch[1]}, ${plainCoordMatch[2]}`);
      handleReverseGeocode(plainCoordMatch[1], plainCoordMatch[2], true);
      return;
    }

    // Trường hợp 2: Dạng URL @10.846090,106.792672 hoặc q=10.846090,106.792672
    const urlMatch = input.match(/[@=](-?\d+\.\d+)[,/](-?\d+\.\d+)/);
    if (urlMatch) {
      setManualLat(urlMatch[1]);
      setManualLon(urlMatch[2]);
      toast.success(`Đã trích xuất tọa độ từ URL: ${urlMatch[1]}, ${urlMatch[2]}`);
      handleReverseGeocode(urlMatch[1], urlMatch[2], true);
      return;
    }

    // Trường hợp 3: Link rút gọn maps.app.goo.gl hoặc goo.gl
    if (input.includes("maps.app.goo.gl") || input.includes("goo.gl") || input.includes("google.com/maps")) {
      handleExtractCoordinatesFromLink(input);
    }
  };

  // Trích xuất tọa độ từ backend bằng API resolve-maps-url
  const handleExtractCoordinatesFromLink = async (customInput?: string) => {
    const inputToResolve = (customInput || mapsLinkInput || "").trim();
    if (!inputToResolve) {
      toast.error("Vui lòng dán link Google Maps hoặc chuỗi tọa độ vào ô");
      return;
    }

    try {
      setResolvingMapsUrl(true);
      const res = await fetch("/api/field/resolve-maps-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputToResolve }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể trích xuất tọa độ từ liên kết này");
      }

      const lat = String(data.latitude);
      const lon = String(data.longitude);
      setManualLat(lat);
      setManualLon(lon);

      if (data.address || data.placeName) {
        setManualAddress(data.address || data.placeName);
      }

      toast.success(
        `Đã lấy ra tọa độ thành công: ${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}${data.address ? ` (${data.address})` : ""}`
      );
    } catch (err: any) {
      toast.error(err.message || "Lỗi giải mã liên kết");
    } finally {
      setResolvingMapsUrl(false);
    }
  };

  // Lưu Tọa độ & Địa chỉ Công trình theo form nhập
  const handleSaveCustomLocation = async () => {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast.error("Vui lòng nhập tọa độ hợp lệ (Vĩ độ: -90..90, Kinh độ: -180..180)");
      return;
    }
    if (!selectedTask?.projectId) {
      toast.error("Không tìm thấy thông tin dự án");
      return;
    }

    try {
      setIsUpdatingProjectLocation(true);
      const addressToSend = manualAddress.trim();
      const res = await fetch("/api/field/update-project-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedTask.projectId,
          latitude: lat,
          longitude: lon,
          address: addressToSend || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu tọa độ dự án");

      const finalAddress = data.project?.address || addressToSend || selectedTask.projectAddress;

      toast.success(`Đã cập nhật vị trí công trình: ${finalAddress} (${lat.toFixed(5)}, ${lon.toFixed(5)})`);

      setSelectedTask((prev: any) => ({
        ...prev,
        projectAddress: finalAddress,
        projectLat: lat,
        projectLon: lon,
      }));
      setTasks((prev) =>
        prev.map((t) =>
          t.projectId === selectedTask.projectId
            ? { ...t, projectAddress: finalAddress, projectLat: lat, projectLon: lon }
            : t
        )
      );
      setIsLocationModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    } finally {
      setIsUpdatingProjectLocation(false);
    }
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

  // Dừng micro khi rời khỏi màn hình giọng nói
  React.useEffect(() => {
    if (currentScreen !== "voice_view" && recognitionRef.current) {
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
  // VIEW 1: DANH SÁCH VIỆC HÔM NAY (TASK LIST)
  // ==========================================
  if (currentScreen === "task_list") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        {/* Top Header Thợ & GPS Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
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

          {/* Vị trí GPS hiện tại của thợ */}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full ${userCoords ? "bg-emerald-500 animate-pulse" : "bg-amber-500"} shrink-0`} />
              <div className="truncate">
                {userCoords ? (
                  <span className="font-mono text-[11px] text-slate-700 font-semibold">
                    📍 GPS: {userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)} (±{userCoords.accuracy}m)
                  </span>
                ) : locatingUser ? (
                  <span className="text-slate-500 italic">Đang quét vị trí vệ tinh...</span>
                ) : (
                  <span className="text-amber-700 font-medium">Chưa kết nối GPS</span>
                )}
              </div>
            </div>
            <button
              onClick={() => refreshUserLocation(false)}
              disabled={locatingUser}
              className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-white transition shrink-0"
              title="Làm mới tọa độ GPS"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locatingUser ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tiêu đề danh sách */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Việc Hiện Trường Được Giao ({tasks.length})
          </h2>
          <span className="text-xs text-slate-500">Chạm để mở Bàn Điều Khiển</span>
        </div>

        {/* Danh sách thẻ công việc */}
        <div className="space-y-3 flex-1">
          {loading ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 animate-pulse">
              Đang tải danh sách việc hiện trường...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              Chưa có công việc hiện trường nào có lịch hẹn. Hãy liên hệ Chỉ Huy Trưởng!
            </div>
          ) : (
            tasks.map((t) => {
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
                  className="bg-white p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 active:scale-[0.99] transition cursor-pointer shadow-xs space-y-2.5"
                  onClick={() => {
                    setSelectedTask(t);
                    setCurrentScreen("action_hub");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                      {t.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hasGps ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Navigation className="w-2.5 h-2.5" /> Có GPS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <MapPin className="w-2.5 h-2.5" /> Chưa ghim GPS
                        </span>
                      )}
                      {getStatusBadge(t.status)}
                    </div>
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

                  <div className="flex items-start justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <span className="font-medium line-clamp-2">
                        {t.projectAddress || t.projectName}
                      </span>
                    </div>
                    {distanceMeters !== null && (
                      <span className={`shrink-0 font-bold font-mono text-[11px] px-2 py-1 rounded-md ${
                        distanceMeters <= 500 ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"
                      }`}>
                        Cách {formatDistance(distanceMeters)}
                      </span>
                    )}
                  </div>

                  {/* Thanh nút mở nhanh */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNavigation(t);
                      }}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Dẫn đường Google Maps</span>
                    </button>

                    <div className="flex items-center gap-1 text-blue-600 font-bold">
                      <span>Bàn Điều Khiển</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: BÀN ĐIỀU KHIỂN 1 CHẠM (ACTION HUB)
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
      <div className="mx-auto max-w-md min-h-screen bg-slate-100 flex flex-col p-4 space-y-4">
        {/* Nút Quay Lại & Header Task */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
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
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span className="truncate">{selectedTask?.projectAddress || selectedTask?.projectName}</span>
            </div>
          </div>

          {/* Khối Thông tin Vị trí & Dẫn đường công trình */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-800">Tọa độ công trình:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasProjectGps ? (
                  <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {Number(selectedTask.projectLat).toFixed(5)}, {Number(selectedTask.projectLon).toFixed(5)}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Chưa lưu tọa độ vệ tinh
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenEditLocationModal(selectedTask)}
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition"
                  title="Chỉnh sửa tọa độ thủ công"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {distanceMeters !== null && (
              <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-600">Khoảng cách hiện tại:</span>
                <span className={`font-mono font-extrabold ${distanceMeters <= 500 ? "text-emerald-600" : "text-amber-600"}`}>
                  {formatDistance(distanceMeters)} {distanceMeters <= 500 ? "(Ở tại công trình ✓)" : "(Đang trên đường)"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenNavigation(selectedTask)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs active:scale-95 transition"
              >
                <Compass className="w-4 h-4" />
                <span>Dẫn đường Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEditLocationModal(selectedTask)}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 active:scale-95 transition"
                title="Cập nhật vị trí & tọa độ công trình"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Sửa vị trí</span>
              </button>
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
                <p className="text-xs text-blue-100 font-medium mt-0.5">
                  {distanceMeters !== null
                    ? `Khoảng cách: ${formatDistance(distanceMeters)} · Bán kính < 500m`
                    : "Xác thực vệ tinh bán kính < 500m"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>

          {/* Nút 2: Chụp ảnh Watermark */}
          <button
            onClick={() => {
              setWatermarkedImage(null);
              setCurrentScreen("camera_view");
            }}
            className="w-full h-20 bg-gradient-to-r from-slate-900 to-slate-800 hover:bg-slate-950 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="p-3 bg-white/10 rounded-xl">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-wide">2. CHỤP ẢNH IN CHÌM WATERMARK</p>
                <p className="text-xs text-slate-300 font-medium mt-0.5">Live Camera Viewfinder · In chìm GPS & Giờ</p>
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

        {/* Modal Chỉnh sửa Tọa độ & Địa chỉ Công trình */}
        <Modal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          title="Cập Nhật Vị Trí & Tọa Độ GPS Công Trình"
          description={`Dự án: ${selectedTask?.projectName || "Công trình thi công"}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs pt-1">
            {/* Nhận diện từ Google Maps Link */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Dán nhanh từ link Google Maps hoặc chuỗi tọa độ:
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="VD: https://maps.app.goo.gl/391e7ifykHmV19AH7"
                  value={mapsLinkInput}
                  onChange={(e) => handleParseMapsInput(e.target.value)}
                  className="text-xs bg-white flex-1 font-mono"
                />
                <button
                  type="button"
                  disabled={resolvingMapsUrl || !mapsLinkInput.trim()}
                  onClick={() => handleExtractCoordinatesFromLink()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 active:scale-95 shadow-2xs"
                  title="Bấm để lấy tọa độ từ link Google Maps"
                >
                  <Search className={`w-3.5 h-3.5 ${resolvingMapsUrl ? "animate-spin" : ""}`} />
                  <span>{resolvingMapsUrl ? "Đang lấy..." : "Lấy tọa độ"}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Hỗ trợ cả link rút gọn (maps.app.goo.gl), link web hoặc chuỗi tọa độ (10.846090, 106.792672).
              </p>
            </div>

            {/* Nhập Tên & Địa chỉ hiển thị */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">
                  Địa chỉ công trình thực tế *
                </label>
                <button
                  type="button"
                  disabled={geocodingAddress || !manualLat || !manualLon}
                  onClick={() => handleReverseGeocode(manualLat, manualLon, false)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline disabled:opacity-40"
                  title="Tự động dò địa chỉ từ vĩ độ và kinh độ"
                >
                  <Compass className={`w-3 h-3 ${geocodingAddress ? "animate-spin" : ""}`} />
                  <span>{geocodingAddress ? "Đang dò..." : "Dò địa chỉ từ tọa độ"}</span>
                </button>
              </div>
              <Input
                type="text"
                placeholder="VD: 191 Bà Triệu, Phường Lê Đại Hành, Quận Hai Bà Trưng, Hà Nội"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                className="text-xs bg-white"
              />
            </div>

            {/* Nhập Vĩ độ / Kinh độ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Vĩ độ (Latitude) *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="VD: 10.846090"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Kinh độ (Longitude) *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="VD: 106.792672"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Nút Lấy GPS thiết bị */}
            {userCoords && (
              <button
                type="button"
                onClick={() => {
                  const latStr = String(userCoords.latitude);
                  const lonStr = String(userCoords.longitude);
                  setManualLat(latStr);
                  setManualLon(lonStr);
                  handleReverseGeocode(latStr, lonStr, true);
                  toast.success("Đã điền tọa độ GPS thiết bị hiện tại của bạn!");
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold flex items-center justify-center gap-1.5 transition border border-slate-200 text-xs"
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                <span>Điền tọa độ GPS thiết bị ({userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)})</span>
              </button>
            )}

            {/* Nút Lưu */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isUpdatingProjectLocation || !manualLat || !manualLon}
                onClick={handleSaveCustomLocation}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isUpdatingProjectLocation ? "Đang lưu..." : "Lưu Vị Trí & Tọa Độ"}</span>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: SINGLE-FOCUS GPS CHECK-IN & RADAR
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

        {/* Khối Thẻ Vệ Tinh Radar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Navigation className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">ĐIỂM DANH TỌA ĐỘ VỆ TINH</h2>
            <p className="text-xs text-slate-500">
              Kiểm tra vị trí và khoảng cách đến công trình <br />
              <strong className="text-slate-800">{selectedTask?.projectName}</strong>
            </p>
          </div>

          {/* Bảng so sánh Tọa độ Thợ & Tọa độ Công trình */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-slate-500 block font-medium">Vị trí của bạn:</span>
                {userCoords ? (
                  <span className="font-mono font-bold text-slate-900 block">
                    {userCoords.latitude.toFixed(6)}, {userCoords.longitude.toFixed(6)}
                  </span>
                ) : locatingUser ? (
                  <span className="text-slate-400 italic">Đang bắt tín hiệu vệ tinh...</span>
                ) : (
                  <span className="text-rose-600 font-medium">Chưa có tín hiệu GPS</span>
                )}
                {userCoords && (
                  <span className="text-[11px] text-slate-400 block">Độ chính xác: ±{userCoords.accuracy}m</span>
                )}
              </div>
              <button
                onClick={() => refreshUserLocation(false)}
                disabled={locatingUser}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg text-[11px] active:scale-95 transition"
              >
                <RefreshCw className={`w-3 h-3 ${locatingUser ? "animate-spin text-blue-600" : ""}`} />
                Dò lại
              </button>
            </div>

            <div className="border-t border-slate-200/80 pt-2 flex items-start justify-between">
              <div>
                <span className="text-slate-500 block font-medium">Tọa độ công trình:</span>
                {hasProjectGps ? (
                  <span className="font-mono font-bold text-blue-700 block">
                    {Number(selectedTask.projectLat).toFixed(6)}, {Number(selectedTask.projectLon).toFixed(6)}
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold block">Chưa ghim tọa độ dự án</span>
                )}
                <span className="text-[11px] text-slate-500 truncate max-w-[190px] block">
                  {selectedTask?.projectAddress || selectedTask?.projectName}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEditLocationModal(selectedTask)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg text-[11px] transition shadow-2xs"
                  title="Chỉnh sửa vị trí / tọa độ công trình"
                >
                  <Edit3 className="w-3 h-3 text-slate-600" />
                  <span>Sửa tọa độ</span>
                </button>
              </div>
            </div>

            {/* Trạng thái Khoảng cách thực tế */}
            {distanceMeters !== null && (
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between font-bold ${
                  isWithinRadius
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-amber-50 text-amber-900 border-amber-200"
                }`}
              >
                <span>Khoảng cách:</span>
                <span>
                  {formatDistance(distanceMeters)} {isWithinRadius ? "(Hợp lệ < 500m ✓)" : "(Vượt bán kính > 500m ⚠️)"}
                </span>
              </div>
            )}
          </div>

          {/* Cảnh báo khoảng cách nếu xa công trình */}
          {distanceMeters !== null && distanceMeters > 500 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cảnh báo khoảng cách điểm danh</p>
                  <p className="text-[11px] text-amber-800">
                    Bạn đang cách công trình {formatDistance(distanceMeters)} (vượt quá bán kính 500m hợp lệ). Vui lòng di chuyển đến công trình để điểm danh hoặc liên hệ quản lý dự án nếu tọa độ công trình cần hiệu chỉnh.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Visual Radar Card & Link Google Maps */}
          <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-950 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold tracking-wide uppercase text-[11px] text-slate-300">Radar Vệ Tinh Trực Tuyến</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                {userCoords ? `±${userCoords.accuracy}m` : "Dò sóng"}
              </span>
            </div>

            <div className="flex items-center justify-around py-2 border-y border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Vị trí của bạn</p>
                <p className="font-mono text-xs font-bold text-emerald-400 mt-0.5">
                  {userCoords ? `${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}` : "Chưa có"}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Công trình</p>
                <p className="font-mono text-xs font-bold text-blue-400 mt-0.5">
                  {hasProjectGps ? `${Number(selectedTask.projectLat).toFixed(4)}, ${Number(selectedTask.projectLon).toFixed(4)}` : "Chưa lưu"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNavigation(selectedTask)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Compass className="w-4 h-4" />
              <span>Mở Bản Đồ Dẫn Đường Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>

          {/* 2 Nút Điểm danh Check-in & Check-out */}
          <div className="space-y-2.5 pt-1">
            <button
              disabled={checkingIn}
              onClick={() => handleGpsCheckIn("check_in")}
              className="w-full h-15 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              <Navigation className="w-5 h-5" />
              <span>{checkingIn ? "Đang gửi tọa độ GPS..." : "BẤM CHECK-IN VÀO CA"}</span>
            </button>

            <button
              disabled={checkingIn}
              onClick={() => handleGpsCheckIn("check_out")}
              className="w-full h-13 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              <span>CHECK-OUT TAN CA LÀM</span>
            </button>
          </div>

          {/* Thẻ Lịch sử Điểm danh gần nhất */}
          {lastEvent && (
            <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs space-y-1 text-left">
              <div className="flex items-center justify-between font-bold">
                <span>Điểm danh gần nhất:</span>
                <span className="text-emerald-700">✓ Đã xác thực vệ tinh</span>
              </div>
              <p className="text-[11px] font-mono text-emerald-800">
                Tọa độ: {Number(lastEvent.latitude).toFixed(6)}, {Number(lastEvent.longitude).toFixed(6)}
              </p>
              {lastEvent.distanceMeters !== undefined && (
                <p className="font-extrabold text-xs text-emerald-950">
                  Khoảng cách: {formatDistance(lastEvent.distanceMeters)}{" "}
                  {lastEvent.isWithinRadius ? "(Chuẩn < 500m)" : "(Ngoài bán kính)"}
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

        {/* Modal Chỉnh sửa Tọa độ Công trình */}
        <Modal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          title="Cập Nhật Tọa Độ GPS Công Trình"
          description={`Dự án: ${selectedTask?.projectName || "Công trình thi công"}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs pt-1">
            {/* Nhận diện từ Google Maps Link */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Dán nhanh từ link Google Maps hoặc chuỗi tọa độ:
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="VD: https://maps.app.goo.gl/391e7ifykHmV19AH7"
                  value={mapsLinkInput}
                  onChange={(e) => handleParseMapsInput(e.target.value)}
                  className="text-xs bg-white flex-1 font-mono"
                />
                <button
                  type="button"
                  disabled={resolvingMapsUrl || !mapsLinkInput.trim()}
                  onClick={() => handleExtractCoordinatesFromLink()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 active:scale-95 shadow-2xs"
                  title="Bấm để lấy tọa độ từ link Google Maps"
                >
                  <Search className={`w-3.5 h-3.5 ${resolvingMapsUrl ? "animate-spin" : ""}`} />
                  <span>{resolvingMapsUrl ? "Đang lấy..." : "Lấy tọa độ"}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Hỗ trợ cả link rút gọn (maps.app.goo.gl), link web hoặc chuỗi tọa độ (10.846090, 106.792672).
              </p>
            </div>

            {/* Nhập Vĩ độ / Kinh độ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Vĩ độ (Latitude) *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="VD: 10.846090"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Kinh độ (Longitude) *
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="VD: 106.792672"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Nút Lấy GPS thiết bị */}
            {userCoords && (
              <button
                type="button"
                onClick={() => {
                  setManualLat(String(userCoords.latitude));
                  setManualLon(String(userCoords.longitude));
                  toast.success("Đã điền tọa độ GPS thiết bị hiện tại của bạn!");
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold flex items-center justify-center gap-1.5 transition border border-slate-200"
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                <span>Điền tọa độ GPS thiết bị của tôi ({userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)})</span>
              </button>
            )}

            {/* Nút Lưu */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isUpdatingProjectLocation || !manualLat || !manualLon}
                onClick={handleSaveCustomLocation}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isUpdatingProjectLocation ? "Đang lưu..." : "Lưu Tọa Độ"}</span>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW 4: SINGLE-FOCUS CAMERA & WATERMARK (LIVE VIEWFINDER)
  // ==========================================
  if (currentScreen === "camera_view") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-900 flex flex-col p-4 space-y-4 text-white">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              stopCamera();
              setCurrentScreen("action_hub");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bàn Điều Khiển
          </button>
          <Badge variant="warning">CAMERA WATERMARK 📷</Badge>
        </div>

        {/* Khung Chụp ảnh hoặc Xem lại ảnh */}
        {!watermarkedImage ? (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="text-center space-y-0.5">
              <h2 className="text-base font-black text-white">MÁY ẢNH TRỰC TIẾP HIỆN TRƯỜNG</h2>
              <p className="text-xs text-slate-400">
                In chìm tọa độ GPS thực tế, giờ phút giây và tên công trình
              </p>
            </div>

            {/* Live Camera Video Viewfinder */}
            <div className="relative flex-1 min-h-[360px] bg-black rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Lưới căn góc Viewfinder */}
              <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-xl flex flex-col justify-between p-2">
                <div className="flex justify-between text-[10px] text-white/60 font-mono">
                  <span>REC [●]</span>
                  <span>
                    {userCoords ? `GPS: ${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}` : "Đang dò GPS"}
                  </span>
                </div>
                <div className="text-center text-[11px] text-amber-300 font-bold bg-black/40 py-1 px-2 rounded-lg mx-auto backdrop-blur-xs">
                  {selectedTask?.projectName || "Công trình thi công"}
                </div>
              </div>

              {/* Thông báo lỗi nếu không mở được camera */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-xs text-slate-300 font-medium">{cameraError}</p>
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                  >
                    Thử lại camera
                  </button>
                </div>
              )}
            </div>

            {/* Bảng điều khiển Chụp ảnh */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-around">
                {/* Nút đổi camera trước / sau */}
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = facingMode === "environment" ? "user" : "environment";
                    setFacingMode(nextMode);
                    startCamera(nextMode);
                  }}
                  className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 transition"
                  title="Đổi camera trước/sau"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>

                {/* Nút Chụp ảnh Shutter to rõ */}
                <button
                  type="button"
                  onClick={handleSnapLiveCamera}
                  className="w-20 h-20 rounded-full bg-white text-slate-900 border-4 border-slate-400 flex items-center justify-center shadow-lg active:scale-90 transition hover:bg-slate-100"
                  title="Bấm để chụp ảnh"
                >
                  <div className="w-14 h-14 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </button>

                {/* Nút Chọn file từ bộ nhớ (Fallback) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 transition"
                  title="Chọn ảnh từ tệp tin"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileCaptureFallback}
                className="hidden"
              />

              <p className="text-[11px] text-center text-slate-400">
                Chạm nút tròn đỏ để chụp hoặc chạm biểu tượng thư mục để tải ảnh từ bộ nhớ
              </p>
            </div>
          </div>
        ) : (
          /* Màn hình Xem lại ảnh đã đóng dấu Watermark */
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCheck className="w-4 h-4" />
                  ĐÃ ĐÓNG DẤU WATERMARK THÀNH CÔNG
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ảnh đã được in chìm GPS vệ tinh và thời gian thực tế
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-700 shadow-md max-h-[420px] flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={watermarkedImage}
                  alt="Ảnh đóng dấu Watermark"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2">
                <a
                  href={watermarkedImage}
                  download={`watermark_${selectedTask?.code || "hien_truong"}_${Date.now()}.jpg`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải ảnh về máy</span>
                </a>

                <button
                  onClick={() => {
                    setWatermarkedImage(null);
                    startCamera(facingMode);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Chụp lại ảnh khác</span>
                </button>
              </div>

              <button
                onClick={() => {
                  stopCamera();
                  setCurrentScreen("action_hub");
                }}
                className="w-full py-3 bg-slate-900 hover:bg-black text-slate-200 border border-slate-700 rounded-xl font-bold text-xs shadow-xs"
              >
                [XONG] QUAY LẠI BÀN ĐIỀU KHIỂN
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 5: SINGLE-FOCUS BÁO CÁO GIỌNG NÓI AI
  // ==========================================
  if (currentScreen === "voice_view") {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-slate-50 flex flex-col p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              stopListening();
              setCurrentScreen("action_hub");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl active:scale-95 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bàn Điều Khiển
          </button>
          <Badge variant="warning">AI VOICE 🎙️</Badge>
        </div>

        {/* Card chính Báo cáo giọng nói */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Báo Cáo Nhanh Bằng Giọng Nói
            </h2>
            <p className="text-xs text-slate-500">
              Dành cho thợ tay dính sơn dầu, không cần gõ phím. <br />
              <strong className="text-slate-800">{selectedTask?.projectName || "Công trình thi công"}</strong>
            </p>
          </div>

          {/* Nút Micro Thu Âm Siêu To với Hiệu Ứng Sóng Âm Live */}
          <div className="py-2 flex flex-col items-center justify-center space-y-3">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute -inset-3 rounded-full bg-rose-400/30 animate-ping" />
                  <div className="absolute -inset-1.5 rounded-full bg-rose-500/20 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={toggleListening}
                className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all duration-300 ${
                  isListening
                    ? "bg-rose-600 hover:bg-rose-700 text-white ring-8 ring-rose-100 shadow-rose-200"
                    : "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-200"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-9 h-9 mb-1 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      DỪNG LẠI
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-9 h-9 mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      BẤM ĐỂ NÓI
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Trạng thái sóng âm khi đang thu */}
            {isListening ? (
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-8 bg-rose-600 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
                  <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                </div>
                <span className="text-xs font-bold text-rose-600 animate-pulse">
                  Đang lắng nghe tiếng Việt (vi-VN)... Hãy nói tự nhiên!
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">
                Chạm vào nút Micro để bật thu âm trực tiếp
              </p>
            )}
          </div>

          {/* Dòng chữ nhận diện trực tiếp trong lúc nói (Interim live text) */}
          {interimVoiceText && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 animate-pulse flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-[11px] text-amber-700">Đang nhận diện giọng nói:</span>
                <span className="italic font-medium">&quot;{interimVoiceText}&quot;</span>
              </div>
            </div>
          )}

          {/* Khung nội dung văn bản báo cáo */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                Văn bản báo cáo tổng hợp:
              </label>
              {voiceText && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceText("");
                    setInterimVoiceText("");
                    toast.success("Đã xóa trắng nội dung");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
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
              placeholder="Nội dung nói sẽ tự động chuyển thành văn bản tại đây (bạn cũng có thể gõ hoặc sửa thủ công)..."
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed bg-slate-50 text-slate-900"
            />
          </div>

          {/* Gợi ý mẫu câu nhanh (Quick Voice Chips) */}
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Chạm để chèn nhanh câu mẫu ca làm việc:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickVoiceTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAppendVoiceTemplate(template)}
                  className="text-[11px] bg-slate-100 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 transition text-left active:scale-95"
                >
                  + {template}
                </button>
              ))}
            </div>
          </div>

          {/* Cảnh báo hỗ trợ trình duyệt nếu có */}
          {!isSpeechSupported && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Khuyến nghị trình duyệt</span>
                <span>Vui lòng mở trên Google Chrome, Microsoft Edge hoặc Safari để tính năng nhận diện giọng nói hoạt động tốt nhất.</span>
              </div>
            </div>
          )}

          {/* Nút nộp báo cáo ca làm việc */}
          <button
            type="button"
            disabled={submittingVoiceReport || (!voiceText.trim() && !interimVoiceText.trim())}
            onClick={async () => {
              const textToSubmit = (voiceText || interimVoiceText).trim();
              if (!textToSubmit) {
                toast.error("Vui lòng bấm vào nút Micro để nói hoặc nhập nội dung báo cáo");
                return;
              }
              try {
                setSubmittingVoiceReport(true);
                stopListening();

                const res = await fetch("/api/field/work-reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    taskId: selectedTask?.id,
                    projectId: selectedTask?.projectId,
                    speechText: textToSubmit,
                    notes: textToSubmit,
                    completionPercentage: 85,
                  }),
                });

                const data = await res.json();
                if (!res.ok) {
                  throw new Error(data.error || "Lỗi gửi báo cáo");
                }

                toast.success("Đã nộp nhật ký ca làm việc thành công lên hệ thống!");
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
            className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${submittingVoiceReport ? "animate-spin" : ""}`} />
            <span>{submittingVoiceReport ? "ĐANG NỘP BÁO CÁO..." : "NỘP BÁO CÁO LÊN HỆ THỐNG"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            stopListening();
            setCurrentScreen("action_hub");
          }}
          className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm mt-auto transition"
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
              if (!selectedTask?.id) throw new Error("Chọn công việc trước khi xác nhận kiểm tra vật tư");
              if (selectedTask?.id) {
                const res = await fetch("/api/field/work-reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    taskId: selectedTask.id,
                    projectId: selectedTask.projectId,
                    notes: "Xác nhận kiểm kê vật tư cấp theo xe vận chuyển",
                    materials,
                  }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || "Lỗi ghi nhận kiểm tra vật tư");
                }
              }
              toast.success("Đã ghi nhận kiểm tra đủ vật tư trên xe vào hệ thống!");
              setCurrentScreen("action_hub");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Lỗi xác nhận kiểm tra vật tư");
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
