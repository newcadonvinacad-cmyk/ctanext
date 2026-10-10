'use client';

import * as React from 'react';
import { useSetPageHeader } from '@/contexts/page-header-context';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Badge, toast } from '@/components/ui';
import { readJson, useWorkflowMutation, fieldClass, statusLabels, statusVariants } from '@/components/production/client';
import { StockDocuments } from '@/components/production/StockDocuments';
import {
  RotateCw,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  FileText,
  Boxes,
  ArrowRight,
  Info,
  Calendar,
  AlertCircle,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';

export default function ProductionSales() {
  const [meta, setMeta] = useState<any>(null);
  const [project, setProject] = useState('');
  const [production, setProduction] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [saleId, setSaleId] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [ar, setAr] = useState(false);
  const [days, setDays] = useState(15);
  const [error, setError] = useState('');

  useSetPageHeader({ title: 'Bán hàng', subtitle: 'Bán thành phẩm theo lô sản xuất & dự án', screenCode: 'M04' }, []);
  const { busy, mutate, run } = useWorkflowMutation();

  async function loadSale(id = saleId) {
    if (id) {
      setSale((await readJson(`/api/crm/orders/${id}`)).order);
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setProject(q.get('projectId') || '');
    setProduction(q.get('productionOrderId') || '');
    const sid = q.get('orderId') || '';
    setSaleId(sid);
    readJson('/api/production-orders/metadata')
      .then(setMeta)
      .catch((e) => setError(e.message));
    if (sid) loadSale(sid).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!project) {
      setProducts([]);
      return;
    }
    setSelected([]);
    Promise.all([
      meta?.capabilities?.['production_order.read']
        ? readJson(`/api/production-orders?projectId=${project}`)
        : Promise.resolve({ orders: [] }),
      readJson(
        `/api/production-orders/available-products?projectId=${project}${
          production ? `&productionOrderId=${production}` : ''
        }`
      ),
    ])
      .then(([o, p]) => {
        setOrders(o.orders);
        setProducts(p.products);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [project, production, meta]);

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto my-12 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">Không thể tải dữ liệu bán thành phẩm</h3>
        <p role="alert" className="text-sm text-rose-600 mb-4">{error}</p>
        <Link
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium text-xs"
          href="/ban-hang"
        >
          Quay về danh sách bán hàng
        </Link>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Đang tải thông tin thành phẩm và dự án…
      </div>
    );
  }

  if (!meta.ready) {
    return (
      <div className="p-8 max-w-md mx-auto my-10 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <p className="font-semibold text-sm">Chức năng sản xuất chưa được khởi tạo</p>
      </div>
    );
  }

  const caps = meta.capabilities;

  return (
    <div className="space-y-3 p-3 text-xs">
      {/* 1. TOP BAR */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Link href="/ban-hang" className="text-slate-500 hover:text-slate-700">
            Bán hàng
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-blue-600 font-semibold">Bán thành phẩm theo lô sản xuất</span>
        </div>
        <Link
          href="/ban-hang"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Danh sách đơn bán
        </Link>
      </div>

      {/* 2. CHẾ ĐỘ XEM ĐƠN ĐÃ LẬP HOẶC FORM TẠO MỚI */}
      {saleId && sale ? (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-base text-slate-900">{sale.code}</span>
                <Badge variant={statusVariants[sale.status] || 'neutral'} dot>
                  {statusLabels[sale.status] || sale.status}
                </Badge>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {Number(sale.total).toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="flex items-center gap-2">
                {['submitted', 'approved'].includes(sale.status) && caps['sales_order.approve'] && (
                  <Button
                    disabled={busy}
                    size="sm"
                    variant="primary"
                    className="h-8 shadow-sm"
                    onClick={() =>
                      run(async () => {
                        await mutate(`/api/crm/orders/${sale.id}/actions`, { action: 'approve' });
                        await loadSale();
                        toast.success('Đã giữ đúng lô và tạo phiếu xuất chờ duyệt');
                      })
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Duyệt đơn / Tạo phiếu xuất
                  </Button>
                )}

                {['submitted', 'approved'].includes(sale.status) && caps['sales_order.cancel'] && (
                  <Button
                    size="sm"
                    disabled={busy}
                    variant="ghost"
                    className="h-8 text-rose-600 hover:bg-rose-50"
                    onClick={() =>
                      run(async () => {
                        await mutate(`/api/crm/orders/${sale.id}/actions`, { action: 'cancel' });
                        await loadSale();
                        toast.success('Đã hủy và giải phóng hàng giữ');
                      })
                    }
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    Hủy đơn chưa giao
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSaleId('');
                    setSale(null);
                  }}
                >
                  Lập đơn khác
                </Button>
              </div>
            </div>

            {/* Chi tiết các dòng đơn bán */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Thành phẩm</th>
                    <th className="py-2.5 px-3">Mã lô xuất</th>
                    <th className="py-2.5 px-3 text-right">Số lượng</th>
                    <th className="py-2.5 px-3 text-right">Đã giao</th>
                    <th className="py-2.5 px-3">Đơn vị</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá bán (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.lines.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {l.description} · <span className="font-mono text-slate-500">{l.item_code}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-700">{l.lot_code}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">{Number(l.qty)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">{Number(l.delivered_qty)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{l.unit_name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {Number(l.unit_price).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <StockDocuments documents={sale.documents} capabilities={caps} onChanged={() => loadSale()} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 3. BỘ CHỌN DỰ ÁN & LỆNH SẢN XUẤT */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-2">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="font-semibold text-slate-700 text-xs">Dự án công trình</span>
                <select
                  aria-label="Dự án bán thành phẩm"
                  className={fieldClass}
                  value={project}
                  onChange={(e) => {
                    setProject(e.target.value);
                    setProduction('');
                  }}
                >
                  <option value="">-- Chọn dự án cần xuất bán --</option>
                  {meta.projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="font-semibold text-slate-700 text-xs">Lọc theo lệnh sản xuất cụ thể</span>
                <select
                  aria-label="Lệnh sản xuất bán"
                  className={fieldClass}
                  value={production}
                  onChange={(e) => setProduction(e.target.value)}
                >
                  <option value="">Tất cả các lệnh của dự án</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} · {o.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="p-2.5 bg-blue-50/50 border border-blue-200/80 rounded text-blue-900 text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Chọn từng lô đã nhập kho để bán. Mỗi lô gắn riêng với hạng mục và maket; số lượng còn bán đã được tự động
                khấu trừ hàng đang giữ trong các đơn khác.
              </span>
            </div>
          </div>

          {/* 4. BẢNG THÀNH PHẨM KHẢ DỤNG THEO LÔ */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-800 text-xs">
              Thành phẩm khả dụng đã nhập kho ({products.length})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">Chọn</th>
                    <th className="py-2 px-3">Hạng mục / Mã hàng</th>
                    <th className="py-2 px-3">Maket thiết kế</th>
                    <th className="py-2 px-3">Lệnh SX</th>
                    <th className="py-2 px-3">Mã lô</th>
                    <th className="py-2 px-3">Kho lưu</th>
                    <th className="py-2 px-3 text-right">Còn khả dụng</th>
                    <th className="py-2 px-3">Đơn vị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const key = `${p.lot_id}:${p.warehouse_id}`;
                    const isChecked = selected.some((s) => s.key === key);
                    return (
                      <tr
                        key={key}
                        className={`hover:bg-slate-50/60 transition-colors ${isChecked ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            aria-label={`Chọn lô ${p.lot_code}`}
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelected((ls) =>
                                e.target.checked
                                  ? [...ls, { ...p, key, qty: 0, unitPrice: 0 }]
                                  : ls.filter((s) => s.key !== key)
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {p.line_title} · <span className="font-mono text-slate-500">{p.item_code}</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {p.design_snapshot?.design?.proof?.code || p.design_proof_id}
                        </td>
                        <td className="py-2 px-3 font-mono text-blue-600">{p.production_code}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-700">{p.lot_code}</td>
                        <td className="py-2 px-3 text-slate-600">{p.warehouse_name}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {Number(p.available_qty)}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{p.unit_name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!products.length && (
                <div className="py-8 text-center text-slate-400">
                  <Boxes className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                  <p className="text-xs">Chưa có thành phẩm khả dụng nào đã nhập kho cho lựa chọn này.</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. BẢNG NHẬP SỐ LƯỢNG VÀ ĐƠN GIÁ BÁN CHO CÁC LÔ ĐÃ TICK */}
          {!!selected.length && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden space-y-2">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-800 text-xs">
                Thiết lập số lượng & Giá bán các lô đã chọn ({selected.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Hạng mục & Lô bán</th>
                      <th className="py-2 px-3 w-40 text-right">Số lượng bán</th>
                      <th className="py-2 px-3 w-48 text-right">Đơn giá bán (VNĐ)</th>
                      <th className="py-2 px-3 text-right w-44">Thành tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.map((s, n) => (
                      <tr key={s.key} className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {s.line_title} · <span className="font-mono text-blue-700">{s.lot_code}</span>
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            aria-label={`Lượng ${s.lot_code}`}
                            className={`${fieldClass} font-mono text-right`}
                            type="number"
                            min="0"
                            max={Number(s.available_qty)}
                            step="any"
                            value={s.qty}
                            onChange={(e) =>
                              setSelected((ls) =>
                                ls.map((v, i) => (i === n ? { ...v, qty: Number(e.target.value) } : v))
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <input
                            aria-label={`Giá ${s.lot_code}`}
                            className={`${fieldClass} font-mono text-right`}
                            type="number"
                            min="0"
                            step="any"
                            value={s.unitPrice}
                            onChange={(e) =>
                              setSelected((ls) =>
                                ls.map((v, i) => (i === n ? { ...v, unitPrice: Number(e.target.value) } : v))
                              )
                            }
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {(s.qty * s.unitPrice).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. THANH CÔNG CỤ CÔNG NỢ & TẠO ĐƠN */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={ar}
                  onChange={(e) => setAr(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Ghi nhận công nợ một lần theo đơn bán
              </label>

              {ar && (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <span>Hạn thanh toán:</span>
                  <input
                    className={`${fieldClass} w-20 text-center font-mono`}
                    type="number"
                    min="1"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                  <span>ngày</span>
                </label>
              )}
            </div>

            <Button
              size="sm"
              variant="primary"
              className="h-8 shadow-sm px-4"
              disabled={busy || !selected.length || !caps['sales_order.create']}
              onClick={() =>
                run(async () => {
                  const customerId = meta.projects.find((p: any) => p.id === project)?.customer_id;
                  const r = await mutate('/api/crm/orders', {
                    projectId: project,
                    productionOrderId: production || undefined,
                    customerId,
                    recordReceivable: ar,
                    paymentDays: days,
                    lines: selected.map((s) => ({
                      itemId: s.item_id,
                      unitId: s.base_unit_id,
                      lotId: s.lot_id,
                      warehouseId: s.warehouse_id,
                      productionOrderLineId: s.production_order_line_id,
                      qty: s.qty,
                      unitPrice: s.unitPrice,
                    })),
                  });
                  const id = r.orderId || r.order?.id;
                  setSaleId(id);
                  await loadSale(id);
                  toast.success('Đã tạo đơn bán chờ duyệt');
                })
              }
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Lập đơn bán chờ duyệt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
