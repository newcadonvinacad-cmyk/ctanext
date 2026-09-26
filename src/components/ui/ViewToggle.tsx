"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Table as TableIcon, LayoutGrid } from "lucide-react";

export type ViewMode = "table" | "kanban";

export interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 select-none shadow-xs",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition",
          view === "table"
            ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
            : "text-slate-600 hover:text-slate-900"
        )}
        title="Chế độ bảng dữ liệu"
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Bảng</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("kanban")}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition",
          view === "kanban"
            ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
            : "text-slate-600 hover:text-slate-900"
        )}
        title="Chế độ tiến độ Kanban"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Kanban</span>
      </button>
    </div>
  );
}
