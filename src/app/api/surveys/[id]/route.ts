import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";

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

    const survey = await SignagePhase2Service.getSiteSurveyById(id);
    if (!survey) {
      return NextResponse.json({ error: "Không tìm thấy phiếu khảo sát" }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải phiếu khảo sát", details: err.message }, { status: 500 });
  }
}

export async function PUT(
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
    const survey = await SignagePhase2Service.updateSiteSurvey(id, body, session.user.id);
    return NextResponse.json({ survey });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi cập nhật phiếu khảo sát", details: err.message }, { status: 500 });
  }
}

export async function DELETE(
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

    await SignagePhase2Service.deleteSiteSurvey(id, session.user.id);
    return NextResponse.json({ success: true, message: "Đã xóa phiếu khảo sát thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi xóa phiếu khảo sát", details: err.message }, { status: 500 });
  }
}
