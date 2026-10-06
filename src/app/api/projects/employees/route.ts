import { NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth-cache";
import { ProjectService } from "@/services/project.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
    }

    const employees = await ProjectService.listEmployees();
    return NextResponse.json({ employees });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Lỗi tải danh sách nhân sự", details: err.message },
      { status: 500 }
    );
  }
}
