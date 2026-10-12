'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Modal, toast } from '@/components/ui';
import { useAuthorization } from '@/hooks/use-authorization';
import type { ProductBomCatalogItem, ProductBomLine } from '@/lib/product-bom';
import { bomJson, bomField, ProductBomLinesEditor } from '@/components/vat-tu/ParameterFields';
export function MaterialProposalPanel({projectId,surveys}:{projectId:string;surveys:any[]}) {
  const {can}=useAuthorization();
  const [proposals,setProposals]=useState<any[]>([]),[catalog,setCatalog]=useState<ProductBomCatalogItem[]>([]),[surveyItemId,setSurveyItemId]=useState('');
  const [selected,setSelected]=useState<any>(null),[lines,setLines]=useState<ProductBomLine[]>([]),[reviewNotes,setReviewNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=async()=>{try{const p=await bomJson(`/api/projects/${projectId}/material-proposals`);setProposals(p.proposals);setCatalog(p.catalog);setError('');}catch(e:any){setError(e.message);}};
  useEffect(()=>{void load();},[projectId]);
  const items=surveys.flatMap(s=>(s.items || []).filter((i:any)=>i.productItemId).map((i:any)=>({...i,surveyTitle:s.title})));
  const open=(p:any)=>{setSelected(p);setLines(p.lines);setReviewNotes(p.review_notes || '');};
  const orderLink=(p:any)=>p.production_order_id?(can('production_order.read')?<Link className="font-semibold text-blue-700" href={`/san-xuat/${p.production_order_id}`}>Mở lệnh sản xuất</Link>:null):p.bom_id&&can('production_order.create')?<Link className="font-semibold text-blue-700" href={`/san-xuat?projectId=${projectId}&draftBomId=${p.bom_id}`}>Lập lệnh sản xuất</Link>:null;
  const generate=async()=>{setBusy(true);try{const d=await bomJson(`/api/projects/${projectId}/material-proposals`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({surveyItemId,requestId:crypto.randomUUID()})});await load();open(d.proposal);}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  const save=async(confirm:boolean)=>{setBusy(true);try{const d=await bomJson(`/api/projects/${projectId}/material-proposals/${selected.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lines,reviewNotes,confirm,version:selected.version,requestId:crypto.randomUUID()})});await load();open(d.proposal);toast.success(confirm?'Đã xác nhận đề xuất và tạo BOM sản xuất':'Đã lưu chỉnh sửa đề xuất');}catch(e:any){toast.error(e.message);}finally{setBusy(false);}};
  return <section id="material-proposals" className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3 text-xs"><h3 className="text-sm font-bold">Đề xuất NVL theo thông số khảo sát</h3><p className="text-slate-600">Dùng BOM mẫu đã xác nhận của thành phẩm. Thông số mới được AI tính dự thảo để bạn xem, sửa và xác nhận trước khi lập lệnh sản xuất.</p>
    {error&&<p role="alert" className="text-rose-600">{error}</p>}
    {can('project.update')&&<div className="flex flex-wrap gap-2"><select className={bomField+' flex-1 min-w-64'} value={surveyItemId} onChange={e=>setSurveyItemId(e.target.value)}><option value="">Chọn hạng mục khảo sát</option>{items.map(i=><option key={i.id} value={i.id}>{i.surveyTitle} · {i.itemTitle} · SL {i.quantity}</option>)}</select><Button size="sm" disabled={busy||!surveyItemId} onClick={generate}>{busy?'Đang xử lý…':'Lập đề xuất NVL'}</Button></div>}
    {!items.length&&<p className="text-slate-500">Chọn thành phẩm và nhập thông số trong khảo sát trước khi lập đề xuất.</p>}
    {proposals.map(p=><div key={p.id} className="rounded border bg-white p-3 flex flex-wrap gap-2 items-center"><div className="flex-1"><strong>{p.source_snapshot.title}</strong><p className="text-slate-500">{p.source_snapshot.productName} · SL {p.source_snapshot.quantity} · {p.status==='confirmed'?'Đã xác nhận':'Chờ xem xét'} · {p.method==='ai'?'AI dự thảo':'Trùng BOM mẫu'}</p></div><Button size="sm" variant="secondary" onClick={()=>open(p)}>Xem {p.status==='draft'?' / Sửa':''}</Button>{orderLink(p)}</div>)}
    <Modal isOpen={!!selected} onClose={()=>setSelected(null)} title="Xem xét đề xuất nguyên vật liệu" maxWidth="6xl">{selected&&<div className="space-y-4 text-xs"><p><strong>{selected.source_snapshot.productName}</strong> · {selected.source_snapshot.title} · Số lượng {selected.source_snapshot.quantity}</p>
      <div className="rounded bg-slate-50 p-3"><p>{selected.source_snapshot.definitions.map((d:any)=>`${d.label}: ${selected.source_snapshot.parameterValues[d.key] ?? '—'} ${d.unit || ''}`).join(' · ')}</p><p className="mt-2 font-semibold">Mẫu tham chiếu</p>{selected.source_snapshot.references.map((r:any)=><p key={r.id}>{r.name} · v{r.version} · {Object.entries(r.parameterValues).map(([k,v])=>`${k}=${v}`).join(', ')}</p>)}</div>
      <p className="whitespace-pre-wrap">{selected.explanation}</p>{selected.warnings.map((w:string,i:number)=><p key={i} className="text-amber-700">{w}</p>)}
      <ProductBomLinesEditor catalog={catalog} lines={lines} onChange={setLines} quantity={selected.source_snapshot.quantity} readOnly={selected.status==='confirmed'||!can('project.update')}/>
      <label>Ghi chú rà soát<textarea className={bomField} disabled={selected.status==='confirmed'||!can('project.update')} value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)}/></label>
      <div className="flex justify-end gap-2">{selected.status==='draft'&&can('project.update')&&<><Button size="sm" variant="secondary" disabled={busy} onClick={()=>save(false)}>Lưu chỉnh sửa</Button><Button size="sm" disabled={busy} onClick={()=>save(true)}>Xác nhận đề xuất</Button></>}{orderLink(selected)}</div>
      {selected.status==='confirmed'&&<p className="text-slate-500">Đề xuất đã khóa. Lập đề xuất mới nếu số đo hoặc định mức thay đổi. Lệnh sản xuất tạo phiếu cấp NVL khi gửi duyệt; kho duyệt và thực xuất theo quy trình hiện có.</p>}
    </div>}</Modal>
  </section>;
}
