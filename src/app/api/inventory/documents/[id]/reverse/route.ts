import {workflowHttp} from '@/lib/production/http';
import {ProductionStockService} from '@/services/production-stock.service';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>ProductionStockService.reverse(ctx,(await params).id,await req.json()));}
