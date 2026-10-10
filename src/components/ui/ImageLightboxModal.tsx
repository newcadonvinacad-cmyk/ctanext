"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ExternalLink, Maximize2 } from "lucide-react";
import { pushOverlay } from "@/lib/overlay-manager";

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title?: string;
  subtitle?: string;
  meta?: React.ReactNode;
}

/**
 * Mở ảnh an toàn ở tab mới mà không bị chặn bởi bảo mật trình duyệt
 * đối với data URI (SVG/PNG data: URLs)
 */
export function safeOpenExternalImage(src: string, filename?: string) {
  if (!src) return;

  if (src.startsWith("data:")) {
    try {
      const parts = src.split(",");
      const meta = parts[0] || "";
      const mime = meta.match(/:(.*?);/)?.[1] || "image/svg+xml";
      const isBase64 = meta.includes(";base64");
      const rawData = parts.slice(1).join(",");

      let blob: Blob;
      if (isBase64) {
        const byteCharacters = atob(rawData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: mime });
      } else {
        const decoded = decodeURIComponent(rawData);
        blob = new Blob([decoded], { type: mime });
      }

      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      // Giải phóng URL sau 2 phút
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      return;
    } catch (e) {
      console.warn("Không thể mở qua Blob URL, dùng fallback document.write:", e);
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>${filename || "Bản vẽ kỹ thuật"}</title>
              <style>
                body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
                img { max-width: 100%; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 8px; background: white; }
              </style>
            </head>
            <body>
              <img src="${src}" alt="${filename || "Bản vẽ"}" />
            </body>
          </html>
        `);
        win.document.close();
        return;
      }
    }
  }

  window.open(src, "_blank");
}

/**
 * Tải ảnh xuống máy tính an toàn
 */
export function safeDownloadImage(src: string, defaultName: string = "ban-ve-ky-thuat") {
  if (!src) return;

  const isSvg = src.includes("image/svg+xml") || src.endsWith(".svg");
  const ext = isSvg ? ".svg" : ".png";
  const cleanName = defaultName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() + ext;

  if (src.startsWith("data:")) {
    try {
      const parts = src.split(",");
      const meta = parts[0] || "";
      const mime = meta.match(/:(.*?);/)?.[1] || (isSvg ? "image/svg+xml" : "image/png");
      const isBase64 = meta.includes(";base64");
      const rawData = parts.slice(1).join(",");

      let blob: Blob;
      if (isBase64) {
        const byteCharacters = atob(rawData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
      } else {
        const decoded = decodeURIComponent(rawData);
        blob = new Blob([decoded], { type: mime });
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = cleanName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    } catch (e) {
      console.warn("Lỗi tải blob, fallback download href:", e);
    }
  }

  const link = document.createElement("a");
  link.href = src;
  link.download = cleanName;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  src,
  title = "Chi tiết bản vẽ",
  subtitle,
  meta,
}: ImageLightboxModalProps) {
  const modalId = React.useId();
  const [zoom, setZoom] = React.useState<number>(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Reset zoom & pan khi mở modal mới
  React.useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, src]);

  // Đăng ký overlay manager để đóng bằng Escape
  React.useEffect(() => {
    if (!isOpen) return;
    return pushOverlay(modalId, onClose);
  }, [isOpen, onClose, modalId]);

  if (!isOpen || !src) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-white shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded border border-blue-500/30">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-slate-100 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Thu nhỏ"
              className="p-1.5 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent rounded transition text-slate-300"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Đặt lại kích thước gốc"
              className="px-2 py-1 font-mono text-[11px] text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              title="Phóng to"
              className="p-1.5 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent rounded transition text-slate-300"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Khôi phục vị trí & kích thước"
              className="p-1.5 hover:bg-slate-700 rounded transition text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mở tab mới an toàn */}
          <button
            onClick={() => safeOpenExternalImage(src, title)}
            title="Mở ảnh trong tab mới (Độ nét cao)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Mở tab mới</span>
          </button>

          {/* Tải về */}
          <button
            onClick={() => safeDownloadImage(src, title)}
            title="Tải bản vẽ về máy"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tải về</span>
          </button>

          {/* Đóng */}
          <button
            onClick={onClose}
            title="Đóng xem ảnh (Esc)"
            className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 rounded-lg border border-slate-700 transition ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className={cn(
          "relative flex-1 overflow-hidden flex items-center justify-center p-4",
          zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget && zoom === 1) onClose();
        }}
      >
        <div
          className="transition-transform duration-75 origin-center will-change-transform max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
        >
          <img
            src={src}
            alt={title}
            draggable={false}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl bg-white border border-slate-700/50"
          />
        </div>

        {/* Floating Helper Notice when Zoomed */}
        {zoom > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-300 text-[11px] px-3 py-1.5 rounded-full border border-slate-700 pointer-events-none shadow-lg">
            Kéo thả chuột để di chuyển vùng nhìn · Cuộn hoặc dùng nút để zoom
          </div>
        )}
      </div>

      {/* Footer Metadata (Optional) */}
      {meta && (
        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300 shrink-0 z-20">
          {meta}
        </div>
      )}
    </div>
  );
}
