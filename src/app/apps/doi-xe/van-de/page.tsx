"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  User,
  Truck,
  ArrowRight,
  ShieldAlert,
  FileText,
  DollarSign,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  SEED_ISSUES,
  SEED_VEHICLES,
  SEED_DRIVERS,
  VehicleIncidentIssue,
} from "@/services/fleet-app.service";
import { toast } from "@/components/ui";

export default function FleetIssuesPage() {
  const [issues, setIssues] = React.useState<VehicleIncidentIssue[]>(SEED_ISSUES);
  const [severityFilter, setSeverityFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedIssue, setSelectedIssue] = React.useState<VehicleIncidentIssue | null>(null);

  // Modal tạo sự cố mới
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newIssue, setNewIssue] = React.useState({
    vehicleId: "veh-01",
    issueType: "traffic_penalty" as VehicleIncidentIssue["issueType"],
    severity: "medium" as VehicleIncidentIssue["severity"],
    description: "",
    driverId: "drv-01",
  });

  // Action trong Drawer
  const [explanationText, setExplanationText] = React.useState("");
  const [managerDecision, setManagerDecision] = React.useState<VehicleIncidentIssue["managerDecision"]>("written_warning");
  const [rootCauseText, setRootCauseText] = React.useState("");
  const [actionTakenText, setActionTakenText] = React.useState("");

  const filteredIssues = issues.filter((i) => {
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    return true;
  });

  const openCount = issues.filter((i) => i.status !== "closed").length;
  const highCount = issues.filter((i) => i.severity === "high" && i.status !== "closed").length;

  const handleSelectIssue = (issue: VehicleIncidentIssue) => {
    setSelectedIssue(issue);
    setExplanationText(issue.explanation || "");
    setManagerDecision(issue.managerDecision || "written_warning");
    setRootCauseText(issue.rootCause || "");
    setActionTakenText(issue.actionTaken || "");
  };

  const handleSaveAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = SEED_VEHICLES.find((v) => v.id === newIssue.vehicleId) || SEED_VEHICLES[0];
    const drv = SEED_DRIVERS.find((d) => d.id === newIssue.driverId) || SEED_DRIVERS[0];

    const created: VehicleIncidentIssue = {
      id: `iss-${Date.now()}`,
      issueCode: `VD-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Date.now().toString().slice(-2)}`,
      occurredDate: new Date().toISOString().slice(0, 10),
      detectedDate: new Date().toISOString().slice(0, 10),
      vehicleId: veh.id,
      vehiclePlate: veh.plateNo,
      driverId: drv.id,
      driverName: drv.name,
      issueType: newIssue.issueType,
      severity: newIssue.severity,
      source: "manual_reported",
      description: newIssue.description || "Ghi nhận sự cố vi phạm vận hành",
      status: "new",
      assignedTo: "Admin Đội xe",
      dueDate: new Date(Date.now() + (newIssue.severity === "high" ? 1 : newIssue.severity === "medium" ? 3 : 7) * 86400000)
        .toISOString()
        .slice(0, 10),
      isRecurring: false,
      createdAt: new Date().toISOString(),
    };

    setIssues([created, ...issues]);
    setShowAddModal(false);
    toast.success(`Đã mở hồ sơ vấn đề ${created.issueCode}`);
  };

  // Cập nhật giải trình
  const handleSaveExplanation = () => {
    if (!selectedIssue) return;
    setIssues((prev) =>
      prev.map((i) =>
        i.id === selectedIssue.id
          ? { ...i, explanation: explanationText, status: "pending_decision" }
          : i
      )
    );
    setSelectedIssue({ ...selectedIssue, explanation: explanationText, status: "pending_decision" });
    toast.success("Đã ghi nhận bản giải trình của tài xế / admin!");
  };

  // Ra quyết định xử lý
  const handleSaveDecision = () => {
    if (!selectedIssue) return;
    setIssues((prev) =>
      prev.map((i) =>
        i.id === selectedIssue.id
          ? {
              ...i,
              managerDecision: managerDecision,
              rootCause: rootCauseText,
              actionTaken: actionTakenText,
              status: "in_progress",
            }
          : i
      )
    );
    setSelectedIssue({
      ...selectedIssue,
      managerDecision: managerDecision,
      rootCause: rootCauseText,
      actionTaken: actionTakenText,
      status: "in_progress",
    });
    toast.success("Quản lý đã ban hành quyết định xử lý vấn đề!");
  };

  // Đóng hồ sơ
  const handleCloseIssue = () => {
    if (!selectedIssue) return;
    setIssues((prev) =>
      prev.map((i) => (i.id === selectedIssue.id ? { ...i, status: "closed", closedAt: new Date().toISOString() } : i))
    );
    setSelectedIssue({ ...selectedIssue, status: "closed", closedAt: new Date().toISOString() });
    toast.success(`Đã đóng hồ sơ vấn đề ${selectedIssue.issueCode}!`);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs">
              <AlertTriangle className="w-4 h-4" />
            </span>
            Sổ Sự Cố, Vi Phạm & Vấn Đề Vận Hành
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hợp nhất ngoại lệ tự sinh từ GPS và sự cố nhập tay, quy trình 5 bước và cảnh báo sự cố lặp lại 3 lần/90 ngày
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
          >
            <option value="all">Mọi mức độ ({issues.length})</option>
            <option value="high">Mức Nặng (1 ngày)</option>
            <option value="medium">Mức Trung Bình (3 ngày)</option>
            <option value="low">Mức Nhẹ (7 ngày)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="new">Mới</option>
            <option value="pending_explanation">Chờ giải trình</option>
            <option value="pending_decision">Chờ quyết định</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="closed">Đã đóng</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ghi Nhận Sự Cố</span>
          </button>
        </div>
      </div>

      {/* 2. Dải Thông Báo Nóng */}
      {highCount > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>
              Có {highCount} vấn đề mức NẶNG cần giải quyết gấp trong ngày (Hạn xử lý 24 giờ).
            </span>
          </div>
          <span className="text-[11px] text-rose-700 font-mono">Ưu tiên Quản lý & Admin</span>
        </div>
      )}

      {/* 3. Bảng Danh Sách Vấn Đề */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">
            Danh Sách Vấn Đề & Ngoại Lệ Đang Theo Dõi ({filteredIssues.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Click vào dòng để mở ngăn xử lý giải trình, quyết định quản lý và đóng hồ sơ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Mã Vấn Đề</th>
                <th className="p-3">Ngày Xảy Ra / Phát Hiện</th>
                <th className="p-3">Phương Tiện & Tài Xế</th>
                <th className="p-3">Mô Tả Sự Việc & Ngoại Lệ</th>
                <th className="p-3 text-center">Mức Độ</th>
                <th className="p-3 text-center">Nguồn Phát Hiện</th>
                <th className="p-3 text-center">Hạn Xử Lý</th>
                <th className="p-3 text-center">Trạng Thái</th>
                <th className="p-3 text-center">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredIssues.map((iss) => {
                const isSelected = selectedIssue?.id === iss.id;

                return (
                  <tr
                    key={iss.id}
                    onClick={() => handleSelectIssue(iss)}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-emerald-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{iss.issueCode}</span>
                        {iss.isRecurring && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                            TÁI DIỄN
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      {iss.occurredDate.split("-").reverse().join("/")}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono font-bold text-[10px]">
                          {iss.vehiclePlate}
                        </span>
                        <span className="font-semibold text-slate-800">{iss.driverName || "Chưa gán"}</span>
                      </div>
                    </td>

                    <td className="p-3 max-w-[280px]">
                      <div className="font-semibold text-slate-900 truncate" title={iss.description}>
                        {iss.description}
                      </div>
                      {iss.explanation && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                          Giải trình: {iss.explanation}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          iss.severity === "high"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : iss.severity === "medium"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {iss.severity === "high" ? "Nặng" : iss.severity === "medium" ? "Trung bình" : "Nhẹ"}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="text-[10px] text-slate-600">
                        {iss.source === "auto_detected_gps"
                          ? "GPS tự động"
                          : iss.source === "auto_detected_log"
                          ? "Đối soát nhật ký"
                          : iss.source === "auto_detected_schedule"
                          ? "Lịch xe"
                          : "Nhập tay"}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-[11px] text-slate-700">
                      {iss.dueDate.split("-").reverse().join("/")}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          iss.status === "closed"
                            ? "bg-emerald-100 text-emerald-800"
                            : iss.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : iss.status === "pending_decision"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {iss.status === "closed"
                          ? "Đã đóng"
                          : iss.status === "in_progress"
                          ? "Đang xử lý"
                          : iss.status === "pending_decision"
                          ? "Chờ duyệt"
                          : iss.status === "pending_explanation"
                          ? "Chờ giải trình"
                          : "Mới"}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectIssue(iss);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-emerald-700 hover:text-white transition"
                      >
                        Xử lý
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Ngăn Chi Tiết Xử Lý Vấn Đề (Khi chọn 1 dòng) */}
      {selectedIssue && (
        <div className="bg-white rounded-xl border-2 border-emerald-500/40 p-5 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedIssue.issueCode}</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    selectedIssue.severity === "high" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  Mức: {selectedIssue.severity.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500">• Xe: {selectedIssue.vehiclePlate}</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-1">{selectedIssue.description}</p>
            </div>

            <div className="flex items-center gap-2">
              {selectedIssue.status !== "closed" && (
                <button
                  onClick={handleCloseIssue}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Đóng Hồ Sơ Vấn Đề</span>
                </button>
              )}
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Cột Trái: Giải trình */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 uppercase block tracking-wider text-[11px]">
                1. Giải Trình Của Tài Xế / Admin Xe
              </span>

              <textarea
                rows={3}
                placeholder="Nhập nội dung giải trình căn cứ vận hành..."
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white"
              />

              <button
                onClick={handleSaveExplanation}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px]"
              >
                Cập Nhật Giải Trình
              </button>
            </div>

            {/* Cột Phải: Quyết định của Quản lý */}
            <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-200 space-y-3">
              <span className="font-bold text-emerald-900 uppercase block tracking-wider text-[11px]">
                2. Quyết Định & Kết Luận Của Quản Lý
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Hình Thức Xử Lý
                </label>
                <select
                  value={managerDecision}
                  onChange={(e) => setManagerDecision(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="accepted_explanation">Chấp nhận giải trình (Hợp lệ)</option>
                  <option value="written_warning">Nhắc nhở văn bản tài xế</option>
                  <option value="vehicle_repair_required">Yêu cầu đưa xe đi sửa chữa / hiệu chỉnh</option>
                  <option value="adjust_dispatch">Điều chỉnh kế hoạch điều phối xe</option>
                  <option value="penalty_driver_responsible">Xác định trách nhiệm chi phí tài xế</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nguyên Nhân Gốc (Bắt buộc nếu sự cố lặp lại)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thiếu trạm dừng chân có máy lạnh trên cung đường"
                  value={rootCauseText}
                  onChange={(e) => setRootCauseText(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Hành Động Khắc Phục
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đưa vào quy định dừng nghỉ và nhắc nhở toàn đội"
                  value={actionTakenText}
                  onChange={(e) => setActionTakenText(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <button
                onClick={handleSaveDecision}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] shadow-xs"
              >
                Ban Hành Quyết Định
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Tạo Sự Cố Nhập Tay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-emerald-700" />
                Ghi Nhận Sự Cố / Vi Phạm Vận Hành
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddIssue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phương Tiện *</label>
                <select
                  value={newIssue.vehicleId}
                  onChange={(e) => setNewIssue({ ...newIssue, vehicleId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {SEED_VEHICLES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNo} ({v.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại Sự Việc</label>
                  <select
                    value={newIssue.issueType}
                    onChange={(e) => setNewIssue({ ...newIssue, issueType: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="traffic_penalty">Phạt nguội / CSGT</option>
                    <option value="tyre_puncture">Nổ lốp / Hư hỏng lốp</option>
                    <option value="accident_damage">Va quẹt / Tai nạn</option>
                    <option value="long_idle_engine">Dừng lâu không tắt máy</option>
                    <option value="fuel_refill_anomaly">Lệch nhiên liệu nạp</option>
                    <option value="unauthorized_trip">Chạy ngoài lệnh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mức Độ Nghiêm Trọng</label>
                  <select
                    value={newIssue.severity}
                    onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="high">Nặng (Hạn 1 ngày)</option>
                    <option value="medium">Trung bình (Hạn 3 ngày)</option>
                    <option value="low">Nhẹ (Hạn 7 ngày)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô Tả Chi Tiết *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ghi rõ địa điểm, diễn biến sự việc..."
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  Lưu Vấn Đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
