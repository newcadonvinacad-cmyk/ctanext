import type { PoolClient } from 'pg';
import { workflowContext, assertProject, assertWarehouse, WorkflowError } from './context';

export async function assertWorkflowStockRead(db:Pick<PoolClient,'query'>,orgId:string,id:string,userId:string){
  const doc=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND id=$2',[orgId,id])).rows[0];
  if(!doc?.workflow_kind)return;
  const ctx=await workflowContext(userId);
  if(doc.source_warehouse_id)await assertWarehouse(db,ctx,doc.source_warehouse_id,'stock_document.read');
  if(doc.destination_warehouse_id)await assertWarehouse(db,ctx,doc.destination_warehouse_id,'stock_document.read');
}

export async function lockWorkflowDocument(db: PoolClient, orgId: string, id: string, userId: string, phase: 'approve'|'post'|'cancel') {
  const doc=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND id=$2',[orgId,id])).rows[0];
  if(!doc?.workflow_kind)return;
  if(doc.production_order_id)await db.query('SELECT id FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[orgId,doc.production_order_id]);
  if(doc.sales_order_id)await db.query('SELECT id FROM erp.sales_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[orgId,doc.sales_order_id]);
  const ctx=await workflowContext(userId);
  const key=phase==='approve'?'stock_document.approve':phase==='cancel'?'stock_document.cancel':ctx.capabilities['stock_document.post']?.isEnabled?'stock_document.post':'stock_document.complete';
  if(doc.source_warehouse_id)await assertWarehouse(db,ctx,doc.source_warehouse_id,key);
  if(doc.destination_warehouse_id)await assertWarehouse(db,ctx,doc.destination_warehouse_id,key);
  const limit=ctx.capabilities[key]?.amountLimit;
  if(limit!=null){const total=Number((await db.query('SELECT COALESCE(SUM(qty*unit_cost_snapshot),0) AS n FROM erp.stock_document_lines WHERE organization_id=$1 AND document_id=$2',[orgId,id])).rows[0].n);if(total>limit)throw new WorkflowError('Phiếu vượt hạn mức được phép',403);}
  // Warehouse members may handle allocated documents without project membership;
  // creators of production/sales records are separately checked against the project.
}
export async function reserveDocument(db: PoolClient, orgId: string, documentId: string, userId: string) {
  const doc=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND id=$2',[orgId,documentId])).rows[0];
  if(!['production_material','sales_fulfillment'].includes(doc?.workflow_kind) && !(doc?.workflow_kind==='reversal' && doc.type==='issue'))return;
  if(doc.workflow_kind==='production_material')await allocateMaterialDocument(db,orgId,doc,userId);
  const lines=(await db.query('SELECT * FROM erp.stock_document_lines WHERE organization_id=$1 AND document_id=$2 ORDER BY item_id,lot_id,id',[orgId,documentId])).rows;
  for(const line of lines){
    if((await db.query("SELECT id FROM erp.stock_reservations WHERE organization_id=$1 AND document_line_id=$2 AND status='active'",[orgId,line.id])).rows.length)continue;
    const b=(await db.query('SELECT * FROM erp.stock_balances WHERE organization_id=$1 AND warehouse_id=$2 AND item_id=$3 AND lot_id=$4 FOR UPDATE',[orgId,doc.source_warehouse_id,line.item_id,line.lot_id])).rows[0];
    const qty=Number(line.base_qty);
    if(!b || Number(b.on_hand_qty)-Number(b.reserved_qty)+1e-6<qty)throw new WorkflowError(`Không đủ tồn khả dụng cho vật tư/lô ${line.item_id}; cần ${qty}`);
    if(!line.production_material_id && !line.sales_line_id && doc.workflow_kind!=='reversal')throw new WorkflowError('Phiếu thiếu liên kết nhu cầu sản xuất/bán hàng');
    await db.query('UPDATE erp.stock_balances SET reserved_qty=reserved_qty+$1,updated_by=$2 WHERE organization_id=$3 AND id=$4',[qty,userId,orgId,b.id]);
    await db.query(`INSERT INTO erp.stock_reservations(organization_id,qty,sales_line_id,production_material_id,warehouse_id,item_id,lot_id,document_line_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,[orgId,qty,line.sales_line_id,line.production_material_id,doc.source_warehouse_id,line.item_id,line.lot_id,line.id,userId]);
  }
}
async function allocateMaterialDocument(db:PoolClient,orgId:string,doc:any,userId:string){
  if(!['draft','submitted'].includes(doc.status))return;
  const held=Number((await db.query(`SELECT COUNT(*) AS n FROM erp.stock_reservations r JOIN erp.stock_document_lines sl ON sl.organization_id=r.organization_id AND sl.id=r.document_line_id WHERE sl.organization_id=$1 AND sl.document_id=$2`,[orgId,doc.id])).rows[0].n);
  if(held)return;
  const demands=(await db.query(`SELECT sl.production_material_id,sl.item_id,i.code,i.base_unit_id,SUM(sl.base_qty) AS needed FROM erp.stock_document_lines sl JOIN erp.items i ON i.organization_id=sl.organization_id AND i.id=sl.item_id WHERE sl.organization_id=$1 AND sl.document_id=$2 GROUP BY sl.production_material_id,sl.item_id,i.code,i.base_unit_id ORDER BY sl.item_id,sl.production_material_id`,[orgId,doc.id])).rows;
  const planned=new Map<string,number>(),allocated:any[]=[];
  for(const m of demands){
    if(!m.production_material_id)throw new WorkflowError('Phiếu NVL thiếu liên kết hạng mục');
    const lots=(await db.query(`SELECT b.* FROM erp.stock_balances b JOIN erp.stock_lots lot ON lot.organization_id=b.organization_id AND lot.id=b.lot_id WHERE b.organization_id=$1 AND b.warehouse_id=$2 AND b.item_id=$3 AND (lot.project_id IS NULL OR lot.project_id=$4) AND b.on_hand_qty>b.reserved_qty ORDER BY b.lot_id FOR UPDATE OF b`,[orgId,doc.source_warehouse_id,m.item_id,doc.project_id])).rows;
    let remaining=Number(m.needed);
    for(const b of lots){const used=planned.get(b.id)||0,take=Math.min(remaining,Number(b.on_hand_qty)-Number(b.reserved_qty)-used);if(take<=1e-6)continue;allocated.push({m,lotId:b.lot_id,qty:take,cost:Number(b.inventory_value)/Number(b.on_hand_qty)});planned.set(b.id,used+take);remaining-=take;if(remaining<=1e-6)break;}
    if(remaining>1e-6)throw new WorkflowError(`Không đủ tồn khả dụng ${m.code}; thiếu ${Number(remaining.toFixed(6))} đơn vị cơ sở tại kho nguồn`);
  }
  const ctx=await workflowContext(userId),limit=ctx.capabilities['stock_document.approve']?.amountLimit;
  if(limit!=null && allocated.reduce((n,l)=>n+l.qty*l.cost,0)>limit)throw new WorkflowError('Giá trị NVL theo lô thực tế vượt hạn mức duyệt',403);
  // Approval owns the document lock and transaction. Allocate unposted demand
  // while draft, then restore its pending state before reserving/approving.
  // Readers never observe the temporary state; any failure rolls it back.
  if(doc.status==='submitted')await db.query("UPDATE erp.stock_documents SET status='draft' WHERE organization_id=$1 AND id=$2",[orgId,doc.id]);
  await db.query('DELETE FROM erp.stock_document_lines WHERE organization_id=$1 AND document_id=$2',[orgId,doc.id]);
  for(const [n,l] of allocated.entries())await db.query(`INSERT INTO erp.stock_document_lines(organization_id,document_id,line_no,item_id,unit_id,lot_id,qty,factor_snapshot,base_qty,unit_cost_snapshot,production_material_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,1,$7,$8,$9,$10,$10)`,[orgId,doc.id,n+1,l.m.item_id,l.m.base_unit_id,l.lotId,l.qty,l.cost,l.m.production_material_id,userId]);
  if(doc.status==='submitted')await db.query("UPDATE erp.stock_documents SET status='submitted' WHERE organization_id=$1 AND id=$2",[orgId,doc.id]);
}
export async function settleReservations(db: PoolClient,orgId:string,id:string,userId:string,consume:boolean){
  const r=(await db.query(`SELECT r.* FROM erp.stock_reservations r JOIN erp.stock_document_lines l ON l.organization_id=r.organization_id AND l.id=r.document_line_id WHERE r.organization_id=$1 AND l.document_id=$2 AND r.status='active' ORDER BY r.item_id,r.lot_id,r.id FOR UPDATE OF r`,[orgId,id])).rows;
  for(const v of r){
    const changed=await db.query('UPDATE erp.stock_balances SET reserved_qty=reserved_qty-$1,updated_by=$2 WHERE organization_id=$3 AND warehouse_id=$4 AND item_id=$5 AND lot_id=$6 AND reserved_qty >= $1',[v.qty,userId,orgId,v.warehouse_id,v.item_id,v.lot_id]);
    if(changed.rowCount!==1)throw new WorkflowError('Lượng giữ kho không khớp; kiểm tra trước khi ghi sổ');
    await db.query('UPDATE erp.stock_reservations SET status=$1,updated_by=$2 WHERE organization_id=$3 AND id=$4',[consume?'consumed':'released',userId,orgId,v.id]);
  }
}
export async function refreshProduction(db:PoolClient,orgId:string,orderId:string,userId:string){
  const order=(await db.query('SELECT * FROM erp.production_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[orgId,orderId])).rows[0];
  if(!order || order.status==='cancelled')return;
  const approvals=(await db.query(`SELECT COUNT(*) AS n,COUNT(*) FILTER(WHERE status NOT IN ('approved','completed')) AS unapproved FROM erp.stock_documents WHERE organization_id=$1 AND production_order_id=$2 AND workflow_kind='production_material'`,[orgId,orderId])).rows[0];
  if(order.status==='draft' && Number(approvals.n)>0 && !Number(approvals.unapproved))await db.query("UPDATE erp.production_orders SET status='released',updated_by=$1 WHERE organization_id=$2 AND id=$3",[userId,orgId,orderId]);
  const lines=(await db.query('SELECT * FROM erp.production_order_lines WHERE organization_id=$1 AND production_order_id=$2 ORDER BY id FOR UPDATE',[orgId,orderId])).rows;
  for(const l of lines){
    const posted=(await db.query(`SELECT pm.id,pm.required_base_qty,COALESCE(SUM(CASE WHEN d.status='completed' THEN CASE WHEN d.workflow_kind='production_return' THEN -sl.base_qty WHEN d.workflow_kind='production_material' THEN sl.base_qty ELSE 0 END ELSE 0 END),0) AS issued FROM erp.production_materials pm LEFT JOIN erp.stock_document_lines sl ON sl.organization_id=pm.organization_id AND sl.production_material_id=pm.id LEFT JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE pm.organization_id=$1 AND pm.production_order_line_id=$2 GROUP BY pm.id`,[orgId,l.id])).rows;
    const received=Number((await db.query(`SELECT COALESCE(SUM(o.accepted_qty),0) AS n FROM erp.production_outputs o JOIN erp.stock_documents d ON d.organization_id=o.organization_id AND d.id=o.receipt_document_id WHERE o.organization_id=$1 AND o.production_order_line_id=$2 AND d.status='completed'`,[orgId,l.id])).rows[0].n);
    const ready=posted.length>0 && posted.every(m=>Number(m.issued)+1e-6>=Number(m.required_base_qty));
    const status=received+1e-6>=Number(l.target_qty)?'completed':l.status==='completed'?'rework':l.status==='waiting_materials' && ready?'ready':l.status==='ready' && !ready?'waiting_materials':l.status;
    await db.query('UPDATE erp.production_order_lines SET received_qty=$1,status=$2 WHERE organization_id=$3 AND id=$4',[received,status,orgId,l.id]);
    if(status==='completed')await db.query("UPDATE erp.tasks SET status='done',progress_percent=100,updated_by=$1 WHERE organization_id=$2 AND id=$3",[userId,orgId,l.task_id]);
  }
  const unfinished=Number((await db.query("SELECT count(*) AS n FROM erp.production_order_lines WHERE organization_id=$1 AND production_order_id=$2 AND status<>'completed'",[orgId,orderId])).rows[0].n);
  if(!unfinished){await db.query("UPDATE erp.production_orders SET status='completed',updated_by=$1 WHERE organization_id=$2 AND id=$3",[userId,orgId,orderId]); await db.query("UPDATE erp.tasks SET status='done',progress_percent=100,updated_by=$1 WHERE organization_id=$2 AND id=$3",[userId,orgId,order.task_id]);}
  else if(order.status==='completed')await db.query("UPDATE erp.production_orders SET status='in_progress',updated_by=$1 WHERE organization_id=$2 AND id=$3",[userId,orgId,orderId]);
}
export async function afterStockChange(db:PoolClient,orgId:string,id:string,userId:string){
  const d=(await db.query('SELECT * FROM erp.stock_documents WHERE organization_id=$1 AND id=$2',[orgId,id])).rows[0];
  if(!d?.workflow_kind)return;
  if(d.workflow_kind==='reversal' && d.status==='completed')await db.query("UPDATE erp.stock_documents SET status='reversed',updated_by=$1 WHERE organization_id=$2 AND id=$3",[userId,orgId,d.reverses_document_id]);
  if(d.production_order_id)await refreshProduction(db,orgId,d.production_order_id,userId);
  if(d.sales_order_id){
    const ls=(await db.query(`SELECT l.id,l.qty,COALESCE(SUM(CASE WHEN d.status='completed' AND d.workflow_kind='sales_fulfillment' THEN sl.base_qty/l.factor_snapshot ELSE 0 END),0) AS delivered FROM erp.sales_order_lines l LEFT JOIN erp.stock_document_lines sl ON sl.organization_id=l.organization_id AND sl.sales_line_id=l.id LEFT JOIN erp.stock_documents d ON d.organization_id=sl.organization_id AND d.id=sl.document_id WHERE l.organization_id=$1 AND l.sales_order_id=$2 GROUP BY l.id`,[orgId,d.sales_order_id])).rows;
    for(const l of ls)await db.query('UPDATE erp.sales_order_lines SET delivered_qty=$1 WHERE organization_id=$2 AND id=$3',[l.delivered,orgId,l.id]);
    const complete=ls.length && ls.every(l=>Number(l.delivered)+1e-6>=Number(l.qty));
    await db.query('UPDATE erp.sales_orders SET status=$1,updated_by=$2 WHERE organization_id=$3 AND id=$4',[complete?'completed':'approved',userId,orgId,d.sales_order_id]);
  }
}
