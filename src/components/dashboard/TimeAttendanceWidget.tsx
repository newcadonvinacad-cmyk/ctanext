"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  MapPin,
  Play,
  Square,
  CheckCircle2,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui";

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

export function TimeAttendanceWidget() {
  const [data, setData] = useState<AttendanceToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

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

  const handleToggleAttendance = async (type: "check_in" | "check_out") => {
    setActing(true);
    let coords: { lat?: number; lon?: number; acc?: number } = {};

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        };
      } catch {
        // Fallback desk
      }
    }

    try {
      const res = await fetch("/api/hrm/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          source: "desk",
          latitude: coords.lat,
          longitude: coords.lon,
          accuracyM: coords.acc || 10,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Thao tác thất bại");
      }

      toast.success(
        type === "check_in"
          ? "Đã Check-in thành công! Chúc bạn ngày làm việc hiệu quả."
          : "Đã Check-out hoàn tất ca làm việc."
      );
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
      {/* 1. Trạng thái ca làm việc & nhân sự */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
          <Clock className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">Chấm Công Bàn Làm Việc</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">
              {data?.currentShiftName || "Ca Hành Chính (08:00 - 17:30)"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              Văn phòng & Xưởng
            </span>
            <span>•</span>
            <span>
              Công tháng này: <strong className="text-slate-800">{data?.monthStats?.workDays || 0} / {data?.monthStats?.targetDays || 26}</strong> ngày
            </span>
            {data?.monthStats?.otHours ? (
              <>
                <span>•</span>
                <span>
                  Tăng ca: <strong className="text-blue-600">{data.monthStats.otHours}h</strong>
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Bộ đếm giờ & Nút hành động Check-in/out */}
      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
        {data?.isCheckedIn && !data?.isCheckedOut ? (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium">Đang làm:</span>
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
            onClick={() => handleToggleAttendance("check_in")}
            disabled={acting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Check-in</span>
          </button>
        ) : !data?.isCheckedOut ? (
          <button
            onClick={() => handleToggleAttendance("check_out")}
            disabled={acting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Check-out</span>
          </button>
        ) : (
          <button
            onClick={() => handleToggleAttendance("check_in")}
            disabled={acting}
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>Tăng Ca (OT)</span>
          </button>
        )}
      </div>
    </div>
  );
}
