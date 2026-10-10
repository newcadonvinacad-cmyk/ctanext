import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
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
    if (!capabilities["sales_order.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo đơn bán hàng từ báo giá (yêu cầu quyền 'sales_order.create')" }, { status: 403 });
    }

    const salesOrderId = await CrmService.convertQuotationToSalesOrder(id, session.user.id);
    return NextResponse.json({ success: true, salesOrderId, message: "Đã chuyển đổi báo giá thành Đơn bán hàng thành công!" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi chuyển đổi báo giá sang đơn hàng", details: err.message },
      { status: 400 }
    );
  }
}
