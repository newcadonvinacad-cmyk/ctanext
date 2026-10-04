import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; accId: string }> }
) {
  try {
    const { id, accId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const body = await req.json();
    const status = body.status;

    if (status === "approved") {
      if (!capabilities["acceptance.approve"]?.isEnabled && (session.user as any).role !== "admin") {
        return NextResponse.json(
          { error: "Không có quyền phê duyệt biên bản nghiệm thu (cần quyền acceptance.approve)" },
          { status: 403 }
        );
      }
    } else {
      if (
        !capabilities["acceptance.update"]?.isEnabled &&
        !capabilities["acceptance.approve"]?.isEnabled &&
        !capabilities["project.update"]?.isEnabled
      ) {
        return NextResponse.json({ error: "Không có quyền cập nhật biên bản nghiệm thu" }, { status: 403 });
      }
    }

    await ProjectService.updateAcceptanceStatus(accId, status, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật trạng thái nghiệm thu", details: err.message },
      { status: 500 }
    );
  }
}
