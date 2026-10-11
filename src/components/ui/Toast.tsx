"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toastsState: ToastMessage[] = [];
const listeners: Set<ToastListener> = new Set();

function emitChange() {
  for (const listener of listeners) {
    listener([...toastsState]);
  }
}

export const toast = {
  show: (type: ToastType, title: string, description?: string, duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, title, description, duration };
    // Giữ tối đa 3 toast mới nhất để không xếp chồng tràn màn hình
    toastsState = [...toastsState.slice(-2), newToast];
    emitChange();

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    return id;
  },
  success: (title: string, description?: string) => toast.show("success", title, description),
  error: (title: string, description?: string) => toast.show("error", title, description, 4500),
  warning: (title: string, description?: string) => toast.show("warning", title, description, 4000),
  info: (title: string, description?: string) => toast.show("info", title, description),
  dismiss: (id: string) => {
    toastsState = toastsState.filter((t) => t.id !== id);
    emitChange();
  },
};

function ToastCard({ t, onDismiss }: { t: ToastMessage; onDismiss: (id: string) => void }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(t.id);
    }, t.duration || 3500);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
  };

  const borders: Record<ToastType, string> = {
    success: "border-emerald-200 bg-emerald-50/50",
    error: "border-rose-200 bg-rose-50/50",
    warning: "border-amber-200 bg-amber-50/50",
    info: "border-blue-200 bg-blue-50/50",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-3.5 bg-white rounded-xl border shadow-lg transition-all duration-200 animate-in slide-in-from-top-2 fade-in",
        borders[t.type]
      )}
    >
      {icons[t.type]}
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-bold text-slate-900 leading-tight">{t.title}</h5>
        {t.description && (
          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{t.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>(() => [...toastsState]);

  React.useEffect(() => {
    setToasts([...toastsState]);
    const handleChange = (newToasts: ToastMessage[]) => setToasts(newToasts);
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} onDismiss={toast.dismiss} />
      ))}
    </div>
  );
}
