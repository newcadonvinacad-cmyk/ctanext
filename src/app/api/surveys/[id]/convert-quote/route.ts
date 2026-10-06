import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";

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
