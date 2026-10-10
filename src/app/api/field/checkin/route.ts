import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService, getDbPool } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["field_event.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền chấm công GPS hiện trường" }, { status: 403 });
    }

    const body = await req.json();
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: "Tọa độ GPS không hợp lệ (latitude: -90..90, longitude: -180..180)" },
        { status: 400 }
      );
    }

    // FIELD-02: Ràng buộc actor với hồ sơ nhân viên thật, chống giả mạo
    const pool = getDbPool();
    const empRes = await pool.query(
      `SELECT e.id FROM erp.employees e
       JOIN erp.memberships m ON m.id = e.membership_id
       WHERE m.user_id = $1 LIMIT 1`,
      [session.user.id]
    );

    if (empRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên trong hệ thống" },
        { status: 400 }
      );
    }

    const actorEmployeeId = empRes.rows[0].id;
    let targetEmployeeId = actorEmployeeId;

    if (body.employeeId && body.employeeId !== actorEmployeeId) {
      if (!capabilities["attendance.update"]?.isEnabled && !capabilities["employee.update"]?.isEnabled) {
        return NextResponse.json(
          { error: "Bạn không có quyền chấm công thay cho nhân viên khác" },
          { status: 403 }
        );
      }
      targetEmployeeId = body.employeeId;
    }

    const result = await ProjectService.recordFieldEvent(
      {
        type: (body.type || body.eventType || "check_in") as "check_in" | "check_out",
        latitude: lat,
        longitude: lon,
        accuracyM: Number(body.accuracyM || body.accuracy) || 5,
        employeeId: targetEmployeeId,
        projectId: body.projectId || undefined,
        taskId: body.taskId || undefined,
      },
      session.user.id
    );

    return NextResponse.json({ success: true, event: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi ghi nhận điểm danh GPS", details: err.message },
      { status: 500 }
    );
  }
}
