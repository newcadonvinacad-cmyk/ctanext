import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";

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
    const action = body.action; // 'approve' | 'reject'
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Thao tác không hợp lệ (cần 'approve' hoặc 'reject')" },
        { status: 400 }
      );
    }

    const reviewed = await HrmService.reviewHrmRequest(
      id,
      action,
      session.user.id,
      session.user.name || session.user.email || "Quản trị viên",
      body.note
    );

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Đã duyệt đơn và cập nhật quỹ/lương!" : "Đã từ chối đơn yêu cầu",
      data: reviewed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi phê duyệt đơn" },
      { status: 500 }
    );
  }
}
