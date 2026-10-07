"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SignageLogo } from "@/components/brand/SignageLogo";
import { Spinner } from "./Spinner";

export interface LogoProgressLoaderProps {
  progress?: number;
  autoSimulate?: boolean;
  duration?: number;
  statusText?: string;
  title?: string;
  variant?: "fullscreen" | "page" | "inline" | "compact";
  size?: "sm" | "md" | "lg" | "xl";
  showProgressBar?: boolean;
  showPercent?: boolean;
  isLoaded?: boolean;
  fadeOnComplete?: boolean;
  onComplete?: () => void;
  onFadedOut?: () => void;
  className?: string;
}

function getDefaultStatusMessage(percent: number, isLoaded?: boolean): string {
  if (percent >= 100 || isLoaded) return "Hoàn tất";
  if (percent < 40) return "Đang kết nối...";
  if (percent < 75) return "Đang tải dữ liệu...";
  return "Đang hoàn thiện...";
}

export function LogoProgressLoader({
  progress: externalProgress,
  autoSimulate = true,
  duration = 2400,
  statusText,
  title = "SIGNAGE ERP",
  variant = "page",
  size = "lg",
  showProgressBar = true,
  showPercent = true,
  isLoaded,
  fadeOnComplete = false,
  onComplete,
  onFadedOut,
  className,
}: LogoProgressLoaderProps) {
  const [internalProgress, setInternalProgress] = React.useState<number>(
    typeof externalProgress === "number" ? externalProgress : 0
  );
  const [isFadingOut, setIsFadingOut] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof externalProgress === "number") {
      setInternalProgress(Math.min(100, Math.max(0, externalProgress)));
      return;
    }

    if (isLoaded === true) {
      const startP = internalProgress;
      let startT: number | null = null;
      let animId: number;
      const finishDuration = 180;

      const stepFinish = (timestamp: number) => {
        if (!startT) startT = timestamp;
        const elapsed = timestamp - startT;
        const t = Math.min(1, elapsed / finishDuration);
        setInternalProgress(Math.round(startP + (100 - startP) * t));
        if (t < 1) animId = requestAnimationFrame(stepFinish);
      };

      animId = requestAnimationFrame(stepFinish);
      return () => cancelAnimationFrame(animId);
    }

    if (!autoSimulate) return;

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const t = Math.min(1, elapsed / duration);
      const easeProgress = Math.round((1 - Math.pow(1 - t, 3)) * 93);
      setInternalProgress((prev) => Math.max(prev, easeProgress));
      if (t < 1) animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalProgress, autoSimulate, duration, isLoaded]);

  React.useEffect(() => {
    if (internalProgress >= 100) {
      onComplete?.();
      if (fadeOnComplete) {
        const timer1 = setTimeout(() => setIsFadingOut(true), 120);
        const timer2 = setTimeout(() => onFadedOut?.(), 470);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
    }
  }, [internalProgress, fadeOnComplete, onComplete, onFadedOut]);

  const currentMessage = statusText || getDefaultStatusMessage(internalProgress, isLoaded);
  const logoSize = size === "xl" ? "xl" : size === "lg" ? "lg" : size === "md" ? "md" : "sm";
  const spinnerSize = size === "xl" ? "xl" : size === "lg" ? "lg" : size === "sm" ? "sm" : "md";

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2.5 select-none transition-opacity duration-300",
          isFadingOut && "opacity-0 pointer-events-none",
          className
        )}
      >
        <Spinner size="sm" className="text-slate-500" />
        {showPercent && (
          <span className="text-xs font-medium tabular-nums text-slate-500">
            {internalProgress}%
          </span>
        )}
      </span>
    );
  }

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center select-none transition-opacity duration-300",
        isFadingOut && "opacity-0 pointer-events-none",
        variant === "inline" ? "max-w-sm w-full mx-auto py-8" : "max-w-sm w-full py-8",
        className
      )}
    >
      {/* Logo + spinner ring bao quanh */}
      <div className="relative flex items-center justify-center">
        <Spinner
          size={spinnerSize}
          duration={1100}
          className="text-slate-300"
          arcClassName="text-red-600"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <SignageLogo size={size === "xl" || size === "lg" ? "sm" : "sm"} animated={false} />
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold tracking-tight text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500 h-4 tabular-nums">
        {currentMessage}
        {showPercent && internalProgress < 100 && (
          <span className="ml-1.5 font-medium text-slate-400">{internalProgress}%</span>
        )}
      </p>

      {showProgressBar && (
        <div className="mt-4 h-1 w-44 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full rounded-full bg-slate-700 transition-[width] duration-200 ease-out"
            style={{ width: `${internalProgress}%` }}
          />
        </div>
      )}
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300",
          isFadingOut && "opacity-0 pointer-events-none"
        )}
      >
        {content}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div
        className={cn(
          "min-h-[60vh] flex items-center justify-center w-full transition-opacity duration-300",
          isFadingOut && "opacity-0 pointer-events-none"
        )}
      >
        {content}
      </div>
    );
  }

  return content;
}
