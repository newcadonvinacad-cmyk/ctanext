import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase3Service } from "@/services/signage-phase3.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const signageType = searchParams.get("signageType") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const boms = await SignagePhase3Service.listProjectBoms({
      projectId,
      signageType,
      status,
      search,
    });

    return NextResponse.json({ boms });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách BOM", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.title) {
      return NextResponse.json(
        { error: "Tiêu đề bảng bóc tách BOM là bắt buộc!" },
        { status: 400 }
      );
    }

    const bom = await SignagePhase3Service.createProjectBom(body, session.user.id);
    return NextResponse.json({ bom }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu bảng bóc tách BOM", details: err.message },
      { status: 500 }
    );
  }
}
