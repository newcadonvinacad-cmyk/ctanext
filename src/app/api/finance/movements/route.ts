import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FinanceService } from "@/services/finance.service";
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
    if (!capabilities["payment.read"]?.isEnabled && !capabilities["project_finance.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem biến động sổ quỹ" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || undefined;
    const direction = searchParams.get("direction") || undefined;
    const search = searchParams.get("search") || undefined;

    const movements = await FinanceService.listCashMovements({
      accountId,
      direction,
      search,
    });

    return NextResponse.json({ movements });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải biến động sổ quỹ", details: err.message },
      { status: 500 }
    );
  }
}
