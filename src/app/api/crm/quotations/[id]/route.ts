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
    if (!capabilities["quotation.read"]?.isEnabled && !capabilities["sales_order.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết báo giá" }, { status: 403 });
    }

    const detail = await CrmService.getQuotationDetail(id);
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết báo giá", details: err.message },
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

    const body = await req.json();

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);

    // Nếu gửi status để cập nhật trạng thái
    if (body.status) {
      if (body.status === "approved" && !capabilities["quotation.approve"]?.isEnabled && !capabilities["quotation.update"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền phê duyệt báo giá" }, { status: 403 });
      }
      await CrmService.updateQuotationStatus(id, body.status, session.user.id);
      return NextResponse.json({ success: true, message: `Đã cập nhật trạng thái báo giá sang '${body.status}'` });
    }

    // Nếu cập nhật nội dung báo giá (lines, discount, tax...)
    if (!capabilities["quotation.update"]?.isEnabled && !capabilities["quotation.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật báo giá" }, { status: 403 });
    }

    await CrmService.updateQuotation(id, body, session.user.id);
    return NextResponse.json({ success: true, message: "Đã cập nhật chi tiết báo giá thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật báo giá", details: err.message },
      { status: 400 }
    );
  }
}
