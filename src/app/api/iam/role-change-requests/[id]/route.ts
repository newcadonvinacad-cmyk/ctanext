import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { IamService } from "@/services/iam.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });

    const { id } = await params;
    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const body = await req.json();
    const action = body.action; // 'submit', 'review', 'apply'

    if (action === "submit") {
      await IamService.submitRoleChangeRequest(id, session.user.id);
      return NextResponse.json({ success: true, message: "Đã gửi duyệt yêu cầu" });
    }

    if (action === "review") {
      if (!capabilities["role.publish"]?.isEnabled && !capabilities["role.manage"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền phê duyệt thay đổi quyền" }, { status: 403 });
      }
      await IamService.reviewRoleChangeRequest({
        requestId: id,
        reviewedBy: session.user.id,
        action: body.decision === "approve" ? "approve" : "reject",
        reviewNote: body.reviewNote,
      });
      return NextResponse.json({ success: true, message: "Đã xử lý phê duyệt" });
    }

    if (action === "apply") {
      if (!capabilities["role.publish"]?.isEnabled && !capabilities["role.manage"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền áp dụng thay đổi quyền" }, { status: 403 });
      }
      await IamService.applyRoleChangeRequest(id, session.user.id);
      return NextResponse.json({ success: true, message: "Đã áp dụng thay đổi quyền thành công" });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi xử lý yêu cầu" }, { status: 500 });
  }
}
