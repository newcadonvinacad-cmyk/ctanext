import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, indeterminate, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          id={checkboxId}
          ref={internalRef}
          className={cn(
            "h-4 w-4 rounded border-slate-300 text-blue-600 transition",
            "focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer",
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="text-xs text-slate-700 font-medium select-none cursor-pointer">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
