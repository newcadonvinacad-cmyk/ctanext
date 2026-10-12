import { workflowHttp } from '@/lib/production/http';
import { MaterialProposalService } from '@/services/material-proposal.service';
type Params={params:Promise<{id:string}>};
export async function GET(_req:Request,{params}:Params) {const {id}=await params;return workflowHttp(ctx=>MaterialProposalService.list(ctx,id));}
export async function POST(req:Request,{params}:Params) {const {id}=await params;return workflowHttp(async ctx=>MaterialProposalService.generate(ctx,id,await req.json()));}
