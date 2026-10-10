"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Send,
  Truck,
  User,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Check,
} from "lucide-react";
import {
  SEED_VEHICLES,
  SEED_DRIVERS,
  SEED_DISPATCH_ORDERS,
  DispatchOrder,
  DispatchJob,
  Vehicle,
  generateZaloDispatchMessage,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

const WEEKDAYS = [
  { day: "Thứ 2", date: "2026-10-05" },
  { day: "Thứ 3", date: "2026-10-06" },
  { day: "Thứ 4", date: "2026-10-07" },
  { day: "Thứ 5", date: "2026-10-08" },
  { day: "Thứ 6", date: "2026-10-09" },
  { day: "Thứ 7", date: "2026-10-10" },
  { day: "Chủ Nhật", date: "2026-10-11" },
];

export default function DispatchSchedulePage() {
  const [orders, setOrders] = React.useState<DispatchOrder[]>(SEED_DISPATCH_ORDERS);
  const [vehicles] = React.useState<Vehicle[]>(SEED_VEHICLES);
  const [selectedWeek, setSelectedWeek] = React.useState("Tuần 41 (05/10/2026 - 11/10/2026)");
  const [selectedVehicleFilter, setSelectedVehicleFilter] = React.useState<string>("all");

  // Modal tạo việc mới
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [activeDate, setActiveDate] = React.useState("2026-10-10");
  const [activeVehicleId, setActiveVehicleId] = React.useState("veh-01");

  // State cho Job mới
  const [jobForm, setJobForm] = React.useState({
    jobType: "workshop_transfer" as DispatchJob["jobType"],
    title: "",
    fromLocation: "Xưởng TP.HCM - Cụm CN Tân Bình",
    toLocation: "Xưởng Cần Thơ - KCN Trà Nóc",
    projectName: "",
    plannedStartTime: "06:00",
    plannedEndTime: "11:00",
    plannedKm: 170,
    payloadKg: 1200,
    allowOtMorning: true,
    allowOtEveningNight: false,
    notes: "",
  });

  // Modal xem và copy tin Zalo
  const [zaloPreviewOrder, setZaloPreviewOrder] = React.useState<DispatchOrder | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (selectedVehicleFilter !== "all" && o.vehicleId !== selectedVehicleFilter) return false;
    return true;
  });

  const getOrderForCell = (date: string, vehicleId: string) => {
    return filteredOrders.find((o) => o.workDate === date && o.vehicleId === vehicleId);
  };

  const handleOpenAddJob = (date: string, vehicleId: string) => {
    setActiveDate(date);
    setActiveVehicleId(vehicleId);
    setIsModalOpen(true);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVeh = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];

    // Kiểm tra quá tải trọng (Tiêu chí NT05)
    if (jobForm.payloadKg > targetVeh.maxPayloadKg) {
      toast.error(`CẢNH BÁO QUÁ TẢI: Hàng nặng ${jobForm.payloadKg} kg vượt tải trọng cho phép ${targetVeh.maxPayloadKg} kg của xe ${targetVeh.plateNo}!`);
      return;
    }

    const newJob: DispatchJob = {
      id: `job-${Date.now()}`,
      sequence: 1,
      jobType: jobForm.jobType,
      title: jobForm.title || `${jobForm.fromLocation} ➔ ${jobForm.toLocation}`,
      fromLocation: jobForm.fromLocation,
      toLocation: jobForm.toLocation,
      projectName: jobForm.projectName || undefined,
      plannedStartTime: jobForm.plannedStartTime,
      plannedEndTime: jobForm.plannedEndTime,
      plannedKm: Number(jobForm.plannedKm) || 50,
      payloadKg: Number(jobForm.payloadKg) || 500,
      allowOtMorning: jobForm.allowOtMorning,
      allowOtEveningNight: jobForm.allowOtEveningNight,
      notes: jobForm.notes,
    };

    // Kiểm tra xem đã có Order cho ngày và xe này chưa
    const existingOrderIndex = orders.findIndex(
      (o) => o.workDate === activeDate && o.vehicleId === activeVehicleId
    );

    if (existingOrderIndex >= 0) {
      const updated = [...orders];
      const existing = updated[existingOrderIndex];
      newJob.sequence = existing.jobs.length + 1;
      existing.jobs.push(newJob);
      existing.updatedAt = new Date().toISOString();
      setOrders(updated);
      toast.success(`Đã thêm công việc vào lệnh ${existing.orderCode}`);
    } else {
      const newOrder: DispatchOrder = {
        id: `disp-${Date.now()}`,
        orderCode: `LDX-${activeDate.replace(/-/g, "")}-${activeVehicleId === "veh-01" ? "01" : "02"}`,
        workDate: activeDate,
        vehicleId: targetVeh.id,
        vehiclePlate: targetVeh.plateNo,
        driverId: targetVeh.defaultDriverId,
        driverName: targetVeh.defaultDriverName,
        status: "issued",
        version: 1,
        creationTiming: "before_trip",
        jobs: [newJob],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        issuedAt: new Date().toISOString(),
      };
      setOrders([...orders, newOrder]);
      toast.success(`Đã phát hành lệnh điều xe mới ${newOrder.orderCode}`);
    }

    setIsModalOpen(false);
  };

  const handleCopyZaloText = (order: DispatchOrder) => {
    const text = generateZaloDispatchMessage(order);
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép tin nhắn Zalo gửi tài xế!");
  };

  const handleCopyWeek = () => {
    toast.success("Đã sao chép kế hoạch tuần hiện tại sang Tuần 42 (12/10 - 18/10)!");
  };

  return (
    <div className="space-y-3 font-sans">
      {/* 1. Header Toolbar Thanh Mảnh Theo Chuẩn UI/UX ERP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            FLEET SUITE / ĐIỀU XE & LỊCH TUẦN
          </div>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">
            Lập & Điều Hành Lịch Điều Xe Tuần (Ma Trận Ngày × Xe)
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tuần Selector */}
          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-1 text-xs">
            <button className="p-1 hover:bg-white rounded text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-800">{selectedWeek}</span>
            <button className="p-1 hover:bg-white rounded text-slate-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Lọc Xe */}
          <select
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
          >
            <option value="all">Tất cả xe trong đội</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNo} ({v.model})
              </option>
            ))}
          </select>

          {/* Nút Sao chép tuần */}
          <button
            onClick={handleCopyWeek}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao Chép Tuần Sau</span>
          </button>
        </div>
      </div>

      {/* 2. Ma Trận Lịch Tuần Ngày × Xe */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">
            Ma Trận Kế Hoạch 7 Ngày Công (Chu kỳ 04:00 - 04:00)
          </span>
          <span className="text-[11px] text-slate-500">
            Click vào ô trống để thêm công việc • Nút Zalo để lấy tin nhắn gửi nhóm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 w-44 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                  Phương Tiện & Tài Xế
                </th>
                {WEEKDAYS.map((w) => (
                  <th key={w.date} className="p-2.5 text-center border-r border-slate-200 last:border-r-0">
                    <div className="font-bold text-slate-800">{w.day}</div>
                    <div className="text-[10px] text-slate-500 font-mono font-normal">
                      {w.date.split("-").slice(1).reverse().join("/")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {vehicles
                .filter((v) => selectedVehicleFilter === "all" || v.id === selectedVehicleFilter)
                .map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    {/* Cột Xe cố định bên trái */}
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 align-top">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                          {v.plateNo}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 mt-1">{v.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Tải: <strong className="text-slate-700">{v.maxPayloadKg} kg</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{v.defaultDriverName}</span>
                      </div>
                    </td>

                    {/* 7 Cột Ngày */}
                    {WEEKDAYS.map((w) => {
                      const order = getOrderForCell(w.date, v.id);

                      return (
                        <td
                          key={w.date}
                          className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[130px] max-w-[170px]"
                        >
                          {order ? (
                            <div className="space-y-2">
                              {/* Header Ô: Mã lệnh & nút Zalo */}
                              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <span className="font-mono text-[9px] text-slate-500 font-bold">
                                  {order.orderCode.slice(-9)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setZaloPreviewOrder(order)}
                                    title="Xem & Copy tin nhắn Zalo"
                                    className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px]"
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Danh sách các công việc trong ngày */}
                              {order.jobs.map((job, idx) => {
                                const isNearLimit = job.payloadKg >= v.maxPayloadKg * 0.9;
                                const isOverload = job.payloadKg > v.maxPayloadKg;

                                return (
                                  <div
                                    key={job.id}
                                    className={`p-2 rounded-lg border text-[11px] space-y-1 shadow-2xs ${
                                      job.jobType === "workshop_transfer"
                                        ? "bg-blue-50/50 border-blue-200"
                                        : job.jobType === "project_delivery"
                                        ? "bg-purple-50/50 border-purple-200"
                                        : "bg-emerald-50/50 border-emerald-200"
                                    }`}
                                  >
                                    <div className="font-bold text-slate-900 leading-tight">
                                      #{idx + 1}. {job.title}
                                    </div>

                                    <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>
                                        {job.plannedStartTime} - {job.plannedEndTime} ({job.plannedKm} km)
                                      </span>
                                    </div>

                                    {/* Tải hàng & Đánh giá tải */}
                                    <div className="flex items-center justify-between text-[10px] pt-1">
                                      <span className="text-slate-500">Tải: {job.payloadKg} kg</span>
                                      {isOverload ? (
                                        <span className="px-1.5 py-0.2 rounded font-bold bg-rose-600 text-white text-[9px]">
                                          QUÁ TẢI
                                        </span>
                                      ) : isNearLimit ? (
                                        <span className="px-1.5 py-0.2 rounded font-bold bg-amber-500 text-white text-[9px]">
                                          SÁT TẢI 90%
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-emerald-700 font-medium">Đạt</span>
                                      )}
                                    </div>

                                    {/* Cờ OT sáng / đêm */}
                                    <div className="flex items-center gap-1 text-[9px] font-semibold">
                                      {job.allowOtMorning && (
                                        <span className="px-1 rounded bg-amber-100 text-amber-800">
                                          OT Sáng
                                        </span>
                                      )}
                                      {job.allowOtEveningNight && (
                                        <span className="px-1 rounded bg-indigo-100 text-indigo-800">
                                          OT Tối/Đêm
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Nút thêm việc cho ngày này */}
                              <button
                                onClick={() => handleOpenAddJob(w.date, v.id)}
                                className="w-full py-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/50 rounded border border-dashed border-slate-200 transition flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Thêm chuyến</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenAddJob(w.date, v.id)}
                              className="w-full h-24 rounded-lg border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-400 hover:text-emerald-700 transition flex flex-col items-center justify-center gap-1 text-[11px]"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Trống</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal Thêm Công Việc / Tạo Lệnh Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-700" />
                Lập Công Việc Điều Xe ({activeDate.split("-").reverse().join("/")})
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại Công Việc *
                </label>
                <select
                  value={jobForm.jobType}
                  onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="workshop_transfer">Trung chuyển xưởng (TP.HCM, Cần Thơ, Nha Trang, Nam Định)</option>
                  <option value="project_delivery">Giao hàng dự án quảng cáo</option>
                  <option value="site_materials">Rải vật tư công trình</option>
                  <option value="survey">Khảo sát hiện trường</option>
                  <option value="maintenance">Đưa xe đi bảo dưỡng / đăng kiểm</option>
                  <option value="other">Công việc khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu Đề / Nội Dung Chuyến Đi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trung chuyển khung bạt xưởng TP.HCM sang Cần Thơ"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {jobForm.jobType === "project_delivery" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dự Án Liên Kết (Để phân bổ chi phí)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Dự án Showroom Nippon Paint Cần Thơ"
                    value={jobForm.projectName}
                    onChange={(e) => setJobForm({ ...jobForm, projectName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm Đi (Xuất phát)
                  </label>
                  <input
                    type="text"
                    value={jobForm.fromLocation}
                    onChange={(e) => setJobForm({ ...jobForm, fromLocation: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Điểm Đến (Giao nhận)
                  </label>
                  <input
                    type="text"
                    value={jobForm.toLocation}
                    onChange={(e) => setJobForm({ ...jobForm, toLocation: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Giờ Khởi Hành
                  </label>
                  <input
                    type="time"
                    value={jobForm.plannedStartTime}
                    onChange={(e) => setJobForm({ ...jobForm, plannedStartTime: e.target.value })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Giờ Về Dự Kiến
                  </label>
                  <input
                    type="time"
                    value={jobForm.plannedEndTime}
                    onChange={(e) => setJobForm({ ...jobForm, plannedEndTime: e.target.value })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Km Dự Kiến
                  </label>
                  <input
                    type="number"
                    value={jobForm.plannedKm}
                    onChange={(e) => setJobForm({ ...jobForm, plannedKm: Number(e.target.value) })}
                    className="w-full text-xs px-2 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tải Hàng (kg) - Kiểm tra quá tải trọng xe
                </label>
                <input
                  type="number"
                  value={jobForm.payloadKg}
                  onChange={(e) => setJobForm({ ...jobForm, payloadKg: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Xe Hino tối đa 1.750 kg, Isuzu tối đa 1.900 kg. Sát tải từ 90% (1.575 kg).
                </span>
              </div>

              {/* Tùy chọn cho phép OT */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Phê Duyệt Cho Phép Tăng Ca (Căn cứ xét duyệt OT)
                </span>
                <div className="flex items-center gap-5 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.allowOtMorning}
                      onChange={(e) => setJobForm({ ...jobForm, allowOtMorning: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Cho phép OT Sáng (04:00 - 08:00)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.allowOtEveningNight}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, allowOtEveningNight: e.target.checked })
                      }
                      className="rounded text-emerald-600"
                    />
                    <span>Cho phép OT Tối/Đêm (17:00 - 04:00)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu & Phát Hành Lệnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Xem & Sao Chép Tin Nhắn Zalo Chuẩn Mẫu */}
      {zaloPreviewOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-700" />
                Nội Dung Tin Nhắn Zalo Điều Xe ({zaloPreviewOrder.orderCode})
              </h3>
              <button
                onClick={() => setZaloPreviewOrder(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900 text-emerald-300 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto border border-emerald-950">
              {generateZaloDispatchMessage(zaloPreviewOrder)}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Tự động định dạng giờ xuất phát, tuyến đường, tải hàng và cảnh báo an toàn.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZaloPreviewOrder(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    handleCopyZaloText(zaloPreviewOrder);
                    setZaloPreviewOrder(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao Chép Tin Zalo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
