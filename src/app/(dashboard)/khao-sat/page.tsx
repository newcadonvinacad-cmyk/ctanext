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
  Search,
  Sparkles,
  MapPin,
  Calendar,
  Eye,
  Camera,
  Layers,
  Zap,
  HardHat,
  ArrowRight,
  RefreshCw,
  Building2,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { SiteSurveyDto } from "@/services/signage-phase2.service";
import { useSetPageHeader } from "@/contexts/page-header-context";
import { useAuthorization } from "@/hooks/use-authorization";

export default function SiteSurveyPage() {
  const router = useRouter();
  const { can } = useAuthorization();

  useSetPageHeader({
    title: "Khảo Sát Mặt Bằng Hiện Trường",
    subtitle: "Đo đạc kích thước, dầm chịu lực & 1-Click lập Báo giá dự toán",
    screenCode: "M04-KS",
    quickViews: [
      { label: "Báo giá dự toán", href: "/bao-gia" },
      { label: "Dự án thi công", href: "/du-an" },
    ],
  });

  const [surveys, setSurveys] = React.useState<SiteSurveyDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedSurvey, setSelectedSurvey] = React.useState<SiteSurveyDto | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [convertingId, setConvertingId] = React.useState<string | null>(null);

  // Form tạo khảo sát mới
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [formData, setFormData] = React.useState({
    title: "",
    address: "",
    customerId: "",
    surveyDate: new Date().toISOString().split("T")[0],
    widthMeters: 8.0,
    heightMeters: 2.5,
    depthMeters: 0.35,
    floorLevel: "Tầng 1",
    elevationMeters: 3.5,
    structureType: "Dầm bê tông chịu lực",
    powerSource: "220V 1 pha",
    powerDistanceMeters: 10,
    installationMethod: "Giàn giáo 2 tầng",
    obstacles: "",
    notes: "",
  });

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
      const res = await fetch("/api/customers?limit=100");
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

  // Lọc dữ liệu
  const filteredSurveys = React.useMemo(() => {
    return surveys.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [surveys, search, statusFilter]);

  // Xử lý 1-Click chuyển Khảo Sát sang Báo Giá
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.address.trim()) {
      toast.error("Vui lòng nhập tiêu đề và địa chỉ khảo sát");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          widthMeters: Number(formData.widthMeters) || 0,
          heightMeters: Number(formData.heightMeters) || 0,
          depthMeters: Number(formData.depthMeters) || 0,
          elevationMeters: Number(formData.elevationMeters) || 0,
          powerDistanceMeters: Number(formData.powerDistanceMeters) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo phiếu khảo sát");

      toast.success(`Đã tạo phiếu khảo sát ${data.survey.code}!`);
      setIsCreateModalOpen(false);
      setFormData({
        title: "",
        address: "",
        customerId: "",
        surveyDate: new Date().toISOString().split("T")[0],
        widthMeters: 8.0,
        heightMeters: 2.5,
        depthMeters: 0.35,
        floorLevel: "Tầng 1",
        elevationMeters: 3.5,
        structureType: "Dầm bê tông chịu lực",
        powerSource: "220V 1 pha",
        powerDistanceMeters: 10,
        installationMethod: "Giàn giáo 2 tầng",
        obstacles: "",
        notes: "",
      });
      fetchSurveys();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo phiếu khảo sát");
    } finally {
      setCreating(false);
    }
  };

  // Cột bảng dữ liệu
  const columns: DataTableColumn<SiteSurveyDto>[] = [
    {
      id: "code",
      header: "Mã khảo sát",
      width: "130px",
      cell: (item: SiteSurveyDto) => (
        <div>
          <button
            type="button"
            onClick={() => setSelectedSurvey(item)}
            className="font-mono font-bold text-blue-600 hover:underline block text-xs"
          >
            {item.code}
          </button>
          <span className="text-[10px] text-slate-400 block mt-0.5">{item.surveyDate}</span>
        </div>
      ),
    },
    {
      id: "title",
      header: "Công trình & Mặt bằng",
      width: "min-w-[280px] w-full",
      cell: (item: SiteSurveyDto) => (
        <div>
          <strong className="text-slate-900 block font-semibold text-xs">{item.title}</strong>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-xs">{item.address}</span>
          </div>
        </div>
      ),
    },
    {
      id: "customerName",
      header: "Khách hàng",
      cell: (item: SiteSurveyDto) => (
        <div>
          <span className="font-medium text-slate-800 text-xs block truncate max-w-[180px]">
            {item.customerName || "—"}
          </span>
          {item.customerPhone && (
            <span className="text-[10px] text-slate-500 font-mono block">{item.customerPhone}</span>
          )}
        </div>
      ),
    },
    {
      id: "dimensions",
      header: "Kích thước đo đạc",
      cell: (item: SiteSurveyDto) => {
        const area = Math.round((item.widthMeters * item.heightMeters) * 100) / 100;
        return (
          <div className="font-mono text-xs">
            <span className="font-semibold text-slate-900">
              {item.widthMeters}m × {item.heightMeters}m
            </span>
            <span className="text-[10px] text-blue-600 font-medium block">
              {area > 0 ? `(${area} m²)` : ""} - {item.floorLevel}
            </span>
          </div>
        );
      },
    },
    {
      id: "technicals",
      header: "Kỹ thuật hiện trường",
      cell: (item: SiteSurveyDto) => (
        <div className="text-[11px] text-slate-600 space-y-0.5">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate max-w-[160px]">{item.powerSource} ({item.powerDistanceMeters}m)</span>
          </div>
          <div className="flex items-center gap-1">
            <HardHat className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="truncate max-w-[160px]">{item.installationMethod}</span>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      width: "120px",
      cell: (item: SiteSurveyDto) => {
        if (item.status === "converted") {
          return (
            <Badge variant="success" className="text-[10px]">
              Đã tạo Báo giá
            </Badge>
          );
        }
        return (
          <Badge variant="info" className="text-[10px]">
            Hoàn tất khảo sát
          </Badge>
        );
      },
    },
  ];

  const rowActions: DataTableRowAction<SiteSurveyDto>[] = [
    {
      title: "Chi tiết",
      icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
      onClick: (item) => setSelectedSurvey(item),
    },
    {
      title: "⚡ Lập Báo giá dự toán",
      icon: <Sparkles className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => handleConvertToQuote(item),
      hidden: (item) => item.status === "converted",
    },
  ];

  const totalSurveys = surveys.length;
  const completedSurveys = surveys.filter((s) => s.status === "completed").length;
  const convertedSurveys = surveys.filter((s) => s.status === "converted").length;

  return (
    <div className="space-y-4 w-full">
      {/* 3 THẺ KPI TỔNG HỢP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Tổng số phiếu khảo sát</span>
            <strong className="text-xl font-bold text-slate-900 mt-0.5 block font-mono">
              {totalSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Đã hoàn thành đo đạc</span>
            <strong className="text-xl font-bold text-blue-600 mt-0.5 block font-mono">
              {completedSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Đã chuyển thành Báo giá</span>
            <strong className="text-xl font-bold text-emerald-600 mt-0.5 block font-mono">
              {convertedSurveys}
            </strong>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU ĐỘNG VỚI BỘ LỌC CHUẨN BENCHMARK */}
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
        searchPlaceholder="Tìm theo mã KS, tên công trình, địa chỉ, khách hàng..."
        emptyMessage="Chưa có phiếu khảo sát hiện trường nào phù hợp"
        primaryAction={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-8"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Chưa lập báo giá</option>
              <option value="converted">Đã chuyển báo giá</option>
            </select>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="h-8 text-xs gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-sm font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Khảo Sát Mới</span>
            </Button>
          </div>
        }
      />

      {/* MODAL TẠO PHIẾU KHẢO SÁT MỚI */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Phiếu Khảo Sát Hiện Trường & Đo Đạc Mặt Tiền"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tên công trình / Mục tiêu khảo sát *
              </label>
              <Input
                placeholder="Ví dụ: Khảo sát mặt bằng biển hộp đèn 3M Highlands Vincom"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Khách hàng</label>
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

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Địa chỉ thi công *</label>
              <Input
                placeholder="Số nhà, đường phố, quận/huyện, tỉnh/thành..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            {/* THÔNG SỐ ĐO ĐẠC HÌNH HỌC */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                1. Kích thước đo đạc mặt bằng (Đơn vị: mét):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Chiều ngang (m)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.widthMeters}
                    onChange={(e) => setFormData({ ...formData, widthMeters: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Chiều cao (m)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.heightMeters}
                    onChange={(e) => setFormData({ ...formData, heightMeters: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Độ vươn/dày (m)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.depthMeters}
                    onChange={(e) => setFormData({ ...formData, depthMeters: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div className="text-[11px] font-mono text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                Diện tích mặt biển dự kiến:{" "}
                <strong>{Math.round((formData.widthMeters * formData.heightMeters) * 100) / 100} m²</strong>
              </div>
            </div>

            {/* THÔNG SỐ KỸ THUẬT HIỆN TRƯỜNG */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                2. Điều kiện kết cấu & Thi công hiện trường:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Vị trí lắp đặt</label>
                  <Input
                    placeholder="Ví dụ: Tầng 1 mặt tiền"
                    value={formData.floorLevel}
                    onChange={(e) => setFormData({ ...formData, floorLevel: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Độ cao treo biển (m)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.elevationMeters}
                    onChange={(e) => setFormData({ ...formData, elevationMeters: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Kết cấu dầm chịu lực</label>
                  <Input
                    placeholder="Ví dụ: Dầm bê tông / Khung thép"
                    value={formData.structureType}
                    onChange={(e) => setFormData({ ...formData, structureType: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Phương án thi công</label>
                  <Input
                    placeholder="Ví dụ: Giàn giáo 2 tầng / Xe cẩu"
                    value={formData.installationMethod}
                    onChange={(e) => setFormData({ ...formData, installationMethod: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Nguồn điện</label>
                  <Input
                    placeholder="220V 1 pha / 380V 3 pha"
                    value={formData.powerSource}
                    onChange={(e) => setFormData({ ...formData, powerSource: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Khoảng cách kéo dây (m)</label>
                  <Input
                    type="number"
                    value={formData.powerDistanceMeters}
                    onChange={(e) => setFormData({ ...formData, powerDistanceMeters: parseFloat(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Chướng ngại vật & Lưu ý an toàn
              </label>
              <textarea
                rows={2}
                placeholder="Ví dụ: Vướng tán cây xanh bên phải, thi công ban đêm sau 22h theo quy định TTTM..."
                value={formData.obstacles}
                onChange={(e) => setFormData({ ...formData, obstacles: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{creating ? "Đang lưu..." : "Lưu Phiếu Khảo Sát"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRAWER XEM CHI TIẾT PHIẾU KHẢO SÁT */}
      {selectedSurvey && (
        <Drawer
          isOpen={Boolean(selectedSurvey)}
          onClose={() => setSelectedSurvey(null)}
          title={`Hồ Sơ Khảo Sát: ${selectedSurvey.code}`}
          width="lg"
        >
          <div className="space-y-4 text-xs pb-6">
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedSurvey.code}
                </span>
                <Badge
                  variant={
                    selectedSurvey.status === "converted"
                      ? "success"
                      : selectedSurvey.status === "completed"
                      ? "info"
                      : "warning"
                  }
                >
                  {selectedSurvey.status === "converted"
                    ? "Đã lập báo giá"
                    : selectedSurvey.status === "completed"
                    ? "Đã khảo sát xong"
                    : "Chờ khảo sát"}
                </Badge>
              </div>
              <strong className="text-slate-900 block text-sm font-semibold">{selectedSurvey.title}</strong>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedSurvey.address}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 pt-1 text-[11px] border-t border-slate-200/60">
                <span>Khách hàng: <strong>{selectedSurvey.customerName || "—"}</strong></span>
                <span>Ngày khảo sát: <strong>{selectedSurvey.surveyDate}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Kích thước thực tế
                </span>
                <div className="font-mono text-base font-bold text-blue-700">
                  {selectedSurvey.widthMeters}m × {selectedSurvey.heightMeters}m
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Độ sâu: {selectedSurvey.depthMeters}m • DT:{" "}
                  <strong>{Math.round(selectedSurvey.widthMeters * selectedSurvey.heightMeters * 100) / 100} m²</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Phương án thi công
                </span>
                <div className="font-semibold text-slate-900 text-xs">
                  {selectedSurvey.installationMethod}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Độ cao: {selectedSurvey.elevationMeters}m ({selectedSurvey.floorLevel})
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-[11px]">
              <div>
                <span className="text-slate-500">Kết cấu dầm chịu lực:</span>{" "}
                <strong className="text-slate-900">{selectedSurvey.structureType}</strong>
              </div>
              <div>
                <span className="text-slate-500">Nguồn điện:</span>{" "}
                <strong className="text-slate-900">
                  {selectedSurvey.powerSource} (Kéo dây {selectedSurvey.powerDistanceMeters}m)
                </strong>
              </div>
              {selectedSurvey.obstacles && (
                <div>
                  <span className="text-slate-500">Chướng ngại vật:</span>{" "}
                  <strong className="text-amber-800">{selectedSurvey.obstacles}</strong>
                </div>
              )}
              {selectedSurvey.notes && (
                <div className="pt-1.5 border-t border-slate-200 text-slate-600">
                  <span className="font-semibold text-slate-700">Ghi chú hiện trường:</span> {selectedSurvey.notes}
                </div>
              )}
            </div>

            {selectedSurvey.photos.length > 0 && (
              <div>
                <span className="font-bold text-slate-800 block mb-1.5 text-xs">
                  Ảnh chụp hiện trường ({selectedSurvey.photos.length} ảnh):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedSurvey.photos.map((p, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden">
                      <img src={p.url} alt={p.caption || "Ảnh hiện trường"} className="w-full h-32 object-cover" />
                      {p.caption && (
                        <div className="p-1.5 bg-slate-50 text-[10px] text-slate-600 truncate">
                          {p.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedSurvey(null)} className="text-xs">
                Đóng
              </Button>
              {selectedSurvey.status !== "converted" && (
                <Button
                  size="sm"
                  onClick={() => handleConvertToQuote(selectedSurvey)}
                  disabled={convertingId === selectedSurvey.id}
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5 shadow-2xs font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {convertingId === selectedSurvey.id ? "Đang chuyển..." : "⚡ 1-Click Lập Báo Giá Dự Toán"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
