"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export const controlClass = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-500";
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-xs font-medium text-slate-600"><span>{label}</span>{children}</label>;
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p> : null;
}
export async function inventoryRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Không thể xử lý yêu cầu (${response.status})`);
  return data as T;
}

export interface InventoryColumn<T> {
  key: string; label: string; render: (row: T) => React.ReactNode;
  sort?: (row: T) => string | number; numeric?: boolean;
}
export function InventoryTable<T>({ rows, columns, rowKey, loading, empty = "Không có dữ liệu phù hợp", search, onSearch, onRefresh, tools }: {
  rows: T[]; columns: InventoryColumn<T>[]; rowKey: (row:T)=>string; loading: boolean; empty?:string;
  search:string; onSearch:(value:string)=>void; onRefresh:()=>void; tools?:React.ReactNode;
}) {
  const [page,setPage]=React.useState(1);
  const [pageSize,setPageSize]=React.useState(20);
  const [sort,setSort]=React.useState<{key:string;desc:boolean}|null>(null);
  React.useEffect(()=>setPage(1),[rows,pageSize]);
  const sorted=React.useMemo(()=>{
    const col=columns.find(c=>c.key===sort?.key);
    if (!col?.sort || !sort) return rows;
    const value=col.sort;
    return [...rows].sort((a,b)=>{
      const av=value(a),bv=value(b);
      return (typeof av==='number' && typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),'vi',{numeric:true}))*(sort.desc?-1:1);
    });
  },[rows,columns,sort]);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));
  const current=Math.min(page,pages);
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-3">
      <div className="relative w-full sm:w-64">
        <Search strokeWidth={1.5} className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input aria-label="Tìm kiếm" placeholder="Tìm theo mã hoặc tên…" value={search} onChange={e=>onSearch(e.target.value)} className={`${controlClass} pl-9`} />
      </div>
      {tools}
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="sm:ml-auto"><RefreshCw strokeWidth={1.5} className="h-4 w-4" />Làm mới</Button>
    </div>
    <div className="overflow-x-auto" aria-busy={loading}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600"><tr>{columns.map(c=><th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-medium ${c.numeric?'text-right':''}`} aria-sort={sort?.key===c.key?(sort.desc?'descending':'ascending'):undefined}>
          {c.sort ? <button type="button" onClick={()=>{setSort({key:c.key,desc:sort?.key===c.key?!sort.desc:false});setPage(1);}} className="inline-flex items-center gap-1">{c.label}{sort?.key===c.key && (sort.desc?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>)}</button>:c.label}
        </th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? <tr><td colSpan={columns.length} className="p-10 text-center text-slate-500">Đang tải dữ liệu…</td></tr> : !rows.length ? <tr><td colSpan={columns.length} className="p-10 text-center text-slate-500">{empty}</td></tr> : sorted.slice((current-1)*pageSize,current*pageSize).map(r=><tr key={rowKey(r)} className="hover:bg-slate-50">{columns.map(c=><td key={c.key} className={`px-4 py-3 text-slate-700 ${c.numeric?'text-right tabular-nums':''}`}><div className="max-w-md">{c.render(r)}</div></td>)}</tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
      <span>{rows.length} bản ghi</span><select aria-label="Số dòng mỗi trang" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="rounded border border-slate-200 bg-white p-1">{[20,50,100].map(n=><option key={n} value={n}>{n} dòng</option>)}</select>
      <div className="ml-auto flex items-center gap-3"><Button size="sm" variant="ghost" disabled={current===1||loading} onClick={()=>setPage(current-1)}>Trước</Button><span>Trang {current}/{pages}</span><Button size="sm" variant="ghost" disabled={current===pages||loading} onClick={()=>setPage(current+1)}>Sau</Button></div>
    </div>
  </div>;
}
