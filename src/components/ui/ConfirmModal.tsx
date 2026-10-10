"use client";

import * as React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Trash2,
  FileCheck,
} from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary" | "success" | "info";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string | React.ReactNode;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Xác nhận hành động",
  message,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  variant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const isBusy = isLoading || internalLoading;

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconBg: "bg-red-100 text-red-600",
      buttonClass: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-100 text-amber-600",
      buttonClass: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-emerald-100 text-emerald-600",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    },
    info: {
      icon: AlertCircle,
      iconBg: "bg-blue-100 text-blue-600",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    },
    primary: {
      icon: FileCheck,
      iconBg: "bg-slate-100 text-slate-800",
      buttonClass: "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-700",
    },
  };

  const config = variantConfig[variant] || variantConfig.primary;
  const Icon = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isBusy ? () => {} : onClose}
      title=""
      maxWidth="md"
      zIndex="z-[90]"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3.5">
          <div className={cn("p-2.5 rounded-2xl shrink-0", config.iconBg)}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-bold text-base text-slate-900 leading-snug">{title}</h3>
            <div className="text-xs text-slate-600 leading-relaxed font-normal">
              {typeof message === "string" ? <p>{message}</p> : message}
            </div>
            {description && (
              <p className="text-[11px] text-slate-400 mt-1 italic">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={onClose}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isBusy}
            isLoading={isBusy}
            onClick={handleConfirm}
            className={cn("text-xs font-semibold shadow-xs", config.buttonClass)}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
