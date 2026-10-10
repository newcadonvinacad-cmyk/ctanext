import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { GpsImportService } from "@/services/gps-import.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Không tìm thấy công ty/tổ chức" }, { status: 403 });
    }

    const { capabilities, roles, membershipStatus } = await AuthorizationService.getUserCapabilities(session.user.id, orgId);
    if (membershipStatus !== "active") {
      return NextResponse.json({ error: "Tài khoản thành viên không hoạt động" }, { status: 403 });
    }

    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["fleet.read"]?.isEnabled) {
      return NextResponse.json({ error: "Bạn không có quyền xem lịch sử nhập GPS" }, { status: 403 });
    }

    const batches = GpsImportService.getBatches(orgId);
    const auditLogs = GpsImportService.getAuditLogs(orgId);

    return NextResponse.json({
      success: true,
      batches,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải lịch sử đợt nhập", details: err.message },
      { status: 500 }
    );
  }
}
