export interface CatalogMaterial {
  id: string; code: string; name: string; kind: string; baseUnitId: string; isActive: boolean;
  bom?: Array<{ itemId?: string; unitId?: string; unit?: string; quantity: number; wasteRate?: number }>;
  conversions: Array<{ unitId: string; unitName?: string; unitCode?: string; factor: number }>;
}
export interface MappedBomLine {
  id?: string; representativeId: string; description: string; itemId?: string; unitId?: string;
  quantity: number; wasteRate?: number; notes?: string;
}
export interface ExpandedMaterial { itemId: string; unitId: string; baseQty: number; paths: Array<{ lineId?: string; description: string; itemIds: string[] }> }
export function positive(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} phải lớn hơn 0`);
  return n;
}
export function nonnegative(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} không được âm`);
  return n;
}
export function unitFactor(item: CatalogMaterial, unitId?: string, legacyUnit?: string): number {
  if (unitId === item.baseUnitId) return 1;
  const candidates = item.conversions.filter(c => unitId ? c.unitId === unitId : legacyUnit &&
    [c.unitName, c.unitCode].some(u => u?.toLocaleLowerCase('vi') === legacyUnit.toLocaleLowerCase('vi')));
  if (candidates.length !== 1) throw new Error(`Thiếu hoặc trùng quy đổi đơn vị của ${item.code}`);
  return positive(candidates[0].factor, `Hệ số quy đổi ${item.code}`);
}
export function expandMappedBom(lines: MappedBomLine[], catalog: CatalogMaterial[], outputQty = 1): ExpandedMaterial[] {
  if (!lines.length) throw new Error('BOM chưa có dòng vật tư');
  positive(outputQty, 'Sản lượng');
  const result = new Map<string, ExpandedMaterial>();
  const items = new Map(catalog.map(i => [i.id, i]));
  function visit(itemId: string | undefined, qty: number, unitId: string | undefined, legacyUnit: string | undefined,
    path: string[], source: MappedBomLine, waste: number) {
    const item = itemId ? items.get(itemId) : undefined;
    if (!item || !item.isActive || item.kind === 'service' || item.kind === 'tool') throw new Error(`Chưa gán vật tư hợp lệ: ${source.description}`);
    if (path.includes(item.id)) throw new Error(`BOM vòng lặp: ${[...path, item.code].join(' → ')}`);
    if (path.length >= 30) throw new Error('BOM vượt quá 30 cấp; kiểm tra lại cấu trúc');
    if (!Number.isFinite(waste) || waste < 0 || waste > 100) throw new Error('Hao hụt phải từ 0 đến 100%');
    const baseQty = positive(qty, `Số lượng ${item.code}`) * unitFactor(item, unitId, legacyUnit) * (1 + waste / 100);
    const next = [...path, item.id];
    if(['product','semi_finished'].includes(item.kind) && item.bom!=null && !Array.isArray(item.bom))throw new Error(`BOM cấu thành không hợp lệ: ${item.code}`);
    if (['product', 'semi_finished'].includes(item.kind) && Array.isArray(item.bom) && item.bom.length) {
      for (const child of item.bom) {if(!child || typeof child!=='object')throw new Error(`BOM cấu thành không hợp lệ: ${item.code}`);visit(child.itemId, baseQty * positive(child.quantity, `Định mức ${item.code}`), child.unitId, child.unit, next, source, Number(child.wasteRate || 0));}
    } else {
      const entry = result.get(item.id) || { itemId: item.id, unitId: item.baseUnitId, baseQty: 0, paths: [] };
      entry.baseQty += baseQty;
      entry.paths.push({ lineId: source.id, description: source.description, itemIds: next });
      result.set(item.id, entry);
    }
  }
  for (const line of lines) {
    if (!line.representativeId || !line.unitId) throw new Error(`Thiếu đại diện/đơn vị: ${line.description}`);
    visit(line.itemId, positive(line.quantity, 'Số lượng BOM') * outputQty, line.unitId, undefined, [], line, Number(line.wasteRate || 0));
  }
  return [...result.values()].map(e => ({ ...e, baseQty: Math.ceil((e.baseQty - 1e-9) * 1e6) / 1e6 }));
}
export const DEFAULT_STEPS = ['Chuẩn bị / Cắt', 'Gia công / Lắp ráp', 'Hoàn thiện', 'QC / Đóng gói'];
export function requiredQcChecks(electrical: boolean) {
  return ['dimensions', 'appearance', 'structure', 'accessories', ...(electrical ? ['electrical', 'lightUniformity'] : [])];
}
export function validatePhotos(photos:unknown){
 if(!Array.isArray(photos)||photos.length>20 || photos.some(v=>typeof v!=='string'||v.length>1024*1024 || !/^(https?:\/\/|\/api\/files\/|data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$)/.test(v)) || photos.reduce((n:number,v:string)=>n+v.length,0)>3*1024*1024)throw new Error('Ảnh không hợp lệ hoặc tổng ảnh quá lớn; chia thành các lần ghi nhật ký');
}
