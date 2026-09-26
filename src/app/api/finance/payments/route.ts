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
      return NextResponse.json({ error: "Không có quyền xem giao dịch thu chi" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get("direction") || undefined;
    const accountId = searchParams.get("accountId") || undefined;

    const payments = await FinanceService.listPayments({ direction, accountId });
    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải giao dịch", details: err.message },
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
    if (
      !capabilities["payment.create"]?.isEnabled &&
      !capabilities["supplier.update"]?.isEnabled &&
      !capabilities["purchase_order.create"]?.isEnabled &&
      !capabilities["purchase_order.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền lập phiếu thu/chi" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.direction || !body.amount || !body.purpose || !body.cashAccountId) {
      return NextResponse.json(
        { error: "Vui lòng nhập đủ: Loại phiếu (Thu/Chi), Số tiền, Lý do và Tài khoản quỹ" },
        { status: 400 }
      );
    }

    const paymentId = await FinanceService.createPayment(body, session.user.id);
    return NextResponse.json({ success: true, paymentId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi ghi nhận giao dịch", details: err.message },
      { status: 500 }
    );
  }
}
