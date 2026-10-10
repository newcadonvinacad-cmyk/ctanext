"use client";

import * as React from "react";
import { ConfirmModal, type ConfirmVariant } from "@/components/ui/ConfirmModal";

export interface ConfirmDialogOptions {
  title?: string;
  message: string | React.ReactNode;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (options: ConfirmDialogOptions | string) => Promise<boolean>;

const ConfirmDialogContext = React.createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { message: "" },
    resolve: null,
  });

  const confirm = React.useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      const normalizedOptions: ConfirmDialogOptions =
        typeof options === "string"
          ? {
              title: "Xác nhận hành động",
              message: options,
              variant: "primary",
            }
          : options;

      setDialogState({
        isOpen: true,
        options: normalizedOptions,
        resolve,
      });
    });
  }, []);

  const handleClose = React.useCallback(() => {
    setDialogState((prev) => {
      if (prev.resolve) prev.resolve(false);
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    setDialogState((prev) => {
      if (prev.resolve) prev.resolve(true);
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {dialogState.isOpen && (
        <ConfirmModal
          isOpen={dialogState.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={dialogState.options.title || "Xác nhận"}
          message={dialogState.options.message}
          description={dialogState.options.description}
          confirmText={dialogState.options.confirmText || "Xác nhận"}
          cancelText={dialogState.options.cancelText || "Hủy bỏ"}
          variant={dialogState.options.variant || "primary"}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = React.useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return context;
}
