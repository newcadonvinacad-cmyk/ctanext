import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
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
    if (!capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem dự án" }, { status: 403 });
    }

    const documents = await ProjectService.listProjectDocuments(id);
    return NextResponse.json({ documents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tải tài liệu dự án" }, { status: 500 });
  }
}

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
    if (!capabilities["project.update"]?.isEnabled && !capabilities["project.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tải lên hồ sơ dự án" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || !body.fileUrl) {
      return NextResponse.json({ error: "Vui lòng nhập tên tài liệu và đường dẫn tệp" }, { status: 400 });
    }

    const docId = await ProjectService.saveProjectDocument(
      id,
      {
        name: body.name,
        fileUrl: body.fileUrl,
        type: body.type,
        notes: body.notes,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
      },
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({ success: true, docId, message: "Lưu hồ sơ tài liệu dự án thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi lưu tài liệu dự án" }, { status: 500 });
  }
}
