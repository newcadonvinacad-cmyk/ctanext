import { workflowHttp } from '@/lib/production/http';
import { ProductionSalesService } from '@/services/production-sales.service';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>({order:await ProductionSalesService.detail(ctx,(await params).id)}));}
