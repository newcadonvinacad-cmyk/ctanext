"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { pushOverlay } from "@/lib/overlay-manager";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";
  zIndex?: string;
  bodyClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  zIndex = "z-[100]",
  bodyClassName,
}: ModalProps) {
  const modalId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Khóa cuộn trang nền khi modal đang mở
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // UI-02 & UI-06: Đăng ký modal vào overlay manager để Escape chỉ đóng lớp trên cùng
  React.useEffect(() => {
    if (!isOpen) return;
    const cleanup = pushOverlay(modalId, onClose);
    return cleanup;
  }, [isOpen, onClose, modalId]);

  if (!isOpen || !mounted) return null;

  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    full: "max-w-[95vw] lg:max-w-6xl xl:max-w-7xl",
  };

  const modalElement = (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 select-none",
        zIndex
      )}
    >
      {/* Lớp nền bắt click để đóng */}
      <div
        className="fixed inset-0 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Hộp thoại Modal */}
      <div
        className={cn(
          "relative z-10 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] select-text",
          maxWidths[maxWidth]
        )}
      >
        {/* Header */}
        {title ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-snug">{title}</h3>
              {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {/* Body */}
        <div className={cn("p-6 overflow-y-auto space-y-4", bodyClassName)}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 bg-slate-50 border-t border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}

