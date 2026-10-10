import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AiService } from "@/services/ai.service";
import { AuthorizationService } from "@/services/authorization.service";
import { IngestionActionType } from "@/types/ai.types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực danh tính" }, { status: 401 });
    }

    const body = await req.json();
    const { actionType, draftPayload, aiRunId, chatSessionId, chatMessageId } = body as {
      actionType: IngestionActionType;
      draftPayload: any;
      aiRunId?: string;
      chatSessionId?: string;
      chatMessageId?: string;
    };

    if (!actionType || !draftPayload) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu bản nháp để xác nhận lưu" },
        { status: 400 }
      );
    }

    // F03: Kiểm tra quyền nghiệp vụ tương ứng trước khi cho phép AI xác nhận hành động
    const { capabilities, roles } = await AuthorizationService.getUserCapabilities(session.user.id);
    const isSuperAdmin = roles.some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r.code.toUpperCase()));

    if (!isSuperAdmin) {
      if (actionType === "work_report" && !capabilities["work_report.create"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền tạo báo cáo nhật ký thi công" }, { status: 403 });
      }
      if (actionType === "stock_issue" && !capabilities["stock_document.create"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền tạo phiếu xuất kho" }, { status: 403 });
      }
      if (actionType === "acceptance" && !capabilities["acceptance.create"]?.isEnabled) {
        return NextResponse.json({ error: "Không có quyền lập biên bản nghiệm thu" }, { status: 403 });
      }
      if (actionType === "disbursement") {
        if (!capabilities["payment.create"]?.isEnabled) {
          return NextResponse.json({ error: "Không có quyền tạo phiếu chi tài chính" }, { status: 403 });
        }
        if (draftPayload?.status === "posted" && !capabilities["payment.post"]?.isEnabled) {
          return NextResponse.json({ error: "Không có quyền ghi sổ phiếu chi trực tiếp qua AI (yêu cầu quyền payment.post)" }, { status: 403 });
        }
      }
    }

    const result = await AiService.executeActionWithAiRemediation({
      actionType,
      draftPayload,
      aiRunId,
      userId: session.user.id,
      chatSessionId,
      chatMessageId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const isForbidden = err.message?.includes("Không có quyền");
    console.error("Lỗi xác nhận lưu dữ liệu AI:", err);
    return NextResponse.json(
      {
        success: false,
        error: isForbidden ? "Từ chối quyền truy cập" : "Không thể lưu vào cơ sở dữ liệu",
        details: err.message,
        explanation: `Đã có lỗi hệ thống phát sinh: ${err.message}. AI đang sẵn sàng nhận hướng dẫn tiếp từ bạn.`,
      },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
