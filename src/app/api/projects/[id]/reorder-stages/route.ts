import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
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
    if (!capabilities["project.update"]?.isEnabled && !capabilities["task.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền thay đổi thứ tự giai đoạn" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.stageIds || !Array.isArray(body.stageIds)) {
      return NextResponse.json({ error: "Thiếu danh sách mã giai đoạn stageIds" }, { status: 400 });
    }

    await ProjectService.reorderProjectStages(id, body.stageIds, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi thay đổi thứ tự giai đoạn", details: err.message },
      { status: 500 }
    );
  }
}
