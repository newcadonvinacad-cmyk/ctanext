'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Modal, toast } from '@/components/ui';
import { useAuthorization } from '@/hooks/use-authorization';
import type { ProductBomCatalogItem, ProductBomLine } from '@/lib/product-bom';
import { formatParameterValue, materialStage, proposalMatchesSurvey, type MaterialProposalFocus, type MaterialProposalView, type SurveyMaterialItem } from '@/lib/material-workflow-ui';
import { bomJson, bomField, ProductBomLinesEditor } from '@/components/vat-tu/ParameterFields';

export function MaterialProposalPanel({ projectId, surveys, proposals, catalog, loading, error, focus, onFocusHandled, onReload, onSurvey }: {
  projectId: string;
  surveys: Array<{ title: string; items?: SurveyMaterialItem[] }>;
  proposals: MaterialProposalView[];
  catalog: ProductBomCatalogItem[];
  loading: boolean;
  error: string;
  focus: MaterialProposalFocus | null;
  onFocusHandled: () => void;
  onReload: () => Promise<void>;
  onSurvey: () => void;
}) {
  const { can } = useAuthorization();
  const [surveyItemId, setSurveyItemId] = useState('');
  const [selected, setSelected] = useState<MaterialProposalView | null>(null);
  const [lines, setLines] = useState<ProductBomLine[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [busy, setBusy] = useState<'generate' | 'save' | 'confirm' | null>(null);
  const [fresh, setFresh] = useState(false);
  const handledFocus = useRef<number | null>(null);
  const items = surveys.flatMap(s => (s.items || []).filter(i => i.productItemId).map(i => ({ ...i, surveyTitle: s.title })));
  const selectedItem = items.find(i => i.id === surveyItemId);
  const selectedStage = selectedItem ? materialStage(selectedItem, proposals) : null;
  const reviewItem = selected && items.find(i => i.id === selected.source_snapshot.surveyItemId);
  const isCurrent = !!(selected && reviewItem && proposalMatchesSurvey(selected, reviewItem));
  const readOnly = selected?.status === 'confirmed' || !can('project.update') || !isCurrent || loading || !!busy;
  const open = (p: MaterialProposalView) => {
    setSelected(p);
    setLines(p.lines.map(l => ({ ...l })));
    setReviewNotes(p.review_notes || '');
  };

  useEffect(() => {
    if (!focus || handledFocus.current === focus.token) return;
    setSurveyItemId(focus.surveyItemId);
    setFresh(false);
    if (focus.proposalId) {
      const proposal = proposals.find(p => p.id === focus.proposalId);
      if (!proposal) return;
      open(proposal);
    }
    handledFocus.current = focus.token;
    onFocusHandled();
    requestAnimationFrame(() => document.getElementById('material-proposals')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [focus, proposals, onFocusHandled]);

  const orderLink = (p: MaterialProposalView) => p.production_order_id ? (
    can('production_order.read') && <Link className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-700" href={`/san-xuat/${p.production_order_id}`}>Mở lệnh sản xuất →</Link>
  ) : p.bom_id && can('production_order.create') && items.some(i => proposalMatchesSurvey(p, i)) ? (
    <Link className="inline-flex rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white" href={`/san-xuat?projectId=${projectId}&draftBomId=${p.bom_id}`}>Lập lệnh sản xuất →</Link>
  ) : null;

  const generate = async () => {
    if (!surveyItemId || busy) return;
    setBusy('generate');
    try {
      const d = await bomJson(`/api/projects/${projectId}/material-proposals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyItemId, requestId: crypto.randomUUID() }),
      });
      await onReload();
      setFresh(false);
      open(d.proposal);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Không thể lập đề xuất');
      await onReload();
    }
    finally { setBusy(null); }
  };

  const save = async (confirm: boolean) => {
    if (!selected || busy) return;
    setBusy(confirm ? 'confirm' : 'save');
    try {
      const d = await bomJson(`/api/projects/${projectId}/material-proposals/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, reviewNotes, confirm, version: selected.version, requestId: crypto.randomUUID() }),
      });
      await onReload();
      open(d.proposal);
      toast.success(confirm ? 'Đã xác nhận đề xuất và tạo BOM sản xuất' : 'Đã lưu chỉnh sửa đề xuất');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Không thể lưu đề xuất');
      await onReload();
    }
    finally { setBusy(null); }
  };

  const nextStep = () => !fresh && selectedStage?.proposal && ['draft', 'confirmed', 'order'].includes(selectedStage.kind) ? open(selectedStage.proposal) : void generate();
  const nextLabel = fresh ? 'Lập đề xuất mới' : selectedStage?.kind === 'draft' ? 'Rà soát đề xuất' : selectedStage?.kind === 'confirmed' || selectedStage?.kind === 'order' ? 'Xem đề xuất' : 'Lập đề xuất NVL';
  const quantityUnit = selected ? catalog.find(i => i.id === selected.source_snapshot.productItemId)?.units.find(u => u.id === selected.source_snapshot.outputUnitId)?.name : '';

  return <section id="material-proposals" className="scroll-mt-20 rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5 space-y-4 text-xs">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-sm font-bold text-slate-900">Đề xuất NVL theo khảo sát</h3><p className="mt-1 text-slate-600">BOM mẫu của thành phẩm là cơ sở tính. Rà soát và xác nhận định mức trước khi lập lệnh sản xuất.</p></div>
      <Button size="sm" variant="outline" onClick={onSurvey}>Về khảo sát</Button>
    </div>
    <ol aria-label="Quy trình vật tư dự án" className="grid grid-cols-2 sm:grid-cols-4 gap-2">{['Khảo sát', 'Đề xuất & Rà soát', 'Lệnh sản xuất', 'Phiếu kho'].map((step, i) => <li key={step} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600"><span className="mr-2 font-bold text-blue-700">{i + 1}</span>{step}</li>)}</ol>
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-rose-50 p-3 text-rose-700"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void onReload()}>Thử tải lại</Button></div>}
    {loading ? <p role="status" className="py-4 text-slate-500">Đang tải khảo sát và đề xuất NVL…</p> : !error && !items.length ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5"><p className="font-semibold">Chưa có hạng mục thành phẩm để lập đề xuất</p><p className="mt-1 text-slate-500">Tạo hoặc sửa khảo sát, chọn thành phẩm và nhập thông số thực tế.</p><Button size="sm" className="mt-3" onClick={onSurvey}>Mở khảo sát</Button></div> : null}
    {!loading && !error && !!items.length && <>
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
        <label htmlFor="proposal-survey-item" className="font-semibold">Hạng mục cần xử lý</label>
        <div className="flex flex-col sm:flex-row gap-2"><select id="proposal-survey-item" className={`${bomField} min-w-0 flex-1`} disabled={!!busy} value={surveyItemId} onChange={e => { setSurveyItemId(e.target.value); setFresh(false); }}><option value="">Chọn hạng mục khảo sát</option>{items.map(i => <option key={i.id} value={i.id}>{i.surveyTitle} · {i.itemTitle} · SL {formatParameterValue(i.quantity)}</option>)}</select>
          {can('project.update') && <Button size="sm" disabled={!!busy || !selectedItem} isLoading={busy === 'generate'} onClick={nextStep}>{busy === 'generate' ? 'Đang tính đề xuất…' : nextLabel}</Button>}
        </div>
        {selectedItem && <p className="text-slate-500">{catalog.find(p => p.id === selectedItem.productItemId)?.name} · {selectedStage?.label}</p>}
        {busy === 'generate' && <p role="status" className="text-blue-700">Đang kiểm tra BOM mẫu và tính định mức. Kết quả sẽ mở ở màn rà soát.</p>}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{items.map(item => {
        const stage = materialStage(item, proposals);
        const product = catalog.find(p => p.id === item.productItemId);
        return <article key={item.id} data-testid={`material-item-${item.id}`} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-slate-900">{item.itemTitle}</h4><p className="mt-1 text-slate-500">{item.surveyTitle} · {product?.name} · SL {formatParameterValue(item.quantity)}</p></div><span className={`rounded-full border px-2 py-1 text-[11px] ${stage.tone}`}>{stage.label}</span></div>
          {stage.kind === 'changed' && <p className="text-amber-700">Số đo hoặc thông tin khảo sát đã đổi. Lập đề xuất mới trước khi xác nhận hoặc tạo lệnh.</p>}
          <div className="flex flex-wrap items-center gap-2">
            {stage.proposal && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => open(stage.proposal)}>{stage.kind === 'draft' ? 'Rà soát đề xuất' : 'Xem đề xuất'}</Button>}
            {(stage.kind === 'missing' || stage.kind === 'changed') && can('project.update') && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { setSurveyItemId(item.id); setFresh(false); document.getElementById('proposal-survey-item')?.focus(); }}>Chọn để lập đề xuất</Button>}
            {stage.proposal && orderLink(stage.proposal)}
          </div>
        </article>;
      })}</div>
    </>}
    {!!proposals.length && <details className="rounded-lg border border-slate-200 bg-white p-3"><summary className="cursor-pointer font-semibold text-slate-600">Lịch sử đề xuất ({proposals.length})</summary><div className="mt-3 space-y-2">{proposals.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2"><div><p className="font-medium">{p.source_snapshot.title} · {p.status === 'confirmed' ? 'Đã xác nhận' : 'Bản nháp'}</p><p className="text-slate-500">{p.method === 'ai' ? 'AI dự thảo' : 'Trùng BOM mẫu'}{p.created_at ? ` · ${new Date(p.created_at).toLocaleString('vi-VN')}` : ''}</p></div><Button size="sm" variant="ghost" onClick={() => open(p)}>Xem bản lưu</Button></div>)}</div></details>}

    <Modal isOpen={!!selected} onClose={() => { if (!busy) setSelected(null); }} title="Rà soát đề xuất nguyên vật liệu" description="Kiểm tra thông số, mẫu tham chiếu và tổng nhu cầu trước khi xác nhận." maxWidth="6xl" footer={selected && <div className="flex flex-wrap items-center justify-end gap-2 w-full"><Button size="sm" variant="outline" disabled={!!busy} onClick={() => setSelected(null)}>Đóng</Button>{selected.status === 'draft' && can('project.update') && isCurrent && !loading && <><Button size="sm" variant="outline" disabled={!!busy} isLoading={busy === 'save'} onClick={() => void save(false)}>Lưu chỉnh sửa</Button><Button size="sm" disabled={!!busy} isLoading={busy === 'confirm'} onClick={() => void save(true)}>Xác nhận đề xuất</Button></>}{selected.status === 'confirmed' && orderLink(selected)}</div>}>
      {selected && <div className="space-y-5 text-xs">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold">{selected.source_snapshot.productName}</p><p className="mt-1 text-slate-600">{selected.source_snapshot.title} · Số lượng: {formatParameterValue(selected.source_snapshot.quantity)} {quantityUnit} · {selected.method === 'ai' ? 'AI dự thảo' : 'Trùng BOM mẫu'}</p><dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">{selected.source_snapshot.definitions.map(d => <div key={d.key}><dt className="text-slate-500">{d.label}{d.unit ? ` (${d.unit})` : ''}</dt><dd className="mt-1 font-semibold">{formatParameterValue(selected.source_snapshot.parameterValues[d.key])}</dd></div>)}</dl></div>
        {!loading && !isCurrent && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">Khảo sát đã thay đổi hoặc hạng mục đã bị xóa. Bản đề xuất này chỉ dùng để xem lịch sử; quay lại hạng mục để lập đề xuất mới.</p>}
        <section className="space-y-2"><h4 className="font-semibold">Cơ sở tính định mức</h4><p className="whitespace-pre-wrap leading-relaxed text-slate-600">{selected.explanation}</p>{selected.warnings.map((w, i) => <p key={i} className="rounded-lg bg-amber-50 p-3 text-amber-800">{w}</p>)}</section>
        <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer font-semibold">So sánh với BOM mẫu tham chiếu ({selected.source_snapshot.references.length})</summary><div className="mt-3 space-y-4">{selected.source_snapshot.references.map(reference => <div key={reference.id} className="rounded-lg bg-slate-50 p-3 space-y-3"><p className="font-semibold">{reference.name} · Phiên bản {reference.version}</p><div className="overflow-x-auto"><table className="w-full min-w-80 text-left"><thead><tr className="text-slate-500"><th className="py-2">Thông số</th><th>Khảo sát</th><th>BOM mẫu</th></tr></thead><tbody>{selected.source_snapshot.definitions.map(d => <tr key={d.key} className="border-t border-slate-200"><td className="py-2">{d.label}{d.unit ? ` (${d.unit})` : ''}</td><td>{formatParameterValue(selected.source_snapshot.parameterValues[d.key])}</td><td>{formatParameterValue(reference.parameterValues[d.key])}</td></tr>)}</tbody></table></div><div className="overflow-x-auto"><table className="w-full min-w-96 text-left"><thead><tr className="text-slate-500"><th className="py-2">NVL / Dịch vụ trong mẫu</th><th>Đơn vị</th><th>Định mức / 1 TP</th><th>Hao hụt</th></tr></thead><tbody>{reference.lines.map((line, i) => { const material = catalog.find(m => m.id === line.itemId); return <tr key={i} className="border-t border-slate-200"><td className="py-2 pr-3">{material ? `${material.code} · ${material.name}` : line.itemId}</td><td>{material?.units.find(u => u.id === line.unitId)?.name || 'Đơn vị trong mẫu'}</td><td>{formatParameterValue(line.quantity)}</td><td>{formatParameterValue(line.wasteRate)}%</td></tr>; })}</tbody></table></div></div>)}</div></details>
        <section className="space-y-3"><div><h4 className="font-semibold">Định mức đề xuất & Tổng nhu cầu</h4><p className="mt-1 text-slate-500">Tổng nhu cầu = định mức cho 1 thành phẩm × số lượng khảo sát × (1 + hao hụt).</p></div><ProductBomLinesEditor catalog={catalog} lines={lines} onChange={setLines} quantity={selected.source_snapshot.quantity} readOnly={readOnly} /></section>
        <label className="block font-medium">Ghi chú rà soát<textarea className={`${bomField} mt-2`} disabled={readOnly} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} /></label>
        {selected.status === 'confirmed' && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">Đề xuất đã xác nhận và BOM đã khóa. Gửi duyệt lệnh sản xuất mới tạo phiếu cấp NVL; kho duyệt và thực xuất theo quy trình hiện có.</p>}
        {selected.status === 'confirmed' && !selected.production_order_id && isCurrent && can('project.update') && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => { setSelected(null); setSurveyItemId(selected.source_snapshot.surveyItemId); setFresh(true); }}>Lập đề xuất mới cho hạng mục này</Button>}
      </div>}
    </Modal>
  </section>;
}
