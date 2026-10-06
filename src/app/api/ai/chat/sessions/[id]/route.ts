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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;
  try {
    const session = await AiService.getChatSession(id, authz.user.id);
    if (!session) return NextResponse.json({ error: "Khong tim thay phien chat" }, { status: 404 });
    const messages = await AiService.listChatMessages(id, authz.user.id);
    return NextResponse.json({ success: true, session, messages });
  } catch (err: any) {
    return NextResponse.json({ error: "Loi tai phien chat", details: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    let session = null;
    if (typeof body.title === "string") {
      session = await AiService.renameChatSession(id, authz.user.id, body.title);
    } else if (typeof body.pinned === "boolean") {
      session = await AiService.pinChatSession(id, authz.user.id, body.pinned);
    } else if (typeof body.mode === "string") {
      const { getDbPool, getCachedOrgId } = await import("@/lib/db");
      const orgId = await getCachedOrgId("SIGNAGE");
      const pool = getDbPool();
      await pool.query(
        `UPDATE erp.ai_chat_sessions SET mode = $1, updated_by = $2 WHERE organization_id = $3 AND id = $4 AND user_id = $2`,
        [body.mode === "ingest" ? "ingest" : "query", authz.user.id, orgId, id]
      );
      session = await AiService.getChatSession(id, authz.user.id);
    } else {
      return NextResponse.json({ error: "Thieu tham so title / pinned / mode" }, { status: 400 });
    }
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: "Loi cap nhat phien chat", details: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;
  try {
    await AiService.deleteChatSession(id, authz.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Loi xoa phien chat", details: err.message }, { status: 500 });
  }
}
