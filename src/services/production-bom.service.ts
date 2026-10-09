import type { PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import { getNextDocumentCode } from '@/lib/sequences';
import { expandMappedBom, positive, type CatalogMaterial, type MappedBomLine } from '@/lib/production/bom';
import { assertProject, assertWarehouse, requireCapability, transaction, once, WorkflowError, type WorkflowContext } from '@/lib/production/context';

export async function loadCatalog(db: Pick<PoolClient, 'query'>, orgId: string): Promise<CatalogMaterial[]> {
  const r = await db.query(`SELECT i.*,u.name AS base_unit_name,u.code AS base_unit_code,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('unitId',c.unit_id,'unitName',cu.name,'unitCode',cu.code,'factor',c.factor_to_base)) FROM erp.item_unit_conversions c JOIN erp.units cu ON cu.organization_id=c.organization_id AND cu.id=c.unit_id WHERE c.organization_id=i.organization_id AND c.item_id=i.id AND c.valid_from<=now() AND (c.valid_to IS NULL OR c.valid_to>now())),'[]') AS conversions
   FROM erp.items i JOIN erp.units u ON u.organization_id=i.organization_id AND u.id=i.base_unit_id WHERE i.organization_id=$1`, [orgId]);
  return r.rows.map(i => ({ id: i.id, code: i.code, name: i.name, kind: i.kind, baseUnitId: i.base_unit_id,
    isActive: i.is_active && i.track_stock, bom: Array.isArray(i.specification?.bom)?i.specification.bom.map((b:any)=>b && typeof b==='object'?{itemId:b.itemId,unitId:b.unitId,unit:b.unit,quantity:b.quantity,wasteRate:b.wasteRate}:b):i.specification?.bom, conversions: [{ unitId: i.base_unit_id, unitName: i.base_unit_name, unitCode: i.base_unit_code, factor: 1 }, ...i.conversions.filter((c:any)=>c.unitId!==i.base_unit_id)] }));
}
export function mapBomLine(l: any): MappedBomLine {
  return { id: l.id, representativeId: l.representative_id, description: l.description, itemId: l.item_id || undefined,
    unitId: l.unit_id || undefined, quantity: Number(l.quantity), wasteRate: Number(l.waste_rate), notes: l.notes };
}
export class ProductionBomService {
  static async createRepresentative(ctx:WorkflowContext,input:any){
    requireCapability(ctx,'item.update');
    const codes=['frame','face','letters','logo','color_strip','lighting','power','accessories','other'];
    if(!codes.includes(input.code)||!input.name?.trim()||!['area','perimeter','count','manual'].includes(input.quantityBasis))throw new WorkflowError('Đại diện/cách tính không hợp lệ');
    return transaction(ctx,db=>once(db,ctx,input.requestId,'representative.create',input,async()=>{
      const r=await db.query('INSERT INTO erp.material_representatives(organization_id,code,name,specification_key,quantity_basis) VALUES($1,$2,$3,$4,$5) RETURNING *',[ctx.orgId,input.code,input.name.trim(),input.specificationKey?.trim() || '',input.quantityBasis]);return {representative:r.rows[0]};
    }));
  }
  static async representatives(ctx: WorkflowContext) {
    requireCapability(ctx, 'item.read');
    return (await getDbPool().query('SELECT * FROM erp.material_representatives WHERE organization_id=$1 ORDER BY code,specification_key', [ctx.orgId])).rows;
  }
  static async saveRepresentative(ctx: WorkflowContext, id: string, input: any) {
    requireCapability(ctx, 'item.update');
    return transaction(ctx, async db => {
      const catalog = await loadCatalog(db, ctx.orgId);
      if (input.defaultItemId) {
        const item = catalog.find(i => i.id === input.defaultItemId && i.isActive);
        if (!item || !input.defaultUnitId || !item.conversions.some(c => c.unitId === input.defaultUnitId)) throw new WorkflowError('Vật tư/đơn vị gán mặc định không hợp lệ');
      }
      const basis = input.quantityBasis || 'manual';
      if (!['area','perimeter','count','manual'].includes(basis)) throw new WorkflowError('Cách tính lượng không hợp lệ');
      positive(input.rules?.coefficient ?? 1,'Hệ số định mức');
      const waste=Number(input.rules?.wasteRate ?? 0);if(!Number.isFinite(waste)||waste<0||waste>100)throw new WorkflowError('Hao hụt từ 0 đến 100%');
      const r = await db.query(`UPDATE erp.material_representatives SET default_item_id=$1,default_unit_id=$2,quantity_basis=$3,rules=$4,updated_at=now() WHERE organization_id=$5 AND id=$6 RETURNING *`,
        [input.defaultItemId || null, input.defaultUnitId || null, basis, input.rules || {}, ctx.orgId, id]);
      if (!r.rows[0]) throw new WorkflowError('Không tìm thấy đại diện',404);
      return r.rows[0];
    });
  }
  static async fromDesign(ctx: WorkflowContext, input: any) {
    return transaction(ctx, db => once(db,ctx,input.requestId,'bom.from-design',input,async () => {
      await assertProject(db,ctx,input.projectId,'production_order.create');
      const proof = (await db.query('SELECT * FROM erp.design_proofs WHERE organization_id=$1 AND project_id=$2 AND id=$3 FOR SHARE', [ctx.orgId,input.projectId,input.designProofId])).rows[0];
      if (!proof || proof.status !== 'approved') throw new WorkflowError('Chọn maket đã duyệt của đúng dự án');
      let spec: any;
      try { spec = JSON.parse(proof.client_feedback || '{}')._parametricSpec; } catch { throw new WorkflowError('Maket thiếu thông số thiết kế; mở và lưu lại bản vẽ'); }
      const surveyId = input.surveyId || spec?.surveyId;
      if (!surveyId || (spec?.surveyId && surveyId !== spec.surveyId)) throw new WorkflowError('Khảo sát không khớp maket');
      const survey = (await db.query('SELECT * FROM erp.site_surveys WHERE organization_id=$1 AND project_id=$2 AND id=$3 FOR SHARE',[ctx.orgId,input.projectId,surveyId])).rows[0];
      if (!survey) throw new WorkflowError('Không tìm thấy khảo sát thuộc dự án');
      const width = positive(spec?.input?.widthMeters,'Chiều rộng maket');
      const height = positive(spec?.input?.heightMeters,'Chiều cao maket');
      const code = await getNextDocumentCode(db,ctx.orgId,'bom','BOM');
      const bom = (await db.query(`INSERT INTO erp.project_boms(organization_id,code,title,project_id,signage_type,width_meters,height_meters,design_proof_id,survey_id,source_snapshot,created_by,updated_by)
        VALUES($1,$2,$3,$4,'other',$5,$6,$7,$8,$9,$10,$10) RETURNING *`,[ctx.orgId,code,input.title || `BOM ${proof.title}`,input.projectId,width,height,proof.id,survey.id,{proof,survey,parametricSpec:spec},ctx.userId])).rows[0];
      const reps = (await db.query('SELECT * FROM erp.material_representatives WHERE organization_id=$1 ORDER BY specification_key DESC',[ctx.orgId])).rows;
      const definitions = [
        { code:'frame', quantity:2*(width+height), description:'Khung bao theo kích thước maket', notes:'Kiểm tra thêm xương, giằng và quy đổi mét sang quy cách kho.' },
        { code:'face', quantity:width*height, description:`Mặt biển: ${survey.metadata?.signMaterial || spec.input.materialType || proof.background_material || 'Chưa chọn vật liệu'}`, notes:'Diện tích mặt biển; bổ sung số mặt, lề nối/cắt và hao hụt thực tế.' },
        { code:'letters', quantity:1, description:'Bộ chữ / nhận diện theo maket', notes:'Bộ chữ theo bản vẽ; gán đúng thành phẩm đại diện hoặc thêm các NVL gia công.' },
        ...(survey.metadata?.hasMicaLogo65 === true ? [{code:'logo',quantity:1,description:'Logo mica theo khảo sát',notes:'Kiểm tra quy cách logo đã chốt.'}] : []),
      ];
      const itemCatalog = await loadCatalog(db,ctx.orgId);
      let no=1;
      for (const d of definitions) {
        const specification = d.code === 'face' ? (survey.metadata?.signMaterial || spec.input.materialType || proof.background_material || '') : d.code==='frame'?(survey.metadata?.ironBoxType || ''):'';
        const rep = reps.find(r => r.code===d.code && r.specification_key===specification) || reps.find(r => r.code===d.code && !r.specification_key);
        if (!rep) throw new WorkflowError(`Thiếu đại diện ${d.code}`);
        const rules = rep.rules || {};
        const basis = rep.quantity_basis === 'area' ? width*height : rep.quantity_basis === 'perimeter' ? 2*(width+height) : rep.quantity_basis==='count'?1:d.quantity;
        const quantity = positive(basis * positive(rules.coefficient ?? 1,'Hệ số đại diện'),'Số lượng');
        const mapped = itemCatalog.find(i => i.id===rep.default_item_id && i.isActive);
        await db.query(`INSERT INTO erp.project_bom_lines(organization_id,bom_id,line_no,representative_id,description,quantity,item_id,unit_id,waste_rate,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [ctx.orgId,bom.id,no++,rep.id,d.description,quantity,mapped?.id || null,mapped ? rep.default_unit_id : null,Number(rules.wasteRate || 0),d.notes]);
      }
      return {bomId:bom.id};
    }));
  }
  static async detail(ctx: WorkflowContext, id: string, db: Pick<PoolClient,'query'> = getDbPool(), permission: any = 'production_order.read') {
    const bom = (await db.query('SELECT * FROM erp.project_boms WHERE organization_id=$1 AND id=$2',[ctx.orgId,id])).rows[0];
    if (!bom) throw new WorkflowError('Không tìm thấy BOM',404);
    if (!bom.project_id) throw new WorkflowError('BOM chưa gắn dự án');
    await assertProject(db,ctx,bom.project_id,permission);
    const rows = (await db.query(`SELECT l.*,r.name AS representative_name,i.name AS item_name,i.code AS item_code,u.name AS unit_name FROM erp.project_bom_lines l JOIN erp.material_representatives r ON r.organization_id=l.organization_id AND r.id=l.representative_id LEFT JOIN erp.items i ON i.organization_id=l.organization_id AND i.id=l.item_id LEFT JOIN erp.units u ON u.organization_id=l.organization_id AND u.id=l.unit_id WHERE l.organization_id=$1 AND l.bom_id=$2 ORDER BY l.line_no`,[ctx.orgId,id])).rows;
    const warehouses=(await db.query('SELECT id FROM erp.warehouses WHERE organization_id=$1 AND is_active=true',[ctx.orgId])).rows;
    const readable=[];const stockPermission=ctx.capabilities['stock_document.read']?.isEnabled?'stock_document.read':'stock_document.create';
    for(const w of warehouses){try{await assertWarehouse(db,ctx,w.id,stockPermission);readable.push(w.id);}catch(e){if(!(e instanceof WorkflowError)||e.status!==403)throw e;}}
    const balances = (await db.query('SELECT b.item_id,SUM(b.on_hand_qty-b.reserved_qty) AS available FROM erp.stock_balances b JOIN erp.stock_lots l ON l.organization_id=b.organization_id AND l.id=b.lot_id WHERE b.organization_id=$1 AND b.warehouse_id=ANY($2::uuid[]) AND (l.project_id IS NULL OR l.project_id=$3) GROUP BY b.item_id',[ctx.orgId,readable,bom.project_id])).rows;
    const lines = rows.map(l=>({...l,available_base_qty:Number(balances.find(b=>b.item_id===l.item_id)?.available || 0)}));
    let expanded: any[]=[]; let expansionError='';
    try { expanded=expandMappedBom(lines.map(mapBomLine),await loadCatalog(db,ctx.orgId)); } catch(e:any){expansionError=e.message;}
    return {...bom,lines,expanded,materialAvailability:Object.fromEntries(balances.map(b=>[b.item_id,Number(b.available)])),expansionError,needsMapping:!bom.design_proof_id || !bom.survey_id || !lines.length || Boolean(expansionError)};
  }
  static async save(ctx: WorkflowContext,id:string,input:any) {
    return transaction(ctx,async db=>once(db,ctx,input.requestId,'bom.save', {id,...input},async()=>{
      await db.query('SELECT id FROM erp.project_boms WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const bom=await this.detail(ctx,id,db,'production_order.update');
      if (bom.status!=='draft') throw new WorkflowError('BOM đã chốt; tạo phiên bản mới trước khi sửa',409);
      if(!bom.design_proof_id && input.designProofId){
        const proof=(await db.query("SELECT * FROM erp.design_proofs WHERE organization_id=$1 AND project_id=$2 AND id=$3 AND status='approved' FOR SHARE",[ctx.orgId,bom.project_id,input.designProofId])).rows[0];
        if(!proof)throw new WorkflowError('Chọn maket đã duyệt của dự án');
        let spec:any;try{spec=JSON.parse(proof.client_feedback || '{}')._parametricSpec;}catch{throw new WorkflowError('Maket thiếu thông số đã lưu');}
        const survey=(await db.query('SELECT * FROM erp.site_surveys WHERE organization_id=$1 AND project_id=$2 AND id=$3',[ctx.orgId,bom.project_id,spec?.surveyId])).rows[0];
        if(!survey)throw new WorkflowError('Maket chưa gắn khảo sát của dự án');
        const width=positive(spec?.input?.widthMeters,'Chiều rộng maket'),height=positive(spec?.input?.heightMeters,'Chiều cao maket');
        await db.query('UPDATE erp.project_boms SET design_proof_id=$1,survey_id=$2,width_meters=$3,height_meters=$4,source_snapshot=$5 WHERE organization_id=$6 AND id=$7',[proof.id,survey.id,width,height,{proof,survey,parametricSpec:spec},ctx.orgId,id]);
      }
      if (!Array.isArray(input.lines) || !input.lines.length) throw new WorkflowError('BOM cần có ít nhất một dòng');
      const catalog=await loadCatalog(db,ctx.orgId);
      const reps=(await db.query('SELECT id FROM erp.material_representatives WHERE organization_id=$1',[ctx.orgId])).rows.map(r=>r.id);
      for (const line of input.lines as MappedBomLine[]) {
        positive(line.quantity,'Số lượng BOM');
        if(!line.description?.trim() || !reps.includes(line.representativeId))throw new WorkflowError('Thiếu mô tả/đại diện');
        if(line.itemId && !catalog.find(i=>i.id===line.itemId && i.isActive))throw new WorkflowError('Vật tư không hợp lệ');
        if(!Number.isFinite(Number(line.wasteRate || 0)) || Number(line.wasteRate || 0)<0 || Number(line.wasteRate || 0)>100)throw new WorkflowError('Hao hụt phải từ 0 đến 100%');
      }
      let mapped=Boolean(bom.design_proof_id || input.designProofId);
      try{expandMappedBom(input.lines,catalog);}catch{mapped=false;}
      await db.query('DELETE FROM erp.project_bom_lines WHERE organization_id=$1 AND bom_id=$2',[ctx.orgId,id]);
      let no=1;
      for(const line of input.lines as MappedBomLine[])await db.query(`INSERT INTO erp.project_bom_lines(organization_id,bom_id,line_no,representative_id,description,quantity,item_id,unit_id,waste_rate,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[ctx.orgId,id,no++,line.representativeId,line.description.trim(),line.quantity,line.itemId || null,line.unitId || null,line.wasteRate || 0,line.notes || '']);
      await db.query('UPDATE erp.project_boms SET title=$1,notes=$2,mapped=$3,updated_by=$4,updated_at=now(),version=version+1 WHERE organization_id=$5 AND id=$6',[input.title || bom.title,input.notes ?? bom.notes,mapped,ctx.userId,ctx.orgId,id]);
      return {bomId:id,mapped};
    }));
  }
  static async revise(ctx: WorkflowContext,id:string,input:any) {
    return transaction(ctx,db=>once(db,ctx,input.requestId,'bom.revise',{id},async()=>{
      await db.query('SELECT id FROM erp.project_boms WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const b=await this.detail(ctx,id,db,'production_order.update');
      const code=await getNextDocumentCode(db,ctx.orgId,'bom','BOM');
      const n=(await db.query(`INSERT INTO erp.project_boms(organization_id,code,title,project_id,signage_type,width_meters,height_meters,depth_meters,design_proof_id,survey_id,revision_no,previous_revision_id,source_snapshot,mapped,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) RETURNING id`,[ctx.orgId,code,b.title,b.project_id,b.signage_type,b.width_meters,b.height_meters,b.depth_meters,b.design_proof_id,b.survey_id,b.revision_no+1,id,b.source_snapshot,b.mapped,ctx.userId])).rows[0];
      await db.query('UPDATE erp.project_boms SET notes=$1 WHERE organization_id=$2 AND id=$3',[b.notes,ctx.orgId,n.id]);
      await db.query(`INSERT INTO erp.project_bom_lines(organization_id,bom_id,line_no,representative_id,description,quantity,item_id,unit_id,waste_rate,notes) SELECT organization_id,$1,line_no,representative_id,description,quantity,item_id,unit_id,waste_rate,notes FROM erp.project_bom_lines WHERE organization_id=$2 AND bom_id=$3`,[n.id,ctx.orgId,id]);
      return {bomId:n.id};
    }));
  }
}
