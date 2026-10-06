import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase2Service } from "@/services/signage-phase2.service";

export const dynamic = "force-dynamic";

export async function GET(
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

    const warranty = await SignagePhase2Service.getProjectWarrantyInfo(id);
    const tickets = await SignagePhase2Service.listServiceTickets({ projectId: id });

    return NextResponse.json({ warranty, tickets });
  } catch (err: any) {
    return NextResponse.json({ error: "Lỗi tải thông tin bảo hành", details: err.message }, { status: 500 });
  }
}
