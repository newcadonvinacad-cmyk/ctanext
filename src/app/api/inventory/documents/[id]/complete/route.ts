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
    if (!capabilities["stock_document.post"]?.isEnabled) {
      return NextResponse.json(
        { error: "Bạn không có quyền xác nhận hoàn tất và ghi sổ phiếu kho (yêu cầu quyền 'stock_document.post')" },
        { status: 403 }
      );
    }

    await InventoryService.completeDocument(id, session.user.id);

    return NextResponse.json({ success: true, message: "Đã xác nhận hoàn tất phiếu và ghi sổ kho thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi hoàn tất phiếu kho", details: err.message },
      { status: 400 }
    );
  }
}
