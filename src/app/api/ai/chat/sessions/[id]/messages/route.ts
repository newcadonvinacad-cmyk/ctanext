import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AiService } from "@/services/ai.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return NextResponse.json({ error: "Chua xac thuc" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10) || 200, 500);
    const messages = await AiService.listChatMessages(id, session.user.id, undefined, limit);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    return NextResponse.json({ error: "Loi tai tin nhan", details: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) return NextResponse.json({ error: "Chua xac thuc" }, { status: 401 });
  const { id: sessionId } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    const { messageId, status } = body as { messageId?: string; status?: string };
    if (!messageId || (status !== "cancelled" && status !== "pending_confirmation")) {
      return NextResponse.json({ error: "Thieu messageId / status hop le" }, { status: 400 });
    }
    const { getDbPool, getCachedOrgId } = await import("@/lib/db");
    const orgId = await getCachedOrgId("SIGNAGE");
    const pool = getDbPool();
    await pool.query(
      `UPDATE erp.ai_chat_messages
       SET action_proposal = jsonb_set(COALESCE(action_proposal, '{}'::jsonb), '{status}', $1::jsonb)
       WHERE organization_id = $2 AND session_id = $3 AND id = $4`,
      [JSON.stringify(status), orgId, sessionId, messageId]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Loi cap nhat tin nhan", details: err.message }, { status: 500 });
  }
}
