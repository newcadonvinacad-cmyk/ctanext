import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { IamService } from "@/services/iam.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles: userRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = userRoles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    if (!isSuperAdmin && !capabilities["role.read"]?.isEnabled && !capabilities["role.manage"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem ma trận quyền vai trò" }, { status: 403 });
    }

    const grants = await IamService.getRoleGrants(roleId);
    return NextResponse.json({ grants });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải ma trận quyền vai trò", details: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roleId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles: userRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = userRoles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const canUpdateGrants =
      isSuperAdmin ||
      capabilities["role.manage"]?.isEnabled ||
      capabilities["role.update"]?.isEnabled;

    if (!canUpdateGrants) {
      return NextResponse.json({ error: "Không có quyền cập nhật ma trận quyền vai trò" }, { status: 403 });
    }

    const body = await req.json();
    if (!Array.isArray(body.grants)) {
      return NextResponse.json(
        { error: "Danh sách grants không hợp lệ" },
        { status: 400 }
      );
    }

    await IamService.updateRoleGrants({
      roleId,
      grants: body.grants,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật ma trận quyền vai trò", details: err.message },
      { status: 500 }
    );
  }
}
