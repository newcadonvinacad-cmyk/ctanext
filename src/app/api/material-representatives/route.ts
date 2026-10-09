import { workflowHttp } from '@/lib/production/http';
import { ProductionBomService } from '@/services/production-bom.service';
export const dynamic='force-dynamic';
export async function GET(){return workflowHttp(async ctx=>({representatives:await ProductionBomService.representatives(ctx)}));}
export async function PUT(req:Request){return workflowHttp(async ctx=>{const b=await req.json();return {representative:await ProductionBomService.saveRepresentative(ctx,b.id,b)};});}
export async function POST(req:Request){return workflowHttp(async ctx=>ProductionBomService.createRepresentative(ctx,await req.json()));}
