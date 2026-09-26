"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  value?: string;
  onChange?: (val: string) => void;
  name?: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  children: React.ReactNode;
  className?: string;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue,
  onChange,
  name,
  disabled = false,
  orientation = "vertical",
  children,
  className,
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleChange = React.useCallback(
    (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val);
      }
      onChange?.(val);
    },
    [isControlled, onChange]
  );

  return (
    <RadioGroupContext.Provider
      value={{ value: activeValue, onChange: handleChange, name, disabled }}
    >
      <div
        role="radiogroup"
        className={cn(
          "flex",
          orientation === "vertical" ? "flex-col gap-2" : "flex-row flex-wrap gap-4",
          className
        )}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioItemProps {
  value: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioItem({
  value,
  label,
  description,
  disabled: itemDisabled,
  className,
}: RadioItemProps) {
  const context = React.useContext(RadioGroupContext);
  const isChecked = context?.value === value;
  const isDisabled = itemDisabled || context?.disabled;

  const handleClick = () => {
    if (!isDisabled && context?.onChange) {
      context.onChange(value);
    }
  };

  return (
    <label
      onClick={handleClick}
      className={cn(
        "inline-flex items-start gap-2.5 select-none",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center w-4 h-4 mt-0.5 rounded-full border transition-all duration-150 shrink-0",
          isChecked
            ? "border-blue-600 bg-white"
            : "border-slate-300 hover:border-slate-400 bg-white",
          isDisabled && "bg-slate-100"
        )}
      >
        {isChecked && (
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-in zoom-in-75 duration-100" />
        )}
      </div>

      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span
              className={cn(
                "text-xs font-medium",
                isChecked ? "text-slate-900 font-semibold" : "text-slate-700"
              )}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-500 mt-0.5">{description}</span>
          )}
        </div>
      )}
    </label>
  );
}
