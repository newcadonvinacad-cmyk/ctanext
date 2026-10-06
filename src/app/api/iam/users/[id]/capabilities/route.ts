import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    if (session.user.id !== userId) {
      const { capabilities: actorCaps, roles: actorRoles } = await AuthorizationService.getUserCapabilities(session.user.id);
      const isSuperAdmin = actorRoles.some((r) =>
        ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CEO"].includes(r.code.toUpperCase())
      );
      if (!isSuperAdmin && !actorCaps["role.read"]?.isEnabled && !actorCaps["membership.read"]?.isEnabled && !actorCaps["role.manage"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền xem quyền hạn của tài khoản khác" }, { status: 403 });
      }
    }

    const { roles, capabilities, membershipStatus } =
      await AuthorizationService.getUserCapabilities(userId);

    const defaultRoute = AuthorizationService.resolveDefaultRoute(
      roles,
      capabilities
    );

    return NextResponse.json({
      roles,
      capabilities,
      defaultRoute,
      membershipStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải quyền hiệu lực của người dùng", details: err.message },
      { status: 500 }
    );
  }
}
