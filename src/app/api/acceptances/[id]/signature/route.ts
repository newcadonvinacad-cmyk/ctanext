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
    if (!body.signatureData) {
      return NextResponse.json(
        { error: "Dữ liệu chữ ký cảm ứng là bắt buộc!" },
        { status: 400 }
      );
    }

    await SignagePhase3Service.saveAcceptanceSignature(
      id,
      body.signatureData,
      body.signerName || "Đại diện khách hàng",
      body.notes
    );

    return NextResponse.json({ success: true, message: "Đã lưu chữ ký nghiệm thu thành công" });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi lưu chữ ký số nghiệm thu", details: err.message },
      { status: 500 }
    );
  }
}
