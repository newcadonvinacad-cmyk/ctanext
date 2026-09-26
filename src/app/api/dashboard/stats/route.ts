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
    const canViewFinance = Boolean(
      capabilities["payment.read"]?.isEnabled || 
      capabilities["project_finance.read"]?.isEnabled
    );

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const kpis = await FinanceService.getExecutiveKpis({ startDate, endDate });

    // DASH-01: Nếu người dùng (ví dụ: thợ, lái xe) không có quyền tài chính, ẩn toàn bộ số liệu nhạy cảm
    if (!canViewFinance) {
      kpis.totalRevenue = 0;
      kpis.totalExpense = 0;
      kpis.grossProfit = 0;
      kpis.cashBalance = 0;
      kpis.bankBalance = 0;
      kpis.receivablesTotal = 0;
      kpis.payablesTotal = 0;
    }

    return NextResponse.json({ kpis, canViewFinance });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải số liệu bàn làm việc", details: err.message },
      { status: 500 }
    );
  }
}
