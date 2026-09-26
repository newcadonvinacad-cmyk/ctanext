"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  size = "md",
  className,
}: SwitchProps) {
  const toggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const trackSizes = {
    sm: "w-8 h-4.5 p-0.5",
    md: "w-10 h-5.5 p-0.5",
  };

  const thumbSizes = {
    sm: "w-3.5 h-3.5 translate-x-3.5",
    md: "w-4.5 h-4.5 translate-x-4.5",
  };

  const baseThumbSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      onClick={toggle}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          trackSizes[size],
          checked ? "bg-blue-600" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out transform",
            baseThumbSizes[size],
            checked ? thumbSizes[size] : "translate-x-0"
          )}
        />
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-slate-800">{label}</span>}
          {description && <span className="text-[11px] text-slate-500">{description}</span>}
        </div>
      )}
    </div>
  );
}
