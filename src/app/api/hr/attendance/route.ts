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
    if (!capabilities["attendance.read"]?.isEnabled && !capabilities["employee.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chấm công" }, { status: 403 });
    }

    const attendance = await FinanceService.listAttendanceSummary();
    return NextResponse.json({ attendance });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải dữ liệu chấm công", details: err.message },
      { status: 500 }
    );
  }
}
