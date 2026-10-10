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
      return NextResponse.json({ error: "Không có quyền xem danh mục ca làm việc" }, { status: 403 });
    }

    const shifts = await HrmService.listWorkShifts();
    return NextResponse.json({ success: true, data: shifts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải ca làm việc" },
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
      return NextResponse.json({ error: "Không có quyền cấu hình ca làm việc" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.code || !body.name || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc (mã, tên, giờ bắt đầu, giờ kết thúc)" },
        { status: 400 }
      );
    }
    const result = await HrmService.upsertWorkShift(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi lưu ca làm việc" },
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
      return NextResponse.json({ error: "Không có quyền xóa ca làm việc" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID ca làm việc" }, { status: 400 });
    }
    const success = await HrmService.deleteWorkShift(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xóa ca làm việc" },
      { status: 500 }
    );
  }
}
