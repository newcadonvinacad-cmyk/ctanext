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
      return NextResponse.json({ error: "Bạn không có quyền xem và nhập dữ liệu GPS" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel GPS để tải lên" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await GpsImportService.previewFile(buffer, file.name, session.user.id, orgId);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi đọc file GPS", details: err.message },
      { status: 500 }
    );
  }
}
