'use client';
import {useRef,useState} from 'react';
import {toast} from '@/components/ui';
export async function readJson(url:string,init?:RequestInit){const r=await fetch(url,init),data=await r.json();if(!r.ok)throw new Error(data.error || data.details || 'Không thể tải dữ liệu');return data;}
export function useWorkflowMutation(){
 const [busy,setBusy]=useState(false),pending=useRef(new Map<string,string>()),inFlight=useRef(false);
 async function mutate(url:string,body:any,method='POST'){
  if(inFlight.current)throw new Error('Đang xử lý thao tác trước');
  const key=JSON.stringify({url,method,body});let requestId=pending.current.get(key);if(!requestId){requestId=crypto.randomUUID();pending.current.set(key,requestId);}
  inFlight.current=true;setBusy(true);
  try{const result=await readJson(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,requestId})});pending.current.delete(key);return result;}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function run(fn:()=>Promise<void>){try{await fn();}catch(e:any){toast.error(e.message || 'Thao tác thất bại');}}
 return {busy,mutate,run};
}
export const fieldClass='h-8 rounded border border-slate-300 bg-white px-2 text-xs w-full';
export const statusLabels:Record<string,string>={draft:'Nháp / Chờ duyệt',released:'Chờ cấp vật tư',in_progress:'Đang sản xuất',completed:'Hoàn tất',cancelled:'Đã hủy',waiting_materials:'Chưa cấp đủ NVL',ready:'Đã cấp đủ NVL',rework:'Cần sửa',submitted:'Chờ duyệt',approved:'Đã duyệt',reversed:'Đã đảo',applied:'Đã chốt',passed:'Đạt',failed:'Có lỗi',todo:'Chưa làm',doing:'Đang làm',done:'Hoàn thành'};
