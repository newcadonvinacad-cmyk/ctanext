import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AiService } from "@/services/ai.service";
import { AuthorizationService } from "@/services/authorization.service";

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

    // Dam bao co session de luu lich su (tu tao neu frontend chua gui)
    let sessionId: string | undefined =
      typeof body.sessionId === "string" && body.sessionId ? body.sessionId : undefined;
    try {
      if (!sessionId) {
        const created = await AiService.createChatSession(session.user.id, {
          title: AiService.buildSessionTitleFromPrompt(String(body.prompt || "Doan chat moi")),
          mode: body.mode === "ingest" ? "ingest" : "query",
        });
        sessionId = created.id;
      } else {
        const existing = await AiService.getChatSession(sessionId, session.user.id);
        if (!existing) {
          const created = await AiService.createChatSession(session.user.id, {
            title: AiService.buildSessionTitleFromPrompt(String(body.prompt || "Doan chat moi")),
            mode: body.mode === "ingest" ? "ingest" : "query",
          });
          sessionId = created.id;
        }
      }
    } catch (e) {
      sessionId = undefined;
    }

    if (sessionId) {
      await AiService.appendChatMessage({
        sessionId,
        userId: session.user.id,
        role: "user",
        content: String(body.prompt),
      });
    }

    // Định hướng ngữ cảnh nếu người dùng chủ động chọn tab Ingest trên UI
    let effectivePrompt = String(body.prompt);
    if (body.mode === "ingest" && body.actionType) {
      effectivePrompt = `[Yêu cầu đề xuất tác vụ '${body.actionType}'] ${body.prompt}`;
    }

    // Gọi Autonomous AI Agent theo chuẩn ReAct Multi-step Loop
    const result = await AiService.askAssistant({
      prompt: effectivePrompt,
      userId: session.user.id,
      sessionId,
    });

    const isActionProposal = Boolean(result.actionProposal);

    if (sessionId) {
      await AiService.appendChatMessage({
        sessionId,
        userId: session.user.id,
        role: "assistant",
        content: result.answer,
        toolsUsed: result.toolsUsed,
        dataSources: result.dataSources,
        permissionWarnings: result.permissionWarnings,
        actionProposal: result.actionProposal || null,
        aiRunId: result.aiRunId,
        steps: result.steps,
      });
    }

    const sessions = await AiService.listChatSessions(session.user.id).catch(() => []);

    return NextResponse.json({
      success: true,
      answer: result.answer,
      toolsUsed: result.toolsUsed,
      dataSources: result.dataSources,
      permissionWarnings: result.permissionWarnings,
      aiRunId: result.aiRunId,
      isActionProposal,
      proposal: result.actionProposal,
      sessionId,
      sessions,
      steps: result.steps,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phản hồi từ AI", details: err.message },
      { status: 500 }
    );
  }
}
