"use client";

import * as React from "react";
import Link from "next/link";
import {
  Navigation,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Camera,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ArrowRight,
  Sliders,
  Check,
  X,
  FileText,
  AlertCircle,
  History,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  SEED_DAILY_LOGS,
  SEED_VEHICLES,
  DailyLog,
  StopPoint,
  EngineCycle,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

export default function DailyLogsPage() {
  const [logs, setLogs] = React.useState<DailyLog[]>(SEED_DAILY_LOGS);
  const [selectedVehicle, setSelectedVehicle] = React.useState("all");
  const [searchDate, setSearchDate] = React.useState("");
  const [dateBasis, setDateBasis] = React.useState<"calendar" | "work_date">("work_date");
  const [selectedLog, setSelectedLog] = React.useState<DailyLog | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Modal Import GPS Bình Minh
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importStep, setImportStep] = React.useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<any>(null);
  const [committedBatch, setCommittedBatch] = React.useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modal Lịch sử đợt nhập (History)
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [batchHistory, setBatchHistory] = React.useState<any[]>([]);

  // Tab trong Drawer chi tiết đối soát
  const [activeDetailTab, setActiveDetailTab] = React.useState<"reconcile" | "stops" | "engines" | "photos">("reconcile");

  // Load danh sách nhật ký từ API
  const loadDailyLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedVehicle !== "all") params.set("vehicleId", selectedVehicle);
      if (searchDate) params.set("searchDate", searchDate);
      params.set("dateBasis", dateBasis);

      const res = await fetch(`/api/apps/doi-xe/nhat-ky?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.logs && Array.isArray(json.logs)) {
          setLogs(json.logs);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [selectedVehicle, searchDate, dateBasis]);

  React.useEffect(() => {
    loadDailyLogs();
  }, [loadDailyLogs]);

  // Tải lịch sử đợt nhập
  const loadBatchHistory = async () => {
    try {
      const res = await fetch("/api/apps/doi-xe/import-gps/history");
      if (res.ok) {
        const json = await res.json();
        setBatchHistory(json.batches || []);
      }
    } catch {
      // Fallback
    }
  };

  const handleOpenHistory = () => {
    loadBatchHistory();
    setShowHistoryModal(true);
  };

  // Xử lý chọn file thật
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Vui lòng chọn file Excel định dạng .xlsx hoặc .xls");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Kéo thả file
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Vui lòng chọn file Excel định dạng .xlsx hoặc .xls");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Bước 1 -> 2: Đọc và phân tích file (Preview)
  const handleParseAndPreview = async () => {
    if (!selectedFile) {
      toast.error("Vui lòng chọn file Excel GPS Bình Minh trước khi kiểm tra");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/apps/doi-xe/import-gps/preview", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.details || "Không thể đọc dữ liệu file");
      }

      setPreviewData(json.preview);
      setImportStep(2);
      toast.success("Đã nhận dạng cấu trúc file GPS Bình Minh thành công!");
    } catch (err: any) {
      toast.error(`Lỗi phân tích file: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Bước 2 -> 3: Xác nhận lưu trữ (Commit)
  const handleConfirmImport = async () => {
    if (!previewData) return;

    setIsUploading(true);
    try {
      const res = await fetch("/api/apps/doi-xe/import-gps/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: previewData }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.details || "Không thể lưu dữ liệu GPS");
      }

      setCommittedBatch(json.batch);
      setImportStep(3);
      toast.success("Tiếp nhận và lưu trữ dữ liệu GPS Bình Minh thành công!");
    } catch (err: any) {
      toast.error(`Lỗi xác nhận nhập: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Hoàn tất và xem dữ liệu vừa nhập
  const handleFinishAndNavigate = () => {
    if (previewData?.identifiedVehicles?.[0]) {
      const plate = previewData.identifiedVehicles[0];
      const matchVeh = SEED_VEHICLES.find(
        (v) => v.plateNo.includes(plate) || plate.includes(v.plateNo.replace(/[\.\-_]/g, ""))
      );
      if (matchVeh) {
        setSelectedVehicle(matchVeh.id);
      }
    }

    // Nếu là file tháng 8 Hino, tự động chuyển bộ lọc sang tháng 8
    if (previewData?.summaryReport?.days?.[0]?.calendarDate) {
      const sampleDate = previewData.summaryReport.days[0].calendarDate;
      const monthPrefix = sampleDate.slice(0, 7); // YYYY-MM
      setSearchDate(monthPrefix);
      setDateBasis("calendar");
    } else if (previewData?.journeyReport?.events?.[0]?.dateStr) {
      const sampleDate = previewData.journeyReport.events[0].dateStr;
      setSearchDate(sampleDate);
      setDateBasis("work_date");
    }

    setShowImportModal(false);
    setImportStep(1);
    setSelectedFile(null);
    setPreviewData(null);
    setCommittedBatch(null);

    loadDailyLogs();
  };

  const filteredLogs = logs.filter((l) => {
    if (selectedVehicle !== "all" && l.vehicleId !== selectedVehicle) return false;
    if (searchDate && !l.workDate.includes(searchDate)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <Navigation className="w-4 h-4" />
            </span>
            Nhật Ký Ngày & Đối Soát GPS Bình Minh
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý nhật ký vận hành, xem theo Ngày lịch hoặc Ngày công 04:00 - 04:00, đối soát Lệnh vs GPS và khoảng dừng
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chế độ xem Ngày lịch vs Ngày công */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setDateBasis("work_date")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition ${
                dateBasis === "work_date"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ngày công 04h-04h
            </button>
            <button
              onClick={() => setDateBasis("calendar")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition ${
                dateBasis === "calendar"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ngày báo cáo GPS
            </button>
          </div>

          {/* Lọc Xe */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
          >
            <option value="all">Tất cả xe</option>
            {SEED_VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNo} ({v.name})
              </option>
            ))}
          </select>

          {/* Lọc Ngày / Tháng */}
          <input
            type="text"
            placeholder="Lọc YYYY-MM hoặc YYYY-MM-DD"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white w-44 font-mono"
          />

          {/* Nút Xem Lịch Sử Import */}
          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Đợt nhập</span>
          </button>

          {/* Nút Nhập File GPS */}
          <button
            onClick={() => {
              setImportStep(1);
              setSelectedFile(null);
              setPreviewData(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Nhập File Excel GPS</span>
          </button>
        </div>
      </div>

      {/* 2. Danh Sách Nhật Ký Ngày */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>Danh Sách Nhật Ký Vận Hành ({filteredLogs.length} ngày)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-normal bg-emerald-100 text-emerald-800">
              {dateBasis === "work_date" ? "Chế độ: Ngày công (04:00 - 04:00)" : "Chế độ: Ngày lịch báo cáo GPS"}
            </span>
          </span>
          <span className="text-[11px] text-slate-500">
            Click vào dòng để mở chi tiết đối soát, dừng đỗ và mốc quan sát
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Ngày {dateBasis === "work_date" ? "Công (04h-04h)" : "Lịch GPS"}</th>
                <th className="p-3">Phương Tiện & Tài Xế</th>
                <th className="p-3">Nguồn Dữ Liệu</th>
                <th className="p-3 text-right">Km GPS / Kế Hoạch</th>
                <th className="p-3 text-center">Giờ Lăn Bánh</th>
                <th className="p-3 text-center">TG Hoạt Động / Báo Cáo</th>
                <th className="p-3 text-center">Số Lần Dừng</th>
                <th className="p-3 text-center">Tỷ Lệ Chạy</th>
                <th className="p-3 text-center">Trạng Thái</th>
                <th className="p-3 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Chưa có nhật ký nào cho phương tiện hoặc khoảng ngày này. Hãy bấm &quot;Nhập File Excel GPS&quot; để tải file dữ liệu Bình Minh.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-emerald-50/40 cursor-pointer transition"
                  >
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {log.workDate}
                    </td>

                    <td className="p-3">
                      <div className="font-mono font-bold text-emerald-800">{log.vehiclePlate}</div>
                      <span className="text-[11px] text-slate-500">{log.actualDriverName}</span>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {log.dataSource === "gps_binh_minh" ? "GPS Bình Minh" : "Nhập tay"}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {log.actualKm.toFixed(1)} km
                      {log.plannedKm > 0 && log.plannedKm !== log.actualKm && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          Lệnh: {log.plannedKm} km ({log.kmVariancePercent > 0 ? `+${log.kmVariancePercent}%` : `${log.kmVariancePercent}%`})
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center font-mono">
                      {log.actualMovingHours > 0 ? `${log.actualMovingHours} h` : "0 h"}
                    </td>

                    <td className="p-3 text-center font-mono text-slate-600">
                      {log.activityWindowHours > 0 ? `${log.activityWindowHours} h` : "0 h"}
                    </td>

                    <td className="p-3 text-center font-mono font-semibold">
                      {log.stopsCount} lần
                    </td>

                    <td className="p-3 text-center font-mono">
                      {log.movingRatioPercent > 0 ? `${log.movingRatioPercent}%` : "-"}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Đã khớp
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Drawer Chi Tiết Đối Soát Nhật Ký */}
      {selectedLog && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Chi Tiết Nhật Ký Ngày:</span>
                <span className="font-mono text-emerald-800 text-base">{selectedLog.workDate}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                  {selectedLog.vehiclePlate}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tài xế: <strong>{selectedLog.actualDriverName}</strong> | Quãng đường: <strong>{selectedLog.actualKm.toFixed(1)} km</strong> | Lăn bánh: <strong>{selectedLog.actualMovingHours} h</strong>
              </p>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
            >
              Đóng ngăn
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveDetailTab("reconcile")}
              className={`px-3 py-2 border-b-2 transition ${
                activeDetailTab === "reconcile"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Đối Soát 2 Lớp (Lệnh vs GPS)
            </button>
            <button
              onClick={() => setActiveDetailTab("stops")}
              className={`px-3 py-2 border-b-2 transition ${
                activeDetailTab === "stops"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Khoảng Dừng Đỗ ({selectedLog.stopsCount || selectedLog.stops.length})
            </button>
            <button
              onClick={() => setActiveDetailTab("engines")}
              className={`px-3 py-2 border-b-2 transition ${
                activeDetailTab === "engines"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Chặng Máy & Khung Giờ OT ({selectedLog.engineCycles.length})
            </button>
          </div>

          {/* Nội dung Tab 1: Đối soát 2 lớp */}
          {activeDetailTab === "reconcile" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                  1. Kế Hoạch Theo Lệnh Điều Xe
                </span>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Mã lệnh điều xe:</span>
                    <strong className="font-mono text-slate-900">{selectedLog.dispatchOrderCode || "Chưa gắn lệnh"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Km kế hoạch:</span>
                    <strong className="font-mono">{selectedLog.plannedKm} km</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tài xế chỉ định:</span>
                    <strong>{selectedLog.actualDriverName}</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                <span className="font-bold text-emerald-900 block text-xs uppercase tracking-wider">
                  2. Thực Tế Ghi Nhận Từ GPS Bình Minh
                </span>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Km GPS đo được:</span>
                    <strong className="font-mono text-emerald-900 text-sm">{selectedLog.actualKm.toFixed(1)} km</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời gian lăn bánh:</span>
                    <strong className="font-mono">{selectedLog.actualMovingHours} giờ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>TG làm việc theo GPS:</span>
                    <strong className="font-mono">{selectedLog.activityWindowHours} giờ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Số lần dừng đỗ:</span>
                    <strong className="font-mono">{selectedLog.stopsCount} lần</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nội dung Tab 2: Khoảng dừng */}
          {activeDetailTab === "stops" && (
            <div className="space-y-3 text-xs">
              {selectedLog.stops.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                  Số lượng dừng đỗ do nhà cung cấp báo: <strong>{selectedLog.stopsCount} lần</strong>. (Chi tiết danh sách điểm dừng tọa độ xem từ file Báo cáo hành trình).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5 text-center w-12">#</th>
                        <th className="p-2.5">Thời Gian</th>
                        <th className="p-2.5">Thời Lượng</th>
                        <th className="p-2.5">Địa Chỉ / Vị Trí Dừng</th>
                        <th className="p-2.5 text-center">Đánh Giá Máy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedLog.stops.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-bold font-mono text-slate-500">{s.stopNo}</td>
                          <td className="p-2.5 font-mono">{s.startTime} - {s.endTime}</td>
                          <td className="p-2.5 font-mono font-semibold">{s.durationMinutes} phút</td>
                          <td className="p-2.5 font-medium text-slate-800">{s.address}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 text-[10px]">
                              {s.engineStatusEvaluation}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Nội dung Tab 3: Chặng máy & Khung giờ OT */}
          {activeDetailTab === "engines" && (
            <div className="space-y-3 text-xs">
              {selectedLog.engineCycles.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                  Chưa có chi tiết chặng máy cho ngày này. Dữ liệu tổng hợp ghi nhận: TG lăn bánh: {selectedLog.actualMovingHours}h, TG làm việc GPS: {selectedLog.activityWindowHours}h.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedLog.engineCycles.map((eng, idx) => (
                    <div key={eng.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Chặng #{idx + 1}: {eng.distanceKm} km</span>
                        <span className="font-mono text-emerald-800">{eng.durationMinutes} phút</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        Từ: {eng.startTime} ➔ Đến: {eng.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Modal Nhập File Excel GPS Bình Minh Thật (Quy trình 3 bước chuẩn xác) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-700" />
                Nhập File Excel GPS Bình Minh Thực Tế
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Bước 1: Chọn hoặc Kéo Thả File Thật */}
            {importStep === 1 && (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-emerald-400 hover:border-emerald-600 rounded-xl bg-emerald-50/20 text-center space-y-3 cursor-pointer transition"
                >
                  <FileSpreadsheet className="w-10 h-10 text-emerald-700 mx-auto" />
                  <div className="text-sm font-bold text-slate-800">
                    Kéo thả file Excel xuất từ GPS Bình Minh (.xlsx) vào đây
                  </div>
                  <p className="text-xs text-slate-500">
                    Tự động nhận diện 2 mẫu: <strong>Báo cáo tổng hợp</strong> hoặc <strong>Báo cáo hành trình</strong>.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                      <FileSpreadsheet className="w-4 h-4" />
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                    >
                      Duyệt tìm file trên máy...
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 block">Hai mẫu chuẩn đã kiểm chứng:</span>
                  <p className="text-slate-600">
                    1. <code>Báo cáo tổng hợp - tháng 8- hino.xlsx</code> (Hino 51D-982.46, 31 ngày, 7.682,0 km, 844L dầu)<br />
                    2. <code>Báo cáo hành trình 51D69998 27.07.xlsx</code> (Isuzu 51D-699.98, 341 sự kiện, cắt ngày công 04h-04h)
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={!selectedFile || isUploading}
                    onClick={handleParseAndPreview}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                  >
                    {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Đọc và Kiểm Tra File</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bước 2: Xem Trước Dữ Liệu Thực Tế (Preview) */}
            {importStep === 2 && previewData && (
              <div className="space-y-4 text-xs">
                {/* Thông báo kết quả nhận diện */}
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Đã nhận dạng: {previewData.reportType === "summary" ? "Báo cáo tổng hợp (Ngày lịch)" : "Báo cáo hành trình (Chi tiết sự kiện)"}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      Xe: {previewData.identifiedVehicles?.join(", ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-200/60 font-mono text-[11px]">
                    <div>Tổng số dòng: <strong>{previewData.totalRows}</strong></div>
                    <div className="text-emerald-800">Dòng mới: <strong>+{previewData.newRows}</strong></div>
                    <div className="text-slate-600">Trùng lặp: <strong>{previewData.duplicateRows} (bỏ qua)</strong></div>
                    <div className="text-amber-700">Cập nhật: <strong>{previewData.updatedRows}</strong></div>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Kỳ dữ liệu: <strong>{previewData.periodRange}</strong>
                  </div>
                </div>

                {/* Cảnh báo đối soát dòng tổng nguồn (nếu có) */}
                {previewData.reconciliationWarnings?.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Lưu ý kiểm tra đối soát nguồn:
                    </div>
                    {previewData.reconciliationWarnings.map((w: string, idx: number) => (
                      <div key={idx} className="text-[11px] pl-5">• {w}</div>
                    ))}
                  </div>
                )}

                {/* Danh sách dòng xem trước */}
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    Xem trước mẫu dữ liệu ({previewData.previewItems?.length} dòng):
                  </span>
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2">Thời Gian</th>
                          <th className="p-2">Phương Tiện</th>
                          <th className="p-2">Trạng Thái</th>
                          <th className="p-2">Nội Dung Chi Tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {previewData.previewItems?.slice(0, 31).map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono">{item.dateOrTime}</td>
                            <td className="p-2 font-mono font-bold text-emerald-800">{item.vehiclePlate}</td>
                            <td className="p-2">
                              {item.status === "new" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Mới
                                </span>
                              )}
                              {item.status === "duplicate" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  Trùng lặp
                                </span>
                              )}
                              {item.status === "updated" && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Cập nhật
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-slate-600">{item.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                  >
                    Chọn file khác
                  </button>
                  <button
                    disabled={isUploading}
                    onClick={handleConfirmImport}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                  >
                    {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Xác Nhận Nhập Dữ Liệu</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bước 3: Kết Quả Nhập Bền Vững */}
            {importStep === 3 && committedBatch && (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900">
                    Nhập Dữ Liệu GPS Thành Công!
                  </h4>
                  <p className="text-xs text-slate-500">
                    Đã lưu trữ bền vững đợt nhập mã <code>{committedBatch.id.slice(0, 8)}</code> cho phương tiện <strong>{committedBatch.vehiclePlate}</strong>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Tổng số dòng xử lý:</span>
                    <strong>{committedBatch.stats.totalRows}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Thêm mới thành công:</span>
                    <strong>+{committedBatch.stats.newRows} dòng</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Bỏ qua do trùng lặp:</span>
                    <strong>{committedBatch.stats.duplicateRows} dòng</strong>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Cập nhật số liệu:</span>
                    <strong>{committedBatch.stats.updatedRows} dòng</strong>
                  </div>
                </div>

                <button
                  onClick={handleFinishAndNavigate}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                >
                  Xem Dữ Liệu Vừa Nhập Trên Nhật Ký
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Modal Lịch Sử Đợt Nhập (History Modal) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-700" />
                Lịch Sử Các Đợt Nhập GPS Bình Minh
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {batchHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Chưa có đợt nhập GPS nào được lưu trong hệ thống.
              </div>
            ) : (
              <div className="space-y-3">
                {batchHistory.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="font-mono text-emerald-800">{b.vehiclePlate}</span>
                      <span className="text-[10px] text-slate-500">{new Date(b.committedAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      File: <strong>{b.fileName}</strong> | Loại: <strong>{b.reportType === "summary" ? "Tổng hợp" : "Hành trình"}</strong>
                    </div>
                    <div className="flex gap-3 text-[11px] font-mono pt-1 border-t border-slate-200 text-slate-700">
                      <span>Mới: <strong className="text-emerald-700">+{b.stats?.newRows || 0}</strong></span>
                      <span>Trùng: <strong>{b.stats?.duplicateRows || 0}</strong></span>
                      <span>Cập nhật: <strong className="text-amber-700">{b.stats?.updatedRows || 0}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
