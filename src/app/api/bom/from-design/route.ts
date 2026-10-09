import { workflowHttp } from '@/lib/production/http';
import { ProductionBomService } from '@/services/production-bom.service';
export const dynamic='force-dynamic';
export async function POST(req:Request){return workflowHttp(async ctx=>ProductionBomService.fromDesign(ctx,await req.json()));}
