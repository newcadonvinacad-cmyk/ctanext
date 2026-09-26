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
    if (!capabilities["receivable.read"]?.isEnabled && !capabilities["payable.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem sổ công nợ" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const side = (searchParams.get("side") as "receivable" | "payable") || "receivable";

    const items = await FinanceService.listOpenItems(side);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải sổ công nợ", details: err.message },
      { status: 500 }
    );
  }
}
