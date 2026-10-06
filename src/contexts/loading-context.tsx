"use client";

import * as React from "react";
import { LogoProgressLoader } from "@/components/ui/LogoProgressLoader";

interface LoadingOptions {
  title?: string;
  statusText?: string;
  duration?: number;
  progress?: number;
}

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  statusText?: string;
  title?: string;
  showLoading: (options?: LoadingOptions) => void;
  updateProgress: (progress: number, statusText?: string) => void;
  finishLoading: () => void;
  hideLoading: () => void;
}

const LoadingContext = React.createContext<LoadingContextType | null>(null);

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [progress, setProgress] = React.useState<number | undefined>(undefined);
  const [title, setTitle] = React.useState("SIGNAGE ERP");
  const [statusText, setStatusText] = React.useState<string | undefined>(undefined);
  const [duration, setDuration] = React.useState(2200);

  const showLoading = React.useCallback((options?: LoadingOptions) => {
    setTitle(options?.title || "SIGNAGE ERP");
    setStatusText(options?.statusText);
    setDuration(options?.duration || 2200);
    setProgress(typeof options?.progress === "number" ? options.progress : undefined);
    setIsLoaded(false);
    setIsLoading(true);
  }, []);

  const updateProgress = React.useCallback((newProgress: number, newStatusText?: string) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    if (newStatusText) setStatusText(newStatusText);
  }, []);

  const finishLoading = React.useCallback(() => {
    setIsLoaded(true);
    setStatusText("Dữ liệu đã sẵn sàng • Hoàn tất!");
  }, []);

  const hideLoading = finishLoading;

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        progress: progress || 0,
        statusText,
        title,
        showLoading,
        updateProgress,
        finishLoading,
        hideLoading,
      }}
    >
      {children}

      {/* Hiển thị Loading toàn màn hình chống giật khi được kích hoạt */}
      {isLoading && (
        <LogoProgressLoader
          variant="fullscreen"
          size="xl"
          title={title}
          statusText={statusText}
          progress={progress}
          autoSimulate={progress === undefined}
          duration={duration}
          isLoaded={isLoaded}
          fadeOnComplete={true}
          onFadedOut={() => {
            setIsLoading(false);
            setIsLoaded(false);
            setProgress(undefined);
          }}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const ctx = React.useContext(LoadingContext);
  if (!ctx) {
    return {
      isLoading: false,
      progress: 0,
      showLoading: () => { },
      updateProgress: () => { },
      finishLoading: () => { },
      hideLoading: () => { },
    };
  }
  return ctx;
}
