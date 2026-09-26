"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  close: () => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export interface DropdownProps {
  children: React.ReactNode;
  className?: string;
}

export function Dropdown({ children, className }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback(() => setIsOpen(false), []);

  // Đóng khi click ngoài
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

  // Đóng bằng phím Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close }}>
      <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownTrigger must be used within a Dropdown");

  return (
    <div
      onClick={() => context.setIsOpen((prev) => !prev)}
      className={cn("cursor-pointer inline-flex items-center", className)}
    >
      {children}
    </div>
  );
}

export interface DropdownContentProps {
  children: React.ReactNode;
  align?: "left" | "right";
  width?: "auto" | "sm" | "md" | "lg" | "w-64" | "w-72" | "w-80";
  className?: string;
}

export function DropdownContent({
  children,
  align = "right",
  width = "auto",
  className,
}: DropdownContentProps) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownContent must be used within a Dropdown");

  if (!context.isOpen) return null;

  const widthStyles: Record<string, string> = {
    auto: "min-w-[160px]",
    sm: "w-44",
    md: "w-56",
    lg: "w-64",
    "w-64": "w-64",
    "w-72": "w-72",
    "w-80": "w-80",
  };

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 focus:outline-none",
        align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
        widthStyles[width] || "min-w-[160px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  danger?: boolean;
}

export function DropdownItem({
  children,
  icon,
  danger,
  className,
  onClick,
  ...props
}: DropdownItemProps) {
  const context = React.useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    context?.close();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0 text-slate-500">{icon}</span>}
      <span className="truncate flex-1">{children}</span>
    </button>
  );
}

export function DropdownDivider({ className }: { className?: string }) {
  return <div className={cn("my-1 border-t border-slate-100", className)} />;
}
