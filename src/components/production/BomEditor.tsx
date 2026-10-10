'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button, Badge, toast } from '@/components/ui';
import { readJson, useWorkflowMutation, fieldClass, statusLabels, statusVariants } from './client';
import { Layers, Plus, Trash2, Save, FileSpreadsheet, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export function BomEditor({
  id,
  meta,
  onSaved,
}: {
  id: string;
  meta: any;
  onSaved: (id: string) => void;
}) {
  const [bom, setBom] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [designProofId, setDesignProofId] = useState('');

  const { busy, mutate, run } = useWorkflowMutation();

  const load = async () => {
    try {
      const d = await readJson(`/api/bom/${id}/production`);
      setBom(d.bom);
      setTitle(d.bom.title);
      setNotes(d.bom.notes);
      setLines(
        d.bom.lines.map((l: any) => ({
          id: l.id,
          representativeId: l.representative_id,
          description: l.description,
          itemId: l.item_id || '',
          unitId: l.unit_id || '',
          quantity: Number(l.quantity),
          wasteRate: Number(l.waste_rate),
          notes: l.notes,
        }))
      );
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (error) {
    return (
      <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
        <p className="font-semibold">Đã xảy ra lỗi khi tải BOM:</p>
        <p>{error}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => load()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Đang tải thông tin BOM & quy cách vật tư…
      </div>
    );
  }

  const editable = bom.status === 'draft' && meta.capabilities?.['production_order.update'];
  const change = (i: number, values: any) => setLines((v) => v.map((l, n) => (n === i ? { ...l, ...values } : l)));

  return (
    <div className="space-y-4 text-xs">
      {/* BOM Header Card */}
      <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-slate-900">{bom.code}</span>
            <Badge variant="info">Phiên bản {bom.revision_no}</Badge>
            <Badge variant={statusVariants[bom.status] || 'neutral'} dot>
              {statusLabels[bom.status] || bom.status}
            </Badge>
          </div>
          <p className="text-slate-500 text-[11px]">
            Kích thước tiêu chuẩn thiết kế:{' '}
            <span className="font-semibold text-slate-700">
              {bom.width_meters}m × {bom.height_meters}m
            </span>{' '}
            (Diện tích: {(bom.width_meters * bom.height_meters).toFixed(2)} m²)
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs font-medium"
          disabled={busy || !meta.capabilities?.['production_order.update']}
          onClick={() =>
            run(async () => {
              const r = await mutate(`/api/bom/${id}/production`, { action: 'revise' });
              onSaved(r.bomId);
              toast.success('Đã tạo phiên bản BOM mới');
            })
          }
        >
          <Layers className="w-3.5 h-3.5 mr-1 text-slate-600" />
          Tạo phiên bản mới
        </Button>
      </div>

      {!bom.design_proof_id && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
          <label className="block space-y-1">
            <span className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              BOM cũ: chọn maket đã duyệt để hoàn thiện nguồn
            </span>
            <select
              aria-label="Maket cho BOM cũ"
              className={fieldClass}
              value={designProofId}
              disabled={!editable}
              onChange={(e) => setDesignProofId(e.target.value)}
            >
              <option value="">Chưa gắn maket / khảo sát</option>
              {meta.designs
                .filter((d: any) => d.project_id === bom.project_id)
                .map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}

      <div>
        <label className="block space-y-1">
          <span className="font-semibold text-slate-700 text-xs">Tên định mức BOM</span>
          <input
            aria-label="Tên BOM"
            className={fieldClass}
            value={title}
            disabled={!editable}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tên BOM"
          />
        </label>
      </div>

      {/* Lines Grid Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-xs">Danh sách nhu cầu & Gán vật tư ({lines.length})</span>
          {editable && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs px-2.5"
              onClick={() =>
                setLines((v) => [
                  ...v,
                  {
                    representativeId: '',
                    description: '',
                    itemId: '',
                    unitId: '',
                    quantity: 1,
                    wasteRate: 0,
                    notes: '',
                  },
                ])
              }
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Thêm nhu cầu
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
              <tr>
                <th className="py-2 px-3 whitespace-nowrap min-w-36">Đại diện quy cách</th>
                <th className="py-2 px-3 whitespace-nowrap min-w-44">Nhu cầu thiết kế / Mô tả</th>
                <th className="py-2 px-3 whitespace-nowrap min-w-60">Vật tư kho gán</th>
                <th className="py-2 px-3 whitespace-nowrap min-w-28">Đơn vị</th>
                <th className="py-2 px-3 whitespace-nowrap w-24">SL / BOM</th>
                <th className="py-2 px-3 whitespace-nowrap w-24">Hao hụt %</th>
                <th className="py-2 px-3 text-right whitespace-nowrap w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l, i) => {
                const item = meta.items.find((x: any) => x.id === l.itemId);
                return (
                  <tr key={l.id || i} className="hover:bg-slate-50/40 align-top">
                    <td className="p-2">
                      <select
                        aria-label={`Đại diện ${i + 1}`}
                        disabled={!editable}
                        className={fieldClass}
                        value={l.representativeId}
                        onChange={(e) => change(i, { representativeId: e.target.value })}
                      >
                        <option value="">Chọn đại diện</option>
                        {meta.representatives.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {r.specification_key ? ` · ${r.specification_key}` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 space-y-1">
                      <input
                        aria-label={`Nhu cầu ${i + 1}`}
                        className={fieldClass}
                        disabled={!editable}
                        value={l.description}
                        onChange={(e) => change(i, { description: e.target.value })}
                        placeholder="Mô tả cấu thành"
                      />
                      <input
                        aria-label={`Ghi chú ${i + 1}`}
                        className={`${fieldClass} text-[11px] text-slate-500`}
                        disabled={!editable}
                        value={l.notes}
                        onChange={(e) => change(i, { notes: e.target.value })}
                        placeholder="Ghi chú kỹ thuật"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        aria-label={`Vật tư ${i + 1}`}
                        disabled={!editable}
                        className={fieldClass}
                        value={l.itemId}
                        onChange={(e) => change(i, { itemId: e.target.value, unitId: '' })}
                      >
                        <option value="">Chưa gán vật tư</option>
                        {meta.items
                          .filter((x: any) => x.isActive && !['service', 'tool'].includes(x.kind))
                          .map((x: any) => (
                            <option key={x.id} value={x.id}>
                              {x.code} · {x.name}
                              {x.bom?.length ? ' · Có BOM' : ''}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        aria-label={`Đơn vị ${i + 1}`}
                        className={fieldClass}
                        disabled={!editable}
                        value={l.unitId}
                        onChange={(e) => change(i, { unitId: e.target.value })}
                      >
                        <option value="">Chọn đơn vị</option>
                        {item?.conversions.map((u: any) => (
                          <option key={u.unitId} value={u.unitId}>
                            {u.unitName || u.unitCode} · ×{u.factor}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        aria-label={`Số lượng ${i + 1}`}
                        className={`${fieldClass} text-right font-mono`}
                        disabled={!editable}
                        type="number"
                        min="0.000001"
                        step="any"
                        value={l.quantity}
                        onChange={(e) => change(i, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        aria-label={`Hao hụt ${i + 1}`}
                        className={`${fieldClass} text-right font-mono`}
                        disabled={!editable}
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={l.wasteRate}
                        onChange={(e) => change(i, { wasteRate: Number(e.target.value) })}
                      />
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!editable}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => setLines((v) => v.filter((_, n) => n !== i))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="block space-y-1">
          <span className="font-semibold text-slate-700 text-xs">Ghi chú chung cho toàn bộ BOM</span>
          <textarea
            aria-label="Ghi chú BOM"
            className={`${fieldClass} h-16 py-1.5`}
            disabled={!editable}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú thi công hoặc yêu cầu kiểm soát chất lượng đặc thù"
          />
        </label>
      </div>

      {bom.expansionError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2" role="status">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Cần hoàn thiện gán: {bom.expansionError}</span>
        </div>
      )}

      {/* Material Availability Summary */}
      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            Bảng đối soát NVL triển khai · Tồn khả dụng tổng các kho
          </span>
          <span className="text-[11px] text-slate-500">Đơn vị cơ sở chuẩn hóa</span>
        </div>

        {bom.expanded.length === 0 ? (
          <p className="text-slate-400 text-xs py-2">Lưu gán đầy đủ để xem danh sách NVL phân rã và đối soát tồn kho.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2">Vật tư NVL</th>
                  <th className="p-2 text-right">Cần / BOM</th>
                  <th className="p-2 text-right">Còn khả dụng</th>
                  <th className="p-2 text-right">Thiếu hụt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bom.expanded.map((m: any) => {
                  const item = meta.items.find((x: any) => x.id === m.itemId);
                  const available = Number(
                    bom.lines.find((l: any) => l.item_id === m.itemId)?.available_base_qty ??
                      bom.materialAvailability?.[m.itemId] ??
                      0
                  );
                  const shortage = Math.max(0, m.baseQty - available);
                  return (
                    <tr key={m.itemId} className="hover:bg-slate-50/50">
                      <td className="p-2 font-medium text-slate-800">
                        {item?.code} · {item?.name}
                      </td>
                      <td className="p-2 text-right font-mono">{m.baseQty}</td>
                      <td className="p-2 text-right font-mono text-emerald-600 font-semibold">{available}</td>
                      <td className="p-2 text-right font-mono">
                        {shortage > 0 ? (
                          <span className="text-rose-600 font-bold">-{shortage}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button
          size="sm"
          variant="primary"
          className="h-8 px-4 font-medium"
          disabled={busy || !editable}
          onClick={() =>
            run(async () => {
              await mutate(
                `/api/bom/${id}/production`,
                { title, notes, lines, designProofId: designProofId || undefined },
                'PUT'
              );
              await load();
              onSaved(id);
              toast.success('Đã lưu BOM và đối chiếu vật tư');
            })
          }
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Lưu BOM
        </Button>
      </div>
    </div>
  );
}
