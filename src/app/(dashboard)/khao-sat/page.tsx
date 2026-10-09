"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Button,
  Badge,
  Modal,
  Drawer,
  Input,
  toast,
} from "@/components/ui";
import {
  DataTable,
  DataTableColumn,
  DataTableRowAction,
} from "@/components/shared";
import {
  Compass,
  Plus,
  Sparkles,
  MapPin,
  Eye,
  Layers,
  Zap,
  HardHat,
  RefreshCw,
  Building2,
  CheckCircle2,
  Trash2,
  Edit3,
  Phone,
  Ruler,
  Clock,
  Package,
  Wrench,
  FileSignature,
} from "lucide-react";
import { SiteSurveyDto } from "@/services/signage-phase2.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

export default function SiteSurveyPage() {
  const router = useRouter();
  const { can } = useAuthorization();

  useSetPageHeader({
    title: "Khảo Sát Mặt Bằng Hiện Trường",
    subtitle: "Phân vùng KV, quy cách bảng, nội thất POSM & 1-Click lập BOM / Báo giá",
    screenCode: "M04-KS",
    quickViews: [
      { label: "Thiết kế chuẩn Nippon", href: "/du-an/thiet-ke-quy-chuan" },
      { label: "Báo giá dự toán", href: "/bao-gia" },
      { label: "Dự án thi công", href: "/du-an" },
    ],
  });

  const [surveys, setSurveys] = React.useState<SiteSurveyDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [regionFilter, setRegionFilter] = React.useState<string>("all");
  const [workTypeFilter, setWorkTypeFilter] = React.useState<string>("all");
  const [selectedSurvey, setSelectedSurvey] = React.useState<SiteSurveyDto | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSurveyId, setEditingSurveyId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [convertingId, setConvertingId] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<any[]>([]);

  // Modal Ký số thực địa
  const [isSignatureModalOpen, setIsSignatureModalOpen] = React.useState(false);
  const [surveyToSign, setSurveyToSign] = React.useState<SiteSurveyDto | null>(null);
  const [customerSignerName, setCustomerSignerName] = React.useState("");
  const [surveyorSignerName, setSurveyorSignerName] = React.useState("");
  const [isSavingSignature, setIsSavingSignature] = React.useState(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef(false);

  // Form state chuẩn thực địa Nippon Paint
  const defaultFormData = {
    title: "",
    address: "",
    customerId: "",
    surveyDate: new Date().toISOString().split("T")[0],
    widthMeters: 8.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Dầm bê tông chịu lực",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 10,
    installationMethod: "Giàn giáo 2 tầng",
    obstacles: "",
    notes: "",
    // Các trường phân loại & chi tiết chuẩn thực địa Nippon:
    regionKV: "MIỀN TÂY",
    workType: "BẢNG HIỆU",
    dealerName: "",
    dealerPhone: "",
    dealerAddress: "",
    signMaterial: "Bảng alu ngoài trời",
    hasMicaLogo65: true,
    hasSideTrim: true,
    hasColorStrip: true,
    subAccessories: "Thay mica logo 65x65, lườn, thay dải màu",
    displayShelves: "",
    furniture: "",
    otherPosm: "",
    repairScope: "",
    surveyScope: "ks bảng",
    executionStatus: "đang chốt",
    deliverySchedule: "",
    siteNotes: "",
  };

  const [formData, setFormData] = React.useState(defaultFormData);

  const fetchSurveys = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/surveys");
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error("Lỗi tải khảo sát:", err);
      toast.error("Không thể tải danh sách khảo sát");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/crm/customers?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || data.items || []);
      }
    } catch (err) {
      console.error("Lỗi tải khách hàng:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchSurveys();
    fetchCustomers();
  }, [fetchSurveys, fetchCustomers]);

  // Lọc dữ liệu đa tiêu chí
  const filteredSurveys = React.useMemo(() => {
    return surveys.filter((s) => {
      const meta = s.metadata || {};
      const dealer = (meta.dealerName || s.title || "").toLowerCase();
      const addr = (meta.dealerAddress || s.address || "").toLowerCase();
      const searchLower = search.toLowerCase();

      const matchesSearch =
        s.title.toLowerCase().includes(searchLower) ||
        s.code.toLowerCase().includes(searchLower) ||
        s.address.toLowerCase().includes(searchLower) ||
        dealer.includes(searchLower) ||
        addr.includes(searchLower) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchLower));

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesRegion = regionFilter === "all" || (meta.regionKV || "MIỀN TÂY") === regionFilter;
      const matchesWorkType = workTypeFilter === "all" || (meta.workType || "BẢNG HIỆU") === workTypeFilter;

      return matchesSearch && matchesStatus && matchesRegion && matchesWorkType;
    });
  }, [surveys, search, statusFilter, regionFilter, workTypeFilter]);

  // Xử lý mở Modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingSurveyId(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  // Xử lý mở Modal chỉnh sửa
  const handleOpenEditModal = (survey: SiteSurveyDto) => {
    const meta = survey.metadata || {};
    setEditingSurveyId(survey.id);
    setFormData({
      title: survey.title,
      address: survey.address,
      customerId: survey.customerId || "",
      surveyDate: survey.surveyDate || new Date().toISOString().split("T")[0],
      widthMeters: survey.widthMeters || 8.0,
      heightMeters: survey.heightMeters || 2.0,
      depthMeters: survey.depthMeters || 0.2,
      floorLevel: survey.floorLevel || "Tầng 1",
      elevationMeters: survey.elevationMeters || 3.5,
      structureType: survey.structureType || "Dầm bê tông chịu lực",
      powerSource: survey.powerSource || "220V 1 pha",
      powerDistanceMeters: survey.powerDistanceMeters || 10,
      installationMethod: survey.installationMethod || "Giàn giáo 2 tầng",
      obstacles: survey.obstacles || "",
      notes: survey.notes || "",
      regionKV: meta.regionKV || "MIỀN TÂY",
      workType: meta.workType || "BẢNG HIỆU",
      dealerName: meta.dealerName || survey.title,
      dealerPhone: meta.dealerPhone || survey.customerPhone || "",
      dealerAddress: meta.dealerAddress || survey.address,
      signMaterial: meta.signMaterial || "Bảng alu ngoài trời",
      hasMicaLogo65: meta.hasMicaLogo65 ?? true,
      hasSideTrim: meta.hasSideTrim ?? true,
      hasColorStrip: meta.hasColorStrip ?? true,
      subAccessories: meta.subAccessories || "",
      displayShelves: meta.displayShelves || "",
      furniture: meta.furniture || "",
      otherPosm: meta.otherPosm || "",
      repairScope: meta.repairScope || "",
      surveyScope: meta.surveyScope || "ks bảng",
      executionStatus: meta.executionStatus || "đang chốt",
      deliverySchedule: meta.deliverySchedule || "",
      siteNotes: meta.siteNotes || "",
    });
    setIsModalOpen(true);
  };

  // Canvas drawing & Digital Signature handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleOpenSignatureModal = (survey: SiteSurveyDto) => {
    setSurveyToSign(survey);
    const meta = survey.metadata || {};
    setCustomerSignerName(meta.dealerName || survey.customerName || "");
    setSurveyorSignerName(survey.surveyorName || "Cán bộ kỹ thuật");
    setHasDrawn(false);
    setIsSignatureModalOpen(true);
    setTimeout(() => {
      clearCanvas();
    }, 150);
  };

  const handleSaveSignature = async () => {
    if (!surveyToSign) return;
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      toast.error("Vui lòng ký xác nhận vào khung vẽ trước khi lưu!");
      return;
    }

    try {
      setIsSavingSignature(true);
      const signatureDataUrl = canvas.toDataURL("image/png");
      const res = await fetch(`/api/surveys/${surveyToSign.id}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerSignature: signatureDataUrl,
          surveyorSignature: surveyorSignerName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu chữ ký");

      toast.success("Đã lưu chữ ký xác nhận khảo sát hiện trường thành công!");
      setIsSignatureModalOpen(false);
      const updatedId = surveyToSign.id;
      setSurveyToSign(null);
      fetchSurveys();
      if (selectedSurvey && selectedSurvey.id === updatedId) {
        setSelectedSurvey({
          ...selectedSurvey,
          customerSignature: signatureDataUrl,
          surveyorSignature: surveyorSignerName,
          status: "completed",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu chữ ký");
    } finally {
      setIsSavingSignature(false);
    }
  };

  // Xóa phiếu khảo sát
  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu khảo sát này?")) return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi xóa khảo sát");
      }
      toast.success("Đã xóa phiếu khảo sát thành công!");
      if (selectedSurvey?.id === surveyId) setSelectedSurvey(null);
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa phiếu khảo sát");
    }
  };

  // 1-Click chuyển Khảo Sát sang Báo Giá
  const handleConvertToQuote = async (survey: SiteSurveyDto) => {
    if (!survey.customerId) {
      toast.error("Phiếu khảo sát chưa gắn khách hàng, không thể tạo báo giá!");
      return;
    }
    try {
      setConvertingId(survey.id);
      const res = await fetch(`/api/surveys/${survey.id}/convert-quote`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo báo giá");

      toast.success(data.message || `Đã tạo báo giá ${data.quotationCode} thành công!`);
      fetchSurveys();
      router.push(`/bao-gia?highlight=${data.quotationId}`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi chuyển khảo sát sang báo giá");
    } finally {
      setConvertingId(null);
    }
  };

  // 1-Click tạo BOM từ phiếu khảo sát
  const handleCreateBom = async (survey: SiteSurveyDto) => {
    try {
      const meta = survey.metadata || {};
      const dealerLabel = meta.dealerName || survey.title;
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: survey.projectId || null,
          title: `BOM Bóc Tách ${survey.code} - ${dealerLabel}`,
          signageType: "alu_letters",
          widthMeters: survey.widthMeters || 1.0,
          heightMeters: survey.heightMeters || 1.0,
          depthMeters: survey.depthMeters || 0.1,
          signMaterial: meta.signMaterial || "Bảng alu ngoài trời",
          hasMicaLogo65: meta.hasMicaLogo65 ?? true,
          hasSideTrim: meta.hasSideTrim ?? true,
          hasColorStrip: meta.hasColorStrip ?? true,
          subAccessories: meta.subAccessories || "",
          displayShelves: meta.displayShelves || "",
          furniture: meta.furniture || "",
          otherPosm: meta.otherPosm || "",
          repairScope: meta.repairScope || "",
          notes: `Tự động bóc tách kỹ thuật từ khảo sát ${survey.code} (${meta.regionKV || ""} - ${meta.workType || ""})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lập BOM bóc tách");

      toast.success(`Đã lập thành công BOM ${data.bom?.code || ""}!`);
      if (survey.projectId) {
        router.push(`/du-an/${survey.projectId}?tab=production`);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lập BOM");
    }
  };

  // Submit form Tạo hoặc Sửa khảo sát
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedTitle = formData.dealerName?.trim()
      ? `${formData.workType}: ${formData.dealerName.trim()}`
      : formData.title.trim();
    const resolvedAddress = formData.dealerAddress?.trim() || formData.address.trim();

    if (!resolvedTitle || !resolvedAddress) {
      toast.error("Vui lòng nhập tên đại lý/công trình và địa chỉ khảo sát!");
      return;
    }

    try {
      setSaving(true);
      const metadata = {
        regionKV: formData.regionKV,
        workType: formData.workType,
        dealerName: formData.dealerName || resolvedTitle,
        dealerPhone: formData.dealerPhone,
        dealerAddress: formData.dealerAddress || resolvedAddress,
        signMaterial: formData.signMaterial,
        hasMicaLogo65: formData.hasMicaLogo65,
        hasSideTrim: formData.hasSideTrim,
        hasColorStrip: formData.hasColorStrip,
        subAccessories: formData.subAccessories,
        displayShelves: formData.displayShelves,
        furniture: formData.furniture,
        otherPosm: formData.otherPosm,
        repairScope: formData.repairScope,
        surveyScope: formData.surveyScope,
        executionStatus: formData.executionStatus,
        deliverySchedule: formData.deliverySchedule,
        siteNotes: formData.siteNotes,
      };

      const url = editingSurveyId ? `/api/surveys/${editingSurveyId}` : "/api/surveys";
      const method = editingSurveyId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          title: resolvedTitle,
          address: resolvedAddress,
          metadata,
          widthMeters: Number(formData.widthMeters) || 0,
          heightMeters: Number(formData.heightMeters) || 0,
          depthMeters: Number(formData.depthMeters) || 0,
          elevationMeters: Number(formData.elevationMeters) || 0,
          powerDistanceMeters: Number(formData.powerDistanceMeters) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu phiếu khảo sát");

      toast.success(
        editingSurveyId
          ? `Đã cập nhật thành công phiếu ${data.survey?.code || ""}!`
          : `Đã tạo phiếu khảo sát ${data.survey?.code || ""}!`
      );
      setIsModalOpen(false);
      setEditingSurveyId(null);
      setFormData(defaultFormData);
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu phiếu khảo sát");
    } finally {
      setSaving(false);
    }
  };

  // Cột bảng dữ liệu - Hiển thị trực quan theo yêu cầu thực tế Nippon Paint
  const columns: DataTableColumn<SiteSurveyDto>[] = [
    {
      id: "code_kv",
      header: "Mã KS & Phân loại",
      width: "150px",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const kv = meta.regionKV || "MIỀN TÂY";
        const kvColor =
          kv === "HCM"
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : kv === "MIỀN TÂY"
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : kv === "MIỀN ĐÔNG"
            ? "bg-amber-100 text-amber-800 border-amber-200"
            : "bg-purple-100 text-purple-800 border-purple-200";

        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedSurvey(item)}
              className="font-mono font-bold text-blue-600 hover:underline block text-xs"
            >
              {item.code}
            </button>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${kvColor}`}>
                {kv}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {meta.workType || "BẢNG HIỆU"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">{item.surveyDate}</span>
          </div>
        );
      },
    },
    {
      id: "dealer_address",
      header: "Đại lý / Đơn vị & Địa chỉ",
      width: "min-w-[260px] w-full",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const dealerName = meta.dealerName || item.title;
        const dealerPhone = meta.dealerPhone || item.customerPhone;
        const dealerAddress = meta.dealerAddress || item.address;

        return (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-slate-900 block font-bold text-xs truncate max-w-sm">
                {dealerName}
              </strong>
              {dealerPhone && (
                <span className="font-mono text-[11px] text-blue-600 shrink-0 font-medium">
                  ĐT: {dealerPhone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-md">{dealerAddress}</span>
            </div>
            {item.customerName && (
              <span className="text-[10px] text-slate-400 block">
                Khách hàng: {item.customerName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "specs_dimensions",
      header: "Quy cách bảng & Kích thước",
      width: "220px",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const area = Math.round((item.widthMeters * item.heightMeters) * 100) / 100;

        return (
          <div className="space-y-0.5 text-xs">
            <div className="font-mono font-bold text-slate-900">
              {item.widthMeters}m × {item.heightMeters}m
              {item.depthMeters ? ` × ${item.depthMeters}m` : ""}
              <span className="text-blue-600 font-semibold ml-1.5 text-[11px]">
                ({area} m²)
              </span>
            </div>
            <div className="text-[11px] text-slate-600 truncate">
              {meta.signMaterial || "Bảng alu ngoài trời"}
            </div>
            {(meta.hasMicaLogo65 || meta.hasSideTrim || meta.hasColorStrip) && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5 flex-wrap">
                {meta.hasMicaLogo65 && (
                  <span className="px-1 py-0.2 bg-purple-50 text-purple-700 rounded border border-purple-200">
                    Mica 65×65
                  </span>
                )}
                {meta.hasSideTrim && (
                  <span className="px-1 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                    Lườn nhôm
                  </span>
                )}
                {meta.hasColorStrip && (
                  <span className="px-1 py-0.2 bg-rose-50 text-rose-700 rounded border border-rose-200">
                    Dải 3 màu
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "interior_repair",
      header: "Nội thất & Sửa chữa / POSM",
      width: "200px",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const interiorItems = [meta.displayShelves, meta.furniture, meta.otherPosm].filter(Boolean);

        return (
          <div className="text-[11px] space-y-1">
            {interiorItems.length > 0 && (
              <div className="text-slate-700 truncate" title={interiorItems.join(", ")}>
                <span className="font-semibold text-blue-700">POSM: </span>
                {interiorItems.join(", ")}
              </div>
            )}
            {meta.repairScope && (
              <div className="text-amber-800 truncate" title={meta.repairScope}>
                <span className="font-semibold">Sửa: </span>
                {meta.repairScope}
              </div>
            )}
            {!interiorItems.length && !meta.repairScope && (
              <span className="text-slate-400 italic text-[10px]">Chưa ghi nhận</span>
            )}
          </div>
        );
      },
    },
    {
      id: "progress_site",
      header: "Tiến độ thực địa",
      width: "150px",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const statusText = meta.executionStatus || (item.status === "converted" ? "Đã thành dự toán" : "Đang chốt");
        const isDone = item.status === "converted";

        return (
          <div className="space-y-0.5 text-xs">
            <Badge
              variant={isDone ? "success" : "warning"}
              className="text-[10px]"
            >
              {statusText}
            </Badge>
            {meta.deliverySchedule && (
              <div className="text-[10px] text-slate-500 font-medium truncate">
                Lịch: {meta.deliverySchedule}
              </div>
            )}
            {meta.siteNotes && (
              <div className="text-[10px] text-slate-400 italic truncate" title={meta.siteNotes}>
                {meta.siteNotes}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // Các thao tác trực tiếp trên từng hàng (Admin CRUD & 1-Click Operations)
  const rowActions: DataTableRowAction<SiteSurveyDto>[] = [
    {
      title: "Xem chi tiết",
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (item) => setSelectedSurvey(item),
    },
    {
      title: "Sửa phiếu khảo sát",
      icon: <Edit3 className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => handleOpenEditModal(item),
    },
    {
      title: "⚡ Lập BOM Bóc Tách",
      icon: <Zap className="w-3.5 h-3.5 text-purple-600" />,
      onClick: (item) => handleCreateBom(item),
    },
    {
      title: "📐 Vẽ Maket Chuẩn",
      icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (item) => {
        const meta = item.metadata || {};
        const dealerName = meta.dealerName || item.title;
        const dealerAddress = meta.dealerAddress || item.address;
        const targetUrl = item.projectId
          ? `/du-an/${item.projectId}/thiet-ke-quy-chuan?surveyId=${item.id}&w=${item.widthMeters}&h=${item.heightMeters}&d=${item.depthMeters || 0.2}&title=${encodeURIComponent(dealerName)}&addr=${encodeURIComponent(dealerAddress)}`
          : `/du-an/thiet-ke-quy-chuan?surveyId=${item.id}&w=${item.widthMeters}&h=${item.heightMeters}&d=${item.depthMeters || 0.2}&title=${encodeURIComponent(dealerName)}&addr=${encodeURIComponent(dealerAddress)}`;
        router.push(targetUrl);
      },
    },
    {
      title: "⚡ Báo giá dự toán",
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: (item) => handleConvertToQuote(item),
      hidden: (item) => item.status === "converted",
    },
    {
      title: "✍️ Ký xác nhận hiện trường",
      icon: <FileSignature className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: (item) => handleOpenSignatureModal(item),
    },
    {
      title: "Xóa khảo sát",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      onClick: (item) => handleDeleteSurvey(item.id),
    },
  ];

  const totalSurveys = surveys.length;
  const hcmSurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "HCM").length;
  const mienTaySurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "MIỀN TÂY").length;
  const mienDongSurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "MIỀN ĐÔNG").length;

  return (
    <div className="space-y-4 w-full">
      {/* 4 THẺ TỔNG HỢP THEO PHÂN VÙNG KV */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Tổng số phiếu</span>
            <strong className="text-xl font-bold text-slate-900 mt-0.5 block font-mono">
              {totalSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-700 block font-medium">KV Miền Tây</span>
            <strong className="text-xl font-bold text-emerald-700 mt-0.5 block font-mono">
              {mienTaySurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-700 block font-medium">KV Hồ Chí Minh</span>
            <strong className="text-xl font-bold text-blue-700 mt-0.5 block font-mono">
              {hcmSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <Compass className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-amber-700 block font-medium">KV Miền Đông</span>
            <strong className="text-xl font-bold text-amber-700 mt-0.5 block font-mono">
              {mienDongSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <Package className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU ĐỘNG VỚI BỘ LỌC CHUẨN THỰC ĐỊA */}
      <DataTable
        data={filteredSurveys}
        columns={columns}
        rowActions={rowActions}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        onRefresh={fetchSurveys}
        onRowClick={(survey) => setSelectedSurvey(survey)}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm theo mã KS, tên đại lý, số điện thoại, địa chỉ..."
        emptyMessage="Chưa có phiếu khảo sát hiện trường nào phù hợp"
        primaryAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lọc theo Khu vực KV */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">Tất cả KV</option>
              <option value="HCM">HCM</option>
              <option value="MIỀN TÂY">MIỀN TÂY</option>
              <option value="MIỀN ĐÔNG">MIỀN ĐÔNG</option>
              <option value="MIỀN TRUNG">MIỀN TRUNG</option>
            </select>

            {/* Lọc theo Phân loại công việc */}
            <select
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">Tất cả loại việc</option>
              <option value="BẢNG HIỆU">BẢNG HIỆU</option>
              <option value="SỬA CHỮA MIỀN TÂY">SỬA CHỮA MIỀN TÂY</option>
              <option value="KHẢO SÁT">KHẢO SÁT</option>
              <option value="THÙNG RỖNG">THÙNG RỖNG</option>
            </select>

            {/* Lọc trạng thái báo giá */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã đo đạc</option>
              <option value="converted">Đã chuyển báo giá</option>
            </select>

            <Button
              onClick={handleOpenCreateModal}
              size="sm"
              className="h-8 text-xs gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-semibold shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Khảo Sát Mới</span>
            </Button>
          </div>
        }
      />

      {/* MODAL TẠO & CHỈNH SỬA PHIẾU KHẢO SÁT CHUẨN THỰC ĐỊA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSurveyId(null);
        }}
        title={
          editingSurveyId
            ? "Chỉnh Sửa Phiếu Khảo Sát Hiện Trường Nippon Paint"
            : "Tạo Phiếu Khảo Sát & Đo Đạc Hiện Trường Nippon Paint"
        }
        description="Điền đầy đủ phân vùng KV, tên đại lý, quy cách vật tư, nội thất POSM và tiến độ thực địa"
        maxWidth="5xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* CỘT 1: PHÂN VÙNG, ĐẠI LÝ & KÍCH THƯỚC */}
            <div className="space-y-3">
              {/* Phân vùng KV & Loại việc */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-200">
                <div>
                  <label className="font-bold text-purple-900 block mb-1">
                    Khu vực (KV) *
                  </label>
                  <select
                    value={formData.regionKV}
                    onChange={(e) => setFormData({ ...formData, regionKV: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-purple-300 bg-white font-semibold text-purple-900"
                  >
                    <option value="MIỀN TÂY">MIỀN TÂY</option>
                    <option value="HCM">HCM</option>
                    <option value="MIỀN ĐÔNG">MIỀN ĐÔNG</option>
                    <option value="MIỀN TRUNG">MIỀN TRUNG</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-purple-900 block mb-1">
                    Phân loại công việc *
                  </label>
                  <select
                    value={formData.workType}
                    onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-purple-300 bg-white font-semibold text-purple-900"
                  >
                    <option value="BẢNG HIỆU">BẢNG HIỆU</option>
                    <option value="SỬA CHỮA MIỀN TÂY">SỬA CHỮA MIỀN TÂY</option>
                    <option value="KHẢO SÁT">KHẢO SÁT</option>
                    <option value="THÙNG RỖNG">THÙNG RỖNG</option>
                  </select>
                </div>
              </div>

              {/* Tên đại lý & Số điện thoại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên đại lý / Đơn vị *
                  </label>
                  <Input
                    placeholder="Ví dụ: Đại lý NAM LONG PHÁT"
                    value={formData.dealerName}
                    onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
                    required
                    className="text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Số điện thoại (ĐT)
                  </label>
                  <Input
                    placeholder="Ví dụ: 0962 464 230"
                    value={formData.dealerPhone}
                    onChange={(e) => setFormData({ ...formData, dealerPhone: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Địa chỉ chi tiết */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Địa chỉ đại lý (Số nhà, đường, xã, huyện, tỉnh) *
                </label>
                <Input
                  placeholder="Ví dụ: 16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM"
                  value={formData.dealerAddress}
                  onChange={(e) => setFormData({ ...formData, dealerAddress: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Khách hàng liên kết</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày khảo sát</label>
                  <Input
                    type="date"
                    value={formData.surveyDate}
                    onChange={(e) => setFormData({ ...formData, surveyDate: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Kích thước đo đạc */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span>Kích thước bảng hiệu phủ bì (mét)</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-blue-700">
                    DT: {Math.round((formData.widthMeters * formData.heightMeters) * 100) / 100} m²
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Dài X (m)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.widthMeters}
                      onChange={(e) => setFormData({ ...formData, widthMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs font-mono font-bold bg-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Cao Y (m)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.heightMeters}
                      onChange={(e) => setFormData({ ...formData, heightMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs font-mono font-bold bg-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Sâu Z (m)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.depthMeters}
                      onChange={(e) => setFormData({ ...formData, depthMeters: parseFloat(e.target.value) || 0 })}
                      className="text-xs font-mono font-bold bg-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Chất liệu bảng & Phụ kiện */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chất liệu bảng</label>
                  <select
                    value={formData.signMaterial}
                    onChange={(e) => setFormData({ ...formData, signMaterial: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bảng alu ngoài trời">Bảng alu ngoài trời (Alcorest 3mm)</option>
                    <option value="Bảng bạt UV">Bảng bạt UV Hiflex không gân</option>
                    <option value="Bảng fomex 10li + decal">Bảng fomex 10li + decal cán bóng</option>
                    <option value="Bảng Hộp đèn 3M in UV">Bảng Hộp đèn 3M in UV xuyên sáng</option>
                  </select>
                </div>

                <div className="pt-1.5 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1 text-[11px]">Chi tiết phụ kiện nhận diện Nippon Paint:</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasMicaLogo65}
                        onChange={(e) => setFormData({ ...formData, hasMicaLogo65: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Mica logo 65×65</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasSideTrim}
                        onChange={(e) => setFormData({ ...formData, hasSideTrim: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Nẹp lườn viền nhôm</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasColorStrip}
                        onChange={(e) => setFormData({ ...formData, hasColorStrip: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Thay dải 3 màu</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Ghi chú phụ kiện khác</label>
                  <Input
                    placeholder="Thay mica logo 65x65, lườn, thay dải màu..."
                    value={formData.subAccessories}
                    onChange={(e) => setFormData({ ...formData, subAccessories: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* CỘT 2: NỘI THẤT POSM, SỬA CHỮA, TIẾN ĐỘ & HIỆN TRƯỜNG */}
            <div className="space-y-3">
              {/* Hạng mục nội thất & POSM */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Hạng mục nội thất & POSM (nếu có):</span>
                </span>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Kệ trưng bày (Kệ màu, thông tin SP, kệ hình ảnh, kệ sắt kèm KT)</label>
                  <Input
                    placeholder="Ví dụ: Kệ màu 2m, kệ thông tin sản phẩm, kệ sắt 1.2x2m..."
                    value={formData.displayShelves}
                    onChange={(e) => setFormData({ ...formData, displayShelves: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Bàn ghế (Bàn lễ tân, hộp bàn lễ tân, ghế làm việc)</label>
                  <Input
                    placeholder="Ví dụ: Bàn lễ tân 1.6m, hộp bàn lễ tân, 2 ghế làm việc..."
                    value={formData.furniture}
                    onChange={(e) => setFormData({ ...formData, furniture: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Vật phẩm nhận diện khác (HĐ ngôi nhà, dán decal kệ sắt cũ, thùng rỗng...)</label>
                  <Input
                    placeholder="Ví dụ: HĐ ngôi nhà, dán decal kệ sắt cũ, giao 2 thùng rỗng mẫu..."
                    value={formData.otherPosm}
                    onChange={(e) => setFormData({ ...formData, otherPosm: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>
              </div>

              {/* Sửa chữa & Khảo sát */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Nội dung sửa chữa / Khảo sát hiện trạng:</span>
                </span>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Mô tả công việc sửa chữa</label>
                  <Input
                    placeholder="Ví dụ: Sửa địa chỉ, sửa bảng, sửa tay nắm kệ gỗ, bắn lại trần alu cũ bị bung..."
                    value={formData.repairScope}
                    onChange={(e) => setFormData({ ...formData, repairScope: e.target.value })}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Hạng mục khảo sát</label>
                    <Input
                      placeholder="Ví dụ: ks bảng, ks SR (showroom)..."
                      value={formData.surveyScope}
                      onChange={(e) => setFormData({ ...formData, surveyScope: e.target.value })}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">Trạng thái tiến độ</label>
                    <select
                      value={formData.executionStatus}
                      onChange={(e) => setFormData({ ...formData, executionStatus: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="đang chốt">đang chốt</option>
                      <option value="đã chốt">đã chốt</option>
                      <option value="chờ duyệt">chờ duyệt</option>
                      <option value="đã thi công">đã thi công</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ghi chú tiến độ & Thực địa */}
              <div className="space-y-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Thời gian thi công / Giao nhận
                  </label>
                  <Input
                    placeholder="Ví dụ: TC ngày 12-10, giao tháng 3, giao 2 bộ tháng 3 + tháng 2 mẫu mới..."
                    value={formData.deliverySchedule}
                    onChange={(e) => setFormData({ ...formData, deliverySchedule: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Lưu ý tại mặt bằng & Thực địa
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ví dụ: Dọn kệ cho đại lý không có người, hỗ trợ làm sớm, vướng tán cây..."
                    value={formData.siteNotes}
                    onChange={(e) => setFormData({ ...formData, siteNotes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSurveyId(null);
              }}
              className="text-xs cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5 shadow-xs font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : editingSurveyId ? "Cập Nhật Khảo Sát" : "Lưu Phiếu Khảo Sát"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRAWER XEM CHI TIẾT PHIẾU KHẢO SÁT */}
      {selectedSurvey && (() => {
        const meta = selectedSurvey.metadata || {};
        const dealerName = meta.dealerName || selectedSurvey.title;
        const dealerPhone = meta.dealerPhone || selectedSurvey.customerPhone;
        const dealerAddress = meta.dealerAddress || selectedSurvey.address;
        const area = Math.round((selectedSurvey.widthMeters * selectedSurvey.heightMeters) * 100) / 100;

        return (
          <Drawer
            isOpen={Boolean(selectedSurvey)}
            onClose={() => setSelectedSurvey(null)}
            title={`Hồ Sơ Khảo Sát: ${selectedSurvey.code}`}
            width="lg"
          >
            <div className="space-y-4 text-xs pb-6">
              {/* Header Box */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {selectedSurvey.code}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">
                      {meta.regionKV || "MIỀN TÂY"}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {meta.workType || "BẢNG HIỆU"}
                    </span>
                  </div>
                  <Badge variant={selectedSurvey.status === "converted" ? "success" : "warning"}>
                    {meta.executionStatus || (selectedSurvey.status === "converted" ? "Đã lập báo giá" : "Đang chốt")}
                  </Badge>
                </div>

                <strong className="text-slate-900 block text-sm font-semibold">{dealerName}</strong>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{dealerAddress}</span>
                </div>
                {dealerPhone && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-mono">
                    <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{dealerPhone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-500 pt-1 text-[11px] border-t border-slate-200/60">
                  <span>Khách hàng: <strong>{selectedSurvey.customerName || "—"}</strong></span>
                  <span>Ngày khảo sát: <strong>{selectedSurvey.surveyDate}</strong></span>
                </div>
              </div>

              {/* Kích thước & Quy cách */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Kích thước phủ bì
                  </span>
                  <div className="font-mono text-base font-bold text-blue-700">
                    {selectedSurvey.widthMeters}m × {selectedSurvey.heightMeters}m
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sâu: {selectedSurvey.depthMeters}m • DT: <strong>{area} m²</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Quy cách bảng
                  </span>
                  <div className="font-semibold text-slate-900 text-xs">
                    {meta.signMaterial || "Bảng alu ngoài trời"}
                  </div>
                  <div className="text-[10px] text-purple-700 font-medium">
                    {[
                      meta.hasMicaLogo65 && "Mica 65×65",
                      meta.hasSideTrim && "Nẹp lườn",
                      meta.hasColorStrip && "Dải 3 màu",
                    ].filter(Boolean).join(" • ")}
                  </div>
                </div>
              </div>

              {/* Nội thất POSM & Sửa chữa */}
              {(meta.displayShelves || meta.furniture || meta.otherPosm || meta.repairScope || meta.deliverySchedule) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-[11px]">
                  {meta.displayShelves && (
                    <div>
                      <span className="text-slate-500">Kệ trưng bày:</span>{" "}
                      <strong className="text-slate-900">{meta.displayShelves}</strong>
                    </div>
                  )}
                  {meta.furniture && (
                    <div>
                      <span className="text-slate-500">Bàn ghế POSM:</span>{" "}
                      <strong className="text-slate-900">{meta.furniture}</strong>
                    </div>
                  )}
                  {meta.otherPosm && (
                    <div>
                      <span className="text-slate-500">POSM khác:</span>{" "}
                      <strong className="text-slate-900">{meta.otherPosm}</strong>
                    </div>
                  )}
                  {meta.repairScope && (
                    <div>
                      <span className="text-amber-800 font-semibold">Nội dung sửa chữa:</span>{" "}
                      <strong className="text-amber-900">{meta.repairScope}</strong>
                    </div>
                  )}
                  {meta.deliverySchedule && (
                    <div>
                      <span className="text-slate-500">Tiến độ TC / Giao nhận:</span>{" "}
                      <strong className="text-blue-700">{meta.deliverySchedule}</strong>
                    </div>
                  )}
                  {meta.siteNotes && (
                    <div className="pt-1.5 border-t border-slate-200 text-slate-600">
                      <span className="font-semibold text-slate-700">Lưu ý mặt bằng:</span> {meta.siteNotes}
                    </div>
                  )}
                </div>
              )}

              {/* CHỮ KÝ XÁC NHẬN HIỆN TRƯỜNG */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                    <FileSignature className="w-4 h-4 text-emerald-600" />
                    <span>Xác nhận thực địa & Chữ ký</span>
                  </div>
                  {selectedSurvey.customerSignature ? (
                    <Badge variant="success" className="text-[10px]">
                      Đã ký xác nhận
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      Chưa ký
                    </Badge>
                  )}
                </div>

                {selectedSurvey.customerSignature ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center">
                      <img
                        src={selectedSurvey.customerSignature}
                        alt="Chữ ký khách hàng"
                        className="max-h-24 object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Đại diện: <strong>{meta.dealerName || selectedSurvey.customerName || "Khách hàng"}</strong></span>
                      {selectedSurvey.surveyorSignature && (
                        <span>KS: <strong>{selectedSurvey.surveyorSignature}</strong></span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      Chưa có chữ ký điện tử xác nhận số đo.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleOpenSignatureModal(selectedSurvey)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 cursor-pointer shrink-0"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>Ký ngay</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleCreateBom(selectedSurvey)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-semibold cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Lập BOM Dự Án</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const targetUrl = selectedSurvey.projectId
                        ? `/du-an/${selectedSurvey.projectId}/thiet-ke-quy-chuan?surveyId=${selectedSurvey.id}&w=${selectedSurvey.widthMeters}&h=${selectedSurvey.heightMeters}&d=${selectedSurvey.depthMeters || 0.2}&title=${encodeURIComponent(dealerName)}&addr=${encodeURIComponent(dealerAddress)}`
                        : `/du-an/thiet-ke-quy-chuan?surveyId=${selectedSurvey.id}&w=${selectedSurvey.widthMeters}&h=${selectedSurvey.heightMeters}&d=${selectedSurvey.depthMeters || 0.2}&title=${encodeURIComponent(dealerName)}&addr=${encodeURIComponent(dealerAddress)}`;
                      router.push(targetUrl);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Vẽ Maket Chuẩn →</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(selectedSurvey)}
                      className="text-xs gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sửa</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSurvey(selectedSurvey.id)}
                      className="text-xs gap-1 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </Button>
                  </div>

                  {selectedSurvey.status !== "converted" && (
                    <Button
                      size="sm"
                      onClick={() => handleConvertToQuote(selectedSurvey)}
                      disabled={convertingId === selectedSurvey.id}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5 shadow-2xs font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {convertingId === selectedSurvey.id ? "Đang chuyển..." : "Tạo Báo Giá"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Drawer>
        );
      })()}

      {/* MODAL KÝ SỐ XÁC NHẬN HIỆN TRƯỜNG */}
      <Modal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        title="Ký Số Xác Nhận Khảo Sát Hiện Trường"
      >
        <div className="space-y-3 max-w-md">
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>Mã phiếu: <strong className="text-blue-700 font-mono">{surveyToSign?.code}</strong></div>
            <div>Đại lý / Mặt bằng: <strong>{surveyToSign?.metadata?.dealerName || surveyToSign?.title}</strong></div>
            <div>Kích thước: <strong>{surveyToSign?.widthMeters}m × {surveyToSign?.heightMeters}m</strong></div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Người ký xác nhận (Đại diện mặt bằng / Khách hàng)
            </label>
            <Input
              value={customerSignerName}
              onChange={(e) => setCustomerSignerName(e.target.value)}
              placeholder="Họ tên người ký"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Cán bộ kỹ thuật khảo sát
            </label>
            <Input
              value={surveyorSignerName}
              onChange={(e) => setSurveyorSignerName(e.target.value)}
              placeholder="Tên cán bộ kỹ thuật"
              className="text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Chữ ký điện tử (Dùng ngón tay hoặc chuột vẽ vào khung) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
              >
                Xóa vẽ lại
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white touch-none">
              <canvas
                ref={canvasRef}
                width={400}
                height={160}
                className="w-full h-40 bg-white cursor-crosshair block"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 italic text-center">
              Chữ ký có giá trị xác nhận tính chính xác của số đo và điều kiện thi công tại công trình.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSignatureModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSignature}
              disabled={isSavingSignature}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSavingSignature ? "Đang lưu..." : "Xác nhận & Hoàn tất"}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
