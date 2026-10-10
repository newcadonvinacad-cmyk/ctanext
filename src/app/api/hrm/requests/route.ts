import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles, employeeId: userEmpId } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));
    const hasFullRead = isSuperAdmin || capabilities["attendance.read"]?.isEnabled;

    const { searchParams } = new URL(req.url);
    let employeeId = searchParams.get("employeeId") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    // F02: Nếu người dùng không có quyền attendance.read, mặc định chỉ được xem đơn của chính mình (OWN)
    if (!hasFullRead) {
      if (!userEmpId) {
        return NextResponse.json({ success: true, data: [] });
      }
      employeeId = userEmpId;
    }

    const requests = await HrmService.listHrmRequests({
      employeeId,
      type,
      status,
      limit,
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tải danh sách đơn từ" },
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

    const body = await req.json();
    if (!body.type || !body.title || !body.reason || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ loại đơn, tiêu đề, lý do và thời gian áp dụng" },
        { status: 400 }
      );
    }

    const newRequest = await HrmService.createHrmRequest(session.user.id, {
      type: body.type,
      title: body.title,
      reason: body.reason,
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime,
      endTime: body.endTime,
      durationHours: body.durationHours ? Number(body.durationHours) : undefined,
      leaveCategory: body.leaveCategory,
      imageUrl: body.imageUrl,
    });

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi tạo đơn yêu cầu" },
      { status: 500 }
    );
  }
}
