'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuthorization } from '@/hooks/use-authorization';
import type { ProductBomCatalogItem } from '@/lib/product-bom';
import { formatParameterValue, materialStage, type MaterialProposalView, type ProductParameterSchema, type SurveyMaterialItem } from '@/lib/material-workflow-ui';

export function SurveyProductSummary({ projectId, items, catalog, schemas, proposals, loading, error, onSelect }: {
  projectId: string;
  items: SurveyMaterialItem[];
  catalog: ProductBomCatalogItem[];
  schemas: ProductParameterSchema[];
  proposals: MaterialProposalView[];
  loading: boolean;
  error: string;
  onSelect: (itemId: string, proposalId?: string) => void;
}) {
  const { can } = useAuthorization();
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 border-t border-slate-100 pt-3">
    {items.filter(item => item.productItemId).map(item => {
      const product = catalog.find(p => p.id === item.productItemId);
      const definitions = schemas.find(s => s.id === item.parameterSchemaId)?.definitions || product?.definitions || [];
      const stage = materialStage(item, proposals);
      return <div key={item.id} data-testid={`survey-product-${item.id}`} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><p className="font-semibold text-slate-900">{item.itemTitle}</p><p className="text-slate-600">{product ? `${product.code} · ${product.name}` : 'Thành phẩm trong khảo sát'}</p></div>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${stage.tone}`}>{loading ? 'Đang tải trạng thái…' : error ? 'Chưa tải được trạng thái' : stage.label}</span>
        </div>
        <p className="font-medium">Số lượng: {formatParameterValue(item.quantity)} {product?.units.find(u => u.id === product.baseUnitId)?.name}</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">{definitions.map(d => <div key={d.key}><dt className="text-slate-500">{d.label}{d.unit ? ` (${d.unit})` : ''}</dt><dd className="font-medium text-slate-800">{formatParameterValue(item.parameterValues?.[d.key])}</dd></div>)}</dl>
        {!definitions.length && <p className="text-amber-700">Chưa tải được thông số của thành phẩm.</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {stage.kind === 'order' && can('production_order.read') && <Link className="font-semibold text-blue-700" href={`/san-xuat/${stage.proposal.production_order_id}`}>Mở lệnh sản xuất →</Link>}
          {stage.kind === 'confirmed' && can('production_order.create') && stage.proposal.bom_id && <Link className="font-semibold text-blue-700" href={`/san-xuat?projectId=${projectId}&draftBomId=${stage.proposal.bom_id}`}>Lập lệnh sản xuất →</Link>}
          <Button type="button" size="sm" variant={stage.kind === 'missing' || stage.kind === 'changed' ? 'primary' : 'outline'} disabled={loading || !!error} onClick={() => onSelect(item.id, stage.kind === 'changed' ? undefined : stage.proposal?.id)}>
            {stage.kind === 'missing' || stage.kind === 'changed' ? can('project.update') ? 'Lập đề xuất NVL' : 'Xem đề xuất NVL' : stage.kind === 'draft' ? 'Rà soát đề xuất' : 'Xem đề xuất'}
          </Button>
        </div>
      </div>;
    })}
  </div>;
}
