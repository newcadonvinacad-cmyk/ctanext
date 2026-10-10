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
    const canExport = capabilities["project.export"]?.isEnabled || capabilities["project.read"]?.isEnabled;
    if (!canExport) {
      return NextResponse.json({ error: "Không có quyền xem và xuất tiến độ dự án" }, { status: 403 });
    }

    const exportScope = (capabilities["project.export"]?.isEnabled ? capabilities["project.export"]?.scope : capabilities["project.read"]?.scope) || "OWN";

    const { searchParams } = new URL(req.url);
    const periodKey = searchParams.get("periodKey") || undefined;
    const group = (searchParams.get("group") || "ALL") as "CEN" | "QCNT" | "ALL";
    const province = searchParams.get("province") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const projectIdsStr = searchParams.get("projectIds") || undefined;
    const projectIds = projectIdsStr ? projectIdsStr.split(",").filter(Boolean) : undefined;
    const includeSummary = searchParams.get("includeSummary") !== "false";
    const includeDetail = searchParams.get("includeDetail") !== "false";
    const includeSurvey = searchParams.get("includeSurvey") !== "false";

    const buffer = await ProjectService.exportProjectScheduleExcel({
      periodKey,
      group,
      province,
      fromDate,
      toDate,
      projectIds,
      includeSummary,
      includeDetail,
      includeSurvey,
      actorUserId: session.user.id,
      scope: exportScope,
    });

    const filename = `Tien_Do_Thi_Cong_${group}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi xuất tiến độ dự án" }, { status: 500 });
  }
}
