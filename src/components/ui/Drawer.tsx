"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { pushOverlay } from "@/lib/overlay-manager";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  zIndex?: string;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  headerActions?: React.ReactNode;
  variant?: "floating" | "edge";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
  zIndex = "z-[90]",
  badge,
  avatar,
  headerActions,
  variant = "floating",
}: DrawerProps) {
  const drawerId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang nền khi drawer đang mở
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // UI-02 & UI-06: Đăng ký vào overlay manager
  React.useEffect(() => {
    if (!isOpen) return;
    const cleanup = pushOverlay(drawerId, onClose);
    return cleanup;
  }, [isOpen, onClose, drawerId]);

  if (!isOpen || !mounted) return null;

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full",
  };

  const isFloating = variant === "floating";

  const drawerElement = (
    <div
      role="dialog"
      aria-modal="true"
      className={cn("fixed inset-0 overflow-hidden select-none", zIndex)}
    >
      {/* Backdrop nền tối mờ sang trọng */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 flex max-w-full",
          isFloating ? "p-3 sm:p-5" : "pl-10"
        )}
      >
        <div
          className={cn(
            "w-screen bg-white shadow-2xl flex flex-col border border-slate-200/90 animate-in slide-in-from-right duration-200 select-text overflow-hidden",
            isFloating ? "rounded-3xl sm:rounded-[28px] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] my-auto" : "border-l",
            widthClasses[width]
          )}
        >
          {/* Header Card Hiện Đại theo phong cách Mockup */}
          <div className="px-6 py-5 border-b border-slate-100 shrink-0 bg-white flex items-start justify-between gap-4 font-sans">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {avatar && (
                <div className="shrink-0">
                  {avatar}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-xl text-[#0e1726] tracking-tight leading-snug truncate">
                    {title}
                  </h3>
                  {badge && <div className="shrink-0">{badge}</div>}
                </div>
                {description && (
                  <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed tracking-normal">
                    {description}
                  </div>
                )}
              </div>
            </div>

            {/* Cụm Action & Nút X tròn mềm mại cao cấp */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {headerActions}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
                aria-label="Đóng"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Body với thanh cuộn mượt mà */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white">
            {children}
          </div>

          {/* Footer (nếu có) */}
          {footer && (
            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerElement, document.body);
}
