'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import type { ParameterValues, ProductBomCatalogItem } from '@/lib/product-bom';
import { bomField, bomJson, ParameterValuesForm } from '@/components/vat-tu/ParameterFields';
export interface SurveyItemFormState {
 id?:string; templateId:string; productItemId?:string|null; parameterSchemaId?:string|null; parameterValues?:ParameterValues;
 itemTitle:string; quantity:number; widthMeters:number; heightMeters:number; depthMeters:number;
 parameters:Record<string,any>; selectedSpecs:Record<string,string>; designatedItemText?:string; notes?:string; estimatedCost?:number; bomLines?:any[];
}
export function getDefaultSpecsForTemplate(signageType='alu_letters'):Record<string,string> {
 if(['lightbox_3m','lightbox_blade'].includes(signageType))return {frame:'NHOM-DINH-HINH',face:'BAT-3M-UV',lighting:'LED-NC-12W',power:'NGUON-MEANWELL-400W',letters:'NONE'};
 if(['canvas_hiflex','repair_service'].includes(signageType))return {frame:'SAT-HOP-20',face:'BAT-HIFLEX-UV',lighting:'NONE',power:'NONE',letters:'NONE'};
 if(signageType==='letters_logo')return {frame:'KHONG-KHUNG',face:'NONE',lighting:'LED-NC-12W',power:'NGUON-MEANWELL-400W',letters:'MICA-UON-CHAN'};
 return {frame:'SAT-HOP-25',face:'ALU-ALCO-3MM',lighting:'LED-NC-12W',power:'NGUON-MEANWELL-400W',letters:'MICA-UON-CHAN'};
}
export function SurveyItemsManager({items,onChange,productTemplates}:{items:SurveyItemFormState[];onChange:(v:SurveyItemFormState[])=>void;productTemplates:any[]}) {
 const [catalog,setCatalog]=useState<ProductBomCatalogItem[]>([]),[schemas,setSchemas]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;bomJson('/api/product-boms/catalog').then(d=>{if(active){setCatalog(d.catalog);setSchemas(d.schemas);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 const update=(n:number,p:Partial<SurveyItemFormState>)=>onChange(items.map((i,k)=>k===n?{...i,...p}:i));
 return <div className="space-y-3 text-xs"><p className="text-slate-600">Chọn thành phẩm và nhập số đo thực tế. Đề xuất NVL được lập và duyệt tại dự án sau khi lưu khảo sát.</p>{error&&<p role="alert" className="text-rose-600">{error}</p>}
 {items.map((item,n)=>{
   const p=catalog.find(p=>p.id===item.productItemId),schema=schemas.find(s=>s.id===item.parameterSchemaId),tpl=productTemplates.find(t=>t.id===item.templateId);
   return <div key={item.id || n} className="rounded-lg border border-slate-200 p-3 space-y-3"><div className="grid md:grid-cols-3 gap-3">
     <label>Thành phẩm<select aria-label={`Thành phẩm khảo sát ${n+1}`} className={bomField} value={item.productItemId?`product:${item.productItemId}`:item.templateId?`legacy:${item.templateId}`:''} onChange={e=>{
       const [kind,id]=e.target.value.split(':');if(kind==='product'){const p=catalog.find(i=>i.id===id);update(n,{productItemId:id,parameterSchemaId:p?.schemaId || null,parameterValues:{},templateId:'',widthMeters:0,heightMeters:0,depthMeters:0,parameters:{},selectedSpecs:{},estimatedCost:0,bomLines:[]});}
       else update(n,{productItemId:null,parameterSchemaId:null,parameterValues:{},templateId:kind==='legacy'?id:'',estimatedCost:0,bomLines:[]});
     }}><option value="">Chọn thành phẩm</option><optgroup label="Thành phẩm trong danh mục">{catalog.filter(i=>i.kind==='product').map(p=><option key={p.id} value={`product:${p.id}`}>{p.code} · {p.name}</option>)}</optgroup>{item.templateId&&<optgroup label="Mẫu công thức cũ của hạng mục">{productTemplates.filter(t=>t.id===item.templateId).map(t=><option key={t.id} value={`legacy:${t.id}`}>{t.name}</option>)}</optgroup>}</select></label>
     <label>Hạng mục / Vị trí<input className={bomField} value={item.itemTitle} onChange={e=>update(n,{itemTitle:e.target.value})}/></label><label>Số lượng thành phẩm<input className={bomField} type="number" min="0.01" step="any" value={item.quantity} onChange={e=>update(n,{quantity:Number(e.target.value)})}/></label>
   </div>
   {item.productItemId?<><p className="text-slate-500">Thông số v{schema?.version || p?.schemaVersion} · Đơn vị thành phẩm: {p?.units[0]?.name}</p>{!schema && !p?.schemaId?<p className="text-amber-700">Thành phẩm chưa khai báo bộ thông số. Sửa tại mục Vật tư trước khi lưu khảo sát.</p>:<ParameterValuesForm definitions={schema?.definitions || p?.definitions || []} value={item.parameterValues || {}} onChange={v=>update(n,{parameterValues:v})}/>}</>:
   <div className="grid grid-cols-3 gap-2">{(['widthMeters','heightMeters','depthMeters'] as const).map((k,i)=><label key={k}>{['Ngang (m)','Cao (m)','Sâu (m)'][i]}<input className={bomField} type="number" step="any" value={item[k] != null ? Math.round(Number(item[k]) * 100) / 100 : ''} onChange={e=>update(n,{[k]:Number(e.target.value)})}/></label>)}{tpl?.parameterSchema?.filter((d:any)=>!['w','h','d'].includes(d.key)).map((d:any)=><label key={d.key}>{d.label}<input className={bomField} value={String(item.parameters[d.key] ?? '')} onChange={e=>update(n,{parameters:{...item.parameters,[d.key]:d.type==='number'?Number(e.target.value):d.type==='boolean'?e.target.value==='true':e.target.value}})}/></label>)}</div>}
   <div className="grid md:grid-cols-2 gap-3"><label>Vật tư / Quy cách chỉ định<input className={bomField} value={item.designatedItemText || ''} onChange={e=>update(n,{designatedItemText:e.target.value})}/></label><label>Ghi chú kỹ thuật<textarea className={bomField} value={item.notes || ''} onChange={e=>update(n,{notes:e.target.value})}/></label></div>
   <button type="button" className="text-rose-600" onClick={()=>onChange(items.filter((_,i)=>i!==n))}>Xóa hạng mục</button>
   </div>;
 })}<Button type="button" size="sm" variant="secondary" onClick={()=>onChange([...items,{templateId:'',itemTitle:`Hạng mục ${items.length+1}`,quantity:1,widthMeters:0,heightMeters:0,depthMeters:0,parameters:{},selectedSpecs:{}}])}>Thêm hạng mục khảo sát</Button></div>;
}
