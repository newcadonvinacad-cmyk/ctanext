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
      !capabilities["salary.read"]?.isEnabled &&
      !capabilities["employee.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem chính sách nghỉ phép" }, { status: 403 });
    }

    const policy = await HrmService.getLeavePolicy();
    return NextResponse.json({ success: true, data: policy });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải chính sách nghỉ phép" },
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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["salary.update"]?.isEnabled && !capabilities["attendance.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật chính sách nghỉ phép" }, { status: 403 });
    }

    const body = await req.json();
    const result = await HrmService.updateLeavePolicy(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi cập nhật chính sách nghỉ phép" },
      { status: 500 }
    );
  }
}
