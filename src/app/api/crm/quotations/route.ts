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
    if (!body.customerId) {
      return NextResponse.json(
        { error: "Khách hàng là bắt buộc!" },
        { status: 400 }
      );
    }

    // Tương thích ngược: Nếu client gửi components thay vì lines
    if ((!body.lines || body.lines.length === 0) && Array.isArray(body.components) && body.components.length > 0) {
      body.lines = [
        {
          description: body.title || "Sản phẩm biển hiệu quảng cáo",
          qty: 1,
          unitPrice: Number(body.totalAmount) || Number(body.estimatedCost) || 0,
          components: body.components.map((c: any) => ({
            kind: c.category === "labor" ? "labor" : c.category === "machine" ? "transport" : c.category === "other" ? "other" : "material",
            qty: Number(c.qty) || 1,
            unitCost: Number(c.unitCost) || 0,
            wasteRate: 0,
          })),
        },
      ];
    } else if (!body.lines || body.lines.length === 0) {
      // Nếu không có cả lines và components, tạo ít nhất 1 line từ thông tin báo giá
      body.lines = [
        {
          description: body.title || "Hạng mục biển hiệu quảng cáo",
          qty: 1,
          unitPrice: Number(body.totalAmount) || Number(body.estimatedCost) || 0,
        },
      ];
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
