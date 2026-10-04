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

    // Nếu đổi trạng thái sang đóng / hủy -> Kiểm tra quyền project.close hoặc project.update
    if (body.status === "completed" || body.status === "cancelled") {
      if (!capabilities["project.close"]?.isEnabled && !capabilities["project.update"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền đóng/hủy dự án" }, { status: 403 });
      }
      await ProjectService.updateProjectStatus(id, body.status as ProjectStatus, session.user.id);
    } else if (body.status) {
      if (!capabilities["project.update"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền cập nhật trạng thái dự án" }, { status: 403 });
      }
      await ProjectService.updateProjectStatus(id, body.status as ProjectStatus, session.user.id);
    }

    // Cập nhật thông tin chi tiết dự án nếu có
    if (
      body.name !== undefined ||
      body.address !== undefined ||
      body.customerId !== undefined ||
      body.startDate !== undefined ||
      body.dueDate !== undefined ||
      body.managerMembershipId !== undefined
    ) {
      if (!capabilities["project.update"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền cập nhật thông tin dự án" }, { status: 403 });
      }
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
