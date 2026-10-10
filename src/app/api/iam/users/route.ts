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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    if (
      !isSuperAdmin &&
      !capabilities["membership.read"]?.isEnabled &&
      !capabilities["role.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem danh sách thành viên" }, { status: 403 });
    }

    const users = await IamService.listUsers();
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách người dùng", details: err.message },
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

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase())
    );

    const canCreateUser =
      isSuperAdmin ||
      capabilities["membership.invite"]?.isEnabled ||
      capabilities["membership.create"]?.isEnabled ||
      capabilities["role.manage"]?.isEnabled;

    if (!canCreateUser) {
      return NextResponse.json({ error: "Không có quyền tạo thành viên mới" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: "Email và Họ tên là bắt buộc" },
        { status: 400 }
      );
    }

    // F04: Nếu có gán vai trò ban đầu, bắt buộc người gọi phải có quyền membership.assign_role hoặc role.manage
    if (body.roleId) {
      const canAssign =
        isSuperAdmin ||
        capabilities["membership.assign_role"]?.isEnabled ||
        capabilities["role.manage"]?.isEnabled;
      if (!canAssign) {
        return NextResponse.json(
          { error: "Không có quyền gán vai trò khi tạo thành viên (cần quyền 'membership.assign_role' hoặc 'role.manage')" },
          { status: 403 }
        );
      }
    }

    const result = await IamService.createUser({
      email: body.email,
      name: body.name,
      password: body.password,
      roleId: body.roleId,
      reason: body.reason,
      employeeId: body.employeeId,
      employeeCode: body.employeeCode,
      phone: body.phone,
      departmentId: body.departmentId,
      createEmployee: body.createEmployee !== undefined ? body.createEmployee : true,
      assignedBy: session.user.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo thành viên", details: err.message },
      { status: 500 }
    );
  }
}
