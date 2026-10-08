import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const body = await req.json();
    const type = body.type || "check_in";
    if (type !== "check_in" && type !== "check_out") {
      return NextResponse.json({ error: "Loại chấm công không hợp lệ (check_in hoặc check_out)" }, { status: 400 });
    }

    const result = await HrmService.recordAttendance(session.user.id, {
      type,
      source: body.source || "desk",
      latitude: body.latitude ? Number(body.latitude) : undefined,
      longitude: body.longitude ? Number(body.longitude) : undefined,
      accuracyM: body.accuracyM ? Number(body.accuracyM) : undefined,
      note: body.note,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi ghi nhận chấm công", details: err.message },
      { status: 500 }
    );
  }
}
