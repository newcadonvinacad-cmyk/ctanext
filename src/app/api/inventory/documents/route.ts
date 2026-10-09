import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";
import {getDbPool,getCachedOrgId} from '@/lib/db';
import {assertWorkflowStockRead} from '@/lib/production/stock-hooks';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách phiếu kho" }, { status: 403 });
    }

    const canViewCost = !!capabilities["item.cost_read"]?.isEnabled || !!capabilities["stock_document.cost_read"]?.isEnabled;

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") as any) || undefined;
    const status = searchParams.get("status") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    const userApprovalLimit = capabilities["stock_document.approve"]?.amountLimit;

    const documents = await InventoryService.listDocuments(
      { type, status, warehouseId, pendingOnly, userApprovalLimit },
      { canViewCost }
    );

    const linked=new Set((await getDbPool().query("SELECT id FROM erp.stock_documents WHERE organization_id=$1 AND id=ANY($2::uuid[]) AND to_jsonb(stock_documents)->>'workflow_kind' IS NOT NULL",[await getCachedOrgId(),documents.map(d=>d.id)])).rows.map(d=>d.id));
    const visible=[];for(const doc of documents){try{if(linked.has(doc.id))await assertWorkflowStockRead(getDbPool(),await getCachedOrgId(),doc.id,session.user.id);visible.push(doc);}catch(e:any){if(e.status!==403)throw e;}}
    return NextResponse.json({ documents:visible });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách phiếu kho", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["stock_document.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo phiếu kho" }, { status: 403 });
    }

    const body = await req.json();
    if(body.workflowKind || body.salesOrderId || body.reversesDocumentId || body.lines?.some((l:any)=>l.productionMaterialId || l.reversesLineId))return NextResponse.json({error:'Chứng từ liên kết được tạo từ lệnh sản xuất hoặc đơn bán'},{status:400});
    const lotIds=body.lines?.map((l:any)=>l.lotId).filter(Boolean) || [];
    if(lotIds.length && (await getDbPool().query("SELECT id FROM erp.stock_lots WHERE organization_id=$1 AND id=ANY($2::uuid[]) AND to_jsonb(stock_lots)->>'production_order_line_id' IS NOT NULL LIMIT 1",[await getCachedOrgId(),lotIds])).rows.length)return NextResponse.json({error:'Lô thành phẩm dự án phải xuất qua đơn bán hoặc chứng từ sản xuất liên kết'},{status:400});
    const purpose =
      body.purpose?.trim() ||
      body.reason?.trim() ||
      (body.type === "receipt"
        ? "Nhập kho vật tư"
        : body.type === "issue"
        ? "Xuất kho vật tư"
        : "Điều chuyển kho");

    if (!body.type || !body.lines || body.lines.length === 0) {
      return NextResponse.json(
        { error: "Loại phiếu và Danh sách chi tiết vật tư là bắt buộc!" },
        { status: 400 }
      );
    }

    const documentId = await InventoryService.createDocument(
      { ...body, purpose },
      session.user.id
    );
    return NextResponse.json({ success: true, documentId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo phiếu kho", details: err.message },
      { status: 400 }
    );
  }
}
