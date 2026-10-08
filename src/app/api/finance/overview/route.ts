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
    if (
      !capabilities["payment.read"]?.isEnabled &&
      !capabilities["project_finance.read"]?.isEnabled &&
      !capabilities["payment.create"]?.isEnabled &&
      !capabilities["supplier.read"]?.isEnabled &&
      !capabilities["purchase_order.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem dữ liệu tài chính" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || undefined;

    // Chạy song song tất cả các truy vấn tài chính trên server (chỉ tốn 1 HTTP roundtrip và 1 lần check auth)
    const [accounts, movements, payments, receivables, payables] = await Promise.all([
      FinanceService.listCashAccounts(),
      FinanceService.listCashMovements({ accountId }),
      FinanceService.listPayments(),
      FinanceService.listOpenItems("receivable"),
      FinanceService.listOpenItems("payable"),
    ]);

    return NextResponse.json({
      accounts,
      movements,
      payments,
      receivables,
      payables,
    });
  } catch (err: any) {
    console.error("GET /api/finance/overview ERROR:", err);
    return NextResponse.json(
      { error: "Lỗi tải tổng quan tài chính", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
