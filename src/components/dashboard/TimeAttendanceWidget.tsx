"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  MapPin,
  Play,
  Square,
  CheckCircle2,
  LogIn,
  LogOut,
} from "lucide-react";
import { toast, Modal, Button } from "@/components/ui";

interface AttendanceToday {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  durationSeconds: number;
  currentShiftName: string;
  isLate: boolean;
  monthStats: {
    workDays: number;
    targetDays: number;
    otHours: number;
    leavesRemaining: number;
  };
}

function formatHM(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatHMS(date: Date): string {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h <= 0) return `${m} phút`;
  return `${h} giờ ${String(m).padStart(2, "0")} phút`;
}

export function TimeAttendanceWidget() {
  const [data, setData] = useState<AttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [confirmType, setConfirmType] = useState<"check_in" | "check_out" | null>(null);
  const [confirmTime, setConfirmTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hrm/attendance/today");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.isCheckedIn && !json.isCheckedOut) {
          setTimerSeconds(json.durationSeconds || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const openConfirm = (type: "check_in" | "check_out") => {
    setConfirmTime(new Date());
    setConfirmType(type);
  };

  const handleConfirmAttendance = async () => {
    if (!confirmType) return;
    const type = confirmType;
    setConfirmType(null);
    setActing(true);
    let coords: { lat?: number; lon?: number; acc?: number } = {};

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });
        coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        };
      } catch (geoErr: any) {
        console.warn("Lỗi hoặc người dùng từ chối quyền định vị GPS:", geoErr);
        if (geoErr.code === 1) {
          toast.warning("Bạn đã từ chối quyền GPS. Chấm công được ghi nhận với tọa độ mặc định.");
        }
      }
    }

    try {
      const res = await fetch("/api/hrm/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          source: coords.lat ? "field" : "desk",
          latitude: coords.lat,
          longitude: coords.lon,
          accuracyM: coords.acc || 10,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Thao tác thất bại");
      }

      const at = result.timestamp ? formatHM(result.timestamp) : formatHM(new Date().toISOString());

      if (type === "check_in") {
        // So với mốc 08:15 để báo đúng giờ / muộn ngay trong thông báo
        const now = result.timestamp ? new Date(result.timestamp) : new Date();
        const limit = new Date(now);
        limit.setHours(8, 15, 0, 0);
        const lateMin = Math.max(0, Math.round((now.getTime() - limit.getTime()) / 60000));
        toast.success(
          lateMin > 0
            ? `Đã check-in lúc ${at} (muộn ${lateMin} phút). Chúc bạn ngày làm việc hiệu quả.`
            : `Đã check-in lúc ${at} (đúng giờ). Chúc bạn ngày làm việc hiệu quả.`
        );
      } else {
        const worked = data?.checkInTime
          ? Math.max(0, Math.round((new Date(result.timestamp || Date.now()).getTime() - new Date(data.checkInTime).getTime()) / 1000))
          : 0;
        toast.success(
          `Đã check-out lúc ${at}${worked > 0 ? ` • Tổng thời gian: ${formatDuration(worked)}` : ""}.`
        );
      }
      await fetchStatus();
    } catch (e: any) {
      toast.error(e.message || "Lỗi ghi nhận điểm danh");
    } finally {
      setActing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isWorking = data?.isCheckedIn && !data?.isCheckedOut;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        {/* 1. Trạng thái ca làm việc & nhân sự */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">Chấm công</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">
                {data?.currentShiftName || "Ca hành chính (08:00 - 17:30)"}
              </span>
            </div>
            <div className="flex items-center gap-x-3 gap-y-0.5 text-slate-500 text-[11px] mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Văn phòng & Xưởng
              </span>
              <span className="tabular-nums">
                Công tháng: <strong className="text-slate-800">{data?.monthStats?.workDays || 0}/{data?.monthStats?.targetDays || 26}</strong> ngày
              </span>
              {data?.isCheckedIn && (
                <span className="tabular-nums flex items-center gap-1">
                  <LogIn className="w-3 h-3 text-emerald-600" />
                  Vào: <strong className="text-slate-800">{formatHM(data.checkInTime)}</strong>
                </span>
              )}
              {data?.isCheckedOut && (
                <span className="tabular-nums flex items-center gap-1">
                  <LogOut className="w-3 h-3 text-slate-500" />
                  Ra: <strong className="text-slate-800">{formatHM(data.checkOutTime)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Bộ đếm giờ & Nút hành động Check-in/out */}
        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
          {isWorking ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-xs">{formatTimer(timerSeconds)}</span>
            </div>
          ) : data?.isCheckedOut ? (
            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold">Đã hoàn thành ca</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Chưa bắt đầu ca hôm nay
            </div>
          )}

          {!data?.isCheckedIn ? (
            <button
              onClick={() => openConfirm("check_in")}
              disabled={acting || loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{acting ? "Đang xử lý..." : "Check-in"}</span>
            </button>
          ) : !data?.isCheckedOut ? (
            <button
              onClick={() => openConfirm("check_out")}
              disabled={acting || loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>{acting ? "Đang xử lý..." : "Check-out"}</span>
            </button>
          ) : (
            <button
              onClick={() => openConfirm("check_in")}
              disabled={acting || loading}
              className="px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>Tăng ca (OT)</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal xác nhận check-in / check-out */}
      <Modal
        isOpen={confirmType !== null}
        onClose={() => setConfirmType(null)}
        maxWidth="sm"
        title={confirmType === "check_in" ? "Xác nhận check-in" : "Xác nhận check-out"}
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-center">
            <div className="text-[11px] text-slate-500">
              {confirmType === "check_in" ? "Giờ check-in dự kiến" : "Giờ check-out dự kiến"}
            </div>
            <div className="font-mono font-bold text-2xl text-slate-900 tabular-nums mt-0.5">
              {confirmTime ? formatHMS(confirmTime) : "--:--:--"}
            </div>
            {confirmType === "check_out" && data?.checkInTime && (
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                Đã vào lúc <strong className="text-slate-800">{formatHM(data.checkInTime)}</strong>
                {confirmTime && (
                  <>
                    {" "}• Làm được{" "}
                    <strong className="text-slate-800">
                      {formatDuration(
                        Math.max(0, Math.round((confirmTime.getTime() - new Date(data.checkInTime).getTime()) / 1000))
                      )}
                    </strong>
                  </>
                )}
              </div>
            )}
            {confirmType === "check_in" && (
              <div className="text-[11px] text-slate-500 mt-1">
                {data?.currentShiftName || "Ca hành chính (08:00 - 17:30)"} • GPS sẽ được ghi nhận cùng lúc
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setConfirmType(null)} className="text-xs">
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAttendance}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {confirmType === "check_in" ? "Xác nhận check-in" : "Xác nhận check-out"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
