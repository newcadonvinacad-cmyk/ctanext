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
      return NextResponse.json({ error: "Không có quyền xem sổ quỹ" }, { status: 403 });
    }

    const accounts = await FinanceService.listCashAccounts();
    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải tài khoản quỹ", details: err.message },
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
    if (!capabilities["payment.create"]?.isEnabled && !capabilities["project_finance.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền thiết lập sổ quỹ" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.kind) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên sổ quỹ và chọn loại (tiền mặt / ngân hàng)" },
        { status: 400 }
      );
    }

    const accountId = await FinanceService.createCashAccount(body, session.user.id);
    return NextResponse.json({ success: true, accountId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi tạo sổ quỹ" },
      { status: 500 }
    );
  }
}
