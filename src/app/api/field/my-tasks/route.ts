import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService, getDbPool } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["task.read"]?.isEnabled && !capabilities["field_event.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem tác nghiệp hiện trường" }, { status: 403 });
    }

    const pool = getDbPool();
    // Tìm employeeId
    const empRes = await pool.query(
      `SELECT e.id, e.name, e.code FROM erp.employees e
       JOIN erp.memberships m ON m.id = e.membership_id
       WHERE m.user_id = $1 LIMIT 1`,
      [session.user.id]
    );

    let employeeId = "";
    let employeeName = "";
    if (empRes.rows.length > 0) {
      employeeId = empRes.rows[0].id;
      employeeName = empRes.rows[0].name;
    } else {
      // FIELD-01: Không mượn danh tính nhân viên mẫu NV-THO
      return NextResponse.json({
        employee: null,
        tasks: [],
        message: "Tài khoản hiện tại chưa được gán hồ sơ nhân viên trong hệ thống",
      });
    }

    // FIELD-01: Chỉ lấy công việc hiện trường có thời gian hẹn hợp lệ (is_field = true & due_at IS NOT NULL)
    const tasks = await ProjectService.getMyTasks(employeeId, { fieldOnly: true });

    return NextResponse.json({
      employee: { id: employeeId, name: employeeName },
      tasks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách việc cần làm", details: err.message },
      { status: 500 }
    );
  }
}
