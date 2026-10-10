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
  FileSpreadsheet,
  Printer,
  Table as TableIcon,
  LayoutGrid,
  Search,
  Check,
  AlertCircle,
  ExternalLink,
  Calculator,
  DollarSign,
  Box,
  Cpu,
  Loader2,
  FileText,
  Save,
} from "lucide-react";
import { SiteSurveyDto } from "@/services/signage-phase2.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";
import {
  calculateSignageBom,
  BomCalculationResult,
  BomItemLine,
  STANDARD_IRON_OPTIONS,
  STANDARD_SURFACE_OPTIONS,
  STANDARD_LED_OPTIONS,
  STANDARD_POWER_OPTIONS,
} from "@/lib/signage-bom-calculator";

// Danh sách các phân vùng KV thực tế
const REGIONS_LIST = [
  "HCM",
  "MIỀN TÂY",
  "MIỀN ĐÔNG",
  "MIỀN TRUNG",
  "TÂY NGUYÊN",
  "MIỀN BẮC",
];

export default function SiteSurveyPage() {
  const router = useRouter();
  const { can } = useAuthorization();

  useSetPageHeader({
    title: "Khối Lượng Công Việc & Khảo Sát Hiện Trường",
    subtitle: "Ma trận khối lượng theo khu vực (KV), Bảng hiệu, Sửa chữa, POSM & 1-Click Báo giá / BOM",
    screenCode: "M04-KL-KS",
    quickViews: [
      { label: "Bóc Tách BOM Xưởng", href: "/dinh-muc-bom" },
      { label: "Báo giá dự toán", href: "/bao-gia" },
      { label: "Thiết kế chuẩn Nippon", href: "/du-an/thiet-ke-quy-chuan" },
      { label: "Ứng dụng Hiện Trường", href: "/apps/hien-truong" },
      { label: "Dự án thi công", href: "/du-an" },
    ],
  });

  const [surveys, setSurveys] = React.useState<SiteSurveyDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"matrix" | "table">("matrix");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [regionFilter, setRegionFilter] = React.useState<string>("all");
  const [workTypeFilter, setWorkTypeFilter] = React.useState<string>("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [selectedSurvey, setSelectedSurvey] = React.useState<SiteSurveyDto | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSurveyId, setEditingSurveyId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);

  // Modal Bóc Tách BOM Linh Hoạt & Đa Dạng (0ms Parametric Takeoff Workbench)
  const [bomSurvey, setBomSurvey] = React.useState<SiteSurveyDto | null>(null);
  const [savingBom, setSavingBom] = React.useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = React.useState(true);

  // Form cấu hình thông số kỹ thuật động
  const [bomParams, setBomParams] = React.useState({
    widthMeters: 6.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    ironBoxType: "SAT-HOP-25",
    gridSpacingCm: 40,
    signMaterial: "ALU-ALCO-3MM",
    aluScrapRate: 10,
    ledType: "LED-NC-12W",
    ledDensityPerM2: 80,
    powerUnitType: "NGUON-MEANWELL-400W",
    hasMicaLogo65: true,
    hasSideTrim: true,
    hasColorStrip: true,
  });

  const [bomLines, setBomLines] = React.useState<BomItemLine[]>([]);
  const [addingMaterial, setAddingMaterial] = React.useState(false);
  const [customLine, setCustomLine] = React.useState<BomItemLine>({
    category: "Vật tư phụ & Keo",
    itemCode: "SKU-CUSTOM",
    itemName: "",
    unit: "Cái",
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    note: "",
  });

  // Modal Báo Giá Dự Toán Nhanh (0ms Latency Instant Modal)
  const [quoteSurvey, setQuoteSurvey] = React.useState<SiteSurveyDto | null>(null);
  const [convertingId, setConvertingId] = React.useState<string | null>(null);

  // Modal Ký số thực địa
  const [isSignatureModalOpen, setIsSignatureModalOpen] = React.useState(false);
  const [surveyToSign, setSurveyToSign] = React.useState<SiteSurveyDto | null>(null);
  const [customerSignerName, setCustomerSignerName] = React.useState("");
  const [surveyorSignerName, setSurveyorSignerName] = React.useState("");
  const [isSavingSignature, setIsSavingSignature] = React.useState(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = React.useRef(false);

  // Form state tinh gọn thực chiến
  const defaultFormData = {
    dealerName: "",
    dealerPhone: "",
    dealerAddress: "",
    regionKV: "HCM",
    workType: "BẢNG HIỆU",
    customerId: "",
    projectId: "",
    surveyDate: new Date().toISOString().split("T")[0],
    workItemsText: "- bảng alu 2.38m x 6m\n- bảng bạt UV 0.9m x 5.9m",
    signMaterial: "Bảng alu ngoài trời",
    widthMeters: 6.0,
    heightMeters: 2.0,
    depthMeters: 0.2,
    hasMicaLogo65: true,
    hasSideTrim: true,
    hasColorStrip: true,
    deliverySchedule: "",
    siteNotes: "",
    executionStatus: "đang chốt",
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

  const fetchProjects = React.useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=100");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || data.items || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách dự án:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchSurveys();
    fetchCustomers();
    fetchProjects();
  }, [fetchSurveys, fetchCustomers, fetchProjects]);

  // Helper lấy danh sách bullet items từ phiếu khảo sát
  const getSurveyWorkItems = (survey: SiteSurveyDto): string[] => {
    const meta = survey.metadata || {};
    if (Array.isArray(meta.workItems) && meta.workItems.length > 0) {
      return meta.workItems;
    }
    const items: string[] = [];
    if (meta.subAccessories) items.push(meta.subAccessories);
    if (meta.displayShelves) items.push(meta.displayShelves);
    if (meta.furniture) items.push(meta.furniture);
    if (meta.otherPosm) items.push(meta.otherPosm);
    if (meta.repairScope) items.push(meta.repairScope);
    if (meta.surveyScope) items.push(meta.surveyScope);

    if (items.length === 0) {
      if (survey.widthMeters && survey.heightMeters) {
        items.push(`${meta.signMaterial || "bảng hiệu"} ${survey.widthMeters}m x ${survey.heightMeters}m`);
      } else {
        items.push("Khảo sát & đo đạc hiện trường");
      }
    }
    return items;
  };

  // Lọc dữ liệu đa tiêu chí
  const filteredSurveys = React.useMemo(() => {
    return surveys.filter((s) => {
      const meta = s.metadata || {};
      const dealer = (meta.dealerName || s.title || "").toLowerCase();
      const addr = (meta.dealerAddress || s.address || "").toLowerCase();
      const phone = (meta.dealerPhone || s.customerPhone || "").toLowerCase();
      const workItems = getSurveyWorkItems(s).join(" ").toLowerCase();
      const searchLower = search.toLowerCase();

      const linkedProject = projects.find((p) => p.id === s.projectId);
      const projectName = (linkedProject?.name || "").toLowerCase();
      const projectCode = (linkedProject?.code || "").toLowerCase();

      const matchesSearch =
        s.title.toLowerCase().includes(searchLower) ||
        s.code.toLowerCase().includes(searchLower) ||
        s.address.toLowerCase().includes(searchLower) ||
        dealer.includes(searchLower) ||
        addr.includes(searchLower) ||
        phone.includes(searchLower) ||
        workItems.includes(searchLower) ||
        projectName.includes(searchLower) ||
        projectCode.includes(searchLower) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchLower));

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesRegion = regionFilter === "all" || (meta.regionKV || "HCM") === regionFilter;
      
      const normalizedWorkType = meta.workType || "BẢNG HIỆU";
      const matchesWorkType =
        workTypeFilter === "all" ||
        normalizedWorkType === workTypeFilter ||
        (workTypeFilter === "SỬA CHỮA MIỀN TÂY" && (normalizedWorkType.includes("SỬA CHỮA") || normalizedWorkType.includes("BẢO TRÌ"))) ||
        (workTypeFilter === "NỘI THẤT / SHOWROOM" && (normalizedWorkType.includes("NỘI THẤT") || normalizedWorkType.includes("SHOWROOM")));

      const matchesProject =
        projectFilter === "all" ||
        (projectFilter === "linked" && Boolean(s.projectId)) ||
        (projectFilter === "unlinked" && !s.projectId) ||
        s.projectId === projectFilter;

      return matchesSearch && matchesStatus && matchesRegion && matchesWorkType && matchesProject;
    });
  }, [surveys, search, statusFilter, regionFilter, workTypeFilter, projectFilter, projects]);

  // Nhóm khảo sát theo KV cho Matrix View
  const matrixData = React.useMemo(() => {
    const map: Record<string, SiteSurveyDto[]> = {};
    REGIONS_LIST.forEach((region) => {
      map[region] = [];
    });

    filteredSurveys.forEach((s) => {
      const region = (s.metadata?.regionKV || "HCM").toUpperCase();
      const targetRegion = REGIONS_LIST.find((r) => r === region) || "HCM";
      if (!map[targetRegion]) map[targetRegion] = [];
      map[targetRegion].push(s);
    });

    return map;
  }, [filteredSurveys]);

  // Xử lý mở Modal Bóc Tách BOM Linh Hoạt & Đa Dạng (0ms Parametric Takeoff Workbench)
  const handleOpenBomModal = (survey: SiteSurveyDto) => {
    const meta = (survey.metadata || {}) as any;
    const signMaterial = meta.signMaterial || "Bảng alu ngoài trời";
    const initialParams = {
      widthMeters: Number(survey.widthMeters) || 6.0,
      heightMeters: Number(survey.heightMeters) || 2.0,
      depthMeters: Number(survey.depthMeters) || 0.2,
      ironBoxType: meta.ironBoxType || "SAT-HOP-25",
      gridSpacingCm: meta.gridSpacingCm || 40,
      signMaterial: signMaterial,
      aluScrapRate: meta.aluScrapRate || 10,
      ledType: meta.ledType || "LED-NC-12W",
      ledDensityPerM2: meta.ledDensityPerM2 || 80,
      powerUnitType: meta.powerUnitType || "NGUON-MEANWELL-400W",
      hasMicaLogo65: meta.hasMicaLogo65 ?? true,
      hasSideTrim: meta.hasSideTrim ?? true,
      hasColorStrip: meta.hasColorStrip ?? true,
    };
    setBomParams(initialParams);

    const signageType = signMaterial.includes("bạt")
      ? "canvas_hiflex"
      : signMaterial.includes("Hộp đèn")
      ? "lightbox_3m"
      : "alu_letters";

    const calcResult = calculateSignageBom({
      ...initialParams,
      signageType,
      subAccessories: getSurveyWorkItems(survey).join(", "),
      displayShelves: meta.displayShelves,
      furniture: meta.furniture,
      otherPosm: meta.otherPosm,
      repairScope: meta.repairScope,
    });

    setBomLines(calcResult.items);
    setBomSurvey(survey);
  };

  // Tính lại BOM dựa trên thông số kỹ thuật mới nhất
  const handleRecalculateBom = () => {
    if (!bomSurvey) return;
    const meta = bomSurvey.metadata || {};
    const signMaterial = bomParams.signMaterial || meta.signMaterial || "Bảng alu ngoài trời";
    const signageType = signMaterial.includes("bạt")
      ? "canvas_hiflex"
      : signMaterial.includes("Hộp đèn")
      ? "lightbox_3m"
      : "alu_letters";

    const customItems = bomLines.filter(
      (l) => l.itemCode === "SKU-CUSTOM" || l.itemCode?.startsWith("SKU-")
    );

    const calcResult = calculateSignageBom({
      ...bomParams,
      signageType,
      subAccessories: getSurveyWorkItems(bomSurvey).join(", "),
      displayShelves: meta.displayShelves,
      furniture: meta.furniture,
      otherPosm: meta.otherPosm,
      repairScope: meta.repairScope,
      customItems,
    });

    setBomLines(calcResult.items);
    toast.success("Đã tính lại toàn bộ định mức BOM theo công thức kỹ thuật!");
  };

  // Cập nhật từng dòng BOM (số lượng, đơn giá, ghi chú)
  const handleUpdateBomLine = (index: number, field: keyof BomItemLine, value: any) => {
    setBomLines((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.amount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }
      next[index] = item;
      return next;
    });
  };

  // Xóa 1 dòng BOM
  const handleDeleteBomLine = (index: number) => {
    setBomLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Thêm vật tư tự do
  const handleAddCustomLine = () => {
    if (!customLine.itemName.trim()) {
      toast.error("Vui lòng nhập tên vật tư!");
      return;
    }
    const newLine: BomItemLine = {
      ...customLine,
      amount: (Number(customLine.quantity) || 1) * (Number(customLine.unitPrice) || 0),
    };
    setBomLines((prev) => [...prev, newLine]);
    setCustomLine({
      category: "Vật tư phụ & Keo",
      itemCode: `SKU-${Date.now().toString().slice(-4)}`,
      itemName: "",
      unit: "Cái",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      note: "",
    });
    setAddingMaterial(false);
    toast.success("Đã thêm vật tư mới vào định mức BOM!");
  };

  // Metric tổng hợp từ bomParams và bomLines
  const bomMetrics = React.useMemo(() => {
    const width = Number(bomParams.widthMeters) || 1.0;
    const height = Number(bomParams.heightMeters) || 1.0;
    const area = Math.round(width * height * 100) / 100;
    const perimeter = 2 * (width + height);
    const spacing = (Number(bomParams.gridSpacingCm) || 40) / 100;
    const steelMeters = Math.round((perimeter + (width / spacing) * height + (height / spacing) * width) * 10) / 10;
    const steelBars = Math.ceil(steelMeters / 6.0);

    const scrapRate = (Number(bomParams.aluScrapRate) || 10) / 100;
    const aluSqm = Math.round(area * (1 + scrapRate) * 100) / 100;
    const aluSheets = Math.ceil(aluSqm / (1.22 * 2.44));

    const density = Number(bomParams.ledDensityPerM2) || 80;
    const totalLeds = Math.ceil(area * density);

    const ledOpt =
      STANDARD_LED_OPTIONS.find((o) => o.code === bomParams.ledType || o.name === bomParams.ledType) ||
      STANDARD_LED_OPTIONS[0];
    const ledWatts = (ledOpt.specs?.watts as number) || 1.2;

    const powerOpt =
      STANDARD_POWER_OPTIONS.find((o) => o.code === bomParams.powerUnitType || o.name === bomParams.powerUnitType) ||
      STANDARD_POWER_OPTIONS[0];
    const powerWatts = (powerOpt.specs?.watts as number) || 400;

    const totalWatts = Math.round(totalLeds * ledWatts * 10) / 10;
    const powerUnits = totalWatts > 0 ? Math.ceil(totalWatts / (powerWatts * 0.8)) : 0;

    const totalCost = bomLines.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

    return {
      area,
      steelMeters,
      steelBars,
      aluSqm,
      aluSheets,
      totalLeds,
      totalWatts,
      powerUnits,
      totalCost,
    };
  }, [bomParams, bomLines]);

  // Xử lý mở Modal tạo mới
  const handleOpenCreateModal = (prefillKV?: string, prefillWorkType?: string) => {
    setEditingSurveyId(null);
    setFormData({
      ...defaultFormData,
      regionKV: prefillKV || "HCM",
      workType: prefillWorkType || "BẢNG HIỆU",
      workItemsText: prefillWorkType === "KHẢO SÁT" ? "- ks bảng" : prefillWorkType === "SỬA CHỮA MIỀN TÂY" ? "- sửa địa chỉ\n- hỗ trợ làm sớm" : "- bảng alu 2.38m x 6m\n- bảng bạt UV 0.9m x 5.9m",
    });
    setIsModalOpen(true);
  };

  // Xử lý mở Modal chỉnh sửa
  const handleOpenEditModal = (survey: SiteSurveyDto) => {
    const meta = survey.metadata || {};
    const items = getSurveyWorkItems(survey);
    const workItemsText = items.map((it) => it.startsWith("-") ? it : `- ${it}`).join("\n");

    setEditingSurveyId(survey.id);
    setFormData({
      dealerName: meta.dealerName || survey.title,
      dealerPhone: meta.dealerPhone || survey.customerPhone || "",
      dealerAddress: meta.dealerAddress || survey.address,
      regionKV: meta.regionKV || "HCM",
      workType: meta.workType || "BẢNG HIỆU",
      customerId: survey.customerId || "",
      projectId: survey.projectId || "",
      surveyDate: survey.surveyDate || new Date().toISOString().split("T")[0],
      workItemsText: workItemsText || "- ks bảng",
      signMaterial: meta.signMaterial || "Bảng alu ngoài trời",
      widthMeters: survey.widthMeters || 6.0,
      heightMeters: survey.heightMeters || 2.0,
      depthMeters: survey.depthMeters || 0.2,
      hasMicaLogo65: meta.hasMicaLogo65 ?? true,
      hasSideTrim: meta.hasSideTrim ?? true,
      hasColorStrip: meta.hasColorStrip ?? true,
      deliverySchedule: meta.deliverySchedule || "",
      siteNotes: meta.siteNotes || "",
      executionStatus: meta.executionStatus || "đang chốt",
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
    if (!confirm("Bạn có chắc chắn muốn xóa hạng mục khối lượng công việc này?")) return;
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi xóa khảo sát");
      }
      toast.success("Đã xóa mục công việc thành công!");
      if (selectedSurvey?.id === surveyId) setSelectedSurvey(null);
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa phiếu khảo sát");
    }
  };

  // 1-Click chuyển Khảo Sát sang Báo Giá (Gửi POST vào DB)
  const handleConfirmConvertToQuote = async (survey: SiteSurveyDto) => {
    try {
      setConvertingId(survey.id);
      const res = await fetch(`/api/surveys/${survey.id}/convert-quote`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo báo giá");

      toast.success(data.message || `Đã tạo báo giá ${data.quotationCode} thành công!`);
      setQuoteSurvey(null);
      fetchSurveys();
      router.push(`/bao-gia?highlight=${data.quotationId}`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi chuyển khảo sát sang báo giá");
    } finally {
      setConvertingId(null);
    }
  };

  // 1-Click lưu BOM bóc tách vào hệ thống & Tùy chọn chuyển sang Sản Xuất
  const handleConfirmSaveBom = async (survey: SiteSurveyDto, andGoToProduction: boolean = false) => {
    try {
      setSavingBom(true);
      const meta = survey.metadata || {};
      const dealerLabel = meta.dealerName || survey.title;
      const items = getSurveyWorkItems(survey);
      const totalEstimatedCost = bomLines.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

      const signMaterial = bomParams.signMaterial || meta.signMaterial || "Bảng alu ngoài trời";
      const signageType = signMaterial.includes("bạt")
        ? "canvas_hiflex"
        : signMaterial.includes("Hộp đèn")
        ? "lightbox_3m"
        : "alu_letters";

      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: survey.projectId || null,
          surveyId: survey.id,
          title: `BOM Bóc Tách ${survey.code} - ${dealerLabel}`,
          signageType,
          widthMeters: Number(bomParams.widthMeters) || 1.0,
          heightMeters: Number(bomParams.heightMeters) || 1.0,
          depthMeters: Number(bomParams.depthMeters) || 0.1,
          ironBoxType: bomParams.ironBoxType,
          gridSpacingCm: Number(bomParams.gridSpacingCm) || 40,
          aluScrapRate: Number(bomParams.aluScrapRate) || 10,
          ledType: bomParams.ledType,
          ledDensityPerM2: Number(bomParams.ledDensityPerM2) || 80,
          powerUnitType: bomParams.powerUnitType,
          signMaterial: bomParams.signMaterial,
          hasMicaLogo65: bomParams.hasMicaLogo65,
          hasSideTrim: bomParams.hasSideTrim,
          hasColorStrip: bomParams.hasColorStrip,
          subAccessories: items.join(", "),
          items: bomLines,
          itemsJson: bomLines,
          estimatedMaterialCost: totalEstimatedCost,
          notes: `Bóc tách kỹ thuật linh hoạt từ khối lượng công việc ${survey.code} (${meta.regionKV || ""} - ${meta.workType || ""})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lập BOM bóc tách");

      toast.success(`Đã lưu thành công định mức BOM ${data.bom?.code || ""} vào hệ thống!`);
      setBomSurvey(null);
      if (andGoToProduction) {
        if (survey.projectId) {
          router.push(`/du-an/${survey.projectId}?tab=production&bomId=${data.bom?.id || ""}`);
        } else {
          router.push(`/san-xuat?bomId=${data.bom?.id || ""}`);
        }
      } else {
        if (survey.projectId) {
          router.push(`/du-an/${survey.projectId}?tab=production`);
        } else {
          router.push("/vat-tu?tab=bom");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi lập BOM");
    } finally {
      setSavingBom(false);
    }
  };

  // Submit form Tạo hoặc Sửa khảo sát
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dealerName.trim()) {
      toast.error("Vui lòng nhập tên đại lý / khách hàng!");
      return;
    }
    if (!formData.dealerAddress.trim()) {
      toast.error("Vui lòng nhập địa chỉ công trình thực tế!");
      return;
    }

    const lines = formData.workItemsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("-") ? l.substring(1).trim() : l));

    try {
      setSaving(true);
      const metadata = {
        regionKV: formData.regionKV,
        workType: formData.workType,
        dealerName: formData.dealerName.trim(),
        dealerPhone: formData.dealerPhone.trim(),
        dealerAddress: formData.dealerAddress.trim(),
        signMaterial: formData.signMaterial,
        hasMicaLogo65: formData.hasMicaLogo65,
        hasSideTrim: formData.hasSideTrim,
        hasColorStrip: formData.hasColorStrip,
        workItems: lines,
        deliverySchedule: formData.deliverySchedule.trim(),
        siteNotes: formData.siteNotes.trim(),
        executionStatus: formData.executionStatus,
      };

      const url = editingSurveyId ? `/api/surveys/${editingSurveyId}` : "/api/surveys";
      const method = editingSurveyId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.dealerName.trim(),
          address: formData.dealerAddress.trim(),
          customerId: formData.customerId || null,
          projectId: formData.projectId || null,
          surveyDate: formData.surveyDate,
          widthMeters: Number(formData.widthMeters) || 0,
          heightMeters: Number(formData.heightMeters) || 0,
          depthMeters: Number(formData.depthMeters) || 0,
          metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu khối lượng công việc");

      toast.success(
        editingSurveyId
          ? `Đã cập nhật mục khối lượng ${data.survey?.code || ""}!`
          : `Đã thêm mục khối lượng ${data.survey?.code || ""} thành công!`
      );
      setIsModalOpen(false);
      setEditingSurveyId(null);
      setFormData(defaultFormData);
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  // Xuất file Excel đúng mẫu KHỐI LƯỢNG CÔNG VIỆC
  const handleExportExcel = () => {
    const headers = [
      "Khu Vực (KV)",
      "Mã Phiếu",
      "Tên Đại Lý / Khách Hàng",
      "Số Điện Thoại",
      "Địa Chỉ Chi Tiết",
      "Phân Loại Công Việc",
      "Hạng Mục & Kích Thước",
      "Quy Cách Bảng",
      "Tiến Độ Thi Công",
      "Lưu Ý Mặt Bằng",
      "Trạng Thái",
    ];

    const rows = filteredSurveys.map((s) => {
      const meta = s.metadata || {};
      const items = getSurveyWorkItems(s).join(" | ");
      return [
        `"${meta.regionKV || "HCM"}"`,
        `"${s.code}"`,
        `"${meta.dealerName || s.title}"`,
        `"${meta.dealerPhone || s.customerPhone || ""}"`,
        `"${(meta.dealerAddress || s.address || "").replace(/"/g, '""')}"`,
        `"${meta.workType || "BẢNG HIỆU"}"`,
        `"${items.replace(/"/g, '""')}"`,
        `"${meta.signMaterial || ""}"`,
        `"${meta.deliverySchedule || ""}"`,
        `"${(meta.siteNotes || "").replace(/"/g, '""')}"`,
        `"${meta.executionStatus || s.status}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Khoi_Luong_Cong_Viec_Signage_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã xuất file Excel Khối Lượng Công Việc thành công!");
  };

  // In Bảng Ma Trận Khối Lượng chuẩn A4/A3 Landscape
  const handlePrintMatrix = () => {
    window.print();
  };

  // Cột bảng dữ liệu cho Chế độ Danh Sách (Table View)
  const columns: DataTableColumn<SiteSurveyDto>[] = [
    {
      id: "code_kv",
      header: "Mã & Phân Vùng",
      width: "150px",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const kv = meta.regionKV || "HCM";
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
          </div>
        );
      },
    },
    {
      id: "dealer_info",
      header: "Đại Lý & Địa Chỉ",
      width: "min-w-[280px] w-full",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const dealerName = meta.dealerName || item.title;
        const dealerPhone = meta.dealerPhone || item.customerPhone;
        const dealerAddress = meta.dealerAddress || item.address;

        return (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-slate-900 block font-bold text-xs uppercase truncate max-w-sm">
                {dealerName}
              </strong>
              {dealerPhone && (
                <a
                  href={`tel:${dealerPhone}`}
                  className="font-mono text-[11px] text-blue-600 font-bold shrink-0 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-blue-500" />
                  <span>ĐT: {dealerPhone}</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-md">{dealerAddress}</span>
            </div>
            {item.projectId && (
              <div className="pt-0.5">
                {(() => {
                  const proj = projects.find((p) => p.id === item.projectId);
                  return (
                    <Link
                      href={`/du-an/${item.projectId}?tab=design`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors"
                      title={`Dự án: ${proj?.code || ""} - ${proj?.name || "Chi tiết dự án"}`}
                    >
                      <Building2 className="w-3 h-3 text-indigo-500" />
                      <span>{proj ? `${proj.code} - ${proj.name}` : "Dự án liên kết"}</span>
                    </Link>
                  );
                })()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "work_items",
      header: "Hạng Mục & Quy Cách Đo Đạc",
      width: "280px",
      cell: (item: SiteSurveyDto) => {
        const items = getSurveyWorkItems(item);
        return (
          <div className="space-y-0.5 text-xs">
            {items.map((it, idx) => (
              <div key={idx} className="text-rose-700 font-medium text-[11px] flex items-start gap-1">
                <span className="text-rose-500 font-bold shrink-0">•</span>
                <span className="leading-tight">{it}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: "progress_site",
      header: "Tiến Độ & Thực Địa",
      width: "180px",
      cell: (item: SiteSurveyDto) => {
        const meta = item.metadata || {};
        const statusText = meta.executionStatus || "đang chốt";

        return (
          <div className="space-y-0.5 text-xs">
            <Badge
              variant={
                statusText.includes("chốt") || statusText.includes("hoàn tất")
                  ? "success"
                  : statusText.includes("gấp") || statusText.includes("sớm")
                  ? "danger"
                  : "warning"
              }
              className="text-[10px]"
            >
              {statusText}
            </Badge>
            {meta.deliverySchedule && (
              <div className="text-[10px] text-blue-700 font-semibold truncate">
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

  // Các thao tác trực tiếp trên từng hàng
  const rowActions: DataTableRowAction<SiteSurveyDto>[] = [
    {
      title: "Xem chi tiết",
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (item) => setSelectedSurvey(item),
    },
    {
      title: "Sửa khối lượng",
      icon: <Edit3 className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => handleOpenEditModal(item),
    },
    {
      title: "⚡ Lập BOM Bóc Tách",
      icon: <Zap className="w-3.5 h-3.5 text-purple-600" />,
      onClick: (item) => handleOpenBomModal(item),
    },
    {
      title: "📐 Vẽ Maket Chuẩn Nippon",
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
      title: "⚡ Tạo Báo Giá Dự Toán",
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: (item) => setQuoteSurvey(item),
    },
    {
      title: "✍️ Ký số hiện trường",
      icon: <FileSignature className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: (item) => handleOpenSignatureModal(item),
    },
    {
      title: "Xóa",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      onClick: (item) => handleDeleteSurvey(item.id),
    },
  ];

  // Helper render Card trong Matrix Cell
  const renderSurveyCard = (survey: SiteSurveyDto) => {
    const meta = survey.metadata || {};
    const dealerName = meta.dealerName || survey.title;
    const dealerPhone = meta.dealerPhone || survey.customerPhone;
    const dealerAddress = meta.dealerAddress || survey.address;
    const items = getSurveyWorkItems(survey);

    return (
      <div
        key={survey.id}
        className="p-2.5 rounded-lg border border-slate-300 bg-white hover:shadow-md transition-all space-y-1.5 text-xs relative group/card"
      >
        {/* Header Đại lý & ĐT */}
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <span className="font-bold text-slate-900 text-xs uppercase leading-snug">
              {dealerName}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEditModal(survey)}
                title="Sửa"
                className="p-1 text-slate-400 hover:text-blue-600 rounded bg-slate-100 hover:bg-blue-50 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSurvey(survey.id)}
                title="Xóa"
                className="p-1 text-slate-400 hover:text-rose-600 rounded bg-slate-100 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {dealerPhone && (
            <div className="text-[11px] font-mono font-bold text-blue-700 flex items-center gap-1">
              <span>ĐT: {dealerPhone}</span>
            </div>
          )}
        </div>

        {/* Địa chỉ */}
        {dealerAddress && (
          <div className="text-[11px] text-slate-600 leading-tight flex items-start gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{dealerAddress}</span>
          </div>
        )}

        {/* Danh sách các gạch đầu dòng hạng mục đo đạc (Màu đỏ chuẩn ảnh thực tế) */}
        <div className="space-y-0.5 pt-1 border-t border-slate-100">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="text-rose-700 font-medium text-[11px] leading-tight flex items-start gap-1"
            >
              <span className="text-rose-600 font-bold shrink-0">-</span>
              <span>{it}</span>
            </div>
          ))}
        </div>

        {/* Tiến độ / Ghi chú nếu có */}
        {(meta.deliverySchedule || meta.siteNotes || meta.executionStatus) && (
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 flex-wrap gap-1">
            {meta.deliverySchedule && (
              <span className="font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                {meta.deliverySchedule}
              </span>
            )}
            {meta.siteNotes && (
              <span className="italic text-slate-500 line-clamp-1" title={meta.siteNotes}>
                ({meta.siteNotes})
              </span>
            )}
            {meta.executionStatus && !meta.deliverySchedule && (
              <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                {meta.executionStatus}
              </span>
            )}
          </div>
        )}

        {/* Dự án liên kết nếu có */}
        {survey.projectId && (
          <div className="pt-0.5">
            {(() => {
              const proj = projects.find((p) => p.id === survey.projectId);
              return (
                <Link
                  href={`/du-an/${survey.projectId}?tab=design`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors max-w-full"
                  title={`Dự án: ${proj?.code || ""} - ${proj?.name || "Chi tiết dự án"}`}
                >
                  <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate">{proj ? `${proj.code} - ${proj.name}` : "Dự án liên kết"}</span>
                </Link>
              );
            })()}
          </div>
        )}

        {/* Action buttons (1-Click với phản hồi tức thì 0ms) */}
        <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedSurvey(survey)}
            className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
          >
            Chi tiết
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenBomModal(survey)}
              title="Bóc tách BOM vật tư nhanh (0ms)"
              className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 hover:bg-purple-200 active:scale-95 text-purple-700 rounded border border-purple-200 cursor-pointer transition-all flex items-center gap-0.5"
            >
              <span>BOM</span>
            </button>
            <button
              type="button"
              onClick={() => setQuoteSurvey(survey)}
              title="Báo giá dự toán nhanh (0ms)"
              className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-200 active:scale-95 text-blue-700 rounded border border-blue-200 cursor-pointer transition-all flex items-center gap-0.5"
            >
              <span>Báo giá</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenSignatureModal(survey)}
              title="Ký xác nhận hiện trường"
              className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-200 active:scale-95 text-emerald-700 rounded border border-emerald-200 cursor-pointer transition-all"
            >
              <span>Ký</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const totalSurveys = surveys.length;
  const hcmSurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "HCM").length;
  const mienTaySurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "MIỀN TÂY").length;
  const mienDongSurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "MIỀN ĐÔNG").length;
  const mienTrungSurveys = surveys.filter((s) => (s.metadata?.regionKV || "") === "MIỀN TRUNG").length;

  return (
    <div className="space-y-4 w-full">
      {/* 4 THẺ TỔNG HỢP NHANH THEO KV */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">Tổng khối lượng</span>
            <strong className="text-xl font-bold text-slate-900 mt-0.5 block font-mono">
              {totalSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-700 block font-medium">TP. Hồ Chí Minh</span>
            <strong className="text-xl font-bold text-blue-700 mt-0.5 block font-mono">
              {hcmSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <Building2 className="w-4 h-4" />
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

        <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/40 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[11px] text-purple-700 block font-medium">Miền Trung & Khác</span>
            <strong className="text-xl font-bold text-purple-700 mt-0.5 block font-mono">
              {mienTrungSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
            <Wrench className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU KHIỂN & BỘ LỌC CHUẨN MA TRẬN */}
      <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Switcher chế độ xem & Tìm kiếm */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                viewMode === "matrix"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>Ma Trận Khối Lượng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <TableIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Dạng Danh Sách</span>
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đại lý, ĐT, địa chỉ, hạng mục..."
              className="pl-8 text-xs h-8 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Lọc KV & Loại việc & Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8 font-semibold"
          >
            <option value="all">Tất cả Khu Vực (KV)</option>
            {REGIONS_LIST.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8 font-semibold"
          >
            <option value="all">Tất cả nhóm việc</option>
            <option value="BẢNG HIỆU">BẢNG HIỆU</option>
            <option value="NỘI THẤT / SHOWROOM">NỘI THẤT / SHOWROOM</option>
            <option value="SỬA CHỮA MIỀN TÂY">SỬA CHỮA / BẢO TRÌ</option>
            <option value="KHẢO SÁT">KHẢO SÁT (KS)</option>
            <option value="THÙNG RỖNG">THÙNG RỖNG / GIAO MẪU</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8 font-semibold max-w-[210px] truncate"
            title="Lọc theo Dự Án liên kết"
          >
            <option value="all">Tất cả Dự Án</option>
            <option value="linked">✓ Đã gắn Dự Án</option>
            <option value="unlinked">○ Khảo sát độc lập (Chưa gắn DA)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.code} - {p.name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Xuất file Excel đúng mẫu KHỐI LƯỢNG CÔNG VIỆC"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintMatrix}
            className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer hidden sm:inline-flex"
            title="In bảng khối lượng công việc"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>In Bảng</span>
          </Button>

          <Button
            onClick={() => handleOpenCreateModal()}
            size="sm"
            className="h-8 text-xs gap-1.5 bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-semibold shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Khối Lượng Mới</span>
          </Button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: MA TRẬN KHỐI LƯỢNG CÔNG VIỆC (MATRIX BOARD VIEW) */}
      {viewMode === "matrix" && (
        <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
          {/* Header Bảng Excel */}
          <div className="bg-slate-50 p-2.5 border-b border-slate-300 text-center">
            <h2 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
              KHỐI LƯỢNG CÔNG VIỆC & KHẢO SÁT HIỆN TRƯỜNG
            </h2>
            <p className="text-[11px] text-slate-500">
              Phân vùng KV • Bảng hiệu • Sửa chữa • Khảo sát mặt bằng • Thùng rỗng & POSM
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-300 text-xs uppercase font-extrabold divide-x divide-slate-300">
                  <th className="w-24 p-2.5 text-center bg-slate-100 text-slate-900 shrink-0">
                    KV
                  </th>
                  <th className="p-2.5 text-center bg-blue-100 text-blue-950 w-1/4">
                    BẢNG HIỆU
                  </th>
                  <th className="p-2.5 text-center bg-purple-100 text-purple-950 w-1/5">
                    HẠNG MỤC NỘI THẤT / SR
                  </th>
                  <th className="p-2.5 text-center bg-yellow-200 text-yellow-950 w-1/5">
                    SỬA CHỮA MIỀN TÂY
                  </th>
                  <th className="p-2.5 text-center bg-cyan-100 text-cyan-950 w-1/6">
                    KHẢO SÁT
                  </th>
                  <th className="p-2.5 text-center bg-emerald-100 text-emerald-950 w-1/6">
                    THÙNG RỖNG
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-xs">
                {REGIONS_LIST.map((region) => {
                  const regionSurveys = matrixData[region] || [];
                  if (regionFilter !== "all" && regionFilter !== region) return null;
                  if (regionSurveys.length === 0 && search) return null;

                  const bangHieuCards = regionSurveys.filter(
                    (s) => (s.metadata?.workType || "BẢNG HIỆU") === "BẢNG HIỆU"
                  );
                  const noiThatCards = regionSurveys.filter(
                    (s) =>
                      (s.metadata?.workType || "").includes("NỘI THẤT") ||
                      (s.metadata?.workType || "").includes("SHOWROOM")
                  );
                  const suaChuaCards = regionSurveys.filter(
                    (s) =>
                      (s.metadata?.workType || "").includes("SỬA CHỮA") ||
                      (s.metadata?.workType || "").includes("BẢO TRÌ")
                  );
                  const khaoSatCards = regionSurveys.filter(
                    (s) => (s.metadata?.workType || "") === "KHẢO SÁT"
                  );
                  const thungRongCards = regionSurveys.filter(
                    (s) => (s.metadata?.workType || "") === "THÙNG RỖNG"
                  );

                  return (
                    <tr
                      key={region}
                      className="divide-x divide-slate-300 align-top hover:bg-slate-50/50 transition-colors"
                    >
                      {/* CỘT KV */}
                      <td className="p-2.5 text-center font-extrabold text-slate-900 bg-slate-50/70 shrink-0">
                        <span className="sticky top-4 inline-block px-2 py-1 rounded bg-slate-200 text-slate-800 text-xs">
                          {region}
                        </span>
                      </td>

                      {/* CỘT BẢNG HIỆU */}
                      <td className="p-2 space-y-2 bg-blue-50/15">
                        {bangHieuCards.length > 0 ? (
                          bangHieuCards.map(renderSurveyCard)
                        ) : (
                          <div className="h-12 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-slate-300 text-[11px]">
                            —
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(region, "BẢNG HIỆU")}
                          className="w-full py-1 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-dashed border-blue-200 font-semibold cursor-pointer"
                        >
                          + Thêm Bảng Hiệu
                        </button>
                      </td>

                      {/* CỘT NỘI THẤT / SHOWROOM */}
                      <td className="p-2 space-y-2 bg-purple-50/15">
                        {noiThatCards.length > 0 ? (
                          noiThatCards.map(renderSurveyCard)
                        ) : (
                          <div className="h-12 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-slate-300 text-[11px]">
                            —
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(region, "NỘI THẤT / SHOWROOM")}
                          className="w-full py-1 text-[10px] text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-dashed border-purple-200 font-semibold cursor-pointer"
                        >
                          + Thêm Nội Thất
                        </button>
                      </td>

                      {/* CỘT SỬA CHỮA MIỀN TÂY (HIGHLIGHT VÀNG) */}
                      <td className="p-2 space-y-2 bg-yellow-50/30">
                        {suaChuaCards.length > 0 ? (
                          suaChuaCards.map(renderSurveyCard)
                        ) : (
                          <div className="h-12 flex items-center justify-center border border-dashed border-amber-200 rounded-lg text-slate-300 text-[11px]">
                            —
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(region, "SỬA CHỮA MIỀN TÂY")}
                          className="w-full py-1 text-[10px] text-amber-800 hover:text-amber-950 hover:bg-amber-100 rounded border border-dashed border-amber-300 font-semibold cursor-pointer"
                        >
                          + Thêm Sửa Chữa
                        </button>
                      </td>

                      {/* CỘT KHẢO SÁT */}
                      <td className="p-2 space-y-2 bg-cyan-50/20">
                        {khaoSatCards.length > 0 ? (
                          khaoSatCards.map(renderSurveyCard)
                        ) : (
                          <div className="h-12 flex items-center justify-center border border-dashed border-cyan-200 rounded-lg text-slate-300 text-[11px]">
                            —
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(region, "KHẢO SÁT")}
                          className="w-full py-1 text-[10px] text-cyan-800 hover:text-cyan-950 hover:bg-cyan-100 rounded border border-dashed border-cyan-300 font-semibold cursor-pointer"
                        >
                          + Thêm Khảo Sát
                        </button>
                      </td>

                      {/* CỘT THÙNG RỖNG / GIAO MẪU */}
                      <td className="p-2 space-y-2 bg-emerald-50/20">
                        {thungRongCards.length > 0 ? (
                          thungRongCards.map(renderSurveyCard)
                        ) : (
                          <div className="h-12 flex items-center justify-center border border-dashed border-emerald-200 rounded-lg text-slate-300 text-[11px]">
                            —
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(region, "THÙNG RỖNG")}
                          className="w-full py-1 text-[10px] text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded border border-dashed border-emerald-300 font-semibold cursor-pointer"
                        >
                          + Thêm Thùng Rỗng
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: DẠNG DANH SÁCH BẢNG DỮ LIỆU (TABLE VIEW) */}
      {viewMode === "table" && (
        <DataTable
          data={filteredSurveys}
          columns={columns}
          rowActions={rowActions}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          onRefresh={fetchSurveys}
          onRowClick={(survey) => setSelectedSurvey(survey)}
          emptyMessage="Chưa có khối lượng công việc nào phù hợp"
        />
      )}

      {/* MODAL 1: BÓC TÁCH BOM VẬT TƯ LINH HOẠT (PARAMETRIC TAKEOFF WORKBENCH) */}
      <Modal
        isOpen={Boolean(bomSurvey)}
        onClose={() => setBomSurvey(null)}
        title="Bóc Tách Định Mức Kỹ Thuật BOM Linh Hoạt & Đa Dạng"
        description={`Phiếu: ${bomSurvey?.code || ""} • ${bomSurvey?.metadata?.dealerName || bomSurvey?.title || ""} • Bóc tách vật tư theo kích thước & thông số thực tế`}
        maxWidth="5xl"
      >
        {bomSurvey && (() => {
          const meta = bomSurvey.metadata || {};

          return (
            <div className="space-y-4 text-xs">
              {/* Header Box */}
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-bold uppercase text-sm block">
                      {meta.dealerName || bomSurvey.title}
                    </strong>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                      {bomSurvey.code}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {meta.regionKV || "HCM"}
                    </span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-2 text-[11px]">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>{meta.dealerAddress || bomSurvey.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-purple-700 font-semibold block uppercase">Kích thước cấu hình</span>
                    <strong className="font-mono text-base font-extrabold text-purple-950">
                      {bomParams.widthMeters}m × {bomParams.heightMeters}m × {bomParams.depthMeters}m ({bomMetrics.area} m²)
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-purple-800 bg-white hover:bg-purple-100 rounded-lg border border-purple-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Wrench className="w-3.5 h-3.5 text-purple-600" />
                    <span>{showAdvancedConfig ? "Thu gọn thông số" : "Tùy chỉnh thông số"}</span>
                  </button>
                </div>
              </div>

              {/* BẢNG CẤU HÌNH THÔNG SỐ KỸ THUẬT ĐỘNG (PARAMETRIC CONFIGURATION) */}
              {showAdvancedConfig && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      Thông Số Kỹ Thuật Động Của Bảng Hiệu
                    </span>
                    <Button
                      size="sm"
                      onClick={handleRecalculateBom}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold shadow-2xs cursor-pointer py-1 h-7"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Tính Lại Theo Công Thức (0ms)</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Cột 1: Kích thước phủ bì */}
                    <div className="space-y-1.5 p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block">1. Kích thước (m)</span>
                      <div className="grid grid-cols-3 gap-1">
                        <div>
                          <label className="text-[10px] text-slate-500 block">Ngang W</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={bomParams.widthMeters}
                            onChange={(e) => setBomParams({ ...bomParams, widthMeters: parseFloat(e.target.value) || 0 })}
                            className="text-xs h-7 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Cao H</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={bomParams.heightMeters}
                            onChange={(e) => setBomParams({ ...bomParams, heightMeters: parseFloat(e.target.value) || 0 })}
                            className="text-xs h-7 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">Sâu D</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={bomParams.depthMeters}
                            onChange={(e) => setBomParams({ ...bomParams, depthMeters: parseFloat(e.target.value) || 0 })}
                            className="text-xs h-7 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Khung sắt */}
                    <div className="space-y-1.5 p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block">2. Khung xương sắt</span>
                      <select
                        value={bomParams.ironBoxType}
                        onChange={(e) => setBomParams({ ...bomParams, ironBoxType: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded font-medium text-slate-800 bg-white"
                      >
                        {STANDARD_IRON_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ/{opt.unit})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>Đan ô nan:</span>
                        <select
                          value={bomParams.gridSpacingCm}
                          onChange={(e) => setBomParams({ ...bomParams, gridSpacingCm: parseInt(e.target.value, 10) || 40 })}
                          className="px-1.5 py-0.5 text-[10px] border border-slate-300 rounded bg-white"
                        >
                          <option value="30">30 cm</option>
                          <option value="40">40 cm (Chuẩn)</option>
                          <option value="50">50 cm</option>
                          <option value="60">60 cm</option>
                        </select>
                      </div>
                    </div>

                    {/* Cột 3: Mặt bảng */}
                    <div className="space-y-1.5 p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block">3. Vật liệu bề mặt</span>
                      <select
                        value={bomParams.signMaterial}
                        onChange={(e) => setBomParams({ ...bomParams, signMaterial: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded font-medium text-slate-800 bg-white"
                      >
                        {STANDARD_SURFACE_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.name}>
                            {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ/{opt.unit})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>Hao hụt cắt góc:</span>
                        <select
                          value={bomParams.aluScrapRate}
                          onChange={(e) => setBomParams({ ...bomParams, aluScrapRate: parseInt(e.target.value, 10) || 10 })}
                          className="px-1.5 py-0.5 text-[10px] border border-slate-300 rounded bg-white"
                        >
                          <option value="5">5%</option>
                          <option value="8">8%</option>
                          <option value="10">10% (Chuẩn)</option>
                          <option value="15">15%</option>
                          <option value="20">20%</option>
                        </select>
                      </div>
                    </div>

                    {/* Cột 4: LED & Nguồn */}
                    <div className="space-y-1.5 p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block">4. Module LED & Nguồn</span>
                      <select
                        value={bomParams.ledType}
                        onChange={(e) => setBomParams({ ...bomParams, ledType: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded font-medium text-slate-800 bg-white mb-1"
                      >
                        {STANDARD_LED_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ)
                          </option>
                        ))}
                      </select>
                      <select
                        value={bomParams.powerUnitType}
                        onChange={(e) => setBomParams({ ...bomParams, powerUnitType: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded font-medium text-slate-800 bg-white"
                      >
                        {STANDARD_POWER_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.name} ({opt.defaultPrice.toLocaleString("vi-VN")} đ)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phụ kiện nhận diện Nippon */}
                  <div className="flex items-center gap-4 pt-1 px-1 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-700">Phụ kiện Nippon:</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bomParams.hasMicaLogo65}
                        onChange={(e) => setBomParams({ ...bomParams, hasMicaLogo65: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Logo Mica 65×65 hút nổi</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bomParams.hasSideTrim}
                        onChange={(e) => setBomParams({ ...bomParams, hasSideTrim: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Nẹp lườn viền nhôm</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bomParams.hasColorStrip}
                        onChange={(e) => setBomParams({ ...bomParams, hasColorStrip: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Decal 3M dải 3 màu</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 4 CHỈ SỐ BÓC TÁCH TRỌNG TÂM */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold block">Khung Sắt Hộp</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {bomMetrics.steelBars} cây 6m
                  </strong>
                  <span className="text-[10px] text-slate-400 block font-mono">({bomMetrics.steelMeters}m sắt)</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold block">Tấm Alu / Bạt UV</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {bomMetrics.aluSheets} tấm
                  </strong>
                  <span className="text-[10px] text-slate-400 block font-mono">({bomMetrics.aluSqm} m²)</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold block">Module LED & Nguồn</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {bomMetrics.totalLeds} bóng
                  </strong>
                  <span className="text-[10px] text-slate-400 block font-mono">({bomMetrics.powerUnits} bộ nguồn)</span>
                </div>

                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 space-y-0.5">
                  <span className="text-[10px] text-purple-700 font-bold block">Tổng Dự Toán Vật Tư</span>
                  <strong className="text-sm font-bold text-purple-900 font-mono">
                    {bomMetrics.totalCost.toLocaleString("vi-VN")} đ
                  </strong>
                  <span className="text-[10px] text-purple-600 block">{bomLines.length} loại vật tư</span>
                </div>
              </div>

              {/* BẢNG CHI TIẾT VẬT TƯ BÓC TÁCH (LIVE EDITABLE TABLE) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden space-y-0">
                <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Danh Sách Vật Tư Định Mức ({bomLines.length} dòng - Cho phép sửa trực tiếp)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingMaterial(!addingMaterial)}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-2 py-0.5 rounded border border-purple-300 transition cursor-pointer"
                  >
                    {addingMaterial ? "Đóng thêm vật tư" : "+ Thêm Vật Tư Thủ Công"}
                  </button>
                </div>

                {/* Khung thêm vật tư tự do */}
                {addingMaterial && (
                  <div className="p-3 bg-purple-50/50 border-b border-purple-200 grid grid-cols-1 sm:grid-cols-6 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Phân loại</label>
                      <select
                        value={customLine.category}
                        onChange={(e) => setCustomLine({ ...customLine, category: e.target.value as any })}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Khung sắt">Khung sắt</option>
                        <option value="Mặt dựng">Mặt dựng</option>
                        <option value="Hệ thống LED">Hệ thống LED</option>
                        <option value="Nguồn điện">Nguồn điện</option>
                        <option value="Logo & Nhận diện">Logo & Nhận diện</option>
                        <option value="Nội thất & POSM">Nội thất & POSM</option>
                        <option value="Vật tư phụ & Keo">Vật tư phụ & Keo</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 block">Tên vật tư / Quy cách</label>
                      <Input
                        placeholder="Ví dụ: Dây điện Cadivi 2.5, Khóa lục giác..."
                        value={customLine.itemName}
                        onChange={(e) => setCustomLine({ ...customLine, itemName: e.target.value })}
                        className="text-xs h-7"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">ĐVT</label>
                      <Input
                        placeholder="Cái, Cuộn, Kg..."
                        value={customLine.unit}
                        onChange={(e) => setCustomLine({ ...customLine, unit: e.target.value })}
                        className="text-xs h-7"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Số lượng</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={customLine.quantity}
                        onChange={(e) => setCustomLine({ ...customLine, quantity: parseFloat(e.target.value) || 1 })}
                        className="text-xs h-7 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Đơn giá (đ)</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="1000"
                          value={customLine.unitPrice}
                          onChange={(e) => setCustomLine({ ...customLine, unitPrice: parseFloat(e.target.value) || 0 })}
                          className="text-xs h-7 font-mono"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddCustomLine}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 h-7 shrink-0 cursor-pointer"
                        >
                          Lưu
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2 w-28">Phân loại</th>
                        <th className="p-2">Tên vật tư kỹ thuật</th>
                        <th className="p-2 text-center w-16">ĐVT</th>
                        <th className="p-2 text-right w-24">Số lượng</th>
                        <th className="p-2 text-right w-28">Đơn giá (đ)</th>
                        <th className="p-2 text-right w-28">Thành tiền</th>
                        <th className="p-2 w-32">Ghi chú</th>
                        <th className="p-2 text-center w-10">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bomLines.map((it, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/30">
                          <td className="p-2 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {it.category}
                            </span>
                          </td>
                          <td className="p-2">
                            <strong className="text-slate-900 block">{it.itemName}</strong>
                            {it.itemCode && (
                              <span className="text-[10px] text-purple-700 font-mono">{it.itemCode}</span>
                            )}
                          </td>
                          <td className="p-2 text-center text-slate-600 font-medium">{it.unit}</td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.1"
                              value={it.quantity}
                              onChange={(e) => handleUpdateBomLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-0.5 text-right font-mono font-bold text-slate-900 border border-slate-300 rounded focus:border-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="1000"
                              value={it.unitPrice}
                              onChange={(e) => handleUpdateBomLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="w-24 px-1.5 py-0.5 text-right font-mono text-slate-700 border border-slate-300 rounded focus:border-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-purple-900">
                            {it.amount.toLocaleString("vi-VN")} đ
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.note || ""}
                              onChange={(e) => handleUpdateBomLine(idx, "note", e.target.value)}
                              placeholder="Ghi chú..."
                              className="w-full px-1.5 py-0.5 text-[10px] border border-slate-200 rounded focus:border-purple-500 focus:outline-none text-slate-600"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteBomLine(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                              title="Xóa dòng vật tư này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/vat-tu?tab=bom")}
                    className="text-xs gap-1.5 cursor-pointer"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mở Quản Trị BOM</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBomSurvey(null)}
                    className="text-xs cursor-pointer"
                  >
                    Đóng
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBomSurvey(null);
                      setQuoteSurvey(bomSurvey);
                    }}
                    className="text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    <span>Báo Giá Dự Toán</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmSaveBom(bomSurvey, false)}
                    disabled={savingBom}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 font-bold cursor-pointer"
                  >
                    {savingBom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{savingBom ? "Đang lưu..." : "Lưu Vào Hệ Thống BOM"}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmSaveBom(bomSurvey, true)}
                    disabled={savingBom}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold cursor-pointer shadow-sm"
                  >
                    {savingBom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>⚡ 1-Click Chuyển Sang Sản Xuất</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL 2: BÁO GIÁ DỰ TOÁN NHANH (INSTANT MODAL 0MS) */}
      <Modal
        isOpen={Boolean(quoteSurvey)}
        onClose={() => setQuoteSurvey(null)}
        title="Báo Giá Dự Toán Nhanh Hiện Trường"
        description={`Phiếu: ${quoteSurvey?.code || ""} • ${quoteSurvey?.metadata?.dealerName || quoteSurvey?.title || ""}`}
        maxWidth="3xl"
      >
        {quoteSurvey && (() => {
          const meta = quoteSurvey.metadata || {};
          const area = Math.round((quoteSurvey.widthMeters * quoteSurvey.heightMeters) * 100) / 100;
          const estUnitPrice = 1850000;
          const subTotal = Math.round(area > 0 ? area * estUnitPrice : 5000000);
          const taxAmount = Math.round(subTotal * 0.1);
          const grandTotal = subTotal + taxAmount;
          const items = getSurveyWorkItems(quoteSurvey);

          return (
            <div className="space-y-4 text-xs">
              {/* Header Box */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <strong className="text-slate-900 font-bold uppercase text-sm block">
                    {meta.dealerName || quoteSurvey.title}
                  </strong>
                  <div className="text-slate-600 flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-blue-900">KV: {meta.regionKV || "HCM"}</span>
                    <span>•</span>
                    <span className="font-mono text-blue-700 font-bold">ĐT: {meta.dealerPhone || quoteSurvey.customerPhone || "—"}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">{meta.dealerAddress || quoteSurvey.address}</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-blue-700 font-semibold block uppercase">Tổng Dự Toán Thanh Toán</span>
                  <strong className="font-mono text-lg font-extrabold text-blue-900">
                    {grandTotal.toLocaleString("vi-VN")} đ
                  </strong>
                  <span className="text-[10px] text-slate-500 block">(Đã gồm 10% VAT)</span>
                </div>
              </div>

              {/* Bảng Chi Tiết Dự Toán */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">Hạng mục công việc</th>
                      <th className="p-2.5 text-center">ĐVT</th>
                      <th className="p-2.5 text-right">Khối lượng</th>
                      <th className="p-2.5 text-right">Đơn giá tham chiếu</th>
                      <th className="p-2.5 text-right">Thành tiền (VND)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5">
                        <strong className="text-slate-900 block">
                          Gia công & Lắp dựng {meta.signMaterial || "Biển hiệu alu chữ nổi LED"}
                        </strong>
                        <span className="text-[11px] text-slate-500 block font-mono">
                          Quy cách: {quoteSurvey.widthMeters}m × {quoteSurvey.heightMeters}m • Khung sắt mạ kẽm • LED module Hàn Quốc
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono">m²</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">{area > 0 ? area : 1}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">{estUnitPrice.toLocaleString("vi-VN")} đ</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900">{subTotal.toLocaleString("vi-VN")} đ</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold text-[11px] border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-2 text-right text-slate-600">Tiền hàng trước thuế:</td>
                      <td className="p-2 text-right font-mono text-slate-900 font-bold">{subTotal.toLocaleString("vi-VN")} đ</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-2 text-right text-slate-600">Thuế GTGT (VAT 10%):</td>
                      <td className="p-2 text-right font-mono text-slate-700">{taxAmount.toLocaleString("vi-VN")} đ</td>
                    </tr>
                    <tr className="border-t border-slate-200 text-xs bg-blue-50/50">
                      <td colSpan={4} className="p-2.5 text-right font-bold text-blue-950">TỔNG CỘNG THANH TOÁN:</td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-blue-900 text-sm">{grandTotal.toLocaleString("vi-VN")} đ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Các hạng mục đo đạc đi kèm */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 text-[11px] block">Nội dung ghi nhận thực địa:</span>
                <div className="space-y-0.5">
                  {items.map((it, idx) => (
                    <div key={idx} className="text-rose-700 font-medium text-[11px] flex items-start gap-1">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/bao-gia")}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mở Danh Sách Báo Giá</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuoteSurvey(null)}
                    className="text-xs cursor-pointer"
                  >
                    Đóng
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmConvertToQuote(quoteSurvey)}
                    disabled={convertingId === quoteSurvey.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-bold cursor-pointer"
                  >
                    {convertingId === quoteSurvey.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{convertingId === quoteSurvey.id ? "Đang tạo báo giá..." : "Tạo Báo Giá Chính Thức (1-Click)"}</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL TẠO & SỬA KHỐI LƯỢNG CÔNG VIỆC THỰC CHIẾN */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSurveyId(null);
        }}
        title={
          editingSurveyId
            ? "Cập Nhật Khối Lượng Công Việc & Khảo Sát"
            : "Thêm Khối Lượng Công Việc & Khảo Sát Mới"
        }
        description="Nhập thông tin đại lý, địa chỉ thực tế và danh sách các hạng mục đo đạc / sửa chữa"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {/* Phân vùng KV & Nhóm việc */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Khu vực (KV) *
                </label>
                <select
                  value={formData.regionKV}
                  onChange={(e) => setFormData({ ...formData, regionKV: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  {REGIONS_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Phân loại công việc *
                </label>
                <select
                  value={formData.workType}
                  onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="BẢNG HIỆU">BẢNG HIỆU</option>
                  <option value="NỘI THẤT / SHOWROOM">HẠNG MỤC NỘI THẤT / SHOWROOM</option>
                  <option value="SỬA CHỮA MIỀN TÂY">SỬA CHỮA / BẢO TRÌ</option>
                  <option value="KHẢO SÁT">KHẢO SÁT (SURVEY)</option>
                  <option value="THÙNG RỖNG">THÙNG RỖNG / GIAO MẪU</option>
                </select>
              </div>
            </div>

            {/* Tên đại lý & Số điện thoại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên đại lý / Khách hàng *
                </label>
                <Input
                  placeholder="Ví dụ: NAM LONG PHÁT, ĐẠT TIẾN..."
                  value={formData.dealerName}
                  onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
                  required
                  className="text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Số điện thoại (ĐT)
                </label>
                <Input
                  placeholder="Ví dụ: 0962 464 230 - 0379 417 968"
                  value={formData.dealerPhone}
                  onChange={(e) => setFormData({ ...formData, dealerPhone: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Địa chỉ thực tế */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Địa chỉ công trình thực tế (Số nhà, đường, phường/xã, quận/huyện, tỉnh) *
              </label>
              <Input
                placeholder="Ví dụ: 16/5 Phan Văn Hớn, Ấp Nam Lân, Bà Điểm, Hóc Môn, TP.HCM"
                value={formData.dealerAddress}
                onChange={(e) => setFormData({ ...formData, dealerAddress: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            {/* Dự án thi công liên kết */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Dự án thi công liên kết (Tùy chọn)
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="">-- Không liên kết dự án (Khảo sát độc lập) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DANH SÁCH HẠNG MỤC CÔNG VIỆC & KÍCH THƯỚC (Gõ gạch đầu dòng) */}
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-rose-600" />
                  <span>Hạng mục công việc & Kích thước đo đạc (Mỗi dòng 1 gạch đầu dòng) *</span>
                </span>
                <span className="text-[10px] text-rose-600 italic">
                  Hiển thị dạng chữ đỏ như bảng thực tế
                </span>
              </div>

              <textarea
                rows={4}
                value={formData.workItemsText}
                onChange={(e) => setFormData({ ...formData, workItemsText: e.target.value })}
                placeholder={`- bảng alu 2.38m x 6m, 1m x 2.38m\n- bảng bạt UV 0.9m x 5.9m\n- Kệ màu 2.4m x 2.78m\n- 2 bàn lễ tân = 1.5m (đóng riêng) + 1 ghế làm việc`}
                className="w-full px-3 py-2 text-xs font-medium text-rose-800 bg-white rounded-lg border border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono leading-relaxed"
                required
              />

              {/* Live Preview */}
              <div className="p-2 bg-white rounded-lg border border-rose-200 text-xs space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold block">Xem trước hiển thị:</span>
                {formData.workItemsText
                  .split("\n")
                  .filter(Boolean)
                  .map((it, idx) => (
                    <div key={idx} className="text-rose-700 font-medium text-[11px] flex items-start gap-1">
                      <span className="text-rose-600 font-bold shrink-0">-</span>
                      <span>{it.startsWith("-") ? it.substring(1).trim() : it}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Quy cách phụ & Kích thước tổng thể (nếu là bảng hiệu) */}
            {formData.workType === "BẢNG HIỆU" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chất liệu bảng</label>
                  <select
                    value={formData.signMaterial}
                    onChange={(e) => setFormData({ ...formData, signMaterial: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Bảng alu ngoài trời">Bảng alu ngoài trời</option>
                    <option value="Bảng bạt UV">Bảng bạt UV</option>
                    <option value="Bảng fomex 10li + decal">Bảng fomex 10li + decal</option>
                    <option value="Bảng Hộp đèn 3M in UV">Bảng Hộp đèn 3M in UV</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phụ kiện nhận diện Nippon</label>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasMicaLogo65}
                        onChange={(e) => setFormData({ ...formData, hasMicaLogo65: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Mica 65×65</span>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasSideTrim}
                        onChange={(e) => setFormData({ ...formData, hasSideTrim: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Lườn viền</span>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasColorStrip}
                        onChange={(e) => setFormData({ ...formData, hasColorStrip: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Dải 3 màu</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tiến độ & Lưu ý thực địa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lịch thi công / Giao nhận
                </label>
                <Input
                  placeholder="Ví dụ: TC ngày 12-10, giao tháng 3, hỗ trợ làm sớm..."
                  value={formData.deliverySchedule}
                  onChange={(e) => setFormData({ ...formData, deliverySchedule: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lưu ý tại mặt bằng
                </label>
                <Input
                  placeholder="Ví dụ: dọn kệ cho dly ko có người, bắn lại trần alu cũ bung..."
                  value={formData.siteNotes}
                  onChange={(e) => setFormData({ ...formData, siteNotes: e.target.value })}
                  className="text-xs"
                />
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
              <span>{saving ? "Đang lưu..." : editingSurveyId ? "Cập Nhật Khối Lượng" : "Lưu Khối Lượng"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRAWER XEM CHI TIẾT */}
      {selectedSurvey && (() => {
        const meta = selectedSurvey.metadata || {};
        const dealerName = meta.dealerName || selectedSurvey.title;
        const dealerPhone = meta.dealerPhone || selectedSurvey.customerPhone;
        const dealerAddress = meta.dealerAddress || selectedSurvey.address;
        const items = getSurveyWorkItems(selectedSurvey);

        return (
          <Drawer
            isOpen={Boolean(selectedSurvey)}
            onClose={() => setSelectedSurvey(null)}
            title={`Hồ Sơ Khối Lượng: ${selectedSurvey.code}`}
            width="lg"
          >
            <div className="space-y-4 text-xs pb-6">
              {/* Header Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {selectedSurvey.code}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">
                      {meta.regionKV || "HCM"}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {meta.workType || "BẢNG HIỆU"}
                    </span>
                  </div>
                  <Badge variant="warning">
                    {meta.executionStatus || "Đang xử lý"}
                  </Badge>
                </div>

                <strong className="text-slate-900 block text-sm font-bold uppercase">{dealerName}</strong>
                <div className="flex items-center justify-between gap-2 text-slate-600">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{dealerAddress}</span>
                  </div>
                  {dealerAddress && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dealerAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md shrink-0 transition"
                    >
                      <Compass className="w-3 h-3" />
                      Dẫn đường
                    </a>
                  )}
                </div>
                {dealerPhone && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-mono font-bold">
                    <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>ĐT: {dealerPhone}</span>
                  </div>
                )}
              </div>

              {/* Danh sách các hạng mục đo đạc */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <span className="text-[10px] text-rose-900 uppercase font-bold block">
                  Danh Sách Hạng Mục & Quy Cách Đo Đạc
                </span>
                <div className="space-y-1">
                  {items.map((it, idx) => (
                    <div key={idx} className="text-rose-800 font-medium text-xs flex items-start gap-1.5 bg-white p-2 rounded border border-rose-100">
                      <span className="text-rose-600 font-bold shrink-0">•</span>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiến độ & Thực địa */}
              {(meta.deliverySchedule || meta.siteNotes) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-[11px]">
                  {meta.deliverySchedule && (
                    <div>
                      <span className="text-slate-500 font-medium">Lịch TC / Giao nhận:</span>{" "}
                      <strong className="text-blue-700">{meta.deliverySchedule}</strong>
                    </div>
                  )}
                  {meta.siteNotes && (
                    <div>
                      <span className="text-slate-500 font-medium">Lưu ý mặt bằng:</span>{" "}
                      <strong className="text-slate-800">{meta.siteNotes}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* CHỮ KÝ XÁC NHẬN HIỆN TRƯỜNG */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                    <FileSignature className="w-4 h-4 text-emerald-600" />
                    <span>Chữ ký xác nhận thực địa</span>
                  </div>
                  {selectedSurvey.customerSignature ? (
                    <Badge variant="success" className="text-[10px]">
                      Đã ký xác nhận
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenSignatureModal(selectedSurvey)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 cursor-pointer shrink-0"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>Ký ngay</span>
                    </Button>
                  )}
                </div>

                {selectedSurvey.customerSignature && (
                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center">
                    <img
                      src={selectedSurvey.customerSignature}
                      alt="Chữ ký khách hàng"
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenBomModal(selectedSurvey)}
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

                  <Button
                    size="sm"
                    onClick={() => setQuoteSurvey(selectedSurvey)}
                    className="bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5 shadow-2xs font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Báo Giá Dự Toán</span>
                  </Button>
                </div>
              </div>
            </div>
          </Drawer>
        );
      })()}

      {/* MODAL KÝ SỐ XÁC NHẬN */}
      <Modal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        title="Ký Xác Nhận Khối Lượng Hiện Trường"
      >
        <div className="space-y-3 max-w-md">
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>Mã phiếu: <strong className="text-blue-700 font-mono">{surveyToSign?.code}</strong></div>
            <div>Đại lý / Công trình: <strong className="uppercase">{surveyToSign?.metadata?.dealerName || surveyToSign?.title}</strong></div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Người ký xác nhận (Đại diện đại lý / Công trình)
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
              <span>{isSavingSignature ? "Đang lưu..." : "Xác nhận & Lưu"}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
