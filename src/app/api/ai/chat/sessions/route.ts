import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AiService } from "@/services/ai.service";

export const dynamic = "force-dynamic";

async function requireUser() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return { error: NextResponse.json({ error: "Chua xac thuc" }, { status: 401 }) };
  return { user: session.user };
}

export async function GET() {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  try {
    const sessions = await AiService.listChatSessions(authz.user.id);
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ error: "Loi tai danh sach phien chat", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "ingest" ? "ingest" : "query";
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : "Doan chat moi";
    const session = await AiService.createChatSession(authz.user.id, { title, mode });
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    if (String(err?.message || "").includes("ai_chat_sessions") || err?.code === "42P01") {
      return NextResponse.json(
        { error: "Database chua chay migration 013_ai_chat_sessions. Hay chay scripts/database.mjs apply hoac SQL Editor." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Loi tao phien chat", details: err.message }, { status: 500 });
  }
}
