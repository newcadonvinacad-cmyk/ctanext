import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export function Separator({
  orientation = "horizontal",
  label,
  className,
  ...props
}: SeparatorProps) {
  if (label && orientation === "horizontal") {
    return (
      <div className={cn("relative flex items-center py-2", className)} {...props}>
        <div className="flex-grow border-t border-slate-200" />
        <span className="shrink-0 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-white">
          {label}
        </span>
        <div className="flex-grow border-t border-slate-200" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-slate-200",
        orientation === "horizontal" ? "h-px w-full my-2" : "h-full w-px mx-2 inline-block",
        className
      )}
      {...props}
    />
  );
}
