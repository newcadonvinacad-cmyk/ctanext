import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

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

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isAssignee = await ProjectService.isUserAssigneeOfTask(id, session.user.id);
    const hasAdminPermission =
      capabilities["task.update"]?.isEnabled ||
      capabilities["task.complete"]?.isEnabled ||
      capabilities["project.update"]?.isEnabled;

    if (!hasAdminPermission && !isAssignee) {
      return NextResponse.json({ error: "Không có quyền cập nhật tiến độ công việc" }, { status: 403 });
    }

    const body = await req.json();

    // Cập nhật phân công nhân sự nếu có - HỖ TRỢ CẢ MULTI-ASSIGNEES (assigneeIds) VÀ ĐƠN LẺ (employeeId)
    if (body.assigneeIds !== undefined || body.employeeIds !== undefined || body.employeeId !== undefined) {
      if (
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
      body.notes !== undefined
    ) {
      if (!capabilities["task.update"]?.isEnabled && !capabilities["project.update"]?.isEnabled && !isAssignee) {
        return NextResponse.json({ error: "Không có quyền chỉnh sửa chi tiết công việc" }, { status: 403 });
      }
      await ProjectService.updateTaskDetails(id, body, session.user.id);
    }

    // Cập nhật tiến độ / trạng thái nếu có
    if (body.progressPercent !== undefined || body.status !== undefined) {
      let status = body.status;
      let progressPercent = body.progressPercent !== undefined ? Number(body.progressPercent) : undefined;

      if (status && progressPercent === undefined) {
        if (status === "done" || status === "awaiting_acceptance") {
          progressPercent = 100;
        } else if (status === "todo") {
          progressPercent = 0;
        } else if (status === "doing") {
          progressPercent = 50;
        }
      } else if (progressPercent !== undefined && !status) {
        status = progressPercent === 100 ? "done" : progressPercent > 0 ? "doing" : "todo";
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

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["task.update"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xóa công việc" }, { status: 403 });
    }

    await ProjectService.deleteTask(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi xóa công việc", details: err.message },
      { status: 500 }
    );
  }
}
