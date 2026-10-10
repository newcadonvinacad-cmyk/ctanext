import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";
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

    // F17: Chuyển đổi khảo sát sang báo giá bắt buộc quyền 'quotation.create'
    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["quotation.create"]?.isEnabled) {
      return NextResponse.json({ error: "Không có quyền tạo báo giá từ khảo sát (yêu cầu quyền 'quotation.create')" }, { status: 403 });
    }

    const result = await SignagePhase2Service.convertSurveyToQuotation(id, session.user.id);
    return NextResponse.json({
      success: true,
      quotationId: result.quotationId,
      quotationCode: result.quotationCode,
      message: `Đã tự động khởi tạo Báo giá dự toán ${result.quotationCode} từ kích thước khảo sát mặt bằng!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi chuyển khảo sát sang báo giá" }, { status: 500 });
  }
}
