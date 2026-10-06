import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignagePhase3Service } from "@/services/signage-phase3.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const analytics = await SignagePhase3Service.getSignageExecutiveAnalytics();
    return NextResponse.json({ analytics });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải báo cáo phân tích Signage BI", details: err.message },
      { status: 500 }
    );
  }
}
