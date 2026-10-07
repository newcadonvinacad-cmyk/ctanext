import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isAssignee = await ProjectService.isUserAssigneeOfTask(id, session.user.id);

    // Kiểm tra quyền Admin hệ thống hoặc Quản lý dự án
    const isSuperAdmin =
      roles?.some((r) =>
        ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CEO"].includes(r.code.toUpperCase())
      ) ||
      (session.user as any).role === "admin" ||
      (session.user as any).role === "owner" ||
      session.user.email?.toLowerCase().includes("admin");

    const pool = getDbPool();
    const pmCheck = await pool.query(
      `SELECT 1 FROM erp.tasks t
       JOIN erp.projects p ON p.id = t.project_id
       LEFT JOIN erp.memberships m ON m.user_id = $1
       WHERE t.id = $2
         AND (
           p.created_by = $1
           OR p.manager_membership_id = m.id
           OR EXISTS (
             SELECT 1 FROM erp.project_members pm
             WHERE pm.project_id = p.id AND (pm.membership_id = m.id OR pm.created_by = $1)
               AND (pm.duty ILIKE '%pm%' OR pm.duty ILIKE '%chỉ huy%' OR pm.duty ILIKE '%quản lý%' OR pm.duty ILIKE '%đội trưởng%' OR pm.duty ILIKE '%tổ trưởng%')
           )
         )
       LIMIT 1`,
      [session.user.id, id]
    );
    const isProjectPM = pmCheck.rows.length > 0;

    const hasUpdatePermission =
      isSuperAdmin ||
      isProjectPM ||
      capabilities["task.update"]?.isEnabled ||
      capabilities["task.complete"]?.isEnabled ||
      capabilities["project.update"]?.isEnabled;

    if (!hasUpdatePermission && !isAssignee) {
      return NextResponse.json({ error: "Không có quyền cập nhật tiến độ công việc" }, { status: 403 });
    }

    const body = await req.json();

    // Cập nhật phân công nhân sự nếu có - HỖ TRỢ CẢ MULTI-ASSIGNEES (assigneeIds) VÀ ĐƠN LẺ (employeeId)
    if (body.assigneeIds !== undefined || body.employeeIds !== undefined || body.employeeId !== undefined) {
      if (
        !isSuperAdmin &&
        !isProjectPM &&
        !capabilities["task.assign"]?.isEnabled &&
        !capabilities["project.assign"]?.isEnabled &&
        !capabilities["project.update"]?.isEnabled
      ) {
        return NextResponse.json({ error: "Không có quyền phân công nhân sự (cần quyền task.assign)" }, { status: 403 });
      }
      if (body.assigneeIds !== undefined || body.employeeIds !== undefined) {
        const empIds: string[] = body.assigneeIds || body.employeeIds || [];
        await ProjectService.setTaskAssignees(id, empIds, session.user.id);
      } else {
        await ProjectService.setTaskAssignee(id, body.employeeId || null, session.user.id);
      }
    }

    // Cập nhật chi tiết đầu việc (tiêu đề, trọng số, hạn chót, thời gian bắt đầu, hiện trường, checklist, category...) nếu có
    if (
      body.title !== undefined ||
      body.weight !== undefined ||
      body.dueAt !== undefined ||
      body.startAt !== undefined ||
      body.isField !== undefined ||
      body.category !== undefined ||
      body.checklist !== undefined ||
      body.safetyChecklist !== undefined ||
      body.photoEvidence !== undefined ||
      body.materialsQuota !== undefined ||
      body.pieceRateType !== undefined ||
      body.pieceRateAmount !== undefined ||
      body.pieceRateUnit !== undefined ||
      body.estimatedHours !== undefined ||
      body.actualHours !== undefined ||
      body.notes !== undefined ||
      body.description !== undefined
    ) {
      if (!isSuperAdmin && !isProjectPM && !capabilities["task.update"]?.isEnabled && !capabilities["project.update"]?.isEnabled && !isAssignee) {
        return NextResponse.json({ error: "Không có quyền chỉnh sửa chi tiết công việc" }, { status: 403 });
      }
      await ProjectService.updateTaskDetails(id, body, session.user.id);
    }

    // Cập nhật tiến độ / trạng thái nếu có (Đồng bộ hai chiều hoàn hảo)
    if (body.progressPercent !== undefined || body.status !== undefined) {
      let status = body.status;
      let progressPercent = body.progressPercent !== undefined ? Number(body.progressPercent) : undefined;

      if (status === "done") {
        progressPercent = 100;
      } else if (status === "awaiting_acceptance") {
        progressPercent = 100;
      } else if (status === "todo") {
        progressPercent = 0;
      } else if (status === "doing" && progressPercent === undefined) {
        progressPercent = 50;
      } else if (progressPercent !== undefined) {
        if (progressPercent >= 100) {
          if (status !== "awaiting_acceptance") {
            status = "done";
          }
          progressPercent = 100;
        } else if (progressPercent <= 0) {
          status = "todo";
          progressPercent = 0;
        } else {
          status = "doing";
        }
      }

      await ProjectService.updateTaskProgress(id, progressPercent ?? 0, status, session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật công việc", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin =
      roles?.some((r) =>
        ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "CEO"].includes(r.code.toUpperCase())
      ) ||
      (session.user as any).role === "admin" ||
      (session.user as any).role === "owner" ||
      session.user.email?.toLowerCase().includes("admin");

    const pool = getDbPool();
    const pmCheck = await pool.query(
      `SELECT 1 FROM erp.tasks t
       JOIN erp.projects p ON p.id = t.project_id
       LEFT JOIN erp.memberships m ON m.user_id = $1
       WHERE t.id = $2
         AND (
           p.created_by = $1
           OR p.manager_membership_id = m.id
           OR EXISTS (
             SELECT 1 FROM erp.project_members pm
             WHERE pm.project_id = p.id AND (pm.membership_id = m.id OR pm.created_by = $1)
               AND (pm.duty ILIKE '%pm%' OR pm.duty ILIKE '%chỉ huy%' OR pm.duty ILIKE '%quản lý%' OR pm.duty ILIKE '%đội trưởng%' OR pm.duty ILIKE '%tổ trưởng%')
           )
         )
       LIMIT 1`,
      [session.user.id, id]
    );
    const isProjectPM = pmCheck.rows.length > 0;

    if (!isSuperAdmin && !isProjectPM && !capabilities["task.update"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xóa công việc" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isStage = searchParams.get("isStage") === "true";

    if (isStage) {
      await ProjectService.deleteStage(id, session.user.id);
    } else {
      await ProjectService.deleteTask(id, session.user.id);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xóa công việc / giai đoạn", details: err.message },
      { status: 500 }
    );
  }
}
