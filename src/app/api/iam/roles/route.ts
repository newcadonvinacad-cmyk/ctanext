import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { IamService } from "@/services/iam.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles: userRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = userRoles.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CEO"].includes(r.code.toUpperCase())
    );

    if (!isSuperAdmin && !capabilities["role.read"]?.isEnabled && !capabilities["role.manage"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách vai trò" }, { status: 403 });
    }

    const roles = await IamService.listRoles();
    return NextResponse.json({ roles });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách vai trò", details: err.message },
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

    const { capabilities, roles: userRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = userRoles.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CEO"].includes(r.code.toUpperCase())
    );

    const canCreateRole =
      isSuperAdmin ||
      capabilities["role.manage"]?.isEnabled ||
      capabilities["role.create"]?.isEnabled;

    if (!canCreateRole) {
      return NextResponse.json({ error: "Không có quyền tạo vai trò mới" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Mã vai trò và Tên vai trò là bắt buộc" },
        { status: 400 }
      );
    }

    const result = await IamService.createRole({
      code: body.code,
      name: body.name,
      description: body.description,
      cloneFromRoleId: body.cloneFromRoleId,
      createdBy: session.user.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo vai trò mới", details: err.message },
      { status: 500 }
    );
  }
}
