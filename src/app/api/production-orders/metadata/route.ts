import { NextResponse } from 'next/server';
import { productionReady, requireCapability, assertProject, assertWarehouse, WorkflowError } from '@/lib/production/context';
import { workflowHttp } from '@/lib/production/http';
import { getDbPool } from '@/lib/db';
import { loadCatalog } from '@/services/production-bom.service';
export const dynamic='force-dynamic';
export async function GET(){
 if(!await productionReady())return NextResponse.json({ready:false});
 return workflowHttp(async ctx=>{
  const projectPermission=ctx.capabilities['production_order.read']?.isEnabled?'production_order.read':'sales_order.read';requireCapability(ctx,projectPermission);const db=getDbPool();
  const all=(await db.query('SELECT id,code,name,customer_id FROM erp.projects WHERE organization_id=$1 ORDER BY updated_at DESC',[ctx.orgId])).rows;
  const projects=[];for(const p of all){try{await assertProject(db,ctx,p.id,projectPermission);projects.push(p);}catch(e){if(!(e instanceof WorkflowError)||e.status!==403)throw e;}}
  const wh=(await db.query('SELECT id,code,name FROM erp.warehouses WHERE organization_id=$1 AND is_active=true ORDER BY name',[ctx.orgId])).rows;
  const warehouses=[];for(const w of wh){try{await assertWarehouse(db,ctx,w.id,ctx.capabilities['stock_document.create']?.isEnabled?'stock_document.create':'stock_document.read');warehouses.push(w);}catch(e){if(!(e instanceof WorkflowError)||e.status!==403)throw e;}}
  const ids=projects.map(p=>p.id);
  return {ready:true,projects,warehouses,items:await loadCatalog(db,ctx.orgId),
   tasks:(await db.query('SELECT id,code,title,project_id FROM erp.tasks WHERE organization_id=$1 AND project_id=ANY($2::uuid[]) ORDER BY code',[ctx.orgId,ids])).rows,
   designs:(await db.query("SELECT id,project_id,code,title,version_no,status FROM erp.design_proofs WHERE organization_id=$1 AND project_id=ANY($2::uuid[]) AND status='approved' ORDER BY created_at DESC",[ctx.orgId,ids])).rows,
   boms:(await db.query('SELECT id,project_id,code,title,status,mapped,design_proof_id,revision_no FROM erp.project_boms WHERE organization_id=$1 AND project_id=ANY($2::uuid[]) ORDER BY created_at DESC',[ctx.orgId,ids])).rows,
   teams:(await db.query('SELECT id,code,name FROM erp.teams WHERE organization_id=$1 ORDER BY name',[ctx.orgId])).rows,
   representatives:(await db.query('SELECT * FROM erp.material_representatives WHERE organization_id=$1 ORDER BY code',[ctx.orgId])).rows,
   capabilities:Object.fromEntries(Object.entries(ctx.capabilities).filter(([,v])=>v.isEnabled).map(([k])=>[k,true]))};
 });
}
