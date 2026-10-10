import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (
      !isSuperAdmin &&
      !capabilities["attendance.read"]?.isEnabled &&
      !capabilities["employee.read"]?.isEnabled &&
      !capabilities["salary.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem số dư phép nhân viên" }, { status: 403 });
    }

    const balances = await HrmService.listEmployeeLeaveBalances();
    return NextResponse.json({ success: true, data: balances });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải số dư phép nhân viên" },
      { status: 500 }
    );
  }
}
