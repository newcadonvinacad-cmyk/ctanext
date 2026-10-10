import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["employee.update"]?.isEnabled && !capabilities["payroll.approve"]?.isEnabled) {
      return NextResponse.json({ error: "Bạn không có quyền thẩm định chấm công" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.hrDecisionNote || !body.hrDecisionNote.trim()) {
      return NextResponse.json({ error: "Ghi chú thẩm định của HR là bắt buộc" }, { status: 400 });
    }

    await HrmService.reviewAttendanceEntry(
      id,
      {
        approvedOtMinutes: body.approvedOtMinutes !== undefined ? Number(body.approvedOtMinutes) : null,
        explanationNote: body.explanationNote,
        hrDecisionNote: body.hrDecisionNote.trim(),
        clearExplanationRequired: Boolean(body.clearExplanationRequired),
      },
      session.user.id
    );

    return NextResponse.json({ success: true, message: "Đã thẩm định phiên chấm công thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi thẩm định chấm công", details: err.message },
      { status: 400 }
    );
  }
}
