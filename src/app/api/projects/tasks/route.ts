import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const taskCap = capabilities["task.read"];
    if (!taskCap?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem công việc" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const search = searchParams.get("search") || undefined;
    const isFieldParam = searchParams.get("isField");
    const isField = isFieldParam === "true" ? true : isFieldParam === "false" ? false : undefined;

    const tasks = await ProjectService.listAllTasks(
      { projectId, status, employeeId, search, isField },
      { userId: session.user.id, scope: taskCap?.scope }
    );
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách công việc", details: err.message },
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
    if (!body.projectId || !body.title) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp Dự án và Tên công việc" },
        { status: 400 }
      );
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const hasHighPrivilege =
      capabilities["task.create"]?.isEnabled || capabilities["project.update"]?.isEnabled;

    // Kiểm tra quyền ủy quyền: Nếu có parentId (tạo việc nhỏ), người được giao trong việc lớn có thể tự tạo cho mình
    let isAssigneeOfParent = false;
    if (body.parentId) {
      isAssigneeOfParent = await ProjectService.isUserAssigneeOfTask(body.parentId, session.user.id);
    }

    if (!hasHighPrivilege && !isAssigneeOfParent) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo công việc (cần quyền task.create hoặc được phân công trong đầu việc lớn này)" },
        { status: 403 }
      );
    }

    let taskId: string;
    if (body.isStage) {
      taskId = await ProjectService.createTopLevelStage(
        body.projectId,
        body.title,
        session.user.id,
        {
          weight: body.weight !== undefined ? Number(body.weight) : undefined,
          dueAt: body.dueAt,
          startAt: body.startAt,
          isField: body.isField !== undefined ? Boolean(body.isField) : undefined,
          assigneeIds: body.assigneeIds,
        }
      );
    } else {
      taskId = await ProjectService.createTask(body, session.user.id);
    }

    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tạo công việc mới", details: err.message },
      { status: 500 }
    );
  }
}
