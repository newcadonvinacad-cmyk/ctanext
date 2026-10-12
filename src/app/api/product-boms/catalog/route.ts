import { workflowHttp } from '@/lib/production/http';
import { ProductBomService } from '@/services/product-bom.service';
export async function GET() {return workflowHttp(ctx=>ProductBomService.surveyCatalog(ctx));}
