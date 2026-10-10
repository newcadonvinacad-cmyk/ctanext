import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { IamService } from "@/services/iam.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: membershipId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles: userRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = userRoles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const canAssignRole =
      isSuperAdmin ||
      capabilities["membership.assign_role"]?.isEnabled ||
      capabilities["role.assign"]?.isEnabled ||
      capabilities["role.manage"]?.isEnabled ||
      capabilities["role.update"]?.isEnabled;

    if (!canAssignRole) {
      return NextResponse.json({ error: "Không có quyền gán vai trò người dùng" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.roleId) {
      return NextResponse.json(
        { error: "Vui lòng chọn vai trò cần gán" },
        { status: 400 }
      );
    }

    await IamService.assignUserRole({
      membershipId,
      roleId: body.roleId,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validTo: body.validTo ? new Date(body.validTo) : null,
      reason: body.reason || "Phân công vai trò qua giao diện quản trị M20",
      assignedBy: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi gán vai trò người dùng", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles: userRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = userRoles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const canRevokeRole =
      isSuperAdmin ||
      capabilities["membership.assign_role"]?.isEnabled ||
      capabilities["role.assign"]?.isEnabled ||
      capabilities["role.manage"]?.isEnabled ||
      capabilities["role.update"]?.isEnabled;

    if (!canRevokeRole) {
      return NextResponse.json({ error: "Không có quyền thu hồi vai trò người dùng" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userRoleId = searchParams.get("userRoleId");
    if (!userRoleId) {
      return NextResponse.json(
        { error: "Thiếu userRoleId cần thu hồi" },
        { status: 400 }
      );
    }

    await IamService.revokeUserRole(userRoleId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi thu hồi vai trò", details: err.message },
      { status: 500 }
    );
  }
}
