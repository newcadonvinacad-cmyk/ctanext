"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./Checkbox";
import { Filter, ChevronDown, Search, X } from "lucide-react";

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FacetFilterProps {
  title: string;
  options: FacetOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  className?: string;
}

export function FacetFilter({
  title,
  options,
  selectedValues,
  onChange,
  searchable = true,
  className,
}: FacetFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài
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

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedCount = selectedValues.length;

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Nút kích hoạt bộ lọc */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition select-none shadow-xs",
          selectedCount > 0
            ? "border-blue-500 bg-blue-50/60 text-blue-700"
            : "border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50",
          isOpen && "border-blue-600 ring-1 ring-blue-600"
        )}
      >
        <Filter className={cn("w-3.5 h-3.5", selectedCount > 0 ? "text-blue-600" : "text-slate-400")} />
        <span>{title}</span>

        {selectedCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-bold text-[10px]">
            {selectedCount}
          </span>
        )}

        {selectedCount > 0 ? (
          <span
            onClick={handleClear}
            className="p-0.5 hover:bg-blue-200/60 rounded text-blue-600 hover:text-blue-800 transition"
            title="Xóa lọc"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {/* Menu thả xuống */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          {/* Ô tìm kiếm nhanh */}
          {searchable && (
            <div className="p-1 border-b border-slate-100 mb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Tìm ${title.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Nút Chọn tất cả & Bỏ chọn */}
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500 border-b border-slate-100 mb-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="hover:text-blue-600 font-medium transition"
            >
              {selectedValues.length === options.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="hover:text-rose-600 font-medium transition"
              >
                Xóa đã chọn
              </button>
            )}
          </div>

          {/* Danh sách Checkbox */}
          <div className="overflow-y-auto max-h-52 py-0.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors",
                      isChecked ? "bg-blue-50/60 text-blue-900" : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                      {opt.icon && <span className="shrink-0 text-slate-400">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span
                        className={cn(
                          "ml-2 text-[10px] font-semibold px-1.5 py-0.2 rounded-md",
                          isChecked
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {opt.count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
