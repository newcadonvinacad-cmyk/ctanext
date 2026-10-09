import { workflowHttp } from '@/lib/production/http';
import { ProductionService } from '@/services/production.service';
export const dynamic='force-dynamic';
export async function GET(req:Request){return workflowHttp(async ctx=>({orders:await ProductionService.list(ctx,new URL(req.url).searchParams.get('projectId') || undefined)}));}
export async function POST(req:Request){return workflowHttp(async ctx=>ProductionService.create(ctx,await req.json()));}
