'use client';
import type { ParameterDefinition, ParameterValues, ProductBomCatalogItem, ProductBomLine } from '@/lib/product-bom';
export const bomField='w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs';
export async function bomJson(url:string,init?:RequestInit) {
  const r=await fetch(url,init),d=await r.json();if(!r.ok)throw new Error(d.error || d.details || 'Không thể tải/lưu dữ liệu');return d;
}
export function ParameterSchemaEditor({value,onChange}:{value:ParameterDefinition[];onChange:(v:ParameterDefinition[])=>void}) {
  const update=(i:number,p:Partial<ParameterDefinition>)=>onChange(value.map((d,n)=>n===i?{...d,...p}:d));
  return <div className="space-y-2 text-xs"><p className="text-slate-500">Khai báo tên, kiểu và đơn vị của thông số. Giá trị thực tế nhập tại BOM mẫu và khảo sát.</p>
    {value.map((d,i)=><div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded bg-slate-50 p-2">
      <label>Mã<input aria-label={`Mã thông số ${i+1}`} className={bomField} value={d.key} placeholder="a" onChange={e=>update(i,{key:e.target.value})}/></label>
      <label>Tên<input aria-label={`Tên thông số ${i+1}`} className={bomField} value={d.label} placeholder="Chiều dài" onChange={e=>update(i,{label:e.target.value})}/></label>
      <label>Kiểu<select className={bomField} value={d.type} onChange={e=>update(i,{type:e.target.value as ParameterDefinition['type'],min:undefined,max:undefined})}><option value="number">Số</option><option value="text">Văn bản</option><option value="boolean">Có / Không</option></select></label>
      <label>Đơn vị<input className={bomField} value={d.unit || ''} placeholder="mm" onChange={e=>update(i,{unit:e.target.value})}/></label>
      <div className="flex gap-1">{d.type==='number' && <><label>Min<input className={bomField} type="number" step="any" value={d.min ?? ''} onChange={e=>update(i,{min:e.target.value===''?undefined:Number(e.target.value)})}/></label><label>Max<input className={bomField} type="number" step="any" value={d.max ?? ''} onChange={e=>update(i,{max:e.target.value===''?undefined:Number(e.target.value)})}/></label></>}</div>
      <div className="flex items-center justify-between gap-1"><label><input type="checkbox" checked={d.required} onChange={e=>update(i,{required:e.target.checked})}/> Bắt buộc</label><button type="button" className="text-rose-600" onClick={()=>onChange(value.filter((_,n)=>n!==i))}>Xóa</button></div>
    </div>)}<button type="button" className="text-blue-700 font-semibold" onClick={()=>onChange([...value,{key:'',label:'',type:'number',required:true}])}>+ Thêm thông số thành phẩm</button></div>;
}
export function ParameterValuesForm({definitions,value,onChange,readOnly=false}:{definitions:ParameterDefinition[];value:ParameterValues;onChange:(v:ParameterValues)=>void;readOnly?:boolean}) {
  const change=(key:string,v:number|string|boolean|undefined)=>{const next={...value};if(v===undefined)delete next[key];else next[key]=v;onChange(next);};
  return <fieldset disabled={readOnly} className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">{definitions.map(d=><label key={d.key}>{d.label}{d.unit?` (${d.unit})`:''}{d.required?' *':''}
    {d.type==='boolean'?<select aria-label={`${d.label}${d.unit?` (${d.unit})`:''}${d.required?' *':''}`} className={bomField} value={value[d.key]===undefined?'':String(value[d.key])} onChange={e=>change(d.key,e.target.value===''?undefined:e.target.value==='true')}><option value="">Chưa nhập</option><option value="true">Có</option><option value="false">Không</option></select>:
      <input aria-label={`${d.label}${d.unit?` (${d.unit})`:''}${d.required?' *':''}`} className={bomField} type={d.type==='number'?'number':'text'} step="any" min={d.min} max={d.max} value={value[d.key]===undefined?'':String(value[d.key])} onChange={e=>change(d.key,e.target.value===''?undefined:d.type==='number'?Number(e.target.value):e.target.value)}/>}
  </label>)}</fieldset>;
}
export function ProductBomLinesEditor({lines,catalog,onChange,readOnly=false,quantity=1}:{lines:ProductBomLine[];catalog:ProductBomCatalogItem[];onChange:(v:ProductBomLine[])=>void;readOnly?:boolean;quantity?:number}) {
  const update=(n:number,p:Partial<ProductBomLine>)=>onChange(lines.map((l,i)=>i===n?{...l,...p}:l));
  const materials=catalog.filter(i=>['material','service'].includes(i.kind));
  return <div className="space-y-2 text-xs"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-slate-500"><th>NVL / Dịch vụ</th><th>Đơn vị</th><th>Định mức / 1 TP</th><th>Hao hụt %</th><th>Tổng nhu cầu</th><th>Ghi chú</th><th/></tr></thead><tbody>{lines.map((l,n)=>{
    const item=catalog.find(i=>i.id===l.itemId);return <tr key={n} className="border-t"><td className="min-w-48 py-2"><select disabled={readOnly} aria-label={`NVL dòng ${n+1}`} className={bomField} value={l.itemId} onChange={e=>{const i=materials.find(i=>i.id===e.target.value);update(n,{itemId:e.target.value,unitId:i?.baseUnitId || ''});}}><option value="">Chọn NVL / dịch vụ</option>{materials.map(i=><option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}</select></td>
    <td><select disabled={readOnly} className={bomField} value={l.unitId} onChange={e=>update(n,{unitId:e.target.value})}><option value="">Chọn đơn vị</option>{item?.units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></td>
    <td><input aria-label={`Định mức dòng ${n+1}`} disabled={readOnly} type="number" step="any" min="0" className={bomField} value={l.quantity} onChange={e=>update(n,{quantity:Number(e.target.value)})}/></td>
    <td><input disabled={readOnly} type="number" min="0" max="100" step="any" className={bomField} value={l.wasteRate} onChange={e=>update(n,{wasteRate:Number(e.target.value)})}/></td>
    <td className="px-2 whitespace-nowrap">{(l.quantity*(1+l.wasteRate/100)*quantity).toLocaleString('vi-VN',{maximumFractionDigits:6})}</td>
    <td><input disabled={readOnly} className={bomField} value={l.notes} onChange={e=>update(n,{notes:e.target.value})}/></td><td>{!readOnly&&<button type="button" className="px-2 text-rose-600" onClick={()=>onChange(lines.filter((_,i)=>i!==n))}>Xóa</button>}</td></tr>;
  })}</tbody></table></div>{!readOnly&&<button type="button" className="font-semibold text-blue-700" onClick={()=>onChange([...lines,{itemId:'',unitId:'',quantity:1,wasteRate:0,notes:''}])}>+ Thêm dòng</button>}<p className="text-slate-500">Định mức trước hao hụt, tính trên một đơn vị cơ sở thành phẩm. Dịch vụ được lưu làm tham chiếu, không xuất kho.</p></div>;
}
