"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  sticky?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  sticky = true,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const fromItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const toItem = Math.min(page * pageSize, totalItems);

  // Sinh danh sách trang hiển thị gọn gàng
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-200 text-xs select-none",
        sticky && "sticky bottom-0 z-20 shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      {/* Cụm bên trái: Chọn số dòng/trang */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 hidden sm:inline">Hiển thị:</span>
        <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          {pageSizeOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onPageSizeChange?.(opt)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-md transition",
                pageSize === opt
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <span className="text-slate-400 hidden sm:inline">dòng/trang</span>
      </div>

      {/* Cụm bên phải: Thống kê & Nút chuyển trang */}
      <div className="flex items-center gap-4">
        <div className="text-slate-600 font-medium">
          <span className="font-bold text-slate-800">
            {fromItem}-{toItem}
          </span>{" "}
          / <span className="font-bold text-slate-800">{totalItems}</span> bản ghi
        </div>

        <div className="flex items-center gap-1">
          {/* Về trang đầu */}
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Trang đầu"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Về trước */}
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Trước</span>
          </button>

          {/* Danh sách trang */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1.5 text-slate-400">
                    ...
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === page;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center",
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Kế tiếp */}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
          >
            <span className="hidden sm:inline text-[11px]">Sau</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Đến trang cuối */}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Trang cuối"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
