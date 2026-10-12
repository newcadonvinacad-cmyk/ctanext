export interface ParameterDefinition {
  key: string;
  label: string;
  type: 'number' | 'text' | 'boolean';
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
}
export type ParameterValues = Record<string, number | string | boolean>;
export interface ProductBomLine {
  itemId: string;
  unitId: string;
  quantity: number;
  wasteRate: number;
  notes: string;
}
export interface ProductBomCatalogItem {
  id: string; code: string; name: string; kind: string; baseUnitId: string;
  units: Array<{ id: string; name: string; factor: number }>;
  schemaId?: string; schemaVersion?: number; definitions?: ParameterDefinition[];
}
export interface ProductBomSample {
  id: string; productItemId: string; schemaId: string | null; name: string;
  status: 'draft' | 'confirmed' | 'archived'; parameterValues: ParameterValues;
  lines: ProductBomLine[]; version: number; legacySource: unknown; notes: string;
}
export function validateDefinitions(input: unknown): ParameterDefinition[] {
  if (!Array.isArray(input) || input.length > 40) throw new Error('Danh sách thông số không hợp lệ (tối đa 40)');
  const keys = new Set<string>();
  return input.map(d => {
    if (!d || typeof d !== 'object' || !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(d.key || '') || keys.has(d.key)) throw new Error('Mã thông số phải duy nhất, bắt đầu bằng chữ và chỉ gồm chữ, số, dấu gạch dưới');
    keys.add(d.key);
    if (typeof d.label !== 'string' || !d.label.trim() || d.label.length > 120 || !['number','text','boolean'].includes(d.type)) throw new Error('Tên hoặc kiểu thông số không hợp lệ');
    const result: ParameterDefinition = {key:d.key,label:d.label.trim(),type:d.type,required:d.required !== false};
    if (d.unit) result.unit = String(d.unit).trim().slice(0,30);
    for (const k of ['min','max'] as const) if (d[k] !== undefined && d[k] !== '') {
      if (d.type !== 'number' || typeof d[k] !== 'number' || !Number.isFinite(d[k])) throw new Error('Giới hạn thông số phải là số hữu hạn');
      result[k] = d[k];
    }
    if (result.min !== undefined && result.max !== undefined && result.min > result.max) throw new Error('Giá trị nhỏ nhất phải không lớn hơn giá trị lớn nhất');
    return result;
  });
}
export function validateParameterValues(definitions: ParameterDefinition[], input: unknown): ParameterValues {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Giá trị thông số không hợp lệ');
  const raw = input as Record<string, unknown>, result: ParameterValues = {};
  if (Object.keys(raw).some(k => !definitions.some(d => d.key === k))) throw new Error('Có thông số không thuộc phiên bản thành phẩm');
  for (const d of definitions) {
    const v = raw[d.key];
    if (v === undefined || v === null || v === '') { if (d.required) throw new Error(`Thiếu thông số ${d.label}`); continue; }
    if (d.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v)>1e12 || (d.min !== undefined && v<d.min) || (d.max !== undefined && v>d.max)) throw new Error(`Thông số ${d.label} ngoài giới hạn hoặc không phải số`);
      result[d.key]=v;
    } else if (d.type === 'boolean') {
      if (typeof v !== 'boolean') throw new Error(`Thông số ${d.label} phải là có/không`);
      result[d.key]=v;
    } else {
      if (typeof v !== 'string' || !v.trim() || v.length>500) throw new Error(`Thông số ${d.label} phải là văn bản (tối đa 500 ký tự)`);
      result[d.key]=v.trim();
    }
  }
  return result;
}
export function validateProductBomLines(input: unknown, catalog: ProductBomCatalogItem[]): ProductBomLine[] {
  if (!Array.isArray(input) || !input.length || input.length > 200) throw new Error('BOM phải có từ 1 đến 200 dòng');
  return input.map(l => {
    const item = catalog.find(i=>i.id===l?.itemId && ['material','service'].includes(i.kind));
    if (!item || !item.units.some(u=>u.id===l.unitId && Number.isFinite(u.factor) && u.factor>0)) throw new Error('NVL/dịch vụ hoặc đơn vị quy đổi không hợp lệ');
    if (typeof l.quantity!=='number' || !Number.isFinite(l.quantity) || l.quantity<=0 || l.quantity>1e9) throw new Error('Định mức phải lớn hơn 0 và không vượt 1 tỷ');
    const waste = l.wasteRate ?? 0;
    if (typeof waste!=='number' || !Number.isFinite(waste) || waste<0 || waste>100) throw new Error('Hao hụt phải từ 0 đến 100%');
    const quantity=Math.round(l.quantity*1e6)/1e6;
    if(quantity<=0)throw new Error('Định mức phải từ 0,000001 trở lên');
    return {itemId:item.id,unitId:l.unitId,quantity,wasteRate:Math.round(waste*1e4)/1e4,notes:String(l.notes || '').slice(0,2000)};
  });
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '['+value.map(canonicalJson).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}';
  return JSON.stringify(value) ?? 'null';
}
