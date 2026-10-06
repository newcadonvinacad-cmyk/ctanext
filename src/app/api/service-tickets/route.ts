import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;

    const tickets = await SignagePhase2Service.listServiceTickets({
      projectId,
      customerId,
      status,
      priority,
    });

    return NextResponse.json({ tickets });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải danh sách Ticket bảo hành", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.projectId || !body.customerId || !body.title) {
      return NextResponse.json({ error: "Dự án, Khách hàng và Tiêu đề sự cố là bắt buộc!" }, { status: 400 });
    }

    const ticket = await SignagePhase2Service.createServiceTicket(body, session.user.id);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tạo Ticket bảo hành", details: err.message }, { status: 500 });
  }
}
