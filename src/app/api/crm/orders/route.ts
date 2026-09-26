import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["sales_order.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách đơn hàng" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const keyword = searchParams.get("keyword") || undefined;

    const orders = await CrmService.listSalesOrders({ status, keyword });
    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách đơn hàng", details: err.message },
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
    if (!capabilities["sales_order.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo đơn bán hàng" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.customerId || !body.lines || body.lines.length === 0) {
      return NextResponse.json(
        { error: "Khách hàng và ít nhất 1 dòng mặt hàng là bắt buộc!" },
        { status: 400 }
      );
    }

    const orderId = await CrmService.createSalesOrder(body, session.user.id);
    return NextResponse.json({ success: true, orderId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo đơn bán hàng", details: err.message },
      { status: 400 }
    );
  }
}
