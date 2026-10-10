import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
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
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (
      !isSuperAdmin &&
      !capabilities["attendance.read"]?.isEnabled &&
      !capabilities["attendance.update"]?.isEnabled &&
      !capabilities["employee.read"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem cấu hình ngày lễ" }, { status: 403 });
    }

    const holidays = await HrmService.listHolidayConfigs();
    return NextResponse.json({ success: true, data: holidays });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải danh sách ngày lễ" },
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
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["attendance.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền cấu hình ngày lễ" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc (mã, tên ngày lễ, ngày bắt đầu, ngày kết thúc)" },
        { status: 400 }
      );
    }
    const result = await HrmService.upsertHolidayConfig(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi lưu cấu hình ngày lễ" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    if (!isSuperAdmin && !capabilities["attendance.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xóa ngày lễ" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ngày lễ" }, { status: 400 });
    }
    const success = await HrmService.deleteHolidayConfig(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xóa ngày lễ" },
      { status: 500 }
    );
  }
}
