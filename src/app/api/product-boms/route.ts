import { workflowHttp } from '@/lib/production/http';
import { ProductBomService } from '@/services/product-bom.service';
export async function GET() { return workflowHttp(ctx=>ProductBomService.list(ctx)); }
export async function POST(req:Request) { return workflowHttp(async ctx=>ProductBomService.saveSample(ctx,await req.json())); }
export async function PATCH(req:Request) { return workflowHttp(async ctx=>ProductBomService.archive(ctx,await req.json())); }
