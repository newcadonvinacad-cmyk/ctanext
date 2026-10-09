import { getDbPool } from '@/lib/db';
import { getNextDocumentCode } from '@/lib/sequences';
import { assertProject, assertWarehouse, requireCapability, transaction, once, WorkflowError, type WorkflowContext } from '@/lib/production/context';
import { positive, nonnegative, unitFactor } from '@/lib/production/bom';
import { loadCatalog } from './production-bom.service';
import { InventoryService } from './inventory.service';
import { reserveDocument, settleReservations } from '@/lib/production/stock-hooks';

export class ProductionSalesService {
  static async available(ctx:WorkflowContext,projectId:string,orderId?:string){
    await assertProject(getDbPool(),ctx,projectId,'sales_order.read');
    return (await getDbPool().query(`SELECT b.warehouse_id,w.name AS warehouse_name,b.item_id,i.code AS item_code,i.name AS item_name,i.base_unit_id,u.name AS unit_name,b.lot_id,lot.lot_code,lot.design_proof_id,lot.design_snapshot,lot.production_order_line_id,l.production_order_id,l.title AS line_title,o.code AS production_code,b.on_hand_qty-b.reserved_qty AS available_qty FROM erp.stock_balances b JOIN erp.stock_lots lot ON lot.organization_id=b.organization_id AND lot.id=b.lot_id JOIN erp.production_order_lines l ON l.organization_id=lot.organization_id AND l.id=lot.production_order_line_id JOIN erp.production_orders o ON o.organization_id=l.organization_id AND o.id=l.production_order_id JOIN erp.items i ON i.organization_id=b.organization_id AND i.id=b.item_id JOIN erp.units u ON u.organization_id=i.organization_id AND u.id=i.base_unit_id JOIN erp.warehouses w ON w.organization_id=b.organization_id AND w.id=b.warehouse_id WHERE b.organization_id=$1 AND lot.project_id=$2 AND ($3::uuid IS NULL OR l.production_order_id=$3) AND b.on_hand_qty>b.reserved_qty ORDER BY o.code,l.title,lot.created_at`,[ctx.orgId,projectId,orderId||null])).rows;
  }
  static async create(ctx:WorkflowContext,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'sales.production.create',input,async()=>{
      const project=await assertProject(db,ctx,input.projectId,'sales_order.create');
      if(project.customer_id!==input.customerId)throw new WorkflowError('Khách hàng không khớp dự án');
      if(!Array.isArray(input.lines)||!input.lines.length)throw new WorkflowError('Chọn thành phẩm theo lô');
      const catalog=await loadCatalog(db,ctx.orgId);let total=0;const selected=[];
      for(const l of input.lines){
        const item=catalog.find(i=>i.id===l.itemId && i.isActive);if(!item)throw new WorkflowError('Mã hàng không hợp lệ');
        const lot=(await db.query(`SELECT lot.*,l.production_order_id,l.title FROM erp.stock_lots lot JOIN erp.production_order_lines l ON l.organization_id=lot.organization_id AND l.id=lot.production_order_line_id WHERE lot.organization_id=$1 AND lot.id=$2 AND lot.item_id=$3 AND lot.project_id=$4`,[ctx.orgId,l.lotId,l.itemId,project.id])).rows[0];
        if(!lot || (input.productionOrderId && input.productionOrderId!==lot.production_order_id))throw new WorkflowError('Chọn đúng lô thành phẩm của dự án/lệnh sản xuất');
        const qty=positive(l.qty,'Số lượng bán'),price=nonnegative(l.unitPrice,'Giá bán'),discount=nonnegative(l.discountAmount || 0,'Chiết khấu');
        if(discount>qty*price)throw new WorkflowError('Chiết khấu vượt giá trị dòng');
        const factor=unitFactor(item,l.unitId);
        const b=(await db.query('SELECT * FROM erp.stock_balances WHERE organization_id=$1 AND warehouse_id=$2 AND item_id=$3 AND lot_id=$4',[ctx.orgId,l.warehouseId,l.itemId,l.lotId])).rows[0];
        if(!b || qty*factor>Number(b.on_hand_qty)-Number(b.reserved_qty)+1e-6)throw new WorkflowError('Lô chưa nhập đủ hoặc không đủ lượng còn bán');
        selected.push({...l,qty,price,discount,factor,lot,item,total:qty*price-discount});total+=qty*price-discount;
      }
      const code=await getNextDocumentCode(db,ctx.orgId,'sales_order','SO');
      const order=(await db.query(`INSERT INTO erp.sales_orders(organization_id,code,status,total,customer_id,project_id,owner_membership_id,created_by,updated_by) VALUES($1,$2,'submitted',$3,$4,$5,$6,$7,$7) RETURNING id`,[ctx.orgId,code,total,input.customerId,project.id,ctx.membershipId,ctx.userId])).rows[0];
      let no=1;
      for(const l of selected)await db.query(`INSERT INTO erp.sales_order_lines(organization_id,sales_order_id,line_no,description,qty,unit_price,discount_amount,line_total,factor_snapshot,specification_snapshot,item_id,unit_id,lot_id,warehouse_id,production_order_line_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,[ctx.orgId,order.id,no++,l.description || `${l.lot.title} / ${l.lot.lot_code}`,l.qty,l.price,l.discount,l.total,l.factor,{projectId:project.id,productionOrderId:l.lot.production_order_id,design:l.lot.design_snapshot},l.itemId,l.unitId,l.lotId,l.warehouseId,l.lot.production_order_line_id,ctx.userId]);
      if(input.recordReceivable){const days=positive(input.paymentDays || 15,'Hạn thanh toán');await db.query(`INSERT INTO erp.open_items(organization_id,side,currency,original_amount,due_date,status,source_sequence,partner_id,sales_order_id,created_by,updated_by) VALUES($1,'receivable','VND',$2,CURRENT_DATE+$3::integer,'confirmed',1,$4,$5,$6,$6)`,[ctx.orgId,total,days,input.customerId,order.id,ctx.userId]);}
      return {orderId:order.id};
    }));
  }
  static async detail(ctx:WorkflowContext,id:string){
    requireCapability(ctx,'sales_order.read');
    const order=(await getDbPool().query('SELECT * FROM erp.sales_orders WHERE organization_id=$1 AND id=$2',[ctx.orgId,id])).rows[0];
    if(!order)throw new WorkflowError('Không tìm thấy đơn bán',404);
    if(order.project_id)await assertProject(getDbPool(),ctx,order.project_id,'sales_order.read');
    order.lines=(await getDbPool().query(`SELECT l.*,lot.lot_code,i.code AS item_code,i.name AS item_name,u.name AS unit_name FROM erp.sales_order_lines l JOIN erp.items i ON i.organization_id=l.organization_id AND i.id=l.item_id JOIN erp.units u ON u.organization_id=l.organization_id AND u.id=l.unit_id LEFT JOIN erp.stock_lots lot ON lot.organization_id=l.organization_id AND lot.id=l.lot_id WHERE l.organization_id=$1 AND l.sales_order_id=$2 ORDER BY l.line_no`,[ctx.orgId,id])).rows;
    order.documents=(await getDbPool().query('SELECT id,code,status,type FROM erp.stock_documents WHERE organization_id=$1 AND sales_order_id=$2 ORDER BY created_at',[ctx.orgId,id])).rows;
    return order;
  }
  static async approve(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'sales.production.approve',{id},async()=>{
      const cap=requireCapability(ctx,'sales_order.approve');
      const order=(await db.query('SELECT * FROM erp.sales_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id])).rows[0];
      if(!order)throw new WorkflowError('Không tìm thấy đơn bán',404);await assertProject(db,ctx,order.project_id,'sales_order.approve');
      if(cap.amountLimit!=null && Number(order.total)>cap.amountLimit)throw new WorkflowError('Đơn bán vượt hạn mức duyệt',403);
      const existing=(await db.query("SELECT id FROM erp.stock_documents WHERE organization_id=$1 AND sales_order_id=$2 AND workflow_kind='sales_fulfillment' AND status NOT IN ('cancelled','rejected','reversed')",[ctx.orgId,id])).rows;
      if(!['submitted','approved','completed'].includes(order.status))throw new WorkflowError('Đơn bán không ở trạng thái có thể duyệt');
      const ls=(await db.query(`SELECT l.*,lot.project_id AS lot_project_id,lot.production_order_line_id AS lot_production_line_id FROM erp.sales_order_lines l LEFT JOIN erp.stock_lots lot ON lot.organization_id=l.organization_id AND lot.id=l.lot_id AND lot.item_id=l.item_id WHERE l.organization_id=$1 AND l.sales_order_id=$2 ORDER BY l.warehouse_id,l.item_id,l.lot_id,l.id`,[ctx.orgId,id])).rows;
      const catalog=await loadCatalog(db,ctx.orgId);
      const groups=new Map<string,any[]>();if(!ls.length)throw new WorkflowError('Đơn bán chưa có thành phẩm');
      for(const l of ls){
        if(!l.lot_id || !l.warehouse_id || l.lot_project_id!==order.project_id || l.lot_production_line_id!==l.production_order_line_id)throw new WorkflowError('Dòng bán thiếu hoặc sai lô dự án');
        const allocated=Number((await db.query(`SELECT COALESCE(SUM(sl.base_qty),0) AS n FROM erp.stock_document_lines sl JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE sl.organization_id=$1 AND sl.sales_line_id=$2 AND d.workflow_kind='sales_fulfillment' AND d.status NOT IN ('cancelled','rejected','reversed')`,[ctx.orgId,l.id])).rows[0].n);
        const remaining=Number(l.qty)*Number(l.factor_snapshot)-allocated;if(remaining<=1e-6)continue;
        const item=catalog.find(i=>i.id===l.item_id && i.isActive);if(!item || Math.abs(unitFactor(item,l.unit_id)-Number(l.factor_snapshot))>1e-6)throw new WorkflowError('Quy đổi mã hàng đã thay đổi; kiểm tra lại đơn bán');
        const b=(await db.query('SELECT * FROM erp.stock_balances WHERE organization_id=$1 AND warehouse_id=$2 AND item_id=$3 AND lot_id=$4 FOR UPDATE',[ctx.orgId,l.warehouse_id,l.item_id,l.lot_id])).rows[0];
        if(!b || Number(b.on_hand_qty)<=0)throw new WorkflowError('Lô chưa có tồn');
        const lines=groups.get(l.warehouse_id)||[];lines.push({itemId:l.item_id,lotId:l.lot_id,unitId:l.unit_id,qty:remaining/Number(l.factor_snapshot),salesLineId:l.id,unitCostSnapshot:Number(b.inventory_value)/Number(b.on_hand_qty)});groups.set(l.warehouse_id,lines);
      }
      const documents=existing.map(d=>d.id);
      for(const [wh,lines] of groups){
        await assertWarehouse(db,ctx,wh,'stock_document.create');
        const doc=await InventoryService.createDocument({type:'issue',purpose:`Xuất bán ${order.code}`,projectId:order.project_id,sourceWarehouseId:wh,submitNow:true,lines},ctx.userId,{client:db,workflowKind:'sales_fulfillment',salesOrderId:id});
        await reserveDocument(db,ctx.orgId,doc,ctx.userId);documents.push(doc);
      }
      if(groups.size || order.status==='submitted')await db.query("UPDATE erp.sales_orders SET status='approved',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,id]);
      return {orderId:id,documentIds:documents};
    }));
  }
  static async cancel(ctx:WorkflowContext,id:string,input:any){
    return transaction(ctx,db=>once(db,ctx,input.requestId,'sales.production.cancel',{id},async()=>{
      const order=(await db.query('SELECT * FROM erp.sales_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[ctx.orgId,id])).rows[0];
      if(!order)throw new WorkflowError('Không tìm thấy đơn bán',404);await assertProject(db,ctx,order.project_id,'sales_order.cancel');
      const docs=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND sales_order_id=$2',[ctx.orgId,id])).rows;
      if(docs.some(d=>['completed','reversed','dispatched'].includes(d.status)))throw new WorkflowError('Đơn đã giao; xử lý trả/đảo chứng từ');
      for(const d of docs){await settleReservations(db,ctx.orgId,d.id,ctx.userId,false);await db.query("UPDATE erp.stock_documents SET status='cancelled',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,d.id]);}
      await db.query("UPDATE erp.sales_orders SET status='cancelled',updated_by=$1 WHERE organization_id=$2 AND id=$3",[ctx.userId,ctx.orgId,id]);
      return {orderId:id};
    }));
  }
}
