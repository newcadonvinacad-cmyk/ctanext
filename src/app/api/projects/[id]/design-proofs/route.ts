import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";
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
      return NextResponse.json({ error: "Không có quyền xem bản vẽ thiết kế (yêu cầu quyền 'project.read')" }, { status: 403 });
    }

    const proofs = await SignagePhase2Service.listDesignProofs({ projectId: id });
    return NextResponse.json({ proofs });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải danh sách Market", details: err.message }, { status: 500 });
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
    if (!capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tải lên bản vẽ Market (yêu cầu quyền 'project.update')" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !body.fileUrl) {
      return NextResponse.json({ error: "Tiêu đề và đường dẫn ảnh Market là bắt buộc!" }, { status: 400 });
    }

    const proof = await SignagePhase2Service.createDesignProof(
      { ...body, projectId: id },
      session.user.id
    );
    return NextResponse.json({ proof }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải lên bản vẽ Market", details: err.message }, { status: 500 });
  }
}
