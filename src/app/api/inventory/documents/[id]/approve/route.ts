import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services/inventory.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(
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
    if (!capabilities["stock_document.approve"]?.isEnabled) {
      return NextResponse.json({ error: "Bạn không có quyền duyệt phiếu kho" }, { status: 403 });
    }

    const approvalLimit = capabilities["stock_document.approve"]?.amountLimit;
    await InventoryService.approveDocument(id, session.user.id, approvalLimit);

    return NextResponse.json({ success: true, message: "Đã phê duyệt phiếu kho thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phê duyệt phiếu kho", details: err.message },
      { status: 400 }
    );
  }
}
