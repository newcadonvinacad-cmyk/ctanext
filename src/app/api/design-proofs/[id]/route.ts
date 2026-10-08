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

    const list = await SignagePhase2Service.listDesignProofs();
    const proof = list.find((p) => p.id === id);
    if (!proof) {
      return NextResponse.json({ error: "Không tìm thấy bản vẽ Market" }, { status: 404 });
    }

    return NextResponse.json({ proof });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải bản vẽ Market", details: err.message }, { status: 500 });
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
    const proof = await SignagePhase2Service.updateDesignProof(id, body, session.user.id);
    return NextResponse.json({ proof });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi cập nhật bản vẽ Market", details: err.message }, { status: 500 });
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

    await SignagePhase2Service.deleteDesignProof(id, session.user.id);
    return NextResponse.json({ success: true, message: "Đã xóa bản vẽ Market thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi xóa bản vẽ Market", details: err.message }, { status: 500 });
  }
}
