'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Button, Badge, toast } from '@/components/ui';
import { DEFAULT_STEPS } from '@/lib/production/bom';
import { readJson, useWorkflowMutation, fieldClass } from './client';
import { Plus, Trash2, Calendar, Warehouse, Layers, Save, CheckSquare, Zap } from 'lucide-react';

export function OrderDraft({
  meta,
  projectId,
  order,
  onSaved,
}: {
  meta: any;
  projectId: string;
  order?: any;
  onSaved: (id: string) => void;
}) {
  const [title, setTitle] = useState(order?.title || '');
  const [startDate, setStartDate] = useState(
    order?.source_snapshot?.startDate || order?.source_snapshot?.started_at
      ? new Date(new Date(order.source_snapshot.startDate || order.source_snapshot.started_at).getTime() - new Date(order.source_snapshot.startDate || order.source_snapshot.started_at).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );
  const [dueAt, setDueAt] = useState(
    order?.due_at
      ? new Date(new Date(order.due_at).getTime() - new Date(order.due_at).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : ''
  );
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [parentTaskId, setParentTaskId] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);

  const { busy, mutate, run } = useWorkflowMutation();

  useEffect(() => {
    if (order) {
      setLines(
        order.lines.map((l: any) => ({
          id: l.id,
          bomId: l.bom_id,
          title: l.title,
          outputItemId: l.output_item_id,
          unitId: l.unit_id,
          teamId: l.team_id,
          targetQty: Number(l.target_qty),
          bomYieldQty: Number(l.bom_yield_qty),
          hasElectrical: l.has_electrical,
          steps: l.steps.map((s: any) => s.title),
          sourceWarehouseId: l.materials[0]?.source_warehouse_id || '',
          materialWarehouses: Object.fromEntries(l.materials.map((m: any) => [m.item_id, m.source_warehouse_id])),
          materials: l.snapshot.bom.expanded || [],
        }))
      );
    }
  }, [order]);

  useEffect(() => {
    if (projectId) setTasks((meta.tasks || []).filter((t: any) => t.project_id === projectId));
  }, [projectId, meta.tasks]);

  const update = (i: number, v: any) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...v } : l)));

  const add = async (id: string) => {
    if (!id || lines.some((l) => l.bomId === id)) return;
    const { bom } = await readJson(`/api/bom/${id}/production`);
    if (bom.needsMapping) throw new Error('Hoàn thiện gán BOM trước khi lập lệnh');
    setLines((ls) => [
      ...ls,
      {
        bomId: id,
        title: bom.title,
        outputItemId: '',
        unitId: '',
        teamId: '',
        targetQty: 1,
        bomYieldQty: 1,
        hasElectrical: false,
        steps: [...DEFAULT_STEPS],
        sourceWarehouseId: sourceWarehouse,
        materialWarehouses: {},
        materials: bom.expanded,
      },
    ]);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Thông tin chung */}
      <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700 text-xs">Tên lệnh sản xuất</span>
            <input
              className={fieldClass}
              aria-label="Tên lệnh"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Gia công bộ chữ tòa nhà A"
            />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700 text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Ngày bắt đầu sản xuất
            </span>
            <input
              className={fieldClass}
              type="datetime-local"
              aria-label="Ngày bắt đầu"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700 text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Hạn hoàn thành yêu cầu
            </span>
            <input
              className={fieldClass}
              type="datetime-local"
              aria-label="Hạn hoàn thành"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700 text-xs flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5 text-slate-500" />
              Kho NVL xuất mặc định
            </span>
            <select
              className={fieldClass}
              aria-label="Kho NVL mặc định"
              value={sourceWarehouse}
              onChange={(e) => {
                setSourceWarehouse(e.target.value);
                setLines((ls) => ls.map((l) => ({ ...l, sourceWarehouseId: e.target.value })));
              }}
            >
              <option value="">Chọn kho</option>
              {meta.warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!order && (
          <div className="grid md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/80">
            <label className="space-y-1 block">
              <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Thêm hạng mục từ BOM đã duyệt gán
              </span>
              <select
                aria-label="Thêm BOM"
                className={fieldClass}
                value=""
                onChange={(e) => run(() => add(e.target.value))}
              >
                <option value="">-- Bấm chọn BOM để thêm vào lệnh --</option>
                {meta.boms
                  .filter((b: any) => b.project_id === projectId && b.mapped && !lines.some((l) => l.bomId === b.id))
                  .map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                Gắn liên kết dưới công việc WBS dự án
              </span>
              <select
                aria-label="Công việc WBS"
                className={fieldClass}
                value={parentTaskId}
                onChange={(e) => setParentTaskId(e.target.value)}
              >
                <option value="">Tạo nhánh sản xuất riêng trong dự án</option>
                {tasks.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.code} · {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {!lines.length && (
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-medium text-slate-600 text-xs">Chưa có hạng mục sản xuất nào.</p>
          <p className="text-slate-400 text-[11px] mt-0.5">Chọn BOM đã gán từ danh sách trên để thêm các hạng mục.</p>
        </div>
      )}

      {/* Danh sách các hạng mục */}
      {lines.map((l, i) => {
        const product = meta.items.find((p: any) => p.id === l.outputItemId);
        return (
          <section key={l.id || l.bomId} className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-white shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                  {i + 1}
                </span>
                <strong className="text-sm text-slate-800">{l.title}</strong>
              </div>
              {!order && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Bỏ hạng mục
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <label className="space-y-1 block col-span-2">
                <span className="text-slate-600 text-[11px] font-semibold">Thành phẩm đại diện (Kho)</span>
                <select
                  aria-label={`Thành phẩm ${i + 1}`}
                  className={fieldClass}
                  value={l.outputItemId}
                  onChange={(e) => {
                    const p = meta.items.find((v: any) => v.id === e.target.value);
                    update(i, { outputItemId: e.target.value, unitId: p?.baseUnitId || '' });
                  }}
                >
                  <option value="">Chọn mã chung</option>
                  {meta.items
                    .filter((p: any) => p.isActive && ['product', 'semi_finished'].includes(p.kind))
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-600 text-[11px] font-semibold">Đơn vị tính</span>
                <select
                  className={fieldClass}
                  aria-label={`Đơn vị thành phẩm ${i + 1}`}
                  value={l.unitId}
                  onChange={(e) => update(i, { unitId: e.target.value })}
                >
                  <option value="">Chọn đơn vị</option>
                  {product?.conversions.map((u: any) => (
                    <option key={u.unitId} value={u.unitId}>
                      {u.unitName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-600 text-[11px] font-semibold">Sản lượng cần làm</span>
                <input
                  className={`${fieldClass} font-mono`}
                  aria-label={`Sản lượng ${i + 1}`}
                  type="number"
                  min="0.000001"
                  step="any"
                  value={l.targetQty}
                  onChange={(e) => update(i, { targetQty: Number(e.target.value) })}
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-600 text-[11px] font-semibold">BOM tính cho</span>
                <input
                  className={`${fieldClass} font-mono`}
                  aria-label={`Sản lượng BOM ${i + 1}`}
                  type="number"
                  min="0.000001"
                  step="any"
                  value={l.bomYieldQty}
                  onChange={(e) => update(i, { bomYieldQty: Number(e.target.value) })}
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-slate-600 text-[11px] font-semibold">Nhóm phụ trách xưởng</span>
                <select
                  className={fieldClass}
                  aria-label={`Nhóm ${i + 1}`}
                  value={l.teamId}
                  onChange={(e) => update(i, { teamId: e.target.value })}
                >
                  <option value="">Chọn nhóm xưởng</option>
                  {meta.teams.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                <input
                  type="checkbox"
                  aria-label={`Có điện ${i + 1}`}
                  checked={l.hasElectrical}
                  onChange={(e) => update(i, { hasElectrical: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Có hệ thống điện / LED chiếu sáng (Kích hoạt bộ kiểm tra QC an toàn điện)
                </span>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-slate-700 text-xs font-semibold">
                Công đoạn sản xuất theo thứ tự (Mỗi dòng một công đoạn, dòng cuối cùng là nghiệm thu QC):
              </span>
              <textarea
                className={`${fieldClass} h-20 font-mono py-1.5`}
                aria-label={`Công đoạn ${i + 1}`}
                value={l.steps.join('\n')}
                onChange={(e) => update(i, { steps: e.target.value.split('\n') })}
              />
            </label>

            {/* Bảng NVL tự tính theo tỷ lệ */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                Dự toán NVL cấp cho hạng mục (Tự động nhân hệ số theo sản lượng cần làm)
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2">NVL triển khai</th>
                    <th className="p-2 text-right">Lượng cần (đơn vị cơ sở)</th>
                    <th className="p-2">Kho cấp phát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {l.materials.map((m: any) => {
                    const item = meta.items.find((v: any) => v.id === m.itemId);
                    return (
                      <tr key={m.itemId} className="hover:bg-slate-50/40">
                        <td className="p-2 font-medium text-slate-800">
                          {item?.code} · {item?.name}
                        </td>
                        <td className="p-2 text-right font-mono text-blue-700 font-semibold">
                          {Number(((m.baseQty * l.targetQty) / l.bomYieldQty).toFixed(6))}
                        </td>
                        <td className="p-2">
                          <select
                            aria-label={`Kho ${i + 1} ${item?.code}`}
                            className={`${fieldClass} max-w-64`}
                            value={l.materialWarehouses[m.itemId] || l.sourceWarehouseId || sourceWarehouse}
                            onChange={(e) =>
                              update(i, {
                                materialWarehouses: { ...l.materialWarehouses, [m.itemId]: e.target.value },
                              })
                            }
                          >
                            <option value="">Chọn kho</option>
                            {meta.warehouses.map((w: any) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button
          size="sm"
          variant="primary"
          className="h-8 px-4 font-medium"
          disabled={busy || !lines.length}
          onClick={() =>
            run(async () => {
              const data = {
                projectId,
                title,
                startDate: startDate ? new Date(startDate).toISOString() : null,
                dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                parentTaskId: parentTaskId || undefined,
                sourceWarehouseId: sourceWarehouse,
                lines: lines.map(({ materials, ...l }) => l),
              };
              const r = await mutate(
                order ? `/api/production-orders/${order.id}/actions` : '/api/production-orders',
                order ? { ...data, action: 'edit_draft' } : data
              );
              toast.success('Đã lưu lệnh nháp; gửi duyệt để tạo phiếu xuất NVL');
              onSaved(r.orderId);
            })
          }
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Lưu lệnh nháp
        </Button>
      </div>
    </div>
  );
}
