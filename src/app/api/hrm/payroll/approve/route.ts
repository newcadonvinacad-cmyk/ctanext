import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const hasApproveCap = capabilities["payroll.approve"]?.isEnabled || capabilities["payroll.update"]?.isEnabled;
    if (!hasApproveCap) {
      return NextResponse.json(
        { error: "Bạn không có quyền phê duyệt bảng lương (cần quyền payroll.approve)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "Dữ liệu bảng lương không hợp lệ" }, { status: 400 });
    }

    const now = new Date();
    const year = Number(body.year) || now.getFullYear();
    const month = Number(body.month) || (now.getMonth() + 1);

    const result = await HrmService.approvePayroll(year, month, body.lines, session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phê duyệt bảng lương", details: err.message },
      { status: 500 }
    );
  }
}
