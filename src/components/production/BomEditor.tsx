'use client';
import {useEffect,useState} from 'react';
import {Button,toast} from '@/components/ui';
import {readJson,useWorkflowMutation,fieldClass,statusLabels} from './client';
export function BomEditor({id,meta,onSaved}:{id:string;meta:any;onSaved:(id:string)=>void}){
 const [bom,setBom]=useState<any>(null),[lines,setLines]=useState<any[]>([]),[title,setTitle]=useState(''),[notes,setNotes]=useState(''),[error,setError]=useState(''),[designProofId,setDesignProofId]=useState('');
 const {busy,mutate,run}=useWorkflowMutation();
 const load=async()=>{try{const d=await readJson(`/api/bom/${id}/production`);setBom(d.bom);setTitle(d.bom.title);setNotes(d.bom.notes);setLines(d.bom.lines.map((l:any)=>({id:l.id,representativeId:l.representative_id,description:l.description,itemId:l.item_id || '',unitId:l.unit_id || '',quantity:Number(l.quantity),wasteRate:Number(l.waste_rate),notes:l.notes})));setError('');}catch(e:any){setError(e.message);}};
 useEffect(()=>{void load();},[id]);
 if(error)return <p role="alert" className="p-4 text-sm text-red-600">{error}</p>;
 if(!bom)return <p className="p-4 text-xs">Đang tải BOM…</p>;
 const editable=bom.status==='draft' && meta.capabilities?.['production_order.update'];
 const change=(i:number,values:any)=>setLines(v=>v.map((l,n)=>n===i?{...l,...values}:l));
 return <div className="space-y-3 text-xs">
  <div className="flex items-center justify-between"><span>{bom.code} · Phiên bản {bom.revision_no} · {statusLabels[bom.status] || bom.status} · {bom.width_meters} × {bom.height_meters} m</span>
   <Button size="sm" disabled={busy || !meta.capabilities?.['production_order.update']} onClick={()=>run(async()=>{const r=await mutate(`/api/bom/${id}/production`,{action:'revise'});onSaved(r.bomId);toast.success('Đã tạo phiên bản BOM mới');})}>Tạo phiên bản mới</Button></div>
  {!bom.design_proof_id && <label className="block">BOM cũ: chọn maket đã duyệt để hoàn thiện nguồn<select aria-label="Maket cho BOM cũ" className={fieldClass} value={designProofId} disabled={!editable} onChange={e=>setDesignProofId(e.target.value)}><option value="">Chưa gắn maket / khảo sát</option>{meta.designs.filter((d:any)=>d.project_id===bom.project_id).map((d:any)=><option key={d.id} value={d.id}>{d.code} · {d.title}</option>)}</select></label>}
  <label className="block">Tên BOM<input aria-label="Tên BOM" className={fieldClass} value={title} disabled={!editable} onChange={e=>setTitle(e.target.value)}/></label>
  <div className="overflow-x-auto"><table className="w-full text-xs border-collapse"><thead className="bg-slate-100"><tr>{['Đại diện','Nhu cầu thiết kế','Vật tư kho','Đơn vị','SL / BOM','Hao hụt %',''].map(x=><th key={x} className="p-2 text-left whitespace-nowrap">{x}</th>)}</tr></thead><tbody>
   {lines.map((l,i)=>{const item=meta.items.find((x:any)=>x.id===l.itemId);return <tr key={l.id || i} className="border-b align-top">
    <td className="p-1 min-w-36"><select aria-label={`Đại diện ${i+1}`} disabled={!editable} className={fieldClass} value={l.representativeId} onChange={e=>change(i,{representativeId:e.target.value})}><option value="">Chọn đại diện</option>{meta.representatives.map((r:any)=><option key={r.id} value={r.id}>{r.name}{r.specification_key?` · ${r.specification_key}`:''}</option>)}</select></td>
    <td className="p-1 min-w-44"><input aria-label={`Nhu cầu ${i+1}`} className={fieldClass} disabled={!editable} value={l.description} onChange={e=>change(i,{description:e.target.value})}/><input aria-label={`Ghi chú ${i+1}`} className={`${fieldClass} mt-1`} disabled={!editable} value={l.notes} onChange={e=>change(i,{notes:e.target.value})}/></td>
    <td className="p-1 min-w-60"><select aria-label={`Vật tư ${i+1}`} disabled={!editable} className={fieldClass} value={l.itemId} onChange={e=>change(i,{itemId:e.target.value,unitId:''})}><option value="">Chưa gán vật tư</option>{meta.items.filter((x:any)=>x.isActive && !['service','tool'].includes(x.kind)).map((x:any)=><option key={x.id} value={x.id}>{x.code} · {x.name}{x.bom?.length?' · Có BOM':''}</option>)}</select></td>
    <td className="p-1 min-w-28"><select aria-label={`Đơn vị ${i+1}`} className={fieldClass} disabled={!editable} value={l.unitId} onChange={e=>change(i,{unitId:e.target.value})}><option value="">Chọn đơn vị</option>{item?.conversions.map((u:any)=><option key={u.unitId} value={u.unitId}>{u.unitName || u.unitCode} · ×{u.factor}</option>)}</select></td>
    <td className="p-1 w-24"><input aria-label={`Số lượng ${i+1}`} className={fieldClass} disabled={!editable} type="number" min="0.000001" step="any" value={l.quantity} onChange={e=>change(i,{quantity:Number(e.target.value)})}/></td>
    <td className="p-1 w-24"><input aria-label={`Hao hụt ${i+1}`} className={fieldClass} disabled={!editable} type="number" min="0" max="100" step="any" value={l.wasteRate} onChange={e=>change(i,{wasteRate:Number(e.target.value)})}/></td>
    <td className="p-1"><Button variant="ghost" disabled={!editable} onClick={()=>setLines(v=>v.filter((_,n)=>n!==i))}>Xóa</Button></td>
   </tr>;})}
  </tbody></table></div>
  {editable && <Button size="sm" variant="secondary" onClick={()=>setLines(v=>[...v,{representativeId:'',description:'',itemId:'',unitId:'',quantity:1,wasteRate:0,notes:''}])}>Thêm nhu cầu</Button>}
  <label className="block">Ghi chú chung<textarea aria-label="Ghi chú BOM" className={`${fieldClass} h-16`} disabled={!editable} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  {bom.expansionError && <p className="text-amber-700" role="status">Cần hoàn thiện gán: {bom.expansionError}</p>}
  <div className="border rounded p-2"><strong>NVL triển khai · tồn khả dụng tổng các kho</strong>{bom.expanded.length===0?<p className="mt-1 text-slate-500">Lưu gán đầy đủ để xem danh sách NVL.</p>:<table className="w-full mt-2"><thead><tr><th className="text-left">Vật tư</th><th>Cần / BOM</th><th>Còn khả dụng</th><th>Thiếu</th></tr></thead><tbody>{bom.expanded.map((m:any)=>{const item=meta.items.find((x:any)=>x.id===m.itemId);const available=Number(bom.lines.find((l:any)=>l.item_id===m.itemId)?.available_base_qty ?? bom.materialAvailability?.[m.itemId] ?? 0);return <tr key={m.itemId}><td>{item?.code} · {item?.name}</td><td className="text-center">{m.baseQty}</td><td className="text-center">{available}</td><td className="text-center text-amber-700">{Math.max(0,m.baseQty-available)}</td></tr>;})}</tbody></table>}</div>
  <div className="flex justify-end"><Button disabled={busy || !editable} onClick={()=>run(async()=>{await mutate(`/api/bom/${id}/production`,{title,notes,lines,designProofId:designProofId || undefined},'PUT');await load();onSaved(id);toast.success('Đã lưu BOM và đối chiếu vật tư');})}>Lưu BOM</Button></div>
 </div>;
}
