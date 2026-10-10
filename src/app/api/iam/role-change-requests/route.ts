import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { IamService } from "@/services/iam.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["role.read"]?.isEnabled && !capabilities["role.manage"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem yêu cầu đổi quyền" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId") || undefined;
    const requests = await IamService.listRoleChangeRequests(roleId);
    return NextResponse.json({ requests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tải yêu cầu" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["role.update"]?.isEnabled && !capabilities["role.manage"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền đề xuất đổi quyền" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.roleId || !body.changeKind || !body.proposedChange) {
      return NextResponse.json({ error: "Thiếu thông tin roleId, changeKind hoặc proposedChange" }, { status: 400 });
    }

    const result = await IamService.createRoleChangeRequest({
      roleId: body.roleId,
      changeKind: body.changeKind,
      proposedChange: body.proposedChange,
      requestedBy: session.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tạo yêu cầu" }, { status: 500 });
  }
}
