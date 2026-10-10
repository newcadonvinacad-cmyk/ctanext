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
    if (!capabilities["payment.export"]?.isEnabled || !capabilities["payment.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem hoặc xuất dữ liệu lịch sử thanh toán" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const accountId = searchParams.get("accountId") || undefined;
    const direction = searchParams.get("direction") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const partnerId = searchParams.get("partnerId") || undefined;
    const status = searchParams.get("status") || undefined;
    const format = searchParams.get("format") || "xlsx";

    const filters = {
      fromDate,
      toDate,
      accountId,
      direction,
      projectId,
      partnerId,
      status,
    };

    if (format === "xlsx") {
      const buffer = await FinanceService.exportTransactionHistoryExcel(filters);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="nhat_ky_thu_chi_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    }

    const data = await FinanceService.exportTransactionHistory(filters);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi xuất báo cáo giao dịch" }, { status: 500 });
  }
}
