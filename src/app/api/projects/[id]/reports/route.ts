import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
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
    if (!capabilities["work_report.read"]?.isEnabled && !capabilities["project.read"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền xem nhật ký công trình" }, { status: 403 });
    }

    const reports = await ProjectService.listWorkReportsByProject(id);
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải nhật ký báo cáo hiện trường", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
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
    if (
      !capabilities["work_report.create"]?.isEnabled &&
      !capabilities["task.update"]?.isEnabled &&
      !capabilities["project.update"]?.isEnabled
    ) {
      return NextResponse.json({ error: "Không có quyền tạo nhật ký thi công" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.taskId) {
      return NextResponse.json({ error: "Vui lòng chọn công việc tương ứng" }, { status: 400 });
    }

    const report = await ProjectService.createWorkReport(
      {
        taskId: body.taskId,
        projectId: id,
        workDate: body.workDate,
        notes: body.notes,
        speechText: body.speechText,
        materials: body.materials,
        answers: body.answers,
        completionPercentage: body.completionPercentage,
      },
      session.user.id
    );

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu nhật ký hiện trường", details: err.message },
      { status: 500 }
    );
  }
}
