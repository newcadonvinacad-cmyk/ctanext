"use client";

/**
 * QUẢN LÝ LỚP NỔI TOÀN HỆ THỐNG (OVERLAY STACK MANAGER)
 * Giải quyết triệt để lỗi UI-02 & UI-06:
 * 1. Quản lý thứ tự lớp nổi (Drawer, Modal, ConfirmDialog)
 * 2. Phím Escape chỉ đóng duy nhất lớp trên cùng (Topmost)
 * 3. Duy trì khóa cuộn body (overflow: hidden) đến khi đóng lớp cuối cùng
 */

interface OverlayItem {
  id: string;
  onClose: () => void;
}

const overlayStack: OverlayItem[] = [];
let isListenerAttached = false;

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" && overlayStack.length > 0) {
    const topOverlay = overlayStack[overlayStack.length - 1];
    if (topOverlay && typeof topOverlay.onClose === "function") {
      e.stopPropagation();
      e.preventDefault();
      topOverlay.onClose();
    }
  }
}

export function pushOverlay(id: string, onClose: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (!isListenerAttached) {
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    isListenerAttached = true;
  }

  // Xóa entry cũ nếu trùng id
  const existingIdx = overlayStack.findIndex((item) => item.id === id);
  if (existingIdx !== -1) {
    overlayStack.splice(existingIdx, 1);
  }

  overlayStack.push({ id, onClose });
  document.body.style.overflow = "hidden";

  return () => {
    popOverlay(id);
  };
}

export function popOverlay(id: string): void {
  const index = overlayStack.findIndex((item) => item.id === id);
  if (index !== -1) {
    overlayStack.splice(index, 1);
  }

  if (overlayStack.length === 0 && typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}
