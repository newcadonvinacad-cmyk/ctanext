import { workflowHttp } from '@/lib/production/http';
import { ProductionService } from '@/services/production.service';
import { WorkflowError } from '@/lib/production/context';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>{
 const {id}=await params,body=await req.json();
 switch(body.action){
  case 'submit':return ProductionService.submit(ctx,id,body);
  case 'report':return ProductionService.report(ctx,id,body);
  case 'qc':return ProductionService.qc(ctx,id,body);
  case 'edit_draft':return ProductionService.editDraft(ctx,id,body);
  case 'supplement':return ProductionService.materialDocument(ctx,id,body,false);
  case 'return':return ProductionService.materialDocument(ctx,id,body,true);
  case 'cancel':return ProductionService.cancel(ctx,id,body);
  default:throw new WorkflowError('Thao tác không hợp lệ');
 }
});}
