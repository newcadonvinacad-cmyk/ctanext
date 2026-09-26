import * as React from "react";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, AlertCircle, CheckCircle2, X } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "error" | "success";
  title?: string;
  onClose?: () => void;
}

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className,
  ...props
}: AlertProps) {
  const styles = {
    info: "border-blue-200 bg-blue-50/70 text-blue-900",
    warning: "border-amber-200 bg-amber-50/70 text-amber-900",
    error: "border-rose-200 bg-rose-50/70 text-rose-900",
    success: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
  };

  const iconStyles = {
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border text-xs shadow-sm",
        styles[variant],
        className
      )}
      {...props}
    >
      {iconStyles[variant]}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-bold mb-0.5">{title}</h5>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
