import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const data = await HrmService.getTodayAttendance(session.user.id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải trạng thái chấm công", details: err.message },
      { status: 500 }
    );
  }
}
