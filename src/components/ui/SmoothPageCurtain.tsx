"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LogoProgressLoader } from "./LogoProgressLoader";

export interface SmoothPageCurtainProps {
  isLoaded: boolean;
  title?: string;
  statusText?: string;
  size?: "md" | "lg" | "xl";
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

export function SmoothPageCurtain({
  isLoaded,
  title = "SIGNAGE ERP",
  statusText,
  size = "lg",
  duration = 1800,
  children,
  className,
}: SmoothPageCurtainProps) {
  const [isCurtainMounted, setIsCurtainMounted] = React.useState<boolean>(true);
  const initialLoadedRef = React.useRef(isLoaded);

  React.useEffect(() => {
    if (initialLoadedRef.current) {
      setIsCurtainMounted(false);
    }
  }, []);

  return (
    <div className={cn("relative w-full min-h-[500px]", className)}>
      <div
        className={cn(
          "w-full transition-opacity duration-300",
          isCurtainMounted ? "opacity-95" : "opacity-100"
        )}
      >
        {children}
      </div>
      {isCurtainMounted && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-50/95 backdrop-blur-md">
          <LogoProgressLoader
            variant="inline"
            size={size}
            title={title}
            statusText={statusText}
            duration={duration}
            isLoaded={isLoaded}
            fadeOnComplete={true}
            onFadedOut={() => {
              setIsCurtainMounted(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
