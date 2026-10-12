import { workflowHttp } from '@/lib/production/http';
import { MaterialProposalService } from '@/services/material-proposal.service';
export async function PUT(req:Request,{params}:{params:Promise<{id:string;proposalId:string}>}) {
 const {id,proposalId}=await params;return workflowHttp(async ctx=>MaterialProposalService.review(ctx,id,proposalId,await req.json()));
}
