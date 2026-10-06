"use client";

import * as React from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useAuthorization } from "@/hooks/use-authorization";
import { toast } from "@/components/ui";

export interface RealtimeNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "task" | "project" | "approval" | "field";
  link?: string | null;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string | null;
}

interface NotificationContextValue {
  notifications: RealtimeNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  notificationPermission: NotificationPermission;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (err) {
  }
}

export function RealtimeNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthorization();
  const [notifications, setNotifications] = React.useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission>("default");

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === "granted") {
          toast.success("Đã bật thông báo Realtime trên ứng dụng!");
        }
      } catch (e) {
        console.warn("Lỗi yêu cầu quyền thông báo:", e);
      }
    }
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=30");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabaseClient
      .channel("erp-realtime-notifications")
      .on("broadcast", { event: "new_notification" }, (payload) => {
        const newNotif = payload.payload as RealtimeNotification;
        if (!newNotif) return;
        if (newNotif.userId && newNotif.userId !== user.id) {
          return;
        }
        setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
        setUnreadCount((c) => c + 1);

        playChimeSound();
        toast.info(newNotif.title, newNotif.message);

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: "/favicon.ico",
            });
          } catch (e) {
          }
        }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch (err) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useRealtimeNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useRealtimeNotifications must be used within a RealtimeNotificationProvider");
  }
  return context;
}
