import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FinanceService } from "@/services/finance.service";
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
    if (!capabilities["payment.read"]?.isEnabled && !capabilities["project_finance.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chứng từ thanh toán" }, { status: 403 });
    }

    const voucherData = await FinanceService.generatePaymentVoucherData(id);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    if (format === "html") {
      const html = FinanceService.generateVoucherHtml(voucherData);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ voucher: voucherData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tạo chứng từ in" }, { status: 500 });
  }
}
