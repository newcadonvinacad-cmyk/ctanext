"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, ArrowRight, X } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  createdAt: string;
}

export function AnnouncementBanner() {
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLatestNotification() {
      try {
        const res = await fetch("/api/notifications?limit=1&onlyUnread=false");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.notifications && data.notifications.length > 0) {
            setNotification(data.notifications[0]);
          }
        }
      } catch (err) {
        // Silent catch
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadLatestNotification();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || dismissed || !notification) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-xs flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div className="truncate text-slate-700">
          <strong className="text-slate-900 font-semibold mr-1.5">{notification.title}:</strong>
          {notification.message}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {notification.link && (
          <Link
            href={notification.link}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-0.5"
          >
            <span>Chi tiết</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-600 transition"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
