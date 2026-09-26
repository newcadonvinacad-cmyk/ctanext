import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: "blue" | "emerald" | "amber" | "rose" | "violet" | "neutral";
}

export interface StatBarProps {
  items: StatItem[];
  className?: string;
}

export function StatBar({ items, className }: StatBarProps) {
  const colorStyles = {
    blue: "text-blue-700 bg-blue-50/80 border-blue-200",
    emerald: "text-emerald-700 bg-emerald-50/80 border-emerald-200",
    amber: "text-amber-800 bg-amber-50/80 border-amber-200",
    rose: "text-rose-700 bg-rose-50/80 border-rose-200",
    violet: "text-violet-700 bg-violet-50/80 border-violet-200",
    neutral: "text-slate-700 bg-slate-100/80 border-slate-200",
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 py-1.5 px-3 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs select-none",
        className
      )}
    >
      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">
        Thống kê nhanh:
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) => {
          const colorKey = item.color || (item.highlight ? "blue" : "neutral");
          return (
            <div
              key={idx}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium transition",
                colorStyles[colorKey]
              )}
            >
              <span className="text-slate-500 font-normal">{item.label}:</span>
              <span className="font-bold">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
