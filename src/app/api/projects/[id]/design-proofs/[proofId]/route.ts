import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; proofId: string }> }
) {
  try {
    const { proofId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    await SignagePhase2Service.updateDesignProofStatus(
      proofId,
      {
        status: body.status,
        feedback: body.feedback,
        approvedByName: body.approvedByName,
      },
      session.user.id
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi cập nhật trạng thái Market", details: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; proofId: string }> }
) {
  try {
    const { proofId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    const proof = await SignagePhase2Service.updateDesignProof(proofId, body, session.user.id);
    return NextResponse.json({ proof });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi cập nhật bản vẽ Market", details: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; proofId: string }> }
) {
  try {
    const { proofId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    await SignagePhase2Service.deleteDesignProof(proofId, session.user.id);
    return NextResponse.json({ success: true, message: "Đã xóa bản vẽ Market thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi xóa bản vẽ Market", details: err.message }, { status: 500 });
  }
}
