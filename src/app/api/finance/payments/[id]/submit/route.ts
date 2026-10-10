import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FinanceService } from "@/services/finance.service";
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
    const canSubmit = Boolean(
      capabilities["payment.submit"]?.isEnabled ||
      capabilities["payment.create"]?.isEnabled ||
      capabilities["project_finance.update"]?.isEnabled
    );
    if (!canSubmit) {
      return NextResponse.json({ error: "Không có quyền gửi duyệt phiếu thanh toán" }, { status: 403 });
    }

    await FinanceService.submitPayment(id, session.user.id);
    return NextResponse.json({ success: true, message: "Đã gửi duyệt phiếu thanh toán thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi gửi duyệt phiếu" }, { status: 400 });
  }
}
