import { workflowHttp } from '@/lib/production/http';
import { ProductionBomService } from '@/services/production-bom.service';
import { WorkflowError } from '@/lib/production/context';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>({bom:await ProductionBomService.detail(ctx,(await params).id)}));}
export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>ProductionBomService.save(ctx,(await params).id,await req.json()));}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){return workflowHttp(async ctx=>{const b=await req.json();if(b.action!=='revise')throw new WorkflowError('Thao tác không hợp lệ');return ProductionBomService.revise(ctx,(await params).id,b);});}
