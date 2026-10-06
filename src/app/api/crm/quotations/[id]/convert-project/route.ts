import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CrmService } from "@/services/crm.service";
import { AuthorizationService } from "@/services/authorization.service";

export const dynamic = "force-dynamic";

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
    if (!capabilities["project.create"]?.isEnabled && !capabilities["quotation.update"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền khởi tạo dự án từ báo giá" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await CrmService.convertQuotationToProject(
      id,
      {
        projectName: body.projectName,
        address: body.address,
        startDate: body.startDate,
        dueDate: body.dueDate,
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      projectCode: result.projectCode,
      salesOrderId: result.salesOrderId,
      message: `Đã khởi tạo Dự án thi công ${result.projectCode} thành công!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi khởi tạo dự án từ báo giá", details: err.message },
      { status: 400 }
    );
  }
}
