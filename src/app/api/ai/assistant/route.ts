import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AiService } from "@/services/ai.service";
import { AuthorizationService } from "@/services/authorization.service";
import { IngestionActionType } from "@/types/ai.types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    if (!capabilities["ai_run.read"]?.isEnabled && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Không có quyền xem lịch sử AI" }, { status: 403 });
    }

    const runs = await AiService.listAiRuns();
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải lịch sử AI", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const count = await AiService.clearAiRuns();
    return NextResponse.json({
      success: true,
      message: `Đã dọn dẹp ${count} phiên tác vụ AI`,
      count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi dọn dẹp lịch sử AI", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { capabilities } = await AuthorizationService.getUserCapabilities(session.user.id);
    const canAsk =
      capabilities["ai_run.ask"]?.isEnabled ||
      capabilities["ai_run.create"]?.isEnabled ||
      capabilities["ai_run.read"]?.isEnabled ||
      (session.user as any).role === "admin";
    if (!canAsk) {
      return NextResponse.json(
        { error: "Không có quyền gửi yêu cầu AI (cần quyền ai_run.ask)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập câu hỏi hoặc nội dung tác vụ cho Trợ lý AI" },
        { status: 400 }
      );
    }

    // Nhận diện ý định thực hiện hành động ghi / cập nhật dữ liệu (Human-in-the-Loop Action Ingestion)
    const detectActionIntent = (text: string): IngestionActionType | null => {
      const p = text.trim().toLowerCase();

      // Kiểm tra câu hỏi tra cứu đơn thuần (không chứa mã công việc hay yêu cầu hoàn thành)
      const isPureQuestion =
        (p.startsWith("tôi có") || p.startsWith("có ai") || p.startsWith("ai đang") || p.startsWith("ở đâu") || p.startsWith("bao nhiêu")) &&
        (p.endsWith("?") || p.endsWith("không") || p.endsWith("không ạ") || p.endsWith("chưa") || p.endsWith("gì không"));

      const isSpecificTaskUpdateRequest =
        p.includes("tk-") && (p.includes("100") || p.includes("hoàn thành") || p.includes("lên") || p.includes("xong"));

      if (isPureQuestion && !isSpecificTaskUpdateRequest) {
        return null;
      }

      // 1. Nhận diện Báo Cáo Nhật Trình / Cập Nhật Tiến Độ Công Việc
      const isWorkReport =
        isSpecificTaskUpdateRequest ||
        p.includes("báo cáo công việc") ||
        p.includes("nhật trình") ||
        p.includes("hoàn thành đi") ||
        p.includes("đã hoàn thành") ||
        p.includes("cập nhật tiến độ") ||
        (p.includes("tiến độ") && (p.includes("100") || p.includes("80%") || p.includes("đạt") || p.includes("lên") || p.includes("xong"))) ||
        p.includes("ốp xong") ||
        p.includes("thi công xong") ||
        p.includes("lắp dựng xong") ||
        p.includes("lắp xong");

      if (isWorkReport) return "work_report";

      // 2. Nhận diện Đề Xuất Xuất Kho Vật Tư
      const isStockIssue =
        (p.startsWith("xuất") || p.includes("xuất kho") || p.includes("cấp phát vật tư") || p.includes("phiếu xuất")) &&
        (p.includes("tấm") || p.includes("cuộn") || p.includes("keo") || p.includes("bạt") || p.includes("kho") || p.includes("cho công trình") || p.includes("công trình"));

      if (isStockIssue) return "stock_issue";

      // 3. Nhận diện Dự Thảo Biên Bản Nghiệm Thu
      const isAcceptance =
        (p.includes("nghiệm thu") || p.includes("bàn giao") || p.includes("biên bản nghiệm thu")) &&
        (p.includes("ký") || p.includes("giai đoạn") || p.includes("dự án") || p.includes("khách hàng") || p.includes("hoàn tất"));

      if (isAcceptance) return "acceptance";

      // 4. Nhận diện Phiếu Chi Tiền Mặt Phát Sinh
      const isDisbursement =
        (p.startsWith("chi ") || p.includes("phiếu chi") || p.includes("chi tiền") || p.includes("thanh toán phát sinh")) &&
        (p.includes("đ") || p.includes("vnd") || p.includes("k") || p.includes("nghìn") || p.includes("ngàn") || p.includes("triệu") || p.includes("quỹ"));

      if (isDisbursement) return "disbursement";

      return null;
    };

    // Xác định loại hành động: hoặc do Tab chỉ định, hoặc do hệ thống tự động nhận diện từ câu nói
    let targetAction: IngestionActionType | null = null;
    if (body.mode === "ingest" && body.actionType) {
      targetAction = body.actionType;
    } else {
      targetAction = detectActionIntent(body.prompt);
    }

    // Nếu người dùng yêu cầu thực hiện hành động nhập liệu / cập nhật tiến độ
    if (targetAction) {
      const proposal = await AiService.parseActionProposal({
        actionType: targetAction,
        text: body.prompt,
        userId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        isActionProposal: true,
        proposal,
        answer: `Hệ thống đã so khớp dữ liệu cho **${proposal.actionTitle}**. Bạn hãy kiểm tra bản xem trước (preview) dưới đây và nhấn **Xác nhận lưu vào DB** để hoàn tất:`,
        aiRunId: proposal.aiRunId,
      });
    }

    // Gọi AI Service theo mô hình 2 lớp bảo mật thông thường
    const result = await AiService.askAssistant({
      prompt: body.prompt,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      toolsUsed: result.toolsUsed,
      dataSources: result.dataSources,
      permissionWarnings: result.permissionWarnings,
      aiRunId: result.aiRunId,
      isActionProposal: Boolean(result.actionProposal),
      proposal: result.actionProposal,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phản hồi từ AI", details: err.message },
      { status: 500 }
    );
  }
}
