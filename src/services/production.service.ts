import type { PoolClient } from 'pg';
import { getDbPool } from '@/lib/db';
import { getNextDocumentCode } from '@/lib/sequences';
import { InventoryService } from './inventory.service';
import { ProductionBomService, loadCatalog, mapBomLine } from './production-bom.service';
import { DEFAULT_STEPS, validatePhotos, expandMappedBom, positive, nonnegative, requiredQcChecks, unitFactor } from '@/lib/production/bom';
import { assertProject, assertWarehouse, requireCapability, transaction, once, WorkflowError, type WorkflowContext } from '@/lib/production/context';
import { refreshProduction, settleReservations } from '@/lib/production/stock-hooks';

export class ProductionService {
  static async editDraft(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.edit',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.update');
      if(o.status!=='draft'||o.documents.length)throw new WorkflowError('Chỉ sửa lệnh nháp chưa tạo phiếu; hủy phiếu/lệnh trước khi lập lại',409);
      const catalog=await loadCatalog(db,ctx.orgId);
      if(!Array.isArray(input.lines)||input.lines.length!==o.lines.length)throw new WorkflowError('Cần đủ các hạng mục của lệnh');
      const seen=new Set();
      for(const l of input.lines){
        const existing=o.lines.find((v:any)=>v.id===l.id);if(!existing||seen.has(l.id))throw new WorkflowError('Hạng mục không hợp lệ');seen.add(l.id);
        const bom=await ProductionBomService.detail(ctx,existing.bom_id,db,'production_order.update');
        if(bom.needsMapping)throw new WorkflowError('BOM chưa gán đầy đủ');
        const item=catalog.find(i=>i.id===l.outputItemId && i.isActive && ['product','semi_finished'].includes(i.kind));
        if(!item)throw new WorkflowError('Thành phẩm không hợp lệ');unitFactor(item,l.unitId);
        const qty=positive(l.targetQty,'Sản lượng'),yieldQty=positive(l.bomYieldQty ?? 1,'Sản lượng BOM');
        if(!(await db.query('SELECT id FROM erp.teams WHERE organization_id=$1 AND id=$2',[ctx.orgId,l.teamId])).rows.length)throw new WorkflowError('Nhóm không hợp lệ');
        if(existing.team_id!==l.teamId){
          await db.query('UPDATE erp.task_assignees SET valid_to=now(),updated_by=$1 WHERE organization_id=$2 AND task_id=$3 AND valid_to IS NULL',[ctx.userId,ctx.orgId,existing.task_id]);
          await db.query(`INSERT INTO erp.task_assignees(organization_id,task_id,employee_id,assignment_source_team_id,created_by,updated_by) SELECT organization_id,$1,employee_id,team_id,$2,$2 FROM erp.team_members WHERE organization_id=$3 AND team_id=$4 AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now())`,[existing.task_id,ctx.userId,ctx.orgId,l.teamId]);
        }
        await db.query('UPDATE erp.production_order_lines SET title=$1,target_qty=$2,bom_yield_qty=$3,output_item_id=$4,unit_id=$5,team_id=$6,has_electrical=$7,snapshot=$8 WHERE organization_id=$9 AND id=$10',[l.title || existing.title,qty,yieldQty,item.id,l.unitId,l.teamId,Boolean(l.hasElectrical),{bom,design:bom.source_snapshot,outputItem:{id:item.id,code:item.code,name:item.name},hasElectrical:Boolean(l.hasElectrical),lineNo:existing.snapshot.lineNo},ctx.orgId,l.id]);
        await db.query('DELETE FROM erp.production_materials WHERE organization_id=$1 AND production_order_line_id=$2',[ctx.orgId,l.id]);
        for(const m of expandMappedBom(bom.lines.map(mapBomLine),catalog,qty/yieldQty)){
          const wh=l.materialWarehouses?.[m.itemId] || l.sourceWarehouseId;
          await assertWarehouse(db,ctx,wh,'stock_document.create');
          await db.query('INSERT INTO erp.production_materials(organization_id,production_order_id,production_order_line_id,item_id,required_base_qty,source_paths,source_warehouse_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)',[ctx.orgId,id,l.id,m.itemId,m.baseQty,JSON.stringify(m.paths),wh,ctx.userId]);
        }
        const steps=l.steps || existing.steps.map((s:any)=>s.title);
        if(!Array.isArray(steps)||steps.length<2 || steps.some((v:any)=>typeof v!=='string'||!v.trim()))throw new WorkflowError('Cần ít nhất công đoạn gia công và QC');
        await db.query('DELETE FROM erp.production_steps WHERE organization_id=$1 AND order_line_id=$2',[ctx.orgId,l.id]);
        for(const [n,title] of steps.entries())await db.query('INSERT INTO erp.production_steps(organization_id,order_line_id,sequence,title) VALUES($1,$2,$3,$4)',[ctx.orgId,l.id,n+1,title.trim()]);
      }
      await db.query('UPDATE erp.production_orders SET title=$1,due_at=$2,updated_by=$3 WHERE organization_id=$4 AND id=$5',[input.title || o.title,input.dueAt || null,ctx.userId,ctx.orgId,id]);
      return {orderId:id};
    }));
  }
  static async materialDocument(ctx:WorkflowContext,id:string,input:any,isReturn:boolean){
    return transaction(ctx,db=>once(db,ctx,input.requestId,isReturn?'production.return':'production.supplement',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.update');
      if(!['released','in_progress','completed'].includes(o.status))throw new WorkflowError('Lệnh chưa được duyệt');
      const l=o.lines.find((v:any)=>v.id===input.lineId),m=l?.materials.find((v:any)=>v.id===input.materialId);
      if(!m)throw new WorkflowError('Vật tư không thuộc hạng mục');
      const qty=positive(input.qty,'Số lượng cơ sở');
      let docId;
      if(isReturn){
        await assertWarehouse(db,ctx,input.warehouseId,'stock_document.create');
        const issued=Number((await db.query(`SELECT COALESCE(SUM(CASE WHEN d.workflow_kind='production_material' THEN sl.base_qty ELSE -sl.base_qty END),0) AS n FROM erp.stock_document_lines sl JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE sl.organization_id=$1 AND sl.production_material_id=$2 AND d.status='completed' AND d.workflow_kind IN ('production_material','production_return')`,[ctx.orgId,m.id])).rows[0].n);
        const pending=Number((await db.query(`SELECT COALESCE(SUM(sl.base_qty),0) AS n FROM erp.stock_document_lines sl JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE sl.organization_id=$1 AND sl.production_material_id=$2 AND d.workflow_kind='production_return' AND d.status NOT IN ('completed','cancelled','rejected','reversed')`,[ctx.orgId,m.id])).rows[0].n);
        const used=l.reports.reduce((n:number,r:any)=>n+(r.materials||[]).filter((v:any)=>v.itemId===m.item_id).reduce((a:number,v:any)=>a+Number(v.qty),0),0);
        if(qty>issued-used-pending+1e-6)throw new WorkflowError('Lượng trả vượt vật tư chưa sử dụng');
        const lot=(await db.query(`SELECT sl.lot_id FROM erp.stock_document_lines sl JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE sl.organization_id=$1 AND sl.production_material_id=$2 AND sl.lot_id=$3 AND d.status='completed' AND d.workflow_kind='production_material' LIMIT 1`,[ctx.orgId,m.id,input.lotId])).rows[0];
        if(!lot)throw new WorkflowError('Chọn lô đã cấp cho vật tư này');
        const lotNet=Number(l.issuedLots.find((v:any)=>v.production_material_id===m.id && v.lot_id===lot.lot_id)?.net_issued || 0);
        const lotPending=Number((await db.query(`SELECT COALESCE(SUM(sl.base_qty),0) AS n FROM erp.stock_document_lines sl JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE sl.organization_id=$1 AND sl.production_material_id=$2 AND sl.lot_id=$3 AND d.workflow_kind='production_return' AND d.status NOT IN ('completed','cancelled','rejected','reversed')`,[ctx.orgId,m.id,lot.lot_id])).rows[0].n);
        if(qty>lotNet-lotPending+1e-6)throw new WorkflowError('Lượng trả vượt lượng đã cấp của lô này');
        const item=(await loadCatalog(db,ctx.orgId)).find(i=>i.id===m.item_id)!;
        docId=await InventoryService.createDocument({type:'receipt',purpose:`Trả NVL dư ${o.code}`,destinationWarehouseId:input.warehouseId,projectId:o.project_id,productionOrderId:id,submitNow:true,lines:[{itemId:m.item_id,unitId:item.baseUnitId,lotId:lot.lot_id,qty,productionMaterialId:m.id}]},ctx.userId,{client:db,workflowKind:'production_return'});
      }else{
        const item=(await loadCatalog(db,ctx.orgId)).find(i=>i.id===m.item_id)!;
        const groups=await this.allocate(db,ctx,[{...m,base_unit_id:item.baseUnitId,source_warehouse_id:input.warehouseId,required_base_qty:qty}],o.project_id);
        const lines=groups.get(input.warehouseId)!;
        docId=await InventoryService.createDocument({type:'issue',purpose:`Cấp NVL bổ sung ${o.code}`,sourceWarehouseId:input.warehouseId,projectId:o.project_id,productionOrderId:id,submitNow:true,lines},ctx.userId,{client:db,workflowKind:'production_material'});
      }
      return {documentId:docId};
    }));
  }
  static async cancel(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.cancel',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.update');
      if(o.status==='cancelled')return {orderId:id};
      if(o.documents.some((d:any)=>['completed','reversed','dispatched'].includes(d.status))||o.lines.some((l:any)=>l.reports.length))throw new WorkflowError('Lệnh đã phát sinh thực tế; xử lý trả/đảo chứng từ, không hủy trực tiếp');
      for(const d of o.documents){await settleReservations(db,ctx.orgId,d.id,ctx.userId,false);await db.query("UPDATE erp.stock_documents SET status='cancelled',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,d.id]);}
      await db.query("UPDATE erp.production_orders SET status='cancelled',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,id]);
      await db.query("UPDATE erp.production_order_lines SET status='cancelled' WHERE organization_id=$1 AND production_order_id=$2",[ctx.orgId,id]);
      await db.query("UPDATE erp.tasks SET status='cancelled',updated_by=$1 WHERE organization_id=$2 AND (id=$3 OR parent_id=$3)",[ctx.userId,ctx.orgId,o.task_id]);
      return {orderId:id};
    }));
  }
  static async list(ctx: WorkflowContext, projectId?:string) {
    requireCapability(ctx,'production_order.read');
    const orders=(await getDbPool().query(`SELECT o.*,p.code AS project_code,p.name AS project_name,
      (SELECT count(*) FROM erp.production_order_lines l WHERE l.organization_id=o.organization_id AND l.production_order_id=o.id) AS line_count,
      (SELECT dp.thumbnail_url FROM erp.production_order_lines l JOIN erp.design_proofs dp ON dp.organization_id=l.organization_id AND dp.id=l.design_proof_id WHERE l.production_order_id=o.id AND dp.thumbnail_url IS NOT NULL LIMIT 1) AS thumbnail_url,
      (SELECT dp.file_url FROM erp.production_order_lines l JOIN erp.design_proofs dp ON dp.organization_id=l.organization_id AND dp.id=l.design_proof_id WHERE l.production_order_id=o.id AND dp.file_url IS NOT NULL LIMIT 1) AS file_url,
      (SELECT dp.code FROM erp.production_order_lines l JOIN erp.design_proofs dp ON dp.organization_id=l.organization_id AND dp.id=l.design_proof_id WHERE l.production_order_id=o.id LIMIT 1) AS proof_code
      FROM erp.production_orders o JOIN erp.projects p ON p.organization_id=o.organization_id AND p.id=o.project_id WHERE o.organization_id=$1 AND ($2::uuid IS NULL OR o.project_id=$2) ORDER BY o.created_at DESC`,[ctx.orgId,projectId || null])).rows;
    const visible=[];
    for(const o of orders){try{await assertProject(getDbPool(),ctx,o.project_id,'production_order.read');visible.push(o);}catch(e){if(!(e instanceof WorkflowError) || e.status!==403)throw e;}}
    return visible;
  }
  static async detail(ctx:WorkflowContext,id:string,db:Pick<PoolClient,'query'>=getDbPool(),permission:any='production_order.read'){
    const o=(await db.query(`SELECT o.*,p.code AS project_code,p.name AS project_name,p.address AS project_address,pt.name AS customer_name,pt.phone AS customer_phone FROM erp.production_orders o JOIN erp.projects p ON p.organization_id=o.organization_id AND p.id=o.project_id LEFT JOIN erp.partners pt ON pt.organization_id=p.organization_id AND pt.id=p.customer_id WHERE o.organization_id=$1 AND o.id=$2`,[ctx.orgId,id])).rows[0];
    if(!o)throw new WorkflowError('Không tìm thấy lệnh sản xuất',404);
    await assertProject(db,ctx,o.project_id,permission);
    const lines=(await db.query(`SELECT l.*,i.code AS item_code,i.name AS item_name,u.name AS unit_name,t.name AS team_name,
      dp.code AS proof_code,dp.title AS proof_title,dp.file_url AS proof_file_url,dp.thumbnail_url AS proof_thumbnail_url,
      dp.background_material,dp.letter_material,dp.led_spec,dp.power_spec,dp.approved_by_name AS proof_approved_by,dp.approved_at AS proof_approved_at,
      s.id AS survey_id,s.code AS survey_code,s.title AS survey_title,s.address AS survey_address,
      s.width_meters AS survey_width_meters,s.height_meters AS survey_height_meters,s.depth_meters AS survey_depth_meters,
      s.floor_level AS survey_floor_level,s.elevation_meters AS survey_elevation_meters,s.structure_type AS survey_structure_type,
      s.power_source AS survey_power_source,s.power_distance_meters AS survey_power_distance_meters,
      s.installation_method AS survey_installation_method,s.obstacles AS survey_obstacles,s.notes AS survey_notes,s.photos AS survey_photos
      FROM erp.production_order_lines l
      JOIN erp.items i ON i.organization_id=l.organization_id AND i.id=l.output_item_id
      JOIN erp.units u ON u.organization_id=l.organization_id AND u.id=l.unit_id
      JOIN erp.teams t ON t.organization_id=l.organization_id AND t.id=l.team_id
      LEFT JOIN erp.design_proofs dp ON dp.organization_id=l.organization_id AND dp.id=l.design_proof_id
      LEFT JOIN erp.project_boms pb ON pb.organization_id=l.organization_id AND pb.id=l.bom_id
      LEFT JOIN erp.site_surveys s ON s.organization_id=l.organization_id AND s.id=pb.survey_id
      WHERE l.organization_id=$1 AND l.production_order_id=$2 ORDER BY (l.snapshot->>'lineNo')::integer NULLS LAST,l.created_at,l.id`,[ctx.orgId,id])).rows;
    for(const l of lines){
      l.steps=(await db.query('SELECT * FROM erp.production_steps WHERE organization_id=$1 AND order_line_id=$2 ORDER BY sequence',[ctx.orgId,l.id])).rows;
      l.materials=(await db.query(`SELECT m.*,i.code,i.name,u.name AS unit_name,w.name AS warehouse_name FROM erp.production_materials m JOIN erp.items i ON i.organization_id=m.organization_id AND i.id=m.item_id JOIN erp.units u ON u.organization_id=i.organization_id AND u.id=i.base_unit_id LEFT JOIN erp.warehouses w ON w.organization_id=m.organization_id AND w.id=m.source_warehouse_id WHERE m.organization_id=$1 AND m.production_order_line_id=$2 ORDER BY i.code`,[ctx.orgId,l.id])).rows;
      l.qc=(await db.query('SELECT * FROM erp.factory_qc_records WHERE organization_id=$1 AND production_order_line_id=$2 ORDER BY created_at DESC',[ctx.orgId,l.id])).rows;
      l.reports=(await db.query('SELECT r.* FROM erp.production_step_reports r JOIN erp.production_steps s ON s.organization_id=r.organization_id AND s.id=r.step_id WHERE r.organization_id=$1 AND s.order_line_id=$2 ORDER BY r.reported_at DESC',[ctx.orgId,l.id])).rows;
      l.issuedLots=(await db.query(`SELECT sl.production_material_id,sl.lot_id,lot.lot_code,SUM(CASE WHEN d.workflow_kind='production_material' THEN sl.base_qty ELSE -sl.base_qty END) AS net_issued FROM erp.stock_document_lines sl JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id JOIN erp.production_materials m ON m.organization_id=sl.organization_id AND m.id=sl.production_material_id JOIN erp.stock_lots lot ON lot.organization_id=sl.organization_id AND lot.id=sl.lot_id WHERE sl.organization_id=$1 AND m.production_order_line_id=$2 AND d.status='completed' AND d.workflow_kind IN ('production_material','production_return') GROUP BY sl.production_material_id,sl.lot_id,lot.lot_code`,[ctx.orgId,l.id])).rows;
      l.outputs=(await db.query(`SELECT o.*,lot.lot_code,d.status AS receipt_status,d.code AS receipt_code FROM erp.production_outputs o JOIN erp.stock_lots lot ON lot.organization_id=o.organization_id AND lot.id=o.lot_id JOIN erp.stock_documents d ON d.organization_id=o.organization_id AND d.id=o.receipt_document_id WHERE o.organization_id=$1 AND o.production_order_line_id=$2 ORDER BY o.created_at DESC`,[ctx.orgId,l.id])).rows;
    }
    o.lines=lines;
    o.documents=(await db.query('SELECT id,code,type,status,workflow_kind,source_warehouse_id,destination_warehouse_id FROM erp.stock_documents WHERE organization_id=$1 AND production_order_id=$2 ORDER BY created_at',[ctx.orgId,id])).rows;
    return o;
  }
  static async create(ctx:WorkflowContext,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.create',input,async()=>{
      const project=await assertProject(db,ctx,input.projectId,'production_order.create');
      if(!Array.isArray(input.lines)||!input.lines.length)throw new WorkflowError('Chọn ít nhất một BOM/hạng mục');
      const catalog=await loadCatalog(db,ctx.orgId);
      const code=await getNextDocumentCode(db,ctx.orgId,'production_order','LSX');
      let parentTaskId=input.parentTaskId || null;
      if(parentTaskId && !(await db.query('SELECT id FROM erp.tasks WHERE organization_id=$1 AND project_id=$2 AND id=$3',[ctx.orgId,input.projectId,parentTaskId])).rows.length)throw new WorkflowError('Công việc WBS không thuộc dự án');
      const task=(await db.query(`INSERT INTO erp.tasks(organization_id,code,title,project_id,parent_id,progress_mode,created_by,updated_by) VALUES($1,$2,$3,$4,$5,'children',$6,$6) RETURNING id`,[ctx.orgId,`${code}-WBS`,input.title || code,input.projectId,parentTaskId,ctx.userId])).rows[0];
      const team=input.lines[0].teamId;
      const order=(await db.query(`INSERT INTO erp.production_orders(organization_id,code,title,task_id,team_id,project_id,due_at,source_snapshot,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING id`,[ctx.orgId,code,input.title || `Sản xuất ${project.name}`,task.id,team,input.projectId,input.dueAt || null,{project},ctx.userId])).rows[0];
      const seen=new Set();
      for(const [index,l] of input.lines.entries()){
        if(seen.has(l.bomId))throw new WorkflowError('Một BOM chỉ được chọn một lần trong lệnh');seen.add(l.bomId);
        const bom=await ProductionBomService.detail(ctx,l.bomId,db,'production_order.create');
        if(bom.project_id!==project.id || !bom.design_proof_id || bom.needsMapping)throw new WorkflowError('BOM chưa gán đủ vật tư hoặc không thuộc dự án/maket');
        if(!(await db.query('SELECT id FROM erp.design_proofs WHERE organization_id=$1 AND id=$2 AND status=\'approved\'',[ctx.orgId,bom.design_proof_id])).rows.length)throw new WorkflowError('Maket chưa được duyệt');
        const item=catalog.find(i=>i.id===l.outputItemId && i.isActive && ['product','semi_finished'].includes(i.kind));
        if(!item)throw new WorkflowError('Chọn thành phẩm đại diện hợp lệ');unitFactor(item,l.unitId);
        const qty=positive(l.targetQty,'Sản lượng'),yieldQty=positive(l.bomYieldQty ?? 1,'Sản lượng tương ứng BOM');
        if(!(await db.query('SELECT id FROM erp.teams WHERE organization_id=$1 AND id=$2',[ctx.orgId,l.teamId])).rows.length)throw new WorkflowError('Nhóm sản xuất không hợp lệ');
        const lineTask=(await db.query(`INSERT INTO erp.tasks(organization_id,code,title,project_id,parent_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING id`,[ctx.orgId,`${code}-${index+1}`,l.title || bom.title,project.id,task.id,ctx.userId])).rows[0];
        await db.query(`INSERT INTO erp.task_assignees(organization_id,task_id,employee_id,assignment_source_team_id,created_by,updated_by) SELECT organization_id,$1,employee_id,team_id,$2,$2 FROM erp.team_members WHERE organization_id=$3 AND team_id=$4 AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now())`,[lineTask.id,ctx.userId,ctx.orgId,l.teamId]);
        const line=(await db.query(`INSERT INTO erp.production_order_lines(organization_id,production_order_id,bom_id,design_proof_id,task_id,team_id,output_item_id,unit_id,title,target_qty,bom_yield_qty,has_electrical,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,[ctx.orgId,order.id,bom.id,bom.design_proof_id,lineTask.id,l.teamId,item.id,l.unitId,l.title || bom.title,qty,yieldQty,Boolean(l.hasElectrical),{bom,design:bom.source_snapshot,outputItem:{id:item.id,code:item.code,name:item.name},hasElectrical:Boolean(l.hasElectrical),lineNo:index+1}])).rows[0];
        const materials=expandMappedBom(bom.lines.map(mapBomLine),catalog,qty/yieldQty);
        for(const m of materials){
          const warehouseId=l.materialWarehouses?.[m.itemId] || l.sourceWarehouseId || input.sourceWarehouseId;
          await assertWarehouse(db,ctx,warehouseId,'stock_document.create');
          await db.query(`INSERT INTO erp.production_materials(organization_id,production_order_id,production_order_line_id,item_id,required_base_qty,source_paths,source_warehouse_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)`,[ctx.orgId,order.id,line.id,m.itemId,m.baseQty,JSON.stringify(m.paths),warehouseId,ctx.userId]);
        }
        const steps=l.steps || DEFAULT_STEPS;
        if(!Array.isArray(steps)||steps.length<2 || steps.some((v:any)=>typeof v!=='string'||!v.trim()))throw new WorkflowError('Cần ít nhất công đoạn gia công và QC');
        for(const [n,title] of steps.entries())await db.query('INSERT INTO erp.production_steps(organization_id,order_line_id,sequence,title) VALUES($1,$2,$3,$4)',[ctx.orgId,line.id,n+1,title.trim()]);
      }
      return {orderId:order.id};
    }));
  }
  static async allocate(db:PoolClient,ctx:WorkflowContext,materials:any[],projectId:string,allowShortage=false){
    const groups=new Map<string,any[]>();
    const planned=new Map<string,number>();
    for(const m of [...materials].sort((a,b)=>`${a.source_warehouse_id}${a.item_id}`.localeCompare(`${b.source_warehouse_id}${b.item_id}`))){
      await assertWarehouse(db,ctx,m.source_warehouse_id,'stock_document.create');
      const lots=(await db.query(`SELECT b.*,l.project_id,l.production_order_line_id,l.created_at FROM erp.stock_balances b JOIN erp.stock_lots l ON l.organization_id=b.organization_id AND l.id=b.lot_id WHERE b.organization_id=$1 AND b.warehouse_id=$2 AND b.item_id=$3 AND (l.project_id IS NULL OR l.project_id=$4) AND b.on_hand_qty>b.reserved_qty ORDER BY b.lot_id FOR UPDATE OF b`,[ctx.orgId,m.source_warehouse_id,m.item_id,projectId])).rows;
      lots.sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime() || a.lot_id.localeCompare(b.lot_id));
      let remaining=Number(m.required_base_qty);
      for(const b of lots){
        const used=planned.get(b.id)||0;
        const take=Math.min(remaining,Number(b.on_hand_qty)-Number(b.reserved_qty)-used);
        if(take<=1e-6)continue;
        const ls=groups.get(m.source_warehouse_id)||[];
        ls.push({itemId:m.item_id,unitId:m.base_unit_id,lotId:b.lot_id,qty:take,productionMaterialId:m.id,unitCostSnapshot:Number(b.on_hand_qty)>0?Number(b.inventory_value)/Number(b.on_hand_qty):0});
        groups.set(m.source_warehouse_id,ls);planned.set(b.id,used+take);remaining-=take;if(remaining<=1e-6)break;
      }
      if(remaining>1e-6){
        if(!allowShortage)throw new WorkflowError(`Thiếu ${remaining.toFixed(6)} đơn vị cơ sở của ${m.code || m.item_id} tại kho đã chọn`);
        // A real catalog standard lot carries the unallocated demand; it has no stock.
        // Approval replaces planning lines with available physical lots atomically.
        const item=(await db.query('SELECT code FROM erp.items WHERE organization_id=$1 AND id=$2',[ctx.orgId,m.item_id])).rows[0];
        const lot=(await db.query(`INSERT INTO erp.stock_lots(organization_id,item_id,lot_code,created_by,updated_by) VALUES($1,$2,$3,$4,$4) ON CONFLICT(organization_id,item_id,lot_code) DO UPDATE SET lot_code=EXCLUDED.lot_code RETURNING id`,[ctx.orgId,m.item_id,`${item.code}-STD`,ctx.userId])).rows[0];
        const ls=groups.get(m.source_warehouse_id)||[];ls.push({itemId:m.item_id,unitId:m.base_unit_id,lotId:lot.id,qty:remaining,productionMaterialId:m.id,unitCostSnapshot:0});groups.set(m.source_warehouse_id,ls);
      }
    }
    return groups;
  }
  static async submit(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.submit',{id},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.release');
      if(o.status!=='draft' || o.documents.some((d:any)=>d.workflow_kind==='production_material'))throw new WorkflowError('Lệnh đã gửi duyệt',409);
      for(const l of o.lines){
        await db.query('SELECT id FROM erp.project_boms WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,l.bom_id]);
        const bom=await ProductionBomService.detail(ctx,l.bom_id,db,'production_order.release');
        if(bom.needsMapping || JSON.stringify(bom.lines.map(mapBomLine))!==JSON.stringify(l.snapshot.bom.lines.map(mapBomLine)))throw new WorkflowError('BOM đã đổi hoặc chưa hoàn thiện; cập nhật lệnh nháp');
        const proof=(await db.query('SELECT * FROM erp.design_proofs WHERE organization_id=$1 AND id=$2 FOR SHARE',[ctx.orgId,l.design_proof_id])).rows[0];
        if(!proof || proof.status!=='approved' || proof.version!==bom.source_snapshot.proof.version)throw new WorkflowError('Maket đã đổi; lập BOM từ bản đã duyệt mới');
      }
      const materials=(await db.query(`SELECT m.*,i.base_unit_id,i.code FROM erp.production_materials m JOIN erp.items i ON i.organization_id=m.organization_id AND i.id=m.item_id WHERE m.organization_id=$1 AND m.production_order_id=$2`,[ctx.orgId,id])).rows;
      const groups=await this.allocate(db,ctx,materials,o.project_id,true);const documents=[];
      for(const [warehouse,lines] of groups)documents.push(await InventoryService.createDocument({type:'issue',purpose:`Cấp NVL ${o.code}`,projectId:o.project_id,productionOrderId:id,sourceWarehouseId:warehouse,submitNow:true,lines},ctx.userId,{client:db,workflowKind:'production_material'}));
      for(const l of o.lines)await db.query("UPDATE erp.project_boms SET status='applied',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,l.bom_id]);
      return {orderId:id,documentIds:documents};
    }));
  }
  static async report(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.report',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.report');
      if(!['released','in_progress'].includes(o.status))throw new WorkflowError('Lệnh chưa sẵn sàng hoặc đã kết thúc');
      const l=o.lines.find((l:any)=>l.id===input.lineId), step=l?.steps.find((s:any)=>s.id===input.stepId);
      if(!step || !['ready','in_progress','rework'].includes(l.status))throw new WorkflowError('Hạng mục chưa được cấp đủ vật tư');
      if(step.id===l.steps.at(-1)?.id)throw new WorkflowError('Công đoạn cuối được xác nhận bằng QC thực tế');
      if(ctx.capabilities['production_order.report']?.scope==='ASSIGNED' && !(await db.query('SELECT id FROM erp.task_assignees WHERE organization_id=$1 AND task_id=$2 AND employee_id=$3 AND valid_from<=now() AND (valid_to IS NULL OR valid_to>now())',[ctx.orgId,l.task_id,ctx.employeeId || null])).rows.length)throw new WorkflowError('Hạng mục chưa được phân công cho bạn',403);
      if(l.steps.some((s:any)=>s.sequence<step.sequence && s.status!=='done'))throw new WorkflowError('Hoàn thành công đoạn trước trước khi báo cáo');
      const progress=nonnegative(input.progress,'Tiến độ');if(progress>100)throw new WorkflowError('Tiến độ không vượt 100%');
      if(!Array.isArray(input.photos||[]) || !Array.isArray(input.materials||[]))throw new WorkflowError('Dữ liệu ảnh/vật tư không hợp lệ');
      const added=new Map<string,number>();
      for(const m of input.materials||[]){if(!l.materials.some((v:any)=>v.item_id===m.itemId))throw new WorkflowError('Vật tư báo cáo chưa được cấp cho hạng mục');added.set(m.itemId,(added.get(m.itemId)||0)+nonnegative(m.qty,'Vật tư thực dùng'));}
      for(const [itemId,qty] of added){const prior=l.reports.reduce((sum:number,r:any)=>sum+(r.materials||[]).filter((m:any)=>m.itemId===itemId).reduce((a:number,m:any)=>a+Number(m.qty),0),0);const issued=l.issuedLots.filter((v:any)=>l.materials.find((m:any)=>m.id===v.production_material_id)?.item_id===itemId).reduce((a:number,v:any)=>a+Number(v.net_issued),0);if(prior+qty>issued+1e-6)throw new WorkflowError('Vật tư thực dùng vượt lượng đã cấp trừ trả dư');}
      validatePhotos(input.photos || []);
      await db.query(`INSERT INTO erp.production_step_reports(organization_id,step_id,progress,output_qty,waste_qty,materials,photos,notes,reported_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[ctx.orgId,step.id,progress,nonnegative(input.outputQty||0,'Sản lượng'),nonnegative(input.wasteQty||0,'Hao hụt'),JSON.stringify(input.materials||[]),JSON.stringify(input.photos||[]),input.notes||'',ctx.userId]);
      await db.query("UPDATE erp.production_steps SET progress=$1,status=$2,started_at=COALESCE(started_at,now()),completed_at=CASE WHEN $1::numeric=100 THEN now() ELSE NULL END WHERE organization_id=$3 AND id=$4",[progress,progress===100?'done':'doing',ctx.orgId,step.id]);
      await db.query("UPDATE erp.production_order_lines SET status='in_progress' WHERE organization_id=$1 AND id=$2",[ctx.orgId,l.id]);
      await db.query("UPDATE erp.production_orders SET status='in_progress',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,id]);
      const avg=Number((await db.query('SELECT AVG(progress) AS n FROM erp.production_steps WHERE organization_id=$1 AND order_line_id=$2',[ctx.orgId,l.id])).rows[0].n);
      await db.query("UPDATE erp.tasks SET status='doing',progress_percent=$1,updated_by=$2 WHERE organization_id=$3 AND id=$4",[Math.min(99,avg),ctx.userId,ctx.orgId,l.task_id]);
      return {orderId:id};
    }));
  }
  static async qc(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.qc',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.qc');
      const l=o.lines.find((l:any)=>l.id===input.lineId);
      if(!l || !['released','in_progress'].includes(o.status) || !['in_progress','rework'].includes(l.status))throw new WorkflowError('Hạng mục chưa ở công đoạn QC');
      if(l.steps.slice(0,-1).some((s:any)=>s.status!=='done'))throw new WorkflowError('Hoàn tất gia công trước khi QC');
      validatePhotos(input.photos || []);
      const accepted=nonnegative(input.acceptedQty,'Số lượng đạt'),rejected=nonnegative(input.rejectedQty,'Số lượng lỗi');
      if(accepted+rejected<=0)throw new WorkflowError('Nhập số lượng QC');
      const committed=Number((await db.query(`SELECT COALESCE(SUM(o.accepted_qty),0) AS n FROM erp.production_outputs o JOIN erp.stock_documents d ON d.organization_id=o.organization_id AND d.id=o.receipt_document_id WHERE o.organization_id=$1 AND o.production_order_line_id=$2 AND d.status NOT IN ('cancelled','rejected','reversed')`,[ctx.orgId,l.id])).rows[0].n);
      if(committed+accepted+rejected>Number(l.target_qty)+1e-6)throw new WorkflowError('Số lượng QC vượt phần sản lượng còn lại');
      if(requiredQcChecks(l.has_electrical).some(k=>typeof input.checks?.[k]!=='boolean'))throw new WorkflowError('Xác nhận từng tiêu chí QC');
      if(accepted>0 && requiredQcChecks(l.has_electrical).some(k=>input.checks[k]!==true))throw new WorkflowError('Sản phẩm đạt phải vượt tất cả tiêu chí áp dụng');
      if(rejected>0 && !input.defectNotes?.trim())throw new WorkflowError('Ghi rõ lỗi cần sửa');
      if(accepted>0)await assertWarehouse(db,ctx,input.destinationWarehouseId,'stock_document.create');
      const code=await getNextDocumentCode(db,ctx.orgId,'factory_qc','QC');
      const q=(await db.query(`INSERT INTO erp.factory_qc_records(organization_id,code,project_id,production_order_line_id,status,accepted_qty,rejected_qty,checks,aging_test_hours,voltage_drop_check,waterproof_check,frame_weld_check,light_uniformity_check,accessories_checklist,photos,defect_notes,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17) RETURNING id`,[ctx.orgId,code,o.project_id,l.id,rejected>0?'failed':'passed',accepted,rejected,input.checks,nonnegative(input.agingTestHours||0,'Giờ chạy thử'),input.checks.electrical===true,input.checks.waterproof===true,input.checks.structure===true,input.checks.lightUniformity===true,JSON.stringify([{item:'Phụ kiện',checked:input.checks.accessories}]),JSON.stringify(input.photos||[]),input.defectNotes||'',ctx.userId])).rows[0];
      let receiptId=null,lotId=null;
      if(accepted>0){
        const lotCode=await getNextDocumentCode(db,ctx.orgId,'production_lot','LO-SX');
        lotId=(await db.query(`INSERT INTO erp.stock_lots(organization_id,lot_code,item_id,production_order_line_id,project_id,design_proof_id,design_snapshot,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,[ctx.orgId,lotCode,l.output_item_id,l.id,o.project_id,l.design_proof_id,l.snapshot,ctx.userId])).rows[0].id;
        receiptId=await InventoryService.createDocument({type:'receipt',purpose:`Nhập thành phẩm ${o.code} / ${l.title}`,projectId:o.project_id,productionOrderId:id,destinationWarehouseId:input.destinationWarehouseId,submitNow:true,lines:[{itemId:l.output_item_id,lotId,unitId:l.unit_id,qty:accepted,unitCostSnapshot:nonnegative(input.unitCost||0,'Giá thành')} ]},ctx.userId,{client:db,workflowKind:'production_output'});
        await db.query(`INSERT INTO erp.production_outputs(organization_id,production_order_id,production_order_line_id,accepted_qty,accepted_by,qc_record_id,lot_id,receipt_document_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$5,$5)`,[ctx.orgId,id,l.id,accepted,ctx.userId,q.id,lotId,receiptId]);
      }
      const last=l.steps.at(-1);
      await db.query('UPDATE erp.production_steps SET status=$1,progress=$2 WHERE organization_id=$3 AND id=$4',[rejected?'doing':'done',rejected?0:100,ctx.orgId,last.id]);
      if(rejected){await db.query("UPDATE erp.production_order_lines SET status='rework' WHERE organization_id=$1 AND id=$2",[ctx.orgId,l.id]);const repair=l.steps.at(-2);if(repair)await db.query("UPDATE erp.production_steps SET status='doing',progress=0,completed_at=NULL WHERE organization_id=$1 AND id=$2",[ctx.orgId,repair.id]);}
      return {qcId:q.id,receiptId,lotId};
    }));
  }
  static async startProduction(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.start',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.update');
      if(o.status==='cancelled'||o.status==='completed')throw new WorkflowError('Lệnh đã đóng hoặc bị hủy');
      const startedAt = input.startDate || new Date().toISOString();
      await db.query(`UPDATE erp.production_orders SET status='in_progress',source_snapshot=jsonb_set(COALESCE(source_snapshot,'{}'::jsonb),'{started_at}',to_jsonb($1::text)),updated_by=$2 WHERE organization_id=$3 AND id=$4`,[startedAt,ctx.userId,ctx.orgId,id]);
      await db.query(`UPDATE erp.production_order_lines SET status='in_progress' WHERE organization_id=$1 AND production_order_id=$2 AND status IN ('ready','waiting_materials')`,[ctx.orgId,id]);
      for(const l of o.lines){
        const first=l.steps?.[0];
        if(first && first.status==='todo'){
          await db.query(`UPDATE erp.production_steps SET status='doing',started_at=COALESCE(started_at,now()) WHERE organization_id=$1 AND id=$2`,[ctx.orgId,first.id]);
        }
        await db.query(`UPDATE erp.tasks SET status='doing',updated_by=$1 WHERE organization_id=$2 AND id=$3`,[ctx.userId,ctx.orgId,l.task_id]);
      }
      await db.query(`UPDATE erp.tasks SET status='doing',updated_by=$1 WHERE organization_id=$2 AND id=$3`,[ctx.userId,ctx.orgId,o.task_id]);
      return {orderId:id};
    }));
  }
  static async completeProduction(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'production.complete',{id,...input},async()=>{
      await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id]);
      const o=await this.detail(ctx,id,db,'production_order.update');
      if(o.status==='cancelled')throw new WorkflowError('Lệnh đã bị hủy');
      const completedAt = new Date().toISOString();
      for(const l of o.lines){
        if(Array.isArray(l.steps) && l.steps.length>1){
          const nonQcSteps = l.steps.slice(0, -1);
          for(const s of nonQcSteps){
            await db.query(`UPDATE erp.production_steps SET status='done',progress=100,started_at=COALESCE(started_at,now()),completed_at=COALESCE(completed_at,now()) WHERE organization_id=$1 AND id=$2`,[ctx.orgId,s.id]);
          }
        }
        await db.query(`UPDATE erp.production_order_lines SET status='in_progress' WHERE organization_id=$1 AND id=$2 AND status<>'completed'`,[ctx.orgId,l.id]);
        await db.query(`UPDATE erp.tasks SET progress_percent=99,updated_by=$1 WHERE organization_id=$2 AND id=$3`,[ctx.userId,ctx.orgId,l.task_id]);
      }
      await db.query(`UPDATE erp.production_orders SET status='in_progress',source_snapshot=jsonb_set(COALESCE(source_snapshot,'{}'::jsonb),'{completed_production_at}',to_jsonb($1::text)),updated_by=$2 WHERE organization_id=$3 AND id=$4`,[completedAt,ctx.userId,ctx.orgId,id]);
      return {orderId:id};
    }));
  }
  static async proposeReceipt(ctx:WorkflowContext,id:string,input:any){
    await this.completeProduction(ctx,id,{requestId:`${input.requestId || Date.now()}-complete`});
    const o=await this.detail(ctx,id,getDbPool(),'production_order.qc');
    const targetLine = input.lineId ? o.lines.find((l:any)=>l.id===input.lineId) : o.lines[0];
    if(!targetLine)throw new WorkflowError('Không tìm thấy hạng mục cần nhập kho');
    const rem = Number(targetLine.target_qty) - Number(targetLine.received_qty);
    const qty = input.qty != null ? Number(input.qty) : (rem > 0 ? rem : Number(targetLine.target_qty));
    const wh = input.destinationWarehouseId || (await getDbPool().query(`SELECT id FROM erp.warehouses WHERE organization_id=$1 AND is_active=true LIMIT 1`,[ctx.orgId])).rows[0]?.id;
    if(!wh)throw new WorkflowError('Chọn kho nhập thành phẩm');
    const checks = {
      dimensions: true,
      appearance: true,
      structure: true,
      accessories: true,
      electrical: true,
      lightUniformity: true,
    };
    return this.qc(ctx, id, {
      requestId: input.requestId,
      lineId: targetLine.id,
      destinationWarehouseId: wh,
      acceptedQty: qty,
      rejectedQty: 0,
      checks,
      defectNotes: input.notes || '',
    });
  }
}
