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
    if (
      !capabilities["project_finance.read"]?.isEnabled &&
      !capabilities["payment.read"]?.isEnabled &&
      (session.user as any).role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Không có quyền xem thông tin tài chính & lãi lỗ công trình (cần quyền project_finance.read)" },
        { status: 403 }
      );
    }

    const finance = await ProjectService.getProjectFinancialSummary(id);
    return NextResponse.json({ finance });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải thông tin tài chính công trình", details: err.message },
      { status: 500 }
    );
  }
}
