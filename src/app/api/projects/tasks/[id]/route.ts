import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    if (!capabilities["task.update"]?.isEnabled && !capabilities["task.complete"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cập nhật tiến độ công việc" }, { status: 403 });
    }

    const body = await req.json();
    const progressPercent = Number(body.progressPercent) || 0;
    const status = body.status || (progressPercent === 100 ? "done" : progressPercent > 0 ? "doing" : "todo");

    await ProjectService.updateTaskProgress(id, progressPercent, status, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật tiến độ công việc", details: err.message },
      { status: 500 }
    );
  }
}
