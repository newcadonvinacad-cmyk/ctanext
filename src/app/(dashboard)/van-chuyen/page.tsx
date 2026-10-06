"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Modal,
  Drawer,
  Pagination,
  toast,
  FacetFilter,
  type FacetOption,
} from "@/components/ui";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
  Building2,
  Navigation,
  X,
} from "lucide-react";
import { TripDto, VehicleDto } from "@/services/project.service";
import { useSetPageHeader } from "@/contexts/page-header-context";

export default function FleetPage() {
  const [trips, setTrips] = React.useState<TripDto[]>([]);
  const [vehicles, setVehicles] = React.useState<VehicleDto[]>([]);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedTrip, setSelectedTrip] = React.useState<TripDto | null>(null);

  // Modal tạo Lệnh điều xe mới
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    vehicleId: "",
    driverEmployeeId: "",
    projectId: "",
    plannedDeparture: new Date().toISOString().slice(0, 16),
    stop1: "Xưởng Gia Công Signage ERP - Cụm CN Cầu Gáo, Đan Phượng, Hà Nội",
    stop2: "",
  });

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, vRes, pRes] = await Promise.all([
        fetch("/api/fleet/trips"),
        fetch("/api/fleet/vehicles"),
        fetch("/api/projects"),
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        setTrips(tData.trips || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData.vehicles || []);
        if (vData.vehicles?.length > 0 && !formData.vehicleId) {
          setFormData((prev) => ({ ...prev, vehicleId: vData.vehicles[0].id }));
        }
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjects(pData.projects || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateTripStatus = async (tripId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/fleet/trips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
      toast.success("Đã chuyển trạng thái chuyến xe");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật");
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.projectId) {
      toast.error("Vui lòng chọn Xe và Công trình cần chở");
      return;
    }

    try {
      setCreating(true);
      // Lấy địa chỉ công trình đã chọn cho stop 2 nếu chưa điền
      const selectedProj = projects.find((p) => p.id === formData.projectId);
      const destination = formData.stop2 || selectedProj?.address || "Công trình";

      const res = await fetch("/api/fleet/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: formData.vehicleId,
          driverEmployeeId: formData.driverEmployeeId || undefined,
          projectId: formData.projectId,
          plannedDeparture: formData.plannedDeparture || undefined,
          stops: [
            { sequence: 1, address: formData.stop1 },
            { sequence: 2, address: destination },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo chuyến");

      toast.success("Phát hành lệnh điều xe thành công!");
      setIsCreateOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo chuyến");
    } finally {
      setCreating(false);
    }
  };

  const statusOptions: FacetOption[] = [
    {
      value: "scheduled",
      label: "Lên lịch chờ chạy",
      count: trips.filter((t) => t.status === "scheduled").length,
    },
    {
      value: "dispatched",
      label: "Đang lăn bánh",
      count: trips.filter((t) => t.status === "dispatched").length,
    },
    {
      value: "completed",
      label: "Đã giao hoàn tất",
      count: trips.filter((t) => t.status === "completed").length,
    },
  ];

  const vehicleOptions: FacetOption[] = React.useMemo(() => {
    const plates = Array.from(new Set(trips.map((t) => t.vehiclePlate).filter(Boolean)));
    return plates.map((plate) => ({
      value: plate,
      label: plate,
      count: trips.filter((t) => t.vehiclePlate === plate).length,
    }));
  }, [trips]);

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.projectName && t.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
    const matchesVehicle = selectedVehicles.length === 0 || selectedVehicles.includes(t.vehiclePlate);
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, selectedVehicles]);

  const paginatedTrips = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, page, pageSize]);

  const isFiltered = statusFilter.length > 0 || selectedVehicles.length > 0 || searchTerm.length > 0;
  const resetFilters = () => {
    setStatusFilter([]);
    setSelectedVehicles([]);
    setSearchTerm("");
  };

  const totalTrips = trips.length;
  const dispatchedCount = trips.filter((t) => t.status === "dispatched").length;
  const completedCount = trips.filter((t) => t.status === "completed").length;

  useSetPageHeader({
    title: "Vận Chuyển",
    subtitle: "Điều phối đội xe tải vận chuyển biển quảng cáo, kết cấu & giàn giáo",
    badge: "Điều Đội Xe",
  });

  return (
    <div className="space-y-3">
      {/* KPI METRICS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Đội xe công ty</span>
            <Truck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900">
            {vehicles.length} xe
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Xe tải thùng & xe bán tải</p>
        </div>

        <div className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng chuyến vận chuyển</span>
            <Navigation className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900">
            {totalTrips}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Lịch trình chở biển hiệu</p>
        </div>

        <div className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600">
              Đang trên đường đi
            </span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-blue-700">
            {dispatchedCount}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đang chở hàng ra công trình</p>
        </div>

        <div className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">
              Giao hàng thành công
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-700">
            {completedCount}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">Đã hạ hàng an toàn</p>
        </div>
      </div>

      {/* THANH LỌC CHUẨN FACET FILTER */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm mã chuyến, biển số xe, tài xế..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-7 text-xs h-8 border-slate-200 bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <FacetFilter
            title="Trạng thái chuyến xe"
            options={statusOptions}
            selectedValues={statusFilter}
            onChange={setStatusFilter}
          />

          {vehicleOptions.length > 0 && (
            <FacetFilter
              title="Phương tiện / Biển số"
              options={vehicleOptions}
              selectedValues={selectedVehicles}
              onChange={setSelectedVehicles}
            />
          )}

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs px-2.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa lọc</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1 text-slate-500 text-xs h-8">
            <RefreshCw className="h-3.5 w-3.5" />
            Tải lại
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg shadow-2xs h-8 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Lệnh điều xe mới
          </Button>
        </div>
      </div>

      {/* DANH SÁCH LỆNH ĐIỀU XE */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-2xs rounded-xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Mã Chuyến</th>
                  <th className="px-4 py-3">Biển Số Xe</th>
                  <th className="px-4 py-3">Tài Xế Phụ Trách</th>
                  <th className="px-4 py-3">Công Trình Phục Vụ</th>
                  <th className="px-4 py-3">Lộ Trình Điểm Dừng</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy chuyến xe nào
                    </td>
                  </tr>
                ) : (
                  paginatedTrips.map((trip) => (
                    <tr
                      key={trip.id}
                      onClick={() => setSelectedTrip(trip)}
                      className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                        {trip.code}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-slate-400" />
                          <span>{trip.vehiclePlate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">{trip.driverName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 max-w-xs truncate">
                        {trip.projectName || "Vận chuyển nội bộ"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-sm">
                        <div className="space-y-1">
                          {trip.stops.map((s) => (
                            <div key={s.id} className="flex items-center gap-1 text-[11px] truncate">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-700">
                                {s.sequence}
                              </span>
                              <span className="truncate">{s.address}</span>
                              {s.deliveryStatus === "delivered" && (
                                <span className="text-[10px] text-emerald-600 font-bold">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            trip.status === "completed"
                              ? "success"
                              : trip.status === "dispatched"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {trip.status === "completed"
                            ? "Đã Giao Xong"
                            : trip.status === "dispatched"
                            ? "Đang Di Chuyển"
                            : "Chờ Xuất Bến"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {trip.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTripStatus(trip.id, "dispatched");
                            }}
                            className="gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-7"
                          >
                            Xuất bến
                          </Button>
                        )}
                        {trip.status === "dispatched" && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTripStatus(trip.id, "completed");
                            }}
                            className="gap-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 h-7 font-semibold"
                          >
                            Đã giao tới nơi
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredTrips.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredTrips.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}
      </Card>

      {/* MODAL PHÁT HÀNH LỆNH ĐIỀU XE */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Phát Hành Lệnh Điều Xe Vận Chuyển Biển Quảng Cáo"
      >
        <form onSubmit={handleCreateTrip} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phương Tiện Vận Chuyển <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNo} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Công Trình Cần Giao Tới <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.projectId}
                onChange={(e) => {
                  const pId = e.target.value;
                  const proj = projects.find((p) => p.id === pId);
                  setFormData({
                    ...formData,
                    projectId: pId,
                    stop2: proj ? proj.address : "",
                  });
                }}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Chọn công trình --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Điểm Bốc Hàng (Xưởng)
            </label>
            <Input
              value={formData.stop1}
              onChange={(e) => setFormData({ ...formData, stop1: e.target.value })}
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Điểm Hạ Hàng (Chân Công Trình) <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              value={formData.stop2}
              onChange={(e) => setFormData({ ...formData, stop2: e.target.value })}
              placeholder="Địa chỉ giao biển quảng cáo..."
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thời Gian Xuất Bến Dự Kiến
            </label>
            <Input
              type="datetime-local"
              value={formData.plannedDeparture}
              onChange={(e) => setFormData({ ...formData, plannedDeparture: e.target.value })}
              className="text-xs h-8"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={creating} className="bg-slate-900 text-white hover:bg-slate-800 font-semibold shadow-2xs">
              {creating ? "Đang phát hành..." : "Phát Hành Lệnh Xe"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRAWER CHI TIẾT LỆNH ĐIỀU XE */}
      <Drawer
        isOpen={selectedTrip !== null}
        onClose={() => setSelectedTrip(null)}
        title={selectedTrip ? `Lệnh Điều Xe: ${selectedTrip.code}` : "Chi Tiết Lệnh Xe"}
        width="lg"
      >
        {selectedTrip && (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header info card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-blue-600">
                  {selectedTrip.code}
                </span>
                <Badge
                  variant={
                    selectedTrip.status === "completed"
                      ? "success"
                      : selectedTrip.status === "dispatched"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {selectedTrip.status === "completed"
                    ? "Đã Giao Xong"
                    : selectedTrip.status === "dispatched"
                    ? "Đang Di Chuyển"
                    : "Chờ Xuất Bến"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[11px]">Phương tiện:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 mt-0.5">
                    <Truck className="h-3.5 w-3.5 text-slate-500" />
                    <span>{selectedTrip.vehiclePlate}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tài xế phụ trách:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 mt-0.5">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>{selectedTrip.driverName}</span>
                  </div>
                </div>
              </div>

              {selectedTrip.projectName && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[11px]">Công trình / Dự án:</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-900 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>{selectedTrip.projectName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Lộ trình */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5 text-xs">
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
                Lộ Trình Điểm Dừng & Giao Hàng
              </h4>
              <div className="space-y-2 border-l-2 border-blue-200 pl-3 ml-2">
                {selectedTrip.stops.map((stop) => (
                  <div key={stop.id} className="relative group">
                    <div className="absolute -left-[19px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600" />
                    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-xs">
                          Điểm dừng #{stop.sequence}
                        </span>
                        {stop.deliveryStatus === "delivered" ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Đã giao
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">Chưa giao</span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-600 text-xs">{stop.address}</p>
                      {stop.arrivedAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Thời gian đến: {new Date(stop.arrivedAt).toLocaleTimeString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              {selectedTrip.status === "scheduled" && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleUpdateTripStatus(selectedTrip.id, "dispatched");
                    setSelectedTrip({ ...selectedTrip, status: "dispatched" });
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 h-8 text-xs font-semibold"
                >
                  Xuất Bến Ngay
                </Button>
              )}
              {selectedTrip.status === "dispatched" && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleUpdateTripStatus(selectedTrip.id, "completed");
                    setSelectedTrip({ ...selectedTrip, status: "completed" });
                  }}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs font-semibold"
                >
                  Xác Nhận Đã Giao Tới Nơi
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTrip(null)}
                className="h-8 text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
