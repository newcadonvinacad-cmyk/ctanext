"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Checkbox,
  Pagination,
  FacetFilter,
  FacetOption,
  ColumnVisibility,
  ColumnItem,
  StatBar,
  StatItem,
  Skeleton,
  Modal,
  Button,
  toast,
} from "@/components/ui";
export type { StatItem };
import {
  Search,
  RotateCw,
  Download,
  Upload,
  BarChart2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Inbox,
  Filter,
  FileSpreadsheet,
} from "lucide-react";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  permanent?: boolean;
  defaultHidden?: boolean;
}

export interface DataTableRowAction<T> {
  icon: React.ReactNode;
  title: string;
  onClick: (item: T) => void;
  danger?: boolean;
  disabled?: boolean | ((item: T) => boolean);
  hidden?: boolean | ((item: T) => boolean);
}

export interface DataTableFacetFilterConfig {
  id: string;
  title: string;
  options: FacetOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}

export interface DataTablePaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;

  // Tìm kiếm & Lọc
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  filters?: DataTableFacetFilterConfig[];
  onResetFilters?: () => void;

  // Thanh công cụ bên phải chuẩn Benchmark UI
  stats?: StatItem[];
  defaultShowStats?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onImportData?: (rows: Record<string, any>[]) => Promise<{ successCount: number; errorCount?: number; errors?: string[] } | void>;
  exportFileName?: string;
  primaryAction?: React.ReactNode;

  // Sắp xếp
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSortChange?: (columnId: string, direction: SortDirection) => void;

  // Chọn dòng (Checkboxes)
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;

  // Thao tác hàng & Nhấp dòng
  actions?: ((item: T) => DataTableRowAction<T>[]) | DataTableRowAction<T>[];
  rowActions?: ((item: T) => DataTableRowAction<T>[]) | DataTableRowAction<T>[];
  onRowClick?: (item: T) => void;

  // Phân trang & Trạng thái tải
  pagination?: DataTablePaginationConfig | false;
  loading?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;

  // Ghim thanh công cụ (Sticky Toolbar)
  stickyToolbar?: boolean;
  stickyToolbarTop?: string;
}

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchable = true,
  searchPlaceholder = "Tên / mã / SĐT...",
  searchValue,
  onSearchChange,
  filters = [],
  onResetFilters,
  stats,
  defaultShowStats = false,
  onRefresh,
  onExport,
  onImport,
  onImportData,
  exportFileName = "danh-sach-du-lieu",
  primaryAction,
  sortColumn,
  sortDirection,
  onSortChange,
  selectable = true,
  selectedIds = [],
  onSelectedIdsChange,
  actions,
  rowActions,
  onRowClick,
  pagination,
  loading,
  isLoading,
  emptyMessage = "Không có bản ghi nào",
  className,
  stickyToolbar = true,
  stickyToolbarTop = "top-14",
}: DataTableProps<T>) {
  const effectiveActions = actions || rowActions;
  const effectiveLoading = loading ?? isLoading ?? false;

  // Tìm kiếm
  const [internalSearch, setInternalSearch] = React.useState("");
  const isSearchControlled = searchValue !== undefined;
  const currentSearch = isSearchControlled ? searchValue : internalSearch;

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isSearchControlled) {
      setInternalSearch(val);
    }
    onSearchChange?.(val);
  };

  const handleClearSearch = () => {
    if (!isSearchControlled) {
      setInternalSearch("");
    }
    onSearchChange?.("");
  };

  // Trạng thái bật/tắt dải thống kê nhanh StatBar
  const [showStats, setShowStats] = React.useState(defaultShowStats);

  // Tự động phân trang Client-side nếu không truyền pagination từ ngoài vào
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(20);

  // Reset về trang 1 khi tìm kiếm hoặc độ dài dữ liệu thay đổi
  React.useEffect(() => {
    setInternalPage(1);
  }, [currentSearch, data.length]);

  const effectivePagination = React.useMemo<DataTablePaginationConfig | null>(() => {
    if (pagination === false) return null;
    if (pagination) return pagination;
    return {
      page: internalPage,
      pageSize: internalPageSize,
      totalItems: data.length,
      onPageChange: setInternalPage,
      onPageSizeChange: (newSize: number) => {
        setInternalPageSize(newSize);
        setInternalPage(1);
      },
      pageSizeOptions: [10, 20, 50, 100],
    };
  }, [pagination, internalPage, internalPageSize, data.length]);

  const paginatedData = React.useMemo(() => {
    if (!effectivePagination || pagination) {
      return data;
    }
    const start = (effectivePagination.page - 1) * effectivePagination.pageSize;
    return data.slice(start, start + effectivePagination.pageSize);
  }, [data, pagination, effectivePagination]);

  // Modal Nhập file Excel
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);

  // Trạng thái ẩn/hiện cột (Column Visibility)
  const [columnItems, setColumnItems] = React.useState<ColumnItem[]>(() =>
    columns.map((col) => ({
      id: col.id,
      label: typeof col.header === "string" ? col.header : col.id,
      visible: !col.defaultHidden,
      permanent: col.permanent,
    }))
  );

  // Lấy danh sách cột đang hiển thị
  const visibleColumns = React.useMemo(() => {
    const visibleMap = new Map(columnItems.map((c) => [c.id, c.visible]));
    return columns.filter((col) => visibleMap.get(col.id) ?? true);
  }, [columns, columnItems]);

  // Kiểm tra bộ lọc
  const hasActiveFilters = React.useMemo(() => {
    const hasSearch = Boolean(currentSearch && currentSearch.trim().length > 0);
    const hasFacet = filters.some((f) => f.selectedValues.length > 0);
    return hasSearch || hasFacet;
  }, [currentSearch, filters]);

  // Xử lý Checkbox chọn tất cả
  const allCurrentRowIds = React.useMemo(
    () => data.map((item) => keyExtractor(item)),
    [data, keyExtractor]
  );

  const isAllSelected =
    allCurrentRowIds.length > 0 &&
    allCurrentRowIds.every((id) => selectedIds.includes(id));

  const isPartiallySelected =
    selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (!onSelectedIdsChange) return;
    if (isAllSelected) {
      onSelectedIdsChange(selectedIds.filter((id) => !allCurrentRowIds.includes(id)));
    } else {
      const newSet = new Set([...selectedIds, ...allCurrentRowIds]);
      onSelectedIdsChange(Array.from(newSet));
    }
  };

  const handleToggleRow = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!onSelectedIdsChange) return;
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  // Sắp xếp
  const handleHeaderClick = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSortChange) return;
    if (sortColumn === col.id) {
      if (sortDirection === "asc") onSortChange(col.id, "desc");
      else if (sortDirection === "desc") onSortChange(col.id, null);
      else onSortChange(col.id, "asc");
    } else {
      onSortChange(col.id, "asc");
    }
  };

  // Xuất file Excel / CSV tự động chuẩn UTF-8 BOM
  const handleDefaultExport = () => {
    if (onExport) {
      onExport();
      return;
    }

    try {
      if (data.length === 0) {
        toast.error("Không có dữ liệu để xuất");
        return;
      }

      // Lấy headers
      const exportCols = visibleColumns.filter((c) => c.accessorKey || typeof c.header === "string");
      const headers = exportCols.map((c) => (typeof c.header === "string" ? c.header : c.id));

      // Lấy rows
      const rows = data.map((item) =>
        exportCols.map((c) => {
          if (c.accessorKey) {
            const val = item[c.accessorKey];
            return val !== undefined && val !== null ? `"${String(val).replace(/"/g, '""')}"` : '""';
          }
          return '""';
        })
      );

      // Ghép chuỗi CSV kèm UTF-8 BOM (\uFEFF) để Excel hiển thị đúng tiếng Việt
      const csvContent =
        "\uFEFF" +
        [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Đã xuất ${data.length} dòng ra tệp Excel/CSV thành công!`);
    } catch (e: any) {
      toast.error("Lỗi xuất file: " + e.message);
    }
  };

  const handleOpenImport = () => {
    if (onImport) {
      onImport();
    } else {
      setIsImportModalOpen(true);
    }
  };

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuote && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (c === "," && !inQuote) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row);
    }
    return { headers, rows };
  };

  const handleConfirmImport = async () => {
    if (!importFile) {
      toast.error("Vui lòng chọn file Excel hoặc CSV.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content || !content.trim()) {
            toast.error("Tệp tải lên rỗng!");
            return;
          }

          const { headers, rows } = parseCSV(content);
          if (rows.length === 0) {
            toast.error("Không tìm thấy dòng dữ liệu nào trong tệp!");
            return;
          }

          if (onImportData) {
            const res = await onImportData(rows);
            if (res && typeof res.successCount === "number") {
              if (res.errorCount && res.errorCount > 0) {
                toast.warning(`Đã nhập ${res.successCount} dòng, lỗi ${res.errorCount} dòng.`);
              } else {
                toast.success(`Đã nhập thành công ${res.successCount} dòng từ file!`);
              }
            } else {
              toast.success(`Đã nhập thành công ${rows.length} dòng dữ liệu!`);
            }
          } else {
            toast.success(`Đã kiểm tra và nạp hợp lệ ${rows.length} dòng dữ liệu từ ${importFile.name}!`);
          }

          setIsImportModalOpen(false);
          setImportFile(null);
          onRefresh?.();
        } catch (err: any) {
          toast.error("Lỗi đọc định dạng tệp: " + err.message);
        }
      };
      reader.readAsText(importFile);
    } catch (err: any) {
      toast.error("Lỗi xử lý tệp: " + err.message);
    }
  };

  return (
    <div className={cn("w-full flex flex-col space-y-2 select-none", className)}>
      {/* ==========================================
          1. TOOLBAR & BỘ LỌC CHUẨN BENCHMARK UI
          [Loại ⌄] [Trạng thái ⌄] [Người phụ trách ⌄] [Tên/mã/SĐT...]
          Cụm phải: [🔄] [🌪 Lọc] [⇅ Sắp xếp] [▤ Cột] [📥 Xuất Excel] [📤 Nhập Excel]
      ========================================== */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 bg-white/95 backdrop-blur-xs p-1.5 sm:p-2 rounded-xl border border-slate-200 shadow-2xs transition-all relative z-30",
          stickyToolbar && `${stickyToolbarTop} sticky z-30 shadow-xs`
        )}
      >
        {/* Cụm bên trái: Dropdown Bộ lọc trước, Ô tìm kiếm theo sau - Khống chế 1 hàng duy nhất */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Các Dropdown lọc đa chiều (Loại, Trạng thái, Người phụ trách...) */}
          {filters.map((filter) => (
            <div key={filter.id} className="shrink-0">
              <FacetFilter
                title={filter.title}
                options={filter.options}
                selectedValues={filter.selectedValues}
                onChange={filter.onChange}
                searchable={filter.searchable}
              />
            </div>
          ))}

          {/* Ô tìm kiếm nhanh phong cách Benchmark UI - Tự co dãn linh hoạt, không vỡ dòng */}
          {searchable && (
            <div className="relative flex-1 min-w-[130px] max-w-[240px] shrink">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={currentSearch}
                onChange={handleSearchInput}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
              />
              {currentSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Nút reset bộ lọc nếu có lọc đang bật */}
          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {/* Cụm bên phải: Các icon công cụ bảng chuẩn Benchmark UI */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Nút Làm mới [🔄] */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 transition shadow-2xs"
              title="Làm mới dữ liệu"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Nút Sắp xếp [⇅ Sắp xếp] */}
          <button
            type="button"
            onClick={() => {
              if (columns.length > 0 && onSortChange) {
                const firstSortable = columns.find((c) => c.sortable);
                if (firstSortable) handleHeaderClick(firstSortable);
              }
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-normal transition shadow-2xs"
            title="Đảo chiều sắp xếp"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sắp xếp</span>
          </button>

          {/* Nút Tùy chỉnh cột [▤ Cột] */}
          <ColumnVisibility
            columns={columnItems}
            onChange={setColumnItems}
            onReset={() =>
              setColumnItems(
                columns.map((c) => ({
                  id: c.id,
                  label: typeof c.header === "string" ? c.header : c.id,
                  visible: !c.defaultHidden,
                  permanent: c.permanent,
                }))
              )
            }
          />

          {/* Nút Xuất Excel [📥 Xuất] */}
          <button
            type="button"
            onClick={handleDefaultExport}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-normal transition shadow-2xs"
            title="Xuất file Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Xuất</span>
          </button>

          {/* Nút Nhập Excel [📤 Nhập] */}
          <button
            type="button"
            onClick={handleOpenImport}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-xs font-normal transition shadow-2xs"
            title="Nhập dữ liệu từ Excel / CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Nhập</span>
          </button>

          {/* Nút Thống kê nhanh [📊 Thống kê] */}
          {stats && stats.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStats((prev) => !prev)}
              className={cn(
                "p-1.5 rounded-lg border text-xs transition shadow-2xs",
                showStats
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900"
              )}
              title="Bật/Tắt dải chỉ số tóm tắt"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Primary Action Button (nếu có truyền từ page) */}
          {primaryAction && <div className="shrink-0 ml-1">{primaryAction}</div>}
        </div>
      </div>

      {/* Dải thống kê nhanh (StatBar) khi được bật */}
      {showStats && stats && stats.length > 0 && (
        <div className="animate-in fade-in duration-150">
          <StatBar items={stats} />
        </div>
      )}

      {/* ==========================================
          2. BẢNG DỮ LIỆU CHUẨN BENCHMARK UI
          Sticky Header xám nhạt, viền mỏng, dòng trắng kẻ sát nhau
      ========================================== */}
      <div className="relative z-0 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 max-h-[calc(100vh-215px)] scrollbar-thin">
          <Table>
            {/* Header ghim cố định top */}
            <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-xs">
              <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                {/* Cột Checkbox chọn tất cả */}
                {selectable && (
                  <TableHead className="w-9 px-2.5 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Chọn tất cả các dòng"
                    />
                  </TableHead>
                )}

                {/* Các cột dữ liệu */}
                {visibleColumns.map((col) => {
                  const isSorted = sortColumn === col.id;
                  return (
                    <TableHead
                      key={col.id}
                      onClick={() => handleHeaderClick(col)}
                      className={cn(
                        "text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2 px-3 whitespace-nowrap",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.width,
                        col.sortable && "cursor-pointer select-none hover:text-slate-900 group"
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1",
                          col.align === "right" && "justify-end",
                          col.align === "center" && "justify-center"
                        )}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="shrink-0 text-slate-400 group-hover:text-slate-700 transition">
                            {isSorted ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}

                {/* Cột Thao tác ghim cố định bên phải chuẩn Benchmark UI */}
                {effectiveActions && (
                  <TableHead className="sticky right-0 z-10 bg-slate-50 px-2 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] w-28 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Thao tác
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody>
              {effectiveLoading ? (
                // Trạng thái Skeleton Loading
                Array.from({ length: effectivePagination?.pageSize || 8 }).map((_, rIdx) => (
                  <TableRow key={`skeleton-row-${rIdx}`}>
                    {selectable && (
                      <TableCell className="text-center px-2.5">
                        <Skeleton className="w-4 h-4 mx-auto rounded" />
                      </TableCell>
                    )}
                    {visibleColumns.map((col) => (
                      <TableCell key={`skeleton-col-${col.id}`} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-4/5 rounded" />
                      </TableCell>
                    ))}
                    {effectiveActions && (
                      <TableCell className="sticky right-0 bg-white px-2 text-center shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                        <Skeleton className="h-4 w-16 mx-auto rounded" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                // Trạng thái trống
                <TableRow>
                  <TableCell
                    colSpan={
                      visibleColumns.length +
                      (selectable ? 1 : 0) +
                      (effectiveActions ? 1 : 0)
                    }
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-slate-50 rounded-full text-slate-300 border border-slate-100">
                        <Inbox className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">{emptyMessage}</p>
                      {hasActiveFilters && onResetFilters && (
                        <button
                          type="button"
                          onClick={onResetFilters}
                          className="mt-1 text-xs text-blue-600 hover:underline font-semibold"
                        >
                          Xóa bộ lọc để hiển thị toàn bộ
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Hiển thị danh sách dòng dữ liệu (đã phân trang)
                paginatedData.map((item, index) => {
                  const id = keyExtractor(item);
                  const isSelected = selectedIds.includes(id);
                  const rowActions = effectiveActions
                    ? typeof effectiveActions === "function"
                      ? effectiveActions(item)
                      : effectiveActions
                    : [];

                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        "group transition-colors border-b border-slate-100 hover:bg-slate-50/70",
                        onRowClick && "cursor-pointer",
                        isSelected && "bg-blue-50/40"
                      )}
                    >
                      {/* Checkbox */}
                      {selectable && (
                        <TableCell
                          className="text-center px-2.5 py-2"
                          onClick={(e) => handleToggleRow(id, e)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                            aria-label={`Chọn dòng ${id}`}
                          />
                        </TableCell>
                      )}

                      {/* Các ô dữ liệu */}
                      {visibleColumns.map((col) => {
                        let content: React.ReactNode;
                        if (col.cell) {
                          content = col.cell(item, index);
                        } else if (col.accessorKey) {
                          const val = item[col.accessorKey];
                          content = val !== undefined && val !== null ? String(val) : "-";
                        } else {
                          content = "-";
                        }

                        return (
                          <TableCell
                            key={`${id}-${col.id}`}
                            className={cn(
                              "py-2 px-3 text-xs text-slate-700 whitespace-nowrap",
                              col.align === "right" && "text-right",
                              col.align === "center" && "text-center",
                              col.width
                            )}
                          >
                            {content}
                          </TableCell>
                        );
                      })}

                      {/* Cột Thao tác ghim mép phải */}
                      {effectiveActions && (
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "sticky right-0 z-10 px-2 py-1.5 text-center whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]",
                            isSelected
                              ? "bg-blue-50/40"
                              : "bg-white group-hover:bg-slate-50/70"
                          )}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {rowActions.map((act, actIdx) => {
                              const isHidden = typeof act.hidden === "function" ? act.hidden(item) : act.hidden;
                              if (isHidden) return null;
                              const isDisabled = typeof act.disabled === "function" ? act.disabled(item) : act.disabled;
                              return (
                                <button
                                  key={`act-${actIdx}`}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => act.onClick(item)}
                                  title={act.title}
                                  className={cn(
                                    "p-1 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed",
                                    act.danger
                                      ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                  )}
                                >
                                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                                    {act.icon}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ==========================================
            3. THANH PHÂN TRANG GHIM ĐÁY (Sticky Pagination)
        ========================================== */}
        {effectivePagination && (
          <Pagination
            page={effectivePagination.page}
            pageSize={effectivePagination.pageSize}
            totalItems={effectivePagination.totalItems}
            onPageChange={effectivePagination.onPageChange}
            onPageSizeChange={effectivePagination.onPageSizeChange}
            pageSizeOptions={effectivePagination.pageSizeOptions || [10, 20, 50, 100]}
            sticky={true}
          />
        )}
      </div>

      {/* ==========================================
          4. MODAL NHẬP FILE EXCEL / CSV CHUẨN ERP
      ========================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập Dữ Liệu Từ Tệp Excel / CSV"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Hệ thống hỗ trợ nhập dữ liệu hàng loạt từ file Excel (.xlsx, .xls) hoặc CSV (.csv). Vui lòng sử dụng tệp mẫu để đảm bảo đúng định dạng cột.
          </p>

          {/* Vùng kéo thả file */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/30">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImportFile(e.target.files[0]);
                }
              }}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center">
              <FileSpreadsheet className="w-10 h-10 text-emerald-600 mb-2" />
              {importFile ? (
                <div>
                  <p className="text-xs font-bold text-slate-800">{importFile.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {(importFile.size / 1024).toFixed(1)} KB • Bấm để chọn file khác
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Kéo thả file vào đây hoặc <span className="text-blue-600 underline">chọn tệp từ máy tính</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Định dạng hỗ trợ: .XLSX, .XLS, .CSV</p>
                </div>
              )}
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDefaultExport}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Tải mẫu file Excel chuẩn (.csv)
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                disabled={!importFile}
              >
                Tiến hành nhập dữ liệu
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
