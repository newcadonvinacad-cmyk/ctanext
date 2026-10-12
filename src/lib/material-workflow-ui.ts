import { canonicalJson, type ParameterDefinition, type ParameterValues, type ProductBomLine } from './product-bom';

export interface SurveyMaterialItem {
  id: string;
  itemTitle: string;
  quantity: number;
  productItemId?: string | null;
  parameterSchemaId?: string | null;
  parameterValues?: ParameterValues;
  notes?: string;
  designatedItemText?: string;
}

export interface ProductParameterSchema {
  id: string;
  productItemId: string;
  version: number;
  definitions: ParameterDefinition[];
}

export interface MaterialProposalView {
  id: string;
  survey_item_id?: string | null;
  created_at?: string;
  status: 'draft' | 'confirmed';
  method: 'ai' | 'exact_sample';
  version: number;
  bom_id?: string | null;
  production_order_id?: string | null;
  review_notes?: string;
  explanation: string;
  warnings: string[];
  lines: ProductBomLine[];
  source_snapshot: {
    surveyItemId: string;
    surveyId: string;
    title: string;
    productItemId: string;
    productCode: string;
    productName: string;
    outputUnitId: string;
    schemaId: string;
    schemaVersion: number;
    definitions: ParameterDefinition[];
    parameterValues: ParameterValues;
    quantity: number;
    notes?: string;
    designatedItemText?: string;
    references: Array<{ id: string; name: string; version: number; parameterValues: ParameterValues; lines: ProductBomLine[] }>;
  };
}

export interface MaterialProposalFocus {
  surveyItemId: string;
  proposalId?: string;
  token: number;
}

export function formatParameterValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Chưa nhập';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return typeof value === 'number' ? value.toLocaleString('vi-VN', { maximumFractionDigits: 6 }) : String(value);
}

export function proposalMatchesSurvey(proposal: MaterialProposalView, item: SurveyMaterialItem): boolean {
  const source = proposal.source_snapshot;
  return source.surveyItemId === item.id && source.productItemId === item.productItemId
    && source.schemaId === item.parameterSchemaId && Number(source.quantity) === Number(item.quantity)
    && source.title === item.itemTitle && (source.notes || '') === (item.notes || '')
    && (source.designatedItemText || '') === (item.designatedItemText || '')
    && canonicalJson(source.parameterValues) === canonicalJson(item.parameterValues || {});
}

export function materialStage(item: SurveyMaterialItem, proposals: MaterialProposalView[]) {
  const related = proposals.filter(p => p.source_snapshot.surveyItemId === item.id)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const order = related.find(p => p.production_order_id);
  if (order) return { kind: 'order', label: 'Đã có lệnh sản xuất', tone: 'bg-blue-50 text-blue-700 border-blue-200', proposal: order } as const;
  const current = related.find(p => proposalMatchesSurvey(p, item));
  if (current?.status === 'confirmed') return { kind: 'confirmed', label: 'Đã xác nhận', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', proposal: current } as const;
  if (current) return { kind: 'draft', label: 'Chờ rà soát', tone: 'bg-amber-50 text-amber-700 border-amber-200', proposal: current } as const;
  if (related.length) return { kind: 'changed', label: 'Khảo sát đã thay đổi', tone: 'bg-amber-50 text-amber-700 border-amber-200', proposal: related[0] } as const;
  return { kind: 'missing', label: 'Chưa có đề xuất', tone: 'bg-slate-50 text-slate-600 border-slate-200', proposal: undefined } as const;
}
