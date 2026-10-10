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
    const postCap = capabilities["payment.post"];
    const isSuperAdmin = roles.some((r: any) => (typeof r === "string" ? r === "SUPER_ADMIN" : r.code === "SUPER_ADMIN"));

    if (!postCap?.isEnabled && !isSuperAdmin) {
      return NextResponse.json({ error: "Không có quyền ghi sổ phiếu thanh toán" }, { status: 403 });
    }

    await FinanceService.postPayment(id, session.user.id, postCap?.amountLimit ?? null);
    return NextResponse.json({ success: true, message: "Đã ghi sổ phiếu thanh toán thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi ghi sổ phiếu" }, { status: 400 });
  }
}
