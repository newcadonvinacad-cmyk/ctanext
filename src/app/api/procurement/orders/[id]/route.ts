import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProcurementService } from "@/services/procurement.service";
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
    if (!capabilities["purchase_order.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết đơn mua hàng" }, { status: 403 });
    }

    const po = await ProcurementService.getPurchaseOrderById(id);
    if (!po) {
      return NextResponse.json({ error: "Không tìm thấy đơn mua hàng" }, { status: 404 });
    }

    return NextResponse.json({ order: po });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết đơn mua", details: err.message },
      { status: 500 }
    );
  }
}
