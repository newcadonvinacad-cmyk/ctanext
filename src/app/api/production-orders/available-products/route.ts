import { workflowHttp } from '@/lib/production/http';
import { ProductionSalesService } from '@/services/production-sales.service';
import { WorkflowError } from '@/lib/production/context';
export const dynamic='force-dynamic';
export async function GET(req:Request){return workflowHttp(async ctx=>{const p=new URL(req.url).searchParams,project=p.get('projectId');if(!project)throw new WorkflowError('Chọn dự án');return {products:await ProductionSalesService.available(ctx,project,p.get('productionOrderId')||undefined)};});}
