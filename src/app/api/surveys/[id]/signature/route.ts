import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase3Service } from "@/services/signage-phase3.service";

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

    const body = await req.json();
    if (!body.customerSignature) {
      return NextResponse.json(
        { error: "Chữ ký khách hàng xác nhận số đo là bắt buộc!" },
        { status: 400 }
      );
    }

    await SignagePhase3Service.saveSurveySignature(
      id,
      body.customerSignature,
      body.surveyorSignature
    );

    return NextResponse.json({ success: true, message: "Đã lưu chữ ký xác nhận khảo sát hiện trường" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu chữ ký khảo sát", details: err.message },
      { status: 500 }
    );
  }
}
