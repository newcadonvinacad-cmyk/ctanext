"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./Checkbox";
import { Columns3, RotateCcw } from "lucide-react";

export interface ColumnItem {
  id: string;
  label: string;
  visible: boolean;
  permanent?: boolean; // Cột không được phép ẩn (ví dụ: checkbox, mã, thao tác)
}

export interface ColumnVisibilityProps {
  columns: ColumnItem[];
  onChange: (columns: ColumnItem[]) => void;
  onReset?: () => void;
  className?: string;
}

export function ColumnVisibility({
  columns,
  onChange,
  onReset,
  className,
}: ColumnVisibilityProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (id: string) => {
    const updated = columns.map((col) => {
      if (col.id === id && !col.permanent) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });
    onChange(updated);
  };

  const handleShowAll = () => {
    const updated = columns.map((col) => ({ ...col, visible: true }));
    onChange(updated);
  };

  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition select-none bg-white shadow-xs",
          "border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50",
          isOpen && "border-blue-600 ring-1 ring-blue-600"
        )}
        title="Tùy chỉnh cột hiển thị"
      >
        <Columns3 className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">Cột</span>
        <span className="text-[10px] text-slate-400 font-normal">
          ({visibleCount}/{columns.length})
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 right-0 mt-1 w-56 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500 border-b border-slate-100 mb-1">
            <span className="font-semibold text-slate-700">Tùy chọn cột</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShowAll}
                className="hover:text-blue-600 font-medium transition"
              >
                Tất cả
              </button>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="hover:text-slate-800 transition flex items-center gap-1 text-[10px]"
                  title="Đặt lại mặc định"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Mặc định
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-60 py-0.5 space-y-0.5">
            {columns.map((col) => (
              <div
                key={col.id}
                onClick={() => !col.permanent && handleToggle(col.id)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs select-none transition-colors",
                  col.permanent
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:bg-slate-100 text-slate-700"
                )}
              >
                <Checkbox
                  checked={col.visible}
                  disabled={col.permanent}
                  onChange={() => {}}
                  className="pointer-events-none"
                />
                <span className="truncate">{col.label}</span>
                {col.permanent && (
                  <span className="ml-auto text-[9px] text-slate-400 font-medium">Cố định</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
