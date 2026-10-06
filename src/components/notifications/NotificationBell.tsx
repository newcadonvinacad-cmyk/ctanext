"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRealtimeNotifications, RealtimeNotification } from "@/contexts/realtime-notification-context";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  HardHat,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Volume2,
  X,
  Smartphone,
} from "lucide-react";

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    requestNotificationPermission,
    notificationPermission,
  } = useRealtimeNotifications();

  const [isOpen, setIsOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Đóng khi click ngoài
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredList = React.useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const handleNotificationClick = async (notif: RealtimeNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderKanban className="w-4 h-4 text-blue-600" />;
      case "task":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "field":
        return <HardHat className="w-4 h-4 text-amber-600" />;
      case "approval":
        return <CheckCheck className="w-4 h-4 text-indigo-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return "Vừa xong";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return new Date(isoString).toLocaleDateString("vi-VN");
    } catch {
      return "";
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Nút quả chuông TopBar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative p-1.5 rounded-lg border text-slate-600 hover:text-slate-900 transition shadow-2xs",
          isOpen
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-slate-200 hover:border-slate-300 bg-white"
        )}
        title="Thông báo Realtime"
        aria-label="Thông báo"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Danh sách Thông báo Realtime */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/5">
          {/* Header Popover */}
          <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Thông Báo</span>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  {unreadCount} chưa đọc
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-medium text-[10px]">
                  Tất cả
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-tabs Lọc: Tất cả vs Chưa đọc */}
          <div className="flex border-b border-slate-100 px-3.5 pt-2 gap-4 text-xs font-medium bg-white">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "pb-2 border-b-2 transition text-xs",
                filter === "all"
                  ? "border-slate-900 text-slate-900 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "pb-2 border-b-2 transition text-xs",
                filter === "unread"
                  ? "border-slate-900 text-slate-900 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="font-semibold text-slate-700 text-xs">Bạn đã xem hết thông báo!</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Hệ thống sẽ tự động cập nhật khi có sự cố, phê duyệt hoặc cập nhật dự án mới.
                </p>
              </div>
            ) : (
              filteredList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "p-3 flex items-start gap-2.5 cursor-pointer transition hover:bg-slate-50",
                    !notif.isRead && "bg-blue-50/40"
                  )}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn("truncate font-semibold text-slate-900", !notif.isRead && "text-blue-950 font-bold")}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-2 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Banner thông báo đẩy thu gọn dưới đáy nếu chưa cấp quyền */}
          {notificationPermission !== "granted" && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Nhận thông báo khi đóng trình duyệt</span>
              </div>
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-medium text-[10px] hover:bg-slate-800 transition"
              >
                Kích hoạt
              </button>
            </div>
          )}

          {/* Footer Popover */}
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đồng bộ thời gian thực</span>
            </span>
            <button
              type="button"
              onClick={() => refreshNotifications()}
              className="text-slate-500 hover:text-slate-900 hover:underline font-medium"
            >
              Làm mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
