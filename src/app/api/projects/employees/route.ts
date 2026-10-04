import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProjectService } from "@/services/project.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
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
