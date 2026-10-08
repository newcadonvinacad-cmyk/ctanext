"use client";

import React, { useState } from "react";
import {
  CalendarOff,
  Clock,
  FileQuestion,
  Camera,
  AlertCircle,
  X,
} from "lucide-react";
import { Modal, Button, toast } from "@/components/ui";

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 p-2 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400";

export function EmployeeSelfServiceModals() {
  // Modal 1: Xin nghỉ phép
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<"annual_paid" | "unpaid" | "sick" | "special">("annual_paid");
  const [leaveTitle, setLeaveTitle] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveDurationDays, setLeaveDurationDays] = useState(1);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Modal 2: Xin làm thêm giờ (OT)
  const [isOtOpen, setIsOtOpen] = useState(false);
  const [otTitle, setOtTitle] = useState("");
  const [otDate, setOtDate] = useState(new Date().toISOString().split("T")[0]);
  const [otStartTime, setOtStartTime] = useState("18:00");
  const [otEndTime, setOtEndTime] = useState("21:00");
  const [otHours, setOtHours] = useState(3.0);
  const [otReason, setOtReason] = useState("");
  const [submittingOt, setSubmittingOt] = useState(false);

  // Modal 3: Giải trình công (kèm ảnh bằng chứng)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expReason, setExpReason] = useState("");
  const [expImageUrl, setExpImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingExp, setSubmittingExp] = useState(false);

  // Handlers
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error("Vui lòng nhập lý do xin nghỉ");
      return;
    }
    setSubmittingLeave(true);
    try {
      const res = await fetch("/api/hrm/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leave",
          title: leaveTitle.trim() || `Đơn xin nghỉ phép (${leaveStartDate})`,
          reason: leaveReason.trim(),
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          durationHours: Number(leaveDurationDays) * 8,
          leaveCategory: leaveType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi đơn thất bại");
      toast.success("Đã gửi đơn xin nghỉ phép. Chờ cấp trên phê duyệt.");
      setIsLeaveOpen(false);
      setLeaveReason("");
      setLeaveTitle("");
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi đơn nghỉ phép");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleSubmitOt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otReason.trim()) {
      toast.error("Vui lòng nhập nội dung công việc làm thêm (OT)");
      return;
    }
    setSubmittingOt(true);
    try {
      const res = await fetch("/api/hrm/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "overtime",
          title: otTitle.trim() || `Đơn đăng ký làm thêm giờ (${otDate})`,
          reason: otReason.trim(),
          startDate: otDate,
          endDate: otDate,
          startTime: otStartTime,
          endTime: otEndTime,
          durationHours: Number(otHours) || 2.0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi đơn OT thất bại");
      toast.success("Đã gửi đơn đăng ký OT. Khi được duyệt sẽ tự động cộng vào bảng lương.");
      setIsOtOpen(false);
      setOtReason("");
      setOtTitle("");
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi đơn OT");
    } finally {
      setSubmittingOt(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    // Convert to Base64 data URL for instant demonstration and storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setExpImageUrl(reader.result as string);
      setUploadingImage(false);
      toast.success("Đã đính kèm ảnh minh chứng.");
    };
    reader.onerror = () => {
      toast.error("Lỗi đọc file ảnh");
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expReason.trim()) {
      toast.error("Vui lòng nhập lý do giải trình (đi muộn / về sớm / quên chấm công)");
      return;
    }
    setSubmittingExp(true);
    try {
      const res = await fetch("/api/hrm/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "explanation",
          title: expTitle.trim() || `Giải trình công ngày ${expDate}`,
          reason: expReason.trim(),
          startDate: expDate,
          endDate: expDate,
          imageUrl: expImageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi giải trình thất bại");
      toast.success("Đã gửi giải trình. Khi được duyệt sẽ được miễn trừ phạt chấm công.");
      setIsExplanationOpen(false);
      setExpReason("");
      setExpTitle("");
      setExpImageUrl("");
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi giải trình");
    } finally {
      setSubmittingExp(false);
    }
  };

  return (
    <>
      {/* 3 nút tiện ích hành chính */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="min-w-0">
          <span className="font-bold text-slate-900 text-xs block">Tiện ích hành chính</span>
          <span className="text-[11px] text-slate-500">Gửi đơn nhanh • Tự động liên kết tính lương & trừ quỹ phép</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLeaveOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5"
          >
            <CalendarOff className="w-3.5 h-3.5" />
            <span>Xin nghỉ phép</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOtOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Làm thêm (OT)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExplanationOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5"
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Giải trình công</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: XIN NGHỈ PHÉP */}
      <Modal
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        maxWidth="xl"
        title="Đơn xin nghỉ phép"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Đơn được duyệt sẽ <strong>tự động trừ vào quỹ ngày phép năm</strong> hoặc tính nghỉ không lương theo chính sách.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loại nghỉ phép *</label>
              <select
                value={leaveType}
                onChange={(e: any) => setLeaveType(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="annual_paid">Nghỉ phép năm (hưởng nguyên lương)</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="sick">Nghỉ ốm đau / khám bệnh</option>
                <option value="special">Nghỉ chế độ đặc biệt (cưới hỏi / tang)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số ngày nghỉ *</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={leaveDurationDays}
                onChange={(e) => setLeaveDurationDays(parseFloat(e.target.value) || 1)}
                className={`${INPUT_CLASS} font-mono font-bold`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Từ ngày *</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Đến ngày *</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tiêu đề đơn (tùy chọn)</label>
            <input
              type="text"
              value={leaveTitle}
              onChange={(e) => setLeaveTitle(e.target.value)}
              placeholder="VD: Xin nghỉ phép giải quyết việc gia đình"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Lý do nghỉ *</label>
            <textarea
              rows={3}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Nhập lý do và kế hoạch bàn giao công việc tạm thời..."
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsLeaveOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submittingLeave}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {submittingLeave ? "Đang gửi..." : "Gửi đơn"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: LÀM THÊM GIỜ (OT) */}
      <Modal
        isOpen={isOtOpen}
        onClose={() => setIsOtOpen(false)}
        maxWidth="xl"
        title="Đăng ký làm thêm giờ (OT)"
      >
        <form onSubmit={handleSubmitOt} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Giờ OT được duyệt sẽ <strong>tự động cộng vào bảng lương</strong> theo hệ số (150% ngày thường, 200% Chủ nhật, 300% ngày lễ).
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày làm thêm *</label>
              <input
                type="date"
                value={otDate}
                onChange={(e) => setOtDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số giờ OT ước tính *</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={otHours}
                onChange={(e) => setOtHours(parseFloat(e.target.value) || 1)}
                className={`${INPUT_CLASS} font-mono font-bold`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                value={otStartTime}
                onChange={(e) => setOtStartTime(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giờ kết thúc dự kiến</label>
              <input
                type="time"
                value={otEndTime}
                onChange={(e) => setOtEndTime(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dự án / hạng mục</label>
            <input
              type="text"
              value={otTitle}
              onChange={(e) => setOtTitle(e.target.value)}
              placeholder="VD: Gia công gấp biển hiệu đại lý Thành Phát"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nội dung công việc *</label>
            <textarea
              rows={3}
              value={otReason}
              onChange={(e) => setOtReason(e.target.value)}
              placeholder="Mô tả công việc cần xử lý gấp ngoài giờ, xưởng hoặc công trình..."
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsOtOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submittingOt}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {submittingOt ? "Đang gửi..." : "Gửi đơn"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: GIẢI TRÌNH CÔNG */}
      <Modal
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
        maxWidth="xl"
        title="Giải trình chấm công"
      >
        <form onSubmit={handleSubmitExplanation} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Áp dụng khi đi muộn, quên check-in/out hoặc lỗi GPS. Khi được duyệt, <strong>hệ thống sẽ miễn trừ phạt chấm công</strong> tương ứng.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày cần giải trình *</label>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vấn đề phát sinh *</label>
              <select
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="Đi muộn do sự cố giao thông/thời tiết">Đi muộn do sự cố giao thông / thời tiết</option>
                <option value="Quên check-in buổi sáng">Quên check-in buổi sáng</option>
                <option value="Quên check-out khi ra về">Quên check-out khi ra về</option>
                <option value="Đi công tác đột xuất tại hiện trường">Đi công tác đột xuất tại hiện trường</option>
                <option value="Lỗi thiết bị / mất kết nối GPS">Lỗi thiết bị / mất kết nối GPS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nội dung giải trình *</label>
            <textarea
              rows={3}
              value={expReason}
              onChange={(e) => setExpReason(e.target.value)}
              placeholder="Trình bày diễn biến sự việc, giờ giấc thực tế có mặt tại xưởng/công trình..."
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* Ảnh minh chứng */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ảnh minh chứng</label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-center gap-2">
              {expImageUrl ? (
                <div className="relative w-full max-h-48 overflow-hidden rounded-lg border border-slate-200 flex items-center justify-center bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={expImageUrl} alt="Bằng chứng giải trình" className="max-h-48 object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setExpImageUrl("")}
                    className="absolute top-2 right-2 p-1 bg-slate-900 text-white rounded-full hover:bg-slate-700 shadow-xs"
                    title="Xóa ảnh"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 cursor-pointer py-3 w-full">
                  <div className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 shadow-2xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-slate-700 text-xs">
                    {uploadingImage ? "Đang xử lý ảnh..." : "Chụp ảnh hoặc tải ảnh lên"}
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsExplanationOpen(false)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submittingExp}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {submittingExp ? "Đang gửi..." : "Gửi giải trình"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
