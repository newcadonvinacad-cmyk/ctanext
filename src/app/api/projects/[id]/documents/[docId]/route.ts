import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xóa hồ sơ tài liệu dự án" }, { status: 403 });
    }

    await ProjectService.deleteProjectDocument(id, docId);
    return NextResponse.json({ success: true, message: "Đã xóa tài liệu dự án thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi xóa tài liệu dự án" }, { status: 500 });
  }
}
