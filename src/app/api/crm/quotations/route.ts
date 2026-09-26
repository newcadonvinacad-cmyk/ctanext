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
    if (!capabilities["quotation.read"]?.isEnabled && !capabilities["sales_order.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách báo giá" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const keyword = searchParams.get("keyword") || undefined;

    const quotations = await CrmService.listQuotations({ status, customerId, keyword });
    return NextResponse.json({ quotations });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách báo giá", details: err.message },
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
    if (!capabilities["quotation.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo báo giá dự toán" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.customerId || !body.lines || body.lines.length === 0) {
      return NextResponse.json(
        { error: "Khách hàng và các hạng mục báo giá là bắt buộc!" },
        { status: 400 }
      );
    }

    const quotationId = await CrmService.createQuotation(body, session.user.id);
    return NextResponse.json({ success: true, quotationId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lập báo giá dự toán", details: err.message },
      { status: 400 }
    );
  }
}
