import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;
    const { capabilities, roles, membershipStatus } = await AuthorizationService.getUserCapabilities(session.user.id, orgId);
    if (membershipStatus !== "active") {
      return NextResponse.json({ error: "Tài khoản thành viên không hoạt động" }, { status: 403 });
    }

    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["fleet.read"]?.isEnabled && !capabilities["trip.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem danh sách xe" }, { status: 403 });
    }

    const vehicles = await ProjectService.listVehicles();
    return NextResponse.json({ vehicles });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách xe", details: err.message },
      { status: 500 }
    );
  }
}
