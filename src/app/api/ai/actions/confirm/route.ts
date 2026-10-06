import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AiService } from "@/services/ai.service";
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
    console.error("Lỗi xác nhận lưu dữ liệu AI:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Không thể lưu vào cơ sở dữ liệu",
        details: err.message,
        explanation: `Đã có lỗi hệ thống phát sinh: ${err.message}. AI đang sẵn sàng nhận hướng dẫn tiếp từ bạn.`,
      },
      { status: 500 }
    );
  }
}
