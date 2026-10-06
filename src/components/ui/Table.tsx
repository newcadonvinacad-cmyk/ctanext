import * as React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  noWrapper?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, noWrapper, ...props }, ref) => {
    const tableElem = (
      <table
        ref={ref}
        className={cn("w-full min-w-full caption-bottom text-xs text-left border-collapse", className)}
        {...props}
      />
    );

    if (noWrapper) return tableElem;

    return (
      <div className={cn("relative w-full h-full min-h-full overflow-auto", containerClassName)}>
        {tableElem}
      </div>
    );
  }
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-slate-50 border-b border-slate-200 sticky top-0 z-10", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-slate-100 bg-white font-normal", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-slate-50 font-medium", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-blue-50/60 whitespace-nowrap",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-3 text-left align-middle font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap select-none",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "py-2.5 px-3 align-middle text-slate-800 text-xs whitespace-nowrap",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

import { LogoProgressLoader } from "./LogoProgressLoader";

export interface TableLoadingOverlayProps {
  isLoading: boolean;
  title?: string;
  statusText?: string;
  size?: "sm" | "md";
  className?: string;
}

export function TableLoadingOverlay({
  isLoading,
  title = "ĐANG TẢI DỮ LIỆU",
  statusText = "Đang đồng bộ dữ liệu bảng...",
  size = "md",
  className,
}: TableLoadingOverlayProps) {
  const [show, setShow] = React.useState(isLoading);

  React.useEffect(() => {
    if (isLoading) setShow(true);
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs transition-opacity duration-300",
        !isLoading && "pointer-events-none",
        className
      )}
    >
      <LogoProgressLoader
        variant="inline"
        size={size}
        title={title}
        statusText={statusText}
        isLoaded={!isLoading}
        fadeOnComplete={true}
        onFadedOut={() => setShow(false)}
      />
    </div>
  );
}

