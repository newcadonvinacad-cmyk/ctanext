import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { getCachedOrgId } from "@/lib/db";
import { DocumentService } from "@/services/document.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["document.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem kho tài liệu (yêu cầu quyền 'document.read')" }, { status: 403 });
    }

    const orgId = await getCachedOrgId("SIGNAGE");
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId") || "all";
    const search = searchParams.get("search") || "";
    const fileType = searchParams.get("fileType") || "all";
    const sortBy = searchParams.get("sortBy") || "date_desc";

    const [foldersData, contentData] = await Promise.all([
      DocumentService.listAllFolders(orgId),
      DocumentService.listDocuments({
        orgId,
        folderId,
        search,
        fileType,
        sortBy,
      }),
    ]);

    return NextResponse.json({
      success: true,
      systemFolders: foldersData.systemFolders,
      userFolders: foldersData.userFolders,
      subFolders: contentData.subFolders,
      files: contentData.files,
      currentFolderInfo: contentData.currentFolderInfo,
    });
  } catch (err: any) {
    console.error("[API DOCUMENTS GET ERROR]:", err);
    return NextResponse.json(
      { error: "Lỗi tải kho tài liệu", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["document.manage"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tải lên tài liệu (yêu cầu quyền 'document.manage')" }, { status: 403 });
    }

    const orgId = await getCachedOrgId("SIGNAGE");
    const body = await req.json();

    if (!body.name || !body.fileUrl) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp đầy đủ Tên tệp và Đường dẫn tệp" },
        { status: 400 }
      );
    }

    const document = await DocumentService.createDocument({
      orgId,
      folderId: body.folderId || null,
      name: body.name,
      fileUrl: body.fileUrl,
      fileSize: body.fileSize || 0,
      mimeType: body.mimeType || "application/octet-stream",
      extension: body.extension || "",
      sourceRefCode: body.sourceRefCode,
      metadata: body.metadata || {},
      userId: session.user.id,
      userName: session.user.name,
    });

    return NextResponse.json({ success: true, document });
  } catch (err: any) {
    console.error("[API DOCUMENTS POST ERROR]:", err);
    return NextResponse.json(
      { error: "Lỗi lưu thông tin tệp", details: err.message },
      { status: 500 }
    );
  }
}
