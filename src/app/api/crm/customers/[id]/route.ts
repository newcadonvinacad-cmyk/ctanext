import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
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
    if (!capabilities["customer.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết khách hàng" }, { status: 403 });
    }

    const detail = await CrmService.getCustomerDetail(id);
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết khách hàng", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    if (!capabilities["customer.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật khách hàng" }, { status: 403 });
    }

    const body = await req.json();
    await CrmService.updateCustomer(id, body, session.user.id);

    return NextResponse.json({ success: true, message: "Cập nhật thông tin khách hàng thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật khách hàng", details: err.message },
      { status: 400 }
    );
  }
}
