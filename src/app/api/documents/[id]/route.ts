import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { getCachedOrgId } from "@/lib/db";
import { DocumentService } from "@/services/document.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    // F16 / Probe 8: Xóa tài liệu chung yêu cầu quyền 'document.manage'
    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["document.manage"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xóa tài liệu (yêu cầu quyền 'document.manage')" }, { status: 403 });
    }

    const { id } = await params;
    const orgId = await getCachedOrgId("SIGNAGE");

    await DocumentService.deleteDocument({ orgId, documentId: id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xóa tệp", details: err.message },
      { status: 500 }
    );
  }
}
