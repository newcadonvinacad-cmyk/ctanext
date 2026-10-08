import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { getCachedOrgId } from "@/lib/db";
import { DocumentService } from "@/services/document.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực đăng nhập" }, { status: 401 });
    }

    const orgId = await getCachedOrgId("SIGNAGE");
    const folders = await DocumentService.listAllFolders(orgId);
    return NextResponse.json({ success: true, ...folders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách thư mục", details: err.message },
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

    const orgId = await getCachedOrgId("SIGNAGE");
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên thư mục" },
        { status: 400 }
      );
    }

    const folder = await DocumentService.createFolder({
      orgId,
      name: body.name,
      parentId: body.parentId || null,
      color: body.color || "#0284c7",
      icon: body.icon || "folder",
      description: body.description || "",
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, folder });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo thư mục", details: err.message },
      { status: 500 }
    );
  }
}
