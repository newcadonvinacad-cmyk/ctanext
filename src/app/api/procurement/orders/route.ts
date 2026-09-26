import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProcurementService } from "@/services/procurement.service";
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
    if (!capabilities["purchase_order.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem đơn mua hàng" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;

    const orders = await ProcurementService.listPurchaseOrders({ status, supplierId, projectId });
    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải đơn mua hàng", details: err.message },
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
    if (!capabilities["purchase_order.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền lập đơn mua hàng" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.supplierId || !body.lines || body.lines.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn nhà cung cấp và ít nhất 1 mặt hàng" }, { status: 400 });
    }

    const poId = await ProcurementService.createPurchaseOrder(body, session.user.id);
    return NextResponse.json({ success: true, poId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lập đơn mua hàng", details: err.message },
      { status: 500 }
    );
  }
}
