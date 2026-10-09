import { workflowHttp } from '@/lib/production/http';
import { ProductionService } from '@/services/production.service';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>({order:await ProductionService.detail(ctx,(await params).id)}));}
