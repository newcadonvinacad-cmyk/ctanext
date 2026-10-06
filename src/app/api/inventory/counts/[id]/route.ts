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
    if (!capabilities["inventory.read"]?.isEnabled && !capabilities["stock_document.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết kiểm kê" }, { status: 403 });
    }

    const count = await InventoryService.getInventoryCountById(id);
    if (!count) {
      return NextResponse.json({ error: "Không tìm thấy phiếu kiểm kê" }, { status: 404 });
    }

    return NextResponse.json({ count });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết phiếu kiểm kê", details: err.message },
      { status: 500 }
    );
  }
}
