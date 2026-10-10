'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Badge, toast } from '@/components/ui';
import { useWorkflowMutation, statusLabels, statusVariants } from './client';
import { ExternalLink, Check, CheckCircle2, XCircle, RotateCcw, FileText } from 'lucide-react';

export function StockDocuments({
  documents,
  capabilities,
  onChanged,
}: {
  documents: any[];
  capabilities: any;
  onChanged: () => Promise<void>;
}) {
  const { busy, mutate, run } = useWorkflowMutation();

  const names: Record<string, string> = {
    production_material: 'Cấp NVL sản xuất',
    production_return: 'Trả NVL dư',
    production_output: 'Nhập kho thành phẩm',
    sales_fulfillment: 'Xuất giao hàng',
    reversal: 'Phiếu đảo chứng từ',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800 text-xs">Danh sách chứng từ kho liên kết ({documents.length})</span>
        </div>
        <span className="text-[11px] text-slate-500">Tự động cập nhật theo quy trình sản xuất</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap">Mã phiếu kho</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Loại nghiệp vụ</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Trạng thái</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">Thao tác xử lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <Link
                    href={`/kho/nhap-xuat?documentId=${d.id}`}
                    className="inline-flex items-center gap-1 font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {d.code}
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                  {names[d.workflow_kind] || d.type}
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <Badge variant={statusVariants[d.status] || 'neutral'} dot>
                    {statusLabels[d.status] || d.status}
                  </Badge>
                </td>
                <td className="py-2 px-3 whitespace-nowrap text-right">
                  <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                    {d.status === 'submitted' && capabilities['stock_document.approve'] && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-xs px-2.5"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await mutate(`/api/inventory/documents/${d.id}/approve`, {});
                            toast.success('Đã duyệt phiếu kho');
                            await onChanged();
                          })
                        }
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Duyệt
                      </Button>
                    )}

                    {d.status === 'approved' &&
                      (capabilities['stock_document.post'] || capabilities['stock_document.complete']) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await mutate(`/api/inventory/documents/${d.id}/complete`, {});
                              toast.success('Đã xác nhận thực tế phiếu kho');
                              await onChanged();
                            })
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Xác nhận thực tế
                        </Button>
                      )}

                    {['draft', 'submitted', 'approved'].includes(d.status) &&
                      capabilities['stock_document.cancel'] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await mutate(`/api/inventory/documents/${d.id}`, {}, 'DELETE');
                              toast.success('Đã hủy phiếu kho');
                              await onChanged();
                            })
                          }
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                          Hủy phiếu
                        </Button>
                      )}

                    {d.status === 'completed' &&
                      d.workflow_kind !== 'reversal' &&
                      capabilities['stock_document.reverse'] &&
                      capabilities['stock_document.create'] && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await mutate(`/api/inventory/documents/${d.id}/reverse`, {});
                              toast.success('Đã lập phiếu đảo chứng từ');
                              await onChanged();
                            })
                          }
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Lập phiếu đảo
                        </Button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!documents.length && (
        <div className="py-8 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
          <p className="text-xs">Chưa phát sinh phiếu kho nào trong tiến trình này.</p>
        </div>
      )}
    </div>
  );
}
