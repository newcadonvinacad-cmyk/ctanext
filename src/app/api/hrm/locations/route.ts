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
      !capabilities["employee.read"]?.isEnabled &&
      !capabilities["field_event.create"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền xem địa điểm chấm công" }, { status: 403 });
    }

    const locations = await HrmService.listWorkLocations(false);
    return NextResponse.json({ success: true, data: locations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải danh sách địa điểm GPS" },
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
      return NextResponse.json({ error: "Không có quyền cấu hình địa điểm chấm công" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tên điểm làm việc, vĩ độ (latitude) và kinh độ (longitude)" },
        { status: 400 }
      );
    }

    const location = await HrmService.upsertWorkLocation({
      id: body.id,
      name: body.name,
      address: body.address,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      radiusMeters: body.radiusMeters ? Number(body.radiusMeters) : 150,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      isDefault: Boolean(body.isDefault),
      note: body.note,
    });

    return NextResponse.json({ success: true, data: location });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi lưu cấu hình địa điểm GPS" },
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
      return NextResponse.json({ error: "Không có quyền xóa địa điểm chấm công" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID địa điểm" }, { status: 400 });
    }

    const success = await HrmService.deleteWorkLocation(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xóa địa điểm" },
      { status: 500 }
    );
  }
}
