import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { HrmService } from "@/services/hrm.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;

    const employees = await HrmService.listEmployeesWithPolicy(search, departmentId);
    return NextResponse.json({ employees });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách nhân sự", details: err.message },
      { status: 500 }
    );
  }
}
