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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canReverse = Boolean(
      capabilities["payment.reverse"]?.isEnabled ||
      roles.some((r: any) => (typeof r === "string" ? r === "SUPER_ADMIN" : r.code === "SUPER_ADMIN"))
    );
    if (!canReverse) {
      return NextResponse.json({ error: "Không có quyền đảo phiếu thanh toán" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.reason?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập lý do đảo phiếu" }, { status: 400 });
    }

    const reversalId = await FinanceService.reversePayment(id, session.user.id, body.reason.trim());
    return NextResponse.json({ success: true, reversalId, message: "Đã đảo phiếu thanh toán thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi đảo phiếu" }, { status: 400 });
  }
}
