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
    if (!capabilities["production_order.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem biên bản KCS" }, { status: 403 });
    }

    const records = await SignagePhase2Service.listFactoryQcRecords({ projectId: id });
    return NextResponse.json({ records });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải biên bản KCS xưởng", details: err.message }, { status: 500 });
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
    if (!capabilities["production_order.qc"]?.isEnabled && !capabilities["production_order.update"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền lập biên bản KCS (yêu cầu quyền 'production_order.qc' hoặc 'project.update')" }, { status: 403 });
    }

    const body = await req.json();
    const record = await SignagePhase2Service.createFactoryQcRecord(
      { ...body, projectId: id },
      session.user.id
    );

    return NextResponse.json({ record }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tạo biên bản KCS kiểm thử", details: err.message }, { status: 500 });
  }
}
