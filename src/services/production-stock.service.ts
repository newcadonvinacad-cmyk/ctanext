import {InventoryService} from './inventory.service';
import {once,transaction,assertWarehouse,WorkflowError,type WorkflowContext} from '@/lib/production/context';
export class ProductionStockService {
 static async reverse(ctx:WorkflowContext,id:string,input:any){
  return transaction(ctx,db=>once(db,ctx,input.requestId,'stock.workflow.reverse',{id},async()=>{
   const found=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND id=$2',[ctx.orgId,id])).rows[0];
   if(!found?.workflow_kind || found.workflow_kind==='reversal')throw new WorkflowError('Chỉ lập phiếu đảo cho chứng từ của luồng sản xuất/bán theo lô');
   if(found.production_order_id)await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,found.production_order_id]);
   if(found.sales_order_id)await db.query('SELECT id FROM erp.sales_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,found.sales_order_id]);
   const d=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id])).rows[0];
   if(d.status!=='completed')throw new WorkflowError('Chỉ đảo chứng từ đã ghi sổ');
   const wh=d.source_warehouse_id || d.destination_warehouse_id;
   await assertWarehouse(db,ctx,wh,'stock_document.reverse');await assertWarehouse(db,ctx,wh,'stock_document.create');
   const existing=(await db.query("SELECT id FROM erp.stock_documents WHERE organization_id=$1 AND reverses_document_id=$2 AND status NOT IN ('cancelled','rejected')",[ctx.orgId,id])).rows[0];if(existing)return {documentId:existing.id};
   const ls=(await db.query('SELECT * FROM erp.stock_document_lines WHERE organization_id=$1 AND document_id=$2 ORDER BY item_id,lot_id',[ctx.orgId,id])).rows;
   if(d.workflow_kind==='production_material' && (await db.query(`SELECT r.id FROM erp.production_step_reports r JOIN erp.production_steps s ON s.organization_id=r.organization_id AND s.id=r.step_id JOIN erp.production_materials m ON m.organization_id=s.organization_id AND m.production_order_line_id=s.order_line_id WHERE r.organization_id=$1 AND m.id=ANY($2::uuid[]) LIMIT 1`,[ctx.orgId,ls.map(l=>l.production_material_id)])).rows.length)throw new WorkflowError('NVL đã đưa vào gia công; dùng phiếu trả dư và ghi nhận vật tư thực dùng');
   if(d.type==='receipt')for(const l of ls){const b=(await db.query('SELECT * FROM erp.stock_balances WHERE organization_id=$1 AND warehouse_id=$2 AND item_id=$3 AND lot_id=$4 FOR UPDATE',[ctx.orgId,wh,l.item_id,l.lot_id])).rows[0];if(!b || Number(b.on_hand_qty)-Number(b.reserved_qty)<Number(l.base_qty))throw new WorkflowError('Lô đã sử dụng/giữ bán, không đủ để đảo toàn bộ phiếu nhập');}
   const documentId=await InventoryService.createDocument({type:d.type==='receipt'?'issue':'receipt',purpose:`Đảo ${d.code}`,projectId:d.project_id,productionOrderId:d.production_order_id,sourceWarehouseId:d.type==='receipt'?wh:undefined,destinationWarehouseId:d.type==='issue'?wh:undefined,submitNow:true,lines:ls.map(l=>({itemId:l.item_id,lotId:l.lot_id,unitId:l.unit_id,qty:Number(l.qty),unitCostSnapshot:Number(l.unit_cost_snapshot),productionMaterialId:l.production_material_id,salesLineId:l.sales_line_id,reversesLineId:l.id}))},ctx.userId,{client:db,workflowKind:'reversal',salesOrderId:d.sales_order_id,reversesDocumentId:id});
   return {documentId};
  }));
 }
}
