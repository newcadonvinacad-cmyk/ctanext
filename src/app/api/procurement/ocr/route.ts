import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProcurementService } from "@/services/procurement.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["ai_run.create"]?.isEnabled && !capabilities["purchase_order.create"]?.isEnabled) {
      return NextResponse.json(
        { error: "Không có quyền sử dụng tính năng AI OCR hóa đơn" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const imageInput = body.imageBase64 || body.image || "";

    if (!imageInput) {
      return NextResponse.json({ error: "Vui lòng cung cấp dữ liệu ảnh hóa đơn" }, { status: 400 });
    }

    const result = await ProcurementService.processInvoiceOcr(imageInput, session.user.id);
    return NextResponse.json({ success: true, result, lines: result.lines });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xử lý OCR hóa đơn", details: err.message },
      { status: 500 }
    );
  }
}
