'use client';
import { useEffect, useState } from 'react';
import { Button, Modal, toast } from '@/components/ui';
import { useAuthorization } from '@/hooks/use-authorization';
import type { ProductBomCatalogItem, ProductBomSample } from '@/lib/product-bom';
import { bomField, bomJson, ParameterValuesForm, ProductBomLinesEditor } from './ParameterFields';
export function BomTab() {
  const {can}=useAuthorization();
  const [data,setData]=useState<{catalog:ProductBomCatalogItem[];samples:ProductBomSample[];schemas:any[]}>({catalog:[],samples:[],schemas:[]});
  const [productId,setProductId]=useState(''),[editing,setEditing]=useState<Partial<ProductBomSample>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=()=>bomJson('/api/product-boms').then(d=>{setData(d);setError('');}).catch(e=>setError(e.message));
  useEffect(()=>{void load();},[]);
  const product=data.catalog.find(p=>p.id===(editing?.productItemId || productId));
  const schema=data.schemas.find(s=>s.id===editing?.schemaId);
  const readOnly=editing?.status==='confirmed' || editing?.status==='archived' || !can('item.update');
  const products=data.catalog.filter(i=>i.kind==='product');
  const open=(sample?:ProductBomSample,copy=false)=>{
    const p=data.catalog.find(p=>p.id===(sample?.productItemId || productId));
    if(!p?.schemaId){toast.error('Khai báo bộ thông số khi sửa thành phẩm trước khi tạo BOM mẫu');return;}
    const legacyLines=sample?.legacySource && Array.isArray(sample.legacySource)?sample.legacySource.map((l:any)=>{
      const i=data.catalog.find(i=>i.id===l.itemId),u=i?.units.find(u=>u.id===l.unitId || u.name===l.unit);
      return {itemId:i?.id || '',unitId:u?.id || '',quantity:Number(l.quantity)||0,wasteRate:Number(l.wasteRate)||0,notes:l.note || l.notes || ''};
    }):[];
    setEditing(sample?{...sample,...(copy?{id:undefined,version:undefined,name:sample.name+' (bản sao)',status:'draft' as const,parameterValues:sample.schemaId===p.schemaId?sample.parameterValues:{}}:{}),schemaId:copy?p.schemaId:sample.schemaId || p.schemaId,lines:sample.lines.length?sample.lines:legacyLines}:{productItemId:p.id,schemaId:p.schemaId,name:p.name+' – BOM mẫu',parameterValues:{},lines:[],notes:''});
  };
  const save=async(confirm:boolean)=>{if(!editing)return;setBusy(true);try{await bomJson('/api/product-boms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editing,confirm,requestId:crypto.randomUUID()})});setEditing(null);await load();toast.success(confirm?'Đã xác nhận BOM mẫu':'Đã lưu bản nháp');}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  return <div className="space-y-4 text-xs"><div className="flex flex-wrap items-end gap-3"><label className="flex-1">Thành phẩm<select className={bomField} value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Tất cả thành phẩm</option>{products.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>{can('item.update')&&<Button size="sm" disabled={!productId} onClick={()=>open()}>Tạo BOM mẫu</Button>}</div>
    <p className="text-slate-600">Mỗi thành phẩm có nhiều BOM mẫu theo giá trị thông số. Chỉ mẫu đã xác nhận được dùng để lập đề xuất NVL.</p>{error&&<p role="alert" className="text-rose-600">{error}</p>}
    {!data.samples.filter(s=>!productId||s.productItemId===productId).length&&<p className="p-6 text-center text-slate-500">Chưa có BOM mẫu. Chọn thành phẩm để tạo mẫu đầu tiên.</p>}
    {data.samples.filter(s=>!productId||s.productItemId===productId).map(s=><div key={s.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-3"><div className="flex-1"><strong>{s.name}</strong><p className="text-slate-500">{data.catalog.find(p=>p.id===s.productItemId)?.code} · {s.status==='confirmed'?'Đã xác nhận':s.status==='archived'?'Ngừng sử dụng':'Bản nháp'} · {s.lines.length} dòng</p><p>{Object.entries(s.parameterValues).map(([k,v])=>`${k}=${v}`).join(' · ')}</p>{!s.schemaId&&<p className="text-amber-700">BOM cũ cần bổ sung thông số và rà soát đơn vị</p>}</div>
      <Button size="sm" variant="secondary" onClick={()=>open(s)}>{s.status==='draft'&&can('item.update')?'Sửa nháp':'Xem mẫu'}</Button>{can('item.update')&&<Button size="sm" variant="secondary" onClick={()=>open(s,true)}>Sao chép</Button>}{can('item.update')&&s.status!=='archived'&&<Button size="sm" variant="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await bomJson('/api/product-boms',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,version:s.version,requestId:crypto.randomUUID()})});await load();}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}}>Ngừng sử dụng</Button>}</div>)}
    <Modal isOpen={!!editing} onClose={()=>setEditing(null)} title="BOM mẫu thành phẩm" maxWidth="5xl">{editing&&<div className="space-y-4"><p className="text-xs text-slate-500">{product?.name} · Bộ thông số v{schema?.version || product?.schemaVersion} · Định mức cho 1 {product?.units.find(u=>u.id===product.baseUnitId)?.name} thành phẩm</p><label className="text-xs">Tên BOM mẫu<input disabled={readOnly} className={bomField} value={editing.name || ''} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
      <ParameterValuesForm definitions={schema?.definitions || product?.definitions || []} value={editing.parameterValues || {}} onChange={v=>setEditing({...editing,parameterValues:v})} readOnly={readOnly}/>
      <ProductBomLinesEditor catalog={data.catalog} lines={editing.lines || []} onChange={v=>setEditing({...editing,lines:v})} readOnly={readOnly}/>
      <label className="text-xs">Ghi chú<textarea disabled={readOnly} className={bomField} value={editing.notes || ''} onChange={e=>setEditing({...editing,notes:e.target.value})}/></label>
      {!readOnly&&<div className="flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={()=>save(false)}>Lưu nháp</Button><Button size="sm" disabled={busy} onClick={()=>save(true)}>Xác nhận mẫu</Button></div>}</div>}</Modal>
  </div>;
}
