import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["attendance.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem ma trận chấm công" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year")) || now.getFullYear();
    const month = Number(searchParams.get("month")) || (now.getMonth() + 1);
    const departmentId = searchParams.get("departmentId") || undefined;

    const data = await HrmService.getMonthlyAttendanceMatrix(year, month, departmentId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải ma trận chấm công tháng", details: err.message },
      { status: 500 }
    );
  }
}
