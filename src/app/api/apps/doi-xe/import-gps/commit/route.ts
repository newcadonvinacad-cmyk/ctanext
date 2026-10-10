import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { GpsImportService } from "@/services/gps-import.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
    if (!isSuperAdmin && (!capabilities["fleet.read"]?.isEnabled || !capabilities["fleet.import"]?.isEnabled)) {
      return NextResponse.json({ error: "Bạn không có quyền xác nhận nhập dữ liệu GPS" }, { status: 403 });
    }

    const body = await req.json();
    const batchId = body.batchId || body.preview?.batchId;

    if (!batchId) {
      return NextResponse.json({ error: "Thiếu mã đợt xem trước hợp lệ (batchId)" }, { status: 400 });
    }

    const batch = await GpsImportService.commitImport(batchId, session.user.id, orgId);

    return NextResponse.json({
      success: true,
      batch,
    });
  } catch (err: any) {
    const msg = err.message || "Lỗi lưu dữ liệu GPS";
    const status = msg.includes("không có quyền") || msg.includes("không thuộc tổ chức") ? 403 : 500;
    return NextResponse.json(
      { error: msg, details: err.message },
      { status }
    );
  }
}
