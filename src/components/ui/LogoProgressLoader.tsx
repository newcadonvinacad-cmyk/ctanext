"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SignageLogo } from "@/components/brand/SignageLogo";
import { Sparkles, CheckCircle2 } from "lucide-react";

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
  if (percent >= 100 || isLoaded) return "Dữ liệu đã sẵn sàng • Hoàn tất!";
  if (percent < 20) return "Khởi tạo tài nguyên Signage ERP...";
  if (percent < 45) return "Đang kết nối cơ sở dữ liệu & kiểm tra phiên...";
  if (percent < 70) return "Đang nạp dữ liệu dự án & kho vật tư...";
  if (percent < 90) return "Đang tải cấu hình phân quyền & dựng giao diện...";
  return "Đang đồng bộ giao diện ngầm...";
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
      let startP = internalProgress;
      let startT: number | null = null;
      let animId: number;
      const finishDuration = 180;

      const stepFinish = (timestamp: number) => {
        if (!startT) startT = timestamp;
        const elapsed = timestamp - startT;
        const t = Math.min(1, elapsed / finishDuration);
        const nextP = Math.round(startP + (100 - startP) * t);
        setInternalProgress(nextP);

        if (t < 1) {
          animId = requestAnimationFrame(stepFinish);
        } else {
          setInternalProgress(100);
        }
      };

      animId = requestAnimationFrame(stepFinish);
      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
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

      if (t < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [externalProgress, autoSimulate, duration, isLoaded]);

  React.useEffect(() => {
    if (internalProgress >= 100) {
      if (onComplete) onComplete();

      if (fadeOnComplete) {
        const timer1 = setTimeout(() => {
          setIsFadingOut(true);
        }, 120);

        const timer2 = setTimeout(() => {
          if (onFadedOut) onFadedOut();
        }, 470);

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
    }
  }, [internalProgress, fadeOnComplete, onComplete, onFadedOut]);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (internalProgress / 100) * circumference;

  const currentMessage = statusText || getDefaultStatusMessage(internalProgress, isLoaded);
  const logoSize = size === "xl" ? "xl" : size === "lg" ? "lg" : size === "md" ? "md" : "sm";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 p-2 select-none transition-opacity duration-300",
          isFadingOut && "opacity-0 pointer-events-none",
          className
        )}
      >
        <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-slate-200 stroke-current"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-red-600 stroke-current transition-all duration-300 ease-out"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - internalProgress / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <SignageLogo size="sm" />
          </div>
        </div>
        {showPercent && (
          <span className="text-xs font-mono font-bold text-slate-700">
            {internalProgress}%
          </span>
        )}
      </div>
    );
  }

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 select-none animate-fadeIn transition-all duration-350 ease-out",
        isFadingOut && "opacity-0 scale-95 pointer-events-none",
        variant === "inline" ? "max-w-md w-full mx-auto" : "max-w-lg w-full",
        className
      )}
    >
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-red-600/20 via-rose-500/15 to-amber-500/20 blur-2xl animate-pulse pointer-events-none" />
        <svg
          className="w-36 h-36 sm:w-44 sm:h-44 -rotate-90 transform drop-shadow-sm"
          viewBox="0 0 140 140"
        >
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            <filter id="progressGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="70"
            cy="70"
            r={radius}
            className="stroke-slate-200/80"
            strokeWidth="5"
            fill="transparent"
          />

          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            filter="url(#progressGlow)"
            className="transition-all duration-200 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative group p-2">
            <SignageLogo size={logoSize} animated={true} />
          </div>
        </div>

        {showPercent && (
          <div className="absolute -bottom-2 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-mono font-extrabold tracking-wider shadow-md border border-slate-700 flex items-center gap-1.5 animate-fadeIn">
            {internalProgress >= 100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="text-red-400 font-sans text-[10px]">●</span>
            )}
            <span>{internalProgress}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 mb-5">
        <div className="flex items-center justify-center gap-2">
          <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
            {title}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
            <Sparkles className="w-2.5 h-2.5 text-red-600" />
            {internalProgress >= 100 ? "Ready" : "Loading"}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-medium h-5 transition-all duration-300">
          {currentMessage}
        </p>
      </div>

      {showProgressBar && (
        <div className="w-full max-w-xs space-y-2">
          <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-200 ease-out relative"
              style={{ width: `${internalProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Tiến độ nạp trang</span>
            <span className="font-semibold text-slate-600">{internalProgress}/100%</span>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md transition-all duration-350 ease-out",
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
          "min-h-[60vh] flex items-center justify-center w-full transition-all duration-350 ease-out",
          isFadingOut && "opacity-0 pointer-events-none"
        )}
      >
        {content}
      </div>
    );
  }

  return content;
}
