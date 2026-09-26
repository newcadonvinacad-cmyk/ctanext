import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FinanceService } from "@/services/finance.service";
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

    const runs = await FinanceService.listAiRuns();
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải lịch sử AI", details: err.message },
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
    const canAsk = capabilities["ai_run.ask"]?.isEnabled || capabilities["ai_run.create"]?.isEnabled || capabilities["ai_run.read"]?.isEnabled || (session.user as any).role === "admin";
    if (!canAsk) {
      return NextResponse.json({ error: "Không có quyền gửi yêu cầu AI (cần quyền ai_run.ask)" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.prompt) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi cho Trợ lý AI" }, { status: 400 });
    }

    const answer = await FinanceService.askAiAdvisor(body.prompt, session.user.id);
    return NextResponse.json({ success: true, answer });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi phản hồi từ AI", details: err.message },
      { status: 500 }
    );
  }
}
