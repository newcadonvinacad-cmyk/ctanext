import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { HrmService } from "@/services/hrm.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const periods = await HrmService.listPayrollPeriods();
    return NextResponse.json({ periods });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách kỳ lương", details: error.message },
      { status: 500 }
    );
  }
}
