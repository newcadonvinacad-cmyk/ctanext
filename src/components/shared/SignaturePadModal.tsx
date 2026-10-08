"use client";

import * as React from "react";
import { Modal, Button, Input } from "@/components/ui";
import { RotateCcw, Check, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  defaultSignerName?: string;
  onSave: (signatureDataUrl: string, signerName: string) => Promise<void> | void;
}

export function SignaturePadModal({
  isOpen,
  onClose,
  title = "Ký số điện tử",
  defaultSignerName = "",
  onSave,
}: SignaturePadModalProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(false);
  const [signerName, setSignerName] = React.useState(defaultSignerName);
  const [inkColor, setInkColor] = React.useState<"#1E40AF" | "#0F172A">("#1E40AF"); // Mực xanh cửu long hoặc mực đen
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSignerName(defaultSignerName);
      setHasSignature(false);
      // Xóa và chuẩn bị canvas
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = inkColor;
          }
        }
      }, 50);
    }
  }, [isOpen, defaultSignerName, inkColor]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    try {
      setSaving(true);
      const dataUrl = canvas.toDataURL("image/png");
      await onSave(dataUrl, signerName);
      onClose();
    } catch (err) {
      console.error("Lỗi lưu chữ ký:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Họ tên người ký xác nhận *
          </label>
          <Input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="VD: Trần Đình Trọng (Đại diện khách hàng)"
            className="text-xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-slate-500" />
              <span>Khung ký bằng ngón tay / bút cảm ứng:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Màu mực:</span>
              <button
                type="button"
                onClick={() => setInkColor("#1E40AF")}
                className={cn(
                  "w-4 h-4 rounded-full bg-blue-700 transition-all",
                  inkColor === "#1E40AF" && "ring-2 ring-offset-1 ring-blue-600 scale-110"
                )}
                title="Mực xanh truyền thống"
              />
              <button
                type="button"
                onClick={() => setInkColor("#0F172A")}
                className={cn(
                  "w-4 h-4 rounded-full bg-slate-900 transition-all",
                  inkColor === "#0F172A" && "ring-2 ring-offset-1 ring-slate-900 scale-110"
                )}
                title="Mực đen"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] text-slate-500 hover:text-rose-600 ml-2 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ký lại</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 overflow-hidden touch-none select-none">
            <canvas
              ref={canvasRef}
              width={460}
              height={190}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[190px] cursor-crosshair block"
            />
            {!hasSignature && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium">
                Vuốt ngón tay hoặc rê chuột để ký tên vào khung này
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            * Chữ ký điện tử sẽ được mã hóa và đóng dấu trực tiếp vào biên bản A4 xuất xưởng / bàn giao.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} className="text-xs">
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!hasSignature || saving}
            onClick={handleConfirm}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {saving ? "Đang lưu..." : "Xác nhận chữ ký"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
