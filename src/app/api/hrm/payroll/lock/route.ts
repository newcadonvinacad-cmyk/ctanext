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
    if (!capabilities["payroll.approve"]?.isEnabled) {
      return NextResponse.json({ error: "Bạn không có quyền khóa kỳ bảng lương" }, { status: 403 });
    }

    const body = await req.json();
    const year = Number(body.year);
    const month = Number(body.month);
    if (!year || !month) {
      return NextResponse.json({ error: "Năm và tháng là bắt buộc" }, { status: 400 });
    }

    await HrmService.lockAttendancePeriod(year, month, session.user.id);

    return NextResponse.json({ success: true, message: `Đã khóa kỳ lương ${month}/${year}` });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi khóa kỳ lương", details: err.message },
      { status: 400 }
    );
  }
}
