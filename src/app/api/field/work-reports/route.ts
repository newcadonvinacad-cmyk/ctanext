import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canReport =
      capabilities["work_report.create"]?.isEnabled ||
      capabilities["task.update"]?.isEnabled ||
      capabilities["project.update"]?.isEnabled ||
      (session.user as any).role === "admin";

    if (!canReport) {
      return NextResponse.json(
        { error: "Không có quyền tạo báo cáo công việc (cần quyền work_report.create)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.taskId) {
      return NextResponse.json({ error: "Vui lòng chỉ định taskId của nhiệm vụ" }, { status: 400 });
    }

    const report = await ProjectService.createWorkReport(
      {
        taskId: body.taskId,
        projectId: body.projectId,
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
      { error: "Lỗi lưu báo cáo công việc", details: err.message },
      { status: 500 }
    );
  }
}
