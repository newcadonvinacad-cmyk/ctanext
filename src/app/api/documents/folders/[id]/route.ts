import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { getCachedOrgId } from "@/lib/db";
import { DocumentService } from "@/services/document.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["document.manage"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền sửa thư mục (yêu cầu quyền 'document.manage')" }, { status: 403 });
    }

    const { id } = await params;
    const orgId = await getCachedOrgId("SIGNAGE");
    const body = await req.json();

    const folder = await DocumentService.updateFolder({
      orgId,
      folderId: id,
      name: body.name,
      color: body.color,
      icon: body.icon,
      description: body.description,
    });

    return NextResponse.json({ success: true, folder });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật thư mục", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["document.manage"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xóa thư mục (yêu cầu quyền 'document.manage')" }, { status: 403 });
    }

    const { id } = await params;
    const orgId = await getCachedOrgId("SIGNAGE");

    await DocumentService.deleteFolder({ orgId, folderId: id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xóa thư mục", details: err.message },
      { status: 500 }
    );
  }
}
