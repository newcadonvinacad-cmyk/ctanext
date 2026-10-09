import { workflowHttp } from '@/lib/production/http';
import { ProductionSalesService } from '@/services/production-sales.service';
import { WorkflowError } from '@/lib/production/context';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>{const b=await req.json(),{id}=await params;if(b.action==='approve')return ProductionSalesService.approve(ctx,id,b);if(b.action==='cancel')return ProductionSalesService.cancel(ctx,id,b);throw new WorkflowError('Thao tác không hợp lệ');});}
