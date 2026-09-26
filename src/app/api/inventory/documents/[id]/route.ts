import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết phiếu kho" }, { status: 403 });
    }

    const canViewCost = !!capabilities["item.cost_read"]?.isEnabled || !!capabilities["stock_document.cost_read"]?.isEnabled;

    const data = await InventoryService.getDocumentDetail(id, { canViewCost });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết phiếu kho", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["stock_document.cancel"]?.isEnabled && !capabilities["stock_document.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền hủy phiếu kho" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason") || undefined;

    await InventoryService.cancelDocument(id, session.user.id, reason);
    return NextResponse.json({ success: true, message: "Đã hủy phiếu kho" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi hủy phiếu kho", details: err.message },
      { status: 400 }
    );
  }
}
