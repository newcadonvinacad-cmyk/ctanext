import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProcurementService } from "@/services/procurement.service";
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

    await ProcurementService.approvePurchaseOrder(id, capabilities, session.user.id);
    return NextResponse.json({ success: true, message: "Đã phê duyệt đơn mua hàng thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi phê duyệt đơn mua" },
      { status: 400 }
    );
  }
}
