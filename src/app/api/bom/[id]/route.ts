import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase3Service } from "@/services/signage-phase3.service";

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

    const bom = await SignagePhase3Service.getProjectBomById(id);
    if (!bom) {
      return NextResponse.json({ error: "Không tìm thấy BOM" }, { status: 404 });
    }

    return NextResponse.json({ bom });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải chi tiết BOM", details: err.message },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();
    if (body.action === "apply_to_project" && body.projectId) {
      await SignagePhase3Service.applyBomToProject(id, body.projectId, session.user.id);
      return NextResponse.json({ success: true, message: "Đã áp dụng BOM vào dự án thành công" });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật BOM", details: err.message },
      { status: 500 }
    );
  }
}
