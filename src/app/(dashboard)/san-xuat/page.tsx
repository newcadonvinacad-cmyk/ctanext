'use client';

import * as React from 'react';
import { useSetPageHeader } from '@/contexts/page-header-context';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Modal, Badge, StatBar, toast } from '@/components/ui';
import { DataTable, StatItem } from '@/components/shared';
import { BomEditor } from '@/components/production/BomEditor';
import { OrderDraft } from '@/components/production/OrderDraft';
import { readJson, useWorkflowMutation, fieldClass, statusLabels, statusVariants } from '@/components/production/client';
import {
  RotateCw,
  Plus,
  Layers,
  Sparkles,
  Filter,
  Search,
  ExternalLink,
  Edit3,
  SlidersHorizontal,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';

export default function ProductionPage() {
  const [meta, setMeta] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [project, setProject] = useState('');
  const [tab, setTab] = useState('orders');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState('');
  const [draft, setDraft] = useState(false);
  const [createBom, setCreateBom] = useState(false);
  const [proof, setProof] = useState('');
  const [repVariant, setRepVariant] = useState(false);
  const [variant, setVariant] = useState<any>({
    code: 'other',
    name: '',
    specificationKey: '',
    quantityBasis: 'manual',
  });

  useSetPageHeader({ title: 'Sản xuất', subtitle: 'Quản trị lệnh sản xuất & BOM định mức', screenCode: 'M13.1' }, []);
  const { busy, mutate, run } = useWorkflowMutation();

  async function load() {
    try {
      const m = await readJson('/api/production-orders/metadata');
      setMeta(m);
      if (m.ready) {
        setOrders((await readJson('/api/production-orders')).orders);
        setError('');
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setProject(p.get('projectId') || '');
    setTab(p.get('tab') || 'orders');
    setProof(p.get('designProofId') || '');
    setEditor(p.get('bomId') || '');
    void load();
  }, []);

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto my-12 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">Không thể tải dữ liệu sản xuất</h3>
        <p role="alert" className="text-sm text-rose-600 mb-4">{error}</p>
        <Button onClick={() => load()}>
          <RotateCw className="w-3.5 h-3.5 mr-1" />
          Thử tải lại
        </Button>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Đang tải hệ thống sản xuất…
      </div>
    );
  }

  if (!meta.ready) {
    return (
      <div className="p-8 max-w-md mx-auto my-10 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <p className="font-semibold text-sm">Chức năng sản xuất chưa được khởi tạo</p>
        <p className="mt-1">Cần migration cơ sở dữ liệu và cấp quyền quản trị sản xuất cho người dùng hiện tại.</p>
      </div>
    );
  }

  const filtered = orders.filter(
    (o) =>
      (!project || o.project_id === project) &&
      (!status || o.status === status) &&
      (!keyword || `${o.code} ${o.title} ${o.project_name}`.toLowerCase().includes(keyword.toLowerCase()))
  );
  const visibleBoms = meta.boms.filter((b: any) => !project || b.project_id === project);

  // Thống kê nhanh cho StatBar
  const statItems: StatItem[] = [
    { label: 'Tổng số lệnh', value: orders.length, color: 'neutral' },
    { label: 'Chờ cấp NVL', value: orders.filter((o) => o.status === 'released').length, color: 'amber' },
    { label: 'Đang sản xuất', value: orders.filter((o) => o.status === 'in_progress').length, color: 'blue' },
    { label: 'Hoàn tất', value: orders.filter((o) => o.status === 'completed').length, color: 'emerald' },
  ];

  return (
    <div className="space-y-3 p-3 text-xs">
      {/* 1. TOP BAR & BREADCRUMB */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <span className="font-semibold text-slate-900">Sản xuất & Thi công</span>
          <span className="text-slate-400">/</span>
          <span className="text-blue-600 font-medium">Lệnh sản xuất & BOM</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="h-8" onClick={() => load()}>
            <RotateCw className="w-3.5 h-3.5 mr-1" />
            Làm mới
          </Button>
          {meta.capabilities['production_order.create'] && (
            <Button
              size="sm"
              variant="primary"
              className="h-8 shadow-sm"
              disabled={!project}
              onClick={() => setDraft(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Lập lệnh sản xuất
            </Button>
          )}
        </div>
      </div>

      {/* STAT BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
        <StatBar items={statItems} />
      </div>

      {/* SUB-TABS */}
      <div className="flex border-b border-slate-200 bg-white px-2 rounded-t-lg">
        {[
          ['orders', 'Lệnh sản xuất', FolderKanban],
          ['bom', 'BOM định mức dự án', Layers],
          ['representatives', 'Gán quy cách & Đại diện', SlidersHorizontal],
        ].map(([key, name, Icon]: any) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {name}
          </button>
        ))}
      </div>

      {/* 2. TOOLBAR & FILTERS */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 border border-slate-200 rounded-lg shadow-sm">
        <div className="w-64">
          <select
            aria-label="Dự án sản xuất"
            className={fieldClass}
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setProof('');
            }}
          >
            <option value="">Tất cả dự án công trình</option>
            {meta.projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>

        {tab === 'orders' && (
          <>
            <div className="w-72">
              <input
                aria-label="Tìm lệnh"
                className={fieldClass}
                placeholder="Tìm mã lệnh / tên lệnh / dự án…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="w-48">
              <select
                className={fieldClass}
                aria-label="Trạng thái lệnh"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Mọi trạng thái</option>
                {['draft', 'released', 'in_progress', 'completed', 'cancelled'].map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            {(project || status || keyword) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setProject('');
                  setStatus('');
                  setKeyword('');
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </>
        )}
      </div>

      {/* 3. TAB 1: DANH SÁCH LỆNH SẢN XUẤT */}
      {tab === 'orders' && (
        <DataTable<any>
          data={filtered}
          keyExtractor={(o) => o.id}
          searchValue={keyword}
          onSearchChange={setKeyword}
          onRefresh={load}
          defaultShowStats={false}
          columns={[
            {
              id: 'code',
              header: 'Mã lệnh',
              accessorKey: 'code',
              cell: (o) => (
                <Link
                  className="font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  href={`/san-xuat/${o.id}`}
                >
                  {o.code}
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
              ),
            },
            {
              id: 'title',
              header: 'Tên lệnh sản xuất',
              accessorKey: 'title',
              cell: (o) => (
                <div className="flex items-center gap-3">
                  {(o.thumbnail_url || o.file_url) ? (
                    <div className="w-12 h-9 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0 relative group">
                      <img
                        src={o.thumbnail_url || o.file_url}
                        alt="Maket"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-9 rounded border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-semibold text-slate-800 block truncate" title={o.title}>{o.title}</span>
                    {o.proof_code && (
                      <span className="text-[10px] text-blue-600 font-mono">Maket: {o.proof_code}</span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              id: 'project',
              header: 'Dự án liên kết',
              cell: (o) => (
                <span className="text-slate-700">
                  <span className="font-mono text-slate-500">{o.project_code}</span> · {o.project_name}
                </span>
              ),
            },
            {
              id: 'lines',
              header: 'Hạng mục',
              accessorKey: 'line_count',
              align: 'center',
              cell: (o) => (
                <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                  {o.line_count}
                </span>
              ),
            },
            {
              id: 'status',
              header: 'Trạng thái',
              cell: (o) => (
                <Badge variant={statusVariants[o.status] || 'neutral'} dot>
                  {statusLabels[o.status] || o.status}
                </Badge>
              ),
            },
            {
              id: 'due',
              header: 'Hạn hoàn thành',
              cell: (o) =>
                o.due_at ? (
                  <span className="text-slate-600 font-mono text-[11px]">
                    {new Date(o.due_at).toLocaleString('vi-VN')}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                ),
            },
          ]}
        />
      )}

      {/* 4. TAB 2: BOM ĐỊNH MỨC DỰ ÁN */}
      {tab === 'bom' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="font-semibold text-slate-800 text-xs">
              Định mức BOM kỹ thuật ({visibleBoms.length})
            </span>
            {meta.capabilities['production_order.create'] && (
              <Button
                size="sm"
                variant="primary"
                className="h-7 text-xs"
                disabled={!project}
                onClick={() => setCreateBom(true)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Lập BOM từ maket đã duyệt
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã BOM</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tên định mức</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Phiên bản</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Gán vật tư</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleBoms.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-medium text-slate-800">{b.code}</td>
                    <td className="py-2.5 px-3 max-w-96 truncate font-medium text-slate-700" title={b.title}>
                      {b.title}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                        v{b.revision_no}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant={b.mapped ? 'success' : 'warning'} dot>
                        {b.mapped ? 'Đã gán đủ' : 'Cần hoàn thiện'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant={statusVariants[b.status] || 'neutral'}>
                        {statusLabels[b.status] || b.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap sticky right-0 bg-white">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setEditor(b.id)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Xem / Sửa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!visibleBoms.length && (
            <div className="py-8 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs">Chưa có BOM nào được lập cho dự án đã chọn.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: GÁN QUY CÁCH VẬT TƯ ĐẠI DIỆN */}
      {tab === 'representatives' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden space-y-2">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <span className="font-semibold text-slate-800 text-xs">Bảng quy cách & Vật tư đại diện mặc định</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Gán mặc định được áp dụng khi lập BOM mới; các BOM đã lập trước đó không bị ảnh hưởng.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              disabled={!meta.capabilities['item.update']}
              onClick={() => setRepVariant(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Thêm quy cách đại diện
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-40">Đại diện / Quy cách</th>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-32">Cách tính</th>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-64">Vật tư kho mặc định</th>
                  <th className="py-2.5 px-3 whitespace-nowrap min-w-32">Đơn vị</th>
                  <th className="py-2.5 px-3 whitespace-nowrap w-24">Hệ số</th>
                  <th className="py-2.5 px-3 whitespace-nowrap w-24">Hao hụt %</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-white">Lưu gán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meta.representatives.map((r: any, index: number) => {
                  const item = meta.items.find((i: any) => i.id === r.default_item_id);
                  const update = (v: any) =>
                    setMeta((m: any) => ({
                      ...m,
                      representatives: m.representatives.map((x: any, n: number) => (n === index ? { ...x, ...v } : x)),
                    }));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/40 align-middle">
                      <td className="p-2 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{r.name}</span>
                        <span className="block text-[11px] font-mono text-slate-400">
                          {r.specification_key || 'Mặc định'}
                        </span>
                      </td>
                      <td className="p-2">
                        <select
                          className={fieldClass}
                          value={r.quantity_basis}
                          onChange={(e) => update({ quantity_basis: e.target.value })}
                        >
                          {[
                            ['area', 'Diện tích'],
                            ['perimeter', 'Chu vi'],
                            ['count', 'Số lượng'],
                            ['manual', 'Nhập tay'],
                          ].map(([v, n]) => (
                            <option key={v} value={v}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className={fieldClass}
                          aria-label={`Gán ${r.code} ${r.specification_key}`}
                          value={r.default_item_id || ''}
                          onChange={(e) => update({ default_item_id: e.target.value, default_unit_id: '' })}
                        >
                          <option value="">Chưa gán</option>
                          {meta.items
                            .filter((i: any) => i.isActive)
                            .map((i: any) => (
                              <option key={i.id} value={i.id}>
                                {i.code} · {i.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className={fieldClass}
                          value={r.default_unit_id || ''}
                          onChange={(e) => update({ default_unit_id: e.target.value })}
                        >
                          <option value="">Chọn đơn vị</option>
                          {item?.conversions.map((u: any) => (
                            <option key={u.unitId} value={u.unitId}>
                              {u.unitName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          className={`${fieldClass} font-mono text-right`}
                          type="number"
                          min="0.000001"
                          step="any"
                          value={r.rules?.coefficient ?? 1}
                          onChange={(e) => update({ rules: { ...r.rules, coefficient: Number(e.target.value) } })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className={`${fieldClass} font-mono text-right`}
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={r.rules?.wasteRate || 0}
                          onChange={(e) => update({ rules: { ...r.rules, wasteRate: Number(e.target.value) } })}
                        />
                      </td>
                      <td className="p-2 text-right sticky right-0 bg-white">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5"
                          disabled={busy || !meta.capabilities['item.update']}
                          onClick={() =>
                            run(async () => {
                              await mutate(
                                '/api/material-representatives',
                                {
                                  id: r.id,
                                  defaultItemId: r.default_item_id,
                                  defaultUnitId: r.default_unit_id,
                                  quantityBasis: r.quantity_basis,
                                  rules: r.rules,
                                },
                                'PUT'
                              );
                              toast.success('Đã nhớ gán mặc định');
                            })
                          }
                        >
                          Lưu gán
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODALS VỚI ENTERPRISE LAYOUT */}
      <Modal
        isOpen={Boolean(editor)}
        onClose={() => setEditor('')}
        title="BOM dự án · Gán vật tư và NVL cấu thành"
        maxWidth="6xl"
      >
        {editor && (
          <BomEditor
            id={editor}
            meta={meta}
            onSaved={(id) => {
              setEditor(id);
              void load();
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={draft}
        onClose={() => setDraft(false)}
        title="Lập lệnh sản xuất nhiều hạng mục"
        maxWidth="6xl"
      >
        {draft && (
          <OrderDraft
            meta={meta}
            projectId={project}
            onSaved={(id) => {
              window.location.href = `/san-xuat/${id}`;
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={createBom}
        onClose={() => setCreateBom(false)}
        title="Lập BOM từ maket đã duyệt"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">Chọn maket thuộc dự án</span>
            <select
              className={fieldClass}
              aria-label="Maket lập BOM"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            >
              <option value="">-- Chọn maket thiết kế --</option>
              {meta.designs
                .filter((d: any) => d.project_id === project)
                .map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.title} · PA {d.version_no}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" onClick={() => setCreateBom(false)}>
              Đóng
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!proof || busy}
              onClick={() =>
                run(async () => {
                  const r = await mutate('/api/bom/from-design', { projectId: project, designProofId: proof });
                  setCreateBom(false);
                  await load();
                  setEditor(r.bomId);
                  toast.success('Đã lấy khảo sát và maket; kiểm tra định mức rồi gán vật tư');
                })
              }
            >
              Lập BOM
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={repVariant}
        onClose={() => setRepVariant(false)}
        title="Thêm quy cách đại diện mới"
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700">Nhóm đại diện</span>
            <select
              className={fieldClass}
              value={variant.code}
              onChange={(e) => setVariant({ ...variant, code: e.target.value })}
            >
              {['frame', 'face', 'letters', 'logo', 'color_strip', 'lighting', 'power', 'accessories', 'other'].map(
                (c) => (
                  <option key={c} value={c}>
                    {meta.representatives.find((r: any) => r.code === c)?.name || c}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700">Tên quy cách</span>
            <input
              className={fieldClass}
              value={variant.name}
              onChange={(e) => setVariant({ ...variant, name: e.target.value })}
              placeholder="VD: Khung thép mạ kẽm V40"
            />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700">Khóa quy cách (khớp vật liệu maket)</span>
            <input
              className={fieldClass}
              value={variant.specificationKey}
              onChange={(e) => setVariant({ ...variant, specificationKey: e.target.value })}
              placeholder="VD: frame_v40"
            />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-slate-700">Cách tính lượng</span>
            <select
              className={fieldClass}
              value={variant.quantityBasis}
              onChange={(e) => setVariant({ ...variant, quantityBasis: e.target.value })}
            >
              {[
                ['area', 'Theo diện tích'],
                ['perimeter', 'Theo chu vi'],
                ['count', 'Theo số lượng'],
                ['manual', 'Nhập tay'],
              ].map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" onClick={() => setRepVariant(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await mutate('/api/material-representatives', variant);
                  setRepVariant(false);
                  await load();
                  toast.success('Đã thêm quy cách đại diện');
                })
              }
            >
              Thêm quy cách
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
