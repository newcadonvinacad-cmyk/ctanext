"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs container");
  }
  return context;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setUncontrolledValue(newVal);
      }
      onValueChange?.(newVal);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "underline" | "pills";
}

export function TabsList({
  className,
  variant = "underline",
  children,
  ...props
}: TabsListProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto",
        variant === "underline" && "border-b border-slate-200 gap-6",
        variant === "pills" && "bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  badge?: string | number;
}

export function TabsTrigger({
  value,
  badge,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 relative py-2.5 px-1 select-none",
        // Underline default style
        "border-b-2 -mb-px",
        isActive
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold transition",
            isActive
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("pt-4 focus-visible:outline-none animate-in fade-in duration-150", className)}
      {...props}
    >
      {children}
    </div>
  );
}
