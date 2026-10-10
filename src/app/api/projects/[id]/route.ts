import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService, ProjectStatus } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function GET(
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
    const readCap = capabilities["project.read"];
    if (!readCap?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem chi tiết dự án" }, { status: 403 });
    }

    const project = await ProjectService.getProjectById(id, {
      userId: session.user.id,
      scope: readCap.scope,
    });
    if (!project) {
      return NextResponse.json({ error: "Không tìm thấy dự án hoặc không có quyền truy cập" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải thông tin dự án", details: err.message },
      { status: 500 }
    );
  }
}

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
    const body = await req.json();

    const isClosing = body.status === "completed" || body.status === "cancelled";
    const hasCloseCap = Boolean(capabilities["project.close"]?.isEnabled);
    const hasUpdateCap = Boolean(capabilities["project.update"]?.isEnabled);
    const hasAssignCap = Boolean(capabilities["project.assign"]?.isEnabled || hasUpdateCap);

    // F13: Tách rõ quyền đóng dự án, cập nhật thông tin và phân công quản lý
    if (isClosing) {
      if (!hasCloseCap && !hasUpdateCap) {
        return NextResponse.json({ error: "Không có quyền đóng/hủy dự án (yêu cầu quyền 'project.close')" }, { status: 403 });
      }
    } else if (body.status) {
      if (!hasUpdateCap) {
        return NextResponse.json({ error: "Không có quyền cập nhật trạng thái dự án" }, { status: 403 });
      }
    }

    if (body.managerMembershipId !== undefined && !hasAssignCap) {
      return NextResponse.json({ error: "Không có quyền phân công quản lý dự án (yêu cầu quyền 'project.assign')" }, { status: 403 });
    }

    const isInfoUpdate =
      body.name !== undefined ||
      body.address !== undefined ||
      body.customerId !== undefined ||
      body.startDate !== undefined ||
      body.dueDate !== undefined;

    if (isInfoUpdate && !hasUpdateCap) {
      return NextResponse.json({ error: "Không có quyền cập nhật thông tin dự án" }, { status: 403 });
    }

    // F06: Kiểm tra phạm vi (scope) đối với dự án đích trước khi cho phép ghi
    const targetScope = isClosing
      ? (capabilities["project.close"]?.scope || capabilities["project.update"]?.scope)
      : capabilities["project.update"]?.scope;

    const existingProject = await ProjectService.getProjectById(id, {
      userId: session.user.id,
      scope: targetScope,
    });
    if (!existingProject) {
      return NextResponse.json(
        { error: "Không tìm thấy dự án hoặc không có quyền cập nhật trong phạm vi được phân công" },
        { status: 403 }
      );
    }

    if (body.status) {
      await ProjectService.updateProjectStatus(id, body.status as ProjectStatus, session.user.id);
    }

    if (
      isInfoUpdate ||
      body.managerMembershipId !== undefined
    ) {
      await ProjectService.updateProjectDetails(id, body, session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi cập nhật dự án", details: err.message },
      { status: 500 }
    );
  }
}
