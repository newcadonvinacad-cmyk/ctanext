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

  /**
   * Xuất báo cáo / In BOM bóc tách kỹ thuật & Dự toán sản xuất (Gói G - Plan 10.1)
   * Phân quyền:
   * - 'internal': Bao gồm đơn giá vốn, chi phí dự toán (yêu cầu quyền xem giá vốn)
   * - 'workshop': Bản cấp xưởng/kho ẩn giá vốn, chỉ hiển thị số lượng và quy cách kỹ thuật
   */
  static async getBomReport(
    ctx: WorkflowContext,
    bomId: string,
    options: { target?: 'internal' | 'workshop' } = {}
  ) {
    const detail = await this.detail(ctx, bomId);
    const target = options.target || 'workshop';

    // F14: Quyền xem giá vốn chuẩn catalog: item.cost_read hoặc project_finance.read
    const canViewCost = Boolean(
      ctx.capabilities['item.cost_read']?.isEnabled ||
      ctx.capabilities['project_finance.read']?.isEnabled
    );

    if (target === 'internal' && !canViewCost) {
      throw new WorkflowError('Bạn không có quyền xem giá vốn dự toán nội bộ', 403);
    }

    const showCost = target === 'internal' && canViewCost;

    // Lấy chi phí đơn giá ước tính nếu có quyền xem giá vốn
    let totalCost = 0;
    const db = getDbPool();
    const itemIds = detail.lines.map((l: any) => l.item_id).filter(Boolean);
    const itemCostsRes = showCost && itemIds.length > 0
      ? await db.query(
          `SELECT i.id, COALESCE(
             (SELECT unit_cost_snapshot FROM erp.stock_document_lines sdl WHERE sdl.organization_id = $1 AND sdl.item_id = i.id ORDER BY sdl.created_at DESC LIMIT 1),
             (SELECT unit_cost FROM erp.estimate_components ec JOIN erp.quotation_lines ql ON ql.id = ec.quotation_line_id WHERE ql.organization_id = $1 AND ql.item_id = i.id LIMIT 1),
             (SELECT unit_price FROM erp.quotation_lines ql WHERE ql.organization_id = $1 AND ql.item_id = i.id LIMIT 1),
             0
           ) as cost
           FROM erp.items i WHERE i.organization_id = $1 AND i.id = ANY($2::uuid[])`,
          [ctx.orgId, itemIds]
        )
      : { rows: [] };
    const costMap = new Map(itemCostsRes.rows.map((r: any) => [r.id, Number(r.cost) || 0]));

    const lines = detail.lines.map((l: any) => {
      const qty = Number(l.quantity) || 0;
      const waste = Number(l.waste_rate) || 0;
      const netQty = Math.round(qty * (1 + waste / 100) * 1000) / 1000;
      const unitCost = showCost ? (costMap.get(l.item_id) || 0) : undefined;
      const lineCost = showCost ? Math.round(netQty * (unitCost || 0)) : undefined;
      if (lineCost) totalCost += lineCost;

      return {
        lineNo: l.line_no,
        representativeName: l.representative_name,
        description: l.description,
        itemCode: l.item_code || undefined,
        itemName: l.item_name || undefined,
        unitName: l.unit_name || 'Cái',
        quantity: qty,
        wasteRate: waste,
        netQuantity: netQty,
        ...(showCost ? { unitCost, totalCost: lineCost } : {}),
        notes: l.notes || undefined,
      };
    });

    return {
      bom: {
        id: detail.id,
        code: detail.code,
        title: detail.title,
        projectId: detail.project_id,
        signageType: detail.signage_type,
        widthMeters: Number(detail.width_meters) || 0,
        heightMeters: Number(detail.height_meters) || 0,
        depthMeters: Number(detail.depth_meters) || 0,
        revisionNo: detail.revision_no,
        status: detail.status,
      },
      target,
      showCost,
      lines,
      summary: {
        totalLines: lines.length,
        ...(showCost ? { totalEstimatedCost: totalCost } : {}),
      },
    };
  }

  static generateBomPrintHtml(report: any): string {
    const isWorkshop = report.target === 'workshop' || !report.showCost;
    const title = isWorkshop 
      ? 'BẢNG BÓC TÁCH VẬT TƯ SẢN XUẤT (CẤP XƯỞNG / KHO)' 
      : 'BẢNG DỰ TOÁN BÓC TÁCH KỸ THUẬT NỘI BỘ';

    const escapeHtml = (str: any) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const lineRows = report.lines.map((l: any) => `
      <tr>
        <td style="text-align: center;">${l.lineNo}</td>
        <td><strong>${escapeHtml(l.representativeName || '')}</strong></td>
        <td>${escapeHtml(l.description || '')}</td>
        <td>${escapeHtml(l.itemCode ? `[${l.itemCode}] ${l.itemName || ''}` : 'Chưa chỉ định')}</td>
        <td style="text-align: center;">${escapeHtml(l.unitName || '')}</td>
        <td style="text-align: right;">${l.quantity}</td>
        <td style="text-align: right;">${l.wasteRate}%</td>
        <td style="text-align: right; font-weight: bold;">${l.netQuantity}</td>
        ${!isWorkshop ? `
          <td style="text-align: right;">${(l.unitCost || 0).toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right; font-weight: bold;">${(l.totalCost || 0).toLocaleString('vi-VN')} đ</td>
        ` : ''}
        <td>${escapeHtml(l.notes || '')}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.bom.code)} - ${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #111; margin: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 15px; }
    .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; color: #0d47a1; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
    th { background: #e2e8f0; font-weight: 600; text-align: center; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; margin-top: 30px; page-break-inside: avoid; }
    .sig-block { min-height: 80px; }
    @media print { body { margin: 10mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin: 0; font-size: 16px;">CÔNG TY QUẢNG CÁO & NỘI THẤT</h2>
      <p style="margin: 2px 0; color: #64748b; font-size: 12px;">Hệ thống Quản lý Thi công & Sản xuất Biển hiệu</p>
    </div>
    <div style="text-align: right; font-size: 12px;">
      <div>Mã BOM: <strong>${escapeHtml(report.bom.code)}</strong></div>
      <div>Phiên bản: <strong>Rev ${report.bom.revisionNo}</strong></div>
      <div>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
    </div>
  </div>

  <div class="title">${escapeHtml(title)}</div>

  <div class="meta-grid">
    <div><strong>Tên BOM:</strong> ${escapeHtml(report.bom.title)}</div>
    <div><strong>Kích thước (DxRxS):</strong> ${report.bom.widthMeters}m x ${report.bom.heightMeters}m ${report.bom.depthMeters ? 'x ' + report.bom.depthMeters + 'm' : ''}</div>
    <div><strong>Loại hình:</strong> ${escapeHtml(report.bom.signageType || 'Biển hiệu')}</div>
    <div><strong>Chế độ xuất:</strong> ${isWorkshop ? '<span style="color:#d97706;font-weight:bold;">Cấp xưởng (Ẩn giá vốn)</span>' : '<span style="color:#16a34a;font-weight:bold;">Nội bộ (Đầy đủ giá vốn)</span>'}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">STT</th>
        <th style="width: 120px;">Hạng mục / Đại diện</th>
        <th>Mô tả kỹ thuật</th>
        <th style="width: 150px;">Mã / Tên vật tư kho</th>
        <th style="width: 50px;">ĐVT</th>
        <th style="width: 60px;">Định mức</th>
        <th style="width: 55px;">Hao hụt</th>
        <th style="width: 70px;">Nhu cầu cấp</th>
        ${!isWorkshop ? `
          <th style="width: 85px;">Đơn giá vốn</th>
          <th style="width: 95px;">Thành tiền</th>
        ` : ''}
        <th style="width: 120px;">Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
    </tbody>
    ${!isWorkshop && report.summary.totalEstimatedCost ? `
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td colspan="9" style="text-align: right;">TỔNG GIÁ VỐN DỰ TOÁN:</td>
          <td style="text-align: right; color: #b91c1c;">${report.summary.totalEstimatedCost.toLocaleString('vi-VN')} đ</td>
          <td></td>
        </tr>
      </tfoot>
    ` : ''}
  </table>

  <div class="signatures">
    <div class="sig-block">
      <strong>Người lập BOM</strong><br>
      <small>(Ký, ghi rõ họ tên)</small>
    </div>
    <div class="sig-block">
      <strong>Kỹ thuật / Quản đốc xưởng</strong><br>
      <small>(Ký, ghi rõ họ tên)</small>
    </div>
    <div class="sig-block">
      <strong>Thủ kho cấp phát</strong><br>
      <small>(Ký, ghi rõ họ tên)</small>
    </div>
  </div>
</body>
</html>`;
  }
}

